import { describe, it, expect, vi, beforeEach } from 'vitest';
import { askLLM, detectAndTranslate } from './api.js';

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ── askLLM ────────────────────────────────────────────────────
describe('askLLM', () => {
  it('returns the LLM response text on success', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ response: 'Hello there!' }),
      })
    ));

    const result = await askLLM('Hi');
    expect(result).toBe('Hello there!');
  });

  it('returns the fallback message when the LLM responds with an error status', async () => {
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ ok: false, status: 500 })
    ));

    const result = await askLLM('Hi');
    expect(result).toContain('error');
  });

  it('returns the fallback message when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('Network error'))));

    const result = await askLLM('Hi');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
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
