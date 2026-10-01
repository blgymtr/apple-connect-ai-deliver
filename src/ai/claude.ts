import { ExtractedGitContext, ReleaseNotesOutput } from '../types';
import { AIProvider, GenerateReleaseNotesOptions } from './types';
import { buildReleaseNotesPrompt, buildSystemPrompt, parseJsonResponse } from './prompts';

export class ClaudeProvider implements AIProvider {
  readonly name = 'Anthropic Claude';
  readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey: string, model: string = 'claude-3-7-sonnet-20250219') {
    if (!apiKey) {
      throw new Error('Claude API key is required. Provide it via "api_key" input or ANTHROPIC_API_KEY environment variable.');
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const url = 'https://api.anthropic.com/v1/messages';

    const body: any = {
      model: this.model,
      max_tokens: 2048,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };

    if (systemPrompt) {
      body.system = systemPrompt;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error (${response.status} ${response.statusText}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    const content = data.content?.[0];
    if (content?.type === 'text' && content.text) {
      return content.text;
    }

    throw new Error(`Claude API returned unexpected format: ${JSON.stringify(data)}`);
  }

  async generateReleaseNotes(
    gitContext: ExtractedGitContext,
    options: GenerateReleaseNotesOptions
  ): Promise<ReleaseNotesOutput> {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildReleaseNotesPrompt(gitContext, options);

    const rawResponse = await this.generateText(userPrompt, systemPrompt);
    return parseJsonResponse<ReleaseNotesOutput>(rawResponse);
  }
}
