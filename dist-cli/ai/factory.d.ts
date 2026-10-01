import { AIProviderType } from '../types';
import { AIProvider } from './types';
export interface CreateProviderOptions {
    provider?: AIProviderType | string;
    apiKey?: string;
    model?: string;
}
export declare function createAIProvider(options: CreateProviderOptions): AIProvider;
