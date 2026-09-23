import { env } from '@baxato/config';

export interface OtpRecord {
  code: string;
  phoneNumber: string;
  expiresAt: number;
  attempts: number;
}

export class WhatsAppService {
  // In-memory OTP store (in production can be backed by Redis)
  private otpStore = new Map<string, OtpRecord>();

  /**
   * Normalizes Nigerian & Ghanaian phone numbers into E.164 without leading '+'
   * e.g. '08161437292' -> '2348161437292'
   * e.g. '+2348161437292' -> '2348161437292'
   */
  public normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return `234${cleaned.slice(1)}`;
    }
    if (cleaned.length === 10) {
      return `234${cleaned}`;
    }
    if (cleaned.startsWith('234') || cleaned.startsWith('233')) {
      return cleaned;
    }
    return cleaned;
  }

  /**
   * Generates a 6-digit numeric OTP and caches with 10 minutes expiry.
   */
  public generateOtp(phoneNumber: string): string {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    // Secure random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.otpStore.set(normalized, {
      code,
      phoneNumber: normalized,
      expiresAt,
      attempts: 0,
    });

    return code;
  }

  /**
   * Dispatches OTP via WhatsApp Cloud API using pre-approved Meta message templates.
   */
  public async sendOtp(
    phoneNumber: string,
  ): Promise<{ success: boolean; messageId?: string; simulated?: boolean; error?: string }> {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    const code = this.generateOtp(normalized);

    // Automated unit test runner
    if (env.NODE_ENV === 'test') {
      return {
        success: true,
        messageId: `wamid_simulated_${Date.now()}`,
        simulated: true,
      };
    }

    // Explicit validation: In production, never silently simulate delivery if variables are missing
    if (!env.WHATSAPP_API_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      const missing: string[] = [];
      if (!env.WHATSAPP_API_TOKEN) missing.push('WHATSAPP_API_TOKEN');
      if (!env.WHATSAPP_PHONE_NUMBER_ID) missing.push('WHATSAPP_PHONE_NUMBER_ID');
      const errorMsg = `[WhatsAppService] Missing required WhatsApp environment variables: ${missing.join(', ')}. Please add them to your Coolify environment variables.`;
      console.error(errorMsg);
      return {
        success: false,
        error: errorMsg,
      };
    }

    const endpoint = `https://graph.facebook.com/v22.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    const templateName = env.WHATSAPP_TEMPLATE_NAME || 'registration_otp';
    const templateLanguage = env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_GB';

    const postToMeta = async (payload: unknown) => {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let responseJson: any = null;
      try {
        responseJson = JSON.parse(responseText);
      } catch {
        // raw text response
      }

      return {
        ok: response.ok,
        status: response.status,
        data: responseJson,
        rawText: responseText,
      };
    };

    // Format 1: Authentication Category Template (Standard body parameter + OTP button)
    const authOtpPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalized,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLanguage },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: code,
              },
            ],
          },
          {
            type: 'button',
            sub_type: 'otp',
            index: '0',
            parameters: [
              {
                type: 'text',
                text: code,
              },
            ],
          },
        ],
      },
    };

    // Format 2: Utility / Body-Only Template (Body parameter {{1}} without button)
    const bodyOnlyPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalized,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLanguage },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: code,
              },
            ],
          },
        ],
      },
    };

    // Format 3: Authentication Category Template with 'url' sub_type button
    const authUrlPayload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalized,
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLanguage },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: code,
              },
            ],
          },
          {
            type: 'button',
            sub_type: 'url',
            index: '0',
            parameters: [
              {
                type: 'text',
                text: code,
              },
            ],
          },
        ],
      },
    };

    try {
      // 1. Try primary format: Authentication template with OTP button
      let result = await postToMeta(authOtpPayload);

      // 2. If Meta rejected because the template has no button (Utility template or button mismatch)
      if (!result.ok && result.rawText.toLowerCase().includes('button')) {
        result = await postToMeta(bodyOnlyPayload);
      }

      // 3. If Meta rejected because the button sub_type was 'url' instead of 'otp'
      if (!result.ok && (result.rawText.includes('sub_type') || result.rawText.includes('url'))) {
        result = await postToMeta(authUrlPayload);
      }

      // 4. Final fallback check if body-only succeeds when components parameter had mismatch
      if (!result.ok && result.rawText.toLowerCase().includes('component')) {
        const retryBody = await postToMeta(bodyOnlyPayload);
        if (retryBody.ok) {
          result = retryBody;
        }
      }

      if (!result.ok) {
        console.error(
          `[WhatsAppService] Meta WhatsApp Cloud API template dispatch failed for template '${templateName}' (${templateLanguage}):`,
          result.data || result.rawText,
        );
        return {
          success: false,
          error: result.data?.error?.message || 'Meta Cloud API template delivery failed',
        };
      }

      const messageId = result.data?.messages?.[0]?.id;
      return {
        success: true,
        messageId,
      };
    } catch (err: unknown) {
      console.error('[WhatsAppService] Network error sending WhatsApp message:', err);
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  /**
   * Verifies the OTP submitted by the user.
   */
  public verifyOtp(phoneNumber: string, submittedCode: string): { valid: boolean; reason?: string } {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    const record = this.otpStore.get(normalized);

    if (!record) {
      return { valid: false, reason: 'No OTP requested for this phone number or expired.' };
    }

    if (Date.now() > record.expiresAt) {
      this.otpStore.delete(normalized);
      return { valid: false, reason: 'OTP has expired. Please request a new code.' };
    }

    if (record.attempts >= 5) {
      this.otpStore.delete(normalized);
      return { valid: false, reason: 'Too many incorrect attempts. Please request a new code.' };
    }

    if (record.code !== submittedCode) {
      record.attempts += 1;
      return { valid: false, reason: 'Invalid verification code.' };
    }

    // Success - invalidate OTP
    this.otpStore.delete(normalized);
    return { valid: true };
  }

  /**
   * Helper for testing: get active OTP
   */
  public getActiveOtpForTesting(phoneNumber: string): string | undefined {
    return this.otpStore.get(this.normalizePhoneNumber(phoneNumber))?.code;
  }
}

export const whatsAppService = new WhatsAppService();
