import { ExtractedGitContext } from '../types';
import { GenerateReleaseNotesOptions, GenerateStorefrontOptions } from './types';
export declare function buildSystemPrompt(): string;
export declare function buildReleaseNotesPrompt(gitContext: ExtractedGitContext, options: GenerateReleaseNotesOptions): string;
export declare function buildStorefrontPrompt(gitContext: ExtractedGitContext, options: GenerateStorefrontOptions): string;
export declare function sanitizeASOKeywords(raw: string): string;
export declare function sanitizeSubtitle(raw: string): string;
export declare function sanitizePromotionalText(raw: string): string;
export declare function parseJsonResponse<T>(raw: string): T;
