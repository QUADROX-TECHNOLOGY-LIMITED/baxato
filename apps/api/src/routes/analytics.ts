import type { FastifyPluginAsync } from 'fastify';
import {
  createSuccessResponse,
  ValidationError,
  Permission,
  koboToNaira,
  formatNairaFromKobo,
  ServiceType,
  TransactionStatus,
} from '@baxato/common';
import {
  db,
  serviceTransactions,
  financialLedger,
  eq,
  and,
  sql,
  gte,
  lte,
  like,
  or,
} from '@baxato/database';
import { requireTenantPermission } from '../plugins/rbac.plugin.js';

const LAGOS_OFFSET_MS = 3600_000; // Africa/Lagos is UTC+1 year-round (no DST)

const VALID_SERVICE_TYPES = new Set<string>(Object.values(ServiceType));

const SERVICE_DISPLAY_LABELS: Record<string, string> = {
  AIRTIME: 'Airtime',
  DATA: 'Data Bundles',
  ELECTRICITY: 'Electricity',
  CABLE_TV: 'Cable TV',
  EXAM_PIN: 'Exam PINs',
};

const BLOCKED_VENDOR_NAMES = [
  'INTERSWITCH',
  'MONNIFY',
  'VTPASS',
  'SHAGALO',
  'CLUBKONNECT',
  'PAYSTACK',
  'FLUTTERWAVE',
  'ZEPTOMAIL',
  'RESEND',
  'TWILIO',
  'TERMII',
];

export type AnalyticsTimeframe = 'today' | '24h' | '7d' | '30d' | '90d' | 'ytd';
export type BucketFormat = 'hour' | 'day' | 'week' | 'month';

export interface AnalyticsPeriodRange {
  timeframe: string;
  startDate: Date;
  endDate: Date;
  prevStartDate: Date;
  prevEndDate: Date;
  bucketFormat: BucketFormat;
}

/**
 * Resolves exact current/previous date boundaries and timeline bucket granularity.
 */
export function resolveAnalyticsRange(
  query: { timeframe?: string; startDate?: string; endDate?: string },
  now: Date = new Date(),
): AnalyticsPeriodRange {
  const timeframe = (query.timeframe || '30d').toLowerCase();

  if (query.startDate || query.endDate) {
    if (!query.startDate || !query.endDate) {
      throw new ValidationError('Both startDate and endDate are required for custom date ranges');
    }
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate > endDate
    ) {
      throw new ValidationError('Invalid analytics date range');
    }
    const spanMs = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - spanMs);
    const prevEndDate = new Date(startDate.getTime());
    const bucketFormat: BucketFormat =
      spanMs <= 86400000 * 2 ? 'hour' : spanMs <= 86400000 * 60 ? 'day' : 'week';

    return { timeframe, startDate, endDate, prevStartDate, prevEndDate, bucketFormat };
  }

  switch (timeframe) {
    case 'today':
    case '24h': {
      return {
        timeframe,
        startDate: new Date(now.getTime() - 24 * 3600 * 1000),
        endDate: now,
        prevStartDate: new Date(now.getTime() - 48 * 3600 * 1000),
        prevEndDate: new Date(now.getTime() - 24 * 3600 * 1000),
        bucketFormat: 'hour',
      };
    }
    case '7d': {
      return {
        timeframe,
        startDate: new Date(now.getTime() - 7 * 86400000),
        endDate: now,
        prevStartDate: new Date(now.getTime() - 14 * 86400000),
        prevEndDate: new Date(now.getTime() - 7 * 86400000),
        bucketFormat: 'day',
      };
    }
    case '90d': {
      return {
        timeframe,
        startDate: new Date(now.getTime() - 90 * 86400000),
        endDate: now,
        prevStartDate: new Date(now.getTime() - 180 * 86400000),
        prevEndDate: new Date(now.getTime() - 90 * 86400000),
        bucketFormat: 'week',
      };
    }
    case 'ytd': {
      const lagosNow = new Date(now.getTime() + LAGOS_OFFSET_MS);
      const year = lagosNow.getUTCFullYear();
      const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0) - LAGOS_OFFSET_MS);
      const prevStartDate = new Date(Date.UTC(year - 1, 0, 1, 0, 0, 0, 0) - LAGOS_OFFSET_MS);
      const prevEndDate = new Date(
        Date.UTC(
          year - 1,
          lagosNow.getUTCMonth(),
          lagosNow.getUTCDate(),
          lagosNow.getUTCHours(),
          lagosNow.getUTCMinutes(),
        ) - LAGOS_OFFSET_MS,
      );
      return {
        timeframe,
        startDate,
        endDate: now,
        prevStartDate,
        prevEndDate,
        bucketFormat: 'month',
      };
    }
    case '30d':
    default: {
      return {
        timeframe: timeframe === '30d' ? '30d' : '30d',
        startDate: new Date(now.getTime() - 30 * 86400000),
        endDate: now,
        prevStartDate: new Date(now.getTime() - 60 * 86400000),
        prevEndDate: new Date(now.getTime() - 30 * 86400000),
        bucketFormat: 'day',
      };
    }
  }
}

/**
 * Strips any internal upstream vendor identifier from customer-facing operator labels.
 */
export function sanitizeOperatorLabel(rawOperator: string | null | undefined): string {
  const cleaned = (rawOperator || '').trim();
  if (!cleaned) return 'OTHER';
  const upper = cleaned.toUpperCase();
  if (BLOCKED_VENDOR_NAMES.some((vendor) => upper.includes(vendor))) {
    return 'OTHER';
  }
  return cleaned;
}

/**
 * Formats timeline slots in Africa/Lagos (UTC+1) wall-clock time independent of server timezone.
 */
function getLagosWallParts(date: Date) {
  const d = new Date(date.getTime() + LAGOS_OFFSET_MS);
  return {
    yyyy: d.getUTCFullYear(),
    mm: String(d.getUTCMonth() + 1).padStart(2, '0'),
    dd: String(d.getUTCDate()).padStart(2, '0'),
    hh: String(d.getUTCHours()).padStart(2, '0'),
    monthShort: d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
  };
}

function calcGrowthPercent(current: number, previous: number): number {
  if (previous > 0) {
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }
  return current > 0 ? 100 : 0;
}

export interface AnalyticsAggregateInput {
  timeframe: string;
  startDate: Date;
  endDate: Date;
  bucketFormat: BucketFormat;
  serviceFilter: string | null;
  channelFilter: string | null;
  now?: Date;
  currentSummary?: {
    totalCount: number;
    successfulVolume: string;
    successfulCount: number;
    failedCount: number;
    pendingCount: number;
    reversedCount: number;
    successfulDiscount: string;
    successfulFee: string;
  };
  prevSummary?: {
    totalCount: number;
    successfulVolume: string;
    successfulCount: number;
  };
  serviceBreakdownRows: Array<{
    serviceType: string;
    count: number;
    successfulCount: number;
    failedCount: number;
    successfulVolume: string;
    successfulDiscount: string;
  }>;
  channelBreakdownRows: Array<{
    channel: string;
    count: number;
    successfulCount: number;
    successfulVolume: string;
  }>;
  operatorBreakdownRows: Array<{
    operator: string;
    serviceType: string;
    count: number;
    successfulCount: number;
    successfulVolume: string;
  }>;
  timelineRows: Array<{
    bucket: string;
    label: string;
    count: number;
    successfulCount: number;
    failedCount: number;
    successfulVolume: string;
  }>;
  commissionEarnedKobo: string;
}

/**
 * Builds white-labeled merchant analytics metrics strictly excluding failed/unsettled volume & discounts.
 */
export function buildAnalyticsOverviewPayload(input: AnalyticsAggregateInput) {
  const now = input.now || new Date();
  const cur = input.currentSummary;
  const prev = input.prevSummary;

  const curTotalCount = cur?.totalCount || 0;
  const curSuccCount = cur?.successfulCount || 0;
  const curFailedCount = cur?.failedCount || 0;
  const curPendingCount = cur?.pendingCount || 0;
  const curReversedCount = cur?.reversedCount || 0;

  const curSuccVolumeKobo = BigInt(cur?.successfulVolume || '0');
  const curDiscountKobo = BigInt(cur?.successfulDiscount || '0');
  const curFeeKobo = BigInt(cur?.successfulFee || '0');
  const commEarnedKobo = BigInt(input.commissionEarnedKobo || '0');

  const prevTotalCount = prev?.totalCount || 0;
  const prevSuccCount = prev?.successfulCount || 0;
  const prevSuccVolumeKobo = BigInt(prev?.successfulVolume || '0');

  const successRate = curTotalCount > 0 ? Number(((curSuccCount / curTotalCount) * 100).toFixed(1)) : 100;
  const prevSuccessRate = prevTotalCount > 0 ? Number(((prevSuccCount / prevTotalCount) * 100).toFixed(1)) : 100;
  const successRateDelta = Number((successRate - prevSuccessRate).toFixed(1));

  const curSuccVolumeNaira = koboToNaira(curSuccVolumeKobo);
  const prevSuccVolumeNaira = koboToNaira(prevSuccVolumeKobo);

  const volumeGrowthRate = calcGrowthPercent(curSuccVolumeNaira, prevSuccVolumeNaira);
  const countGrowthRate = calcGrowthPercent(curSuccCount, prevSuccCount);

  const avgKobo = curSuccCount > 0 ? curSuccVolumeKobo / BigInt(curSuccCount) : 0n;
  const avgTicketNaira = koboToNaira(avgKobo);

  // Build continuous zero-filled timeline strictly plotting settled successful volume
  const timelineMap = new Map<string, (typeof input.timelineRows)[0]>();
  for (const row of input.timelineRows) {
    timelineMap.set(row.bucket, row);
  }

  const timeline: Array<{
    bucket: string;
    label: string;
    volumeNaira: number;
    successfulVolumeNaira: number;
    count: number;
    successfulCount: number;
    failedCount: number;
    successRate: number;
  }> = [];

  if (input.bucketFormat === 'hour') {
    for (let i = 23; i >= 0; i--) {
      const { yyyy, mm, dd, hh } = getLagosWallParts(new Date(now.getTime() - i * 3600_000));
      const key = `${yyyy}-${mm}-${dd}T${hh}:00:00`;
      const match =
        timelineMap.get(key) ||
        input.timelineRows.find((r) => r.bucket.startsWith(`${yyyy}-${mm}-${dd}T${hh}`));

      const succVolKobo = match ? BigInt(match.successfulVolume) : 0n;
      const succVolNaira = koboToNaira(succVolKobo);
      const cnt = match ? match.count : 0;
      const succCnt = match ? match.successfulCount : 0;

      timeline.push({
        bucket: key,
        label: `${hh}:00`,
        volumeNaira: succVolNaira,
        successfulVolumeNaira: succVolNaira,
        count: cnt,
        successfulCount: succCnt,
        failedCount: match ? match.failedCount : 0,
        successRate: cnt > 0 ? Number(((succCnt / cnt) * 100).toFixed(1)) : 100,
      });
    }
  } else if (input.bucketFormat === 'day') {
    const dayCount = input.timeframe === '7d' ? 7 : 30;
    for (let i = dayCount - 1; i >= 0; i--) {
      const { yyyy, mm, dd, monthShort } = getLagosWallParts(new Date(now.getTime() - i * 86400000));
      const key = `${yyyy}-${mm}-${dd}`;
      const match = timelineMap.get(key);
      const succVolKobo = match ? BigInt(match.successfulVolume) : 0n;
      const succVolNaira = koboToNaira(succVolKobo);
      const cnt = match ? match.count : 0;
      const succCnt = match ? match.successfulCount : 0;

      timeline.push({
        bucket: key,
        label: `${monthShort} ${dd}`,
        volumeNaira: succVolNaira,
        successfulVolumeNaira: succVolNaira,
        count: cnt,
        successfulCount: succCnt,
        failedCount: match ? match.failedCount : 0,
        successRate: cnt > 0 ? Number(((succCnt / cnt) * 100).toFixed(1)) : 100,
      });
    }
  } else {
    for (const row of input.timelineRows) {
      const succVolKobo = BigInt(row.successfulVolume);
      const succVolNaira = koboToNaira(succVolKobo);
      timeline.push({
        bucket: row.bucket,
        label: row.label,
        volumeNaira: succVolNaira,
        successfulVolumeNaira: succVolNaira,
        count: row.count,
        successfulCount: row.successfulCount,
        failedCount: row.failedCount,
        successRate:
          row.count > 0 ? Number(((row.successfulCount / row.count) * 100).toFixed(1)) : 100,
      });
    }
  }

  // Service Breakdown (strictly completed transaction volume & discounts)
  const totalVolNairaDenominator = curSuccVolumeNaira > 0 ? curSuccVolumeNaira : 0;
  const serviceBreakdown = input.serviceBreakdownRows.map((s) => {
    const vKobo = BigInt(s.successfulVolume);
    const vNaira = koboToNaira(vKobo);
    const dKobo = BigInt(s.successfulDiscount);
    const discNaira = koboToNaira(dKobo);
    const rate = s.count > 0 ? Number(((s.successfulCount / s.count) * 100).toFixed(1)) : 100;
    const svcAvgKobo = s.successfulCount > 0 ? vKobo / BigInt(s.successfulCount) : 0n;

    return {
      serviceType: s.serviceType,
      label: SERVICE_DISPLAY_LABELS[s.serviceType] || s.serviceType,
      count: s.count,
      successfulCount: s.successfulCount,
      failedCount: s.failedCount,
      volumeKobo: s.successfulVolume,
      volumeNaira: vNaira,
      formattedVolume: formatNairaFromKobo(vKobo),
      volumeShare:
        totalVolNairaDenominator > 0
          ? Number(((vNaira / totalVolNairaDenominator) * 100).toFixed(1))
          : 0,
      successRate: rate,
      avgTicketNaira: koboToNaira(svcAvgKobo),
      formattedAvgTicket: formatNairaFromKobo(svcAvgKobo),
      discountNaira: discNaira,
      formattedDiscount: formatNairaFromKobo(dKobo),
    };
  });

  // Channel Breakdown (API vs Dashboard) — strictly successful volume
  const apiRow = input.channelBreakdownRows.find((r) => r.channel === 'API');
  const consoleRow = input.channelBreakdownRows.find((r) => r.channel === 'CONSOLE');

  const apiVolKobo = BigInt(apiRow?.successfulVolume || '0');
  const apiVolNaira = koboToNaira(apiVolKobo);
  const apiCount = apiRow?.count || 0;
  const apiSuccCount = apiRow?.successfulCount || 0;

  const conVolKobo = BigInt(consoleRow?.successfulVolume || '0');
  const conVolNaira = koboToNaira(conVolKobo);
  const conCount = consoleRow?.count || 0;
  const conSuccCount = consoleRow?.successfulCount || 0;

  const totalChanVolNaira = apiVolNaira + conVolNaira;

  const channelBreakdown = {
    api: {
      count: apiCount,
      successfulCount: apiSuccCount,
      volumeNaira: apiVolNaira,
      formattedVolume: formatNairaFromKobo(apiVolKobo),
      volumeShare:
        totalChanVolNaira > 0 ? Number(((apiVolNaira / totalChanVolNaira) * 100).toFixed(1)) : 0,
      successRate: apiCount > 0 ? Number(((apiSuccCount / apiCount) * 100).toFixed(1)) : 100,
    },
    console: {
      count: conCount,
      successfulCount: conSuccCount,
      volumeNaira: conVolNaira,
      formattedVolume: formatNairaFromKobo(conVolKobo),
      volumeShare:
        totalChanVolNaira > 0 ? Number(((conVolNaira / totalChanVolNaira) * 100).toFixed(1)) : 0,
      successRate: conCount > 0 ? Number(((conSuccCount / conCount) * 100).toFixed(1)) : 100,
    },
  };

  // Top Operators (strictly white-labeled & successful spend)
  const topOperators = input.operatorBreakdownRows.map((op) => {
    const vKobo = BigInt(op.successfulVolume);
    const vNaira = koboToNaira(vKobo);
    const sanitized = sanitizeOperatorLabel(op.operator);
    return {
      operator: sanitized === 'OTHER' ? SERVICE_DISPLAY_LABELS[op.serviceType] || 'Other' : sanitized,
      serviceType: op.serviceType,
      serviceLabel: SERVICE_DISPLAY_LABELS[op.serviceType] || op.serviceType,
      count: op.count,
      successfulCount: op.successfulCount,
      volumeNaira: vNaira,
      formattedVolume: formatNairaFromKobo(vKobo),
      volumeShare:
        totalVolNairaDenominator > 0
          ? Number(((vNaira / totalVolNairaDenominator) * 100).toFixed(1))
          : 0,
      successRate: op.count > 0 ? Number(((op.successfulCount / op.count) * 100).toFixed(1)) : 100,
    };
  });

  const formattedSuccVol = formatNairaFromKobo(curSuccVolumeKobo);

  return {
    timeframe: input.timeframe,
    startDate: input.startDate.toISOString(),
    endDate: input.endDate.toISOString(),
    serviceFilter: input.serviceFilter || 'ALL',
    channelFilter: input.channelFilter || 'ALL',
    summary: {
      totalVolumeKobo: curSuccVolumeKobo.toString(),
      totalVolumeNaira: curSuccVolumeNaira,
      formattedTotalVolume: formattedSuccVol,
      successfulVolumeKobo: curSuccVolumeKobo.toString(),
      successfulVolumeNaira: curSuccVolumeNaira,
      formattedSuccessfulVolume: formattedSuccVol,
      totalCount: curTotalCount,
      successfulCount: curSuccCount,
      failedCount: curFailedCount,
      pendingCount: curPendingCount,
      reversedCount: curReversedCount,
      successRate,
      avgTicketNaira,
      formattedAvgTicket: formatNairaFromKobo(avgKobo),
      totalDiscountKobo: curDiscountKobo.toString(),
      totalDiscountNaira: koboToNaira(curDiscountKobo),
      formattedTotalDiscount: formatNairaFromKobo(curDiscountKobo),
      totalFeeKobo: curFeeKobo.toString(),
      totalFeeNaira: koboToNaira(curFeeKobo),
      formattedTotalFee: formatNairaFromKobo(curFeeKobo),
      commissionEarnedKobo: commEarnedKobo.toString(),
      commissionEarnedNaira: koboToNaira(commEarnedKobo),
      formattedCommissionEarned: formatNairaFromKobo(commEarnedKobo),
      volumeGrowthRate,
      countGrowthRate,
      successRateDelta,
    },
    timeline,
    serviceBreakdown,
    channelBreakdown,
    topOperators,
  };
}

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /analytics/overview
   * White-labeled merchant analytics computed from completed transactions in PostgreSQL.
   */
  fastify.get(
    '/overview',
    { preHandler: [requireTenantPermission(Permission.TENANT_TRANSACTIONS_READ)] },
    async (request, reply) => {
      const businessId = request.businessId;
      if (!businessId) {
        throw new ValidationError('Active business context required');
      }

      const query = request.query as {
        timeframe?: string;
        serviceType?: string;
        channel?: string;
        startDate?: string;
        endDate?: string;
      };

      const rawService = query.serviceType?.trim().toUpperCase();
      if (rawService && rawService !== 'ALL' && !VALID_SERVICE_TYPES.has(rawService)) {
        throw new ValidationError('Invalid serviceType filter');
      }
      const serviceFilter = rawService && rawService !== 'ALL' ? rawService : null;

      const rawChannel = query.channel?.trim().toUpperCase();
      let channelFilter: string | null = null;
      if (rawChannel && rawChannel !== 'ALL') {
        if (rawChannel === 'API') {
          channelFilter = 'API';
        } else if (rawChannel === 'WEB' || rawChannel === 'CONSOLE' || rawChannel === 'DASHBOARD') {
          channelFilter = 'CONSOLE';
        } else {
          throw new ValidationError('Invalid channel filter');
        }
      }

      const now = new Date();
      const { timeframe, startDate, endDate, prevStartDate, prevEndDate, bucketFormat } =
        resolveAnalyticsRange(query, now);

      const buildConditions = (rangeStart: Date, rangeEnd: Date, applyChannelFilter: boolean) => {
        const conds = [
          eq(serviceTransactions.businessId, businessId),
          gte(serviceTransactions.createdAt, rangeStart),
          lte(serviceTransactions.createdAt, rangeEnd),
        ];

        if (serviceFilter) {
          conds.push(eq(serviceTransactions.serviceType, serviceFilter as ServiceType));
        }

        if (applyChannelFilter && channelFilter === 'API') {
          conds.push(
            or(
              sql`(${serviceTransactions.metadata}->>'channel') = 'API'`,
              like(serviceTransactions.userId, 'key_%'),
            )!,
          );
        } else if (applyChannelFilter && channelFilter === 'CONSOLE') {
          conds.push(
            and(
              sql`(${serviceTransactions.metadata}->>'channel' IS NULL OR (${serviceTransactions.metadata}->>'channel') != 'API')`,
              sql`(${serviceTransactions.userId} IS NULL OR ${serviceTransactions.userId} NOT LIKE 'key_%')`,
            )!,
          );
        }

        return and(...conds);
      };

      const currentPeriodWhere = buildConditions(startDate, endDate, true);
      const prevPeriodWhere = buildConditions(prevStartDate, prevEndDate, true);
      const periodServiceWhere = buildConditions(startDate, endDate, false);

      const lagosTs = sql`(${serviceTransactions.createdAt} AT TIME ZONE 'Africa/Lagos')`;
      const bucketSpec = {
        hour: {
          trunc: sql`date_trunc('hour', ${lagosTs})`,
          bucketExpr: sql<string>`to_char(date_trunc('hour', ${lagosTs}), 'YYYY-MM-DD"T"HH24:00:00')`,
          labelExpr: sql<string>`to_char(date_trunc('hour', ${lagosTs}), 'HH24:00')`,
        },
        day: {
          trunc: sql`date_trunc('day', ${lagosTs})`,
          bucketExpr: sql<string>`to_char(date_trunc('day', ${lagosTs}), 'YYYY-MM-DD')`,
          labelExpr: sql<string>`to_char(date_trunc('day', ${lagosTs}), 'Mon DD')`,
        },
        week: {
          trunc: sql`date_trunc('week', ${lagosTs})`,
          bucketExpr: sql<string>`to_char(date_trunc('week', ${lagosTs}), 'YYYY-"W"IW')`,
          labelExpr: sql<string>`'Week ' || to_char(date_trunc('week', ${lagosTs}), 'IW')`,
        },
        month: {
          trunc: sql`date_trunc('month', ${lagosTs})`,
          bucketExpr: sql<string>`to_char(date_trunc('month', ${lagosTs}), 'YYYY-MM')`,
          labelExpr: sql<string>`to_char(date_trunc('month', ${lagosTs}), 'Mon YYYY')`,
        },
      }[bucketFormat];

      const operatorExpr = sql<string>`coalesce(
        nullif(trim(${serviceTransactions.metadata}->>'network'), ''),
        nullif(trim(${serviceTransactions.metadata}->>'disco'), ''),
        nullif(trim(${serviceTransactions.metadata}->>'cableProvider'), ''),
        nullif(trim(${serviceTransactions.metadata}->>'operatorName'), ''),
        nullif(trim(${serviceTransactions.metadata}->>'examBody'), ''),
        'OTHER'
      )`;

      const [
        [currentSummary],
        [prevSummary],
        serviceBreakdownRows,
        channelBreakdownRows,
        operatorBreakdownRows,
        timelineRows,
        [commissionEarnedRow],
      ] = await Promise.all([
        db
          .select({
            totalCount: sql<number>`count(*)::int`,
            successfulVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}), 0)::text`,
            successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL})::int`,
            failedCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.FAILED})::int`,
            pendingCount: sql<number>`count(*) filter (where ${serviceTransactions.status} in ('PENDING', 'PROCESSING'))::int`,
            reversedCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.REVERSED})::int`,
            successfulDiscount: sql<string>`coalesce(sum(${serviceTransactions.discount}) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}), 0)::text`,
            successfulFee: sql<string>`coalesce(sum(${serviceTransactions.fee}) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}), 0)::text`,
          })
          .from(serviceTransactions)
          .where(currentPeriodWhere),

        db
          .select({
            totalCount: sql<number>`count(*)::int`,
            successfulVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}), 0)::text`,
            successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL})::int`,
          })
          .from(serviceTransactions)
          .where(prevPeriodWhere),

        db
          .select({
            serviceType: serviceTransactions.serviceType,
            count: sql<number>`count(*)::int`,
            successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL})::int`,
            failedCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.FAILED})::int`,
            successfulVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}), 0)::text`,
            successfulDiscount: sql<string>`coalesce(sum(${serviceTransactions.discount}) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}), 0)::text`,
          })
          .from(serviceTransactions)
          .where(currentPeriodWhere)
          .groupBy(serviceTransactions.serviceType)
          .having(sql`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}) > 0`)
          .orderBy(
            sql`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}), 0) DESC`,
            sql`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}) DESC`,
          ),

        db
          .select({
            channel: sql<string>`CASE WHEN (${serviceTransactions.metadata}->>'channel') = 'API' OR ${serviceTransactions.userId} LIKE 'key_%' THEN 'API' ELSE 'CONSOLE' END`,
            count: sql<number>`count(*)::int`,
            successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL})::int`,
            successfulVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}), 0)::text`,
          })
          .from(serviceTransactions)
          .where(periodServiceWhere)
          .groupBy(sql`1`),

        db
          .select({
            operator: operatorExpr,
            serviceType: serviceTransactions.serviceType,
            count: sql<number>`count(*)::int`,
            successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL})::int`,
            successfulVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}), 0)::text`,
          })
          .from(serviceTransactions)
          .where(currentPeriodWhere)
          .groupBy(sql`1`, serviceTransactions.serviceType)
          .having(sql`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}) > 0`)
          .orderBy(
            sql`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}), 0) DESC`,
            sql`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}) DESC`,
          )
          .limit(10),

        db
          .select({
            bucket: bucketSpec.bucketExpr,
            label: bucketSpec.labelExpr,
            count: sql<number>`count(*)::int`,
            successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL})::int`,
            failedCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = ${TransactionStatus.FAILED})::int`,
            successfulVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = ${TransactionStatus.SUCCESSFUL}), 0)::text`,
          })
          .from(serviceTransactions)
          .where(currentPeriodWhere)
          .groupBy(bucketSpec.trunc)
          .orderBy(sql`${bucketSpec.trunc} ASC`),

        db
          .select({
            earnedVolume: sql<string>`coalesce(sum(${financialLedger.amount}), 0)::text`,
          })
          .from(financialLedger)
          .where(
            and(
              eq(financialLedger.businessId, businessId),
              eq(financialLedger.category, 'COMMISSION_EARNED'),
              gte(financialLedger.createdAt, startDate),
              lte(financialLedger.createdAt, endDate),
            ),
          ),
      ]);

      const responseData = buildAnalyticsOverviewPayload({
        timeframe,
        startDate,
        endDate,
        bucketFormat,
        serviceFilter,
        channelFilter,
        now,
        currentSummary,
        prevSummary,
        serviceBreakdownRows,
        channelBreakdownRows,
        operatorBreakdownRows,
        timelineRows,
        commissionEarnedKobo: commissionEarnedRow?.earnedVolume || '0',
      });

      return reply.status(200).send(createSuccessResponse(responseData, request.id));
    },
  );
};
