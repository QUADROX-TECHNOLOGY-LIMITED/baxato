import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import {
  UserRole,
  KycStatus,
  ServiceType,
  type ApiResponse,
} from '@baxato/common';
import { generateToken } from '../../src/plugins/auth.plugin';
import { inMemoryDb } from '../test-utils/mock-db';
import {
  buildAnalyticsOverviewPayload,
  resolveAnalyticsRange,
  sanitizeOperatorLabel,
} from '../../src/routes/analytics';

vi.mock('@baxato/database', async () => {
  const { createMockDatabase } = await import('../test-utils/mock-db');
  const mockDbModule = createMockDatabase();
  const baseSelect = mockDbModule.db.select.bind(mockDbModule.db);

  const wrappedDb = {
    ...mockDbModule.db,
    select: (fields?: Record<string, unknown>) => {
      const hasAnalyticsProjection =
        fields &&
        ('successfulVolume' in fields ||
          'earnedVolume' in fields ||
          'bucket' in fields ||
          'operator' in fields ||
          'channel' in fields);

      if (!hasAnalyticsProjection) {
        return baseSelect(fields);
      }

      const makeChain = (rows: unknown[]) => {
        const chain: any = {
          from: () => chain,
          where: () => chain,
          groupBy: () => chain,
          having: () => chain,
          orderBy: () => chain,
          limit: () => chain,
          then: (resolve: (val: unknown) => void) => Promise.resolve(rows).then(resolve),
        };
        return chain;
      };

      if (fields && 'successfulDiscount' in fields && 'totalCount' in fields) {
        return makeChain([
          {
            totalCount: 3,
            successfulVolume: '250000',
            successfulCount: 2,
            failedCount: 1,
            pendingCount: 0,
            reversedCount: 0,
            successfulDiscount: '5000',
            successfulFee: '0',
          },
        ]);
      }
      if (fields && 'totalCount' in fields && 'successfulVolume' in fields) {
        return makeChain([{ totalCount: 1, successfulVolume: '100000', successfulCount: 1 }]);
      }
      if (fields && 'serviceType' in fields && 'successfulDiscount' in fields) {
        return makeChain([
          {
            serviceType: ServiceType.AIRTIME,
            count: 3,
            successfulCount: 2,
            failedCount: 1,
            successfulVolume: '250000',
            successfulDiscount: '5000',
          },
        ]);
      }
      if (fields && 'channel' in fields) {
        return makeChain([
          { channel: 'CONSOLE', count: 2, successfulCount: 1, successfulVolume: '150000' },
          { channel: 'API', count: 1, successfulCount: 1, successfulVolume: '100000' },
        ]);
      }
      if (fields && 'operator' in fields) {
        return makeChain([
          {
            operator: 'MTN',
            serviceType: ServiceType.AIRTIME,
            count: 2,
            successfulCount: 2,
            successfulVolume: '250000',
          },
        ]);
      }
      if (fields && 'bucket' in fields) {
        return makeChain([]);
      }
      if (fields && 'earnedVolume' in fields) {
        return makeChain([{ earnedVolume: '2500' }]);
      }

      return makeChain([]);
    },
  };

  return {
    ...mockDbModule,
    db: wrappedDb,
  };
});

describe('Analytics Domain & Endpoint (/analytics/overview)', () => {
  describe('sanitizeOperatorLabel', () => {
    it('strips upstream vendor identifiers and preserves genuine operators', () => {
      expect(sanitizeOperatorLabel('MONNIFY')).toBe('OTHER');
      expect(sanitizeOperatorLabel('VTPass_NG')).toBe('OTHER');
      expect(sanitizeOperatorLabel('Interswitch')).toBe('OTHER');
      expect(sanitizeOperatorLabel('MTN')).toBe('MTN');
      expect(sanitizeOperatorLabel('IKEDC')).toBe('IKEDC');
      expect(sanitizeOperatorLabel('')).toBe('OTHER');
    });
  });

  describe('resolveAnalyticsRange', () => {
    const fixedNow = new Date('2026-11-15T12:00:00.000Z');

    it('maps standard timeframes to expected bucket granularities', () => {
      expect(resolveAnalyticsRange({ timeframe: 'today' }, fixedNow).bucketFormat).toBe('hour');
      expect(resolveAnalyticsRange({ timeframe: '24h' }, fixedNow).bucketFormat).toBe('hour');
      expect(resolveAnalyticsRange({ timeframe: '7d' }, fixedNow).bucketFormat).toBe('day');
      expect(resolveAnalyticsRange({ timeframe: '30d' }, fixedNow).bucketFormat).toBe('day');
      expect(resolveAnalyticsRange({ timeframe: '90d' }, fixedNow).bucketFormat).toBe('week');
      expect(resolveAnalyticsRange({ timeframe: 'ytd' }, fixedNow).bucketFormat).toBe('month');
    });

    it('rejects partial or inverted custom date ranges', () => {
      expect(() =>
        resolveAnalyticsRange({ startDate: '2026-11-01' }, fixedNow),
      ).toThrow();
      expect(() =>
        resolveAnalyticsRange(
          { startDate: '2026-11-15', endDate: '2026-11-01' },
          fixedNow,
        ),
      ).toThrow();
      expect(() =>
        resolveAnalyticsRange(
          { startDate: 'not-a-date', endDate: '2026-11-10' },
          fixedNow,
        ),
      ).toThrow();
    });
  });

  describe('buildAnalyticsOverviewPayload', () => {
    it('strictly computes completed-only volume, discounts, shares, and non-integer BigInt averages without failure diagnostics or upstream leaks', () => {
      const fixedNow = new Date('2026-11-15T12:00:00.000Z');
      const payload = buildAnalyticsOverviewPayload({
        timeframe: '7d',
        startDate: new Date('2026-11-08T12:00:00.000Z'),
        endDate: fixedNow,
        bucketFormat: 'day',
        serviceFilter: null,
        channelFilter: null,
        now: fixedNow,
        currentSummary: {
          // Simulates 3 completed txns totaling 1000 kobo (₦10.00 -> 1000/3 = 333n avg kobo) + 2 failed
          totalCount: 5,
          successfulVolume: '1000',
          successfulCount: 3,
          failedCount: 2,
          pendingCount: 0,
          reversedCount: 0,
          successfulDiscount: '150',
          successfulFee: '0',
        },
        prevSummary: {
          totalCount: 2,
          successfulVolume: '500',
          successfulCount: 2,
        },
        serviceBreakdownRows: [
          {
            serviceType: ServiceType.AIRTIME,
            count: 5,
            successfulCount: 3,
            failedCount: 2,
            successfulVolume: '1000',
            successfulDiscount: '150',
          },
        ],
        channelBreakdownRows: [
          { channel: 'CONSOLE', count: 3, successfulCount: 2, successfulVolume: '600' },
          { channel: 'API', count: 2, successfulCount: 1, successfulVolume: '400' },
        ],
        operatorBreakdownRows: [
          {
            operator: 'MTN',
            serviceType: ServiceType.AIRTIME,
            count: 3,
            successfulCount: 2,
            successfulVolume: '700',
          },
          {
            operator: 'MONNIFY',
            serviceType: ServiceType.AIRTIME,
            count: 1,
            successfulCount: 1,
            successfulVolume: '300',
          },
        ],
        timelineRows: [
          {
            bucket: '2026-11-15',
            label: 'Nov 15',
            count: 2,
            successfulCount: 1,
            failedCount: 1,
            successfulVolume: '1000',
          },
        ],
      });

      // Completed-only volume & discount + safe BigInt division (1000 / 3 = 333 kobo = ₦3.33)
      expect(payload.summary.successfulVolumeNaira).toBe(10);
      expect(payload.summary.totalVolumeNaira).toBe(10);
      expect(payload.summary.totalDiscountNaira).toBe(1.5);
      expect(payload.summary.avgTicketNaira).toBe(3.33);
      expect(payload.summary.formattedAvgTicket).toBe('₦3.33');
      expect(payload.summary.volumeGrowthRate).toBe(100);
      expect(payload.summary.successRate).toBe(60);

      // White-label service naming & vendor removal
      expect(payload.serviceBreakdown[0]?.label).toBe('Airtime');
      expect(payload.topOperators.map((o) => o.operator)).toEqual(['MTN', 'Airtime']);
      expect(JSON.stringify(payload)).not.toContain('MONNIFY');
      expect(JSON.stringify(payload)).not.toContain('failureDiagnostics');
      expect(JSON.stringify(payload)).not.toContain('hourlyDensity');

      // Timeline points only plot completed spend
      const todayBucket = payload.timeline.find((t) => t.bucket === '2026-11-15');
      expect(todayBucket?.volumeNaira).toBe(10);
      expect(todayBucket?.successfulVolumeNaira).toBe(10);
      expect(todayBucket?.failedCount).toBe(1);
    });
  });

  describe('HTTP GET /analytics/overview', () => {
    let app: FastifyInstance;
    let ownerToken: string;
    const testBizId = 'biz_analytics_100';
    const ownerId = 'usr_analytics_owner_100';

    beforeAll(async () => {
      inMemoryDb.reset();

      inMemoryDb.users.push({
        id: ownerId,
        email: 'analytics_owner@baxato.com',
        firstName: 'Analytics',
        lastName: 'Owner',
        role: UserRole.BUSINESS_OWNER,
        status: 'ACTIVE',
        kycStatus: KycStatus.VERIFIED,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      inMemoryDb.businesses.push({
        id: testBizId,
        ownerId,
        name: 'Analytics Corp',
        slug: 'analytics-corp',
        country: 'NG',
        state: 'Lagos',
        lga: 'Ikeja',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      ownerToken = generateToken({
        id: ownerId,
        email: 'analytics_owner@baxato.com',
        role: UserRole.BUSINESS_OWNER,
        businessId: testBizId,
        kycStatus: KycStatus.VERIFIED,
      });

      const { buildServer } = await import('../../src/server');
      app = buildServer();
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await app.inject({ method: 'GET', url: '/analytics/overview' });
      expect(res.statusCode).toBe(401);
    });

    it('rejects invalid serviceType or channel filters with 400', async () => {
      const badService = await app.inject({
        method: 'GET',
        url: '/analytics/overview?serviceType=INVALID_SERVICE',
        headers: {
          authorization: `Bearer ${ownerToken}`,
          'x-business-id': testBizId,
        },
      });
      expect(badService.statusCode).toBe(400);

      const badChannel = await app.inject({
        method: 'GET',
        url: '/analytics/overview?channel=UNKNOWN',
        headers: {
          authorization: `Bearer ${ownerToken}`,
          'x-business-id': testBizId,
        },
      });
      expect(badChannel.statusCode).toBe(400);
    });

    it('returns white-labeled analytics summary without failureDiagnostics or hourlyDensity', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/analytics/overview?timeframe=7d&channel=WEB',
        headers: {
          authorization: `Bearer ${ownerToken}`,
          'x-business-id': testBizId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<ApiResponse<Record<string, any>>>();
      expect(body.success).toBe(true);
      expect(body.data?.summary?.successfulVolumeNaira).toBe(2500);
      expect(body.data?.summary?.totalVolumeNaira).toBe(2500);
      expect(body.data?.summary?.totalDiscountNaira).toBe(50);
      expect(body.data?.serviceBreakdown?.[0]?.label).toBe('Airtime');
      expect(body.data?.failureDiagnostics).toBeUndefined();
      expect(body.data?.hourlyDensity).toBeUndefined();
    });
  });
});
