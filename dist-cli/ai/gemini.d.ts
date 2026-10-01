import { ExtractedGitContext, ReleaseNotesOutput } from '../types';
import { AIProvider, GenerateReleaseNotesOptions } from './types';
export declare class GeminiProvider implements AIProvider {
    readonly name = "Google Gemini";
    readonly model: string;
    private readonly apiKey;
    constructor(apiKey: string, model?: string);
    generateText(prompt: string, systemPrompt?: string): Promise<string>;
    generateReleaseNotes(gitContext: ExtractedGitContext, options: GenerateReleaseNotesOptions): Promise<ReleaseNotesOutput>;
}
