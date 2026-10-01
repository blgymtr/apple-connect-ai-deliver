import { AIProviderType } from '../types';
import { AIProvider } from './types';
import { GeminiProvider } from './gemini';
import { ClaudeProvider } from './claude';
import { OpenAIProvider } from './openai';

export interface CreateProviderOptions {
  provider?: AIProviderType | string;
  apiKey?: string;
  model?: string;
}

export function createAIProvider(options: CreateProviderOptions): AIProvider {
  let providerType = (options.provider || '').toLowerCase() as AIProviderType;

  // Auto-detect provider if none or default given but other keys exist
  if (!providerType || providerType === ('gemini' as AIProviderType)) {
    if (!options.apiKey && !process.env.GEMINI_API_KEY) {
      if (process.env.ANTHROPIC_API_KEY) {
        providerType = 'claude';
      } else if (process.env.OPENAI_API_KEY) {
        providerType = 'openai';
      } else {
        providerType = 'gemini';
      }
    } else {
      providerType = 'gemini';
    }
  }

  switch (providerType) {
    case 'claude': {
      const key = options.apiKey || process.env.ANTHROPIC_API_KEY || '';
      return new ClaudeProvider(key, options.model || 'claude-3-7-sonnet-20250219');
    }
    case 'openai': {
      const key = options.apiKey || process.env.OPENAI_API_KEY || '';
      return new OpenAIProvider(key, options.model || 'gpt-4o');
    }
    case 'gemini':
    default: {
      const key = options.apiKey || process.env.GEMINI_API_KEY || '';
      return new GeminiProvider(key, options.model || 'gemini-2.0-flash');
    }
  }
}
