import { ExtractedGitContext, ReleaseNotesOutput, ReleaseNotesStyle } from '../types';

export interface GenerateReleaseNotesOptions {
  locales: string[];
  style: ReleaseNotesStyle;
  appContext?: string;
  version?: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;

  generateReleaseNotes(
    gitContext: ExtractedGitContext,
    options: GenerateReleaseNotesOptions
  ): Promise<ReleaseNotesOutput>;

  generateText(prompt: string, systemPrompt?: string): Promise<string>;
}
