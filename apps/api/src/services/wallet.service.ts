import {
  WalletType,
  InsufficientFundsError,
  NotFoundError,
  ValidationError,
  ConflictError,
  koboToNaira,
  formatNairaFromKobo,
  type WalletBalanceDto,
} from '@baxato/common';
import { db, wallets, eq, and, sql } from '@baxato/database';

export class WalletService {
  /**
   * Transforms raw database wallet entity into standard WalletBalanceDto.
   */
  public toWalletDto(wallet: {
    id: string;
    businessId: string;
    type: string;
    balance: bigint;
    lockedBalance: bigint;
    version: number;
  }): WalletBalanceDto {
    const balanceKobo = wallet.balance;
    const lockedBalanceKobo = wallet.lockedBalance;
    const availableBalanceKobo = balanceKobo >= 0n ? balanceKobo : 0n;

    return {
      id: wallet.id,
      businessId: wallet.businessId,
      type: wallet.type as WalletType,
      balanceKobo: balanceKobo.toString(),
      balanceNaira: koboToNaira(balanceKobo),
      formattedBalance: formatNairaFromKobo(balanceKobo),
      lockedBalanceKobo: lockedBalanceKobo.toString(),
      lockedBalanceNaira: koboToNaira(lockedBalanceKobo),
      formattedLockedBalance: formatNairaFromKobo(lockedBalanceKobo),
      availableBalanceKobo: availableBalanceKobo.toString(),
      availableBalanceNaira: koboToNaira(availableBalanceKobo),
      formattedAvailableBalance: formatNairaFromKobo(availableBalanceKobo),
      version: wallet.version,
    };
  }

  /**
   * Retrieves a wallet by ID.
   */
  public async getWalletById(walletId: string): Promise<WalletBalanceDto> {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(eq(wallets.id, walletId))
      .limit(1);

    if (!wallet) {
      throw new NotFoundError('Wallet');
    }

    return this.toWalletDto(wallet);
  }

  /**
   * Retrieves a specific wallet type for a business.
   */
  public async getBusinessWallet(businessId: string, type: WalletType): Promise<WalletBalanceDto> {
    const [wallet] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.businessId, businessId), eq(wallets.type, type)))
      .limit(1);

    if (!wallet) {
      throw new NotFoundError(`${type} wallet for business`);
    }

    return this.toWalletDto(wallet);
  }

  /**
   * Retrieves all wallets (MAIN & COMMISSION) for a business.
   */
  public async getBusinessWallets(businessId: string): Promise<WalletBalanceDto[]> {
    const businessWallets = await db
      .select()
      .from(wallets)
      .where(eq(wallets.businessId, businessId));

    return businessWallets.map((w) => this.toWalletDto(w));
  }

  /**
   * Credits a wallet with integer Kobo using optimistic concurrency version control.
   */
  public async creditWallet(walletId: string, amountKobo: bigint, maxRetries = 3): Promise<WalletBalanceDto> {
    if (amountKobo <= 0n) {
      throw new ValidationError('Credit amount must be greater than zero.');
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const [current] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, walletId))
        .limit(1);

      if (!current) {
        throw new NotFoundError('Wallet');
      }

      const newBalance = current.balance + amountKobo;
      const nextVersion = current.version + 1;

      const [updated] = await db
        .update(wallets)
        .set({
          balance: newBalance,
          version: nextVersion,
          updatedAt: new Date(),
        })
        .where(and(eq(wallets.id, walletId), eq(wallets.version, current.version)))
        .returning();

      if (updated) {
        return this.toWalletDto(updated);
      }

      // If version conflict occurred, backoff and retry
      if (attempt === maxRetries) {
        throw new ConflictError('Concurrent wallet update collision. Please retry transaction.');
      }
    }

    throw new ConflictError('Failed to credit wallet after maximum concurrency retries.');
  }

  /**
   * Debits a wallet with integer Kobo using optimistic concurrency version control.
   * Prevents negative balances at the database level.
   */
  public async debitWallet(walletId: string, amountKobo: bigint, maxRetries = 3): Promise<WalletBalanceDto> {
    if (amountKobo <= 0n) {
      throw new ValidationError('Debit amount must be greater than zero.');
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const [current] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, walletId))
        .limit(1);

      if (!current) {
        throw new NotFoundError('Wallet');
      }

      if (current.balance < amountKobo) {
        throw new InsufficientFundsError(
          `Insufficient available wallet balance. Current balance is ${formatNairaFromKobo(current.balance)}, but required ${formatNairaFromKobo(amountKobo)}.`,
        );
      }

      const newBalance = current.balance - amountKobo;
      const nextVersion = current.version + 1;

      const [updated] = await db
        .update(wallets)
        .set({
          balance: newBalance,
          version: nextVersion,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(wallets.id, walletId),
            eq(wallets.version, current.version),
            sql`${wallets.balance} >= ${amountKobo}`,
          ),
        )
        .returning();

      if (updated) {
        return this.toWalletDto(updated);
      }

      if (attempt === maxRetries) {
        throw new ConflictError('Concurrent wallet update collision. Please retry transaction.');
      }
    }

    throw new ConflictError('Failed to debit wallet after maximum concurrency retries.');
  }

  /**
   * Locks funds from available balance into lockedBalance during in-flight provider operations.
   */
  public async lockFunds(walletId: string, amountKobo: bigint, maxRetries = 3): Promise<WalletBalanceDto> {
    if (amountKobo <= 0n) {
      throw new ValidationError('Lock amount must be greater than zero.');
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const [current] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, walletId))
        .limit(1);

      if (!current) {
        throw new NotFoundError('Wallet');
      }

      if (current.balance < amountKobo) {
        throw new InsufficientFundsError(
          `Insufficient available funds to lock. Available: ${formatNairaFromKobo(current.balance)}, Required: ${formatNairaFromKobo(amountKobo)}.`,
        );
      }

      const newBalance = current.balance - amountKobo;
      const newLocked = current.lockedBalance + amountKobo;
      const nextVersion = current.version + 1;

      const [updated] = await db
        .update(wallets)
        .set({
          balance: newBalance,
          lockedBalance: newLocked,
          version: nextVersion,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(wallets.id, walletId),
            eq(wallets.version, current.version),
            sql`${wallets.balance} >= ${amountKobo}`,
          ),
        )
        .returning();

      if (updated) {
        return this.toWalletDto(updated);
      }

      if (attempt === maxRetries) {
        throw new ConflictError('Concurrent lock collision. Please retry transaction.');
      }
    }

    throw new ConflictError('Failed to lock wallet funds after maximum retries.');
  }

  /**
   * Unlocks funds. If `shouldDeduct` is true, the locked funds are consumed (settled).
   * If false, the locked funds are refunded back to the available balance.
   */
  public async unlockFunds(
    walletId: string,
    amountKobo: bigint,
    shouldDeduct: boolean,
    maxRetries = 3,
  ): Promise<WalletBalanceDto> {
    if (amountKobo <= 0n) {
      throw new ValidationError('Unlock amount must be greater than zero.');
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const [current] = await db
        .select()
        .from(wallets)
        .where(eq(wallets.id, walletId))
        .limit(1);

      if (!current) {
        throw new NotFoundError('Wallet');
      }

      if (current.lockedBalance < amountKobo) {
        throw new ValidationError(
          `Cannot unlock more than currently locked balance (${formatNairaFromKobo(current.lockedBalance)}).`,
        );
      }

      const newLocked = current.lockedBalance - amountKobo;
      const newBalance = shouldDeduct ? current.balance : current.balance + amountKobo;
      const nextVersion = current.version + 1;

      const [updated] = await db
        .update(wallets)
        .set({
          balance: newBalance,
          lockedBalance: newLocked,
          version: nextVersion,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(wallets.id, walletId),
            eq(wallets.version, current.version),
            sql`${wallets.lockedBalance} >= ${amountKobo}`,
          ),
        )
        .returning();

      if (updated) {
        return this.toWalletDto(updated);
      }

      if (attempt === maxRetries) {
        throw new ConflictError('Concurrent unlock collision. Please retry transaction.');
      }
    }

    throw new ConflictError('Failed to unlock wallet funds after maximum retries.');
  }

  /**
   * Atomically sweeps accumulated commission earnings into the business main wallet.
   */
  public async transferCommissionToMain(businessId: string, amountKobo: bigint) {
    if (amountKobo <= 0n) {
      throw new ValidationError('Transfer amount must be greater than zero.');
    }

    const commissionWallet = await this.getBusinessWallet(businessId, WalletType.COMMISSION);
    const mainWallet = await this.getBusinessWallet(businessId, WalletType.MAIN);

    if (BigInt(commissionWallet.balanceKobo) < amountKobo) {
      throw new InsufficientFundsError(
        `Insufficient commission balance. Current balance is ${commissionWallet.formattedBalance}, but tried to transfer ${formatNairaFromKobo(amountKobo)}.`,
      );
    }

    // 1. Debit Commission Wallet
    const updatedCommission = await this.debitWallet(commissionWallet.id, amountKobo);

    // 2. Credit Main Wallet
    const updatedMain = await this.creditWallet(mainWallet.id, amountKobo);

    return {
      commissionWallet: updatedCommission,
      mainWallet: updatedMain,
      amountKobo: amountKobo.toString(),
      amountNaira: koboToNaira(amountKobo),
      formattedAmount: formatNairaFromKobo(amountKobo),
    };
  }
}

export const walletService = new WalletService();
