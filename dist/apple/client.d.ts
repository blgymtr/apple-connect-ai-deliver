import { AppStoreVersion, AppStoreVersionLocalization, ReleaseNotesOutput } from '../types';
export interface AppStoreConnectClientOptions {
    appId: string;
    keyId: string;
    issuerId: string;
    privateKey: string;
    dryRun?: boolean;
}
export declare class AppStoreConnectClient {
    private readonly appId;
    private readonly keyId;
    private readonly issuerId;
    private readonly privateKey;
    private readonly dryRun;
    private readonly baseUrl;
    constructor(options: AppStoreConnectClientOptions);
    private getToken;
    private request;
    /**
     * Finds the target version.
     * If versionString is specified, finds that exact version.
     * If not, finds the current editable version in PREPARE_FOR_SUBMISSION or REJECTED state.
     */
    findTargetVersion(targetVersionString?: string): Promise<AppStoreVersion>;
    /**
     * Fetches all localizations for an App Store version.
     */
    getVersionLocalizations(versionId: string): Promise<AppStoreVersionLocalization[]>;
    /**
     * Updates or creates localization "What's New" release notes in App Store Connect.
     */
    updateReleaseNotes(versionId: string, releaseNotesByLocale: ReleaseNotesOutput): Promise<{
        updatedLocales: string[];
        createdLocales: string[];
    }>;
    /**
     * Updates full storefront metadata (WhatsNew, Description, Keywords, PromotionalText, Subtitle).
     */
    updateStorefrontMetadata(versionId: string, metadataByLocale: import('../types').LocalizedStorefrontOutput): Promise<{
        updatedLocales: string[];
        createdLocales: string[];
    }>;
}
