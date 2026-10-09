import bcrypt from 'bcryptjs';
import { db, users, eq, closeDatabasePool } from '@baxato/database';
import { UserRole, generateEntityId } from '@baxato/common';

async function main() {
  const args = process.argv.slice(2);

  // CLI Syntax:
  // pnpm create:staff [email] [password] [role] [firstName] [lastName]
  const rawEmail = args[0] || 'staff@baxato.com';
  const password = args[1] || 'Staff@123456';
  const roleArg = (args[2] || 'STAFF').toUpperCase();
  const firstName = args[3] || (roleArg === 'SUPER_ADMIN' ? 'Super' : 'Operations');
  const lastName = args[4] || (roleArg === 'SUPER_ADMIN' ? 'Admin' : 'Staff');

  const email = rawEmail.toLowerCase().trim();

  // 1. Strict Domain Validation
  if (!email.endsWith('@baxato.com')) {
    console.error(`\n❌ Error: Staff email must end with '@baxato.com'. Received: '${email}'`);
    console.error(`   Example: pnpm create:staff myname@baxato.com MyPassword123! STAFF\n`);
    process.exit(1);
  }

  // 2. Validate Role
  const role = roleArg === 'SUPER_ADMIN' ? UserRole.SUPER_ADMIN : UserRole.STAFF;

  // 3. Hash Password
  const passwordHash = await bcrypt.hash(password, 10);

  console.log(`\n======================================================`);
  console.log(`🔧 BAXATO STAFF PROVISIONING UTILITY`);
  console.log(`======================================================`);
  console.log(`Target Email : ${email}`);
  console.log(`Target Role  : ${role}`);
  console.log(`Name         : ${firstName} ${lastName}`);

  // 4. Check if user already exists
  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let userId: string;

  if (existingUser) {
    console.log(`ℹ️ User '${email}' already exists. Updating credentials and staff privileges...`);
    userId = existingUser.id;

    await db
      .update(users)
      .set({
        firstName,
        lastName,
        role,
        passwordHash,
        status: 'ACTIVE',
        isEmailVerified: true,
        // Reset 2FA so staff can configure fresh Authenticator or Email OTP on login
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorMethod: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existingUser.id));

    console.log(`✅ Staff account updated successfully!`);
  } else {
    userId = generateEntityId('usr');
    const clerkId = `clerk_staff_${Date.now()}`;

    await db.insert(users).values({
      id: userId,
      clerkId,
      email,
      firstName,
      lastName,
      phoneNumber: '+2348000000000',
      isPhoneVerified: true,
      isEmailVerified: true,
      passwordHash,
      role,
      status: 'ACTIVE',
      kycStatus: 'VERIFIED',
      twoFactorEnabled: false,
    });

    console.log(`✅ Staff account created successfully!`);
  }

  console.log(`------------------------------------------------------`);
  console.log(`📋 LOGIN CREDENTIALS`);
  console.log(`------------------------------------------------------`);
  console.log(`URL      : http://localhost:3000/staff/login (or /staff/login)`);
  console.log(`Email    : ${email}`);
  console.log(`Password : ${password}`);
  console.log(`Role     : ${role}`);
  console.log(`------------------------------------------------------`);
  console.log(`💡 On first login, you will be prompted to enroll 2FA`);
  console.log(`   (choose Authenticator App or Email OTP).`);
  console.log(`======================================================\n`);
}

main()
  .catch((err) => {
    console.error('❌ Failed to provision staff account:', err);
    process.exit(1);
  })
  .finally(() => {
    closeDatabasePool();
  });
