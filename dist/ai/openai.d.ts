import { ExtractedGitContext, ReleaseNotesOutput } from '../types';
import { AIProvider, GenerateReleaseNotesOptions } from './types';
export declare class OpenAIProvider implements AIProvider {
    readonly name = "OpenAI";
    readonly model: string;
    private readonly apiKey;
    constructor(apiKey: string, model?: string);
    generateText(prompt: string, systemPrompt?: string): Promise<string>;
    generateReleaseNotes(gitContext: ExtractedGitContext, options: GenerateReleaseNotesOptions): Promise<ReleaseNotesOutput>;
    generateStorefront(gitContext: ExtractedGitContext, options: import('./types').GenerateStorefrontOptions): Promise<import('../types').LocalizedStorefrontOutput>;
}
