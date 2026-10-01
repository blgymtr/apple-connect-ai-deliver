import { ActionConfig, ReleaseNotesOutput } from './types';
export interface RunResult {
    version: string;
    releaseNotes: ReleaseNotesOutput;
    status: 'updated' | 'dry-run-preview';
}
export declare function runAction(config: ActionConfig): Promise<RunResult>;
