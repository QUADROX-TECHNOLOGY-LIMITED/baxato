import { describe, it, expect, vi, beforeEach } from 'vitest';
import { zeptoMailService } from './zeptomail.service';
import { env } from '@baxato/config';

describe('ZeptoMailService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('simulates success when ZEPTOMAIL_API_KEY is not configured', async () => {
    const originalKey = env.ZEPTOMAIL_API_KEY;
    (env as unknown as Record<string, unknown>).ZEPTOMAIL_API_KEY = '';

    const result = await zeptoMailService.sendEmail(
      [{ email: 'test@example.com', name: 'Test User' }],
      'Test Subject',
      '<p>Test</p>',
    );

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('simulated-dev-msg-id');

    (env as unknown as Record<string, unknown>).ZEPTOMAIL_API_KEY = originalKey;
  });

  it('dispatches email with Zoho-enczapikey prefix when configured', async () => {
    const originalKey = env.ZEPTOMAIL_API_KEY;
    (env as unknown as Record<string, unknown>).ZEPTOMAIL_API_KEY = 'test_token_123';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ message_id: 'msg_999' }] }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await zeptoMailService.sendVerificationEmail(
      'mukhtar@example.com',
      'Mukhtar',
      'tok_abc123',
    );

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const fetchArgs = fetchMock.mock.calls[0];
    expect(fetchArgs[0]).toBe('https://api.zeptomail.com/v1.1/email');
    expect(fetchArgs[1].headers.Authorization).toBe('Zoho-enczapikey test_token_123');

    (env as unknown as Record<string, unknown>).ZEPTOMAIL_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });

  it('handles API error response gracefully', async () => {
    const originalKey = env.ZEPTOMAIL_API_KEY;
    (env as unknown as Record<string, unknown>).ZEPTOMAIL_API_KEY = 'Zoho-enczapikey valid_token';

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'Invalid recipient domain',
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await zeptoMailService.sendEmail(
      [{ email: 'invalid@example.com', name: 'Invalid' }],
      'Subject',
      'Body',
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('ZeptoMail dispatch failed [400]');

    (env as unknown as Record<string, unknown>).ZEPTOMAIL_API_KEY = originalKey;
    vi.unstubAllGlobals();
  });
});
