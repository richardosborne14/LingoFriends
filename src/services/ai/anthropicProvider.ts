/**
 * LingoFriends - Anthropic AI Provider
 * 
 * Provider for Claude models via Anthropic API.
 * This is a DEV MODE option for testing Claude Haiku and Sonnet.
 * 
 * IMPORTANT: Should only be active when VITE_DEV_MODE=true.
 * Anthropic API uses a different format than OpenAI-compatible APIs.
 * 
 * @module services/ai/anthropicProvider
 */

import type { AIProvider, AICompletionOptions, AICompletionResult, AIStreamCallbacks, AIModelConfig, ProviderConfig } from './types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Anthropic models available for LingoFriends.
 */
const ANTHROPIC_MODELS: AIModelConfig[] = [
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    purpose: 'fast',
    contextWindow: 200_000,
    costPer1kInput: 0.001,
    costPer1kOutput: 0.005,
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    purpose: 'reasoning',
    contextWindow: 200_000,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
];

/**
 * Default model for Anthropic.
 */
const DEFAULT_MODEL = 'claude-3-5-haiku-20241022';

/**
 * Anthropic API URL.
 */
const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1/messages';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const isRateLimit = (error as { status?: number })?.status === 429;
      
      if (attempt < maxRetries - 1) {
        const delay = isRateLimit 
          ? baseDelay * Math.pow(2, attempt + 1) 
          : baseDelay * Math.pow(2, attempt);
        console.log(`[Anthropic] Retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

// ============================================================================
// ANTHROPIC PROVIDER CLASS
// ============================================================================

/**
 * Anthropic AI Provider implementation.
 * 
 * Uses Anthropic's messages API format (different from OpenAI).
 * System prompt is separate from messages array.
 */
export class AnthropicProvider implements AIProvider {
  readonly id = 'anthropic' as const;
  readonly name = 'Anthropic';
  readonly description = 'Claude models via Anthropic (dev mode only)';
  readonly models = ANTHROPIC_MODELS;
  readonly defaultModel = DEFAULT_MODEL;
  
  private apiKey: string | undefined;
  private baseUrl: string;
  private selectedModel: string;
  
  /** Rate limiting state */
  private lastRequestTime = 0;
  private readonly minRequestInterval = 300;
  
  constructor(config: ProviderConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || ANTHROPIC_BASE_URL;
    this.selectedModel = config.defaultModel || DEFAULT_MODEL;
  }
  
  /**
   * Check if the provider is configured with a valid API key.
   * Also checks if dev mode is enabled.
   */
  get isAvailable(): boolean {
    const isDevMode = import.meta.env.VITE_DEV_MODE === 'true';
    const hasKey = typeof this.apiKey === 'string' && this.apiKey.length > 0;
    // Anthropic is only available in dev mode
    return isDevMode && hasKey;
  }
  
  /**
   * Set the model to use for subsequent requests.
   */
  setModel(modelId: string): void {
    if (this.models.some(m => m.id === modelId)) {
      this.selectedModel = modelId;
    }
  }
  
  /**
   * Generate a completion (non-streaming).
   */
  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    if (!this.isAvailable) {
      throw new Error('Anthropic API key not configured or dev mode disabled');
    }
    
    await this.enforceRateLimit();
    
    const { messages, temperature = 0.7, maxTokens = 1024 } = options;
    
    // Extract system message (Anthropic uses separate system field)
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');
    
    return retryWithBackoff(async () => {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey!,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.selectedModel,
          max_tokens: maxTokens,
          system: systemMessage,
          messages: userMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
        const apiError = new Error(`Anthropic API error: ${response.status} - ${error?.error?.message || 'Unknown error'}`);
        (apiError as any).status = response.status;
        throw apiError;
      }
      
      const data = await response.json() as {
        content: Array<{ type: string; text: string }>;
        usage?: { input_tokens: number; output_tokens: number };
      };
      
      // Extract text from Anthropic's content array format
      const text = data.content
        .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
        .map(block => block.text)
        .join('');
      
      return {
        text,
        model: this.selectedModel,
        usage: data.usage ? {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          estimatedCost: this.calculateCost(data.usage.input_tokens, data.usage.output_tokens),
        } : undefined,
      };
    });
  }
  
  /**
   * Generate a streaming completion.
   */
  async stream(options: AICompletionOptions, callbacks: AIStreamCallbacks): Promise<void> {
    if (!this.isAvailable) {
      callbacks.onError(new Error('Anthropic API key not configured or dev mode disabled'));
      return;
    }
    
    await this.enforceRateLimit();
    
    const { messages, temperature = 0.7, maxTokens = 1024 } = options;
    
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');
    
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey!,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.selectedModel,
          max_tokens: maxTokens,
          system: systemMessage,
          messages: userMessages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          stream: true,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(`Anthropic API error: ${response.status} - ${error?.error?.message || 'Unknown error'}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }
      
      const decoder = new TextDecoder();
      let fullText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            try {
              const parsed = JSON.parse(data);
              
              // Anthropic streaming format
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                const token = parsed.delta.text;
                fullText += token;
                callbacks.onToken(token);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
      
      callbacks.onComplete(fullText);
    } catch (error) {
      callbacks.onError(error as Error);
    }
  }
  
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      await sleep(this.minRequestInterval - timeSinceLastRequest);
    }
    this.lastRequestTime = Date.now();
  }
  
  private calculateCost(promptTokens: number, completionTokens: number): number {
    const model = this.models.find(m => m.id === this.selectedModel) || this.models[0];
    if (!model.costPer1kInput || !model.costPer1kOutput) return 0;
    
    const inputCost = (promptTokens / 1000) * model.costPer1kInput;
    const outputCost = (completionTokens / 1000) * model.costPer1kOutput;
    return inputCost + outputCost;
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create an Anthropic provider instance.
 */
export function createAnthropicProvider(): AIProvider {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  
  return new AnthropicProvider({
    apiKey,
    baseUrl: ANTHROPIC_BASE_URL,
    defaultModel: DEFAULT_MODEL,
    models: ANTHROPIC_MODELS,
  });
}

export default AnthropicProvider;