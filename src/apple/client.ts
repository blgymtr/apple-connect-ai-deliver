import { AppStoreVersion, AppStoreVersionLocalization, ReleaseNotesOutput } from '../types';
import { generateAppStoreConnectToken } from './auth';
import { logger } from '../utils/logger';

export interface AppStoreConnectClientOptions {
  appId: string;
  keyId: string;
  issuerId: string;
  privateKey: string;
  dryRun?: boolean;
}

export class AppStoreConnectClient {
  private readonly appId: string;
  private readonly keyId: string;
  private readonly issuerId: string;
  private readonly privateKey: string;
  private readonly dryRun: boolean;
  private readonly baseUrl = 'https://api.appstoreconnect.apple.com/v1';

  constructor(options: AppStoreConnectClientOptions) {
    this.appId = options.appId;
    this.keyId = options.keyId;
    this.issuerId = options.issuerId;
    this.privateKey = options.privateKey;
    this.dryRun = !!options.dryRun;
  }

  private getToken(): string {
    return generateAppStoreConnectToken(this.keyId, this.issuerId, this.privateKey);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    const response = await fetch(url, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorDetail = errorBody;
      try {
        const parsed = JSON.parse(errorBody);
        if (parsed.errors && Array.isArray(parsed.errors)) {
          errorDetail = parsed.errors.map((e: any) => `${e.title || ''}: ${e.detail || ''}`).join(', ');
        }
      } catch {
        // use raw text
      }
      throw new Error(`App Store Connect API error (${response.status} ${response.statusText}): ${errorDetail}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  /**
   * Finds the target version.
   * If versionString is specified, finds that exact version.
   * If not, finds the current editable version in PREPARE_FOR_SUBMISSION or REJECTED state.
   */
  async findTargetVersion(targetVersionString?: string): Promise<AppStoreVersion> {
    logger.info(`Fetching App Store versions for App ID: ${this.appId}...`);

    let endpoint = `/apps/${this.appId}/appStoreVersions?filter[platform]=IOS&limit=20`;
    if (targetVersionString) {
      endpoint += `&filter[versionString]=${encodeURIComponent(targetVersionString)}`;
    }

    const result = await this.request<{ data: AppStoreVersion[] }>(endpoint);
    const versions = result.data || [];

    if (versions.length === 0) {
      throw new Error(`No iOS App Store versions found for App ID ${this.appId}${targetVersionString ? ` with version ${targetVersionString}` : ''}.`);
    }

    if (targetVersionString) {
      const matched = versions.find(v => v.attributes.versionString === targetVersionString);
      if (matched) return matched;
      throw new Error(`Version '${targetVersionString}' was not found in App Store Connect.`);
    }

    // Editable states in App Store Connect
    const editableStates = [
      'PREPARE_FOR_SUBMISSION',
      'DEVELOPER_REJECTED',
      'REJECTED',
      'METADATA_REJECTED'
    ];

    const editableVersion = versions.find(v => editableStates.includes(v.attributes.appStoreState));
    if (editableVersion) {
      logger.info(`Found editable version '${editableVersion.attributes.versionString}' (State: ${editableVersion.attributes.appStoreState}).`);
      return editableVersion;
    }

    // Fallback: newest version
    logger.warn(`No version found in PREPARE_FOR_SUBMISSION state. Using latest version '${versions[0].attributes.versionString}' (State: ${versions[0].attributes.appStoreState}).`);
    return versions[0];
  }

  /**
   * Fetches all localizations for an App Store version.
   */
  async getVersionLocalizations(versionId: string): Promise<AppStoreVersionLocalization[]> {
    const endpoint = `/appStoreVersions/${versionId}/appStoreVersionLocalizations`;
    const result = await this.request<{ data: AppStoreVersionLocalization[] }>(endpoint);
    return result.data || [];
  }

  /**
   * Updates or creates localization "What's New" release notes in App Store Connect.
   */
  async updateReleaseNotes(
    versionId: string,
    releaseNotesByLocale: ReleaseNotesOutput
  ): Promise<{ updatedLocales: string[]; createdLocales: string[] }> {
    const existingLocalizations = await this.getVersionLocalizations(versionId);
    const existingLocaleMap = new Map<string, AppStoreVersionLocalization>();
    for (const loc of existingLocalizations) {
      existingLocaleMap.set(loc.attributes.locale, loc);
    }

    const updatedLocales: string[] = [];
    const createdLocales: string[] = [];

    for (const [locale, notes] of Object.entries(releaseNotesByLocale)) {
      if (!notes) continue;

      const existing = existingLocaleMap.get(locale);

      if (this.dryRun) {
        logger.info(`[DRY-RUN] Would ${existing ? 'UPDATE' : 'CREATE'} release notes for locale '${locale}':\n${notes}\n`);
        if (existing) updatedLocales.push(locale);
        else createdLocales.push(locale);
        continue;
      }

      if (existing) {
        logger.info(`Updating release notes for locale '${locale}' (ID: ${existing.id})...`);
        const endpoint = `/appStoreVersionLocalizations/${existing.id}`;
        await this.request(endpoint, {
          method: 'PATCH',
          body: JSON.stringify({
            data: {
              type: 'appStoreVersionLocalizations',
              id: existing.id,
              attributes: {
                whatsNew: notes
              }
            }
          })
        });
        updatedLocales.push(locale);
        logger.success(`Updated release notes for '${locale}'.`);
      } else {
        logger.info(`Creating new localization for locale '${locale}'...`);
        const endpoint = `/appStoreVersionLocalizations`;
        await this.request(endpoint, {
          method: 'POST',
          body: JSON.stringify({
            data: {
              type: 'appStoreVersionLocalizations',
              attributes: {
                locale,
                whatsNew: notes
              },
              relationships: {
                appStoreVersion: {
                  data: {
                    type: 'appStoreVersions',
                    id: versionId
                  }
                }
              }
            }
          })
        });
        createdLocales.push(locale);
        logger.success(`Created localization and set release notes for '${locale}'.`);
      }
    }

    return { updatedLocales, createdLocales };
  }

  /**
   * Updates full storefront metadata (WhatsNew, Description, Keywords, PromotionalText, Subtitle).
   */
  async updateStorefrontMetadata(
    versionId: string,
    metadataByLocale: import('../types').LocalizedStorefrontOutput
  ): Promise<{ updatedLocales: string[]; createdLocales: string[] }> {
    const existingVersionLocs = await this.getVersionLocalizations(versionId);
    const existingVersionLocMap = new Map<string, AppStoreVersionLocalization>();
    for (const loc of existingVersionLocs) {
      existingVersionLocMap.set(loc.attributes.locale, loc);
    }

    // Try fetching AppInfo for subtitles
    let appInfoId = '';
    const existingAppInfoLocMap = new Map<string, import('../types').AppInfoLocalization>();
    try {
      const appInfoRes = await this.request<{ data: import('../types').AppInfo[] }>(`/apps/${this.appId}/appInfos`);
      if (appInfoRes.data && appInfoRes.data.length > 0) {
        appInfoId = appInfoRes.data[0].id;
        const appInfoLocs = await this.request<{ data: import('../types').AppInfoLocalization[] }>(`/appInfos/${appInfoId}/appInfoLocalizations`);
        for (const loc of appInfoLocs.data || []) {
          existingAppInfoLocMap.set(loc.attributes.locale, loc);
        }
      }
    } catch (err: any) {
      logger.warn(`Could not fetch AppInfo localizations for subtitle: ${err.message}`);
    }

    const updatedLocales: string[] = [];
    const createdLocales: string[] = [];

    for (const [locale, meta] of Object.entries(metadataByLocale)) {
      if (!meta) continue;

      if (this.dryRun) {
        logger.info(`[DRY-RUN] Storefront metadata for locale '${locale}':`);
        if (meta.subtitle) console.log(`  Subtitle (${meta.subtitle.length}/30): ${meta.subtitle}`);
        if (meta.keywords) console.log(`  Keywords (${meta.keywords.length}/100): ${meta.keywords}`);
        if (meta.promotionalText) console.log(`  Promo Text (${meta.promotionalText.length}/170): ${meta.promotionalText}`);
        if (meta.whatsNew) console.log(`  What's New: ${meta.whatsNew.substring(0, 100)}...`);
        updatedLocales.push(locale);
        continue;
      }

      // 1. Update/Create version localization (whatsNew, description, keywords, promotionalText)
      const existingVerLoc = existingVersionLocMap.get(locale);
      const attributes: Record<string, string> = {};
      if (meta.whatsNew) attributes.whatsNew = meta.whatsNew;
      if (meta.description) attributes.description = meta.description;
      if (meta.keywords) attributes.keywords = meta.keywords;
      if (meta.promotionalText) attributes.promotionalText = meta.promotionalText;

      if (existingVerLoc) {
        logger.info(`Updating version localization for '${locale}'...`);
        await this.request(`/appStoreVersionLocalizations/${existingVerLoc.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            data: {
              type: 'appStoreVersionLocalizations',
              id: existingVerLoc.id,
              attributes
            }
          })
        });
        updatedLocales.push(locale);
      } else {
        logger.info(`Creating version localization for '${locale}'...`);
        await this.request(`/appStoreVersionLocalizations`, {
          method: 'POST',
          body: JSON.stringify({
            data: {
              type: 'appStoreVersionLocalizations',
              attributes: {
                locale,
                ...attributes
              },
              relationships: {
                appStoreVersion: {
                  data: {
                    type: 'appStoreVersions',
                    id: versionId
                  }
                }
              }
            }
          })
        });
        createdLocales.push(locale);
      }

      // 2. Update subtitle if appInfoId exists and subtitle provided
      if (appInfoId && meta.subtitle) {
        const existingAppInfoLoc = existingAppInfoLocMap.get(locale);
        if (existingAppInfoLoc) {
          logger.info(`Updating subtitle for '${locale}'...`);
          await this.request(`/appInfoLocalizations/${existingAppInfoLoc.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              data: {
                type: 'appInfoLocalizations',
                id: existingAppInfoLoc.id,
                attributes: {
                  subtitle: meta.subtitle
                }
              }
            })
          });
        }
      }
    }

    return { updatedLocales, createdLocales };
  }
}
