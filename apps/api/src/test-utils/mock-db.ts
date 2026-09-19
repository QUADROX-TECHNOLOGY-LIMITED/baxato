import { vi } from 'vitest';
import { UserRole, KycStatus, LedgerDirection } from '@baxato/common';

export interface MockUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string | null;
  phoneNumber?: string;
  passwordHash?: string;
  avatarUrl?: string | null;
  role: string;
  status: string;
  kycStatus: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  nin?: string | null;
  dob?: string | null;
  ninData?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockBusiness {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  websiteUrl?: string | null;
  country: string;
  state: string;
  lga: string;
  status: string;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockBusinessMember {
  id: string;
  businessId: string;
  userId: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockWallet {
  id: string;
  businessId: string;
  type: string;
  balance: bigint;
  lockedBalance: bigint;
  version: number;
}

export interface MockLedgerEntry {
  id: string;
  businessId: string;
  walletId: string;
  amount: bigint;
  balanceBefore: bigint;
  balanceAfter: bigint;
  entryType: string;
  direction?: string;
  category: string;
  description: string;
  reference: string;
  createdAt: Date;
}

export interface MockIdempotencyKey {
  id: string;
  key: string;
  businessId: string;
  requestHash: string;
  responseStatus?: number | null;
  responseBody?: unknown;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface MockKycVerification {
  id: string;
  userId: string;
  nin: string;
  dob: string;
  providerName: string;
  status: string;
  matchScore: number;
  photoExtracted: boolean;
  rawResponse: Record<string, unknown>;
  verifiedAt?: Date;
  createdAt: Date;
}

export interface MockServiceTransaction {
  id: string;
  businessId: string;
  userId: string;
  serviceType: string;
  amount: bigint;
  fee: bigint;
  discount: bigint;
  totalAmount: bigint;
  status: string;
  recipient: string;
  providerName: string;
  providerReference?: string | null;
  clientReference?: string | null;
  requestReference?: string | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockExamPin {
  id: string;
  examBody: string;
  pinEncrypted: string;
  serialEncrypted: string;
  amount: bigint;
  status: string;
  dispensedTransactionId?: string | null;
  dispensedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockApiKey {
  id: string;
  businessId: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  environment: string;
  status: string;
  lastUsedAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MockWebhookDelivery {
  id: string;
  businessId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: string;
  attempts: number;
  lastAttemptAt?: Date | null;
  nextRetryAt?: Date | null;
  responseStatus?: number | null;
  responseBody?: string | null;
  createdAt: Date;
}

export class InMemoryTestDb {
  public users: MockUser[] = [];
  public businesses: MockBusiness[] = [];
  public businessMembers: MockBusinessMember[] = [];
  public wallets: MockWallet[] = [];
  public financialLedger: MockLedgerEntry[] = [];
  public idempotencyKeys: MockIdempotencyKey[] = [];
  public kycVerifications: MockKycVerification[] = [];
  public serviceTransactions: MockServiceTransaction[] = [];
  public examPins: MockExamPin[] = [];
  public apiKeys: MockApiKey[] = [];
  public webhookDeliveries: MockWebhookDelivery[] = [];

  public reset() {
    this.users = [];
    this.businesses = [];
    this.businessMembers = [];
    this.wallets = [];
    this.financialLedger = [];
    this.idempotencyKeys = [];
    this.kycVerifications = [];
    this.serviceTransactions = [];
    this.examPins = [];
    this.apiKeys = [];
    this.webhookDeliveries = [];
  }
}

export const inMemoryDb = new InMemoryTestDb();

function getColName(c: unknown): string {
  if (typeof c === 'string') return c.replace(/([A-Z])/g, '_$1').toLowerCase();
  if (typeof c === 'object' && c !== null && 'name' in c) {
    return String((c as { name: string }).name).toLowerCase();
  }
  return String(c).toLowerCase();
}

function isUsersTable(t: unknown): boolean {
  if (t === 'users') return true;
  if (typeof t === 'object' && t !== null) {
    const obj = t as Record<string, unknown>;
    return 'email' in obj || obj._name === 'users' || obj.name === 'users';
  }
  return false;
}

function isBusinessesTable(t: unknown): boolean {
  if (t === 'businesses') return true;
  if (typeof t === 'object' && t !== null) {
    const obj = t as Record<string, unknown>;
    return 'ownerId' in obj || 'owner_id' in obj || obj._name === 'businesses' || obj.name === 'businesses';
  }
  return false;
}

function isBusinessMembersTable(t: unknown): boolean {
  if (t === 'business_members' || t === 'businessMembers') return true;
  if (typeof t === 'object' && t !== null) {
    const obj = t as Record<string, unknown>;
    return (
      ('businessId' in obj && 'userId' in obj && !('serviceType' in obj) && !('service_type' in obj)) ||
      obj._name === 'business_members' ||
      obj.name === 'business_members'
    );
  }
  return false;
}

function isWalletsTable(t: unknown): boolean {
  if (t === 'wallets') return true;
  if (typeof t === 'object' && t !== null) {
    const obj = t as Record<string, unknown>;
    return ('balance' in obj && !('entryType' in obj) && !('direction' in obj)) || obj._name === 'wallets' || obj.name === 'wallets';
  }
  return false;
}

function isFinancialLedgerTable(t: unknown): boolean {
  if (t === 'financial_ledger' || t === 'financialLedger') return true;
  if (typeof t === 'object' && t !== null) {
    const obj = t as Record<string, unknown>;
    return 'entryType' in obj || 'entry_type' in obj || 'balanceBefore' in obj || 'balance_before' in obj || obj._name === 'financial_ledger' || obj.name === 'financial_ledger';
  }
  return false;
}

function isIdempotencyKeysTable(t: unknown): boolean {
  if (t === 'idempotency_keys' || t === 'idempotencyKeys') return true;
  if (typeof t === 'object' && t !== null) {
    const obj = t as Record<string, unknown>;
    return 'requestHash' in obj || 'request_hash' in obj || ('key' in obj && 'businessId' in obj && !('ownerId' in obj)) || obj._name === 'idempotency_keys' || obj.name === 'idempotency_keys';
  }
  return false;
}

function isServiceTransactionsTable(t: unknown): boolean {
  if (t === 'service_transactions' || t === 'serviceTransactions') return true;
  if (typeof t === 'object' && t !== null) {
    const obj = t as Record<string, unknown>;
    return (
      'serviceType' in obj ||
      'service_type' in obj ||
      obj._name === 'service_transactions' ||
      obj.name === 'service_transactions'
    );
  }
  return false;
}

function isExamPinsTable(t: unknown): boolean {
  if (t === 'exam_pins' || t === 'examPins') return true;
  if (typeof t === 'object' && t !== null) {
    const obj = t as Record<string, unknown>;
    return (
      'pinEncrypted' in obj ||
      'pin_encrypted' in obj ||
      'serialEncrypted' in obj ||
      'serial_encrypted' in obj ||
      obj._name === 'exam_pins' ||
      obj.name === 'exam_pins'
    );
  }
  return false;
}

function isApiKeysTable(t: unknown): boolean {
  if (t === 'api_keys' || t === 'apiKeys') return true;
  if (typeof t === 'object' && t !== null) {
    const obj = t as Record<string, unknown>;
    return (
      'keyHash' in obj ||
      'key_hash' in obj ||
      'keyPrefix' in obj ||
      'key_prefix' in obj ||
      obj._name === 'api_keys' ||
      obj.name === 'api_keys'
    );
  }
  return false;
}

function isWebhookDeliveriesTable(t: unknown): boolean {
  if (t === 'webhook_deliveries' || t === 'webhookDeliveries') return true;
  if (typeof t === 'object' && t !== null) {
    const obj = t as Record<string, unknown>;
    return (
      'eventType' in obj ||
      'event_type' in obj ||
      'nextRetryAt' in obj ||
      'next_retry_at' in obj ||
      obj._name === 'webhook_deliveries' ||
      obj.name === 'webhook_deliveries'
    );
  }
  return false;
}

/**
 * Creates a Vitest mock instance of `@baxato/database`
 */
export function createMockDatabase() {
  const executeInsert = (data: unknown) => {
    if (Array.isArray(data)) {
      const results: unknown[] = [];
      for (const item of data) {
        if (typeof item === 'object' && item !== null) {
          const rec = item as Record<string, unknown>;
          if ('entryType' in rec || 'direction' in rec || 'category' in rec) {
            const entry: MockLedgerEntry = {
              id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              businessId: String(rec.businessId),
              walletId: String(rec.walletId),
              amount: BigInt(rec.amount as bigint || 0n),
              balanceBefore: BigInt(rec.balanceBefore as bigint || 0n),
              balanceAfter: BigInt(rec.balanceAfter as bigint || 0n),
              entryType: String(rec.entryType || rec.direction || 'CREDIT'),
              direction: String(rec.entryType || rec.direction || 'CREDIT'),
              category: String(rec.category || 'FUNDING'),
              description: String(rec.description || rec.narration || 'Ledger Entry'),
              reference: String(rec.reference),
              createdAt: new Date(),
            };
            inMemoryDb.financialLedger.push(entry);
            results.push(entry);
          } else if ('businessId' in rec && 'type' in rec) {
            const w: MockWallet = {
              id: `wal_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              businessId: String(rec.businessId),
              type: String(rec.type),
              balance: BigInt(rec.balance as bigint || 0n),
              lockedBalance: BigInt(rec.lockedBalance as bigint || 0n),
              version: 1,
            };
            inMemoryDb.wallets.push(w);
            results.push(w);
          }
        }
      }
      return results;
    }

    if (typeof data === 'object' && data !== null) {
      const u = data as Record<string, unknown>;

      if ('entryType' in u || 'direction' in u || 'category' in u) {
        const entry: MockLedgerEntry = {
          id: `led_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          businessId: String(u.businessId),
          walletId: String(u.walletId),
          amount: BigInt(u.amount as bigint || 0n),
          balanceBefore: BigInt(u.balanceBefore as bigint || 0n),
          balanceAfter: BigInt(u.balanceAfter as bigint || 0n),
          entryType: String(u.entryType || u.direction || 'CREDIT'),
          direction: String(u.entryType || u.direction || 'CREDIT'),
          category: String(u.category || 'FUNDING'),
          description: String(u.description || u.narration || 'Ledger Entry'),
          reference: String(u.reference),
          createdAt: new Date(),
        };
        inMemoryDb.financialLedger.push(entry);
        return [entry];
      }

      if ('requestHash' in u || ('key' in u && 'businessId' in u)) {
        const key: MockIdempotencyKey = {
          id: `idm_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          key: String(u.key),
          businessId: String(u.businessId),
          requestHash: String(u.requestHash || ''),
          responseStatus: u.responseStatus ? Number(u.responseStatus) : null,
          responseBody: u.responseBody,
          lockedUntil: u.lockedUntil ? (u.lockedUntil as Date) : new Date(Date.now() + 60000),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryDb.idempotencyKeys.push(key);
        return [key];
      }

      if ('email' in u && 'firstName' in u) {
        const newUser: MockUser = {
          id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          email: String(u.email),
          firstName: String(u.firstName),
          lastName: String(u.lastName),
          middleName: u.middleName ? String(u.middleName) : null,
          phoneNumber: u.phoneNumber ? String(u.phoneNumber) : undefined,
          passwordHash: u.passwordHash ? String(u.passwordHash) : undefined,
          avatarUrl: u.avatarUrl ? String(u.avatarUrl) : null,
          role: String(u.role || UserRole.BUSINESS_OWNER),
          status: String(u.status || 'ACTIVE'),
          kycStatus: String(u.kycStatus || KycStatus.UNVERIFIED),
          isEmailVerified: Boolean(u.isEmailVerified),
          isPhoneVerified: Boolean(u.isPhoneVerified),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryDb.users.push(newUser);
        return [newUser];
      }

      if ('name' in u && 'slug' in u) {
        const newBiz: MockBusiness = {
          id: `biz_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          ownerId: String(u.ownerId),
          name: String(u.name),
          slug: String(u.slug),
          websiteUrl: u.websiteUrl ? String(u.websiteUrl) : null,
          country: String(u.country || 'NG'),
          state: String(u.state || 'Lagos'),
          lga: String(u.lga || 'Ikeja'),
          status: 'ACTIVE',
          webhookUrl: u.webhookUrl ? String(u.webhookUrl) : null,
          webhookSecret: u.webhookSecret ? String(u.webhookSecret) : 'whsec_test',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryDb.businesses.push(newBiz);
        return [newBiz];
      }

      if ('serviceType' in u || 'service_type' in u) {
        const txn: MockServiceTransaction = {
          id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          businessId: String(u.businessId),
          userId: String(u.userId),
          serviceType: String(u.serviceType || u.service_type),
          amount: BigInt((u.amount as bigint) || 0n),
          fee: BigInt((u.fee as bigint) || 0n),
          discount: BigInt((u.discount as bigint) || 0n),
          totalAmount: BigInt((u.totalAmount as bigint) || (u.amount as bigint) || 0n),
          status: String(u.status || 'PROCESSING'),
          recipient: String(u.recipient),
          providerName: String(u.providerName || u.provider_name || 'MONNIFY'),
          providerReference: u.providerReference ? String(u.providerReference) : null,
          clientReference: u.clientReference ? String(u.clientReference) : null,
          requestReference: u.requestReference ? String(u.requestReference) : null,
          errorMessage: u.errorMessage ? String(u.errorMessage) : null,
          metadata: (u.metadata as Record<string, unknown>) || {},
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryDb.serviceTransactions.push(txn);
        return [txn];
      }

      if ('pinEncrypted' in u || 'pin_encrypted' in u) {
        const pin: MockExamPin = {
          id: `pin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          examBody: String(u.examBody || u.exam_body),
          pinEncrypted: String(u.pinEncrypted || u.pin_encrypted),
          serialEncrypted: String(u.serialEncrypted || u.serial_encrypted),
          amount: BigInt((u.amount as bigint) || 0n),
          status: String(u.status || 'AVAILABLE'),
          dispensedTransactionId: u.dispensedTransactionId ? String(u.dispensedTransactionId) : null,
          dispensedAt: (u.dispensedAt as Date) || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryDb.examPins.push(pin);
        return [pin];
      }

      if ('keyHash' in u || 'key_hash' in u) {
        const key: MockApiKey = {
          id: String(u.id || `key_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
          businessId: String(u.businessId || u.business_id),
          name: String(u.name),
          keyHash: String(u.keyHash || u.key_hash),
          keyPrefix: String(u.keyPrefix || u.key_prefix),
          environment: String(u.environment || 'TEST'),
          status: String(u.status || 'ACTIVE'),
          lastUsedAt: (u.lastUsedAt as Date) || null,
          expiresAt: (u.expiresAt as Date) || null,
          createdAt: (u.createdAt as Date) || new Date(),
          updatedAt: (u.updatedAt as Date) || new Date(),
        };
        inMemoryDb.apiKeys.push(key);
        return [key];
      }

      if ('eventType' in u || 'event_type' in u) {
        const whd: MockWebhookDelivery = {
          id: String(u.id || `whd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`),
          businessId: String(u.businessId || u.business_id),
          eventType: String(u.eventType || u.event_type),
          payload: (u.payload as Record<string, unknown>) || {},
          status: String(u.status || 'PENDING'),
          attempts: Number(u.attempts || 0),
          lastAttemptAt: (u.lastAttemptAt as Date) || null,
          nextRetryAt: (u.nextRetryAt as Date) || null,
          responseStatus: u.responseStatus ? Number(u.responseStatus) : null,
          responseBody: u.responseBody ? String(u.responseBody) : null,
          createdAt: (u.createdAt as Date) || new Date(),
        };
        inMemoryDb.webhookDeliveries.push(whd);
        return [whd];
      }

      if ('businessId' in u && 'userId' in u && 'role' in u) {
        const newMember: MockBusinessMember = {
          id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          businessId: String(u.businessId),
          userId: String(u.userId),
          role: String(u.role),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        inMemoryDb.businessMembers.push(newMember);
        return [newMember];
      }
    }

    return [];
  };

  return {
    users: {
      id: 'id',
      email: 'email',
      phoneNumber: 'phone_number',
      role: 'role',
      status: 'status',
      kycStatus: 'kyc_status',
    },
    businesses: {
      id: 'id',
      ownerId: 'owner_id',
      status: 'status',
    },
    businessMembers: {
      id: 'id',
      businessId: 'business_id',
      userId: 'user_id',
      role: 'role',
      createdAt: 'created_at',
    },
    wallets: {
      id: 'id',
      businessId: 'business_id',
      type: 'type',
      balance: 'balance',
      lockedBalance: 'locked_balance',
      version: 'version',
    },
    financialLedger: {
      id: 'id',
      businessId: 'business_id',
      walletId: 'wallet_id',
      amount: 'amount',
      entryType: 'entry_type',
      category: 'category',
      reference: 'reference',
      description: 'description',
      createdAt: 'created_at',
    },
    idempotencyKeys: {
      id: 'id',
      key: 'key',
      businessId: 'business_id',
      requestHash: 'request_hash',
      responseStatus: 'response_status',
      responseBody: 'response_body',
      lockedUntil: 'locked_until',
    },
    kycVerifications: {
      id: 'id',
      userId: 'user_id',
    },
    serviceTransactions: {
      id: 'id',
      businessId: 'business_id',
      userId: 'user_id',
      serviceType: 'service_type',
      amount: 'amount',
      fee: 'fee',
      discount: 'discount',
      totalAmount: 'total_amount',
      status: 'status',
      recipient: 'recipient',
      providerName: 'provider_name',
      providerReference: 'provider_reference',
      clientReference: 'client_reference',
      requestReference: 'request_reference',
      errorMessage: 'error_message',
      metadata: 'metadata',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    examPins: {
      id: 'id',
      examBody: 'exam_body',
      pinEncrypted: 'pin_encrypted',
      serialEncrypted: 'serial_encrypted',
      amount: 'amount',
      status: 'status',
      dispensedTransactionId: 'dispensed_transaction_id',
      dispensedAt: 'dispensed_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    apiKeys: {
      id: 'id',
      businessId: 'business_id',
      name: 'name',
      keyHash: 'key_hash',
      keyPrefix: 'key_prefix',
      environment: 'environment',
      status: 'status',
      lastUsedAt: 'last_used_at',
      expiresAt: 'expires_at',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    webhookDeliveries: {
      id: 'id',
      businessId: 'business_id',
      eventType: 'event_type',
      payload: 'payload',
      status: 'status',
      attempts: 'attempts',
      lastAttemptAt: 'last_attempt_at',
      nextRetryAt: 'next_retry_at',
      responseStatus: 'response_status',
      responseBody: 'response_body',
      createdAt: 'created_at',
    },
    desc: (col: unknown) => ({ type: 'desc', col }),
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ type: 'sql', strings, values }),
    eq: (col: unknown, val: unknown) => ({ type: 'eq', col: getColName(col), val }),
    lte: (col: unknown, val: unknown) => ({ type: 'lte', col: getColName(col), val }),
    and: (...conditions: Array<{ type: string; col: unknown; val: unknown }>) => ({
      type: 'and',
      conditions: conditions.map((c) => ({ ...c, col: getColName(c.col) })),
    }),
    db: {
      select: (fields?: unknown) => ({
        from: (table: unknown) => {
          const executeFilter = (predicate?: unknown) => {
            if (isFinancialLedgerTable(table)) {
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  const col = getColName(p.col);
                  if (col === 'wallet_id' || col === 'walletid') {
                    return inMemoryDb.financialLedger.filter((l) => l.walletId === p.val);
                  }
                }
              }
              return inMemoryDb.financialLedger;
            }

            if (isIdempotencyKeysTable(table)) {
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'and' && Array.isArray(p.conditions)) {
                  const conds = p.conditions as Array<{ col: unknown; val: unknown }>;
                  return inMemoryDb.idempotencyKeys.filter((k) => {
                    for (const c of conds) {
                      const col = getColName(c.col);
                      if (col === 'key' && k.key !== c.val) return false;
                      if ((col === 'business_id' || col === 'businessid') && k.businessId !== c.val) return false;
                    }
                    return true;
                  });
                }
              }
              return inMemoryDb.idempotencyKeys;
            }

            if (isBusinessesTable(table)) {
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  const col = getColName(p.col);
                  if (col === 'id') return inMemoryDb.businesses.filter((b) => b.id === p.val);
                  if (col === 'owner_id' || col === 'ownerid') return inMemoryDb.businesses.filter((b) => b.ownerId === p.val);
                }
                if (p.type === 'and' && Array.isArray(p.conditions)) {
                  const conds = p.conditions as Array<{ col: unknown; val: unknown }>;
                  return inMemoryDb.businesses.filter((b) => {
                    for (const c of conds) {
                      const col = getColName(c.col);
                      if ((col === 'owner_id' || col === 'ownerid') && b.ownerId !== c.val) return false;
                      if (col === 'status' && b.status !== c.val) return false;
                      if (col === 'id' && b.id !== c.val) return false;
                    }
                    return true;
                  });
                }
              }
              return inMemoryDb.businesses;
            }

            if (isBusinessMembersTable(table)) {
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  const col = getColName(p.col);
                  if (col === 'user_id' || col === 'userid') return inMemoryDb.businessMembers.filter((m) => m.userId === p.val);
                  if (col === 'business_id' || col === 'businessid') return inMemoryDb.businessMembers.filter((m) => m.businessId === p.val);
                  if (col === 'id') return inMemoryDb.businessMembers.filter((m) => m.id === p.val);
                }
                if (p.type === 'and' && Array.isArray(p.conditions)) {
                  const conds = p.conditions as Array<{ col: unknown; val: unknown }>;
                  return inMemoryDb.businessMembers.filter((m) => {
                    for (const c of conds) {
                      const col = getColName(c.col);
                      if ((col === 'user_id' || col === 'userid') && m.userId !== c.val) return false;
                      if ((col === 'business_id' || col === 'businessid') && m.businessId !== c.val) return false;
                      if (col === 'id' && m.id !== c.val) return false;
                    }
                    return true;
                  });
                }
              }
              return inMemoryDb.businessMembers;
            }

            if (isWalletsTable(table)) {
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  const col = getColName(p.col);
                  if (col === 'id') return inMemoryDb.wallets.filter((w) => w.id === p.val);
                  if (col === 'business_id' || col === 'businessid') return inMemoryDb.wallets.filter((w) => w.businessId === p.val);
                }
                if (p.type === 'and' && Array.isArray(p.conditions)) {
                  const conds = p.conditions as Array<{ col: unknown; val: unknown }>;
                  return inMemoryDb.wallets.filter((w) => {
                    for (const c of conds) {
                      const col = getColName(c.col);
                      if (col === 'id' && w.id !== c.val) return false;
                      if ((col === 'business_id' || col === 'businessid') && w.businessId !== c.val) return false;
                      if (col === 'type' && w.type !== c.val) return false;
                    }
                    return true;
                  });
                }
              }
              return inMemoryDb.wallets;
            }

            if (isUsersTable(table)) {
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  const col = getColName(p.col);
                  if (col === 'email') return inMemoryDb.users.filter((u) => u.email === p.val);
                  if (col === 'id') return inMemoryDb.users.filter((u) => u.id === p.val);
                  if (col === 'phone_number' || col === 'phonenumber') return inMemoryDb.users.filter((u) => u.phoneNumber === p.val);
                }
              }
              return inMemoryDb.users;
            }

            if (isServiceTransactionsTable(table)) {
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  const col = getColName(p.col);
                  if (col === 'id') return inMemoryDb.serviceTransactions.filter((s) => s.id === p.val);
                  if (col === 'business_id' || col === 'businessid') return inMemoryDb.serviceTransactions.filter((s) => s.businessId === p.val);
                  if (col === 'service_type' || col === 'servicetype') return inMemoryDb.serviceTransactions.filter((s) => s.serviceType === p.val);
                }
                if (p.type === 'and' && Array.isArray(p.conditions)) {
                  const conds = p.conditions as Array<{ col: unknown; val: unknown }>;
                  return inMemoryDb.serviceTransactions.filter((s) => {
                    for (const c of conds) {
                      const col = getColName(c.col);
                      if ((col === 'business_id' || col === 'businessid') && s.businessId !== c.val) return false;
                      if ((col === 'service_type' || col === 'servicetype') && s.serviceType !== c.val) return false;
                      if (col === 'id' && s.id !== c.val) return false;
                    }
                    return true;
                  });
                }
              }
              return inMemoryDb.serviceTransactions;
            }

            if (isExamPinsTable(table)) {
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  const col = getColName(p.col);
                  if (col === 'id') return inMemoryDb.examPins.filter((pin) => pin.id === p.val);
                  if (col === 'status') return inMemoryDb.examPins.filter((pin) => pin.status === p.val);
                  if (col === 'exam_body' || col === 'exambody') return inMemoryDb.examPins.filter((pin) => pin.examBody === p.val);
                }
                if (p.type === 'and' && Array.isArray(p.conditions)) {
                  const conds = p.conditions as Array<{ col: unknown; val: unknown }>;
                  return inMemoryDb.examPins.filter((pin) => {
                    for (const c of conds) {
                      const col = getColName(c.col);
                      if ((col === 'exam_body' || col === 'exambody') && pin.examBody !== c.val) return false;
                      if (col === 'status' && pin.status !== c.val) return false;
                      if (col === 'id' && pin.id !== c.val) return false;
                    }
                    return true;
                  });
                }
              }
              return inMemoryDb.examPins;
            }

            if (isApiKeysTable(table)) {
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  const col = getColName(p.col);
                  if (col === 'id') return inMemoryDb.apiKeys.filter((k) => k.id === p.val);
                  if (col === 'key_hash' || col === 'keyhash') return inMemoryDb.apiKeys.filter((k) => k.keyHash === p.val);
                  if (col === 'business_id' || col === 'businessid') return inMemoryDb.apiKeys.filter((k) => k.businessId === p.val);
                  if (col === 'status') return inMemoryDb.apiKeys.filter((k) => k.status === p.val);
                }
                if (p.type === 'and' && Array.isArray(p.conditions)) {
                  const conds = p.conditions as Array<{ col: unknown; val: unknown }>;
                  return inMemoryDb.apiKeys.filter((k) => {
                    for (const c of conds) {
                      const col = getColName(c.col);
                      if (col === 'id' && k.id !== c.val) return false;
                      if ((col === 'key_hash' || col === 'keyhash') && k.keyHash !== c.val) return false;
                      if ((col === 'business_id' || col === 'businessid') && k.businessId !== c.val) return false;
                      if (col === 'status' && k.status !== c.val) return false;
                    }
                    return true;
                  });
                }
              }
              return inMemoryDb.apiKeys;
            }

            if (isWebhookDeliveriesTable(table)) {
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  const col = getColName(p.col);
                  if (col === 'id') return inMemoryDb.webhookDeliveries.filter((w) => w.id === p.val);
                  if (col === 'business_id' || col === 'businessid') return inMemoryDb.webhookDeliveries.filter((w) => w.businessId === p.val);
                  if (col === 'status') return inMemoryDb.webhookDeliveries.filter((w) => w.status === p.val);
                }
                if (p.type === 'and' && Array.isArray(p.conditions)) {
                  const conds = p.conditions as Array<{ col: unknown; val: unknown }>;
                  return inMemoryDb.webhookDeliveries.filter((w) => {
                    for (const c of conds) {
                      const col = getColName(c.col);
                      if (col === 'id' && w.id !== c.val) return false;
                      if ((col === 'business_id' || col === 'businessid') && w.businessId !== c.val) return false;
                      if (col === 'status' && w.status !== c.val) return false;
                    }
                    return true;
                  });
                }
              }
              return inMemoryDb.webhookDeliveries;
            }

            return [];
          };

          const createQueryChain = (items: unknown[]) => {
            let current = [...items];
            const chain = {
              orderBy: () => chain,
              limit: (num: number) => {
                current = current.slice(0, num);
                return chain;
              },
              offset: (off: number) => {
                current = current.slice(off);
                return chain;
              },
              then: (resolve: (data: unknown) => void) => resolve(current),
            };
            return chain;
          };

          return {
            where: (predicate: unknown) => {
              const res = executeFilter(predicate);
              return createQueryChain(res);
            },
            leftJoin: () => ({
              where: (predicate: unknown) => {
                const targetBizId = predicate && typeof predicate === 'object' && 'val' in predicate ? (predicate as Record<string, unknown>).val : null;
                const members = inMemoryDb.businessMembers.filter((m) => !targetBizId || m.businessId === targetBizId);

                const joined = members.map((m) => {
                  const u = inMemoryDb.users.find((user) => user.id === m.userId);
                  return {
                    id: m.id,
                    role: m.role,
                    createdAt: m.createdAt,
                    userId: u?.id,
                    email: u?.email,
                    firstName: u?.firstName,
                    lastName: u?.lastName,
                    avatarUrl: u?.avatarUrl,
                  };
                });
                return Promise.resolve(joined);
              },
            }),
            then: (resolve: (data: unknown) => void) => resolve(executeFilter()),
          };
        },
      }),
      insert: (table: unknown) => ({
        values: (data: unknown) => {
          const res = executeInsert(data);
          return {
            returning: async () => res,
            then: (resolve: (data: unknown) => void) => resolve(res),
            onConflictDoNothing: () => ({
              returning: async () => res,
              then: (resolve: (data: unknown) => void) => resolve(res),
            }),
          };
        },
      }),
      update: (table: unknown) => ({
        set: (data: Record<string, unknown>) => ({
          where: (predicate: unknown) => {
            if (isIdempotencyKeysTable(table)) {
              let targetKey: MockIdempotencyKey | undefined;
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'and' && Array.isArray(p.conditions)) {
                  const conds = p.conditions as Array<{ col: unknown; val: unknown }>;
                  targetKey = inMemoryDb.idempotencyKeys.find((k) => {
                    for (const c of conds) {
                      const col = getColName(c.col);
                      if (col === 'key' && k.key !== c.val) return false;
                      if ((col === 'business_id' || col === 'businessid') && k.businessId !== c.val) return false;
                    }
                    return true;
                  });
                }
              }
              if (targetKey) {
                Object.assign(targetKey, data);
                return {
                  returning: async () => [targetKey],
                  then: (resolve: (data: unknown) => void) => resolve([targetKey]),
                };
              }
            }

            if (isServiceTransactionsTable(table)) {
              let targetTxn: MockServiceTransaction | undefined;
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  const col = getColName(p.col);
                  if (col === 'id') {
                    targetTxn = inMemoryDb.serviceTransactions.find((s) => s.id === p.val);
                  }
                }
              }
              if (targetTxn) {
                Object.assign(targetTxn, data);
                return {
                  returning: async () => [targetTxn],
                  then: (resolve: (data: unknown) => void) => resolve([targetTxn]),
                };
              }
            }

            if (isExamPinsTable(table)) {
              let targetPin: MockExamPin | undefined;
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  const col = getColName(p.col);
                  if (col === 'id') {
                    targetPin = inMemoryDb.examPins.find((pin) => pin.id === p.val);
                  }
                }
              }
              if (targetPin) {
                Object.assign(targetPin, data);
                return {
                  returning: async () => [targetPin],
                  then: (resolve: (data: unknown) => void) => resolve([targetPin]),
                };
              }
            }

            if (isWalletsTable(table)) {
              let targetWallet: MockWallet | undefined;
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  targetWallet = inMemoryDb.wallets.find((w) => w.id === p.val);
                } else if (p.type === 'and' && Array.isArray(p.conditions)) {
                  const conds = p.conditions as Array<{ col: unknown; val: unknown }>;
                  targetWallet = inMemoryDb.wallets.find((w) => {
                    for (const c of conds) {
                      const col = getColName(c.col);
                      if (col === 'id' && w.id !== c.val) return false;
                      if (col === 'version' && w.version !== Number(c.val)) return false;
                    }
                    return true;
                  });
                }
              }

              if (targetWallet) {
                Object.assign(targetWallet, data);
                return {
                  returning: async () => [targetWallet],
                  then: (resolve: (data: unknown) => void) => resolve([targetWallet]),
                };
              }
            }

            const targetVal = predicate && typeof predicate === 'object' && 'val' in predicate ? (predicate as Record<string, unknown>).val : null;

            if (isBusinessesTable(table)) {
              const biz = inMemoryDb.businesses.find((b) => b.id === targetVal);
              if (biz) {
                Object.assign(biz, data);
                return {
                  returning: async () => [biz],
                  then: (resolve: (data: unknown) => void) => resolve([biz]),
                };
              }
            }

            if (isUsersTable(table)) {
              const user = inMemoryDb.users.find((u) => u.id === targetVal || u.phoneNumber === targetVal);
              if (user) {
                Object.assign(user, data);
                return {
                  returning: async () => [user],
                  then: (resolve: (data: unknown) => void) => resolve([user]),
                };
              }
            }

            if (isApiKeysTable(table)) {
              let key: MockApiKey | undefined;
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  const col = getColName(p.col);
                  if (col === 'id') key = inMemoryDb.apiKeys.find((k) => k.id === p.val);
                  else if (col === 'key_hash' || col === 'keyhash') key = inMemoryDb.apiKeys.find((k) => k.keyHash === p.val);
                } else if (p.type === 'and' && Array.isArray(p.conditions)) {
                  const conds = p.conditions as Array<{ col: unknown; val: unknown }>;
                  key = inMemoryDb.apiKeys.find((k) => {
                    for (const c of conds) {
                      const col = getColName(c.col);
                      if (col === 'id' && k.id !== c.val) return false;
                      if ((col === 'business_id' || col === 'businessid') && k.businessId !== c.val) return false;
                    }
                    return true;
                  });
                }
              } else if (targetVal) {
                key = inMemoryDb.apiKeys.find((k) => k.id === targetVal || k.keyHash === targetVal);
              }

              if (key) {
                Object.assign(key, data);
                return {
                  returning: async () => [key],
                  then: (resolve: (data: unknown) => void) => resolve([key]),
                };
              }
            }

            if (isWebhookDeliveriesTable(table)) {
              let whd: MockWebhookDelivery | undefined;
              if (predicate && typeof predicate === 'object' && 'type' in predicate) {
                const p = predicate as Record<string, unknown>;
                if (p.type === 'eq') {
                  const col = getColName(p.col);
                  if (col === 'id') whd = inMemoryDb.webhookDeliveries.find((w) => w.id === p.val);
                }
              } else if (targetVal) {
                whd = inMemoryDb.webhookDeliveries.find((w) => w.id === targetVal);
              }

              if (whd) {
                Object.assign(whd, data);
                return {
                  returning: async () => [whd],
                  then: (resolve: (data: unknown) => void) => resolve([whd]),
                };
              }
            }

            return {
              returning: async () => [],
              then: (resolve: (data: unknown) => void) => resolve([]),
            };
          },
        }),
      }),
      delete: (table: unknown) => ({
        where: (predicate: unknown) => {
          if (isIdempotencyKeysTable(table)) {
            if (predicate && typeof predicate === 'object' && 'type' in predicate) {
              const p = predicate as Record<string, unknown>;
              if (p.type === 'and' && Array.isArray(p.conditions)) {
                const conds = p.conditions as Array<{ col: unknown; val: unknown }>;
                inMemoryDb.idempotencyKeys = inMemoryDb.idempotencyKeys.filter((k) => {
                  for (const c of conds) {
                    const col = getColName(c.col);
                    if (col === 'key' && k.key === c.val) return false;
                  }
                  return true;
                });
              }
            }
          }

          const targetVal = predicate && typeof predicate === 'object' && 'val' in predicate ? (predicate as Record<string, unknown>).val : null;
          inMemoryDb.businessMembers = inMemoryDb.businessMembers.filter((m) => m.id !== targetVal);
          return {
            then: (resolve: (data: unknown) => void) => resolve(true),
          };
        },
      }),
    },
  };
}
