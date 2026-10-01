import { ExtractedGitContext } from '../types';
import { GenerateReleaseNotesOptions } from './types';
export declare function buildSystemPrompt(): string;
export declare function buildReleaseNotesPrompt(gitContext: ExtractedGitContext, options: GenerateReleaseNotesOptions): string;
export declare function parseJsonResponse<T>(raw: string): T;
