export enum TransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
  REVERSED = 'REVERSED',
}

export enum ServiceType {
  AIRTIME = 'AIRTIME',
  DATA = 'DATA',
  CABLE = 'CABLE_TV',
  CABLE_TV = 'CABLE_TV',
  ELECTRICITY = 'ELECTRICITY',
  EDUCATION = 'EXAM_PIN',
  EXAM_PIN = 'EXAM_PIN',
}

export enum TelecomNetwork {
  AIRTEL = 'AIRTEL',
  MTN = 'MTN',
  GLO = 'GLO',
  NINEMOBILE = '9MOBILE',
}

export enum CableOperator {
  DSTV = 'DSTV',
  GOTV = 'GOTV',
  STARTIMES = 'STARTIMES',
}

export enum ElectricityMeterType {
  PREPAID = 'PREPAID',
  POSTPAID = 'POSTPAID',
}

export enum DiscoCode {
  IBEDC = 'IBEDC',
  IKEDC = 'IKEDC',
  EKEDC = 'EKEDC',
  AEDC = 'AEDC',
  EEDC = 'EEDC',
  KEDCO = 'KEDCO',
  JED = 'JED',
  PHED = 'PHED',
  BEDC = 'BEDC',
  KAEDCO = 'KAEDCO',
  YEDC = 'YEDC',
  APLE = 'APLE',
}

export enum ProviderName {
  INTERSWITCH = 'INTERSWITCH',
  MONNIFY = 'MONNIFY',
  INTERNAL_MOCK = 'INTERNAL_MOCK',
}

export enum UserRole {
  // Platform Level (BAXATO Internal)
  SUPER_ADMIN = 'SUPER_ADMIN', // Platform Owner
  STAFF = 'STAFF',             // Platform Operator (Manage services, cannot delete users or view balance sheets)
  SUPPORT = 'SUPPORT',         // Platform Support
  // Merchant Level (External)
  BUSINESS_OWNER = 'BUSINESS_OWNER', // Merchant (Max 3 businesses)
  BUSINESS_ADMIN = 'BUSINESS_ADMIN', // Merchant Team Admin
  DEVELOPER = 'DEVELOPER',           // Merchant Team Developer
}

export enum KycStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum WalletType {
  MAIN = 'MAIN',
  COMMISSION = 'COMMISSION',
}

export enum LedgerDirection {
  DEBIT = 'DEBIT',
  CREDIT = 'CREDIT',
}

export enum EnvironmentMode {
  PRODUCTION = 'production',
  STAGING = 'staging',
  DEVELOPMENT = 'development',
  TEST = 'test',
}

export enum ExamBody {
  WAEC = 'WAEC',
  NECO = 'NECO',
  NABTEB = 'NABTEB',
  JAMB = 'JAMB',
}

export enum ExamServiceType {
  RESULT_CHECKER = 'RESULT_CHECKER',
  REGISTRATION = 'REGISTRATION',
  UTME_NO_MOCK = 'UTME_NO_MOCK',
  UTME_WITH_MOCK = 'UTME_WITH_MOCK',
  DIRECT_ENTRY = 'DIRECT_ENTRY',
}

export enum ApiKeyStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export enum ApiKeyEnvironment {
  LIVE = 'LIVE',
  TEST = 'TEST',
}

export enum WebhookDeliveryStatus {
  PENDING = 'PENDING',
  SUCCESSFUL = 'SUCCESSFUL',
  FAILED = 'FAILED',
}

export enum WebhookEventType {
  TRANSACTION_SUCCESSFUL = 'transaction.successful',
  TRANSACTION_FAILED = 'transaction.failed',
  WALLET_CREDITED = 'wallet.credited',
  WALLET_DEBITED = 'wallet.debited',
  KYC_UPDATED = 'kyc.updated',
  PING = 'ping',
}
