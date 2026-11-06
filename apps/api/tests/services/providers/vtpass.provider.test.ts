import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ProviderName,
  ServiceType,
  TransactionStatus,
  AppError,
} from '@baxato/common';
import {
  VtpassProvider,
  generateVtpassRequestId,
  extractCleanToken,
  TELCO_TO_VTPASS_AIRTIME,
  DISCO_TO_VTPASS_SERVICE_ID,
} from '../../../src/services/providers/vtpass.provider.js';

describe('VtpassProvider Adapter Implementation', () => {
  const mockEnv: any = {
    VTPASS_BASE_URL: 'https://sandbox.vtpass.com/api',
    VTPASS_API_KEY: 'test_api_key_123',
    VTPASS_SECRET_KEY: 'SK_test_secret_key_456',
    VTPASS_PUBLIC_KEY: 'PK_test_public_key_789',
  };

  let provider: VtpassProvider;
  const originalFetch = global.fetch;

  beforeEach(() => {
    provider = new VtpassProvider(mockEnv);
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Utility & Reference Generation', () => {
    it('generateVtpassRequestId produces a strictly compliant timestamp-prefixed ID', () => {
      const id = generateVtpassRequestId();
      const now = new Date();
      const expectedDatePrefix = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

      expect(id.startsWith(expectedDatePrefix)).toBe(true);
      expect(id.length).toBeGreaterThanOrEqual(18);

      const id2 = generateVtpassRequestId();
      expect(id).not.toBe(id2);
    });

    it('extractCleanToken strips "Token : " prefixes cleanly', () => {
      expect(extractCleanToken('Token : 1234 5678 9012 3456 7890')).toBe('1234 5678 9012 3456 7890');
      expect(extractCleanToken('token: 9988776655')).toBe('9988776655');
      expect(extractCleanToken('112233445566')).toBe('112233445566');
      expect(extractCleanToken(null)).toBeUndefined();
      expect(extractCleanToken('')).toBeUndefined();
    });

    it('TELCO_TO_VTPASS_AIRTIME correctly maps 9mobile to etisalat and major networks', () => {
      expect(TELCO_TO_VTPASS_AIRTIME['MTN']).toBe('mtn');
      expect(TELCO_TO_VTPASS_AIRTIME['AIRTEL']).toBe('airtel');
      expect(TELCO_TO_VTPASS_AIRTIME['GLO']).toBe('glo');
      expect(TELCO_TO_VTPASS_AIRTIME['9MOBILE']).toBe('etisalat');
      expect(TELCO_TO_VTPASS_AIRTIME['NINEMOBILE']).toBe('etisalat');
    });

    it('DISCO_TO_VTPASS_SERVICE_ID correctly maps all 12 Nigerian DisCos', () => {
      expect(DISCO_TO_VTPASS_SERVICE_ID['IBEDC']).toBe('ibadan-electric');
      expect(DISCO_TO_VTPASS_SERVICE_ID['IKEDC']).toBe('ikeja-electric');
      expect(DISCO_TO_VTPASS_SERVICE_ID['EKEDC']).toBe('eko-electric');
      expect(DISCO_TO_VTPASS_SERVICE_ID['AEDC']).toBe('abuja-electric');
      expect(DISCO_TO_VTPASS_SERVICE_ID['EEDC']).toBe('enugu-electric');
      expect(DISCO_TO_VTPASS_SERVICE_ID['KEDCO']).toBe('kano-electric');
      expect(DISCO_TO_VTPASS_SERVICE_ID['JED']).toBe('jos-electric');
      expect(DISCO_TO_VTPASS_SERVICE_ID['PHED']).toBe('portharcourt-electric');
      expect(DISCO_TO_VTPASS_SERVICE_ID['BEDC']).toBe('benin-electric');
      expect(DISCO_TO_VTPASS_SERVICE_ID['KAEDCO']).toBe('kaduna-electric');
      expect(DISCO_TO_VTPASS_SERVICE_ID['YEDC']).toBe('yola-electric');
      expect(DISCO_TO_VTPASS_SERVICE_ID['APLE']).toBe('aba-electric');
    });
  });

  describe('Customer / Meter Validation (validateCustomer)', () => {
    it('bypasses validation for non-electricity services (Airtime)', async () => {
      const result = await provider.validateCustomer({
        serviceType: ServiceType.AIRTIME,
        paymentCode: 'MTN',
        customerId: '08031234567',
      });

      expect(result.isValid).toBe(true);
      expect(result.customerId).toBe('08031234567');
      expect(result.responseCode).toBe('000');
    });

    it('validates prepaid electricity meter successfully via /merchant-verify', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: '000',
            response_description: 'TRANSACTION SUCCESSFUL',
            content: {
              Customer_Name: 'BABATUNDE ADENIRAN',
              Address: '15 ALLIED ROAD, IKEJA',
              MeterNumber: '01234567890',
              Outstanding: '0',
              Min_Amount: '500',
              Max_Amount: '100000',
            },
          }),
      } as any);

      const result = await provider.validateCustomer({
        serviceType: ServiceType.ELECTRICITY,
        paymentCode: '053396201',
        customerId: '01234567890',
        metadata: {
          disco: 'IKEDC',
          meterType: 'PREPAID',
        },
      });

      expect(result.isValid).toBe(true);
      expect(result.customerName).toBe('BABATUNDE ADENIRAN');
      expect(result.customerAddress).toBe('15 ALLIED ROAD, IKEJA');
      expect(result.minimumAmountKobo).toBe(50000n);
      expect(result.maximumAmountKobo).toBe(10000000n);
      expect(result.detectedMeterType).toBe('PREPAID');
      expect(result.responseCode).toBe('000');

      // Verify request payload
      expect(global.fetch).toHaveBeenCalledWith(
        'https://sandbox.vtpass.com/api/merchant-verify',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'api-key': 'test_api_key_123',
            'secret-key': 'SK_test_secret_key_456',
          }),
          body: JSON.stringify({
            billersCode: '01234567890',
            serviceID: 'ikeja-electric',
            type: 'prepaid',
          }),
        }),
      );
    });

    it('returns isValid: false when merchant-verify returns non-000 error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: '016',
            response_description: 'TRANSACTION FAILED: Meter Not Found',
            content: {
              error: 'Invalid meter number',
            },
          }),
      } as any);

      const result = await provider.validateCustomer({
        serviceType: ServiceType.ELECTRICITY,
        paymentCode: '053396201',
        customerId: '99999999999',
        metadata: {
          disco: 'IKEDC',
          meterType: 'PREPAID',
        },
      });

      expect(result.isValid).toBe(false);
      expect(result.responseCode).toBe('016');
      expect(result.responseMessage).toContain('Meter Not Found');
    });

    it('throws AppError 503 if verification endpoint is unreachable', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network connection timeout'));

      await expect(
        provider.validateCustomer({
          serviceType: ServiceType.ELECTRICITY,
          paymentCode: '053396201',
          customerId: '01234567890',
          metadata: { disco: 'IKEDC' },
        }),
      ).rejects.toThrow(AppError);
    });
  });

  describe('Service Vending (vendService)', () => {
    it('vends airtime successfully via /pay with correct telecom mapping', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: '000',
            response_description: 'TRANSACTION SUCCESSFUL',
            requestId: '20261106120000123456',
            amount: 1000,
            content: {
              transactions: {
                status: 'delivered',
                product_name: 'MTN Airtime VTU',
                unique_element: '08031234567',
                transactionId: 'VTP_TXN_98765',
              },
            },
          }),
      } as any);

      const result = await provider.vendService({
        serviceType: ServiceType.AIRTIME,
        paymentCode: 'MTN',
        customerId: '08031234567',
        amountKobo: 100000n, // ₦1,000
        requestReference: 'BAX_AIR_123',
        metadata: {
          network: 'MTN',
        },
      });

      expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(result.providerName).toBe(ProviderName.VTPASS);
      expect(result.providerReference).toBe('VTP_TXN_98765');
      expect(result.responseCode).toBe('000');
      expect(result.amountKobo).toBe(100000n);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://sandbox.vtpass.com/api/pay',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"serviceID":"mtn"'),
        }),
      );
    });

    it('vends 9mobile airtime using "etisalat" serviceID', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: '000',
            response_description: 'TRANSACTION SUCCESSFUL',
            requestId: '20261106120000999999',
            amount: 500,
            content: {
              transactions: {
                status: 'delivered',
                transactionId: 'VTP_9MOB_001',
              },
            },
          }),
      } as any);

      await provider.vendService({
        serviceType: ServiceType.AIRTIME,
        paymentCode: '9MOBILE',
        customerId: '08091234567',
        amountKobo: 50000n,
        requestReference: 'BAX_AIR_9MOB',
        metadata: {
          network: '9MOBILE',
        },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://sandbox.vtpass.com/api/pay',
        expect.objectContaining({
          body: expect.stringContaining('"serviceID":"etisalat"'),
        }),
      );
    });

    it('vends prepaid electricity and extracts STS PIN token and units', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: '000',
            response_description: 'TRANSACTION SUCCESSFUL',
            requestId: '20261106120000888888',
            amount: 5000,
            purchased_code: 'Token : 1234 5678 9012 3456 7890',
            units: '68.4 kWh',
            content: {
              transactions: {
                status: 'delivered',
                transactionId: 'VTP_ELEC_54321',
              },
            },
          }),
      } as any);

      const result = await provider.vendService({
        serviceType: ServiceType.ELECTRICITY,
        paymentCode: '053396401',
        customerId: '04123456789',
        customerMobile: '08031234567',
        amountKobo: 500000n, // ₦5,000
        requestReference: 'BAX_ELEC_123',
        metadata: {
          disco: 'EKEDC',
          meterType: 'PREPAID',
        },
      });

      expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(result.token).toBe('1234 5678 9012 3456 7890');
      expect(result.units).toBe('68.4 kWh');
      expect(result.providerReference).toBe('VTP_ELEC_54321');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://sandbox.vtpass.com/api/pay',
        expect.objectContaining({
          body: expect.stringContaining('"serviceID":"eko-electric"'),
        }),
      );
    });

    it('extracts token from mainToken property if returned (EKEDC response variant)', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: '000',
            response_description: 'TRANSACTION SUCCESSFUL',
            mainToken: '98765432109876543210',
            mainTokenUnits: '42.1 kWh',
            content: {
              transactions: {
                status: 'delivered',
                transactionId: 'VTP_MAIN_TOKEN_99',
              },
            },
          }),
      } as any);

      const result = await provider.vendService({
        serviceType: ServiceType.ELECTRICITY,
        paymentCode: '053396401',
        customerId: '04123456789',
        amountKobo: 300000n,
        requestReference: 'BAX_ELEC_MAIN_TOKEN',
        metadata: { disco: 'EKEDC' },
      });

      expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(result.token).toBe('98765432109876543210');
      expect(result.units).toBe('42.1 kWh');
    });

    it('marks transaction as PROCESSING when code is 099 or status is pending', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: '099',
            response_description: 'TRANSACTION PROCESSING',
            content: {
              transactions: {
                status: 'pending',
                transactionId: 'VTP_PENDING_1',
              },
            },
          }),
      } as any);

      const result = await provider.vendService({
        serviceType: ServiceType.AIRTIME,
        paymentCode: 'GLO',
        customerId: '08051234567',
        amountKobo: 100000n,
        requestReference: 'BAX_AIR_GLO_PENDING',
        metadata: { network: 'GLO' },
      });

      expect(result.status).toBe(TransactionStatus.PROCESSING);
      expect(result.responseCode).toBe('099');
    });

    it('marks transaction as FAILED when response is non-000 and non-099', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: '014',
            response_description: 'DUPLICATE REQUEST ID',
          }),
      } as any);

      const result = await provider.vendService({
        serviceType: ServiceType.AIRTIME,
        paymentCode: 'AIRTEL',
        customerId: '08021234567',
        amountKobo: 100000n,
        requestReference: 'BAX_AIR_DUP',
        metadata: { network: 'AIRTEL' },
      });

      expect(result.status).toBe(TransactionStatus.FAILED);
      expect(result.responseCode).toBe('014');
    });
  });

  describe('Requery (requeryTransaction)', () => {
    it('queries transaction status successfully using request_id', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: '000',
            response_description: 'TRANSACTION SUCCESSFUL',
            purchased_code: 'Token : 9999 8888 7777 6666 5555',
            units: '50 kWh',
            content: {
              transactions: {
                status: 'delivered',
                transactionId: 'VTP_REQUERY_OK',
              },
            },
          }),
      } as any);

      const result = await provider.requeryTransaction('20261106120000111111');

      expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
      expect(result.providerReference).toBe('VTP_REQUERY_OK');
      expect(result.token).toBe('9999 8888 7777 6666 5555');
      expect(result.units).toBe('50 kWh');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://sandbox.vtpass.com/api/requery',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ request_id: '20261106120000111111' }),
        }),
      );
    });

    it('returns status FAILED when transactions.status is failed', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: '000',
            response_description: 'TRANSACTION FAILED',
            content: {
              transactions: {
                status: 'failed',
                transactionId: 'VTP_REQUERY_FAIL',
              },
            },
          }),
      } as any);

      const result = await provider.requeryTransaction('20261106120000222222');
      expect(result.status).toBe(TransactionStatus.FAILED);
    });

    it('returns status PROCESSING when transactions.status is pending or initiated', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: '099',
            response_description: 'TRANSACTION PROCESSING',
            content: {
              transactions: {
                status: 'initiated',
              },
            },
          }),
      } as any);

      const result = await provider.requeryTransaction('20261106120000333333');
      expect(result.status).toBe(TransactionStatus.PROCESSING);
    });
  });

  describe('Health Probe (getHealth)', () => {
    it('returns isHealthy: true when /balance returns code 1 or 200', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            code: 1,
            contents: {
              balance: 250000.5,
            },
          }),
      } as any);

      const health = await provider.getHealth();

      expect(health.isHealthy).toBe(true);
      expect(health.providerName).toBe(ProviderName.VTPASS);
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
      expect(health.message).toBe('VTpass API online');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://sandbox.vtpass.com/api/balance',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'api-key': 'test_api_key_123',
            'public-key': 'PK_test_public_key_789',
          }),
        }),
      );
    });

    it('returns isHealthy: false when /balance throws network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const health = await provider.getHealth();

      expect(health.isHealthy).toBe(false);
      expect(health.message).toContain('Connection refused');
    });
  });
});
