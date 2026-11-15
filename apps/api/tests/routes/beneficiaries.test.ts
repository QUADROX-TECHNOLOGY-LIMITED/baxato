import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  TelecomNetwork,
  type ApiResponse,
} from '@baxato/common';
import { generateToken } from '../../src/plugins/auth.plugin';
import { inMemoryDb } from '../test-utils/mock-db';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  return createMockDatabase();
});

interface BeneficiaryItem {
  id: string;
  businessId: string;
  phoneNumber: string | null;
  network: TelecomNetwork | null;
  meterNumber: string | null;
  disco: string | null;
  meterType: 'PREPAID' | 'POSTPAID' | null;
  label: string | null;
  serviceType: 'AIRTIME' | 'DATA' | 'ELECTRICITY' | null;
  createdAt: string;
  updatedAt: string;
}

describe('Saved Beneficiaries Endpoints (/beneficiaries)', () => {
  let app: FastifyInstance;
  let ownerAToken: string;
  let ownerBToken: string;
  let supportToken: string;

  const bizAId = 'biz_ben_a';
  const bizBId = 'biz_ben_b';
  const ownerAId = 'usr_ben_owner_a';
  const ownerBId = 'usr_ben_owner_b';
  const supportId = 'usr_ben_support';

  beforeAll(async () => {
    ownerAToken = generateToken({
      id: ownerAId,
      email: 'ben_a@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: bizAId,
      kycStatus: KycStatus.VERIFIED,
    });

    ownerBToken = generateToken({
      id: ownerBId,
      email: 'ben_b@baxato.com',
      role: UserRole.BUSINESS_OWNER,
      businessId: bizBId,
      kycStatus: KycStatus.VERIFIED,
    });

    supportToken = generateToken({
      id: supportId,
      email: 'ben_support@baxato.com',
      role: UserRole.SUPPORT,
      businessId: bizAId,
      kycStatus: KycStatus.VERIFIED,
    });

    const { buildServer } = await import('../../src/server');
    app = await buildServer();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    inMemoryDb.reset();
    inMemoryDb.users.push(
      {
        id: ownerAId,
        email: 'ben_a@baxato.com',
        firstName: 'Ada',
        lastName: 'Obi',
        role: UserRole.BUSINESS_OWNER,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: ownerBId,
        email: 'ben_b@baxato.com',
        firstName: 'Bola',
        lastName: 'Ade',
        role: UserRole.BUSINESS_OWNER,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: supportId,
        email: 'ben_support@baxato.com',
        firstName: 'Support',
        lastName: 'Staff',
        role: UserRole.SUPPORT,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );
    inMemoryDb.businesses.push(
      {
        id: bizAId,
        ownerId: ownerAId,
        name: 'Business A',
        slug: 'business-a',
        country: 'NG',
        state: 'Lagos',
        lga: 'Ikeja',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: bizBId,
        ownerId: ownerBId,
        name: 'Business B',
        slug: 'business-b',
        country: 'NG',
        state: 'Abuja',
        lga: 'Wuse',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    );
    inMemoryDb.businessMembers.push({
      id: 'mem_ben_support_1',
      businessId: bizAId,
      userId: supportId,
      role: UserRole.SUPPORT,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it('normalizes phone number, infers network, and avoids duplicate entries', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/beneficiaries',
      headers: { authorization: `Bearer ${ownerAToken}` },
      payload: {
        phoneNumber: '+2348031234567',
        serviceType: 'AIRTIME',
        label: 'Primary Line',
      },
    });

    expect(first.statusCode).toBe(201);
    const firstJson = first.json<ApiResponse<BeneficiaryItem>>();
    expect(firstJson.success).toBe(true);
    expect(firstJson.data.phoneNumber).toBe('08031234567');
    expect(firstJson.data.network).toBe(TelecomNetwork.MTN);
    expect(firstJson.data.label).toBe('Primary Line');

    const second = await app.inject({
      method: 'POST',
      url: '/beneficiaries',
      headers: { authorization: `Bearer ${ownerAToken}` },
      payload: {
        phoneNumber: '0803 123 4567',
        label: 'Updated Line',
      },
    });

    expect(second.statusCode).toBe(201);

    const listRes = await app.inject({
      method: 'GET',
      url: '/beneficiaries',
      headers: { authorization: `Bearer ${ownerAToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const listJson = listRes.json<ApiResponse<BeneficiaryItem[]>>();
    expect(listJson.data).toHaveLength(1);
    expect(listJson.data[0].label).toBe('Updated Line');
  });

  it('caps saved beneficiaries at 5 per business and removes the oldest (FIFO) when saving a 6th', async () => {
    const phones = [
      '08030000001',
      '08030000002',
      '08030000003',
      '08030000004',
      '08030000005',
      '08030000006',
    ];

    for (let idx = 0; idx < phones.length; idx++) {
      // Ensure strictly increasing timestamps for deterministic FIFO check
      const res = await app.inject({
        method: 'POST',
        url: '/beneficiaries',
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: { phoneNumber: phones[idx], serviceType: 'DATA' },
      });
      expect(res.statusCode).toBe(201);
      const created = res.json<ApiResponse<BeneficiaryItem>>().data;
      const inMem = inMemoryDb.beneficiaries.find((b) => b.id === created.id);
      if (inMem) {
        const ts = new Date(Date.now() + idx * 1000);
        inMem.createdAt = ts;
        inMem.updatedAt = ts;
      }
    }

    const listRes = await app.inject({
      method: 'GET',
      url: '/beneficiaries',
      headers: { authorization: `Bearer ${ownerAToken}` },
    });

    expect(listRes.statusCode).toBe(200);
    const items = listRes.json<ApiResponse<BeneficiaryItem[]>>().data;
    expect(items).toHaveLength(5);
    const savedPhones = items.map((i) => i.phoneNumber);
    expect(savedPhones).not.toContain('08030000001');
    expect(savedPhones).toEqual([
      '08030000006',
      '08030000005',
      '08030000004',
      '08030000003',
      '08030000002',
    ]);
  });

  it('enforces tenant ownership on DELETE /beneficiaries/:id and RBAC permissions', async () => {
    const createB = await app.inject({
      method: 'POST',
      url: '/beneficiaries',
      headers: { authorization: `Bearer ${ownerBToken}` },
      payload: { phoneNumber: '08021234567' },
    });
    const benBId = createB.json<ApiResponse<BeneficiaryItem>>().data.id;

    // Cross-tenant delete by bizA must return 404
    const crossDelete = await app.inject({
      method: 'DELETE',
      url: `/beneficiaries/${benBId}`,
      headers: { authorization: `Bearer ${ownerAToken}` },
    });
    expect(crossDelete.statusCode).toBe(404);

    // Support role lacking TENANT_SERVICES_EXECUTE is denied
    const rbacDenied = await app.inject({
      method: 'GET',
      url: '/beneficiaries',
      headers: { authorization: `Bearer ${supportToken}` },
    });
    expect(rbacDenied.statusCode).toBe(403);

    // Owner B deletes their own beneficiary cleanly
    const ownDelete = await app.inject({
      method: 'DELETE',
      url: `/beneficiaries/${benBId}`,
      headers: { authorization: `Bearer ${ownerBToken}` },
    });
    expect(ownDelete.statusCode).toBe(200);
  });

  it('saves, filters, deduplicates, and FIFO-caps electricity meter beneficiaries separately from phone numbers', async () => {
    // Save a phone beneficiary first — must stay isolated from ELECTRICITY
    await app.inject({
      method: 'POST',
      url: '/beneficiaries',
      headers: { authorization: `Bearer ${ownerAToken}` },
      payload: { phoneNumber: '08031234567', serviceType: 'AIRTIME', label: 'Office Phone' },
    });

    const firstMeter = await app.inject({
      method: 'POST',
      url: '/beneficiaries',
      headers: { authorization: `Bearer ${ownerAToken}` },
      payload: {
        serviceType: 'ELECTRICITY',
        meterNumber: '0412 345 6789',
        disco: 'ikedc',
        meterType: 'prepaid',
        label: 'Amina Bello',
      },
    });
    expect(firstMeter.statusCode).toBe(201);
    const firstJson = firstMeter.json<ApiResponse<BeneficiaryItem>>();
    expect(firstJson.data.meterNumber).toBe('04123456789');
    expect(firstJson.data.disco).toBe('IKEDC');
    expect(firstJson.data.meterType).toBe('PREPAID');
    expect(firstJson.data.phoneNumber).toBeNull();

    // Upsert same (meterNumber, disco, meterType) updates label without creating duplicate
    const updatedMeter = await app.inject({
      method: 'POST',
      url: '/beneficiaries',
      headers: { authorization: `Bearer ${ownerAToken}` },
      payload: {
        serviceType: 'ELECTRICITY',
        meterNumber: '04123456789',
        disco: 'IKEDC',
        meterType: 'PREPAID',
        label: 'Amina Bello HQ',
      },
    });
    expect(updatedMeter.statusCode).toBe(201);

    const metersRes = await app.inject({
      method: 'GET',
      url: '/beneficiaries?serviceType=ELECTRICITY',
      headers: { authorization: `Bearer ${ownerAToken}` },
    });
    expect(metersRes.statusCode).toBe(200);
    const meters = metersRes.json<ApiResponse<BeneficiaryItem[]>>().data;
    expect(meters).toHaveLength(1);
    expect(meters[0].label).toBe('Amina Bello HQ');

    // Default phone list excludes ELECTRICITY rows
    const phonesRes = await app.inject({
      method: 'GET',
      url: '/beneficiaries',
      headers: { authorization: `Bearer ${ownerAToken}` },
    });
    const phones = phonesRes.json<ApiResponse<BeneficiaryItem[]>>().data;
    expect(phones).toHaveLength(1);
    expect(phones[0].phoneNumber).toBe('08031234567');

    // Saving 5 more distinct meters caps electricity list at 5 and keeps phone beneficiary untouched
    const extraMeters = [
      '45100000001',
      '45100000002',
      '45100000003',
      '45100000004',
      '45100000005',
    ];
    for (let idx = 0; idx < extraMeters.length; idx++) {
      const res = await app.inject({
        method: 'POST',
        url: '/beneficiaries',
        headers: { authorization: `Bearer ${ownerAToken}` },
        payload: {
          serviceType: 'ELECTRICITY',
          meterNumber: extraMeters[idx],
          disco: 'EKEDC',
          meterType: 'PREPAID',
          label: `Meter ${idx + 1}`,
        },
      });
      expect(res.statusCode).toBe(201);
      const id = res.json<ApiResponse<BeneficiaryItem>>().data.id;
      const inMem = inMemoryDb.beneficiaries.find((b) => b.id === id);
      if (inMem) {
        const ts = new Date(Date.now() + (idx + 1) * 1000);
        inMem.createdAt = ts;
        inMem.updatedAt = ts;
      }
    }

    const cappedMetersRes = await app.inject({
      method: 'GET',
      url: '/beneficiaries?serviceType=ELECTRICITY',
      headers: { authorization: `Bearer ${ownerAToken}` },
    });
    const cappedMeters = cappedMetersRes.json<ApiResponse<BeneficiaryItem[]>>().data;
    expect(cappedMeters).toHaveLength(5);
    expect(cappedMeters.map((m) => m.meterNumber)).not.toContain('04123456789');

    // Phone beneficiary must still exist unaffected by electricity eviction
    const phonesAfterRes = await app.inject({
      method: 'GET',
      url: '/beneficiaries',
      headers: { authorization: `Bearer ${ownerAToken}` },
    });
    expect(phonesAfterRes.json<ApiResponse<BeneficiaryItem[]>>().data).toHaveLength(1);
  });
});
