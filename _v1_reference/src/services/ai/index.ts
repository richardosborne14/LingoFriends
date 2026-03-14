/**
 * LingoFriends - AI Services Module
 * 
 * Barrel exports for the AI provider abstraction layer.
 * Import from '@/services/ai' for convenient access.
 * 
 * @module services/ai
 */

// Types
export type {
  AIProvider,
  AICompletionOptions,
  AICompletionResult,
  AIStreamCallbacks,
  AIModelConfig,
  ProviderConfig,
  ProviderKey,
  MessageRole,
  AIMessage,
} from './types';

// Provider implementations
export { DeepInfraProvider, createDeepInfraProvider } from './deepInfraProvider';
export { AnthropicProvider, createAnthropicProvider } from './anthropicProvider';
export { GroqProvider, createGroqProvider } from './groqProvider';

// Main service
export { aiProviderService } from './aiProviderService';
export { default } from './aiProviderService';