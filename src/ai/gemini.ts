import { ExtractedGitContext, ReleaseNotesOutput } from '../types';
import { AIProvider, GenerateReleaseNotesOptions } from './types';
import { buildReleaseNotesPrompt, buildSystemPrompt, parseJsonResponse } from './prompts';

export class GeminiProvider implements AIProvider {
  readonly name = 'Google Gemini';
  readonly model: string;
  private readonly apiKey: string;

  constructor(apiKey: string, model: string = 'gemini-2.0-flash') {
    if (!apiKey) {
      throw new Error('Gemini API key is required. Provide it via "api_key" input or GEMINI_API_KEY environment variable.');
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateText(prompt: string, systemPrompt?: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const body: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    };

    if (systemPrompt) {
      body.systemInstruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status} ${response.statusText}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error(`Gemini API returned empty response: ${JSON.stringify(data)}`);
    }

    return text;
  }

  async generateReleaseNotes(
    gitContext: ExtractedGitContext,
    options: GenerateReleaseNotesOptions
  ): Promise<ReleaseNotesOutput> {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildReleaseNotesPrompt(gitContext, options);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const body: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status} ${response.statusText}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error(`Gemini API returned no text: ${JSON.stringify(data)}`);
    }

    return parseJsonResponse<ReleaseNotesOutput>(text);
  }

  async generateStorefront(
    gitContext: ExtractedGitContext,
    options: import('./types').GenerateStorefrontOptions
  ): Promise<import('../types').LocalizedStorefrontOutput> {
    const systemPrompt = buildSystemPrompt();
    const { buildStorefrontPrompt, sanitizeASOKeywords, sanitizeSubtitle, sanitizePromotionalText } = await import('./prompts');
    const userPrompt = buildStorefrontPrompt(gitContext, options);

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const body: any = {
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3
      }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error (${response.status} ${response.statusText}): ${errorText}`);
    }

    const data = (await response.json()) as any;
    const candidate = data.candidates?.[0];
    const text = candidate?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error(`Gemini API returned no text: ${JSON.stringify(data)}`);
    }

    const parsed = parseJsonResponse<import('../types').LocalizedStorefrontOutput>(text);
    for (const locale of Object.keys(parsed)) {
      const meta = parsed[locale];
      if (meta.keywords) meta.keywords = sanitizeASOKeywords(meta.keywords);
      if (meta.subtitle) meta.subtitle = sanitizeSubtitle(meta.subtitle);
      if (meta.promotionalText) meta.promotionalText = sanitizePromotionalText(meta.promotionalText);
    }
    return parsed;
  }
}
