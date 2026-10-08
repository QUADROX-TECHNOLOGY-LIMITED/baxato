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
} from './provider.interface.js';

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
  '053413501': { billerCode: 'biller-ibedc-pre', productCode: 'product-ibedc-pre' },
  '053413401': { billerCode: 'biller-ibedc-post', productCode: 'product-ibedc-post' },
  // IKEDC
  '053396201': { billerCode: 'biller-ikedc-pre', productCode: 'product-ikedc-pre' },
  '053396301': { billerCode: 'biller-ikedc-post', productCode: 'product-ikedc-post' },
  // EKEDC
  '053396401': { billerCode: 'biller-ekedc-pre', productCode: 'product-ekedc-pre' },
  '053396501': { billerCode: 'biller-ekedc-post', productCode: 'product-ekedc-post' },
  // AEDC
  '053394801': { billerCode: 'biller-aedc-pre', productCode: 'product-aedc-pre' },
  '053394901': { billerCode: 'biller-aedc-post', productCode: 'product-aedc-post' },
  // EEDC
  '053395101': { billerCode: 'biller-eedc-pre', productCode: 'product-eedc-pre' },
  '0578501': { billerCode: 'biller-eedc-post', productCode: 'product-eedc-post' },
  // KEDCO
  '053396701': { billerCode: 'biller-kedc-pre', productCode: 'product-kedc-pre' },
  '053396801': { billerCode: 'biller-kedc-pre', productCode: 'product-kedc-pre' },
  // JED
  '053396101': { billerCode: 'biller-jedc-pre', productCode: 'product-jedc-pre' },
  '053396001': { billerCode: 'biller-jedc-post', productCode: 'product-jedc-post' },
  // PHED
  '053394401': { billerCode: 'biller-phedc-pre', productCode: 'product-phedc-pre' },
  '0586001': { billerCode: 'biller-phedc-post', productCode: 'product-phedc-post' },
  // BEDC
  '0576701': { billerCode: 'bedc', productCode: 'bedc_prepaid' },
  '0564601': { billerCode: 'bedc', productCode: 'bedc_postpaid' },
  // KAEDCO
  '053394501': { billerCode: 'biller-knedc-pre', productCode: 'product-knedc-pre' },
  '053394601': { billerCode: 'biller-knedc-post', productCode: 'product-knedc-post' },
  // YEDC
  '053406301': { billerCode: 'biller-yola-pre', productCode: 'product-yola-pre' },
  '053406401': { billerCode: 'biller-yola-post', productCode: 'product-yola-post' },
  // APLE
  '053403501': { billerCode: 'biller-aba-pre', productCode: 'prd-aba-pre' },
  '053403401': { billerCode: 'biller-aba-post', productCode: 'prd-aba-post' },
};

export const DISCO_CODE_TO_MONNIFY: Record<
  string,
  { prepaid: { billerCode: string; productCode: string }; postpaid?: { billerCode: string; productCode: string } }
> = {
  IBEDC: {
    prepaid: { billerCode: 'biller-ibedc-pre', productCode: 'product-ibedc-pre' },
    postpaid: { billerCode: 'biller-ibedc-post', productCode: 'product-ibedc-post' },
  },
  IKEDC: {
    prepaid: { billerCode: 'biller-ikedc-pre', productCode: 'product-ikedc-pre' },
    postpaid: { billerCode: 'biller-ikedc-post', productCode: 'product-ikedc-post' },
  },
  EKEDC: {
    prepaid: { billerCode: 'biller-ekedc-pre', productCode: 'product-ekedc-pre' },
    postpaid: { billerCode: 'biller-ekedc-post', productCode: 'product-ekedc-post' },
  },
  AEDC: {
    prepaid: { billerCode: 'biller-aedc-pre', productCode: 'product-aedc-pre' },
    postpaid: { billerCode: 'biller-aedc-post', productCode: 'product-aedc-post' },
  },
  EEDC: {
    prepaid: { billerCode: 'biller-eedc-pre', productCode: 'product-eedc-pre' },
    postpaid: { billerCode: 'biller-eedc-post', productCode: 'product-eedc-post' },
  },
  KEDCO: {
    prepaid: { billerCode: 'biller-kedc-pre', productCode: 'product-kedc-pre' },
    postpaid: { billerCode: 'biller-kedc-pre', productCode: 'product-kedc-pre' },
  },
  KEDC: {
    prepaid: { billerCode: 'biller-kedc-pre', productCode: 'product-kedc-pre' },
    postpaid: { billerCode: 'biller-kedc-pre', productCode: 'product-kedc-pre' },
  },
  JED: {
    prepaid: { billerCode: 'biller-jedc-pre', productCode: 'product-jedc-pre' },
    postpaid: { billerCode: 'biller-jedc-post', productCode: 'product-jedc-post' },
  },
  JEDC: {
    prepaid: { billerCode: 'biller-jedc-pre', productCode: 'product-jedc-pre' },
    postpaid: { billerCode: 'biller-jedc-post', productCode: 'product-jedc-post' },
  },
  PHED: {
    prepaid: { billerCode: 'biller-phedc-pre', productCode: 'product-phedc-pre' },
    postpaid: { billerCode: 'biller-phedc-post', productCode: 'product-phedc-post' },
  },
  PHEDC: {
    prepaid: { billerCode: 'biller-phedc-pre', productCode: 'product-phedc-pre' },
    postpaid: { billerCode: 'biller-phedc-post', productCode: 'product-phedc-post' },
  },
  BEDC: {
    prepaid: { billerCode: 'bedc', productCode: 'bedc_prepaid' },
    postpaid: { billerCode: 'bedc', productCode: 'bedc_postpaid' },
  },
  KAEDCO: {
    prepaid: { billerCode: 'biller-knedc-pre', productCode: 'product-knedc-pre' },
    postpaid: { billerCode: 'biller-knedc-post', productCode: 'product-knedc-post' },
  },
  KNEDC: {
    prepaid: { billerCode: 'biller-knedc-pre', productCode: 'product-knedc-pre' },
    postpaid: { billerCode: 'biller-knedc-post', productCode: 'product-knedc-post' },
  },
  YEDC: {
    prepaid: { billerCode: 'biller-yola-pre', productCode: 'product-yola-pre' },
    postpaid: { billerCode: 'biller-yola-post', productCode: 'product-yola-post' },
  },
  APLE: {
    prepaid: { billerCode: 'biller-aba-pre', productCode: 'prd-aba-pre' },
    postpaid: { billerCode: 'biller-aba-post', productCode: 'prd-aba-post' },
  },
  ABA: {
    prepaid: { billerCode: 'biller-aba-pre', productCode: 'prd-aba-pre' },
    postpaid: { billerCode: 'biller-aba-post', productCode: 'prd-aba-post' },
  },
};

export const OPERATOR_TO_MONNIFY_BILLER: Record<string, string> = {
  DSTV: 'biller-dstv',
  GOTV: 'biller-gotv',
  STARTIMES: 'biller-startimes',
  SHOWMAX: 'biller-showmax',
  'biller-dstv': 'biller-dstv',
  'biller-gotv': 'biller-gotv',
  'biller-startimes': 'biller-startimes',
  'biller-showmax': 'biller-showmax',
};

export const INTERSWITCH_TO_MONNIFY_CABLE: Record<
  string,
  { billerCode: string; productCode: string }
> = {
  // DStv Bouquets (Biller: biller-dstv)
  '104154': { billerCode: 'biller-dstv', productCode: 'prd-dstv-padi' },
  '104152': { billerCode: 'biller-dstv', productCode: 'prd-dstv-yng-e36' },
  '104153': { billerCode: 'biller-dstv', productCode: 'prd-dstv-cfm-e36' },
  '10403': { billerCode: 'biller-dstv', productCode: 'prd-dstv-cmp-e36' },
  '10430': { billerCode: 'biller-dstv', productCode: 'prd-dstv-cppl-e36' },
  '10401': { billerCode: 'biller-dstv', productCode: 'prd-dstv-prwa-e36' },
  '10436': { billerCode: 'biller-dstv', productCode: 'prd-dstv-hdpvr' },
  '104181': { billerCode: 'biller-dstv', productCode: 'prd-dstv-prstg' },

  // GOtv Bouquets (Biller: biller-gotv)
  '459137': { billerCode: 'biller-gotv', productCode: 'prd-gotv-smallie-mo' },
  '459120': { billerCode: 'biller-gotv', productCode: 'product-gotv-jinja' },
  '459121': { billerCode: 'biller-gotv', productCode: 'product-gotv-jolli' },
  '459119': { billerCode: 'biller-gotv', productCode: 'product-gotv-max' },
  '459133': { billerCode: 'biller-gotv', productCode: 'product-gotv-supa' },
  '459134': { billerCode: 'biller-gotv', productCode: 'prd-gotv-supa-pls' },

  // StarTimes Bouquets (Biller: biller-startimes)
  '24019': { billerCode: 'biller-startimes', productCode: 'product-star-nova' },
  '24018': { billerCode: 'biller-startimes', productCode: 'prd-star-nova-week' },
  '24017': { billerCode: 'biller-startimes', productCode: 'product-star-basic' },
  '24016': { billerCode: 'biller-startimes', productCode: 'prd-star-basic-week' },
  '24013': { billerCode: 'biller-startimes', productCode: 'product-star-classic' },
  '24012': { billerCode: 'biller-startimes', productCode: 'prd-star-cl-week' },
  '24025': { billerCode: 'biller-startimes', productCode: 'prd-star-sup' },
  '24024': { billerCode: 'biller-startimes', productCode: 'prd-star-sup-week' },
  '24004': { billerCode: 'biller-startimes', productCode: 'prd-star-nova-d' },
  '24008': { billerCode: 'biller-startimes', productCode: 'product-star-smart' },
  '24021': { billerCode: 'biller-startimes', productCode: 'prd-star-cl-d' },
  '24006': { billerCode: 'biller-startimes', productCode: 'product-star-d-super' },

  // Base Operator Defaults
  DSTV: { billerCode: 'biller-dstv', productCode: 'prd-dstv-padi' },
  GOTV: { billerCode: 'biller-gotv', productCode: 'prd-gotv-smallie-mo' },
  STARTIMES: { billerCode: 'biller-startimes', productCode: 'product-star-nova' },
  SHOWMAX: { billerCode: 'biller-showmax', productCode: 'prd-shwmx-mbl-1' },
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
      const isPostpaid =
        String(request.metadata?.meterType || '').toUpperCase() === 'POSTPAID' ||
        String(request.paymentCode || '').toUpperCase().includes('POST');

      const mappedPaymentCode = INTERSWITCH_TO_MONNIFY_ELECTRICITY[request.paymentCode];
      const discoKey = String(request.metadata?.disco || request.paymentCode || '').toUpperCase();
      const mappedDisco = DISCO_CODE_TO_MONNIFY[discoKey];

      if (mappedPaymentCode) {
        billerCode = mappedPaymentCode.billerCode;
        productCode = mappedPaymentCode.productCode;
      } else if (
        request.metadata?.monnifyProductCode &&
        request.metadata?.monnifyBillerCode &&
        (String(request.metadata.monnifyProductCode).startsWith('product-') ||
          String(request.metadata.monnifyProductCode).startsWith('prd-') ||
          String(request.metadata.monnifyProductCode).startsWith('bedc_'))
      ) {
        billerCode = request.metadata.monnifyBillerCode as string;
        productCode = request.metadata.monnifyProductCode as string;
      } else if (mappedDisco) {
        const target = isPostpaid && mappedDisco.postpaid ? mappedDisco.postpaid : mappedDisco.prepaid;
        billerCode = target.billerCode;
        productCode = target.productCode;
      } else if (request.paymentCode.includes('_')) {
        billerCode = request.paymentCode.split('_')[0] || request.paymentCode;
        productCode = request.paymentCode;
      }
    } else if (request.serviceType === ServiceType.CABLE_TV) {
      const op = String(request.metadata?.operator || request.paymentCode || '').toUpperCase();
      const mapped =
        INTERSWITCH_TO_MONNIFY_CABLE[request.paymentCode] ||
        INTERSWITCH_TO_MONNIFY_CABLE[op] ||
        (request.metadata?.monnifyProductCode
          ? {
              billerCode:
                (request.metadata.monnifyBillerCode as string) ||
                OPERATOR_TO_MONNIFY_BILLER[op] ||
                `biller-${op.toLowerCase()}`,
              productCode: request.metadata.monnifyProductCode as string,
            }
          : null);

      if (mapped) {
        billerCode = OPERATOR_TO_MONNIFY_BILLER[mapped.billerCode] || mapped.billerCode;
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

    const minimumAmountKobo =
      resBody.minAmount !== undefined && resBody.minAmount !== null && !isNaN(Number(resBody.minAmount))
        ? BigInt(Math.round(Number(resBody.minAmount) * 100))
        : resBody.minimumAmount !== undefined && resBody.minimumAmount !== null && !isNaN(Number(resBody.minimumAmount))
          ? BigInt(Math.round(Number(resBody.minimumAmount) * 100))
          : undefined;

    const maximumAmountKobo =
      resBody.maxAmount !== undefined && resBody.maxAmount !== null && !isNaN(Number(resBody.maxAmount))
        ? BigInt(Math.round(Number(resBody.maxAmount) * 100))
        : resBody.maximumAmount !== undefined && resBody.maximumAmount !== null && !isNaN(Number(resBody.maximumAmount))
          ? BigInt(Math.round(Number(resBody.maximumAmount) * 100))
          : undefined;

    return {
      isValid: isSuccess,
      customerId: request.customerId,
      customerName,
      customerAddress,
      outstandingBalanceKobo,
      minimumAmountKobo,
      maximumAmountKobo,
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
        const isPostpaid =
          String(request.metadata?.meterType || '').toUpperCase() === 'POSTPAID' ||
          String(request.paymentCode || '').toUpperCase().includes('POST');

        const mappedPaymentCode = INTERSWITCH_TO_MONNIFY_ELECTRICITY[request.paymentCode];
        const discoKey = String(request.metadata?.disco || request.paymentCode || '').toUpperCase();
        const mappedDisco = DISCO_CODE_TO_MONNIFY[discoKey];

        if (mappedPaymentCode) {
          billerCode = mappedPaymentCode.billerCode;
          productCode = mappedPaymentCode.productCode;
        } else if (
          request.metadata?.monnifyProductCode &&
          request.metadata?.monnifyBillerCode &&
          (String(request.metadata.monnifyProductCode).startsWith('product-') ||
            String(request.metadata.monnifyProductCode).startsWith('prd-') ||
            String(request.metadata.monnifyProductCode).startsWith('bedc_'))
        ) {
          billerCode = request.metadata.monnifyBillerCode as string;
          productCode = request.metadata.monnifyProductCode as string;
        } else if (mappedDisco) {
          const target = isPostpaid && mappedDisco.postpaid ? mappedDisco.postpaid : mappedDisco.prepaid;
          billerCode = target.billerCode;
          productCode = target.productCode;
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
        const op = String(request.metadata?.operator || '').toUpperCase();
        const mapped =
          INTERSWITCH_TO_MONNIFY_CABLE[request.paymentCode] ||
          INTERSWITCH_TO_MONNIFY_CABLE[op] ||
          (request.metadata?.monnifyProductCode
            ? {
                billerCode:
                  (request.metadata.monnifyBillerCode as string) ||
                  OPERATOR_TO_MONNIFY_BILLER[op] ||
                  `biller-${op.toLowerCase()}`,
                productCode: request.metadata.monnifyProductCode as string,
              }
            : null);

        if (mapped) {
          billerCode = OPERATOR_TO_MONNIFY_BILLER[mapped.billerCode] || mapped.billerCode;
          productCode = mapped.productCode;
        } else {
          billerCode = OPERATOR_TO_MONNIFY_BILLER[request.paymentCode] || request.paymentCode;
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
