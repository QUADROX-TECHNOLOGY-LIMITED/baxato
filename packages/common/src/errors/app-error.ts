export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_SERVER_ERROR',
    isOperational: boolean = true,
    details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: unknown) {
    super(message, 401, 'AUTHENTICATION_REQUIRED', true, details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access forbidden for current role or business', details?: unknown) {
    super(message, 403, 'FORBIDDEN', true, details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: unknown) {
    super(`${resource} not found`, 404, 'NOT_FOUND', true, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

export class InsufficientBalanceError extends AppError {
  constructor(
    message: string = 'Insufficient wallet balance for this transaction',
    details?: unknown,
  ) {
    super(message, 402, 'INSUFFICIENT_BALANCE', true, details);
  }
}

export const InsufficientFundsError = InsufficientBalanceError;
export type InsufficientFundsError = InsufficientBalanceError;

export class IdempotencyConflictError extends AppError {
  constructor(
    message: string = 'A transaction with this idempotency key is currently processing or has finished',
    details?: unknown,
  ) {
    super(message, 409, 'IDEMPOTENCY_CONFLICT', true, details);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests, please slow down', details?: unknown) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, details);
  }
}

export class ProviderError extends AppError {
  public readonly providerName: string;
  public readonly rawProviderResponse?: unknown;

  constructor(
    providerName: string,
    message: string,
    rawProviderResponse?: unknown,
    statusCode: number = 502,
  ) {
    super(`Provider [${providerName}] error: ${message}`, statusCode, 'PROVIDER_GATEWAY_ERROR', true, rawProviderResponse);
    this.providerName = providerName;
    this.rawProviderResponse = rawProviderResponse;
  }
}

export class BusinessCapExceededError extends AppError {
  constructor(
    message: string = 'Maximum limit of 3 active businesses reached for this account',
    details?: unknown,
  ) {
    super(message, 400, 'BUSINESS_CAP_EXCEEDED', true, details);
  }
}
