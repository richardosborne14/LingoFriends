/**
 * LingoFriends - AI Provider Types
 * 
 * Defines the interface for AI providers, allowing swapping between
 * DeepInfra (GLM-5), Anthropic (Haiku/Sonnet), and Groq (Llama 3.3).
 * 
 * All providers use a common interface, making it easy to:
 * - Switch providers based on environment config
 * - Fall back to alternative providers on failure
 * - Test different models in development
 * 
 * @module services/ai/types
 */

// ============================================================================
// CORE TYPES
// ============================================================================

/**
 * Role of a message in the conversation.
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * A single message in the conversation.
 */
export interface AIMessage {
  role: MessageRole;
  content: string;
}

/**
 * Options for AI completion requests.
 */
export interface AICompletionOptions {
  /** Messages in the conversation */
  messages: AIMessage[];
  /** Temperature for randomness (0-1, default 0.7) */
  temperature?: number;
  /** Maximum tokens to generate (default 1024) */
  maxTokens?: number;
  /** Request JSON output format */
  jsonMode?: boolean;
  /** Enable streaming response */
  stream?: boolean;
}

/**
 * Result from a non-streaming completion.
 */
export interface AICompletionResult {
  /** Generated text */
  text: string;
  /** Usage statistics (optional) */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    /** Estimated cost in USD (optional) */
    estimatedCost?: number;
  };
  /** Model used for this completion */
  model?: string;
}

/**
 * Callbacks for streaming completions.
 */
export interface AIStreamCallbacks {
  /** Called for each token received */
  onToken: (token: string) => void;
  /** Called when streaming completes with full text */
  onComplete: (fullText: string) => void;
  /** Called on error */
  onError: (error: Error) => void;
}

/**
 * Model configuration for a provider.
 */
export interface AIModelConfig {
  /** Model identifier for the API */
  id: string;
  /** Human-readable name */
  name: string;
  /** Purpose of this model */
  purpose: 'general' | 'fast' | 'reasoning';
  /** Context window size in tokens */
  contextWindow: number;
  /** Cost per 1K input tokens (USD, optional) */
  costPer1kInput?: number;
  /** Cost per 1K output tokens (USD, optional) */
  costPer1kOutput?: number;
}

// ============================================================================
// PROVIDER INTERFACE
// ============================================================================

/**
 * Interface for all AI providers.
 * 
 * Each provider (DeepInfra, Anthropic, Groq) implements this interface,
 * allowing the AIProviderService to use them interchangeably.
 */
export interface AIProvider {
  /** Unique identifier for this provider */
  id: ProviderKey;
  /** Human-readable name */
  name: string;
  /** Description of the provider */
  description: string;
  /** Whether this provider has been configured with valid credentials */
  isAvailable: boolean;
  /** Available models for this provider */
  models: AIModelConfig[];
  /** Default model to use */
  defaultModel: string;

  /**
   * Generate a completion (non-streaming).
   * 
   * @param options - Completion options
   * @returns Generated text result
   */
  complete(options: AICompletionOptions): Promise<AICompletionResult>;

  /**
   * Generate a streaming completion.
   * 
   * @param options - Completion options
   * @param callbacks - Streaming callbacks
   */
  stream(options: AICompletionOptions, callbacks: AIStreamCallbacks): Promise<void>;
}

/**
 * Supported provider keys.
 */
export type ProviderKey = 'deepinfra' | 'anthropic' | 'groq';

/**
 * Configuration for a provider.
 */
export interface ProviderConfig {
  /** API key (from environment) */
  apiKey?: string;
  /** Base URL for API calls */
  baseUrl: string;
  /** Default model to use */
  defaultModel: string;
  /** Available models */
  models: AIModelConfig[];
}

// ============================================================================
// PROVIDER FACTORY TYPE
// ============================================================================

/**
 * Factory function to create a provider instance.
 */
export type ProviderFactory = (config: ProviderConfig) => AIProvider;