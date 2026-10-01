import test from 'node:test';
import assert from 'node:assert';
import { scanPrivacyInWorkspace } from '../src/scanner/privacy';
import * as fs from 'fs';
import * as path from 'path';

test('scanPrivacyInWorkspace detects SDKs, permissions, and ATT tracking requirements', () => {
  const testDir = 'test-privacy-workspace';
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  // Create mock Podfile.lock
  const mockPodfileLock = `
PODS:
  - FirebaseAnalytics (10.20.0):
    - FirebaseCore
  - Google-Mobile-Ads-SDK (10.14.0)
  - RevenueCat (4.30.0)
DEPENDENCIES:
  - FirebaseAnalytics
  - Google-Mobile-Ads-SDK
  - RevenueCat
  `;
  fs.writeFileSync(path.join(testDir, 'Podfile.lock'), mockPodfileLock, 'utf-8');

  // Create mock Info.plist
  const mockInfoPlist = `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>NSCameraUsageDescription</key>
    <string>Used to scan QR codes for login</string>
    <key>NSUserTrackingUsageDescription</key>
    <string>Used to deliver personalized ads</string>
</dict>
</plist>
  `;
  fs.writeFileSync(path.join(testDir, 'Info.plist'), mockInfoPlist, 'utf-8');

  const report = scanPrivacyInWorkspace(testDir);

  // Assertions
  assert.ok(report.requiresTrackingAuthorization, 'Should require ATT because of Google Mobile Ads and NSUserTrackingUsageDescription');
  assert.ok(report.detectedSDKs.some(s => s.name === 'FirebaseAnalytics'), 'Should detect FirebaseAnalytics');
  assert.ok(report.detectedSDKs.some(s => s.name === 'RevenueCat'), 'Should detect RevenueCat');
  assert.ok(report.detectedPermissions.some(p => p.key === 'NSCameraUsageDescription'), 'Should detect Camera permission');

  assert.ok(report.markdownSummary.includes('Google-Mobile-Ads-SDK') || report.markdownSummary.includes('FirebaseAnalytics'));
  assert.ok(report.markdownSummary.includes('App Tracking Transparency'));
  assert.ok(report.markdownSummary.includes('Data Used to Track You'));

  // Clean up
  fs.rmSync(testDir, { recursive: true, force: true });
});
