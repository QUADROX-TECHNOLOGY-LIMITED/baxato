import { z } from 'zod';
import { WalletType } from './enums.js';

export const transferCommissionSchema = z.object({
  amountNaira: z
    .number({ invalid_type_error: 'Amount must be a number' })
    .positive('Amount must be greater than zero')
    .min(50, 'Minimum commission transfer amount is ₦50'),
  narration: z.string().max(255).optional(),
});

export type TransferCommissionInput = z.infer<typeof transferCommissionSchema>;

export const creditWalletSchema = z.object({
  amountNaira: z.number().positive('Amount must be greater than zero').min(100, 'Minimum amount is ₦100'),
  walletType: z.enum([WalletType.MAIN, WalletType.COMMISSION]).default(WalletType.MAIN),
  narration: z.string().max(255).optional(),
});

export type CreditWalletInput = z.infer<typeof creditWalletSchema>;

export interface WalletBalanceDto {
  id: string;
  businessId: string;
  type: WalletType;
  balanceKobo: string;
  balanceNaira: number;
  formattedBalance: string;
  lockedBalanceKobo: string;
  lockedBalanceNaira: number;
  formattedLockedBalance: string;
  availableBalanceKobo: string;
  availableBalanceNaira: number;
  formattedAvailableBalance: string;
  version: number;
}
