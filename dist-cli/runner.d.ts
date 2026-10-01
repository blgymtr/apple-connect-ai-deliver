import { ActionConfig, LocalizedStorefrontOutput, ReleaseNotesOutput } from './types';
import { PrivacyReport } from './scanner/privacy';
export interface RunResult {
    version: string;
    releaseNotes: ReleaseNotesOutput;
    storefront?: LocalizedStorefrontOutput;
    reviewNotes?: string;
    submittedForReview?: boolean;
    privacyReport?: PrivacyReport;
    status: 'updated' | 'dry-run-preview';
}
export declare function runAction(config: ActionConfig): Promise<RunResult>;
