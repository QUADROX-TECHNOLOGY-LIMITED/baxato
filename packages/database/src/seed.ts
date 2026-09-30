import { db, closeDatabasePool } from './client.js';
import { users, businesses, wallets, providers } from './schema/index.js';
import { UserRole, WalletType, ProviderName } from '@baxato/common';
import { eq } from 'drizzle-orm';

export async function seedProviders() {
  console.log('  -> Seeding providers (Interswitch & Monnify)...');
  await db
    .insert(providers)
    .values([
      {
        name: ProviderName.INTERSWITCH,
        status: 'ACTIVE',
        isPrimary: true,
        failureRate: 0,
        config: {
          airtime: true,
          data: true,
          electricity: true,
          cable: true,
          exam_pin: true,
          billerIds: {
            airtel: '901',
            mtn: '109',
            glo: '908',
            nineMobile: '908',
          },
        },
      },
      {
        name: ProviderName.MONNIFY,
        status: 'ACTIVE',
        isPrimary: true,
        failureRate: 0,
        config: {
          airtime: true,
          data: true,
          electricity: true,
          cable: true,
          exam_pin: false,
        },
      },
    ])
    .onConflictDoNothing();

  // If providers already exist in DB, ensure Monnify has services active
  try {
    const existing = await db.select().from(providers);
    for (const p of existing) {
      const cfg = (p.config || {}) as Record<string, unknown>;
      if (p.name === ProviderName.INTERSWITCH && cfg.airtime === undefined) {
        await db
          .update(providers)
          .set({
            config: {
              ...cfg,
              airtime: true,
              data: true,
              electricity: true,
              cable: true,
              exam_pin: true,
              billerIds: cfg.billerIds || {
                airtel: '901',
                mtn: '109',
                glo: '908',
                nineMobile: '908',
              },
            },
          })
          .where(eq(providers.id, p.id));
      } else if (p.name === ProviderName.MONNIFY && cfg.airtime === undefined) {
        await db
          .update(providers)
          .set({
            isPrimary: true,
            config: {
              ...cfg,
              airtime: true,
              data: true,
              electricity: true,
              cable: true,
              exam_pin: false,
            },
          })
          .where(eq(providers.id, p.id));
      }
    }
  } catch (_e) {
    // Non-blocking on provider config backfill
  }
}

export async function seedDatabase() {
  console.log('🌱 Starting BAXATO database seeding...');

  // 1. Seed Providers
  await seedProviders();

  // 2. Seed Default Admin User
  console.log('  -> Seeding platform admin user...');
  const [adminUser] = await db
    .insert(users)
    .values({
      clerkId: 'user_admin_demo_clerk_id',
      email: 'admin@baxato.com',
      firstName: 'Baxato',
      lastName: 'Admin',
      role: UserRole.SUPER_ADMIN,
      status: 'ACTIVE',
    })
    .onConflictDoNothing()
    .returning();

  if (adminUser) {
    // 3. Seed Default Business
    console.log('  -> Seeding demo merchant business...');
    const [business] = await db
      .insert(businesses)
      .values({
        ownerId: adminUser.id,
        name: 'Baxato Demo Merchant',
        slug: 'baxato-demo-merchant',
        country: 'NG',
        state: 'Lagos',
        lga: 'Ikeja',
        status: 'ACTIVE',
      })
      .onConflictDoNothing()
      .returning();

    if (business) {
      // 4. Seed Wallets
      console.log('  -> Seeding merchant MAIN and COMMISSION wallets...');
      await db
        .insert(wallets)
        .values([
          {
            businessId: business.id,
            type: WalletType.MAIN,
            balance: 10000000n, // ₦100,000 in Kobo
          },
          {
            businessId: business.id,
            type: WalletType.COMMISSION,
            balance: 0n,
          },
        ])
        .onConflictDoNothing();
    }
  }

  console.log('✅ Database seeding completed successfully.');
}

// Allow direct CLI execution if run directly
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase()
    .catch((err) => {
      console.error('❌ Database seeding failed:', err);
      process.exit(1);
    })
    .finally(() => closeDatabasePool());
}
