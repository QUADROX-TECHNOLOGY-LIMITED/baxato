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

    if (!res.ok) {
      const errorText = await res.text();
      throw new AppError(
        `Interswitch Passport OAuth failed [${res.status}]: ${errorText}`,
        502,
        'EXTERNAL_SERVICE_ERROR',
        true,
        { status: res.status, response: errorText },
      );
    }

    const data = (await res.json()) as { access_token: string; expires_in?: number };
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

    const payload = {
      TerminalId: this.config.terminalId,
      Customers: [
        {
          PaymentCode: request.paymentCode,
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

    const data = (await res.json()) as {
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

    return {
      isValid: isSuccess,
      customerId: request.customerId,
      customerName: customer?.FullName || undefined,
      surchargeKobo: customer?.Surcharge !== undefined ? BigInt(customer.Surcharge) : undefined,
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

    // Ensure request reference conforms to Interswitch prefix if not already formatted
    const reference = request.requestReference.startsWith(this.config.transferCodePrefix)
      ? request.requestReference
      : generateInterswitchReference(this.config.transferCodePrefix, 12);

    const payload = {
      terminalId: this.config.terminalId,
      paymentCode: request.paymentCode,
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

    const data = (await res.json()) as {
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

    const transactionStatus = isSuccess
      ? TransactionStatus.SUCCESSFUL
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

    const data = (await res.json()) as {
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
    let token: string | undefined = additionalInfo?.Pin || additionalInfo?.pin;
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

        if (key === 'pin' && !token) token = val;
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
