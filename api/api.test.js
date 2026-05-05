import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./discord.js', () => ({
  editInteractionResponse: vi.fn(() => Promise.resolve()),
}));

import { askLLM, askAndRespond, detectAndTranslate } from './api.js';
import { editInteractionResponse } from './discord.js';

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// ── askLLM ────────────────────────────────────────────────────
describe('askLLM', () => {
  it('returns the LLM response on success', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          response: 'Hello there!',
        }),
      })
    ));

    const result = await askLLM('Hi');
    expect(result).toEqual({
      response: 'Hello there!',
    });
  });

  it('returns the fallback message when the LLM responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false, status: 500 })
    ));

    const result = await askLLM('Hi');
    expect(result.response).toContain('error');
  });

  it('returns the fallback message when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network error'))));

    const result = await askLLM('Hi');
    expect(typeof result.response).toBe('string');
    expect(result.response.length).toBeGreaterThan(0);
  });

  it('edits the same message through the staged pipeline and ends at the checkpoint', async () => {
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.endsWith('/chat/pipeline/linkedinfy')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: 'Linked draft' }),
        });
      }

      if (url.endsWith('/chat/pipeline/context-gate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: 'Context-safe draft' }),
        });
      }

      if (url.endsWith('/chat/pipeline/translate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: 'Final translated draft' }),
        });
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }));

    await askAndRespond('Mensagem original', 'interaction-token', 'raptor_user');

    expect(editInteractionResponse).toHaveBeenCalledTimes(4);
    expect(editInteractionResponse).toHaveBeenNthCalledWith(
      1,
      'interaction-token',
      expect.stringContaining('Rewriting'),
    );
    expect(editInteractionResponse).toHaveBeenNthCalledWith(
      2,
      'interaction-token',
      expect.stringContaining('Validating'),
    );
    expect(editInteractionResponse).toHaveBeenNthCalledWith(
      3,
      'interaction-token',
      expect.stringContaining('Translating'),
    );
    expect(editInteractionResponse).toHaveBeenNthCalledWith(
      4,
      'interaction-token',
      expect.stringContaining('Primary draft ready'),
      expect.arrayContaining([
        expect.objectContaining({
          components: expect.arrayContaining([
            expect.objectContaining({ custom_id: expect.stringContaining(':finish') }),
            expect.objectContaining({ custom_id: expect.stringContaining(':continue') }),
          ]),
        }),
      ]),
    );
  });
});

// ── detectAndTranslate ────────────────────────────────────────
describe('detectAndTranslate', () => {
  it('returns null when the text is already in English', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ response: 'ENGLISH' }),
      })
    ));

    const result = await detectAndTranslate('Hello world');
    expect(result).toBeNull();
  });

  it('returns the translated text for non-English input', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ response: 'Good morning' }),
      })
    ));

    const result = await detectAndTranslate('Bom dia');
    expect(result).toBe('Good morning');
  });

  it('returns null when fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))));

    const result = await detectAndTranslate('Hola');
    expect(result).toBeNull();
  });

  it('returns null when LLM returns a non-ok status', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false, status: 503 })
    ));

    const result = await detectAndTranslate('Olá');
    expect(result).toBeNull();
  });
});
