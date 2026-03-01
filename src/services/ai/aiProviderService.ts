/**
 * LingoFriends - AI Provider Service
 * 
 * Central service for AI completions with provider abstraction.
 * Handles provider selection, fallback logic, and unified API.
 * 
 * Provider Priority:
 * 1. DeepInfra (GLM-5) - Production default
 * 2. Groq (Llama 3.3) - Fallback
 * 3. Anthropic (Claude) - Dev mode only
 * 
 * @module services/ai/aiProviderService
 */

import type { AIProvider, AICompletionOptions, AICompletionResult, AIStreamCallbacks, ProviderKey } from './types';
import { createDeepInfraProvider } from './deepInfraProvider';
import { createAnthropicProvider } from './anthropicProvider';
import { createGroqProvider } from './groqProvider';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Provider priority order.
 * DeepInfra is preferred for production (US data centre, zero retention).
 * Groq is fallback (existing provider, reliable).
 * Anthropic is dev-mode only (for testing Claude).
 */
const PROVIDER_PRIORITY: ProviderKey[] = ['deepinfra', 'groq', 'anthropic'];

// ============================================================================
// SERVICE CLASS
// ============================================================================

/**
 * AI Provider Service
 * 
 * Singleton service that manages provider selection and fallback.
 * Provides a unified interface for AI completions regardless of provider.
 */
class AIProviderService {
  private providers: Map<ProviderKey, AIProvider>;
  private initialized = false;
  
  constructor() {
    this.providers = new Map();
  }
  
  /**
   * Initialize all providers.
   * Called lazily on first request.
   */
  private initialize(): void {
    if (this.initialized) return;
    
    // Create provider instances
    this.providers.set('deepinfra', createDeepInfraProvider());
    this.providers.set('anthropic', createAnthropicProvider());
    this.providers.set('groq', createGroqProvider());
    
    this.initialized = true;
    
    // Log available providers
    const available = this.getAvailableProviders();
    console.log('[AIProviderService] Initialized. Available providers:', available);
  }
  
  /**
   * Get list of available providers.
   */
  getAvailableProviders(): ProviderKey[] {
    this.initialize();
    return PROVIDER_PRIORITY.filter(key => {
      const provider = this.providers.get(key);
      return provider?.isAvailable ?? false;
    });
  }
  
  /**
   * Get the primary provider (first available).
   */
  getPrimaryProvider(): AIProvider | null {
    this.initialize();
    
    for (const key of PROVIDER_PRIORITY) {
      const provider = this.providers.get(key);
      if (provider?.isAvailable) {
        return provider;
      }
    }
    
    return null;
  }
  
  /**
   * Get a specific provider by key.
   */
  getProvider(key: ProviderKey): AIProvider | undefined {
    this.initialize();
    return this.providers.get(key);
  }
  
  /**
   * Generate a completion using the best available provider.
   * Falls back to next provider on failure.
   * 
   * @param options - Completion options
   * @returns Completion result
   */
  async complete(options: AICompletionOptions): Promise<AICompletionResult> {
    this.initialize();
    
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      throw new Error('No AI providers available. Check API key configuration.');
    }
    
    // Try each provider in priority order
    const errors: Error[] = [];
    
    for (const key of availableProviders) {
      const provider = this.providers.get(key)!;
      
      try {
        console.log(`[AIProviderService] Trying provider: ${key}`);
        const result = await provider.complete(options);
        console.log(`[AIProviderService] Success with ${key}`, {
          tokens: result.usage?.totalTokens,
          model: result.model,
        });
        return result;
      } catch (error) {
        console.warn(`[AIProviderService] Provider ${key} failed:`, error);
        errors.push(error as Error);
        
        // Don't try next provider for certain errors
        const err = error as Error & { status?: number };
        if (err.status === 401 || err.status === 403) {
          // Auth error - don't fallback, throw immediately
          throw new Error(`Authentication failed for ${key}: ${err.message}`);
        }
      }
    }
    
    // All providers failed
    throw new Error(
      `All AI providers failed. Errors: ${errors.map(e => e.message).join('; ')}`
    );
  }
  
  /**
   * Generate a streaming completion using the best available provider.
   * Falls back to next provider on failure.
   * 
   * @param options - Completion options
   * @param callbacks - Streaming callbacks
   */
  async stream(options: AICompletionOptions, callbacks: AIStreamCallbacks): Promise<void> {
    this.initialize();
    
    const availableProviders = this.getAvailableProviders();
    
    if (availableProviders.length === 0) {
      callbacks.onError(new Error('No AI providers available. Check API key configuration.'));
      return;
    }
    
    // For streaming, we use the primary provider (no fallback mid-stream)
    const provider = this.getPrimaryProvider();
    
    if (!provider) {
      callbacks.onError(new Error('No AI providers available. Check API key configuration.'));
      return;
    }
    
    console.log(`[AIProviderService] Streaming with provider: ${provider.id}`);
    await provider.stream(options, callbacks);
  }
  
  /**
   * Generate JSON output with structured response.
   * Automatically enables JSON mode.
   * 
   * @param options - Completion options (without jsonMode)
   * @returns Parsed JSON result
   */
  async completeJSON<T = unknown>(options: Omit<AICompletionOptions, 'jsonMode'>): Promise<T> {
    const result = await this.complete({
      ...options,
      jsonMode: true,
    });
    
    try {
      // Strip markdown code blocks if present
      let text = result.text.trim();
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        text = jsonMatch[1].trim();
      }
      
      return JSON.parse(text) as T;
    } catch (error) {
      console.error('[AIProviderService] Failed to parse JSON:', error);
      console.error('[AIProviderService] Raw text:', result.text.substring(0, 500));
      throw new Error('AI returned invalid JSON');
    }
  }
  
  /**
   * Check if at least one provider is available.
   */
  isReady(): boolean {
    this.initialize();
    return this.getAvailableProviders().length > 0;
  }
  
  /**
   * Get info about configured providers.
   */
  getProviderInfo(): Array<{ id: ProviderKey; name: string; available: boolean; description: string }> {
    this.initialize();
    
    return PROVIDER_PRIORITY.map(key => {
      const provider = this.providers.get(key)!;
      return {
        id: key,
        name: provider.name,
        available: provider.isAvailable,
        description: provider.description,
      };
    });
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/**
 * Singleton instance of the AI Provider Service.
 */
export const aiProviderService = new AIProviderService();

export default aiProviderService;