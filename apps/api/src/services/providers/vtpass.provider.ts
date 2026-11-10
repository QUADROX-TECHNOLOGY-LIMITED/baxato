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

export interface VtpassConfig {
  baseUrl: string;
  apiKey: string;
  secretKey: string;
  publicKey: string;
}

/**
 * Generate VTpass strictly compliant request_id:
 * Must start with current date in YYYYMMDD followed by HHmmss + random suffix.
 */
export function generateVtpassRequestId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const randomSuffix = Math.floor(100000 + Math.random() * 900000);
  return `${year}${month}${day}${hours}${minutes}${seconds}${randomSuffix}`;
}

export const TELCO_TO_VTPASS_AIRTIME: Record<string, string> = {
  MTN: 'mtn',
  AIRTEL: 'airtel',
  GLO: 'glo',
  '9MOBILE': 'etisalat',
  NINEMOBILE: 'etisalat',
  ETISALAT: 'etisalat',
  // Legacy numeric codes
  '10901': 'mtn',
  '109': 'mtn',
  '90102': 'airtel',
  '901': 'airtel',
  '40201': 'glo',
  '402': 'glo',
  '10801': 'etisalat',
  '108': 'etisalat',
};

export const DISCO_TO_VTPASS_SERVICE_ID: Record<string, string> = {
  IBEDC: 'ibadan-electric',
  IKEDC: 'ikeja-electric',
  EKEDC: 'eko-electric',
  AEDC: 'abuja-electric',
  EEDC: 'enugu-electric',
  KEDCO: 'kano-electric',
  KEDC: 'kano-electric',
  JED: 'jos-electric',
  JEDC: 'jos-electric',
  PHED: 'portharcourt-electric',
  PHEDC: 'portharcourt-electric',
  BEDC: 'benin-electric',
  KAEDCO: 'kaduna-electric',
  KNEDC: 'kaduna-electric',
  YEDC: 'yola-electric',
  APLE: 'aba-electric',
  ABA: 'aba-electric',
  // Lowercase / slug variants
  'ibadan-electric': 'ibadan-electric',
  'ikeja-electric': 'ikeja-electric',
  'eko-electric': 'eko-electric',
  'abuja-electric': 'abuja-electric',
  'enugu-electric': 'enugu-electric',
  'kano-electric': 'kano-electric',
  'jos-electric': 'jos-electric',
  'portharcourt-electric': 'portharcourt-electric',
  'benin-electric': 'benin-electric',
  'kaduna-electric': 'kaduna-electric',
  'yola-electric': 'yola-electric',
  'aba-electric': 'aba-electric',
};

export const CABLE_OPERATOR_TO_VTPASS: Record<string, string> = {
  DSTV: 'dstv',
  GOTV: 'gotv',
  STARTIMES: 'startimes',
  SHOWMAX: 'showmax',
  'biller-dstv': 'dstv',
  'biller-gotv': 'gotv',
  'biller-startimes': 'startimes',
  'biller-showmax': 'showmax',
  dstv: 'dstv',
  gotv: 'gotv',
  startimes: 'startimes',
  showmax: 'showmax',
};

export const CABLE_PLAN_TO_VTPASS_VARIATION: Record<string, string> = {
  // DStv
  'dstv-padi': 'dstv-padi',
  'prd-dstv-padi': 'dstv-padi',
  '104154': 'dstv-padi',
  'dstv-yanga': 'dstv-yanga',
  'prd-dstv-yng-e36': 'dstv-yanga',
  '104152': 'dstv-yanga',
  'dstv-confam': 'dstv-confam',
  'prd-dstv-cfm-e36': 'dstv-confam',
  '104153': 'dstv-confam',
  'dstv-compact': 'dstv79',
  'prd-dstv-cmp-e36': 'dstv79',
  '10403': 'dstv79',
  'dstv-compact-plus': 'dstv7',
  'prd-dstv-cppl-e36': 'dstv7',
  '10430': 'dstv7',
  'dstv-premium': 'dstv3',
  'prd-dstv-prwa-e36': 'dstv3',
  '10401': 'dstv3',
  'dstv-asia': 'dstv6',
  'dstv-extraview': 'dstv-extraview',
  'prd-dstv-hdpvr': 'dstv-extraview',
  '10436': 'dstv-extraview',

  // GOtv
  'gotv-smallie': 'gotv-lite',
  'prd-gotv-smallie-mo': 'gotv-lite',
  '459137': 'gotv-lite',
  'gotv-lite': 'gotv-lite',
  'gotv-jinja': 'gotv-jinja',
  'product-gotv-jinja': 'gotv-jinja',
  '459120': 'gotv-jinja',
  'gotv-jolli': 'gotv-jolli',
  'product-gotv-jolli': 'gotv-jolli',
  '459121': 'gotv-jolli',
  'gotv-max': 'gotv-max',
  'product-gotv-max': 'gotv-max',
  '459119': 'gotv-max',
  'gotv-supa': 'gotv-supa',
  'product-gotv-supa': 'gotv-supa',
  '459133': 'gotv-supa',
  'gotv-supa-plus': 'gotv-supa-plus',
  'prd-gotv-supa-pls': 'gotv-supa-plus',
  '459134': 'gotv-supa-plus',

  // StarTimes
  'startimes-nova': 'nova',
  'product-star-nova': 'nova',
  '24019': 'nova',
  'nova': 'nova',
  'startimes-basic': 'basic',
  'product-star-basic': 'basic',
  '24017': 'basic',
  'basic': 'basic',
  'startimes-classic': 'classic',
  'product-star-classic': 'classic',
  '24013': 'classic',
  'classic': 'classic',
  'startimes-super': 'super',
  'prd-star-sup': 'super',
  '24025': 'super',
  'super': 'super',
  'startimes-smart': 'smart',
  'product-star-smart': 'smart',
  '24008': 'smart',
  'smart': 'smart',
};

/**
 * Clean electricity prepaid token string from VTpass response:
 * e.g., "Token : 1234 5678 9012 3456 7890" -> "1234-5678-9012-3456-7890" / numeric PIN
 */
export function extractCleanToken(rawToken?: string | null): string | undefined {
  if (!rawToken || typeof rawToken !== 'string') return undefined;
  const stripped = rawToken.replace(/Token\s*:\s*/i, '').trim();
  return stripped.length > 0 ? stripped : undefined;
}

async function safeParseResponse(res: Response): Promise<Record<string, any> | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export class VtpassProvider implements ProviderAdapter {
  public readonly providerName = ProviderName.VTPASS;

  private readonly config: VtpassConfig;

  constructor(env: Env) {
    this.config = {
      baseUrl: (env.VTPASS_BASE_URL || 'https://sandbox.vtpass.com/api').replace(/\/$/, ''),
      apiKey: env.VTPASS_API_KEY,
      secretKey: env.VTPASS_SECRET_KEY,
      publicKey: env.VTPASS_PUBLIC_KEY,
    };
  }

  /**
   * Helper to build request headers
   */
  private getHeaders(method: 'GET' | 'POST' = 'POST'): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'api-key': this.config.apiKey,
    };

    if (method === 'POST') {
      headers['secret-key'] = this.config.secretKey;
    } else {
      headers['public-key'] = this.config.publicKey;
    }

    return headers;
  }

  /**
   * Customer / Meter Validation
   * Official VTpass API: POST /api/merchant-verify
   */
  public async validateCustomer(
    request: CustomerValidationRequest,
  ): Promise<CustomerValidationResult> {
    // Airtime/Data phone validation is bypassed
    if (
      request.serviceType !== ServiceType.ELECTRICITY &&
      request.serviceType !== ServiceType.CABLE_TV
    ) {
      return {
        isValid: true,
        customerId: request.customerId,
        responseCode: '000',
        responseMessage: 'Validation bypassed for telecom service',
      };
    }

    if (request.serviceType === ServiceType.CABLE_TV) {
      const opKey = String(
        request.metadata?.operator || request.paymentCode || '',
      ).toUpperCase();
      const serviceID = CABLE_OPERATOR_TO_VTPASS[opKey] || request.paymentCode.toLowerCase();

      const endpoint = `${this.config.baseUrl}/merchant-verify`;

      let res: Response;
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: this.getHeaders('POST'),
          body: JSON.stringify({
            billersCode: request.customerId,
            serviceID,
          }),
        });
      } catch (networkErr) {
        throw new AppError(
          'Cable TV verification service unreachable',
          503,
          'PROVIDER_UNAVAILABLE',
          true,
          { originalError: (networkErr as Error).message },
        );
      }

      const data = await safeParseResponse(res);
      const content = data?.content as Record<string, any> | undefined;

      const code = String(data?.code ?? data?.response_description ?? '');
      const isSuccess =
        code === '000' ||
        code.toUpperCase() === 'TRANSACTION SUCCESSFUL' ||
        code.toUpperCase() === 'VERIFIED' ||
        Boolean(content?.Customer_Name || content?.customer_name);

      if (!isSuccess) {
        const errorMessage =
          data?.response_description ||
          content?.error ||
          content?.message ||
          'Smartcard / IUC verification failed';

        return {
          isValid: false,
          customerId: request.customerId,
          responseCode: code || String(res.status),
          responseMessage: errorMessage,
          rawResponse: data ?? undefined,
        };
      }

      const customerName =
        content?.Customer_Name ||
        content?.customer_name ||
        content?.name ||
        undefined;

      const outstandingBalanceKobo =
        content?.Balance !== undefined && content?.Balance !== null && !isNaN(Number(content.Balance))
          ? BigInt(Math.round(Number(content.Balance) * 100))
          : undefined;

      const renewalAmountKobo =
        content?.Renewal_Amount !== undefined && !isNaN(Number(content.Renewal_Amount))
          ? BigInt(Math.round(Number(content.Renewal_Amount) * 100))
          : undefined;

      return {
        isValid: true,
        customerId: request.customerId,
        customerName,
        customerAddress: content?.Address || undefined,
        outstandingBalanceKobo,
        minimumAmountKobo: renewalAmountKobo,
        responseCode: code || '000',
        responseMessage: data?.response_description || 'Smartcard validated successfully',
        rawResponse: data ?? undefined,
      };
    }

    const discoKey = String(request.metadata?.disco || request.paymentCode || '').toUpperCase();
    const serviceID = DISCO_TO_VTPASS_SERVICE_ID[discoKey] || request.paymentCode;

    const meterTypeRaw = String(request.metadata?.meterType || '').toUpperCase();
    const isPostpaid =
      meterTypeRaw === 'POSTPAID' ||
      String(request.paymentCode || '').toUpperCase().includes('POST');
    const type = isPostpaid ? 'postpaid' : 'prepaid';

    const endpoint = `${this.config.baseUrl}/merchant-verify`;

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders('POST'),
        body: JSON.stringify({
          billersCode: request.customerId,
          serviceID,
          type,
        }),
      });
    } catch (networkErr) {
      throw new AppError(
        'Electricity verification service unreachable',
        503,
        'PROVIDER_UNAVAILABLE',
        true,
        { originalError: (networkErr as Error).message },
      );
    }

    const data = await safeParseResponse(res);
    const content = data?.content as Record<string, any> | undefined;

    const code = String(data?.code ?? data?.response_description ?? '');
    const isSuccess =
      code === '000' ||
      code.toUpperCase() === 'TRANSACTION SUCCESSFUL' ||
      code.toUpperCase() === 'VERIFIED' ||
      Boolean(content?.Customer_Name || content?.customer_name);

    if (!isSuccess) {
      const errorMessage =
        data?.response_description ||
        content?.error ||
        content?.message ||
        'Customer / Meter validation failed';

      return {
        isValid: false,
        customerId: request.customerId,
        responseCode: code || String(res.status),
        responseMessage: errorMessage,
        rawResponse: data ?? undefined,
      };
    }

    const customerName =
      content?.Customer_Name ||
      content?.customer_name ||
      content?.name ||
      undefined;

    const customerAddress =
      content?.Address ||
      content?.address ||
      undefined;

    const outstandingBalanceKobo =
      content?.Outstanding !== undefined && content?.Outstanding !== null && !isNaN(Number(content.Outstanding))
        ? BigInt(Math.round(Number(content.Outstanding) * 100))
        : undefined;

    const minimumAmountKobo =
      content?.Min_Amount !== undefined && content?.Min_Amount !== null && !isNaN(Number(content.Min_Amount))
        ? BigInt(Math.round(Number(content.Min_Amount) * 100))
        : content?.minimumAmount !== undefined && !isNaN(Number(content.minimumAmount))
          ? BigInt(Math.round(Number(content.minimumAmount) * 100))
          : undefined;

    const maximumAmountKobo =
      content?.Max_Amount !== undefined && content?.Max_Amount !== null && !isNaN(Number(content.Max_Amount))
        ? BigInt(Math.round(Number(content.Max_Amount) * 100))
        : content?.maximumAmount !== undefined && !isNaN(Number(content.maximumAmount))
          ? BigInt(Math.round(Number(content.maximumAmount) * 100))
          : undefined;

    return {
      isValid: true,
      customerId: request.customerId,
      customerName,
      customerAddress,
      outstandingBalanceKobo,
      minimumAmountKobo,
      maximumAmountKobo,
      detectedMeterType: isPostpaid ? 'POSTPAID' : 'PREPAID',
      responseCode: code || '000',
      responseMessage: data?.response_description || 'Customer validated successfully',
      rawResponse: data ?? undefined,
    };
  }

  /**
   * Vend Service (Airtime & Electricity)
   * Official VTpass API: POST /api/pay
   */
  public async vendService(request: ServiceVendingRequest): Promise<ServiceVendingResult> {
    const amountInNaira = Math.round(Number(request.amountKobo) / 100);
    const requestId =
      (request.metadata?.vtpassRequestId as string) ||
      generateVtpassRequestId();

    const endpoint = `${this.config.baseUrl}/pay`;

    let payload: Record<string, any>;

    if (request.serviceType === ServiceType.AIRTIME) {
      const networkKey = String(
        request.metadata?.network || request.metadata?.networkCode || request.paymentCode || '',
      ).toUpperCase();

      const serviceID = TELCO_TO_VTPASS_AIRTIME[networkKey] || 'mtn';

      payload = {
        request_id: requestId,
        serviceID,
        amount: amountInNaira,
        phone: request.customerId,
      };
    } else if (request.serviceType === ServiceType.ELECTRICITY) {
      const discoKey = String(request.metadata?.disco || request.paymentCode || '').toUpperCase();
      const serviceID = DISCO_TO_VTPASS_SERVICE_ID[discoKey] || request.paymentCode;

      const meterTypeRaw = String(request.metadata?.meterType || '').toUpperCase();
      const isPostpaid =
        meterTypeRaw === 'POSTPAID' ||
        String(request.paymentCode || '').toUpperCase().includes('POST');
      const variationCode = isPostpaid ? 'postpaid' : 'prepaid';

      payload = {
        request_id: requestId,
        serviceID,
        billersCode: request.customerId,
        variation_code: variationCode,
        amount: amountInNaira,
        phone: request.customerMobile || request.customerId,
      };
    } else if (request.serviceType === ServiceType.CABLE_TV) {
      const opKey = String(
        request.metadata?.operator || request.paymentCode || '',
      ).toUpperCase();
      const serviceID = CABLE_OPERATOR_TO_VTPASS[opKey] || 'dstv';

      const monnifyPlanCode = request.metadata?.monnifyPlanCode as string | undefined;
      const variationCode =
        (request.metadata?.vtpassVariationCode as string) ||
        CABLE_PLAN_TO_VTPASS_VARIATION[request.paymentCode] ||
        (monnifyPlanCode ? CABLE_PLAN_TO_VTPASS_VARIATION[monnifyPlanCode] : undefined) ||
        request.paymentCode;

      const subscriptionType =
        (request.metadata?.subscriptionType as string) || 'change';

      payload = {
        request_id: requestId,
        serviceID,
        billersCode: request.customerId,
        variation_code: variationCode,
        amount: amountInNaira,
        phone: request.customerMobile || request.customerId,
        subscription_type: subscriptionType,
      };
    } else {
      throw new AppError(
        `Service type '${request.serviceType}' is not currently supported by this provider`,
        400,
        'INVALID_REQUEST',
        false,
      );
    }

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders('POST'),
        body: JSON.stringify(payload),
      });
    } catch (networkErr) {
      throw new AppError(
        'Billing provider service unreachable',
        503,
        'PROVIDER_UNAVAILABLE',
        true,
        { originalError: (networkErr as Error).message },
      );
    }

    const data = await safeParseResponse(res);
    const code = String(data?.code ?? '');
    const txStatus = String(data?.content?.transactions?.status ?? '').toLowerCase();

    // Check status
    const isSuccess =
      code === '000' &&
      (txStatus === 'delivered' || txStatus === 'successful' || txStatus === '');

    const isProcessing =
      code === '099' ||
      txStatus === 'pending' ||
      txStatus === 'initiated';

    let status = TransactionStatus.FAILED;
    if (isSuccess) {
      status = TransactionStatus.SUCCESSFUL;
    } else if (isProcessing) {
      status = TransactionStatus.PROCESSING;
    }

    // Extract electricity token if returned
    const rawToken =
      data?.purchased_code ||
      data?.mainToken ||
      data?.token ||
      data?.content?.transactions?.purchased_code ||
      data?.cards?.[0]?.Pin;

    const token = extractCleanToken(rawToken);
    const units =
      data?.units ||
      data?.mainTokenUnits ||
      data?.content?.transactions?.units ||
      undefined;

    const providerReference =
      String(data?.content?.transactions?.transactionId ?? '') ||
      data?.requestId ||
      requestId;

    return {
      status,
      providerName: this.providerName,
      providerReference,
      requestReference: request.requestReference,
      amountKobo: request.amountKobo,
      responseCode: code || String(res.status),
      responseMessage:
        data?.response_description ||
        (isSuccess ? 'Transaction Successful' : 'Transaction Failed'),
      token,
      units,
      customerAddress: data?.content?.transactions?.unique_element,
      rawResponse: data ?? undefined,
    };
  }

  /**
   * Re-query transaction status
   * Official VTpass API: POST /api/requery
   */
  public async requeryTransaction(
    requestReference: string,
    providerReference?: string,
  ): Promise<TransactionStatusResult> {
    const primaryRef = providerReference || requestReference;
    const endpoint = `${this.config.baseUrl}/requery`;

    let res = await fetch(endpoint, {
      method: 'POST',
      headers: this.getHeaders('POST'),
      body: JSON.stringify({ request_id: primaryRef }),
    });

    let data = await safeParseResponse(res);

    // If query by primaryRef returned non-000 and we have a fallback ref, try fallbackRef
    const fallbackRef =
      providerReference && providerReference !== requestReference
        ? requestReference
        : undefined;

    if ((!data || data.code !== '000') && fallbackRef) {
      const fallbackRes = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders('POST'),
        body: JSON.stringify({ request_id: fallbackRef }),
      });
      const fallbackData = await safeParseResponse(fallbackRes);
      if (fallbackData && fallbackData.code === '000') {
        data = fallbackData;
      }
    }

    const code = String(data?.code ?? '');
    const txStatus = String(data?.content?.transactions?.status ?? '').toLowerCase();

    const isSuccess =
      code === '000' &&
      (txStatus === 'delivered' || txStatus === 'successful');

    const isProcessing =
      code === '099' ||
      txStatus === 'pending' ||
      txStatus === 'initiated';

    const isExplicitFailed =
      txStatus === 'failed' ||
      (code !== '000' && code !== '099' && !isProcessing);

    let status = TransactionStatus.PROCESSING;
    if (isSuccess) {
      status = TransactionStatus.SUCCESSFUL;
    } else if (isExplicitFailed) {
      status = TransactionStatus.FAILED;
    }

    const rawToken =
      data?.purchased_code ||
      data?.mainToken ||
      data?.token ||
      data?.content?.transactions?.purchased_code;

    const token = extractCleanToken(rawToken);
    const units = data?.units || data?.content?.transactions?.units || undefined;

    return {
      status,
      providerName: this.providerName,
      providerReference:
        String(data?.content?.transactions?.transactionId ?? '') || primaryRef,
      requestReference,
      responseCode: code || 'UNKNOWN',
      responseMessage:
        data?.response_description || (isSuccess ? 'Transaction Successful' : 'Transaction Pending'),
      token,
      units,
      rawResponse: data ?? undefined,
    };
  }

  /**
   * Health probe via GET /api/balance
   */
  public async getHealth(): Promise<ProviderHealthStatus> {
    const start = Date.now();
    try {
      const endpoint = `${this.config.baseUrl}/balance`;
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: this.getHeaders('GET'),
      });

      const latencyMs = Date.now() - start;
      const data = await safeParseResponse(res);

      const isHealthy = res.ok && (data?.code === 1 || data?.code === '000' || res.status === 200);

      return {
        providerName: this.providerName,
        isHealthy,
        latencyMs,
        message: isHealthy ? 'VTpass API online' : `VTpass returned HTTP ${res.status}`,
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

