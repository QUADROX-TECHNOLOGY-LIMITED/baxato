import type { LedgerDirection } from './enums';

export enum LedgerEntryType {
  WALLET_FUNDING = 'WALLET_FUNDING',
  SERVICE_PURCHASE = 'SERVICE_PURCHASE',
  SERVICE_PAYMENT = 'SERVICE_PAYMENT',
  COMMISSION_EARNED = 'COMMISSION_EARNED',
  COMMISSION_SWEEP = 'COMMISSION_SWEEP',
  REFUND = 'REFUND',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
}

export interface LedgerEntryDto {
  id: string;
  businessId: string;
  walletId: string;
  amountKobo: string;
  amountNaira: number;
  formattedAmount: string;
  balanceBeforeKobo: string;
  balanceBeforeNaira: number;
  formattedBalanceBefore: string;
  balanceAfterKobo: string;
  balanceAfterNaira: number;
  formattedBalanceAfter: string;
  direction: LedgerDirection;
  type: LedgerEntryType;
  reference: string;
  narration?: string | null;
  createdAt: Date;
}

export interface LedgerStatementDto {
  walletId: string;
  businessId: string;
  entries: LedgerEntryDto[];
  totalDebitsKobo: string;
  totalDebitsNaira: number;
  formattedTotalDebits: string;
  totalCreditsKobo: string;
  totalCreditsNaira: number;
  formattedTotalCredits: string;
  netKobo: string;
  netNaira: number;
  formattedNet: string;
  count: number;
}
