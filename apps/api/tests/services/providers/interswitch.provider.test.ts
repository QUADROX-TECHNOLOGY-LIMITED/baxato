import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceType, TransactionStatus, ProviderName } from '@baxato/common';
import { env } from '@baxato/config';
import { InterswitchProvider } from '../../../src/services/providers/interswitch.provider';

describe('InterswitchProvider (SVA v5 & Quickteller)', () => {
  let provider: InterswitchProvider;
  const originalFetch = global.fetch;

  beforeEach(() => {
    provider = new InterswitchProvider(env);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('acquires Passport OAuth token and caches it for subsequent calls', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'test_passport_token_123',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    });
    global.fetch = mockFetch;

    const token1 = await provider.getAccessToken();
    expect(token1).toBe('test_passport_token_123');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call should return cached token without invoking fetch again
    const token2 = await provider.getAccessToken();
    expect(token2).toBe('test_passport_token_123');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('validates customer successfully and extracts name and surcharge', async () => {
    const mockFetch = vi
      .fn()
      // 1. Passport OAuth
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'isw_token', expires_in: 3600 }),
      })
      // 2. Validate Customers
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ResponseCode: '90000',
          Customers: [
            {
              PaymentCode: '053413501',
              CustomerId: '45077162324',
              ResponseCode: '90000',
              FullName: 'Sogbein Olusola Samson Mr Flat 2 .',
              Amount: 0,
              Surcharge: 10000,
            },
          ],
        }),
      });
    global.fetch = mockFetch;

    const result = await provider.validateCustomer({
      serviceType: ServiceType.ELECTRICITY,
      paymentCode: '053413501',
      customerId: '45077162324',
    });

    expect(result.isValid).toBe(true);
    expect(result.customerName).toBe('Sogbein Olusola Samson Mr Flat 2 .');
    expect(result.surchargeKobo).toBe(10000n);
    expect(result.responseCode).toBe('90000');
  });

  it('handles customer validation failure when customer is invalid or expired', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'isw_token', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ResponseCode: '90000',
          Customers: [
            {
              PaymentCode: '053413401',
              CustomerId: 'invalid_meter',
              ResponseCode: '70071',
              ResponseDescription: '70071 - The CustomerId is Invalid or expired',
            },
          ],
        }),
      });
    global.fetch = mockFetch;

    const result = await provider.validateCustomer({
      serviceType: ServiceType.ELECTRICITY,
      paymentCode: '053413401',
      customerId: 'invalid_meter',
    });

    expect(result.isValid).toBe(false);
    expect(result.responseCode).toBe('70071');
    expect(result.responseMessage).toBe('Customer validation failed');
  });

  it('executes service vending successfully with standard code 90000', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'isw_token', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ResponseCode: '90000',
          ResponseDescription: 'Transaction Successful',
          TransactionRef: 'XAT|Web|3XAT0001|AIRTV|040926111541|8JMVAXUVGWV',
          ApprovedAmount: '10000',
          Balance: '161129',
        }),
      });
    global.fetch = mockFetch;

    const result = await provider.vendService({
      serviceType: ServiceType.AIRTIME,
      paymentCode: '90102',
      customerId: '07019367464',
      amountKobo: 10000n,
      requestReference: '241152093326',
    });

    expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(result.providerName).toBe(ProviderName.INTERSWITCH);
    expect(result.responseCode).toBe('90000');
    expect(result.providerReference).toContain('XAT|Web|3XAT0001');
  });

  it('extracts electricity token and units even on deduplicated response code 70022', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'isw_token', expires_in: 3600 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ResponseCode: '70022',
          ResponseDescription: 'Advice previously received and processed',
          TransactionRef: 'XAT|Web|3XAT0001|IBDPR|090926070221|A78FKC7H3RP',
          AdditionalInfo: {
            Pin: '1817 3728 1779 9724 2246',
            customerAddress: '9, ORI OSOKO COMMUNITY, OLOKUTA OYO',
            costOfUnits: '465.12',
            unitsCount: '14.3',
            vat: '34.88',
            tariffCode: 'R2',
            feeder: 'ELEWERAN 33KV FEEDER',
          },
        }),
      });
    global.fetch = mockFetch;

    const result = await provider.vendService({
      serviceType: ServiceType.ELECTRICITY,
      paymentCode: '053413501',
      customerId: '45077162324',
      amountKobo: 50000n,
      requestReference: '241186662425',
    });

    expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(result.token).toBe('1817 3728 1779 9724 2246');
    expect(result.units).toBe('14.3');
    expect(result.unitsCostKobo).toBe(46512n);
    expect(result.vatKobo).toBe(3488n);
    expect(result.tariff).toBe('R2');
    expect(result.feeder).toBe('ELEWERAN 33KV FEEDER');
    expect(result.customerAddress).toBe('9, ORI OSOKO COMMUNITY, OLOKUTA OYO');
    expect(result.pinData?.pin).toBe('1817 3728 1779 9724 2246');
  });

  it('performs requery and health check probes', async () => {
    const mockFetch = vi
      .fn()
      // Token call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'isw_token', expires_in: 3600 }),
      })
      // Requery call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ResponseCode: '90000',
          TransactionRef: 'XAT|Web|3XAT0001|AIRTV|TEST',
          ApprovedAmount: '10000',
        }),
      });
    global.fetch = mockFetch;

    const requery = await provider.requeryTransaction('241112345678');
    expect(requery.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(requery.responseCode).toBe('90000');

    // Health probe
    const health = await provider.getHealth();
    expect(health.providerName).toBe(ProviderName.INTERSWITCH);
    expect(health.isHealthy).toBe(true);
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
