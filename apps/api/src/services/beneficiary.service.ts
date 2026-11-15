import { TelecomNetwork, ValidationError, NotFoundError } from '@baxato/common';
import { db, beneficiaries, eq, and, asc, desc, inArray } from '@baxato/database';
import { normalizeNigerianPhone, detectTelcoNetwork } from './telco.utils.js';

export const MAX_BENEFICIARIES_PER_BUSINESS = 5;

export type BeneficiaryServiceType = 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE_TV';
export type ElectricityMeterType = 'PREPAID' | 'POSTPAID';
export type CableOperatorCode = 'DSTV' | 'GOTV' | 'STARTIMES';

export interface BeneficiaryDto {
  id: string;
  businessId: string;
  phoneNumber: string | null;
  network: TelecomNetwork | null;
  meterNumber: string | null;
  disco: string | null;
  meterType: ElectricityMeterType | null;
  smartcardNumber: string | null;
  operator: CableOperatorCode | null;
  label: string | null;
  serviceType: BeneficiaryServiceType | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveBeneficiaryInput {
  businessId: string;
  userId?: string;
  phoneNumber: string;
  network?: TelecomNetwork;
  label?: string;
  serviceType?: 'AIRTIME' | 'DATA';
}

export interface SaveElectricityBeneficiaryInput {
  businessId: string;
  userId?: string;
  meterNumber: string;
  disco: string;
  meterType: string;
  label?: string;
}

export interface SaveCableBeneficiaryInput {
  businessId: string;
  userId?: string;
  smartcardNumber: string;
  operator: string;
  label?: string;
}

interface BeneficiaryRowLike {
  id: string;
  businessId: string;
  phoneNumber: string | null;
  network: string | null;
  meterNumber?: string | null;
  disco?: string | null;
  meterType?: string | null;
  smartcardNumber?: string | null;
  operator?: string | null;
  label: string | null;
  serviceType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toDto(row: BeneficiaryRowLike): BeneficiaryDto {
  return {
    id: row.id,
    businessId: row.businessId,
    phoneNumber: row.phoneNumber ?? null,
    network: (row.network as TelecomNetwork) || null,
    meterNumber: row.meterNumber ?? null,
    disco: row.disco ?? null,
    meterType: (row.meterType as ElectricityMeterType) || null,
    smartcardNumber: row.smartcardNumber ?? null,
    operator: (row.operator as CableOperatorCode) || null,
    label: row.label ?? null,
    serviceType: (row.serviceType as BeneficiaryServiceType) || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function isElectricityBeneficiaryRow(row: { serviceType?: string | null; meterNumber?: string | null }): boolean {
  return row.serviceType === 'ELECTRICITY' && Boolean(row.meterNumber);
}

function isCableBeneficiaryRow(row: { serviceType?: string | null; smartcardNumber?: string | null }): boolean {
  return row.serviceType === 'CABLE_TV' && Boolean(row.smartcardNumber);
}

function isPhoneBeneficiaryRow(row: { serviceType?: string | null; phoneNumber?: string | null }): boolean {
  return row.serviceType !== 'ELECTRICITY' && row.serviceType !== 'CABLE_TV' && Boolean(row.phoneNumber);
}

function normalizeSmartcardNumber(rawSmartcard: string): string {
  const digits = rawSmartcard.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 12) {
    throw new ValidationError('Smartcard / IUC number must be 10 to 12 digits.');
  }
  return digits;
}

function normalizeCableOperator(rawOperator: string): CableOperatorCode {
  const cleaned = rawOperator.trim().toUpperCase();
  if (cleaned !== 'DSTV' && cleaned !== 'GOTV' && cleaned !== 'STARTIMES') {
    throw new ValidationError('Invalid cable operator. Supported: DSTV, GOTV, STARTIMES.');
  }
  return cleaned;
}

function normalizeMeterNumber(rawMeter: string): string {
  const digits = rawMeter.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 13) {
    throw new ValidationError('Meter number must be 8 to 13 digits.');
  }
  return digits;
}

function normalizeDiscoCode(rawDisco: string): string {
  const cleaned = rawDisco.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,32}$/.test(cleaned)) {
    throw new ValidationError('Invalid electricity DisCo code.');
  }
  return cleaned;
}

function normalizeMeterType(rawType: string): ElectricityMeterType {
  const cleaned = rawType.trim().toUpperCase();
  if (cleaned !== 'PREPAID' && cleaned !== 'POSTPAID') {
    throw new ValidationError('Invalid meterType. Supported: PREPAID, POSTPAID.');
  }
  return cleaned;
}

class BeneficiaryService {
  private async evictOverflow(
    businessId: string,
    matchesCategory: (row: {
      serviceType: string | null;
      phoneNumber: string | null;
      meterNumber?: string | null;
      smartcardNumber?: string | null;
    }) => boolean,
  ): Promise<void> {
    const allRows = await db
      .select()
      .from(beneficiaries)
      .where(eq(beneficiaries.businessId, businessId))
      .orderBy(asc(beneficiaries.createdAt), asc(beneficiaries.updatedAt));

    const categoryRows = allRows.filter(matchesCategory);
    if (categoryRows.length < MAX_BENEFICIARIES_PER_BUSINESS) {
      return;
    }

    const overflowCount = categoryRows.length - MAX_BENEFICIARIES_PER_BUSINESS + 1;
    const idsToEvict = categoryRows.slice(0, overflowCount).map((r) => r.id);
    if (idsToEvict.length > 0) {
      await db
        .delete(beneficiaries)
        .where(
          and(
            eq(beneficiaries.businessId, businessId),
            inArray(beneficiaries.id, idsToEvict),
          ),
        );
    }
  }

  /**
   * Lists saved beneficiaries for a business (newest used first, max 5 per service category).
   * Defaults to phone beneficiaries (AIRTIME/DATA) when serviceType is omitted or AIRTIME/DATA.
   */
  public async listBeneficiaries(
    businessId: string,
    serviceType?: BeneficiaryServiceType,
  ): Promise<BeneficiaryDto[]> {
    const rows = await db
      .select()
      .from(beneficiaries)
      .where(eq(beneficiaries.businessId, businessId))
      .orderBy(desc(beneficiaries.updatedAt), desc(beneficiaries.createdAt));

    const filtered =
      serviceType === 'ELECTRICITY'
        ? rows.filter((row) => isElectricityBeneficiaryRow(row))
        : serviceType === 'CABLE_TV'
          ? rows.filter((row) => isCableBeneficiaryRow(row))
          : rows.filter((row) => isPhoneBeneficiaryRow(row));

    return filtered
      .slice(0, MAX_BENEFICIARIES_PER_BUSINESS)
      .map((row) => toDto(row));
  }

  /**
   * Saves a phone beneficiary for a business.
   * Deduplicates by normalized 11-digit number and enforces a strict 5-item FIFO cap
   * (saving a 6th distinct phone evicts the oldest created phone beneficiary).
   */
  public async saveBeneficiary(input: SaveBeneficiaryInput): Promise<BeneficiaryDto> {
    const normalizedPhone = normalizeNigerianPhone(input.phoneNumber);

    if (input.network && !Object.values(TelecomNetwork).includes(input.network)) {
      throw new ValidationError(`Unsupported telecom network: ${input.network}`);
    }

    let resolvedNetwork: TelecomNetwork | null = input.network ?? null;
    if (!resolvedNetwork) {
      try {
        resolvedNetwork = detectTelcoNetwork(normalizedPhone);
      } catch {
        resolvedNetwork = null;
      }
    }

    const cleanedLabel =
      typeof input.label === 'string' && input.label.trim().length > 0
        ? input.label.trim().slice(0, 40)
        : null;

    // 1. Update in-place if this business already saved this number
    const [existing] = await db
      .select()
      .from(beneficiaries)
      .where(
        and(
          eq(beneficiaries.businessId, input.businessId),
          eq(beneficiaries.phoneNumber, normalizedPhone),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(beneficiaries)
        .set({
          network: resolvedNetwork ?? existing.network ?? null,
          label: cleanedLabel ?? existing.label ?? null,
          serviceType: input.serviceType ?? existing.serviceType ?? null,
          userId: input.userId ?? existing.userId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(beneficiaries.id, existing.id))
        .returning();

      return toDto(updated ?? existing);
    }

    // 2. Enforce FIFO max 5 cap within phone beneficiaries
    await this.evictOverflow(
      input.businessId,
      (row) => isPhoneBeneficiaryRow(row),
    );

    const now = new Date();
    const [created] = await db
      .insert(beneficiaries)
      .values({
        businessId: input.businessId,
        userId: input.userId ?? null,
        phoneNumber: normalizedPhone,
        network: resolvedNetwork,
        meterNumber: null,
        disco: null,
        meterType: null,
        smartcardNumber: null,
        operator: null,
        label: cleanedLabel,
        serviceType: input.serviceType ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to persist beneficiary record.');
    }

    return toDto(created);
  }

  /**
   * Saves an electricity meter beneficiary for a business.
   * Deduplicates by (businessId, meterNumber, disco, meterType) and enforces
   * a separate 5-item FIFO cap for electricity meters.
   */
  public async saveElectricityBeneficiary(
    input: SaveElectricityBeneficiaryInput,
  ): Promise<BeneficiaryDto> {
    const normalizedMeter = normalizeMeterNumber(input.meterNumber);
    const normalizedDisco = normalizeDiscoCode(input.disco);
    const normalizedType = normalizeMeterType(input.meterType);

    const cleanedLabel =
      typeof input.label === 'string' && input.label.trim().length > 0
        ? input.label.trim().slice(0, 60)
        : null;

    const [existing] = await db
      .select()
      .from(beneficiaries)
      .where(
        and(
          eq(beneficiaries.businessId, input.businessId),
          eq(beneficiaries.meterNumber, normalizedMeter),
          eq(beneficiaries.disco, normalizedDisco),
          eq(beneficiaries.meterType, normalizedType),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(beneficiaries)
        .set({
          label: cleanedLabel ?? existing.label ?? null,
          userId: input.userId ?? existing.userId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(beneficiaries.id, existing.id))
        .returning();

      return toDto(updated ?? existing);
    }

    await this.evictOverflow(
      input.businessId,
      (row) => isElectricityBeneficiaryRow(row),
    );

    const now = new Date();
    const [created] = await db
      .insert(beneficiaries)
      .values({
        businessId: input.businessId,
        userId: input.userId ?? null,
        phoneNumber: null,
        network: null,
        meterNumber: normalizedMeter,
        disco: normalizedDisco,
        meterType: normalizedType,
        smartcardNumber: null,
        operator: null,
        label: cleanedLabel,
        serviceType: 'ELECTRICITY',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to persist electricity beneficiary record.');
    }

    return toDto(created);
  }

  /**
   * Saves a Cable TV smartcard/IUC beneficiary for a business.
   * Deduplicates by (businessId, smartcardNumber, operator) and enforces
   * a separate 5-item FIFO cap for cable subscribers.
   */
  public async saveCableBeneficiary(
    input: SaveCableBeneficiaryInput,
  ): Promise<BeneficiaryDto> {
    const normalizedSmartcard = normalizeSmartcardNumber(input.smartcardNumber);
    const normalizedOperator = normalizeCableOperator(input.operator);

    const cleanedLabel =
      typeof input.label === 'string' && input.label.trim().length > 0
        ? input.label.trim().slice(0, 60)
        : null;

    const [existing] = await db
      .select()
      .from(beneficiaries)
      .where(
        and(
          eq(beneficiaries.businessId, input.businessId),
          eq(beneficiaries.smartcardNumber, normalizedSmartcard),
          eq(beneficiaries.operator, normalizedOperator),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await db
        .update(beneficiaries)
        .set({
          label: cleanedLabel ?? existing.label ?? null,
          userId: input.userId ?? existing.userId ?? null,
          updatedAt: new Date(),
        })
        .where(eq(beneficiaries.id, existing.id))
        .returning();

      return toDto(updated ?? existing);
    }

    await this.evictOverflow(
      input.businessId,
      (row) => isCableBeneficiaryRow(row),
    );

    const now = new Date();
    const [created] = await db
      .insert(beneficiaries)
      .values({
        businessId: input.businessId,
        userId: input.userId ?? null,
        phoneNumber: null,
        network: null,
        meterNumber: null,
        disco: null,
        meterType: null,
        smartcardNumber: normalizedSmartcard,
        operator: normalizedOperator,
        label: cleanedLabel,
        serviceType: 'CABLE_TV',
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to persist cable beneficiary record.');
    }

    return toDto(created);
  }

  /**
   * Removes a saved beneficiary owned by the active business.
   */
  public async deleteBeneficiary(businessId: string, beneficiaryId: string): Promise<void> {
    if (!beneficiaryId || !beneficiaryId.trim()) {
      throw new ValidationError('Beneficiary ID is required.');
    }

    const deleted = await db
      .delete(beneficiaries)
      .where(
        and(
          eq(beneficiaries.id, beneficiaryId),
          eq(beneficiaries.businessId, businessId),
        ),
      )
      .returning();

    if (!deleted || deleted.length === 0) {
      throw new NotFoundError('Beneficiary');
    }
  }
}

export const beneficiaryService = new BeneficiaryService();
