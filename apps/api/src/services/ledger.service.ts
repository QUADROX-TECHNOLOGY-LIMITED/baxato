import {
  LedgerDirection,
  LedgerEntryType,
  ValidationError,
  NotFoundError,
  koboToNaira,
  formatNairaFromKobo,
  type LedgerEntryDto,
  type LedgerStatementDto,
} from '@baxato/common';
import { db, financialLedger, wallets, eq, desc } from '@baxato/database';

export interface RecordDoubleEntryInput {
  businessId: string;
  reference: string;
  type: LedgerEntryType;
  category?: 'FUNDING' | 'AIRTIME_PURCHASE' | 'DATA_PURCHASE' | 'CABLE_TV_PURCHASE' | 'ELECTRICITY_PURCHASE' | 'EXAM_PIN_PURCHASE' | 'COMMISSION_EARNED' | 'REFUND' | 'ADJUSTMENT' | 'WITHDRAWAL';
  description?: string;
  transactionId?: string;
  debit: {
    walletId: string;
    amountKobo: bigint;
    balanceBeforeKobo: bigint;
    balanceAfterKobo: bigint;
  };
  credit: {
    walletId: string;
    amountKobo: bigint;
    balanceBeforeKobo: bigint;
    balanceAfterKobo: bigint;
  };
}

export class LedgerService {
  private mapTypeToCategory(type: LedgerEntryType): 'FUNDING' | 'AIRTIME_PURCHASE' | 'DATA_PURCHASE' | 'CABLE_TV_PURCHASE' | 'ELECTRICITY_PURCHASE' | 'EXAM_PIN_PURCHASE' | 'COMMISSION_EARNED' | 'REFUND' | 'ADJUSTMENT' | 'WITHDRAWAL' {
    switch (type) {
      case LedgerEntryType.WALLET_FUNDING:
        return 'FUNDING';
      case LedgerEntryType.COMMISSION_EARNED:
        return 'COMMISSION_EARNED';
      case LedgerEntryType.COMMISSION_SWEEP:
        return 'ADJUSTMENT';
      case LedgerEntryType.REFUND:
        return 'REFUND';
      case LedgerEntryType.SERVICE_PURCHASE:
      default:
        return 'AIRTIME_PURCHASE';
    }
  }

  /**
   * Transforms raw ledger entity into standard LedgerEntryDto.
   */
  public toLedgerEntryDto(entry: {
    id: string;
    businessId: string;
    walletId: string;
    amount: bigint;
    balanceBefore: bigint;
    balanceAfter: bigint;
    entryType?: string;
    direction?: string;
    category?: string;
    reference: string;
    description?: string | null;
    narration?: string | null;
    createdAt: Date;
  }): LedgerEntryDto {
    const direction = (entry.entryType || entry.direction || LedgerDirection.CREDIT) as LedgerDirection;
    const category = (entry.category || LedgerEntryType.WALLET_FUNDING) as unknown as LedgerEntryType;

    return {
      id: entry.id,
      businessId: entry.businessId,
      walletId: entry.walletId,
      amountKobo: entry.amount.toString(),
      amountNaira: koboToNaira(entry.amount),
      formattedAmount: formatNairaFromKobo(entry.amount),
      balanceBeforeKobo: entry.balanceBefore.toString(),
      balanceBeforeNaira: koboToNaira(entry.balanceBefore),
      formattedBalanceBefore: formatNairaFromKobo(entry.balanceBefore),
      balanceAfterKobo: entry.balanceAfter.toString(),
      balanceAfterNaira: koboToNaira(entry.balanceAfter),
      formattedBalanceAfter: formatNairaFromKobo(entry.balanceAfter),
      direction,
      type: category,
      reference: entry.reference,
      narration: entry.description || entry.narration || null,
      createdAt: entry.createdAt,
    };
  }

  /**
   * Commits an immutable, balanced double-entry transaction to the financial ledger.
   * Strictly enforces the zero-sum invariant: debits === credits.
   */
  public async recordDoubleEntry(input: RecordDoubleEntryInput): Promise<[LedgerEntryDto, LedgerEntryDto]> {
    // 1. Verify Zero-Sum Invariant
    if (input.debit.amountKobo !== input.credit.amountKobo) {
      throw new ValidationError(
        `Unbalanced double-entry transaction. Debit amount (${formatNairaFromKobo(input.debit.amountKobo)}) does not equal credit amount (${formatNairaFromKobo(input.credit.amountKobo)}).`,
      );
    }

    if (input.debit.amountKobo <= 0n) {
      throw new ValidationError('Ledger transaction amount must be greater than zero.');
    }

    const category = input.category || this.mapTypeToCategory(input.type);
    const descText = input.description || `${input.type} transaction`;

    // 2. Insert paired entries atomically
    const [debitRow, creditRow] = await db
      .insert(financialLedger)
      .values([
        {
          businessId: input.businessId,
          walletId: input.debit.walletId,
          transactionId: input.transactionId || null,
          amount: input.debit.amountKobo,
          balanceBefore: input.debit.balanceBeforeKobo,
          balanceAfter: input.debit.balanceAfterKobo,
          entryType: LedgerDirection.DEBIT,
          category,
          reference: input.reference,
          description: `${descText} - Debit`,
        },
        {
          businessId: input.businessId,
          walletId: input.credit.walletId,
          transactionId: input.transactionId || null,
          amount: input.credit.amountKobo,
          balanceBefore: input.credit.balanceBeforeKobo,
          balanceAfter: input.credit.balanceAfterKobo,
          entryType: LedgerDirection.CREDIT,
          category,
          reference: input.reference,
          description: `${descText} - Credit`,
        },
      ])
      .returning();

    if (!debitRow || !creditRow) {
      throw new Error('Failed to record double-entry ledger rows.');
    }

    return [this.toLedgerEntryDto(debitRow), this.toLedgerEntryDto(creditRow)];
  }

  /**
   * Retrieves a paginated financial ledger statement for a wallet.
   */
  public async getWalletStatement(walletId: string, limit = 50): Promise<LedgerStatementDto> {
    const [wallet] = await db
      .select({ id: wallets.id, businessId: wallets.businessId })
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .limit(1);

    if (!wallet) {
      throw new NotFoundError('Wallet');
    }

    const rows = await db
      .select()
      .from(financialLedger)
      .where(eq(financialLedger.walletId, walletId))
      .orderBy(desc(financialLedger.createdAt))
      .limit(limit);

    let totalDebitsKobo = 0n;
    let totalCreditsKobo = 0n;

    const entries = rows.map((r) => {
      const isDebit = r.entryType === LedgerDirection.DEBIT || (r as { direction?: string }).direction === LedgerDirection.DEBIT;
      if (isDebit) {
        totalDebitsKobo += r.amount;
      } else {
        totalCreditsKobo += r.amount;
      }
      return this.toLedgerEntryDto(r);
    });

    const netKobo = totalCreditsKobo - totalDebitsKobo;

    return {
      walletId,
      businessId: wallet.businessId,
      entries,
      totalDebitsKobo: totalDebitsKobo.toString(),
      totalDebitsNaira: koboToNaira(totalDebitsKobo),
      formattedTotalDebits: formatNairaFromKobo(totalDebitsKobo),
      totalCreditsKobo: totalCreditsKobo.toString(),
      totalCreditsNaira: koboToNaira(totalCreditsKobo),
      formattedTotalCredits: formatNairaFromKobo(totalCreditsKobo),
      netKobo: netKobo.toString(),
      netNaira: koboToNaira(netKobo),
      formattedNet: formatNairaFromKobo(netKobo),
      count: entries.length,
    };
  }

  /**
   * Computes mathematical audit integrity: verifies that current wallet balance
   * exactly equals the cumulative net sum of all historical ledger entries.
   */
  public async verifyWalletLedgerAudit(walletId: string) {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .limit(1);

    if (!wallet) {
      throw new NotFoundError('Wallet');
    }

    const allEntries = await db
      .select()
      .from(financialLedger)
      .where(eq(financialLedger.walletId, walletId));

    let calculatedKobo = 0n;

    for (const entry of allEntries) {
      const isCredit = entry.entryType === LedgerDirection.CREDIT || (entry as { direction?: string }).direction === LedgerDirection.CREDIT;
      const isDebit = entry.entryType === LedgerDirection.DEBIT || (entry as { direction?: string }).direction === LedgerDirection.DEBIT;

      if (isCredit) {
        calculatedKobo += entry.amount;
      } else if (isDebit) {
        calculatedKobo -= entry.amount;
      }
    }

    const currentBalance = wallet.balance;
    const discrepancyKobo = currentBalance - calculatedKobo;
    const matches = discrepancyKobo === 0n;

    return {
      walletId,
      businessId: wallet.businessId,
      matches,
      currentBalanceKobo: currentBalance.toString(),
      currentBalanceNaira: koboToNaira(currentBalance),
      formattedCurrentBalance: formatNairaFromKobo(currentBalance),
      ledgerCalculatedKobo: calculatedKobo.toString(),
      ledgerCalculatedNaira: koboToNaira(calculatedKobo),
      formattedLedgerCalculated: formatNairaFromKobo(calculatedKobo),
      discrepancyKobo: discrepancyKobo.toString(),
      totalLedgerEntries: allEntries.length,
    };
  }
}

export const ledgerService = new LedgerService();
