import { ReleaseNotesOutput } from '../types';
export declare const PR_COMMENT_MARKER = "<!-- apple-connect-ai-deliver-pr-comment -->";
export declare function getLocaleFlag(locale: string): string;
export declare function formatPRComment(options: {
    releaseNotes: ReleaseNotesOutput;
    version: string;
    provider: string;
    model?: string;
    status: string;
}): string;
export declare function upsertPRComment(token: string, options: {
    releaseNotes: ReleaseNotesOutput;
    version: string;
    provider: string;
    model?: string;
    status: string;
}): Promise<void>;
