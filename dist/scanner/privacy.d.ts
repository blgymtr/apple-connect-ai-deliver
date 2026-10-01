export interface DetectedSDK {
    name: string;
    category: 'Analytics' | 'Advertising' | 'Crash Reporting' | 'Payments' | 'Push Notifications' | 'Attribution';
    dataCollected: string[];
    tracking: boolean;
}
export interface DetectedPermission {
    key: string;
    purpose: string;
    description: string;
}
export interface PrivacyReport {
    detectedSDKs: DetectedSDK[];
    detectedPermissions: DetectedPermission[];
    requiresTrackingAuthorization: boolean;
    nutritionLabelChecklist: {
        dataUsedToTrackYou: string[];
        dataLinkedToYou: string[];
        dataNotLinkedToYou: string[];
    };
    markdownSummary: string;
}
export declare function scanPrivacyInWorkspace(workspaceDir?: string): PrivacyReport;
