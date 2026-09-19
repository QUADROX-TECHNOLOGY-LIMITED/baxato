import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  InsufficientBalanceError,
  ProviderError,
  BusinessCapExceededError,
} from './app-error.js';

describe('AppError Hierarchy', () => {
  it('instantiates ValidationError with 400 status', () => {
    const err = new ValidationError('Invalid phone number', { field: 'phone' });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.isOperational).toBe(true);
    expect(err.details).toEqual({ field: 'phone' });
  });

  it('instantiates AuthenticationError with 401 status', () => {
    const err = new AuthenticationError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('AUTHENTICATION_REQUIRED');
  });

  it('instantiates ForbiddenError with 403 status', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('instantiates NotFoundError with 404 status', () => {
    const err = new NotFoundError('Wallet');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Wallet not found');
  });

  it('instantiates InsufficientBalanceError with 402 status', () => {
    const err = new InsufficientBalanceError();
    expect(err.statusCode).toBe(402);
    expect(err.code).toBe('INSUFFICIENT_BALANCE');
  });

  it('instantiates ProviderError with 502 status and provider metadata', () => {
    const err = new ProviderError('INTERSWITCH', 'System busy', { rawCode: '90099' });
    expect(err.statusCode).toBe(502);
    expect(err.providerName).toBe('INTERSWITCH');
    expect(err.rawProviderResponse).toEqual({ rawCode: '90099' });
  });

  it('instantiates BusinessCapExceededError with 400 status', () => {
    const err = new BusinessCapExceededError();
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BUSINESS_CAP_EXCEEDED');
  });
});
