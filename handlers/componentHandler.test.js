import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractionResponseType } from 'discord-interactions';

vi.mock('../api/api.js', () => ({
  resolveSuggestionSelectionAndSave: vi.fn(),
}));

import { resolveSuggestionSelectionAndSave } from '../api/api.js';
import { handleComponent } from './componentHandler.js';

function mockRes() {
  const res = { sent: null };
  res.send = (body) => { res.sent = body; return res; };
  return res;
}

describe('handleComponent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('updates the original message when suggestion id is valid', async () => {
    resolveSuggestionSelectionAndSave.mockResolvedValue({
      content: '**You:** hello\n\n**Raptor:** Option 2',
      components: [{ type: 1, components: [{ type: 2, custom_id: 'message_suggestion:abc:1', label: 'Option 2', style: 2 }] }],
    });

    const req = { body: { data: { custom_id: 'message_suggestion:abc:1' } } };
    const res = mockRes();

    await handleComponent(req, res);

    expect(res.sent.type).toBe(InteractionResponseType.UPDATE_MESSAGE);
    expect(res.sent.data.components[0].content).toContain('Option 2');
  });

  it('returns ephemeral message when suggestion id is invalid or expired', async () => {
    resolveSuggestionSelectionAndSave.mockResolvedValue(null);

    const req = { body: { data: { custom_id: 'invalid' } } };
    const res = mockRes();

    await handleComponent(req, res);

    expect(res.sent.type).toBe(InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE);
    expect(res.sent.data.components[0].content).toContain('expired');
  });
});
