import { ExtractedGitContext, ReleaseNotesOutput } from '../types';
import { AIProvider, GenerateReleaseNotesOptions } from './types';
import { buildReleaseNotesPrompt, buildSystemPrompt, parseJsonResponse } from './prompts';

export class OpenAIProvider implements AIProvider {
  readonly name = 'OpenAI';
  readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey: string, model: string = 'gpt-4o') {
    if (!apiKey) {
      throw new Error('OpenAI API key is required. Provide it via "api_key" input or OPENAI_API_KEY environment variable.');
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const url = 'https://api.openai.com/v1/chat/completions';

    const messages: any[] = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const body: any = {
      model: this.model,
      temperature: 0.3,
      messages
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status} ${response.statusText}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(`OpenAI API returned empty response: ${JSON.stringify(data)}`);
    }

    return content;
  }

  async generateReleaseNotes(
    gitContext: ExtractedGitContext,
    options: GenerateReleaseNotesOptions
  ): Promise<ReleaseNotesOutput> {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildReleaseNotesPrompt(gitContext, options);

    const url = 'https://api.openai.com/v1/chat/completions';

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const body: any = {
      model: this.model,
      temperature: 0.3,
      messages,
      response_format: { type: 'json_object' }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status} ${response.statusText}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(`OpenAI API returned empty response: ${JSON.stringify(data)}`);
    }

    return parseJsonResponse<ReleaseNotesOutput>(content);
  }
}
