import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

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

const KNOWN_SDK_RULES: Record<string, { category: DetectedSDK['category']; data: string[]; tracking: boolean }> = {
  'FirebaseAnalytics': { category: 'Analytics', data: ['User ID', 'Device ID', 'Product Interaction'], tracking: false },
  'FirebaseCrashlytics': { category: 'Crash Reporting', data: ['Crash Data', 'Performance Diagnostics'], tracking: false },
  'GoogleMobileAds': { category: 'Advertising', data: ['Advertising Data', 'Device ID', 'Interaction Data'], tracking: true },
  'Google-Mobile-Ads-SDK': { category: 'Advertising', data: ['Advertising Data', 'Device ID', 'Interaction Data'], tracking: true },
  'FBSDKCoreKit': { category: 'Advertising', data: ['Device ID', 'User ID', 'Ad Data'], tracking: true },
  'FacebookSDK': { category: 'Advertising', data: ['Device ID', 'User ID', 'Ad Data'], tracking: true },
  'AppsFlyerLib': { category: 'Attribution', data: ['Device ID', 'Purchase History', 'Ad Clicks'], tracking: true },
  'AppsFlyer': { category: 'Attribution', data: ['Device ID', 'Purchase History', 'Ad Clicks'], tracking: true },
  'Purchases': { category: 'Payments', data: ['Purchase History', 'User ID'], tracking: false },
  'RevenueCat': { category: 'Payments', data: ['Purchase History', 'User ID'], tracking: false },
  'Sentry': { category: 'Crash Reporting', data: ['Crash Logs', 'Device Performance Data'], tracking: false },
  'OneSignal': { category: 'Push Notifications', data: ['Device ID', 'Contact Info'], tracking: false },
  'Stripe': { category: 'Payments', data: ['Financial Information', 'Payment Details'], tracking: false }
};

const PERMISSION_KEYS: Record<string, string> = {
  'NSCameraUsageDescription': 'Camera Access',
  'NSPhotoLibraryUsageDescription': 'Photo Library Access',
  'NSLocationWhenInUseUsageDescription': 'Location (While In Use)',
  'NSLocationAlwaysAndWhenInUseUsageDescription': 'Location (Always)',
  'NSMicrophoneUsageDescription': 'Microphone Access',
  'NSUserTrackingUsageDescription': 'App Tracking Transparency (IDFA)',
  'NSBluetoothAlwaysUsageDescription': 'Bluetooth Access',
  'NSCalendarsUsageDescription': 'Calendar Access',
  'NSContactsUsageDescription': 'Contacts Access',
  'NSFaceIDUsageDescription': 'Face ID Authentication'
};

function searchFilesRecursively(dir: string, fileNames: string[], maxDepth = 4, currentDepth = 0): string[] {
  if (currentDepth > maxDepth || !fs.existsSync(dir)) return [];
  const found: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'Pods') continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        found.push(...searchFilesRecursively(fullPath, fileNames, maxDepth, currentDepth + 1));
      } else if (fileNames.includes(entry.name) || fileNames.some(f => entry.name.endsWith(f))) {
        found.push(fullPath);
      }
    }
  } catch {
    // Ignore permissions/file read errors
  }

  return found;
}

export function scanPrivacyInWorkspace(workspaceDir: string = process.cwd()): PrivacyReport {
  logger.info(`Scanning workspace for iOS dependencies and Privacy Nutrition Labels at: ${workspaceDir}`);

  const detectedSDKs: DetectedSDK[] = [];
  const detectedPermissions: DetectedPermission[] = [];
  const seenSDKNames = new Set<string>();

  // 1. Search for dependency lockfiles
  const lockfiles = searchFilesRecursively(workspaceDir, ['Podfile.lock', 'Package.resolved', 'Cartfile.resolved']);

  for (const lockfile of lockfiles) {
    try {
      const content = fs.readFileSync(lockfile, 'utf-8');
      for (const [sdkKey, rule] of Object.entries(KNOWN_SDK_RULES)) {
        if (!seenSDKNames.has(sdkKey) && content.includes(sdkKey)) {
          seenSDKNames.add(sdkKey);
          detectedSDKs.push({
            name: sdkKey,
            category: rule.category,
            dataCollected: rule.data,
            tracking: rule.tracking
          });
        }
      }
    } catch (err: any) {
      logger.warn(`Could not read lockfile ${lockfile}: ${err.message}`);
    }
  }

  // 2. Search for Info.plist files
  const plistFiles = searchFilesRecursively(workspaceDir, ['Info.plist']);
  for (const plist of plistFiles) {
    try {
      const content = fs.readFileSync(plist, 'utf-8');
      for (const [permKey, purpose] of Object.entries(PERMISSION_KEYS)) {
        if (content.includes(`<key>${permKey}</key>`)) {
          const match = content.match(new RegExp(`<key>${permKey}</key>\\s*<string>([^<]+)</string>`));
          detectedPermissions.push({
            key: permKey,
            purpose,
            description: match ? match[1].trim() : 'Permission configured without description'
          });
        }
      }
    } catch {
      // ignore
    }
  }

  const requiresTracking = detectedSDKs.some(s => s.tracking) ||
    detectedPermissions.some(p => p.key === 'NSUserTrackingUsageDescription');

  // Group into App Store Nutrition categories
  const dataUsedToTrackYou: string[] = [];
  const dataLinkedToYou: string[] = [];
  const dataNotLinkedToYou: string[] = [];

  for (const sdk of detectedSDKs) {
    if (sdk.tracking) {
      dataUsedToTrackYou.push(...sdk.dataCollected.map(d => `${d} (via ${sdk.name})`));
    } else if (sdk.category === 'Payments' || sdk.category === 'Analytics') {
      dataLinkedToYou.push(...sdk.dataCollected.map(d => `${d} (via ${sdk.name})`));
    } else {
      dataNotLinkedToYou.push(...sdk.dataCollected.map(d => `${d} (via ${sdk.name})`));
    }
  }

  // Generate markdown report
  let md = `## 🔒 Apple App Privacy & Nutrition Labels Report\n\n`;
  md += `> ℹ **App Tracking Transparency (ATT):** ${requiresTracking ? '⚠️ **REQUIRED** (Tracking SDKs or IDFA detected)' : '✅ Not explicitly required'}\n\n`;

  if (detectedSDKs.length > 0) {
    md += `### 📦 Detected Third-Party SDKs (${detectedSDKs.length})\n\n`;
    md += `| SDK Name | Category | Data Collected | Tracks User? |\n`;
    md += `| :--- | :--- | :--- | :---: |\n`;
    for (const sdk of detectedSDKs) {
      md += `| **${sdk.name}** | ${sdk.category} | ${sdk.dataCollected.join(', ')} | ${sdk.tracking ? '⚠️ Yes' : 'No'} |\n`;
    }
    md += `\n`;
  } else {
    md += `### 📦 Detected Third-Party SDKs\nNo known third-party analytics or ad SDKs detected in project lockfiles.\n\n`;
  }

  if (detectedPermissions.length > 0) {
    md += `### 📱 Configured iOS Privacy Permissions (${detectedPermissions.length})\n\n`;
    for (const p of detectedPermissions) {
      md += `- **${p.purpose}** (\`${p.key}\`): "${p.description}"\n`;
    }
    md += `\n`;
  }

  md += `### 📋 App Store Connect Nutrition Questionnaire Answers:\n`;
  md += `- **Data Used to Track You:** ${dataUsedToTrackYou.length > 0 ? dataUsedToTrackYou.join(', ') : 'None'}\n`;
  md += `- **Data Linked to You:** ${dataLinkedToYou.length > 0 ? dataLinkedToYou.join(', ') : 'None'}\n`;
  md += `- **Data Not Linked to You:** ${dataNotLinkedToYou.length > 0 ? dataNotLinkedToYou.join(', ') : 'None'}\n`;

  return {
    detectedSDKs,
    detectedPermissions,
    requiresTrackingAuthorization: requiresTracking,
    nutritionLabelChecklist: {
      dataUsedToTrackYou,
      dataLinkedToYou,
      dataNotLinkedToYou
    },
    markdownSummary: md
  };
}
