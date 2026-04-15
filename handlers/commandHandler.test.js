import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractionResponseType } from 'discord-interactions';

// Mock all external API calls before importing the handler
vi.mock('../api/api.js', () => ({
  askAndRespond: vi.fn(),
  translateChannelMessages: vi.fn(),
}));
vi.mock('../api/discord.js', () => ({
  purgeChannel: vi.fn(() => Promise.resolve(5)),
  editInteractionResponse: vi.fn(),
}));

import { handleCommand } from './commandHandler.js';

function mockRes() {
  const res = { sent: null };
  res.send = (body) => { res.sent = body; return res; };
  res.status = () => res;
  res.json = (body) => { res.sent = body; return res; };
  return res;
}

function mockReq(name, options = {}) {
  return {
    body: {
      data: { name, options: [] },
      token: 'test-token',
      channel_id: 'ch-123',
      member: { user: { username: 'raptor_user' } },
      ...options,
    },
  };
}

// ── Command dispatch ──────────────────────────────────────────
describe('handleCommand', () => {
  beforeEach(() => vi.clearAllMocks());

  it('responds with DEFERRED for /clearchannel', async () => {
    const req = mockReq('clearchannel');
    const res = mockRes();
    await handleCommand(req, res);
    expect(res.sent.type).toBe(InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE);
  });

  it('responds with DEFERRED for /translatechannel', async () => {
    const req = mockReq('translatechannel');
    const res = mockRes();
    await handleCommand(req, res);
    expect(res.sent.type).toBe(InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE);
  });

  it('responds with DEFERRED for /ask', async () => {
    const req = mockReq('ask', { data: { name: 'ask', options: [{ value: 'what is 2+2?' }] } });
    const res = mockRes();
    await handleCommand(req, res);
    expect(res.sent.type).toBe(InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE);
  });

  it('returns 400 for unknown commands', async () => {
    const req = mockReq('unknown');
    const res = mockRes();
    await handleCommand(req, res);
    expect(res.sent).toHaveProperty('error');
  });
});
