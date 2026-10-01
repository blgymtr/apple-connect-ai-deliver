export type AIProviderType = 'gemini' | 'claude' | 'openai';

export type ReleaseNotesStyle = 'bullet-points' | 'emojis' | 'minimal' | 'detailed';

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
  dryRun: boolean;
  saveToDisk?: string;
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
