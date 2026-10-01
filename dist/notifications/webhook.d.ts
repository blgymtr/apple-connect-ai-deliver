import { ReleaseNotesOutput } from '../types';
export interface WebhookNotificationOptions {
    webhookUrl: string;
    version: string;
    provider: string;
    releaseNotes: ReleaseNotesOutput;
    status: string;
}
export declare function sendWebhookNotification(options: WebhookNotificationOptions): Promise<void>;
