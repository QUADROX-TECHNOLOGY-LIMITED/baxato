import {
  ProviderName,
  TransactionStatus,
  ServiceType,
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

export interface MonnifyConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
  contractCode: string;
  walletAccountNumber?: string;
}

interface CachedMonnifyToken {
  accessToken: string;
  expiresAt: number;
}

export class MonnifyProvider implements ProviderAdapter {
  public readonly providerName = ProviderName.MONNIFY;

  private readonly config: MonnifyConfig;
  private tokenCache: CachedMonnifyToken | null = null;

  constructor(env: Env) {
    this.config = {
      apiKey: env.MONNIFY_API_KEY,
      secretKey: env.MONNIFY_SECRET_KEY,
      baseUrl: env.MONNIFY_BASE_URL.replace(/\/$/, ''),
      contractCode: env.MONNIFY_CONTRACT_CODE,
      walletAccountNumber: env.MONNIFY_WALLET_ACCOUNT_NUMBER,
    };
  }

  /**
   * Acquire or return cached Monnify Bearer token
   */
  public async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60000) {
      return this.tokenCache.accessToken;
    }

    const basicAuth = Buffer.from(
      `${this.config.apiKey}:${this.config.secretKey}`,
    ).toString('base64');

    const res = await fetch(`${this.config.baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new AppError(
        `Monnify Auth login failed [${res.status}]: ${errorText}`,
        502,
        'EXTERNAL_SERVICE_ERROR',
        true,
        { status: res.status, response: errorText },
      );
    }

    const data = (await res.json()) as {
      requestSuccessful: boolean;
      responseMessage: string;
      responseCode: string;
      responseBody?: {
        accessToken: string;
        expiresIn: number;
      };
    };

    if (!data.requestSuccessful || !data.responseBody?.accessToken) {
      throw new AppError(
        `Monnify token exchange rejected: ${data.responseMessage}`,
        502,
        'EXTERNAL_SERVICE_ERROR',
        true,
        data,
      );
    }

    const expiresInSeconds = data.responseBody.expiresIn || 3600;
    this.tokenCache = {
      accessToken: data.responseBody.accessToken,
      expiresAt: now + expiresInSeconds * 1000,
    };

    return this.tokenCache.accessToken;
  }

  /**
   * Customer / Meter / Smartcard validation
   */
  public async validateCustomer(
    request: CustomerValidationRequest,
  ): Promise<CustomerValidationResult> {
    const token = await this.getAccessToken();

    let endpoint = '';
    if (request.serviceType === ServiceType.ELECTRICITY) {
      endpoint = `${this.config.baseUrl}/api/v1/vas/electricity/validate?meterNumber=${encodeURIComponent(request.customerId)}&billerCode=${encodeURIComponent(request.paymentCode)}`;
    } else if (request.serviceType === ServiceType.CABLE_TV) {
      endpoint = `${this.config.baseUrl}/api/v1/vas/cable-tv/validate?smartCardNumber=${encodeURIComponent(request.customerId)}&billerCode=${encodeURIComponent(request.paymentCode)}`;
    } else {
      // Airtime/Data phone validation
      return {
        isValid: true,
        customerId: request.customerId,
        responseCode: '0',
        responseMessage: 'Validation bypassed for telecom service',
      };
    }

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = (await res.json()) as {
      requestSuccessful: boolean;
      responseMessage: string;
      responseCode: string;
      responseBody?: {
        customerName?: string;
        address?: string;
        accountNumber?: string;
        outstandingAmount?: number;
      };
    };

    const isSuccess = data.requestSuccessful && data.responseCode === '0';

    return {
      isValid: isSuccess,
      customerId: request.customerId,
      customerName: data.responseBody?.customerName,
      customerAddress: data.responseBody?.address,
      outstandingBalanceKobo: data.responseBody?.outstandingAmount
        ? BigInt(Math.round(data.responseBody.outstandingAmount * 100))
        : undefined,
      responseCode: data.responseCode || 'UNKNOWN',
      responseMessage: data.responseMessage || (isSuccess ? 'Validated successfully' : 'Validation failed'),
      rawResponse: data as Record<string, unknown>,
    };
  }

  /**
   * Vend Service (Airtime, Data, Cable TV, Electricity)
   */
  public async vendService(request: ServiceVendingRequest): Promise<ServiceVendingResult> {
    const token = await this.getAccessToken();

    // Convert Kobo to Naira string for Monnify payload
    const amountInNaira = (Number(request.amountKobo) / 100).toFixed(2);

    let endpoint = '';
    let body: Record<string, unknown> = {};

    switch (request.serviceType) {
      case ServiceType.AIRTIME:
        endpoint = `${this.config.baseUrl}/api/v1/vas/airtime/purchase`;
        body = {
          amount: parseFloat(amountInNaira),
          customerNumber: request.customerId,
          networkCode: request.paymentCode,
          paymentReference: request.requestReference,
        };
        break;

      case ServiceType.DATA:
        endpoint = `${this.config.baseUrl}/api/v1/vas/data/purchase`;
        body = {
          amount: parseFloat(amountInNaira),
          customerNumber: request.customerId,
          packageCode: request.paymentCode,
          paymentReference: request.requestReference,
        };
        break;

      case ServiceType.CABLE_TV:
        endpoint = `${this.config.baseUrl}/api/v1/vas/cable-tv/purchase`;
        body = {
          amount: parseFloat(amountInNaira),
          smartCardNumber: request.customerId,
          packageCode: request.paymentCode,
          customerPhone: request.customerMobile || request.customerId,
          paymentReference: request.requestReference,
        };
        break;

      case ServiceType.ELECTRICITY:
        endpoint = `${this.config.baseUrl}/api/v1/vas/electricity/purchase`;
        body = {
          amount: parseFloat(amountInNaira),
          meterNumber: request.customerId,
          billerCode: request.paymentCode,
          customerPhone: request.customerMobile || request.customerId,
          paymentReference: request.requestReference,
        };
        break;

      default:
        throw new AppError(
          `Service type ${request.serviceType} is not supported on Monnify`,
          400,
          'BAD_REQUEST',
          true,
        );
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as {
      requestSuccessful: boolean;
      responseMessage: string;
      responseCode: string;
      responseBody?: {
        transactionReference?: string;
        paymentReference?: string;
        token?: string;
        units?: string;
        tokenAmount?: number;
        address?: string;
        customerName?: string;
        tariff?: string;
      };
    };

    const isSuccess = data.requestSuccessful && data.responseCode === '0';
    const status = isSuccess ? TransactionStatus.SUCCESSFUL : TransactionStatus.FAILED;

    return {
      status,
      providerName: this.providerName,
      providerReference: data.responseBody?.transactionReference,
      requestReference: request.requestReference,
      amountKobo: request.amountKobo,
      responseCode: data.responseCode || 'UNKNOWN',
      responseMessage: data.responseMessage || (isSuccess ? 'Transaction Successful' : 'Transaction Failed'),
      token: data.responseBody?.token,
      units: data.responseBody?.units,
      tariff: data.responseBody?.tariff,
      customerAddress: data.responseBody?.address,
      customerName: data.responseBody?.customerName,
      pinData: data.responseBody?.token
        ? {
            pin: data.responseBody.token,
            instructions: 'Load token into your prepaid meter keypad followed by Enter.',
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
      `${this.config.baseUrl}/api/v1/vas/transactions/${encodeURIComponent(requestReference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const data = (await res.json()) as {
      requestSuccessful: boolean;
      responseMessage: string;
      responseCode: string;
      responseBody?: {
        transactionReference?: string;
        paymentStatus?: string;
        amount?: number;
      };
    };

    const isSuccess =
      data.requestSuccessful &&
      (data.responseBody?.paymentStatus === 'PAID' || data.responseCode === '0');

    return {
      status: isSuccess ? TransactionStatus.SUCCESSFUL : TransactionStatus.FAILED,
      providerName: this.providerName,
      providerReference: data.responseBody?.transactionReference,
      requestReference,
      amountKobo: data.responseBody?.amount
        ? BigInt(Math.round(data.responseBody.amount * 100))
        : undefined,
      responseCode: data.responseCode || 'UNKNOWN',
      responseMessage: data.responseMessage || (isSuccess ? 'Transaction Confirmed' : 'Transaction Failed'),
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
        message: 'Monnify VAS API online',
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
}
