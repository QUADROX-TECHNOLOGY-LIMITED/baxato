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
  not,
  or,
} from '@baxato/database';
import { requireTenantPermission } from '../plugins/rbac.plugin.js';

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /analytics/overview
   * Enterprise-grade, multi-dimensional analytics telemetry for the active business workspace.
   * Computes accurate KPIs, time-series curves, service share, channel split, carrier breakdown,
   * error diagnostics, and 24-hour trading matrices directly from PostgreSQL.
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

      const timeframe = (query.timeframe || '30d').toLowerCase();
      const serviceFilter = query.serviceType && query.serviceType !== 'ALL' ? query.serviceType : null;
      const channelFilter = query.channel && query.channel !== 'ALL' ? query.channel.toUpperCase() : null;

      // 1. Compute Exact Date Boundaries
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;
      let prevStartDate: Date;
      let prevEndDate: Date;
      let bucketFormat: 'hour' | 'day' | 'week' | 'month' = 'day';

      if (query.startDate && query.endDate) {
        startDate = new Date(query.startDate);
        endDate = new Date(query.endDate);
        const spanMs = endDate.getTime() - startDate.getTime();
        prevStartDate = new Date(startDate.getTime() - spanMs);
        prevEndDate = new Date(startDate.getTime());
        if (spanMs <= 86400000 * 2) {
          bucketFormat = 'hour';
        } else if (spanMs <= 86400000 * 60) {
          bucketFormat = 'day';
        } else {
          bucketFormat = 'week';
        }
      } else {
        switch (timeframe) {
          case 'today': {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
            endDate = now;
            prevStartDate = new Date(startDate.getTime() - 86400000);
            prevEndDate = new Date(startDate.getTime());
            bucketFormat = 'hour';
            break;
          }
          case '7d': {
            startDate = new Date(now.getTime() - 7 * 86400000);
            startDate.setHours(0, 0, 0, 0);
            prevStartDate = new Date(startDate.getTime() - 7 * 86400000);
            prevEndDate = new Date(startDate.getTime());
            bucketFormat = 'day';
            break;
          }
          case '90d': {
            startDate = new Date(now.getTime() - 90 * 86400000);
            startDate.setHours(0, 0, 0, 0);
            prevStartDate = new Date(startDate.getTime() - 90 * 86400000);
            prevEndDate = new Date(startDate.getTime());
            bucketFormat = 'week';
            break;
          }
          case 'ytd': {
            startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
            prevStartDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
            prevEndDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
            bucketFormat = 'month';
            break;
          }
          case '30d':
          default: {
            startDate = new Date(now.getTime() - 30 * 86400000);
            startDate.setHours(0, 0, 0, 0);
            prevStartDate = new Date(startDate.getTime() - 30 * 86400000);
            prevEndDate = new Date(startDate.getTime());
            bucketFormat = 'day';
            break;
          }
        }
      }

      // 2. Helper to build common SQL conditions
      const buildConditions = (rangeStart: Date, rangeEnd: Date) => {
        const conds = [
          eq(serviceTransactions.businessId, businessId),
          gte(serviceTransactions.createdAt, rangeStart),
          lte(serviceTransactions.createdAt, rangeEnd),
        ];

        if (serviceFilter) {
          conds.push(eq(serviceTransactions.serviceType, serviceFilter as ServiceType));
        }

        if (channelFilter === 'API') {
          conds.push(
            or(
              sql`(${serviceTransactions.metadata}->>'channel') = 'API'`,
              like(serviceTransactions.userId, 'key_%'),
            )!,
          );
        } else if (channelFilter === 'CONSOLE') {
          conds.push(
            and(
              sql`(${serviceTransactions.metadata}->>'channel' IS NULL OR (${serviceTransactions.metadata}->>'channel') != 'API')`,
              not(like(serviceTransactions.userId, 'key_%')),
            )!,
          );
        }

        return and(...conds);
      };

      const currentPeriodWhere = buildConditions(startDate, endDate);
      const prevPeriodWhere = buildConditions(prevStartDate, prevEndDate);

      // 3. Execute Parallel SQL Queries
      const [
        [currentSummary],
        [prevSummary],
        serviceBreakdownRows,
        channelBreakdownRows,
        operatorBreakdownRows,
        failureReasonRows,
        hourlyDensityRows,
        timelineRows,
        [commissionEarnedRow],
      ] = await Promise.all([
        // 3.1 Current Period Summary KPI
        db
          .select({
            totalCount: sql<number>`count(*)::int`,
            totalVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}), 0)::text`,
            successfulVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = 'SUCCESSFUL'), 0)::text`,
            successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'SUCCESSFUL')::int`,
            failedCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'FAILED')::int`,
            pendingCount: sql<number>`count(*) filter (where ${serviceTransactions.status} in ('PENDING', 'PROCESSING'))::int`,
            reversedCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'REVERSED')::int`,
            totalDiscount: sql<string>`coalesce(sum(${serviceTransactions.discount}), 0)::text`,
            totalFee: sql<string>`coalesce(sum(${serviceTransactions.fee}), 0)::text`,
          })
          .from(serviceTransactions)
          .where(currentPeriodWhere),

        // 3.2 Previous Period Summary KPI (for delta comparisons)
        db
          .select({
            totalCount: sql<number>`count(*)::int`,
            totalVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}), 0)::text`,
            successfulVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = 'SUCCESSFUL'), 0)::text`,
            successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'SUCCESSFUL')::int`,
            failedCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'FAILED')::int`,
          })
          .from(serviceTransactions)
          .where(prevPeriodWhere),

        // 3.3 Service Breakdown
        db
          .select({
            serviceType: serviceTransactions.serviceType,
            count: sql<number>`count(*)::int`,
            successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'SUCCESSFUL')::int`,
            failedCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'FAILED')::int`,
            volume: sql<string>`coalesce(sum(${serviceTransactions.amount}), 0)::text`,
            successfulVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = 'SUCCESSFUL'), 0)::text`,
            discount: sql<string>`coalesce(sum(${serviceTransactions.discount}), 0)::text`,
          })
          .from(serviceTransactions)
          .where(currentPeriodWhere)
          .groupBy(serviceTransactions.serviceType)
          .orderBy(sql`sum(${serviceTransactions.amount}) DESC`),

        // 3.4 Channel Breakdown (API vs Web Console)
        db
          .select({
            channel: sql<string>`CASE WHEN (${serviceTransactions.metadata}->>'channel') = 'API' OR ${serviceTransactions.userId} LIKE 'key_%' THEN 'API' ELSE 'CONSOLE' END`,
            count: sql<number>`count(*)::int`,
            successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'SUCCESSFUL')::int`,
            volume: sql<string>`coalesce(sum(${serviceTransactions.amount}), 0)::text`,
          })
          .from(serviceTransactions)
          .where(
            and(
              eq(serviceTransactions.businessId, businessId),
              gte(serviceTransactions.createdAt, startDate),
              lte(serviceTransactions.createdAt, endDate),
              serviceFilter ? eq(serviceTransactions.serviceType, serviceFilter as ServiceType) : undefined,
            ),
          )
          .groupBy(sql`1`),

        // 3.5 Top Carriers / Operators (MTN, Airtel, Ikeja Electric, DSTV, etc.)
        db
          .select({
            operator: sql<string>`coalesce(
              ${serviceTransactions.metadata}->>'network',
              ${serviceTransactions.metadata}->>'disco',
              ${serviceTransactions.metadata}->>'cableProvider',
              ${serviceTransactions.metadata}->>'examBody',
              ${serviceTransactions.providerName}::text,
              'OTHER'
            )`,
            serviceType: serviceTransactions.serviceType,
            count: sql<number>`count(*)::int`,
            successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'SUCCESSFUL')::int`,
            volume: sql<string>`coalesce(sum(${serviceTransactions.amount}), 0)::text`,
          })
          .from(serviceTransactions)
          .where(currentPeriodWhere)
          .groupBy(sql`1`, serviceTransactions.serviceType)
          .orderBy(sql`sum(${serviceTransactions.amount}) DESC`)
          .limit(8),

        // 3.6 Failure Diagnostics & Error Reasons
        db
          .select({
            reason: sql<string>`coalesce(nullif(trim(${serviceTransactions.errorMessage}), ''), 'Upstream Gateway Error')`,
            count: sql<number>`count(*)::int`,
            lostVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}), 0)::text`,
          })
          .from(serviceTransactions)
          .where(
            and(
              eq(serviceTransactions.businessId, businessId),
              eq(serviceTransactions.status, TransactionStatus.FAILED),
              gte(serviceTransactions.createdAt, startDate),
              lte(serviceTransactions.createdAt, endDate),
              serviceFilter ? eq(serviceTransactions.serviceType, serviceFilter as ServiceType) : undefined,
            ),
          )
          .groupBy(sql`1`)
          .orderBy(sql`count(*) DESC`)
          .limit(6),

        // 3.7 Hourly Trading Density (24-hour cycle)
        db
          .select({
            hour: sql<number>`extract(hour from ${serviceTransactions.createdAt})::int`,
            count: sql<number>`count(*)::int`,
            volume: sql<string>`coalesce(sum(${serviceTransactions.amount}), 0)::text`,
          })
          .from(serviceTransactions)
          .where(currentPeriodWhere)
          .groupBy(sql`1`)
          .orderBy(sql`1 ASC`),

        // 3.8 Time-Series Trend Buckets
        bucketFormat === 'hour'
          ? db
              .select({
                bucket: sql<string>`to_char(date_trunc('hour', ${serviceTransactions.createdAt}), 'YYYY-MM-DD"T"HH24:00:00')`,
                label: sql<string>`to_char(date_trunc('hour', ${serviceTransactions.createdAt}), 'HH24:00')`,
                count: sql<number>`count(*)::int`,
                successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'SUCCESSFUL')::int`,
                failedCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'FAILED')::int`,
                volume: sql<string>`coalesce(sum(${serviceTransactions.amount}), 0)::text`,
                successfulVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = 'SUCCESSFUL'), 0)::text`,
              })
              .from(serviceTransactions)
              .where(currentPeriodWhere)
              .groupBy(sql`date_trunc('hour', ${serviceTransactions.createdAt})`)
              .orderBy(sql`date_trunc('hour', ${serviceTransactions.createdAt}) ASC`)
          : bucketFormat === 'month'
          ? db
              .select({
                bucket: sql<string>`to_char(date_trunc('month', ${serviceTransactions.createdAt}), 'YYYY-MM')`,
                label: sql<string>`to_char(date_trunc('month', ${serviceTransactions.createdAt}), 'Mon YYYY')`,
                count: sql<number>`count(*)::int`,
                successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'SUCCESSFUL')::int`,
                failedCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'FAILED')::int`,
                volume: sql<string>`coalesce(sum(${serviceTransactions.amount}), 0)::text`,
                successfulVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = 'SUCCESSFUL'), 0)::text`,
              })
              .from(serviceTransactions)
              .where(currentPeriodWhere)
              .groupBy(sql`date_trunc('month', ${serviceTransactions.createdAt})`)
              .orderBy(sql`date_trunc('month', ${serviceTransactions.createdAt}) ASC`)
          : bucketFormat === 'week'
          ? db
              .select({
                bucket: sql<string>`to_char(date_trunc('week', ${serviceTransactions.createdAt}), 'YYYY-"W"IW')`,
                label: sql<string>`'Week ' || to_char(date_trunc('week', ${serviceTransactions.createdAt}), 'IW')`,
                count: sql<number>`count(*)::int`,
                successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'SUCCESSFUL')::int`,
                failedCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'FAILED')::int`,
                volume: sql<string>`coalesce(sum(${serviceTransactions.amount}), 0)::text`,
                successfulVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = 'SUCCESSFUL'), 0)::text`,
              })
              .from(serviceTransactions)
              .where(currentPeriodWhere)
              .groupBy(sql`date_trunc('week', ${serviceTransactions.createdAt})`)
              .orderBy(sql`date_trunc('week', ${serviceTransactions.createdAt}) ASC`)
          : db
              .select({
                bucket: sql<string>`to_char(date_trunc('day', ${serviceTransactions.createdAt}), 'YYYY-MM-DD')`,
                label: sql<string>`to_char(date_trunc('day', ${serviceTransactions.createdAt}), 'Mon DD')`,
                count: sql<number>`count(*)::int`,
                successfulCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'SUCCESSFUL')::int`,
                failedCount: sql<number>`count(*) filter (where ${serviceTransactions.status} = 'FAILED')::int`,
                volume: sql<string>`coalesce(sum(${serviceTransactions.amount}), 0)::text`,
                successfulVolume: sql<string>`coalesce(sum(${serviceTransactions.amount}) filter (where ${serviceTransactions.status} = 'SUCCESSFUL'), 0)::text`,
              })
              .from(serviceTransactions)
              .where(currentPeriodWhere)
              .groupBy(sql`date_trunc('day', ${serviceTransactions.createdAt})`)
              .orderBy(sql`date_trunc('day', ${serviceTransactions.createdAt}) ASC`),

        // 3.9 Commission Wallet Earnings
        db
          .select({
            earnedVolume: sql<string>`coalesce(sum(${financialLedger.amount}), 0)::text`,
            earnedCount: sql<number>`count(*)::int`,
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

      // 4. Compute Metrics & Formatting
      const curTotalCount = currentSummary?.totalCount || 0;
      const curTotalVolumeKobo = BigInt(currentSummary?.totalVolume || '0');
      const curSuccVolumeKobo = BigInt(currentSummary?.successfulVolume || '0');
      const curSuccCount = currentSummary?.successfulCount || 0;
      const curFailedCount = currentSummary?.failedCount || 0;
      const curPendingCount = currentSummary?.pendingCount || 0;
      const curReversedCount = currentSummary?.reversedCount || 0;
      const curDiscountKobo = BigInt(currentSummary?.totalDiscount || '0');
      const curFeeKobo = BigInt(currentSummary?.totalFee || '0');

      const prevTotalCount = prevSummary?.totalCount || 0;
      const prevTotalVolumeKobo = BigInt(prevSummary?.totalVolume || '0');
      const prevSuccCount = prevSummary?.successfulCount || 0;

      // Rates & deltas
      const successRate = curTotalCount > 0 ? Number(((curSuccCount / curTotalCount) * 100).toFixed(2)) : 100;
      const prevSuccessRate = prevTotalCount > 0 ? Number(((prevSuccCount / prevTotalCount) * 100).toFixed(2)) : 100;
      const successRateDelta = Number((successRate - prevSuccessRate).toFixed(2));

      const curVolumeNaira = koboToNaira(curTotalVolumeKobo);
      const prevVolumeNaira = koboToNaira(prevTotalVolumeKobo);
      const volumeGrowthRate =
        prevVolumeNaira > 0
          ? Number((((curVolumeNaira - prevVolumeNaira) / prevVolumeNaira) * 100).toFixed(1))
          : curVolumeNaira > 0
          ? 100
          : 0;

      const countGrowthRate =
        prevTotalCount > 0
          ? Number((((curTotalCount - prevTotalCount) / prevTotalCount) * 100).toFixed(1))
          : curTotalCount > 0
          ? 100
          : 0;

      const avgTicketNaira = curSuccCount > 0 ? koboToNaira(curSuccVolumeKobo / BigInt(curSuccCount)) : 0;

      // 5. Build Continuous Time-Series Baseline (Fill missing zero-slots)
      const timelineMap = new Map<string, (typeof timelineRows)[0]>();
      for (const row of timelineRows) {
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

      if (bucketFormat === 'hour') {
        for (let h = 0; h < 24; h++) {
          const hourStr = h.toString().padStart(2, '0');
          const label = `${hourStr}:00`;
          // Match any bucket ending with HH:00:00
          const match = timelineRows.find((r) => r.label === label);
          const volKobo = match ? BigInt(match.volume) : 0n;
          const succVolKobo = match ? BigInt(match.successfulVolume) : 0n;
          const cnt = match ? match.count : 0;
          const succCnt = match ? match.successfulCount : 0;
          timeline.push({
            bucket: label,
            label,
            volumeNaira: koboToNaira(volKobo),
            successfulVolumeNaira: koboToNaira(succVolKobo),
            count: cnt,
            successfulCount: succCnt,
            failedCount: match ? match.failedCount : 0,
            successRate: cnt > 0 ? Number(((succCnt / cnt) * 100).toFixed(1)) : 100,
          });
        }
      } else if (bucketFormat === 'day') {
        const dayCount = timeframe === '7d' ? 7 : 30;
        for (let i = dayCount - 1; i >= 0; i--) {
          const d = new Date(now.getTime() - i * 86400000);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          const key = `${yyyy}-${mm}-${dd}`;
          const monthShort = d.toLocaleString('en-US', { month: 'short' });
          const label = `${monthShort} ${dd}`;

          const match = timelineMap.get(key);
          const volKobo = match ? BigInt(match.volume) : 0n;
          const succVolKobo = match ? BigInt(match.successfulVolume) : 0n;
          const cnt = match ? match.count : 0;
          const succCnt = match ? match.successfulCount : 0;

          timeline.push({
            bucket: key,
            label,
            volumeNaira: koboToNaira(volKobo),
            successfulVolumeNaira: koboToNaira(succVolKobo),
            count: cnt,
            successfulCount: succCnt,
            failedCount: match ? match.failedCount : 0,
            successRate: cnt > 0 ? Number(((succCnt / cnt) * 100).toFixed(1)) : 100,
          });
        }
      } else {
        // Use existing grouped buckets
        for (const row of timelineRows) {
          const volKobo = BigInt(row.volume);
          const succVolKobo = BigInt(row.successfulVolume);
          timeline.push({
            bucket: row.bucket,
            label: row.label,
            volumeNaira: koboToNaira(volKobo),
            successfulVolumeNaira: koboToNaira(succVolKobo),
            count: row.count,
            successfulCount: row.successfulCount,
            failedCount: row.failedCount,
            successRate: row.count > 0 ? Number(((row.successfulCount / row.count) * 100).toFixed(1)) : 100,
          });
        }
      }

      // 6. Format Service Breakdown
      const serviceDisplayLabels: Record<string, string> = {
        AIRTIME: 'Airtime Vending',
        DATA: 'Data Bundles',
        ELECTRICITY: 'Electricity',
        CABLE_TV: 'Cable TV Subscriptions',
        EXAM_PIN: 'Education & Exam PINs',
      };

      const totalVolNairaSum = curVolumeNaira > 0 ? curVolumeNaira : 1;
      const serviceBreakdown = serviceBreakdownRows.map((s) => {
        const vKobo = BigInt(s.volume);
        const vNaira = koboToNaira(vKobo);
        const dKobo = BigInt(s.discount);
        const discNaira = koboToNaira(dKobo);
        const rate = s.count > 0 ? Number(((s.successfulCount / s.count) * 100).toFixed(1)) : 100;
        const avg = s.successfulCount > 0 ? koboToNaira(BigInt(s.successfulVolume) / BigInt(s.successfulCount)) : 0;

        return {
          serviceType: s.serviceType,
          label: serviceDisplayLabels[s.serviceType] || s.serviceType,
          count: s.count,
          successfulCount: s.successfulCount,
          failedCount: s.failedCount,
          volumeKobo: s.volume,
          volumeNaira: vNaira,
          formattedVolume: formatNairaFromKobo(vKobo),
          volumeShare: Number(((vNaira / totalVolNairaSum) * 100).toFixed(1)),
          successRate: rate,
          avgTicketNaira: avg,
          formattedAvgTicket: formatNairaFromKobo(BigInt(avg * 100)),
          discountNaira: discNaira,
          formattedDiscount: formatNairaFromKobo(dKobo),
        };
      });

      // 7. Format Channel Breakdown (API vs Web Console)
      const apiRow = channelBreakdownRows.find((r) => r.channel === 'API');
      const consoleRow = channelBreakdownRows.find((r) => r.channel === 'CONSOLE');

      const apiVolKobo = BigInt(apiRow?.volume || '0');
      const apiVolNaira = koboToNaira(apiVolKobo);
      const apiCount = apiRow?.count || 0;
      const apiSuccCount = apiRow?.successfulCount || 0;

      const conVolKobo = BigInt(consoleRow?.volume || '0');
      const conVolNaira = koboToNaira(conVolKobo);
      const conCount = consoleRow?.count || 0;
      const conSuccCount = consoleRow?.successfulCount || 0;

      const totalChanVolNaira = (apiVolNaira + conVolNaira) || 1;

      const channelBreakdown = {
        api: {
          count: apiCount,
          successfulCount: apiSuccCount,
          volumeNaira: apiVolNaira,
          formattedVolume: formatNairaFromKobo(apiVolKobo),
          volumeShare: Number(((apiVolNaira / totalChanVolNaira) * 100).toFixed(1)),
          successRate: apiCount > 0 ? Number(((apiSuccCount / apiCount) * 100).toFixed(1)) : 100,
        },
        console: {
          count: conCount,
          successfulCount: conSuccCount,
          volumeNaira: conVolNaira,
          formattedVolume: formatNairaFromKobo(conVolKobo),
          volumeShare: Number(((conVolNaira / totalChanVolNaira) * 100).toFixed(1)),
          successRate: conCount > 0 ? Number(((conSuccCount / conCount) * 100).toFixed(1)) : 100,
        },
      };

      // 8. Format Top Operators
      const topOperators = operatorBreakdownRows.map((op) => {
        const vKobo = BigInt(op.volume);
        const vNaira = koboToNaira(vKobo);
        return {
          operator: op.operator,
          serviceType: op.serviceType,
          count: op.count,
          successfulCount: op.successfulCount,
          volumeNaira: vNaira,
          formattedVolume: formatNairaFromKobo(vKobo),
          volumeShare: Number(((vNaira / totalVolNairaSum) * 100).toFixed(1)),
          successRate: op.count > 0 ? Number(((op.successfulCount / op.count) * 100).toFixed(1)) : 100,
        };
      });

      // 9. Format Failure Diagnostics
      const failureDiagnostics = {
        totalFailed: curFailedCount,
        failureRate: curTotalCount > 0 ? Number(((curFailedCount / curTotalCount) * 100).toFixed(1)) : 0,
        topReasons: failureReasonRows.map((r) => {
          const lostKobo = BigInt(r.lostVolume);
          const lostNaira = koboToNaira(lostKobo);
          return {
            reason: r.reason,
            count: r.count,
            lostVolumeNaira: lostNaira,
            formattedLostVolume: formatNairaFromKobo(lostKobo),
            percentage: curFailedCount > 0 ? Number(((r.count / curFailedCount) * 100).toFixed(1)) : 0,
          };
        }),
        statusDistribution: {
          successful: curSuccCount,
          failed: curFailedCount,
          pending: curPendingCount,
          reversed: curReversedCount,
        },
      };

      // 10. Hourly Trading Activity Heatmap Matrix
      const hourlyDensityMap = new Map<number, (typeof hourlyDensityRows)[0]>();
      for (const row of hourlyDensityRows) {
        hourlyDensityMap.set(row.hour, row);
      }

      const totalDensityCount = hourlyDensityRows.reduce((acc, r) => acc + r.count, 0) || 1;
      const hourlyDensity = Array.from({ length: 24 }, (_, h) => {
        const match = hourlyDensityMap.get(h);
        const count = match ? match.count : 0;
        const volKobo = match ? BigInt(match.volume) : 0n;
        return {
          hour: h,
          label: `${h.toString().padStart(2, '0')}:00`,
          count,
          volumeNaira: koboToNaira(volKobo),
          formattedVolume: formatNairaFromKobo(volKobo),
          percentage: Number(((count / totalDensityCount) * 100).toFixed(1)),
        };
      });

      // 11. Assemble Comprehensive Response
      const commEarnedKobo = BigInt(commissionEarnedRow?.earnedVolume || '0');

      const responseData = {
        timeframe,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        serviceFilter: serviceFilter || 'ALL',
        channelFilter: channelFilter || 'ALL',
        summary: {
          totalVolumeKobo: curTotalVolumeKobo.toString(),
          totalVolumeNaira: curVolumeNaira,
          formattedTotalVolume: formatNairaFromKobo(curTotalVolumeKobo),
          successfulVolumeKobo: curSuccVolumeKobo.toString(),
          successfulVolumeNaira: koboToNaira(curSuccVolumeKobo),
          formattedSuccessfulVolume: formatNairaFromKobo(curSuccVolumeKobo),
          totalCount: curTotalCount,
          successfulCount: curSuccCount,
          failedCount: curFailedCount,
          pendingCount: curPendingCount,
          reversedCount: curReversedCount,
          successRate,
          avgTicketNaira,
          formattedAvgTicket: formatNairaFromKobo(BigInt(avgTicketNaira * 100)),
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
        failureDiagnostics,
        hourlyDensity,
      };

      return reply.status(200).send(createSuccessResponse(responseData, request.id));
    },
  );
};
