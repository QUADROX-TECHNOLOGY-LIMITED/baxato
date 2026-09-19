import { UserRole } from './enums';

export enum Permission {
  // Platform Permissions (Root Scope)
  PLATFORM_ADMIN_FULL = 'platform:admin:full',
  PLATFORM_USERS_READ = 'platform:users:read',
  PLATFORM_USERS_WRITE = 'platform:users:write',
  PLATFORM_USERS_DELETE = 'platform:users:delete',
  PLATFORM_FINANCIAL_READ = 'platform:financial:read',
  PLATFORM_PROVIDERS_MANAGE = 'platform:providers:manage',
  PLATFORM_SERVICES_MANAGE = 'platform:services:manage',
  PLATFORM_KYC_REVIEW = 'platform:kyc:review',
  PLATFORM_AUDIT_READ = 'platform:audit:read',

  // Tenant Permissions (Business Scope)
  TENANT_BUSINESS_READ = 'tenant:business:read',
  TENANT_BUSINESS_UPDATE = 'tenant:business:update',
  TENANT_BUSINESS_DELETE = 'tenant:business:delete',
  TENANT_MEMBERS_READ = 'tenant:members:read',
  TENANT_MEMBERS_MANAGE = 'tenant:members:manage',
  TENANT_WALLETS_READ = 'tenant:wallets:read',
  TENANT_WALLETS_TRANSFER = 'tenant:wallets:transfer',
  TENANT_APIKEYS_MANAGE = 'tenant:apikeys:manage',
  TENANT_WEBHOOKS_MANAGE = 'tenant:webhooks:manage',
  TENANT_TRANSACTIONS_READ = 'tenant:transactions:read',
  TENANT_SERVICES_EXECUTE = 'tenant:services:execute',
}

/**
 * Mapping of Roles to their explicit granted permissions.
 */
export const ROLE_PERMISSIONS_MAP: Record<UserRole, Permission[]> = {
  // Platform Owner has complete system access
  [UserRole.SUPER_ADMIN]: Object.values(Permission),

  // Platform Staff: Can manage services and assist users, but CANNOT delete users or see financial balance sheets
  [UserRole.STAFF]: [
    Permission.PLATFORM_USERS_READ,
    Permission.PLATFORM_USERS_WRITE,
    Permission.PLATFORM_PROVIDERS_MANAGE,
    Permission.PLATFORM_SERVICES_MANAGE,
    Permission.PLATFORM_KYC_REVIEW,
    Permission.PLATFORM_AUDIT_READ,
  ],

  // Platform Support: Can view users, kyc, and assist
  [UserRole.SUPPORT]: [
    Permission.PLATFORM_USERS_READ,
    Permission.PLATFORM_KYC_REVIEW,
    Permission.PLATFORM_SERVICES_MANAGE,
  ],

  // Business Owner: Full control over their business and wallets
  [UserRole.BUSINESS_OWNER]: [
    Permission.TENANT_BUSINESS_READ,
    Permission.TENANT_BUSINESS_UPDATE,
    Permission.TENANT_BUSINESS_DELETE,
    Permission.TENANT_MEMBERS_READ,
    Permission.TENANT_MEMBERS_MANAGE,
    Permission.TENANT_WALLETS_READ,
    Permission.TENANT_WALLETS_TRANSFER,
    Permission.TENANT_APIKEYS_MANAGE,
    Permission.TENANT_WEBHOOKS_MANAGE,
    Permission.TENANT_TRANSACTIONS_READ,
    Permission.TENANT_SERVICES_EXECUTE,
  ],

  // Business Admin: Can manage team and webhooks, but CANNOT delete business or owner
  [UserRole.BUSINESS_ADMIN]: [
    Permission.TENANT_BUSINESS_READ,
    Permission.TENANT_BUSINESS_UPDATE,
    Permission.TENANT_MEMBERS_READ,
    Permission.TENANT_MEMBERS_MANAGE,
    Permission.TENANT_WALLETS_READ,
    Permission.TENANT_APIKEYS_MANAGE,
    Permission.TENANT_WEBHOOKS_MANAGE,
    Permission.TENANT_TRANSACTIONS_READ,
    Permission.TENANT_SERVICES_EXECUTE,
  ],

  // Business Developer: Can manage API keys, webhooks, test services, and view transactions
  [UserRole.DEVELOPER]: [
    Permission.TENANT_BUSINESS_READ,
    Permission.TENANT_APIKEYS_MANAGE,
    Permission.TENANT_WEBHOOKS_MANAGE,
    Permission.TENANT_TRANSACTIONS_READ,
    Permission.TENANT_SERVICES_EXECUTE,
  ],
};

/**
 * Evaluates whether a role possesses the specified permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  if (role === UserRole.SUPER_ADMIN) {
    return true;
  }
  const granted = ROLE_PERMISSIONS_MAP[role] || [];
  return granted.includes(permission);
}
