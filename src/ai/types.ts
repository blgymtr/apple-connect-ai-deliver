import { ExtractedGitContext, LocalizedStorefrontOutput, ReleaseNotesOutput, ReleaseNotesStyle } from '../types';

export interface GenerateReleaseNotesOptions {
  locales: string[];
  style: ReleaseNotesStyle;
  appContext?: string;
  version?: string;
}

export interface GenerateStorefrontOptions extends GenerateReleaseNotesOptions {
  appCategory?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;

  generateReleaseNotes(
    gitContext: ExtractedGitContext,
    options: GenerateReleaseNotesOptions
  ): Promise<ReleaseNotesOutput>;

  generateStorefront(
    gitContext: ExtractedGitContext,
    options: GenerateStorefrontOptions
  ): Promise<LocalizedStorefrontOutput>;

  generateText(prompt: string, systemPrompt?: string): Promise<string>;
}
