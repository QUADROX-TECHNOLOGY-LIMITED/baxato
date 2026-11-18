import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceType, TransactionStatus, ProviderName } from '@baxato/common';
import { env } from '@baxato/config';
import { MonnifyProvider } from '../../../src/services/providers/monnify.provider';

describe('MonnifyProvider (VAS & Bills Payment)', () => {
  let provider: MonnifyProvider;
  const originalFetch = global.fetch;

  beforeEach(() => {
    provider = new MonnifyProvider(env);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('exchanges API credentials for Bearer token and caches it', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        requestSuccessful: true,
        responseMessage: 'success',
        responseCode: '0',
        responseBody: {
          accessToken: 'test_monnify_jwt_token',
          expiresIn: 3600,
        },
      }),
    });
    global.fetch = mockFetch;

    const token1 = await provider.getAccessToken();
    expect(token1).toBe('test_monnify_jwt_token');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call uses cached token
    const token2 = await provider.getAccessToken();
    expect(token2).toBe('test_monnify_jwt_token');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('validates electricity meter on Monnify VAS successfully', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: { accessToken: 'mon_token', expiresIn: 3600 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: {
            customerName: 'Adebayo Tunde',
            address: '15 Lagos Way',
            accountNumber: '45077162324',
          },
        }),
      });
    global.fetch = mockFetch;

    const result = await provider.validateCustomer({
      serviceType: ServiceType.ELECTRICITY,
      paymentCode: 'EKEDC_PREPAID',
      customerId: '45077162324',
    });

    expect(result.isValid).toBe(true);
    expect(result.customerName).toBe('Adebayo Tunde');
    expect(result.customerAddress).toBe('15 Lagos Way');
    expect(result.responseCode).toBe('0');
  });

  it('vends airtime successfully on Monnify', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: { accessToken: 'mon_token', expiresIn: 3600 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: {
            transactionReference: 'MNFY|VAS|12345678',
            paymentReference: '241100000001',
          },
        }),
      });
    global.fetch = mockFetch;

    const result = await provider.vendService({
      serviceType: ServiceType.AIRTIME,
      paymentCode: 'MTN',
      customerId: '08161437292',
      amountKobo: 10000n,
      requestReference: '241100000001',
    });

    expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(result.providerName).toBe(ProviderName.MONNIFY);
    expect(result.providerReference).toBe('MNFY|VAS|12345678');
  });

  it('vends electricity and extracts token from Monnify response', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: { accessToken: 'mon_token', expiresIn: 3600 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: {
            transactionReference: 'MNFY|ELEC|9999',
            token: '1234 5678 9012 3456 7890',
            units: '22.5',
            customerName: 'Test Customer',
          },
        }),
      });
    global.fetch = mockFetch;

    const result = await provider.vendService({
      serviceType: ServiceType.ELECTRICITY,
      paymentCode: 'IBEDC_PREPAID',
      customerId: '45077162324',
      amountKobo: 100000n,
      requestReference: '241100000002',
    });

    expect(result.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(result.token).toBe('1234 5678 9012 3456 7890');
    expect(result.units).toBe('22.5');
    expect(result.pinData?.pin).toBe('1234 5678 9012 3456 7890');
  });

  it('requeries transaction status and checks health probe', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: { accessToken: 'mon_token', expiresIn: 3600 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: {
            transactionReference: 'MNFY|VAS|REQ1',
            paymentStatus: 'PAID',
            amount: 500,
          },
        }),
      });
    global.fetch = mockFetch;

    const requery = await provider.requeryTransaction('BX-20261118-REF001');
    expect(requery.status).toBe(TransactionStatus.SUCCESSFUL);
    expect(requery.amountKobo).toBe(50000n);
    expect(mockFetch.mock.calls[1]?.[0]).toContain('reference=BX-20261118-REF001');

    // Health probe
    const health = await provider.getHealth();
    expect(health.providerName).toBe(ProviderName.MONNIFY);
    expect(health.isHealthy).toBe(true);
  });

  it('sends reference, vendReference, and vendAmount in Monnify /vas/bills-payment/vend payload', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: { accessToken: 'mon_token', expiresIn: 3600 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: {
            vendReference: 'BX-20261118-99887766',
            vendStatus: 'SUCCESS',
          },
        }),
      });
    global.fetch = mockFetch;

    await provider.vendService({
      serviceType: ServiceType.AIRTIME,
      paymentCode: 'MTN',
      customerId: '08031234567',
      amountKobo: 25000n,
      requestReference: 'BX-20261118-99887766',
    });

    const vendBody = JSON.parse(mockFetch.mock.calls[1]?.[1]?.body as string);
    expect(vendBody.reference).toBe('BX-20261118-99887766');
    expect(vendBody.vendReference).toBe('BX-20261118-99887766');
    expect(vendBody.vendAmount).toBe(250);
  });

  it('treats vendStatus=FAILED as FAILED even when Monnify returns responseCode=0', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: { accessToken: 'mon_token', expiresIn: 3600 },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          requestSuccessful: true,
          responseMessage: 'success',
          responseCode: '0',
          responseBody: {
            vendReference: 'BX-20261118-FAIL01',
            transactionReference: 'MFBP261118100152f70a',
            vendStatus: 'FAILED',
            description: 'purchase was failed from service provider.',
          },
        }),
      });
    global.fetch = mockFetch;

    const vendRes = await provider.vendService({
      serviceType: ServiceType.AIRTIME,
      paymentCode: 'MTN',
      customerId: '08030000000',
      amountKobo: 10000n,
      requestReference: 'BX-20261118-FAIL01',
    });

    expect(vendRes.status).toBe(TransactionStatus.FAILED);
    expect(vendRes.responseCode).toBe('VEND_FAILED');
    expect(vendRes.providerReference).toBe('BX-20261118-FAIL01');
  });
});
