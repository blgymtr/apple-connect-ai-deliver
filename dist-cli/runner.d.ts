import { ActionConfig, LocalizedStorefrontOutput, ReleaseNotesOutput } from './types';
export interface RunResult {
    version: string;
    releaseNotes: ReleaseNotesOutput;
    storefront?: LocalizedStorefrontOutput;
    status: 'updated' | 'dry-run-preview';
}
export declare function runAction(config: ActionConfig): Promise<RunResult>;
