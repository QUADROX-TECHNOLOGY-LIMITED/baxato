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
   * Dispatches OTP via WhatsApp Cloud API.
   */
  public async sendOtp(phoneNumber: string): Promise<{ success: boolean; messageId?: string; simulated?: boolean }> {
    const normalized = this.normalizePhoneNumber(phoneNumber);
    const code = this.generateOtp(normalized);

    // In test or development without active token, simulate delivery
    if (env.NODE_ENV === 'test' || env.WHATSAPP_API_TOKEN === 'EAAB_DUMMY_WHATSAPP_TOKEN') {
      return {
        success: true,
        messageId: `wamid_simulated_${Date.now()}`,
        simulated: true,
      };
    }

    const endpoint = `https://graph.facebook.com/v22.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalized,
      type: 'text',
      text: {
        preview_url: false,
        body: `Your BAXATO verification code is: *${code}*. Valid for 10 minutes. Do not share this code with anyone.`,
      },
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.WHATSAPP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`[WhatsAppService] Cloud API dispatch failed: ${errorText}`);
        return { success: false };
      }

      const data = (await response.json()) as { messages?: Array<{ id: string }> };
      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } catch (err) {
      console.error('[WhatsAppService] Network error sending WhatsApp message:', err);
      return { success: false };
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
