import { TelecomNetwork, ValidationError, NotFoundError } from '@baxato/common';
import { db, beneficiaries, eq, and, asc, desc, inArray } from '@baxato/database';
import { normalizeNigerianPhone, detectTelcoNetwork } from './telco.utils.js';

export const MAX_BENEFICIARIES_PER_BUSINESS = 5;

export interface BeneficiaryDto {
  id: string;
  businessId: string;
  phoneNumber: string;
  network: TelecomNetwork | null;
  label: string | null;
  serviceType: 'AIRTIME' | 'DATA' | null;
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

function toDto(row: {
  id: string;
  businessId: string;
  phoneNumber: string;
  network: string | null;
  label: string | null;
  serviceType: string | null;
  createdAt: Date;
  updatedAt: Date;
}): BeneficiaryDto {
  return {
    id: row.id,
    businessId: row.businessId,
    phoneNumber: row.phoneNumber,
    network: (row.network as TelecomNetwork) || null,
    label: row.label ?? null,
    serviceType: (row.serviceType as 'AIRTIME' | 'DATA') || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

class BeneficiaryService {
  /**
   * Lists saved phone beneficiaries for a business (newest used first, max 5).
   */
  public async listBeneficiaries(businessId: string): Promise<BeneficiaryDto[]> {
    const rows = await db
      .select()
      .from(beneficiaries)
      .where(eq(beneficiaries.businessId, businessId))
      .orderBy(desc(beneficiaries.updatedAt), desc(beneficiaries.createdAt))
      .limit(MAX_BENEFICIARIES_PER_BUSINESS);

    return rows.map((row) => toDto({
      ...row,
      network: row.network ?? null,
      label: row.label ?? null,
      serviceType: row.serviceType ?? null,
    }));
  }

  /**
   * Saves a phone beneficiary for a business.
   * Deduplicates by normalized 11-digit number and enforces a strict 5-item FIFO cap
   * (saving a 6th distinct phone evicts the oldest created beneficiary).
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

      const row = updated ?? existing;
      return toDto({
        ...row,
        network: row.network ?? null,
        label: row.label ?? null,
        serviceType: row.serviceType ?? null,
      });
    }

    // 2. Enforce FIFO max 5 cap by evicting the oldest created beneficiary(ies)
    const currentRows = await db
      .select()
      .from(beneficiaries)
      .where(eq(beneficiaries.businessId, input.businessId))
      .orderBy(asc(beneficiaries.createdAt), asc(beneficiaries.updatedAt));

    if (currentRows.length >= MAX_BENEFICIARIES_PER_BUSINESS) {
      const overflowCount = currentRows.length - MAX_BENEFICIARIES_PER_BUSINESS + 1;
      const idsToEvict = currentRows.slice(0, overflowCount).map((r) => r.id);
      if (idsToEvict.length > 0) {
        await db
          .delete(beneficiaries)
          .where(
            and(
              eq(beneficiaries.businessId, input.businessId),
              inArray(beneficiaries.id, idsToEvict),
            ),
          );
      }
    }

    const now = new Date();
    const [created] = await db
      .insert(beneficiaries)
      .values({
        businessId: input.businessId,
        userId: input.userId ?? null,
        phoneNumber: normalizedPhone,
        network: resolvedNetwork,
        label: cleanedLabel,
        serviceType: input.serviceType ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!created) {
      throw new Error('Failed to persist beneficiary record.');
    }

    return toDto({
      ...created,
      network: created.network ?? null,
      label: created.label ?? null,
      serviceType: created.serviceType ?? null,
    });
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
