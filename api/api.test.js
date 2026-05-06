import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./discord.js', () => ({
  editInteractionResponse: vi.fn(() => Promise.resolve()),
}));

import {
  askLLM,
  askAndRespond,
  detectAndTranslate,
  resolveSuggestionSelectionAndSave,
} from './api.js';
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

  it('collapses a selected suggestion to the final user and Raptor pair', async () => {
    let linkedinfyCallCount = 0;

    vi.stubGlobal('fetch', vi.fn((url, options) => {
      if (url.endsWith('/chat/pipeline/linkedinfy')) {
        linkedinfyCallCount += 1;
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            response: linkedinfyCallCount === 1
              ? 'Primary option'
              : 'Primary option\nOr\nAlternative option',
          }),
        });
      }

      if (url.endsWith('/chat/pipeline/context-gate')) {
        const body = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: body.candidate_message }),
        });
      }

      if (url.endsWith('/chat/pipeline/translate')) {
        const body = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: body.message }),
        });
      }

      if (url.includes('/discord/history')) {
        return Promise.resolve({
          ok: true,
          status: 201,
          text: () => Promise.resolve(''),
        });
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }));

    await askAndRespond('Mensagem original', 'interaction-token', 'raptor_user');

    const checkpointCall = editInteractionResponse.mock.calls[3];
    const actionRow = checkpointCall[2][0];
    const continueId = actionRow.components.find(component => component.custom_id.includes(':continue')).custom_id;

    const progressSelection = await resolveSuggestionSelectionAndSave(continueId, 'raptor_user');
    expect(progressSelection.content).toContain('Generating alternative approaches');

    await vi.waitFor(() => {
      expect(editInteractionResponse.mock.calls.length).toBeGreaterThan(5);
      expect(editInteractionResponse.mock.calls.some(call => call[2]?.length)).toBe(true);
    });

    const suggestionCall = [...editInteractionResponse.mock.calls].reverse().find(call => call[2]?.length);
    const suggestionRow = suggestionCall[2][0];
    const firstSuggestionId = suggestionRow.components[0].custom_id;

    const selection = await resolveSuggestionSelectionAndSave(firstSuggestionId, 'raptor_user');

    expect(selection).toEqual({
      content: '**You:** Mensagem original\n\n**Raptor:** Primary option',
      components: [],
    });
  });

  it('translates optional suggestions before rendering the selection buttons', async () => {
    vi.stubGlobal('fetch', vi.fn((url, options) => {
      if (url.endsWith('/chat/pipeline/linkedinfy')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            response: 'Primary option\nOr\nEstou informando minha demissão prevista para a próxima semana com grande pesar.',
          }),
        });
      }

      if (url.endsWith('/chat/pipeline/context-gate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: 'Primary option' }),
        });
      }

      if (url.endsWith('/chat/pipeline/translate')) {
        const body = JSON.parse(options.body);
        if (body.message === 'Context-safe draft') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ response: 'Primary option' }),
          });
        }

        if (body.message === 'Primary option') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ response: 'Primary option' }),
          });
        }

        if (body.message === 'Estou informando minha demissão prevista para a próxima semana com grande pesar.') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ response: 'I am informing you with great regret that my resignation is planned for next week.' }),
          });
        }
      }

      if (url.includes('/discord/history')) {
        return Promise.resolve({
          ok: true,
          status: 201,
          text: () => Promise.resolve(''),
        });
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    }));

    await askAndRespond('Mensagem original', 'interaction-token', 'raptor_user');

    const checkpointCall = editInteractionResponse.mock.calls[3];
    const continueId = checkpointCall[2][0].components.find(component => component.custom_id.includes(':continue')).custom_id;

    await resolveSuggestionSelectionAndSave(continueId, 'raptor_user');

    await vi.waitFor(() => {
      const lastCall = editInteractionResponse.mock.calls.at(-1);
      expect(lastCall?.[2]).toBeTruthy();
      expect(lastCall[1]).toContain('I am informing you with great regret that my resignation is planned for next week.');
      expect(lastCall[1]).not.toContain('Estou informando minha demissão prevista para a próxima semana com grande pesar.');
    });
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
