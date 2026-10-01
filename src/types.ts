export type AIProviderType = 'gemini' | 'claude' | 'openai';

export type ReleaseNotesStyle = 'bullet-points' | 'emojis' | 'minimal' | 'detailed';

export type DeliveryMode = 'release-notes-only' | 'full-storefront';

export interface ActionConfig {
  provider: AIProviderType;
  model?: string;
  apiKey: string;
  appId: string;
  ascKeyId: string;
  ascIssuerId: string;
  ascPrivateKey: string;
  version?: string;
  locales: string[];
  style: ReleaseNotesStyle;
  gitSince: string;
  appContext?: string;
  appCategory?: string;
  mode?: DeliveryMode;
  dryRun: boolean;
  saveToDisk?: string;
  githubToken?: string;
  prComment?: boolean;
  webhookUrl?: string;
  demoUser?: string;
  demoPassword?: string;
  contactEmail?: string;
  contactPhone?: string;
  contactFirstName?: string;
  contactLastName?: string;
  reviewNotes?: string;
  generateReviewNotes?: boolean;
  submitForReview?: boolean;
  scanPrivacy?: boolean;
}

export interface StorefrontMetadata {
  whatsNew?: string;
  subtitle?: string; // Max 30 chars
  keywords?: string; // Max 100 chars, comma-separated, no spaces
  promotionalText?: string; // Max 170 chars
  description?: string; // Max 4000 chars
}

export interface LocalizedStorefrontOutput {
  [locale: string]: StorefrontMetadata;
}

export interface ReleaseNotesOutput {
  [locale: string]: string;
}

export interface CommitInfo {
  hash: string;
  subject: string;
  body: string;
  author: string;
  date: string;
  type?: 'feat' | 'fix' | 'perf' | 'refactor' | 'docs' | 'style' | 'chore' | 'other';
}

export interface ExtractedGitContext {
  sinceRef: string;
  untilRef: string;
  commits: CommitInfo[];
  summary: {
    features: string[];
    fixes: string[];
    improvements: string[];
    others: string[];
  };
}

export interface AppStoreVersionAttributes {
  platform: 'IOS' | 'MAC_OS' | 'TV_OS' | 'VISION_OS';
  versionString: string;
  appStoreState: string;
  copyright?: string;
  earliestReleaseDate?: string;
  downloadable?: boolean;
}

export interface AppStoreVersion {
  id: string;
  type: 'appStoreVersions';
  attributes: AppStoreVersionAttributes;
}

export interface AppStoreVersionLocalizationAttributes {
  locale: string;
  description?: string;
  keywords?: string;
  marketingUrl?: string;
  promotionalText?: string;
  supportUrl?: string;
  whatsNew?: string;
}

export interface AppStoreVersionLocalization {
  id: string;
  type: 'appStoreVersionLocalizations';
  attributes: AppStoreVersionLocalizationAttributes;
}

export interface AppInfoLocalizationAttributes {
  locale: string;
  name?: string;
  subtitle?: string;
  privacyPolicyUrl?: string;
}

export interface AppInfoLocalization {
  id: string;
  type: 'appInfoLocalizations';
  attributes: AppInfoLocalizationAttributes;
}

export interface AppInfo {
  id: string;
  type: 'appInfos';
  attributes: {
    appStoreState?: string;
    appStoreAgeRating?: string;
  };
}

export interface AppStoreReviewDetailAttributes {
  contactEmail?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactPhone?: string;
  demoAccountName?: string;
  demoAccountPassword?: string;
  demoAccountRequired?: boolean;
  notes?: string;
}

export interface AppStoreReviewDetail {
  id: string;
  type: 'appStoreReviewDetails';
  attributes: AppStoreReviewDetailAttributes;
}
