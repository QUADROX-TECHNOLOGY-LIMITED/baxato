import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { env } from '@baxato/config';
import type { WalletBalanceDto } from '@baxato/common';

export interface WalletRealtimeEvent {
  type: 'WALLET_UPDATED';
  businessId: string;
  wallet: WalletBalanceDto;
  reason?: string;
  timestamp: string;
}

interface WireWalletEvent extends WalletRealtimeEvent {
  originInstanceId: string;
}

const CHANNEL_PREFIX = 'baxato:wallets:';

class RealtimeService {
  private readonly emitter = new EventEmitter();
  private readonly instanceId = randomUUID();
  private readonly redisRefCounts = new Map<string, number>();

  private pubClient: Redis | null = null;
  private subClient: Redis | null = null;
  private redisInitialized = false;
  private isClosing = false;

  constructor() {
    this.emitter.setMaxListeners(500);
  }

  private getChannel(businessId: string): string {
    return `${CHANNEL_PREFIX}${businessId}`;
  }

  /**
   * Lazily initializes Redis Pub/Sub clients outside test mode.
   * Failures never throw so single-process EventEmitter fallback keeps working seamlessly.
   */
  public ensureRedisConnected(): void {
    if (this.redisInitialized || this.isClosing) return;
    if (env.NODE_ENV === 'test' || !env.REDIS_URL) return;

    this.redisInitialized = true;

    try {
      const commonOptions = {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy: (times: number) => Math.min(times * 500, 10_000),
      };

      const pub = new Redis(env.REDIS_URL, commonOptions);
      const sub = new Redis(env.REDIS_URL, commonOptions);

      pub.on('error', () => {
        // Offline or unreachable Redis degrades cleanly to in-process EventEmitter
      });
      sub.on('error', () => {
        // Offline or unreachable Redis degrades cleanly to in-process EventEmitter
      });

      sub.on('message', (channel: string, raw: string) => {
        try {
          const parsed = JSON.parse(raw) as WireWalletEvent;
          if (parsed.originInstanceId === this.instanceId) {
            return;
          }
          const event: WalletRealtimeEvent = {
            type: parsed.type,
            businessId: parsed.businessId,
            wallet: parsed.wallet,
            reason: parsed.reason,
            timestamp: parsed.timestamp,
          };
          this.emitter.emit(channel, event);
        } catch {
          // Ignore malformed pub/sub message
        }
      });

      sub.on('ready', () => {
        for (const [channel, count] of this.redisRefCounts.entries()) {
          if (count > 0) {
            sub.subscribe(channel).catch(() => {});
          }
        }
      });

      this.pubClient = pub;
      this.subClient = sub;

      pub.connect().catch(() => {});
      sub.connect().catch(() => {});
    } catch {
      this.pubClient = null;
      this.subClient = null;
    }
  }

  /**
   * Broadcasts an updated wallet balance locally and across Redis Pub/Sub subscribers.
   */
  public publishWalletUpdate(
    businessId: string,
    wallet: WalletBalanceDto,
    reason?: string,
  ): void {
    const channel = this.getChannel(businessId);
    const event: WalletRealtimeEvent = {
      type: 'WALLET_UPDATED',
      businessId,
      wallet,
      reason,
      timestamp: new Date().toISOString(),
    };

    // Always notify same-process SSE listeners immediately
    this.emitter.emit(channel, event);

    // Also fan out across processes when Redis is ready
    if (env.NODE_ENV !== 'test') {
      this.ensureRedisConnected();
      if (this.pubClient?.status === 'ready') {
        const wire: WireWalletEvent = {
          ...event,
          originInstanceId: this.instanceId,
        };
        this.pubClient.publish(channel, JSON.stringify(wire)).catch(() => {});
      }
    }
  }

  /**
   * Subscribes to live wallet updates for a specific business and returns an unsubscribe handle.
   */
  public subscribeBusinessWallets(
    businessId: string,
    listener: (event: WalletRealtimeEvent) => void,
  ): () => void {
    if (env.NODE_ENV !== 'test') {
      this.ensureRedisConnected();
    }

    const channel = this.getChannel(businessId);
    this.emitter.on(channel, listener);

    const prevCount = this.redisRefCounts.get(channel) ?? 0;
    this.redisRefCounts.set(channel, prevCount + 1);

    if (prevCount === 0 && this.subClient?.status === 'ready') {
      this.subClient.subscribe(channel).catch(() => {});
    }

    return () => {
      this.emitter.off(channel, listener);
      const currentCount = this.redisRefCounts.get(channel) ?? 0;
      const nextCount = Math.max(0, currentCount - 1);
      if (nextCount === 0) {
        this.redisRefCounts.delete(channel);
        if (this.subClient?.status === 'ready') {
          this.subClient.unsubscribe(channel).catch(() => {});
        }
      } else {
        this.redisRefCounts.set(channel, nextCount);
      }
    };
  }

  /**
   * Gracefully shuts down Redis connections on Fastify server close.
   */
  public async close(): Promise<void> {
    this.isClosing = true;
    const clients = [this.pubClient, this.subClient].filter((c): c is Redis => Boolean(c));
    this.pubClient = null;
    this.subClient = null;

    await Promise.all(
      clients.map(async (client) => {
        try {
          if (client.status === 'ready' || client.status === 'connecting') {
            await client.quit();
          } else {
            client.disconnect();
          }
        } catch {
          client.disconnect();
        }
      }),
    );
  }
}

export const realtimeService = new RealtimeService();

