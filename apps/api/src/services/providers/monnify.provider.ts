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

const INTERSWITCH_TO_MONNIFY_AIRTIME: Record<string, string> = {
  '10901': 'MTN',
  '109': 'MTN',
  '90102': 'AIRTEL',
  '901': 'AIRTEL',
  '40201': 'GLO',
  '402': 'GLO',
  '10801': '9MOBILE',
  '108': '9MOBILE',
  'MTN': 'MTN',
  'AIRTEL': 'AIRTEL',
  'GLO': 'GLO',
  '9MOBILE': '9MOBILE',
};

const MONNIFY_AIRTIME_PRODUCT_CODES: Record<string, string> = {
  MTN: '13',
  AIRTEL: '11',
  GLO: '12',
  '9MOBILE': '14',
};

export const INTERSWITCH_TO_MONNIFY_ELECTRICITY: Record<
  string,
  { billerCode: string; productCode: string }
> = {
  // IBEDC
  '053413501': { billerCode: 'IBEDC', productCode: 'IBEDC_PREPAID' },
  '053413401': { billerCode: 'IBEDC', productCode: 'IBEDC_POSTPAID' },
  // IKEDC
  '053396201': { billerCode: 'IKEDC', productCode: 'IKEDC_PREPAID' },
  '053396301': { billerCode: 'IKEDC', productCode: 'IKEDC_POSTPAID' },
  // EKEDC
  '053396401': { billerCode: 'EKEDC', productCode: 'EKEDC_PREPAID' },
  '053396501': { billerCode: 'EKEDC', productCode: 'EKEDC_POSTPAID' },
  // AEDC
  '053394801': { billerCode: 'AEDC', productCode: 'AEDC_PREPAID' },
  '053394901': { billerCode: 'AEDC', productCode: 'AEDC_POSTPAID' },
  // EEDC
  '053395101': { billerCode: 'EEDC', productCode: 'EEDC_PREPAID' },
  '0578501': { billerCode: 'EEDC', productCode: 'EEDC_POSTPAID' },
  // KEDCO
  '053396701': { billerCode: 'KEDCO', productCode: 'KEDCO_PREPAID' },
  '053396801': { billerCode: 'KEDCO', productCode: 'KEDCO_POSTPAID' },
  // JED
  '053396101': { billerCode: 'JED', productCode: 'JED_PREPAID' },
  '053396001': { billerCode: 'JED', productCode: 'JED_POSTPAID' },
  // PHED
  '053394401': { billerCode: 'PHED', productCode: 'PHED_PREPAID' },
  '0586001': { billerCode: 'PHED', productCode: 'PHED_POSTPAID' },
  // BEDC
  '0576701': { billerCode: 'BEDC', productCode: 'BEDC_PREPAID' },
  '0564601': { billerCode: 'BEDC', productCode: 'BEDC_POSTPAID' },
  // KAEDCO
  '053394501': { billerCode: 'KAEDCO', productCode: 'KAEDCO_PREPAID' },
  '053394601': { billerCode: 'KAEDCO', productCode: 'KAEDCO_POSTPAID' },
  // YEDC
  '053406301': { billerCode: 'YEDC', productCode: 'YEDC_PREPAID' },
  '053406401': { billerCode: 'YEDC', productCode: 'YEDC_POSTPAID' },
  // APLE
  '053403501': { billerCode: 'APLE', productCode: 'APLE_PREPAID' },
  '053403401': { billerCode: 'APLE', productCode: 'APLE_POSTPAID' },
};

export const INTERSWITCH_TO_MONNIFY_CABLE: Record<
  string,
  { billerCode: string; productCode: string }
> = {
  '104154': { billerCode: 'DSTV', productCode: 'DSTV' },
  '459137': { billerCode: 'GOTV', productCode: 'GOTV' },
  '24019': { billerCode: 'STARTIMES', productCode: 'STARTIMES' },
};


async function safeParseResponse(res: any): Promise<any> {
  try {
    if (typeof res.text === 'function') {
      const text = await res.text();
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch {
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

    const rawData = await safeParseResponse(res);

    if (!res.ok) {
      const errorText =
        rawData?.responseMessage ||
        (typeof res.text === 'function' ? await res.text().catch(() => '') : '') ||
        `HTTP ${res.status}`;
      throw new AppError(
        `Monnify Auth login failed [${res.status}]: ${errorText}`,
        502,
        'EXTERNAL_SERVICE_ERROR',
        true,
        { status: res.status, response: errorText },
      );
    }

    const data = rawData as {
      requestSuccessful: boolean;
      responseMessage: string;
      responseCode: string;
      responseBody?: {
        accessToken: string;
        expiresIn: number;
      };
    };

    if (!data?.requestSuccessful || !data?.responseBody?.accessToken) {
      throw new AppError(
        `Monnify token exchange rejected: ${data?.responseMessage || 'Unknown error'}`,
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
  /**
   * Customer / Meter / Smartcard validation using official Monnify Bills Payment API:
   * POST /api/v1/vas/bills-payment/validate-customer
   */
  public async validateCustomer(
    request: CustomerValidationRequest,
  ): Promise<CustomerValidationResult> {
    const token = await this.getAccessToken();

    if (
      request.serviceType !== ServiceType.ELECTRICITY &&
      request.serviceType !== ServiceType.CABLE_TV
    ) {
      // Airtime/Data phone validation is typically bypassed or passed through
      return {
        isValid: true,
        customerId: request.customerId,
        responseCode: '0',
        responseMessage: 'Validation bypassed for telecom service',
      };
    }

    const endpoint = `${this.config.baseUrl}/api/v1/vas/bills-payment/validate-customer`;
    let billerCode = request.paymentCode;
    let productCode = (request.metadata?.productCode as string) || request.paymentCode;

    if (request.serviceType === ServiceType.ELECTRICITY) {
      const mapped =
        INTERSWITCH_TO_MONNIFY_ELECTRICITY[request.paymentCode] ||
        (request.metadata?.monnifyProductCode
          ? {
              billerCode:
                (request.metadata.monnifyBillerCode as string) ||
                (request.metadata.disco as string),
              productCode: request.metadata.monnifyProductCode as string,
            }
          : null);

      if (mapped) {
        billerCode = mapped.billerCode;
        productCode = mapped.productCode;
      } else if (request.paymentCode.includes('_')) {
        billerCode = request.paymentCode.split('_')[0] || request.paymentCode;
        productCode = request.paymentCode;
      }
    } else if (request.serviceType === ServiceType.CABLE_TV) {
      const mapped =
        INTERSWITCH_TO_MONNIFY_CABLE[request.paymentCode] ||
        (request.metadata?.monnifyProductCode
          ? {
              billerCode:
                (request.metadata.monnifyBillerCode as string) ||
                (request.metadata.operator as string),
              productCode: request.metadata.monnifyProductCode as string,
            }
          : null);

      if (mapped) {
        billerCode = mapped.billerCode;
        productCode = mapped.productCode;
      }
    }

    const payload = {
      customerId: request.customerId,
      customerNumber: request.customerId,
      billerCode,
      productCode,
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawData = await safeParseResponse(res);
    const data = (rawData || {}) as {
      requestSuccessful?: boolean;
      responseMessage?: string;
      responseCode?: string;
      responseBody?: Record<string, any>;
    };

    const isSuccess = Boolean(
      data?.requestSuccessful &&
        (data?.responseCode === '0' ||
          data?.responseCode === '00' ||
          data?.responseCode === '90000'),
    );

    const resBody = (data?.responseBody || {}) as Record<string, any>;
    const customerName =
      resBody.customerName ||
      resBody.name ||
      resBody.accountName ||
      resBody.fullName ||
      resBody.customer?.name ||
      resBody.customer?.customerName ||
      undefined;

    const customerAddress =
      resBody.address ||
      resBody.customerAddress ||
      resBody.customer?.address ||
      undefined;

    const outstandingBalanceKobo =
      resBody.outstandingAmount !== undefined
        ? BigInt(Math.round(Number(resBody.outstandingAmount) * 100))
        : resBody.outstandingBalance !== undefined
          ? BigInt(Math.round(Number(resBody.outstandingBalance) * 100))
          : undefined;

    return {
      isValid: isSuccess,
      customerId: request.customerId,
      customerName,
      customerAddress,
      outstandingBalanceKobo,
      responseCode: data?.responseCode || String(res.status),
      responseMessage:
        data?.responseMessage || (isSuccess ? 'Validated successfully' : 'Validation failed'),
      rawResponse: data as Record<string, unknown>,
    };
  }

  /**
   * Vend Service (Airtime, Data, Cable TV, Electricity)
   * Official Monnify Bills Payment API:
   * POST /api/v1/vas/bills-payment/vend
   */
  public async vendService(request: ServiceVendingRequest): Promise<ServiceVendingResult> {
    const token = await this.getAccessToken();

    // Convert Kobo to Naira string for Monnify payload
    const amountInNaira = (Number(request.amountKobo) / 100).toFixed(2);
    const numericNaira = parseFloat(amountInNaira);

    const endpoint = `${this.config.baseUrl}/api/v1/vas/bills-payment/vend`;
    let billerCode = request.paymentCode;
    let productCode = (request.metadata?.productCode as string) || request.paymentCode;

    switch (request.serviceType) {
      case ServiceType.AIRTIME: {
        const resolvedCode =
          (request.metadata?.monnifyNetworkCode as string) ||
          (request.metadata?.network as string) ||
          INTERSWITCH_TO_MONNIFY_AIRTIME[request.paymentCode] ||
          request.paymentCode;
        billerCode = String(resolvedCode).toUpperCase();
        productCode = MONNIFY_AIRTIME_PRODUCT_CODES[billerCode] || '13';
        break;
      }

      case ServiceType.DATA: {
        billerCode = (request.metadata?.network as string)?.toUpperCase() || request.paymentCode;
        productCode = (request.metadata?.monnifyPlanCode as string) || request.paymentCode;
        break;
      }

      case ServiceType.ELECTRICITY: {
        const mapped =
          INTERSWITCH_TO_MONNIFY_ELECTRICITY[request.paymentCode] ||
          (request.metadata?.monnifyProductCode
            ? {
                billerCode:
                  (request.metadata.monnifyBillerCode as string) ||
                  (request.metadata.disco as string),
                productCode: request.metadata.monnifyProductCode as string,
              }
            : null);

        if (mapped) {
          billerCode = mapped.billerCode;
          productCode = mapped.productCode;
        } else if (request.paymentCode.includes('_')) {
          billerCode = request.paymentCode.split('_')[0] || request.paymentCode;
          productCode = request.paymentCode;
        } else {
          billerCode = request.paymentCode;
          productCode = (request.metadata?.productCode as string) || request.paymentCode;
        }
        break;
      }

      case ServiceType.CABLE_TV: {
        const mapped =
          INTERSWITCH_TO_MONNIFY_CABLE[request.paymentCode] ||
          (request.metadata?.monnifyProductCode
            ? {
                billerCode:
                  (request.metadata.monnifyBillerCode as string) ||
                  (request.metadata.operator as string),
                productCode: request.metadata.monnifyProductCode as string,
              }
            : null);

        if (mapped) {
          billerCode = mapped.billerCode;
          productCode = mapped.productCode;
        } else {
          billerCode = request.paymentCode;
          productCode = (request.metadata?.productCode as string) || request.paymentCode;
        }
        break;
      }

      default:
        throw new AppError(
          `Service type ${request.serviceType} is not supported on Monnify`,
          400,
          'BAD_REQUEST',
          true,
        );
    }

    const payload: Record<string, unknown> = {
      amount: numericNaira,
      customerId: request.customerId,
      customerNumber: request.customerId,
      customerName: request.customerName || request.customerId,
      customerMobileNumber: request.customerMobile || request.customerId,
      billerCode,
      productCode,
      productAmount: numericNaira,
      paymentReference: request.requestReference,
    };

    if (request.metadata?.validationReference) {
      payload.validationReference = request.metadata.validationReference;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const rawData = await safeParseResponse(res);
    const data = (rawData || {
      requestSuccessful: false,
      responseCode: String(res.status || '502'),
      responseMessage: `Provider response was not valid JSON (${res.status} ${res.statusText || ''})`,
    }) as {
      requestSuccessful: boolean;
      responseMessage: string;
      responseCode: string;
      responseBody?: {
        transactionReference?: string;
        vendReference?: string;
        paymentReference?: string;
        vendStatus?: string;
        description?: string;
        token?: string;
        units?: string;
        tokenAmount?: number;
        address?: string;
        customerName?: string;
        tariff?: string;
      };
    };

    const vendStatus = data?.responseBody?.vendStatus?.toUpperCase();
    const isProcessing = Boolean(
      data?.requestSuccessful &&
        (vendStatus === 'PENDING' ||
          vendStatus === 'PROCESSING' ||
          vendStatus === 'IN_PROGRESS'),
    );
    const isSuccess = Boolean(
      data?.requestSuccessful &&
        (vendStatus === 'SUCCESS' ||
          data?.responseCode === '0' ||
          data?.responseCode === '00'),
    );
    const status = isProcessing
      ? TransactionStatus.PROCESSING
      : isSuccess
        ? TransactionStatus.SUCCESSFUL
        : TransactionStatus.FAILED;

    return {
      status,
      providerName: this.providerName,
      providerReference:
        data?.responseBody?.vendReference || data?.responseBody?.transactionReference,
      requestReference: request.requestReference,
      amountKobo: request.amountKobo,
      responseCode: data?.responseCode || 'UNKNOWN',
      responseMessage:
        data?.responseBody?.description ||
        data?.responseMessage ||
        (isSuccess ? 'Transaction Successful' : 'Transaction Failed'),
      token: data?.responseBody?.token,
      units: data?.responseBody?.units,
      tariff: data?.responseBody?.tariff,
      customerAddress: data?.responseBody?.address,
      customerName: data?.responseBody?.customerName,
      pinData: data?.responseBody?.token
        ? {
            pin: data.responseBody.token,
            instructions: 'Load token into your prepaid meter keypad followed by Enter.',
          }
        : undefined,
      rawResponse: data as Record<string, unknown>,
    };
  }

  /**
   * Re-query transaction status using official Monnify Bills Payment API:
   * GET /api/v1/vas/bills-payment/requery?paymentReference=...
   */
  public async requeryTransaction(
    requestReference: string,
    _providerReference?: string,
  ): Promise<TransactionStatusResult> {
    const token = await this.getAccessToken();

    const res = await fetch(
      `${this.config.baseUrl}/api/v1/vas/bills-payment/requery?paymentReference=${encodeURIComponent(requestReference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      },
    );

    const rawData = await safeParseResponse(res);
    const data = (rawData || {}) as {
      requestSuccessful: boolean;
      responseMessage: string;
      responseCode: string;
      responseBody?: {
        transactionReference?: string;
        vendReference?: string;
        vendStatus?: string;
        paymentStatus?: string;
        description?: string;
        amount?: number;
      };
    };

    const isSuccess = Boolean(
      data?.requestSuccessful &&
        (data?.responseBody?.vendStatus === 'SUCCESS' ||
          data?.responseBody?.paymentStatus === 'PAID' ||
          data?.responseCode === '0' ||
          data?.responseCode === '00'),
    );

    return {
      status: isSuccess ? TransactionStatus.SUCCESSFUL : TransactionStatus.FAILED,
      providerName: this.providerName,
      providerReference:
        data?.responseBody?.vendReference || data?.responseBody?.transactionReference,
      requestReference,
      amountKobo: data?.responseBody?.amount
        ? BigInt(Math.round(data.responseBody.amount * 100))
        : undefined,
      responseCode: data?.responseCode || 'UNKNOWN',
      responseMessage:
        data?.responseBody?.description ||
        data?.responseMessage ||
        (isSuccess ? 'Transaction Confirmed' : 'Transaction Failed'),
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
