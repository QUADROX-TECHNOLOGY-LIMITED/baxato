import {
  ProviderName,
  TransactionStatus,
  generateInterswitchReference,
  AppError,
} from '@baxato/common';
import { Env } from '@baxato/config';
import {
  ProviderAdapter,
  CustomerValidationRequest,
  CustomerValidationResult,
  ServiceVendingRequest,
  ServiceVendingResult,
  TransactionStatusResult,
  ProviderHealthStatus,
} from './provider.interface';

export interface InterswitchConfig {
  clientId: string;
  clientSecret: string;
  passportUrl: string;
  baseUrl: string;
  terminalId: string;
  transferCodePrefix: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number;
}

export const MONNIFY_TO_INTERSWITCH_ELECTRICITY: Record<string, string> = {
  // Direct DISCO Enum keys
  IBEDC_PREPAID: '053413501',
  IBEDC_POSTPAID: '053413401',
  IKEDC_PREPAID: '053396201',
  IKEDC_POSTPAID: '053396301',
  EKEDC_PREPAID: '053396401',
  EKEDC_POSTPAID: '053396501',
  AEDC_PREPAID: '053394801',
  AEDC_POSTPAID: '053394901',
  EEDC_PREPAID: '053395101',
  EEDC_POSTPAID: '0578501',
  KEDCO_PREPAID: '053396701',
  KEDCO_POSTPAID: '053396801',
  JED_PREPAID: '053396101',
  JED_POSTPAID: '053396001',
  PHED_PREPAID: '053394401',
  PHED_POSTPAID: '0586001',
  BEDC_PREPAID: '0576701',
  BEDC_POSTPAID: '0564601',
  KAEDCO_PREPAID: '053394501',
  KAEDCO_POSTPAID: '053394601',
  YEDC_PREPAID: '053406301',
  YEDC_POSTPAID: '053406401',
  APLE_PREPAID: '053403501',
  APLE_POSTPAID: '053403401',

  // Monnify Product Codes (for seamless failover)
  'product-ibedc-pre': '053413501',
  'product-ibedc-post': '053413401',
  'product-ikedc-pre': '053396201',
  'product-ikedc-post': '053396301',
  'product-ekedc-pre': '053396401',
  'product-ekedc-post': '053396501',
  'product-aedc-pre': '053394801',
  'product-aedc-post': '053394901',
  'product-eedc-pre': '053395101',
  'product-eedc-post': '0578501',
  'product-kedc-pre': '053396701',
  'product-kedc-post': '053396801',
  'product-jedc-pre': '053396101',
  'product-jedc-post': '053396001',
  'product-phedc-pre': '053394401',
  'product-phedc-post': '0586001',
  'bedc_prepaid': '0576701',
  'bedc_postpaid': '0564601',
  'product-knedc-pre': '053394501',
  'product-knedc-post': '053394601',
  'product-yola-pre': '053406301',
  'product-yola-post': '053406401',
  'prd-aba-pre': '053403501',
  'prd-aba-post': '053403401',

  // Monnify Biller Codes
  'biller-ibedc-pre': '053413501',
  'biller-ibedc-post': '053413401',
  'biller-ikedc-pre': '053396201',
  'biller-ikedc-post': '053396301',
  'biller-ekedc-pre': '053396401',
  'biller-ekedc-post': '053396501',
  'biller-aedc-pre': '053394801',
  'biller-aedc-post': '053394901',
  'biller-eedc-pre': '053395101',
  'biller-eedc-post': '0578501',
  'biller-kedc-pre': '053396701',
  'biller-jedc-pre': '053396101',
  'biller-jedc-post': '053396001',
  'biller-phedc-pre': '053394401',
  'biller-phedc-post': '0586001',
  'bedc': '0576701',
  'biller-knedc-pre': '053394501',
  'biller-knedc-post': '053394601',
  'biller-yola-pre': '053406301',
  'biller-yola-post': '053406401',
  'biller-aba-pre': '053403501',
  'biller-aba-post': '053403401',
};

export const MONNIFY_TO_INTERSWITCH_CABLE: Record<string, string> = {
  DSTV: '104154',
  GOTV: '459137',
  STARTIMES: '24019',
};

export const MONNIFY_TO_INTERSWITCH_TELCO: Record<string, string> = {
  MTN: '10901',
  AIRTEL: '90102',
  GLO: '40201',
  '9MOBILE': '10801',
  NINEMOBILE: '10801',
};

async function safeParseResponse(res: any): Promise<any> {
  try {
    if (typeof res.text === 'function') {
      const text = await res.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
        if (typeof res.json === 'function') {
          return await res.json().catch(() => null);
        }
        return null;
      }
    }
    if (typeof res.json === 'function') {
      return await res.json().catch(() => null);
    }
  } catch {
    return null;
  }
  return null;
}

export class InterswitchProvider implements ProviderAdapter {
  public readonly providerName = ProviderName.INTERSWITCH;

  private readonly config: InterswitchConfig;
  private tokenCache: CachedToken | null = null;

  constructor(env: Env) {
    this.config = {
      clientId: env.INTERSWITCH_CLIENT_ID,
      clientSecret: env.INTERSWITCH_CLIENT_SECRET,
      passportUrl: env.INTERSWITCH_PASSPORT_URL,
      baseUrl: env.INTERSWITCH_BASE_URL,
      terminalId: env.INTERSWITCH_TERMINAL_ID,
      transferCodePrefix: env.INTERSWITCH_TRANSFER_CODE_PREFIX || '2411',
    };
  }

  /**
   * Acquire or return cached Passport OAuth 2.0 Bearer token
   */
  public async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60000) {
      return this.tokenCache.accessToken;
    }

    const basicAuth = Buffer.from(
      `${this.config.clientId}:${this.config.clientSecret}`,
    ).toString('base64');

    const res = await fetch(this.config.passportUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basicAuth}`,
      },
      body: 'grant_type=client_credentials',
    });

    const rawData = await safeParseResponse(res);

    if (!res.ok) {
      const errorText =
        rawData?.error_description ||
        rawData?.message ||
        (typeof res.text === 'function' ? await res.text().catch(() => '') : '') ||
        `HTTP ${res.status}`;
      throw new AppError(
        `Interswitch Passport OAuth failed [${res.status}]: ${errorText}`,
        502,
        'EXTERNAL_SERVICE_ERROR',
        true,
        { status: res.status, response: errorText },
      );
    }

    const data = (rawData || {}) as { access_token: string; expires_in?: number };
    const expiresInSeconds = data.expires_in ?? 3600;

    this.tokenCache = {
      accessToken: data.access_token,
      expiresAt: now + expiresInSeconds * 1000,
    };

    return this.tokenCache.accessToken;
  }

  /**
   * Validate Customer / Account / Meter ID
   */
  public async validateCustomer(
    request: CustomerValidationRequest,
  ): Promise<CustomerValidationResult> {
    const token = await this.getAccessToken();

    const paymentCode =
      (request.metadata?.interswitchPaymentCode as string) ||
      MONNIFY_TO_INTERSWITCH_ELECTRICITY[request.paymentCode] ||
      MONNIFY_TO_INTERSWITCH_CABLE[request.paymentCode] ||
      MONNIFY_TO_INTERSWITCH_TELCO[request.paymentCode] ||
      request.paymentCode;

    const payload = {
      TerminalId: this.config.terminalId,
      Customers: [
        {
          PaymentCode: paymentCode,
          CustomerId: request.customerId,
        },
      ],
    };

    const res = await fetch(
      `${this.config.baseUrl}/quicktellerservice/api/v5/transactions/validateCustomers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          TerminalID: this.config.terminalId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );

    const rawData = await safeParseResponse(res);
    const data = (rawData || {}) as {
      ResponseCode?: string;
      Customers?: Array<{
        PaymentCode: string;
        CustomerId: string;
        ResponseCode: string;
        FullName?: string;
        Amount?: number;
        Surcharge?: number;
      }>;
    };

    const customer = data.Customers?.[0];
    const isSuccess = data.ResponseCode === '90000' && customer?.ResponseCode === '90000';
    const minimumAmountKobo =
      customer?.Amount !== undefined && customer.Amount > 0
        ? BigInt(customer.Amount)
        : undefined;

    return {
      isValid: isSuccess,
      customerId: request.customerId,
      customerName: customer?.FullName || undefined,
      surchargeKobo: customer?.Surcharge !== undefined ? BigInt(customer.Surcharge) : undefined,
      minimumAmountKobo,
      responseCode: customer?.ResponseCode || data.ResponseCode || 'UNKNOWN',
      responseMessage: isSuccess ? 'Customer validated successfully' : 'Customer validation failed',
      rawResponse: data as Record<string, unknown>,
    };
  }

  /**
   * Send Transaction Advice / Vend Service
   */
  public async vendService(request: ServiceVendingRequest): Promise<ServiceVendingResult> {
    const token = await this.getAccessToken();

    const paymentCode =
      (request.metadata?.interswitchPaymentCode as string) ||
      MONNIFY_TO_INTERSWITCH_ELECTRICITY[request.paymentCode] ||
      MONNIFY_TO_INTERSWITCH_CABLE[request.paymentCode] ||
      MONNIFY_TO_INTERSWITCH_TELCO[request.paymentCode] ||
      request.paymentCode;

    // Ensure request reference conforms to Interswitch prefix if not already formatted
    const reference = request.requestReference.startsWith(this.config.transferCodePrefix)
      ? request.requestReference
      : generateInterswitchReference(this.config.transferCodePrefix, 12);

    const payload = {
      terminalId: this.config.terminalId,
      paymentCode,
      customerId: request.customerId,
      customerMobile: request.customerMobile || request.customerId,
      customerEmail: request.customerEmail || 'transactions@baxato.com',
      amount: request.amountKobo.toString(),
      requestReference: reference,
    };

    const res = await fetch(`${this.config.baseUrl}/quicktellerservice/api/v5/transactions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        TerminalID: this.config.terminalId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawData = await safeParseResponse(res);
    const data = (rawData || {
      ResponseCode: '90099',
      ResponseDescription: `Provider response was not valid JSON (${res.status} ${res.statusText || ''})`,
    }) as {
      ResponseCode?: string;
      ResponseDescription?: string;
      TransactionRef?: string;
      ApprovedAmount?: string;
      Balance?: string;
      AdditionalInfo?: Record<string, string>;
      MiscData?: string;
    };

    // Extract token, units, and billing metadata from AdditionalInfo or MiscData
    const parsedMeta = this.extractTokenAndMeta(data.AdditionalInfo, data.MiscData);

    // Both code 90000 (standard success) and 70022 with valid vended token count as successful
    const isSuccess =
      data.ResponseCode === '90000' ||
      (data.ResponseCode === '70022' && !!parsedMeta.token);
    const isProcessing = data.ResponseCode === '900A0' || data.ResponseCode === '900A1';

    const transactionStatus = isSuccess
      ? TransactionStatus.SUCCESSFUL
      : isProcessing
        ? TransactionStatus.PROCESSING
        : TransactionStatus.FAILED;

    return {
      status: transactionStatus,
      providerName: this.providerName,
      providerReference: data.TransactionRef,
      requestReference: reference,
      amountKobo: request.amountKobo,
      responseCode: data.ResponseCode || 'UNKNOWN',
      responseMessage: data.ResponseDescription || (isSuccess ? 'Transaction Successful' : 'Transaction Failed'),
      token: parsedMeta.token,
      units: parsedMeta.units,
      unitsCostKobo: parsedMeta.unitsCostKobo,
      vatKobo: parsedMeta.vatKobo,
      tariff: parsedMeta.tariff,
      feeder: parsedMeta.feeder,
      customerAddress: parsedMeta.customerAddress,
      customerName: parsedMeta.customerName,
      pinData: parsedMeta.token
        ? {
            pin: parsedMeta.token,
            serialNumber: parsedMeta.serialNumber,
            instructions: parsedMeta.serialNumber
              ? 'Visit the official examination portal to verify results or complete registration.'
              : 'Load token into your prepaid meter keypad followed by Enter.',
          }
        : undefined,
      rawResponse: data as Record<string, unknown>,
    };
  }

  /**
   * Re-query transaction status
   */
  public async requeryTransaction(
    requestReference: string,
    _providerReference?: string,
  ): Promise<TransactionStatusResult> {
    const token = await this.getAccessToken();

    const res = await fetch(
      `${this.config.baseUrl}/quicktellerservice/api/v5/transactions?requestReference=${requestReference}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          TerminalID: this.config.terminalId,
        },
      },
    );

    const rawData = await safeParseResponse(res);
    const data = (rawData || {}) as {
      ResponseCode?: string;
      ResponseDescription?: string;
      TransactionRef?: string;
      ApprovedAmount?: string;
    };

    const isSuccess = data.ResponseCode === '90000';

    return {
      status: isSuccess ? TransactionStatus.SUCCESSFUL : TransactionStatus.FAILED,
      providerName: this.providerName,
      providerReference: data.TransactionRef,
      requestReference,
      amountKobo: data.ApprovedAmount ? BigInt(data.ApprovedAmount) : undefined,
      responseCode: data.ResponseCode || 'UNKNOWN',
      responseMessage: data.ResponseDescription || (isSuccess ? 'Transaction Confirmed' : 'Transaction Failed'),
      rawResponse: data as Record<string, unknown>,
    };
  }

  /**
   * Health probe
   */
  public async getHealth(): Promise<ProviderHealthStatus> {
    const start = Date.now();
    try {
      await this.getAccessToken();
      const latencyMs = Date.now() - start;
      return {
        providerName: this.providerName,
        isHealthy: true,
        latencyMs,
        message: 'Interswitch Passport & Orion API online',
        checkedAt: new Date(),
      };
    } catch (error) {
      const latencyMs = Date.now() - start;
      return {
        providerName: this.providerName,
        isHealthy: false,
        latencyMs,
        message: (error as Error).message,
        checkedAt: new Date(),
      };
    }
  }

  /**
   * Extract PIN / STS Token and metadata from AdditionalInfo or MiscData
   */
  private extractTokenAndMeta(
    additionalInfo?: Record<string, string>,
    miscData?: string,
  ) {
    let token: string | undefined =
      additionalInfo?.Pin ||
      additionalInfo?.pin ||
      additionalInfo?.Token ||
      additionalInfo?.token ||
      additionalInfo?.STDToken ||
      additionalInfo?.stdToken ||
      additionalInfo?.TokenData ||
      additionalInfo?.tokenData ||
      additionalInfo?.PinNumber ||
      additionalInfo?.pinNumber;
    let serialNumber: string | undefined =
      additionalInfo?.SerialNumber ||
      additionalInfo?.serialNumber ||
      additionalInfo?.Serial ||
      additionalInfo?.serial;
    let units: string | undefined = additionalInfo?.unitsCount || additionalInfo?.Units;
    let tariff: string | undefined = additionalInfo?.tariffCode || additionalInfo?.Tariff;
    let feeder: string | undefined = additionalInfo?.feeder || additionalInfo?.Feeder;
    let customerAddress: string | undefined =
      additionalInfo?.customerAddress || additionalInfo?.Address;
    let customerName: string | undefined = additionalInfo?.customerName;

    let unitsCostKobo: bigint | undefined;
    if (additionalInfo?.costOfUnits) {
      const parsed = parseFloat(additionalInfo.costOfUnits);
      if (!isNaN(parsed)) unitsCostKobo = BigInt(Math.round(parsed * 100));
    }

    let vatKobo: bigint | undefined;
    if (additionalInfo?.vat) {
      const parsed = parseFloat(additionalInfo.vat);
      if (!isNaN(parsed)) vatKobo = BigInt(Math.round(parsed * 100));
    }

    // Fallback: parse from semicolon-separated MiscData string
    if (miscData) {
      const pairs = miscData.split(';').map((p) => p.trim()).filter(Boolean);
      for (const pair of pairs) {
        const [k, ...v] = pair.split(':');
        const key = k?.trim().toLowerCase();
        const val = v.join(':').trim();

        if ((key === 'pin' || key === 'token' || key === 'stdtoken') && !token) token = val;
        if ((key === 'serialnumber' || key === 'serial') && !serialNumber) serialNumber = val;
        if (key === 'unitscount' && !units) units = val;
        if (key === 'tariffcode' && !tariff) tariff = val;
        if (key === 'feeder' && !feeder) feeder = val;
        if (key === 'address' && !customerAddress) customerAddress = val;
        if (key === 'customername' && !customerName) customerName = val;
      }
    }

    return {
      token,
      serialNumber,
      units,
      tariff,
      feeder,
      customerAddress,
      customerName,
      unitsCostKobo,
      vatKobo,
    };
  }
}
