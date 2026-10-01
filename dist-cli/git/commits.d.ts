import { ExtractedGitContext } from '../types';
export declare function findLatestTag(): string | null;
export declare function extractGitCommits(sinceOption?: string): ExtractedGitContext;
