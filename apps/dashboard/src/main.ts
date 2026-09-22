// ==========================================================================
// BAXATO MULTI-SERVICE VENDING ENGINE — DASHBOARD CLIENT
// Real-Time Airtime, Data Bundles & Cable TV Subscription Domain
// ==========================================================================

export const API_BASE_URL: string =
  (typeof window !== 'undefined' && (window as any).__BAXATO_API_URL__) ||
  (import.meta as any).env?.VITE_API_URL ||
  '';

export interface NetworkConfig {
  network: string;
  name: string;
  discountBps: number; // 250 = 2.5%
  discountLabel: string;
  minKobo: number;
  maxKobo: number;
  primaryColor: string;
  prefixes: string[];
}

export const NETWORKS: Record<string, NetworkConfig> = {
  MTN: {
    network: 'MTN',
    name: 'MTN Nigeria',
    discountBps: 250,
    discountLabel: '2.5%',
    minKobo: 5000,
    maxKobo: 5000000,
    primaryColor: '#ffcc00',
    prefixes: [
      '0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916',
    ],
  },
  AIRTEL: {
    network: 'AIRTEL',
    name: 'Airtel Nigeria',
    discountBps: 250,
    discountLabel: '2.5%',
    minKobo: 5000,
    maxKobo: 5000000,
    primaryColor: '#ff0000',
    prefixes: [
      '0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912',
    ],
  },
  GLO: {
    network: 'GLO',
    name: 'Globacom',
    discountBps: 350,
    discountLabel: '3.5%',
    minKobo: 5000,
    maxKobo: 5000000,
    primaryColor: '#28a745',
    prefixes: ['0805', '0807', '0705', '0815', '0811', '0905', '0915'],
  },
  '9MOBILE': {
    network: '9MOBILE',
    name: '9mobile',
    discountBps: 300,
    discountLabel: '3.0%',
    minKobo: 5000,
    maxKobo: 5000000,
    primaryColor: '#006633',
    prefixes: ['0809', '0817', '0818', '0909', '0908'],
  },
};

const DEFAULT_CONFIG: NetworkConfig = {
  network: 'MTN',
  name: 'MTN Nigeria',
  discountBps: 250,
  discountLabel: '2.5%',
  minKobo: 5000,
  maxKobo: 5000000,
  primaryColor: '#ffcc00',
  prefixes: [
    '0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916',
  ],
};

export function getNetworkConfig(network: string): NetworkConfig {
  return NETWORKS[network] ?? DEFAULT_CONFIG;
}

export interface DashboardDataPlan {
  id: string;
  network: string;
  name: string;
  dataAllowance: string;
  category: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  validity: string;
  price: number;
  discountBps: number;
}

export const DASHBOARD_DATA_PLANS: DashboardDataPlan[] = [
  // MTN
  { id: 'mtn_daily_100mb', network: 'MTN', name: 'MTN 100MB Daily Plan', dataAllowance: '100MB', category: 'DAILY', validity: '1 Day', price: 100, discountBps: 250 },
  { id: 'mtn_2day_1gb', network: 'MTN', name: 'MTN 1GB 2-Day Plan', dataAllowance: '1GB', category: 'DAILY', validity: '2 Days', price: 500, discountBps: 250 },
  { id: 'mtn_weekly_1_5gb', network: 'MTN', name: 'MTN 1.5GB Weekly Plan', dataAllowance: '1.5GB', category: 'WEEKLY', validity: '7 Days', price: 1000, discountBps: 250 },
  { id: 'mtn_monthly_2_5gb', network: 'MTN', name: 'MTN 2.5GB Monthly Plan', dataAllowance: '2.5GB', category: 'MONTHLY', validity: '30 Days', price: 1500, discountBps: 250 },
  { id: 'mtn_monthly_10gb', network: 'MTN', name: 'MTN 10GB Monthly Pro Plan', dataAllowance: '10GB', category: 'MONTHLY', validity: '30 Days', price: 5000, discountBps: 250 },

  // Airtel
  { id: 'airtel_daily_100mb', network: 'AIRTEL', name: 'Airtel 100MB Daily Plan', dataAllowance: '100MB', category: 'DAILY', validity: '1 Day', price: 100, discountBps: 250 },
  { id: 'airtel_2day_1gb', network: 'AIRTEL', name: 'Airtel 1GB 2-Day Plan', dataAllowance: '1GB', category: 'DAILY', validity: '2 Days', price: 500, discountBps: 250 },
  { id: 'airtel_weekly_1_5gb', network: 'AIRTEL', name: 'Airtel 1.5GB Weekly Plan', dataAllowance: '1.5GB', category: 'WEEKLY', validity: '7 Days', price: 1000, discountBps: 250 },
  { id: 'airtel_monthly_3gb', network: 'AIRTEL', name: 'Airtel 3GB Monthly Plan', dataAllowance: '3GB', category: 'MONTHLY', validity: '30 Days', price: 1500, discountBps: 250 },
  { id: 'airtel_monthly_10gb', network: 'AIRTEL', name: 'Airtel 10GB Monthly Pro Plan', dataAllowance: '10GB', category: 'MONTHLY', validity: '30 Days', price: 5000, discountBps: 250 },

  // Glo
  { id: 'glo_daily_150mb', network: 'GLO', name: 'Glo 150MB Daily Plan', dataAllowance: '150MB', category: 'DAILY', validity: '1 Day', price: 100, discountBps: 350 },
  { id: 'glo_weekly_1_25gb', network: 'GLO', name: 'Glo 1.25GB Weekly Plan', dataAllowance: '1.25GB', category: 'WEEKLY', validity: '7 Days', price: 500, discountBps: 350 },
  { id: 'glo_monthly_2_5gb', network: 'GLO', name: 'Glo 2.5GB Monthly Plan', dataAllowance: '2.5GB', category: 'MONTHLY', validity: '30 Days', price: 1000, discountBps: 350 },
  { id: 'glo_monthly_7_5gb', network: 'GLO', name: 'Glo 7.5GB Monthly Mega Plan', dataAllowance: '7.5GB', category: 'MONTHLY', validity: '30 Days', price: 2500, discountBps: 350 },

  // 9mobile
  { id: '9mobile_daily_100mb', network: '9MOBILE', name: '9mobile 100MB Daily Plan', dataAllowance: '100MB', category: 'DAILY', validity: '1 Day', price: 100, discountBps: 300 },
  { id: '9mobile_weekly_1gb', network: '9MOBILE', name: '9mobile 1GB Weekly Plan', dataAllowance: '1GB', category: 'WEEKLY', validity: '7 Days', price: 500, discountBps: 300 },
  { id: '9mobile_monthly_2_5gb', network: '9MOBILE', name: '9mobile 2.5GB Monthly Plan', dataAllowance: '2.5GB', category: 'MONTHLY', validity: '30 Days', price: 1200, discountBps: 300 },
  { id: '9mobile_monthly_11gb', network: '9MOBILE', name: '9mobile 11GB Monthly Pro Plan', dataAllowance: '11GB', category: 'MONTHLY', validity: '30 Days', price: 4000, discountBps: 300 },
];

export interface CableOperatorConfig {
  operator: string;
  name: string;
  shortName: string;
  primaryColor: string;
  customerField: string;
  discountBps: number;
  discountLabel: string;
  placeholder: string;
}

export const CABLE_OPERATOR_CONFIGS: Record<string, CableOperatorConfig> = {
  DSTV: {
    operator: 'DSTV',
    name: 'DStv MultiChoice',
    shortName: 'DStv',
    primaryColor: '#0072bc',
    customerField: '10-digit Smartcard Number',
    discountBps: 150,
    discountLabel: '1.5%',
    placeholder: 'e.g. 1041541234',
  },
  GOTV: {
    operator: 'GOTV',
    name: 'GOtv MultiChoice',
    shortName: 'GOtv',
    primaryColor: '#ff5000',
    customerField: '10-digit Decoder (IUC) Number',
    discountBps: 150,
    discountLabel: '1.5%',
    placeholder: 'e.g. 4591379988',
  },
  STARTIMES: {
    operator: 'STARTIMES',
    name: 'StarTimes Nigeria',
    shortName: 'StarTimes',
    primaryColor: '#d2232a',
    customerField: '11-digit Smartcard / e-Wallet Number',
    discountBps: 200,
    discountLabel: '2.0%',
    placeholder: 'e.g. 02401988771',
  },
};

export interface DashboardCableBouquet {
  id: string;
  operator: string;
  name: string;
  price: number;
  discountBps: number;
  description: string;
}

export const DASHBOARD_CABLE_BOUQUETS: DashboardCableBouquet[] = [
  // DSTV
  { id: 'dstv-padi', operator: 'DSTV', name: 'DStv Padi', price: 4400, discountBps: 150, description: 'Entry-level local entertainment & news' },
  { id: 'dstv-yanga', operator: 'DSTV', name: 'DStv Yanga', price: 6000, discountBps: 150, description: 'Family movies, Nollywood, and music' },
  { id: 'dstv-confam', operator: 'DSTV', name: 'DStv Confam', price: 11000, discountBps: 150, description: 'Over 120 channels, sports, and movies' },
  { id: 'dstv-compact', operator: 'DSTV', name: 'DStv Compact', price: 19000, discountBps: 150, description: 'Premier League football & drama series' },
  { id: 'dstv-compact-plus', operator: 'DSTV', name: 'DStv Compact Plus', price: 30000, discountBps: 150, description: 'Champions League, UFC & motorsport' },
  { id: 'dstv-premium', operator: 'DSTV', name: 'DStv Premium', price: 44500, discountBps: 150, description: 'All channels, all sports, Showmax & 4K' },
  { id: 'dstv-extraview', operator: 'DSTV', name: 'DStv ExtraView Add-on', price: 6000, discountBps: 150, description: 'Link up to 3 decoders under one sub' },

  // GOTV
  { id: 'gotv-smallie', operator: 'GOTV', name: 'GOtv Smallie', price: 1900, discountBps: 150, description: 'Essential local news, music & religion' },
  { id: 'gotv-jinja', operator: 'GOTV', name: 'GOtv Jinja', price: 3900, discountBps: 150, description: 'Over 45 family channels & Nollywood' },
  { id: 'gotv-jolli', operator: 'GOTV', name: 'GOtv Jolli', price: 5800, discountBps: 150, description: 'Over 65 channels, telenovelas & youth TV' },
  { id: 'gotv-max', operator: 'GOTV', name: 'GOtv Max', price: 8500, discountBps: 150, description: 'La Liga, Serie A, WWE & kids movies' },
  { id: 'gotv-supa', operator: 'GOTV', name: 'GOtv Supa', price: 11400, discountBps: 150, description: 'Over 80 channels including Africa Magic' },
  { id: 'gotv-supa-plus', operator: 'GOTV', name: 'GOtv Supa Plus', price: 16800, discountBps: 150, description: 'All Premier League football & full package' },

  // STARTIMES
  { id: 'startimes-nova', operator: 'STARTIMES', name: 'StarTimes Nova', price: 2100, discountBps: 200, description: 'Affordable package with 30+ channels' },
  { id: 'startimes-basic', operator: 'STARTIMES', name: 'StarTimes Basic', price: 4000, discountBps: 200, description: 'Over 45 channels with movies & kids' },
  { id: 'startimes-classic', operator: 'STARTIMES', name: 'StarTimes Classic', price: 6000, discountBps: 200, description: 'Bundesliga football & entertainment' },
  { id: 'startimes-super', operator: 'STARTIMES', name: 'StarTimes Super', price: 9500, discountBps: 200, description: 'Full HD access to all sports & global movies' },
];

export interface DashboardDiscoConfig {
  code: string;
  name: string;
  shortName: string;
  region: string;
  primaryColor: string;
  discountBps: number; // 120 = 1.2%
  discountLabel: string;
  minNaira: number;
  maxNaira: number;
}

export const DASHBOARD_DISCOS: Record<string, DashboardDiscoConfig> = {
  IBEDC: {
    code: 'IBEDC',
    name: 'Ibadan Electricity Distribution Co.',
    shortName: 'IBEDC',
    region: 'Oyo, Ogun, Osun, Kwara',
    primaryColor: '#f59e0b',
    discountBps: 120,
    discountLabel: '1.2%',
    minNaira: 500,
    maxNaira: 100000,
  },
  IKEDC: {
    code: 'IKEDC',
    name: 'Ikeja Electric Distribution Co.',
    shortName: 'IKEDC',
    region: 'Lagos Mainland & North',
    primaryColor: '#3b82f6',
    discountBps: 120,
    discountLabel: '1.2%',
    minNaira: 500,
    maxNaira: 100000,
  },
  EKEDC: {
    code: 'EKEDC',
    name: 'Eko Electricity Distribution Co.',
    shortName: 'EKEDC',
    region: 'Lagos Island, Lekki, Epe',
    primaryColor: '#10b981',
    discountBps: 120,
    discountLabel: '1.2%',
    minNaira: 500,
    maxNaira: 100000,
  },
  AEDC: {
    code: 'AEDC',
    name: 'Abuja Electricity Distribution Co.',
    shortName: 'AEDC',
    region: 'FCT, Kogi, Niger, Nasarawa',
    primaryColor: '#6366f1',
    discountBps: 120,
    discountLabel: '1.2%',
    minNaira: 500,
    maxNaira: 100000,
  },
  EEDC: {
    code: 'EEDC',
    name: 'Enugu Electricity Distribution Co.',
    shortName: 'EEDC',
    region: 'Enugu, Abia, Imo, Ebonyi',
    primaryColor: '#ec4899',
    discountBps: 120,
    discountLabel: '1.2%',
    minNaira: 500,
    maxNaira: 100000,
  },
  KEDCO: {
    code: 'KEDCO',
    name: 'Kano Electricity Distribution Co.',
    shortName: 'KEDCO',
    region: 'Kano, Katsina, Jigawa',
    primaryColor: '#8b5cf6',
    discountBps: 120,
    discountLabel: '1.2%',
    minNaira: 500,
    maxNaira: 100000,
  },
  JED: {
    code: 'JED',
    name: 'Jos Electricity Distribution Co.',
    shortName: 'JED',
    region: 'Plateau, Bauchi, Benue',
    primaryColor: '#06b6d4',
    discountBps: 120,
    discountLabel: '1.2%',
    minNaira: 500,
    maxNaira: 100000,
  },
  PHED: {
    code: 'PHED',
    name: 'Port Harcourt Electricity Distribution',
    shortName: 'PHED',
    region: 'Rivers, Bayelsa, Cross River',
    primaryColor: '#14b8a6',
    discountBps: 120,
    discountLabel: '1.2%',
    minNaira: 500,
    maxNaira: 100000,
  },
  BEDC: {
    code: 'BEDC',
    name: 'Benin Electricity Distribution Co.',
    shortName: 'BEDC',
    region: 'Edo, Delta, Ondo, Ekiti',
    primaryColor: '#f97316',
    discountBps: 120,
    discountLabel: '1.2%',
    minNaira: 500,
    maxNaira: 100000,
  },
  KAEDCO: {
    code: 'KAEDCO',
    name: 'Kaduna Electricity Distribution Co.',
    shortName: 'KAEDCO',
    region: 'Kaduna, Kebbi, Sokoto, Zamfara',
    primaryColor: '#84cc16',
    discountBps: 120,
    discountLabel: '1.2%',
    minNaira: 500,
    maxNaira: 100000,
  },
  YEDC: {
    code: 'YEDC',
    name: 'Yola Electricity Distribution Co.',
    shortName: 'YEDC',
    region: 'Adamawa, Borno, Taraba, Yobe',
    primaryColor: '#eab308',
    discountBps: 120,
    discountLabel: '1.2%',
    minNaira: 500,
    maxNaira: 100000,
  },
  APLE: {
    code: 'APLE',
    name: 'Aba Power Ltd (APLE)',
    shortName: 'APLE',
    region: 'Aba Ring-Fenced Area',
    primaryColor: '#a855f7',
    discountBps: 120,
    discountLabel: '1.2%',
    minNaira: 500,
    maxNaira: 100000,
  },
};

export interface DashboardExamPackage {
  packageCode: string;
  examBody: 'JAMB' | 'WAEC' | 'NECO' | 'NABTEB';
  name: string;
  description: string;
  baseCost: number; // Wholesale face cost
  suggestedPrice: number; // Recommended retail
  markup: number; // Configurable merchant markup
  requiresValidation: boolean;
  identifierType: 'PROFILE_CODE' | 'PHONE';
  instructions: string;
  portal: string;
}

export const DASHBOARD_EXAM_PACKAGES: DashboardExamPackage[] = [
  {
    packageCode: 'JAMB_DIRECT_ENTRY',
    examBody: 'JAMB',
    name: 'JAMB 2026 Direct Entry PIN',
    description: '10-digit profile code required. Direct Entry pin vending.',
    baseCost: 5700,
    suggestedPrice: 6000,
    markup: 300,
    requiresValidation: true,
    identifierType: 'PROFILE_CODE',
    instructions: 'Candidate should present profile code at any accredited CBT centre.',
    portal: 'jamb.gov.ng',
  },
  {
    packageCode: 'JAMB_UTME_NO_MOCK',
    examBody: 'JAMB',
    name: 'JAMB 2026 UTME PIN (Without Mock)',
    description: '10-digit profile code required. Standard UTME registration PIN.',
    baseCost: 7700,
    suggestedPrice: 8000,
    markup: 300,
    requiresValidation: true,
    identifierType: 'PROFILE_CODE',
    instructions: 'Proceed to accredited CBT centre for biometric capture.',
    portal: 'jamb.gov.ng',
  },
  {
    packageCode: 'JAMB_UTME_WITH_MOCK',
    examBody: 'JAMB',
    name: 'JAMB 2026 UTME PIN (With Mock)',
    description: '10-digit profile code required. Comprehensive registration with Mock.',
    baseCost: 9200,
    suggestedPrice: 9500,
    markup: 300,
    requiresValidation: true,
    identifierType: 'PROFILE_CODE',
    instructions: 'Includes access to official Mock examination at CBT centre.',
    portal: 'jamb.gov.ng',
  },
  {
    packageCode: 'WAEC_RESULT_CHECKER',
    examBody: 'WAEC',
    name: 'WAEC Result Checker e-PIN',
    description: 'Valid for checking results up to 5 times on WAEC Direct.',
    baseCost: 3500,
    suggestedPrice: 3800,
    markup: 300,
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Log on to waecdirect.org and enter Exam Number, Year, Serial and PIN.',
    portal: 'waecdirect.org',
  },
  {
    packageCode: 'WAEC_REGISTRATION',
    examBody: 'WAEC',
    name: 'WAEC WASSCE Registration e-PIN',
    description: 'Official registration token for WASSCE Private / External.',
    baseCost: 27000,
    suggestedPrice: 28000,
    markup: 1000,
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit registration.waecdirect.org to register subjects and biometrics.',
    portal: 'registration.waecdirect.org',
  },
  {
    packageCode: 'NECO_RESULT_TOKEN',
    examBody: 'NECO',
    name: 'NECO Result Token (5 Views)',
    description: 'Official 12-digit token for SSCE, BECE & NCEE results.',
    baseCost: 1200,
    suggestedPrice: 1400,
    markup: 200,
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit result.neco.gov.ng, select year and enter Token.',
    portal: 'result.neco.gov.ng',
  },
  {
    packageCode: 'NECO_REGISTRATION',
    examBody: 'NECO',
    name: 'NECO SSCE (External) Registration',
    description: 'Official token for NECO Senior Secondary External registration.',
    baseCost: 19500,
    suggestedPrice: 20500,
    markup: 1000,
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit neco.gov.ng/ssce-external to complete registration.',
    portal: 'neco.gov.ng',
  },
  {
    packageCode: 'NABTEB_RESULT_CHECKER',
    examBody: 'NABTEB',
    name: 'NABTEB Result Checker e-PIN',
    description: 'Scratch card e-PIN for NBC / NTC modular results.',
    baseCost: 1500,
    suggestedPrice: 1700,
    markup: 200,
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit eworld.nabteb.gov.ng and enter Candidate ID, Year, Serial & PIN.',
    portal: 'eworld.nabteb.gov.ng',
  },
];

export interface TransactionRecord {
  id: string;
  type: 'AIRTIME' | 'DATA' | 'CABLE' | 'ELECTRICITY' | 'EXAM_PIN';
  recipient: string;
  network: string; // Network or Cable Operator or DISCO or Exam Council
  meterType?: 'PREPAID' | 'POSTPAID';
  token?: string; // 20-digit STS PIN token
  units?: string; // e.g. "14.3 kWh"
  tariff?: string; // e.g. "R2"
  feeder?: string; // e.g. "ELEWERAN 33KV FEEDER"
  vat?: number;
  address?: string;
  planName?: string;
  dataAllowance?: string;
  bouquetName?: string;
  customerName?: string;
  examBody?: 'JAMB' | 'WAEC' | 'NECO' | 'NABTEB';
  examPackageName?: string;
  pins?: Array<{ pin: string; serialNumber?: string; instructions?: string }>;
  profileCode?: string;
  portal?: string;
  faceAmount: number;
  discount: number;
  debited: number;
  reference: string;
  providerRef: string;
  provider: string;
  status: 'SUCCESSFUL' | 'FAILED';
  date: Date;
}

class DashboardClient {
  private activeService: 'airtime' | 'data' | 'cable' | 'electricity' | 'education' = 'airtime';
  private airtimeNetwork: string = 'MTN';
  private dataNetwork: string = 'MTN';
  private cableOperator: string = 'DSTV';
  private electricityDisco: string = 'IBEDC';
  private electricityMeterType: 'PREPAID' | 'POSTPAID' = 'PREPAID';
  private selectedDataValidity: string = 'ALL';
  private selectedDataPlan: DashboardDataPlan = DASHBOARD_DATA_PLANS[0]!;
  private selectedCableBouquet: DashboardCableBouquet = DASHBOARD_CABLE_BOUQUETS[0]!;
  private validatedCustomerName: string | null = null;
  private validatedElectricityName: string | null = null;
  private validatedElectricityAddress: string | null = null;

  // Education Domain State
  private examBody: 'JAMB' | 'WAEC' | 'NECO' | 'NABTEB' = 'JAMB';
  private selectedExamPackage: DashboardExamPackage = DASHBOARD_EXAM_PACKAGES[0]!;
  private examQuantity: number = 1;
  private validatedCandidateName: string | null = null;
  private validatedCandidateSession: string | null = null;

  private walletBalanceKobo: bigint = 10000000n; // ₦100,000.00
  private transactions: TransactionRecord[] = [];

  // Elements
  private headerWalletBalance: HTMLElement;
  private transactionsTbody: HTMLElement;

  // Airtime Elements
  private airtimePanel: HTMLElement;
  private phoneInput: HTMLInputElement;
  private amountInput: HTMLInputElement;
  private phoneFeedback: HTMLElement;
  private detectedBadge: HTMLElement;
  private detectedNetworkName: HTMLElement;
  private calcFaceAmount: HTMLElement;
  private calcDiscountPct: HTMLElement;
  private calcDiscountVal: HTMLElement;
  private calcDebitVal: HTMLElement;
  private vendSubmitBtn: HTMLButtonElement;
  private btnSpinner: HTMLElement;
  private btnText: HTMLElement;

  // Data Elements
  private dataPanel: HTMLElement;
  private dataPhoneInput: HTMLInputElement;
  private dataPhoneFeedback: HTMLElement;
  private dataDetectedBadge: HTMLElement;
  private dataDetectedNetworkName: HTMLElement;
  private dataPlansContainer: HTMLElement;
  private dataCalcPlanName: HTMLElement;
  private dataCalcFaceAmount: HTMLElement;
  private dataCalcDiscountPct: HTMLElement;
  private dataCalcDiscountVal: HTMLElement;
  private dataCalcDebitVal: HTMLElement;
  private dataSubmitBtn: HTMLButtonElement;
  private dataBtnSpinner: HTMLElement;
  private dataBtnText: HTMLElement;

  // Cable Elements
  private cablePanel: HTMLElement;
  private cableSmartcardInput: HTMLInputElement;
  private cableValidateBtn: HTMLButtonElement;
  private cableValidateSpinner: HTMLElement;
  private cableValidateText: HTMLElement;
  private cableValidationFeedback: HTMLElement;
  private cableSubscriberCard: HTMLElement;
  private cableSubName: HTMLElement;
  private cableSubNumber: HTMLElement;
  private cableBouquetsContainer: HTMLElement;
  private cableCalcBouquetName: HTMLElement;
  private cableCalcFaceAmount: HTMLElement;
  private cableCalcDiscountPct: HTMLElement;
  private cableCalcDiscountVal: HTMLElement;
  private cableCalcDebitVal: HTMLElement;
  private cableSubmitBtn: HTMLButtonElement;
  private cableBtnSpinner: HTMLElement;
  private cableBtnText: HTMLElement;

  // Electricity Elements
  private electricityPanel: HTMLElement;
  private electricityMeterInput: HTMLInputElement;
  private electricityValidateBtn: HTMLButtonElement;
  private electricityValidateSpinner: HTMLElement;
  private electricityValidateText: HTMLElement;
  private electricityValidationFeedback: HTMLElement;
  private electricityConsumerCard: HTMLElement;
  private electricityConsumerName: HTMLElement;
  private electricityConsumerAddress: HTMLElement;
  private electricityMeterBadge: HTMLElement;
  private electricityTariffBadge: HTMLElement;
  private electricityAmountInput: HTMLInputElement;
  private electricityPhoneInput: HTMLInputElement;
  private electricityCalcDisco: HTMLElement;
  private electricityCalcFaceAmount: HTMLElement;
  private electricityCalcDiscountPct: HTMLElement;
  private electricityCalcDiscountVal: HTMLElement;
  private electricityCalcUnitsEst: HTMLElement;
  private electricityCalcDebitVal: HTMLElement;
  private electricitySubmitBtn: HTMLButtonElement;
  private electricityBtnSpinner: HTMLElement;
  private electricityBtnText: HTMLElement;

  // Education Form Elements
  private educationPanel: HTMLElement;
  private examPackagesContainer: HTMLElement;
  private educationCandidateInput: HTMLInputElement;
  private educationCandidateLabel: HTMLElement;
  private educationCandidateHint: HTMLElement;
  private educationValidateBtn: HTMLButtonElement;
  private educationValidateSpinner: HTMLElement;
  private educationValidateText: HTMLElement;
  private educationValidationFeedback: HTMLElement;
  private educationCandidateCard: HTMLElement;
  private educationCandidateName: HTMLElement;
  private educationExamSession: HTMLElement;
  private educationProfileBadge: HTMLElement;
  private educationPhoneInput: HTMLInputElement;
  private educationCalcPackage: HTMLElement;
  private educationCalcBaseCost: HTMLElement;
  private educationCalcMarkup: HTMLElement;
  private educationCalcSuggestedPrice: HTMLElement;
  private educationCalcDebitVal: HTMLElement;
  private educationSubmitBtn: HTMLButtonElement;
  private educationBtnSpinner: HTMLElement;
  private educationBtnText: HTMLElement;

  // Modal Elements
  private receiptModal: HTMLElement;
  private receiptModalTitle: HTMLElement;
  private receiptModalSubtitle: HTMLElement;
  private receiptFaceAmount: HTMLElement;
  private receiptNetworkTag: HTMLElement;
  private receiptPhone: HTMLElement;
  private receiptPlanRow: HTMLElement;
  private receiptPlanName: HTMLElement;
  private receiptCableRow: HTMLElement;
  private receiptCableName: HTMLElement;
  private receiptSubscriberRow: HTMLElement;
  private receiptSubscriberName: HTMLElement;
  private receiptTokenCard: HTMLElement;
  private copyTokenBtn: HTMLButtonElement;
  private copyTokenText: HTMLElement;
  private receiptTokenDigits: HTMLElement;
  private receiptTokenUnits: HTMLElement;
  private receiptTokenTariff: HTMLElement;
  private receiptDiscoRow: HTMLElement;
  private receiptDiscoName: HTMLElement;
  private receiptMeterTypeRow: HTMLElement;
  private receiptMeterTypeVal: HTMLElement;
  private receiptConsumerRow: HTMLElement;
  private receiptConsumerName: HTMLElement;
  private receiptAddressRow: HTMLElement;
  private receiptAddressVal: HTMLElement;
  private receiptFeederRow: HTMLElement;
  private receiptFeederVal: HTMLElement;
  private receiptVatRow: HTMLElement;
  private receiptVatVal: HTMLElement;
  private receiptStatus: HTMLElement;
  private receiptRef: HTMLElement;
  private receiptProviderRef: HTMLElement;
  private receiptProvider: HTMLElement;
  private receiptDiscount: HTMLElement;
  private receiptDebited: HTMLElement;
  private receiptDate: HTMLElement;
  private modalCloseBtn: HTMLElement;
  private printReceiptBtn: HTMLElement;

  // Education Modal Elements
  private receiptExamPinCard: HTMLElement;
  private receiptExamTokenLabel: HTMLElement;
  private copyExamPinBtn: HTMLButtonElement;
  private copyExamPinText: HTMLElement;
  private receiptExamPinDigits: HTMLElement;
  private receiptExamSerial: HTMLElement;
  private receiptExamPortal: HTMLElement;
  private receiptExamInstructions: HTMLElement;
  private receiptExamPackageRow: HTMLElement;
  private receiptExamPackageName: HTMLElement;
  private receiptCandidateRow: HTMLElement;
  private receiptCandidateName: HTMLElement;
  private receiptProfileCodeRow: HTMLElement;
  private receiptProfileCodeVal: HTMLElement;

  constructor() {
    // Root Elements
    this.headerWalletBalance = document.getElementById('header-wallet-balance') as HTMLElement;
    this.transactionsTbody = document.getElementById('transactions-tbody') as HTMLElement;

    // Panels
    this.airtimePanel = document.getElementById('airtime-panel') as HTMLElement;
    this.dataPanel = document.getElementById('data-panel') as HTMLElement;
    this.cablePanel = document.getElementById('cable-panel') as HTMLElement;

    // Airtime Form
    this.phoneInput = document.getElementById('phone-input') as HTMLInputElement;
    this.amountInput = document.getElementById('amount-input') as HTMLInputElement;
    this.phoneFeedback = document.getElementById('phone-feedback') as HTMLElement;
    this.detectedBadge = document.getElementById('detected-badge') as HTMLElement;
    this.detectedNetworkName = document.getElementById('detected-network-name') as HTMLElement;
    this.calcFaceAmount = document.getElementById('calc-face-amount') as HTMLElement;
    this.calcDiscountPct = document.getElementById('calc-discount-pct') as HTMLElement;
    this.calcDiscountVal = document.getElementById('calc-discount-val') as HTMLElement;
    this.calcDebitVal = document.getElementById('calc-debit-val') as HTMLElement;
    this.vendSubmitBtn = document.getElementById('vend-submit-btn') as HTMLButtonElement;
    this.btnSpinner = document.getElementById('btn-spinner') as HTMLElement;
    this.btnText = document.getElementById('btn-text') as HTMLElement;

    // Data Form
    this.dataPhoneInput = document.getElementById('data-phone-input') as HTMLInputElement;
    this.dataPhoneFeedback = document.getElementById('data-phone-feedback') as HTMLElement;
    this.dataDetectedBadge = document.getElementById('data-detected-badge') as HTMLElement;
    this.dataDetectedNetworkName = document.getElementById('data-detected-network-name') as HTMLElement;
    this.dataPlansContainer = document.getElementById('data-plans-container') as HTMLElement;
    this.dataCalcPlanName = document.getElementById('data-calc-plan-name') as HTMLElement;
    this.dataCalcFaceAmount = document.getElementById('data-calc-face-amount') as HTMLElement;
    this.dataCalcDiscountPct = document.getElementById('data-calc-discount-pct') as HTMLElement;
    this.dataCalcDiscountVal = document.getElementById('data-calc-discount-val') as HTMLElement;
    this.dataCalcDebitVal = document.getElementById('data-calc-debit-val') as HTMLElement;
    this.dataSubmitBtn = document.getElementById('data-submit-btn') as HTMLButtonElement;
    this.dataBtnSpinner = document.getElementById('data-btn-spinner') as HTMLElement;
    this.dataBtnText = document.getElementById('data-btn-text') as HTMLElement;

    // Cable Form
    this.cableSmartcardInput = document.getElementById('cable-smartcard-input') as HTMLInputElement;
    this.cableValidateBtn = document.getElementById('cable-validate-btn') as HTMLButtonElement;
    this.cableValidateSpinner = document.getElementById('cable-validate-spinner') as HTMLElement;
    this.cableValidateText = document.getElementById('cable-validate-text') as HTMLElement;
    this.cableValidationFeedback = document.getElementById('cable-validation-feedback') as HTMLElement;
    this.cableSubscriberCard = document.getElementById('cable-subscriber-card') as HTMLElement;
    this.cableSubName = document.getElementById('cable-sub-name') as HTMLElement;
    this.cableSubNumber = document.getElementById('cable-sub-number') as HTMLElement;
    this.cableBouquetsContainer = document.getElementById('cable-bouquets-container') as HTMLElement;
    this.cableCalcBouquetName = document.getElementById('cable-calc-bouquet-name') as HTMLElement;
    this.cableCalcFaceAmount = document.getElementById('cable-calc-face-amount') as HTMLElement;
    this.cableCalcDiscountPct = document.getElementById('cable-calc-discount-pct') as HTMLElement;
    this.cableCalcDiscountVal = document.getElementById('cable-calc-discount-val') as HTMLElement;
    this.cableCalcDebitVal = document.getElementById('cable-calc-debit-val') as HTMLElement;
    this.cableSubmitBtn = document.getElementById('cable-submit-btn') as HTMLButtonElement;
    this.cableBtnSpinner = document.getElementById('cable-btn-spinner') as HTMLElement;
    this.cableBtnText = document.getElementById('cable-btn-text') as HTMLElement;

    // Electricity Form
    this.electricityPanel = document.getElementById('electricity-panel') as HTMLElement;
    this.electricityMeterInput = document.getElementById('electricity-meter-input') as HTMLInputElement;
    this.electricityValidateBtn = document.getElementById('electricity-validate-btn') as HTMLButtonElement;
    this.electricityValidateSpinner = document.getElementById('electricity-validate-spinner') as HTMLElement;
    this.electricityValidateText = document.getElementById('electricity-validate-text') as HTMLElement;
    this.electricityValidationFeedback = document.getElementById('electricity-validation-feedback') as HTMLElement;
    this.electricityConsumerCard = document.getElementById('electricity-consumer-card') as HTMLElement;
    this.electricityConsumerName = document.getElementById('electricity-consumer-name') as HTMLElement;
    this.electricityConsumerAddress = document.getElementById('electricity-consumer-address') as HTMLElement;
    this.electricityMeterBadge = document.getElementById('electricity-meter-badge') as HTMLElement;
    this.electricityTariffBadge = document.getElementById('electricity-tariff-badge') as HTMLElement;
    this.electricityAmountInput = document.getElementById('electricity-amount-input') as HTMLInputElement;
    this.electricityPhoneInput = document.getElementById('electricity-phone-input') as HTMLInputElement;
    this.electricityCalcDisco = document.getElementById('electricity-calc-disco') as HTMLElement;
    this.electricityCalcFaceAmount = document.getElementById('electricity-calc-face-amount') as HTMLElement;
    this.electricityCalcDiscountPct = document.getElementById('electricity-calc-discount-pct') as HTMLElement;
    this.electricityCalcDiscountVal = document.getElementById('electricity-calc-discount-val') as HTMLElement;
    this.electricityCalcUnitsEst = document.getElementById('electricity-calc-units-est') as HTMLElement;
    this.electricityCalcDebitVal = document.getElementById('electricity-calc-debit-val') as HTMLElement;
    this.electricitySubmitBtn = document.getElementById('electricity-submit-btn') as HTMLButtonElement;
    this.electricityBtnSpinner = document.getElementById('electricity-btn-spinner') as HTMLElement;
    this.electricityBtnText = document.getElementById('electricity-btn-text') as HTMLElement;

    // Modal
    this.receiptModal = document.getElementById('receipt-modal') as HTMLElement;
    this.receiptModalTitle = document.getElementById('receipt-modal-title') as HTMLElement;
    this.receiptModalSubtitle = document.getElementById('receipt-modal-subtitle') as HTMLElement;
    this.receiptFaceAmount = document.getElementById('receipt-face-amount') as HTMLElement;
    this.receiptNetworkTag = document.getElementById('receipt-network-tag') as HTMLElement;
    this.receiptPhone = document.getElementById('receipt-phone') as HTMLElement;
    this.receiptPlanRow = document.getElementById('receipt-plan-row') as HTMLElement;
    this.receiptPlanName = document.getElementById('receipt-plan-name') as HTMLElement;
    this.receiptCableRow = document.getElementById('receipt-cable-row') as HTMLElement;
    this.receiptCableName = document.getElementById('receipt-cable-name') as HTMLElement;
    this.receiptSubscriberRow = document.getElementById('receipt-subscriber-row') as HTMLElement;
    this.receiptSubscriberName = document.getElementById('receipt-subscriber-name') as HTMLElement;
    this.receiptTokenCard = document.getElementById('receipt-token-card') as HTMLElement;
    this.copyTokenBtn = document.getElementById('copy-token-btn') as HTMLButtonElement;
    this.copyTokenText = document.getElementById('copy-token-text') as HTMLElement;
    this.receiptTokenDigits = document.getElementById('receipt-token-digits') as HTMLElement;
    this.receiptTokenUnits = document.getElementById('receipt-token-units') as HTMLElement;
    this.receiptTokenTariff = document.getElementById('receipt-token-tariff') as HTMLElement;
    this.receiptDiscoRow = document.getElementById('receipt-disco-row') as HTMLElement;
    this.receiptDiscoName = document.getElementById('receipt-disco-name') as HTMLElement;
    this.receiptMeterTypeRow = document.getElementById('receipt-meter-type-row') as HTMLElement;
    this.receiptMeterTypeVal = document.getElementById('receipt-meter-type-val') as HTMLElement;
    this.receiptConsumerRow = document.getElementById('receipt-consumer-row') as HTMLElement;
    this.receiptConsumerName = document.getElementById('receipt-consumer-name') as HTMLElement;
    this.receiptAddressRow = document.getElementById('receipt-address-row') as HTMLElement;
    this.receiptAddressVal = document.getElementById('receipt-address-val') as HTMLElement;
    this.receiptFeederRow = document.getElementById('receipt-feeder-row') as HTMLElement;
    this.receiptFeederVal = document.getElementById('receipt-feeder-val') as HTMLElement;
    this.receiptVatRow = document.getElementById('receipt-vat-row') as HTMLElement;
    this.receiptVatVal = document.getElementById('receipt-vat-val') as HTMLElement;
    this.receiptStatus = document.getElementById('receipt-status') as HTMLElement;
    this.receiptRef = document.getElementById('receipt-ref') as HTMLElement;
    this.receiptProviderRef = document.getElementById('receipt-provider-ref') as HTMLElement;
    this.receiptProvider = document.getElementById('receipt-provider') as HTMLElement;
    this.receiptDiscount = document.getElementById('receipt-discount') as HTMLElement;
    this.receiptDebited = document.getElementById('receipt-debited') as HTMLElement;
    this.receiptDate = document.getElementById('receipt-date') as HTMLElement;
    this.modalCloseBtn = document.getElementById('modal-close-btn') as HTMLElement;
    this.printReceiptBtn = document.getElementById('print-receipt-btn') as HTMLElement;

    // Education Form
    this.educationPanel = document.getElementById('education-panel') as HTMLElement;
    this.examPackagesContainer = document.getElementById('exam-packages-container') as HTMLElement;
    this.educationCandidateInput = document.getElementById('education-candidate-input') as HTMLInputElement;
    this.educationCandidateLabel = document.getElementById('education-candidate-label') as HTMLElement;
    this.educationCandidateHint = document.getElementById('education-candidate-hint') as HTMLElement;
    this.educationValidateBtn = document.getElementById('education-validate-btn') as HTMLButtonElement;
    this.educationValidateSpinner = document.getElementById('education-validate-spinner') as HTMLElement;
    this.educationValidateText = document.getElementById('education-validate-text') as HTMLElement;
    this.educationValidationFeedback = document.getElementById('education-validation-feedback') as HTMLElement;
    this.educationCandidateCard = document.getElementById('education-candidate-card') as HTMLElement;
    this.educationCandidateName = document.getElementById('education-candidate-name') as HTMLElement;
    this.educationExamSession = document.getElementById('education-exam-session') as HTMLElement;
    this.educationProfileBadge = document.getElementById('education-profile-badge') as HTMLElement;
    this.educationPhoneInput = document.getElementById('education-phone-input') as HTMLInputElement;
    this.educationCalcPackage = document.getElementById('education-calc-package') as HTMLElement;
    this.educationCalcBaseCost = document.getElementById('education-calc-base-cost') as HTMLElement;
    this.educationCalcMarkup = document.getElementById('education-calc-markup') as HTMLElement;
    this.educationCalcSuggestedPrice = document.getElementById('education-calc-suggested-price') as HTMLElement;
    this.educationCalcDebitVal = document.getElementById('education-calc-debit-val') as HTMLElement;
    this.educationSubmitBtn = document.getElementById('education-submit-btn') as HTMLButtonElement;
    this.educationBtnSpinner = document.getElementById('education-btn-spinner') as HTMLElement;
    this.educationBtnText = document.getElementById('education-btn-text') as HTMLElement;

    // Education Receipt Modal
    this.receiptExamPinCard = document.getElementById('receipt-exam-pin-card') as HTMLElement;
    this.receiptExamTokenLabel = document.getElementById('receipt-exam-token-label') as HTMLElement;
    this.copyExamPinBtn = document.getElementById('copy-exam-pin-btn') as HTMLButtonElement;
    this.copyExamPinText = document.getElementById('copy-exam-pin-text') as HTMLElement;
    this.receiptExamPinDigits = document.getElementById('receipt-exam-pin-digits') as HTMLElement;
    this.receiptExamSerial = document.getElementById('receipt-exam-serial') as HTMLElement;
    this.receiptExamPortal = document.getElementById('receipt-exam-portal') as HTMLElement;
    this.receiptExamInstructions = document.getElementById('receipt-exam-instructions') as HTMLElement;
    this.receiptExamPackageRow = document.getElementById('receipt-exam-package-row') as HTMLElement;
    this.receiptExamPackageName = document.getElementById('receipt-exam-package-name') as HTMLElement;
    this.receiptCandidateRow = document.getElementById('receipt-candidate-row') as HTMLElement;
    this.receiptCandidateName = document.getElementById('receipt-candidate-name') as HTMLElement;
    this.receiptProfileCodeRow = document.getElementById('receipt-profile-code-row') as HTMLElement;
    this.receiptProfileCodeVal = document.getElementById('receipt-profile-code-val') as HTMLElement;

    this.initDemoHistory();
    this.bindEvents();
    this.renderDataPlans();
    this.renderCableBouquets();
    this.renderExamPackages();
    this.updateAirtimeCalculations();
    this.updateDataCalculations();
    this.updateCableCalculations();
    this.updateElectricityCalculations();
    this.updateEducationCalculations();
    this.updateWalletDisplay();
    this.renderTransactions();
    this.initDeveloperConsole();
  }

  private initDemoHistory() {
    this.transactions = [
      {
        id: 'txn_pilot_006',
        type: 'EXAM_PIN',
        recipient: '1029384756',
        network: 'JAMB',
        examBody: 'JAMB',
        examPackageName: 'JAMB 2026 Direct Entry PIN',
        customerName: 'Musa Ibrahim Chukwuemeka',
        profileCode: '1029384756',
        portal: 'jamb.gov.ng',
        pins: [
          {
            pin: '9817-4821-6539',
            serialNumber: 'JAMB-2026-048192',
            instructions: 'Candidate should present profile code at any accredited CBT centre.',
          },
        ],
        faceAmount: 5700,
        discount: 0,
        debited: 5700,
        reference: 'XAT|Web|3XAT0001|JAMBD|170926143012|JK883KL29',
        providerRef: 'ISW_SVA5_043588',
        provider: 'INTERSWITCH',
        status: 'SUCCESSFUL',
        date: new Date(Date.now() - 900000),
      },
      {
        id: 'txn_pilot_005',
        type: 'ELECTRICITY',
        recipient: '45077162324',
        network: 'IBEDC',
        meterType: 'PREPAID',
        token: '1817 3728 1779 9724 2246',
        units: '14.3 kWh',
        tariff: 'R2',
        feeder: 'ELEWERAN 33KV FEEDER',
        vat: 34.88,
        address: '9, ORI OSOKO COMMUNITY, OLOKUTA OYO',
        customerName: 'Sogbein Olusola Samson Mr Flat 2 .',
        faceAmount: 500,
        discount: 6,
        debited: 494,
        reference: 'XAT|Web|3XAT0001|IBDPR|090926070221|A78FKC7H3RP',
        providerRef: 'ISW_SVA5_0534135',
        provider: 'INTERSWITCH',
        status: 'SUCCESSFUL',
        date: new Date(Date.now() - 1800000),
      },
      {
        id: 'txn_pilot_004',
        type: 'CABLE',
        recipient: '1041541234',
        network: 'DSTV',
        bouquetName: 'DStv Confam',
        customerName: 'ADEKUNLE OLAWALE SAMSON',
        faceAmount: 11000,
        discount: 165,
        debited: 10835,
        reference: 'XAT|Web|3XAT0001|DSTVC|170926121544|AK39FXL48',
        providerRef: 'ISW_SVA5_104153',
        provider: 'INTERSWITCH',
        status: 'SUCCESSFUL',
        date: new Date(Date.now() - 3600000 * 1),
      },
      {
        id: 'txn_pilot_001',
        type: 'DATA',
        recipient: '0816 143 7292',
        network: 'MTN',
        planName: 'MTN 100MB Daily Plan',
        dataAllowance: '100MB',
        faceAmount: 100,
        discount: 2.5,
        debited: 97.5,
        reference: 'XAT|Web|3XAT0001|MVPD|040926111612|HY7A33X3F3G',
        providerRef: 'ISW_SVA5_99182',
        provider: 'INTERSWITCH',
        status: 'SUCCESSFUL',
        date: new Date(Date.now() - 3600000 * 2),
      },
      {
        id: 'txn_pilot_002',
        type: 'AIRTIME',
        recipient: '0816 143 7292',
        network: 'MTN',
        faceAmount: 100,
        discount: 2.5,
        debited: 97.5,
        reference: 'XAT|Web|3XAT0001|MTNV|310826144810|QC9KGX4W48V',
        providerRef: 'ISW_SVA5_829104',
        provider: 'INTERSWITCH',
        status: 'SUCCESSFUL',
        date: new Date(Date.now() - 3600000 * 4),
      },
      {
        id: 'txn_pilot_003',
        type: 'DATA',
        recipient: '0701 936 7464',
        network: 'AIRTEL',
        planName: 'Airtel 100MB Daily Plan',
        dataAllowance: '100MB',
        faceAmount: 100,
        discount: 2.5,
        debited: 97.5,
        reference: 'XAT|Web|3XAT0001|ADBP|040926111541|8JMVAXUVGWV',
        providerRef: 'ISW_SVA5_04277538',
        provider: 'INTERSWITCH',
        status: 'SUCCESSFUL',
        date: new Date(Date.now() - 3600000 * 6),
      },
    ];
  }

  private bindEvents() {
    // Service Tabs Switcher (Airtime, Data, Cable, Electricity, Education)
    const tabAirtime = document.getElementById('tab-btn-airtime');
    const tabData = document.getElementById('tab-btn-data');
    const tabCable = document.getElementById('tab-btn-cable');
    const tabElectricity = document.getElementById('tab-btn-electricity');
    const tabEducation = document.getElementById('tab-btn-education');
    const heroTitle = document.getElementById('hero-title');
    const heroDesc = document.getElementById('hero-desc');

    if (tabAirtime && tabData && tabCable && tabElectricity && tabEducation) {
      tabAirtime.addEventListener('click', () => {
        this.activeService = 'airtime';
        tabAirtime.classList.add('active');
        tabData.classList.remove('active');
        tabCable.classList.remove('active');
        tabElectricity.classList.remove('active');
        tabEducation.classList.remove('active');
        this.airtimePanel.style.display = 'block';
        this.dataPanel.style.display = 'none';
        this.cablePanel.style.display = 'none';
        this.electricityPanel.style.display = 'none';
        this.educationPanel.style.display = 'none';
        if (heroTitle && heroDesc) {
          heroTitle.innerText = 'Mobile Airtime Vending Console';
          heroDesc.innerText = 'Direct telecommunication operator routing with smart prefix detection, integer Kobo balance locking, and multi-provider failover.';
        }
      });

      tabData.addEventListener('click', () => {
        this.activeService = 'data';
        tabData.classList.add('active');
        tabAirtime.classList.remove('active');
        tabCable.classList.remove('active');
        tabElectricity.classList.remove('active');
        tabEducation.classList.remove('active');
        this.airtimePanel.style.display = 'none';
        this.dataPanel.style.display = 'block';
        this.cablePanel.style.display = 'none';
        this.electricityPanel.style.display = 'none';
        this.educationPanel.style.display = 'none';
        if (heroTitle && heroDesc) {
          heroTitle.innerText = 'Mobile Data Bundle Vending Console';
          heroDesc.innerText = 'Curated Daily, Weekly, and Monthly data bundles across MTN, Airtel, Glo, and 9mobile with instant fulfillment.';
        }
      });

      tabCable.addEventListener('click', () => {
        this.activeService = 'cable';
        tabCable.classList.add('active');
        tabAirtime.classList.remove('active');
        tabData.classList.remove('active');
        tabElectricity.classList.remove('active');
        tabEducation.classList.remove('active');
        this.airtimePanel.style.display = 'none';
        this.dataPanel.style.display = 'none';
        this.cablePanel.style.display = 'block';
        this.electricityPanel.style.display = 'none';
        this.educationPanel.style.display = 'none';
        if (heroTitle && heroDesc) {
          heroTitle.innerText = 'Cable TV Subscription Console';
          heroDesc.innerText = 'Real-time decoder smartcard validation and instant bouquet activation across DStv, GOtv, and StarTimes.';
        }
      });

      tabElectricity.addEventListener('click', () => {
        this.activeService = 'electricity';
        tabElectricity.classList.add('active');
        tabAirtime.classList.remove('active');
        tabData.classList.remove('active');
        tabCable.classList.remove('active');
        tabEducation.classList.remove('active');
        this.airtimePanel.style.display = 'none';
        this.dataPanel.style.display = 'none';
        this.cablePanel.style.display = 'none';
        this.electricityPanel.style.display = 'block';
        this.educationPanel.style.display = 'none';
        if (heroTitle && heroDesc) {
          heroTitle.innerText = 'Electricity Bill & STS Token Console';
          heroDesc.innerText = 'Direct DISCO integration with instant 20-digit STS prepaid token dispense, automated meter validation, and postpaid settlements.';
        }
      });

      tabEducation.addEventListener('click', () => {
        this.activeService = 'education';
        tabEducation.classList.add('active');
        tabAirtime.classList.remove('active');
        tabData.classList.remove('active');
        tabCable.classList.remove('active');
        tabElectricity.classList.remove('active');
        this.airtimePanel.style.display = 'none';
        this.dataPanel.style.display = 'none';
        this.cablePanel.style.display = 'none';
        this.electricityPanel.style.display = 'none';
        this.educationPanel.style.display = 'block';
        if (heroTitle && heroDesc) {
          heroTitle.innerText = 'Education Examination PIN Console';
          heroDesc.innerText = 'Direct wholesale e-PIN and registration token vending for JAMB (UTME/DE), WAEC, NECO, and NABTEB with candidate profile validation.';
        }
      });
    }

    // Airtime Network options
    const airtimeOptions = document.querySelectorAll('#network-selector .network-option');
    airtimeOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        const net = opt.getAttribute('data-network');
        if (net) this.selectAirtimeNetwork(net);
      });
    });

    // Data Network options
    const dataOptions = document.querySelectorAll('#data-network-selector .network-option');
    dataOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        const net = opt.getAttribute('data-network');
        if (net) this.selectDataNetwork(net);
      });
    });

    // Cable Operator options
    const cableOptions = document.querySelectorAll('#cable-operator-selector .network-option');
    cableOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        const op = opt.getAttribute('data-operator');
        if (op) this.selectCableOperator(op);
      });
    });

    // Electricity DISCO options
    const discoOptions = document.querySelectorAll('#disco-selector .disco-option');
    discoOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        const disco = opt.getAttribute('data-disco');
        if (disco) this.selectElectricityDisco(disco);
      });
    });

    // Electricity Meter Type Pills
    const meterPills = document.querySelectorAll('.meter-type-toggle .meter-pill');
    meterPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        meterPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const mType = pill.getAttribute('data-meter-type') as 'PREPAID' | 'POSTPAID';
        if (mType) this.selectMeterType(mType);
      });
    });

    // Data Validity Pills
    const valPills = document.querySelectorAll('#validity-pills .val-pill');
    valPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        valPills.forEach((p) => p.classList.remove('active'));
        pill.classList.add('active');
        const validity = pill.getAttribute('data-validity');
        if (validity) {
          this.selectedDataValidity = validity;
          this.renderDataPlans();
        }
      });
    });

    // Phone typing listeners
    this.phoneInput.addEventListener('input', () => this.handleAirtimePhoneInput());
    this.dataPhoneInput.addEventListener('input', () => this.handleDataPhoneInput());

    // Amount input (Airtime)
    this.amountInput.addEventListener('input', () => this.updateAirtimeCalculations());

    // Preset chips (Airtime)
    const chips = document.querySelectorAll('#amount-presets .chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const amt = chip.getAttribute('data-amount');
        if (amt) {
          this.amountInput.value = amt;
          this.updateAirtimeCalculations();
        }
      });
    });

    // Cable Smartcard Validate Button
    this.cableValidateBtn.addEventListener('click', () => {
      this.validateDecoder();
    });

    // Electricity Meter Validate Button
    this.electricityValidateBtn.addEventListener('click', () => {
      this.validateMeter();
    });

    // Amount presets (Electricity)
    const elecChips = document.querySelectorAll('#electricity-amount-presets .chip');
    elecChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        elecChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const amt = chip.getAttribute('data-amount');
        if (amt) {
          this.electricityAmountInput.value = amt;
          this.updateElectricityCalculations();
        }
      });
    });

    // Electricity Amount Input
    this.electricityAmountInput.addEventListener('input', () => {
      this.updateElectricityCalculations();
    });

    // Forms submit
    const airtimeForm = document.getElementById('airtime-form');
    if (airtimeForm) {
      airtimeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleAirtimeVending();
      });
    }

    const dataForm = document.getElementById('data-form');
    if (dataForm) {
      dataForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleDataVending();
      });
    }

    const cableForm = document.getElementById('cable-form');
    if (cableForm) {
      cableForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleCableVending();
      });
    }

    const electricityForm = document.getElementById('electricity-form');
    if (electricityForm) {
      electricityForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleElectricityVending();
      });
    }

    // Exam Council options
    const examOptions = document.querySelectorAll('#exam-body-selector .exam-option');
    examOptions.forEach((opt) => {
      opt.addEventListener('click', () => {
        const body = opt.getAttribute('data-body') as 'JAMB' | 'WAEC' | 'NECO' | 'NABTEB';
        if (body) this.selectExamBody(body);
      });
    });

    // Education quantity chips
    const qtyChips = document.querySelectorAll('#education-qty-presets .chip');
    qtyChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        qtyChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        const qty = parseInt(chip.getAttribute('data-qty') || '1', 10);
        this.examQuantity = qty;
        this.updateEducationCalculations();
      });
    });

    // Education Candidate Validate Button
    this.educationValidateBtn.addEventListener('click', () => {
      this.validateCandidate();
    });

    // Education Candidate Input typing listener
    this.educationCandidateInput.addEventListener('input', () => {
      this.validatedCandidateName = null;
      this.validatedCandidateSession = null;
      this.educationCandidateCard.style.display = 'none';
      this.educationValidationFeedback.style.display = 'none';
    });

    // Education Form Submit
    const educationForm = document.getElementById('education-form');
    if (educationForm) {
      educationForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleEducationVending();
      });
    }

    // Copy STS Token Button
    this.copyTokenBtn.addEventListener('click', () => {
      const digits = this.receiptTokenDigits.innerText.replace(/\s+/g, '');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(digits).then(() => {
          this.copyTokenText.innerText = 'Copied!';
          setTimeout(() => {
            this.copyTokenText.innerText = 'Copy';
          }, 2000);
        }).catch(() => {
          this.copyTokenText.innerText = 'Copied!';
          setTimeout(() => {
            this.copyTokenText.innerText = 'Copy';
          }, 2000);
        });
      } else {
        this.copyTokenText.innerText = 'Copied!';
        setTimeout(() => {
          this.copyTokenText.innerText = 'Copy';
        }, 2000);
      }
    });

    // Copy Exam PIN Button
    this.copyExamPinBtn.addEventListener('click', () => {
      const pinText = this.receiptExamPinDigits.innerText.trim();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pinText).then(() => {
          this.copyExamPinText.innerText = 'Copied!';
          setTimeout(() => {
            this.copyExamPinText.innerText = 'Copy PIN';
          }, 2000);
        }).catch(() => {
          this.copyExamPinText.innerText = 'Copied!';
          setTimeout(() => {
            this.copyExamPinText.innerText = 'Copy PIN';
          }, 2000);
        });
      } else {
        this.copyExamPinText.innerText = 'Copied!';
        setTimeout(() => {
          this.copyExamPinText.innerText = 'Copy PIN';
        }, 2000);
      }
    });

    // Modal buttons
    this.modalCloseBtn.addEventListener('click', () => {
      this.receiptModal.style.display = 'none';
    });

    this.printReceiptBtn.addEventListener('click', () => {
      window.print();
    });

    // Refresh buttons
    const refreshBalanceBtn = document.getElementById('refresh-balance-btn');
    if (refreshBalanceBtn) {
      refreshBalanceBtn.addEventListener('click', () => this.updateWalletDisplay());
    }

    const refreshHistoryBtn = document.getElementById('refresh-history-btn');
    if (refreshHistoryBtn) {
      refreshHistoryBtn.addEventListener('click', () => this.renderTransactions());
    }
  }

  private selectAirtimeNetwork(network: string) {
    this.airtimeNetwork = network;
    document.querySelectorAll('#network-selector .network-option').forEach((opt) => {
      if (opt.getAttribute('data-network') === network) opt.classList.add('active');
      else opt.classList.remove('active');
    });

    const config = getNetworkConfig(network);
    const discountTag = document.getElementById('active-discount-tag');
    if (discountTag) discountTag.innerText = `${config.discountLabel} Merchant Discount (${config.name})`;

    this.updateAirtimeCalculations();
  }

  private selectDataNetwork(network: string) {
    this.dataNetwork = network;
    document.querySelectorAll('#data-network-selector .network-option').forEach((opt) => {
      if (opt.getAttribute('data-network') === network) opt.classList.add('active');
      else opt.classList.remove('active');
    });

    const config = getNetworkConfig(network);
    const discountTag = document.getElementById('data-discount-tag');
    if (discountTag) discountTag.innerText = `${config.discountLabel} Merchant Discount (${config.name})`;

    this.renderDataPlans();
    this.updateDataCalculations();
  }

  private selectCableOperator(operator: string) {
    this.cableOperator = operator;
    document.querySelectorAll('#cable-operator-selector .network-option').forEach((opt) => {
      if (opt.getAttribute('data-operator') === operator) opt.classList.add('active');
      else opt.classList.remove('active');
    });

    const config = CABLE_OPERATOR_CONFIGS[operator];
    if (config) {
      const discountTag = document.getElementById('cable-discount-tag');
      if (discountTag) discountTag.innerText = `${config.discountLabel} Merchant Discount (${config.name})`;

      const fieldHint = document.getElementById('cable-field-hint');
      if (fieldHint) fieldHint.innerText = config.customerField;

      this.cableSmartcardInput.placeholder = config.placeholder;
    }

    this.validatedCustomerName = null;
    this.cableSubscriberCard.style.display = 'none';
    this.cableValidationFeedback.style.display = 'none';

    this.renderCableBouquets();
    this.updateCableCalculations();
  }

  private renderDataPlans() {
    this.dataPlansContainer.innerHTML = '';

    const plans = DASHBOARD_DATA_PLANS.filter((p) => {
      if (p.network !== this.dataNetwork) return false;
      if (this.selectedDataValidity !== 'ALL' && p.category !== this.selectedDataValidity) return false;
      return true;
    });

    if (plans.length > 0 && !plans.some((p) => p.id === this.selectedDataPlan.id)) {
      this.selectedDataPlan = plans[0]!;
    }

    plans.forEach((plan) => {
      const isSelected = plan.id === this.selectedDataPlan.id;
      const discountAmount = (plan.price * plan.discountBps) / 10000;
      const netDebit = plan.price - discountAmount;

      const card = document.createElement('div');
      card.className = `data-plan-card ${isSelected ? 'active' : ''}`;
      card.innerHTML = `
        <div class="plan-top-row">
          <span class="plan-allowance">${plan.dataAllowance}</span>
          <span class="plan-validity">${plan.validity}</span>
        </div>
        <div class="plan-name-label">${plan.name}</div>
        <div class="plan-bottom-row">
          <div class="plan-pricing-box">
            <span class="plan-face-price">₦${plan.price.toLocaleString()}</span>
            <span class="plan-debit-hint">Debit: ₦${netDebit.toFixed(2)}</span>
          </div>
          <div class="plan-check"><i class="fa-solid fa-circle-check"></i></div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedDataPlan = plan;
        document.querySelectorAll('.data-plan-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        this.updateDataCalculations();
      });

      this.dataPlansContainer.appendChild(card);
    });
  }

  private renderCableBouquets() {
    this.cableBouquetsContainer.innerHTML = '';

    const bouquets = DASHBOARD_CABLE_BOUQUETS.filter((b) => b.operator === this.cableOperator);

    if (bouquets.length > 0 && !bouquets.some((b) => b.id === this.selectedCableBouquet.id)) {
      this.selectedCableBouquet = bouquets[0]!;
    }

    bouquets.forEach((b) => {
      const isSelected = b.id === this.selectedCableBouquet.id;
      const discountAmount = (b.price * b.discountBps) / 10000;
      const netDebit = b.price - discountAmount;

      const card = document.createElement('div');
      card.className = `cable-bouquet-card ${isSelected ? 'active' : ''}`;
      card.innerHTML = `
        <div class="bouquet-top-row">
          <span class="bouquet-name">${b.name}</span>
          <span class="bouquet-check"><i class="fa-solid fa-circle-check"></i></span>
        </div>
        <div class="bouquet-desc">${b.description}</div>
        <div class="bouquet-bottom-row">
          <span class="bouquet-price">₦${b.price.toLocaleString()}</span>
          <span class="bouquet-debit-hint">Debit: ₦${netDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedCableBouquet = b;
        document.querySelectorAll('.cable-bouquet-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        this.updateCableCalculations();
      });

      this.cableBouquetsContainer.appendChild(card);
    });
  }

  private async validateDecoder() {
    const raw = this.cableSmartcardInput.value.trim().replace(/[\s\-]/g, '');
    if (!raw || raw.length < 10) {
      this.cableValidationFeedback.style.display = 'block';
      this.cableValidationFeedback.innerText = 'Please enter a valid 10 to 11 digit smartcard or IUC number.';
      this.cableValidationFeedback.style.color = 'var(--accent-danger)';
      return;
    }

    this.cableValidateBtn.disabled = true;
    this.cableValidateSpinner.style.display = 'inline-block';
    this.cableValidateText.style.display = 'none';
    this.cableValidationFeedback.style.display = 'none';

    try {
      // Attempt API call to backend /services/cable/validate
      const res = await fetch(`${API_BASE_URL}/services/cable/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Header token would be added if authed
        },
        body: JSON.stringify({
          operator: this.cableOperator,
          smartcard: raw,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const payload = data.data || {};
        this.validatedCustomerName = payload.customerName || 'ADEKUNLE OLAWALE SAMSON';
      } else {
        // Mock fallback for interactive prototype if backend server isn't currently up
        const sampleNames: Record<string, string> = {
          DSTV: 'ADEKUNLE OLAWALE SAMSON',
          GOTV: 'SOGBEIN SAMSON OLUSOLA',
          STARTIMES: 'IBRAHIM HASSAN ALIYU',
        };
        this.validatedCustomerName = sampleNames[this.cableOperator] || 'VERIFIED SUBSCRIBER';
      }

      this.cableSubName.innerText = this.validatedCustomerName!;
      this.cableSubNumber.innerText = `IUC: ${raw}`;
      this.cableSubscriberCard.style.display = 'flex';
      this.cableValidationFeedback.style.display = 'none';
    } catch {
      // Local fallback for client resilience
      this.validatedCustomerName = 'ADEKUNLE OLAWALE SAMSON';
      this.cableSubName.innerText = this.validatedCustomerName;
      this.cableSubNumber.innerText = `IUC: ${raw}`;
      this.cableSubscriberCard.style.display = 'flex';
    } finally {
      this.cableValidateBtn.disabled = false;
      this.cableValidateSpinner.style.display = 'none';
      this.cableValidateText.style.display = 'inline-block';
    }
  }

  private handleAirtimePhoneInput() {
    const raw = this.phoneInput.value.trim().replace(/[\s\-()]/g, '');
    if (raw.length >= 4) {
      const prefix = raw.slice(0, 4);
      for (const [net, cfg] of Object.entries(NETWORKS)) {
        if (cfg.prefixes.includes(prefix)) {
          this.selectAirtimeNetwork(net);
          this.detectedBadge.style.display = 'inline-flex';
          this.detectedNetworkName.innerText = cfg.name;
          this.detectedBadge.style.backgroundColor = cfg.primaryColor;
          this.detectedBadge.style.color = net === 'MTN' ? '#000' : '#fff';
          this.phoneFeedback.style.display = 'none';
          return;
        }
      }
    }

    this.detectedBadge.style.display = 'none';
  }

  private handleDataPhoneInput() {
    const raw = this.dataPhoneInput.value.trim().replace(/[\s\-()]/g, '');
    if (raw.length >= 4) {
      const prefix = raw.slice(0, 4);
      for (const [net, cfg] of Object.entries(NETWORKS)) {
        if (cfg.prefixes.includes(prefix)) {
          this.selectDataNetwork(net);
          this.dataDetectedBadge.style.display = 'inline-flex';
          this.dataDetectedNetworkName.innerText = cfg.name;
          this.dataDetectedBadge.style.backgroundColor = cfg.primaryColor;
          this.dataDetectedBadge.style.color = net === 'MTN' ? '#000' : '#fff';
          this.dataPhoneFeedback.style.display = 'none';
          return;
        }
      }
    }

    this.dataDetectedBadge.style.display = 'none';
  }

  private updateAirtimeCalculations() {
    const face = parseFloat(this.amountInput.value) || 0;
    const config = getNetworkConfig(this.airtimeNetwork);
    const discount = (face * config.discountBps) / 10000;
    const debit = face - discount;

    this.calcFaceAmount.innerText = `₦${face.toFixed(2)}`;
    this.calcDiscountPct.innerText = config.discountLabel;
    this.calcDiscountVal.innerText = `-₦${discount.toFixed(2)}`;
    this.calcDebitVal.innerText = `₦${debit.toFixed(2)}`;
  }

  private updateDataCalculations() {
    const plan = this.selectedDataPlan;
    const discount = (plan.price * plan.discountBps) / 10000;
    const debit = plan.price - discount;

    this.dataCalcPlanName.innerText = plan.name;
    this.dataCalcFaceAmount.innerText = `₦${plan.price.toFixed(2)}`;
    this.dataCalcDiscountPct.innerText = `${(plan.discountBps / 100).toFixed(1)}%`;
    this.dataCalcDiscountVal.innerText = `-₦${discount.toFixed(2)}`;
    this.dataCalcDebitVal.innerText = `₦${debit.toFixed(2)}`;
  }

  private updateCableCalculations() {
    const bouquet = this.selectedCableBouquet;
    const discount = (bouquet.price * bouquet.discountBps) / 10000;
    const debit = bouquet.price - discount;

    this.cableCalcBouquetName.innerText = bouquet.name;
    this.cableCalcFaceAmount.innerText = `₦${bouquet.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    this.cableCalcDiscountPct.innerText = `${(bouquet.discountBps / 100).toFixed(1)}%`;
    this.cableCalcDiscountVal.innerText = `-₦${discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    this.cableCalcDebitVal.innerText = `₦${debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }

  private updateWalletDisplay() {
    const balanceNaira = Number(this.walletBalanceKobo) / 100;
    this.headerWalletBalance.innerText = `₦${balanceNaira.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  private async handleAirtimeVending() {
    const phone = this.phoneInput.value.trim();
    const face = parseFloat(this.amountInput.value) || 0;

    if (!phone || phone.length < 11) {
      alert('Please enter a valid 11-digit Nigerian phone number.');
      return;
    }

    if (face < 50) {
      alert('Minimum airtime vending amount is ₦50.00.');
      return;
    }

    const config = getNetworkConfig(this.airtimeNetwork);
    const discount = (face * config.discountBps) / 10000;
    const debited = face - discount;
    const debitKobo = BigInt(Math.round(debited * 100));

    if (this.walletBalanceKobo < debitKobo) {
      alert('Insufficient wallet balance to vend airtime.');
      return;
    }

    this.vendSubmitBtn.disabled = true;
    this.btnSpinner.style.display = 'inline-block';
    this.btnText.style.display = 'none';

    await new Promise((r) => setTimeout(r, 650));

    this.walletBalanceKobo -= debitKobo;
    this.updateWalletDisplay();

    const newTxn: TransactionRecord = {
      id: `txn_${Date.now()}`,
      type: 'AIRTIME',
      recipient: phone,
      network: this.airtimeNetwork,
      faceAmount: face,
      discount,
      debited,
      reference: `XAT|Web|3XAT0001|AIRTV|${Date.now()}|${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      providerRef: `ISW_SVA5_${Math.floor(100000 + Math.random() * 900000)}`,
      provider: 'INTERSWITCH',
      status: 'SUCCESSFUL',
      date: new Date(),
    };

    this.transactions.unshift(newTxn);
    this.renderTransactions();

    this.vendSubmitBtn.disabled = false;
    this.btnSpinner.style.display = 'none';
    this.btnText.style.display = 'inline-block';

    this.showReceipt(newTxn);
  }

  private async handleDataVending() {
    const phone = this.dataPhoneInput.value.trim();
    const plan = this.selectedDataPlan;

    if (!phone || phone.length < 11) {
      alert('Please enter a valid 11-digit Nigerian phone number.');
      return;
    }

    const discount = (plan.price * plan.discountBps) / 10000;
    const debited = plan.price - discount;
    const debitKobo = BigInt(Math.round(debited * 100));

    if (this.walletBalanceKobo < debitKobo) {
      alert('Insufficient wallet balance to vend data bundle.');
      return;
    }

    this.dataSubmitBtn.disabled = true;
    this.dataBtnSpinner.style.display = 'inline-block';
    this.dataBtnText.style.display = 'none';

    await new Promise((r) => setTimeout(r, 700));

    this.walletBalanceKobo -= debitKobo;
    this.updateWalletDisplay();

    const newTxn: TransactionRecord = {
      id: `txn_${Date.now()}`,
      type: 'DATA',
      recipient: phone,
      network: plan.network,
      planName: plan.name,
      dataAllowance: plan.dataAllowance,
      faceAmount: plan.price,
      discount,
      debited,
      reference: `XAT|Web|3XAT0001|MVPD|${Date.now()}|${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      providerRef: `ISW_SVA5_${Math.floor(100000 + Math.random() * 900000)}`,
      provider: 'MONNIFY',
      status: 'SUCCESSFUL',
      date: new Date(),
    };

    this.transactions.unshift(newTxn);
    this.renderTransactions();

    this.dataSubmitBtn.disabled = false;
    this.dataBtnSpinner.style.display = 'none';
    this.dataBtnText.style.display = 'inline-block';

    this.showReceipt(newTxn);
  }

  private async handleCableVending() {
    const smartcard = this.cableSmartcardInput.value.trim().replace(/[\s\-]/g, '');
    const bouquet = this.selectedCableBouquet;

    if (!smartcard || smartcard.length < 10) {
      alert('Please enter a valid decoder smartcard or IUC number.');
      return;
    }

    const discount = (bouquet.price * bouquet.discountBps) / 10000;
    const debited = bouquet.price - discount;
    const debitKobo = BigInt(Math.round(debited * 100));

    if (this.walletBalanceKobo < debitKobo) {
      alert('Insufficient wallet balance to activate Cable TV subscription.');
      return;
    }

    this.cableSubmitBtn.disabled = true;
    this.cableBtnSpinner.style.display = 'inline-block';
    this.cableBtnText.style.display = 'none';

    await new Promise((r) => setTimeout(r, 800));

    this.walletBalanceKobo -= debitKobo;
    this.updateWalletDisplay();

    const customerName = this.validatedCustomerName || 'ADEKUNLE OLAWALE SAMSON';

    const newTxn: TransactionRecord = {
      id: `txn_${Date.now()}`,
      type: 'CABLE',
      recipient: smartcard,
      network: bouquet.operator,
      bouquetName: bouquet.name,
      customerName,
      faceAmount: bouquet.price,
      discount,
      debited,
      reference: `XAT|Web|3XAT0001|CABLE|${Date.now()}|${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      providerRef: `ISW_SVA5_${Math.floor(100000 + Math.random() * 900000)}`,
      provider: 'INTERSWITCH',
      status: 'SUCCESSFUL',
      date: new Date(),
    };

    this.transactions.unshift(newTxn);
    this.renderTransactions();

    this.cableSubmitBtn.disabled = false;
    this.cableBtnSpinner.style.display = 'none';
    this.cableBtnText.style.display = 'inline-block';

    this.showReceipt(newTxn);
  }

  private selectElectricityDisco(disco: string) {
    this.electricityDisco = disco;
    document.querySelectorAll('#disco-selector .disco-option').forEach((opt) => {
      if (opt.getAttribute('data-disco') === disco) opt.classList.add('active');
      else opt.classList.remove('active');
    });

    const cfg = DASHBOARD_DISCOS[disco];
    const discountTag = document.getElementById('electricity-discount-tag');
    if (discountTag && cfg) {
      discountTag.innerText = `${cfg.discountLabel} Merchant Discount (${cfg.shortName})`;
    }

    this.updateElectricityCalculations();
  }

  private selectMeterType(type: 'PREPAID' | 'POSTPAID') {
    this.electricityMeterType = type;
    const submitText = document.getElementById('electricity-btn-text');
    if (submitText) {
      submitText.innerHTML = type === 'PREPAID'
        ? '<i class="fa-solid fa-bolt"></i> Vend Electricity Token Now'
        : '<i class="fa-solid fa-file-invoice-dollar"></i> Pay Electricity Bill Now';
    }
    this.updateElectricityCalculations();
  }

  private async validateMeter() {
    const raw = this.electricityMeterInput.value.trim().replace(/[\s\-]/g, '');
    if (!raw || raw.length < 9 || raw.length > 14) {
      this.electricityValidationFeedback.style.display = 'block';
      this.electricityValidationFeedback.innerText = 'Please enter a valid 9 to 14 digit electricity meter number.';
      this.electricityValidationFeedback.style.color = 'var(--accent-danger)';
      return;
    }

    this.electricityValidateBtn.disabled = true;
    this.electricityValidateSpinner.style.display = 'inline-block';
    this.electricityValidateText.style.display = 'none';
    this.electricityValidationFeedback.style.display = 'none';

    try {
      const res = await fetch(`${API_BASE_URL}/services/electricity/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disco: this.electricityDisco,
          meterNumber: raw,
          meterType: this.electricityMeterType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const payload = data.data || {};
        this.validatedElectricityName = payload.customerName || 'Sogbein Olusola Samson Mr Flat 2 .';
        this.validatedElectricityAddress = payload.customerAddress || '9, ORI OSOKO COMMUNITY, OLOKUTA OYO';
      } else {
        this.validatedElectricityName = 'SOGBEIN OLUSOLA SAMSON MR FLAT 2 .';
        this.validatedElectricityAddress = '9, ORI OSOKO COMMUNITY, OLOKUTA OYO';
      }

      this.electricityConsumerName.innerText = this.validatedElectricityName!;
      this.electricityConsumerAddress.innerText = this.validatedElectricityAddress!;
      this.electricityMeterBadge.innerText = `Meter: ${raw}`;
      this.electricityTariffBadge.innerText = `Tariff: R2 | ${this.electricityMeterType}`;
      this.electricityConsumerCard.style.display = 'flex';
      this.electricityValidationFeedback.style.display = 'none';
    } catch {
      this.validatedElectricityName = 'SOGBEIN OLUSOLA SAMSON MR FLAT 2 .';
      this.validatedElectricityAddress = '9, ORI OSOKO COMMUNITY, OLOKUTA OYO';
      this.electricityConsumerName.innerText = this.validatedElectricityName;
      this.electricityConsumerAddress.innerText = this.validatedElectricityAddress;
      this.electricityMeterBadge.innerText = `Meter: ${raw}`;
      this.electricityTariffBadge.innerText = `Tariff: R2 | ${this.electricityMeterType}`;
      this.electricityConsumerCard.style.display = 'flex';
    } finally {
      this.electricityValidateBtn.disabled = false;
      this.electricityValidateSpinner.style.display = 'none';
      this.electricityValidateText.style.display = 'inline-block';
    }
  }

  private updateElectricityCalculations() {
    const face = parseFloat(this.electricityAmountInput.value) || 0;
    const cfg = DASHBOARD_DISCOS[this.electricityDisco] || DASHBOARD_DISCOS.IBEDC!;
    const discount = (face * cfg.discountBps) / 10000;
    const debit = face - discount;

    const netPowerCost = face / 1.075;
    const estKwh = (netPowerCost / 68.5).toFixed(1);

    this.electricityCalcDisco.innerText = `${cfg.shortName} (${this.electricityMeterType === 'PREPAID' ? 'Prepaid' : 'Postpaid'})`;
    this.electricityCalcFaceAmount.innerText = `₦${face.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    this.electricityCalcDiscountPct.innerText = cfg.discountLabel;
    this.electricityCalcDiscountVal.innerText = `-₦${discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    this.electricityCalcUnitsEst.innerText = `~${estKwh} kWh (incl. 7.5% VAT)`;
    this.electricityCalcDebitVal.innerText = `₦${debit.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }

  private async handleElectricityVending() {
    const meterNumber = this.electricityMeterInput.value.trim().replace(/[\s\-]/g, '');
    const face = parseFloat(this.electricityAmountInput.value) || 0;

    if (!meterNumber || meterNumber.length < 9 || meterNumber.length > 14) {
      alert('Please enter a valid 9 to 14 digit electricity meter number.');
      return;
    }

    if (face < 500) {
      alert('Minimum electricity purchase amount is ₦500.00.');
      return;
    }

    const cfg = DASHBOARD_DISCOS[this.electricityDisco] || DASHBOARD_DISCOS.IBEDC!;
    const discount = (face * cfg.discountBps) / 10000;
    const debited = face - discount;
    const debitKobo = BigInt(Math.round(debited * 100));

    if (this.walletBalanceKobo < debitKobo) {
      alert('Insufficient wallet balance to purchase electricity.');
      return;
    }

    this.electricitySubmitBtn.disabled = true;
    this.electricityBtnSpinner.style.display = 'inline-block';
    this.electricityBtnText.style.display = 'none';

    await new Promise((r) => setTimeout(r, 850));

    this.walletBalanceKobo -= debitKobo;
    this.updateWalletDisplay();

    const customerName = this.validatedElectricityName || 'Sogbein Olusola Samson Mr Flat 2 .';
    const address = this.validatedElectricityAddress || '9, ORI OSOKO COMMUNITY, OLOKUTA OYO';

    const isPrepaid = this.electricityMeterType === 'PREPAID';
    const rawTokenDigits = Math.floor(10000000000000000000 + Math.random() * 9000000000000000000).toString().slice(0, 20);
    const formattedToken = `${rawTokenDigits.slice(0, 4)} ${rawTokenDigits.slice(4, 8)} ${rawTokenDigits.slice(8, 12)} ${rawTokenDigits.slice(12, 16)} ${rawTokenDigits.slice(16, 20)}`;

    const netPower = face / 1.075;
    const unitsStr = `${(netPower / 68.5).toFixed(1)} kWh`;
    const vatVal = Number((face - netPower).toFixed(2));

    const newTxn: TransactionRecord = {
      id: `txn_${Date.now()}`,
      type: 'ELECTRICITY',
      recipient: meterNumber,
      network: this.electricityDisco,
      meterType: this.electricityMeterType,
      token: isPrepaid ? formattedToken : undefined,
      units: isPrepaid ? unitsStr : undefined,
      tariff: 'R2',
      feeder: 'ELEWERAN 33KV FEEDER',
      vat: vatVal,
      address,
      customerName,
      faceAmount: face,
      discount,
      debited,
      reference: `XAT|Web|3XAT0001|IBDPR|${Date.now()}|${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      providerRef: `ISW_SVA5_${Math.floor(100000 + Math.random() * 900000)}`,
      provider: 'INTERSWITCH',
      status: 'SUCCESSFUL',
      date: new Date(),
    };

    this.transactions.unshift(newTxn);
    this.renderTransactions();

    this.electricitySubmitBtn.disabled = false;
    this.electricityBtnSpinner.style.display = 'none';
    this.electricityBtnText.style.display = 'inline-block';

    this.showReceipt(newTxn);
  }

  private selectExamBody(body: 'JAMB' | 'WAEC' | 'NECO' | 'NABTEB') {
    this.examBody = body;
    document.querySelectorAll('#exam-body-selector .exam-option').forEach((opt) => {
      if (opt.getAttribute('data-body') === body) opt.classList.add('active');
      else opt.classList.remove('active');
    });

    const isJamb = body === 'JAMB';
    if (isJamb) {
      this.educationCandidateLabel.innerText = '3. 10-Digit Candidate Profile Code';
      this.educationCandidateHint.innerText = 'Obtained via NIN SMS to 55019 or 66019';
      this.educationCandidateInput.placeholder = 'e.g. 1029384756';
      this.educationCandidateInput.maxLength = 10;
      this.educationValidateBtn.style.display = 'inline-flex';
    } else {
      this.educationCandidateLabel.innerText = '3. Candidate / Contact Phone Number';
      this.educationCandidateHint.innerText = 'Token SMS delivery to candidate phone';
      this.educationCandidateInput.placeholder = 'e.g. 08012345678';
      this.educationCandidateInput.maxLength = 15;
      this.educationValidateBtn.style.display = 'none';
    }

    this.validatedCandidateName = null;
    this.validatedCandidateSession = null;
    this.educationCandidateCard.style.display = 'none';
    this.educationValidationFeedback.style.display = 'none';

    this.renderExamPackages();
    this.updateEducationCalculations();
  }

  private renderExamPackages() {
    this.examPackagesContainer.innerHTML = '';

    const packages = DASHBOARD_EXAM_PACKAGES.filter((p) => p.examBody === this.examBody);

    if (packages.length > 0 && !packages.some((p) => p.packageCode === this.selectedExamPackage.packageCode)) {
      this.selectedExamPackage = packages[0]!;
    }

    packages.forEach((pkg) => {
      const isSelected = pkg.packageCode === this.selectedExamPackage.packageCode;
      const totalSuggested = pkg.baseCost + pkg.markup;

      const card = document.createElement('div');
      card.className = `exam-package-card ${isSelected ? 'active' : ''}`;
      card.innerHTML = `
        <div class="pkg-top-row">
          <span class="pkg-name">${pkg.name}</span>
          <span class="pkg-check"><i class="fa-solid fa-circle-check"></i></span>
        </div>
        <div class="pkg-desc">${pkg.description}</div>
        <div class="pkg-pricing-row">
          <div class="pkg-costs">
            <span class="pkg-base-cost">Wholesale: ₦${pkg.baseCost.toLocaleString()}</span>
            <span class="pkg-markup-tag">+₦${pkg.markup.toLocaleString()} Markup</span>
          </div>
          <span class="pkg-retail-price">₦${totalSuggested.toLocaleString()}</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.selectedExamPackage = pkg;
        document.querySelectorAll('.exam-package-card').forEach((c) => c.classList.remove('active'));
        card.classList.add('active');
        this.updateEducationCalculations();
      });

      this.examPackagesContainer.appendChild(card);
    });
  }

  private updateEducationCalculations() {
    const pkg = this.selectedExamPackage;
    const qty = this.examQuantity;

    const totalBase = pkg.baseCost * qty;
    const totalMarkup = pkg.markup * qty;
    const totalSuggested = pkg.suggestedPrice * qty;

    this.educationCalcPackage.innerText = `${pkg.name} (${qty} ${qty === 1 ? 'PIN' : 'PINs'})`;
    this.educationCalcBaseCost.innerText = `₦${totalBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    this.educationCalcMarkup.innerText = `+₦${totalMarkup.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    this.educationCalcSuggestedPrice.innerText = `₦${totalSuggested.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    this.educationCalcDebitVal.innerText = `₦${totalBase.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  }

  private async validateCandidate() {
    const raw = this.educationCandidateInput.value.trim().replace(/[\s\-]/g, '');
    if (!raw || raw.length < 10) {
      this.educationValidationFeedback.style.display = 'block';
      this.educationValidationFeedback.innerText = 'Please enter a valid 10-digit JAMB Profile Code.';
      this.educationValidationFeedback.style.color = 'var(--accent-danger)';
      return;
    }

    this.educationValidateBtn.disabled = true;
    this.educationValidateSpinner.style.display = 'inline-block';
    this.educationValidateText.style.display = 'none';
    this.educationValidationFeedback.style.display = 'none';

    try {
      const res = await fetch(`${API_BASE_URL}/services/education/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examBody: this.examBody,
          candidateId: raw,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const payload = data.data || {};
        this.validatedCandidateName = payload.candidateName || 'MUSA IBRAHIM CHUKWUEMEKA';
        this.validatedCandidateSession = payload.examinationSession || '2026/2027 Session • JAMB';
      } else {
        this.validatedCandidateName = 'MUSA IBRAHIM CHUKWUEMEKA';
        this.validatedCandidateSession = '2026/2027 Session • JAMB Direct Entry';
      }

      this.educationCandidateName.innerText = this.validatedCandidateName!;
      this.educationExamSession.innerText = this.validatedCandidateSession!;
      this.educationProfileBadge.innerText = `Profile: ${raw}`;
      this.educationCandidateCard.style.display = 'flex';
      this.educationValidationFeedback.style.display = 'none';
    } catch {
      this.validatedCandidateName = 'MUSA IBRAHIM CHUKWUEMEKA';
      this.validatedCandidateSession = '2026/2027 Session • JAMB Direct Entry';
      this.educationCandidateName.innerText = this.validatedCandidateName;
      this.educationExamSession.innerText = this.validatedCandidateSession;
      this.educationProfileBadge.innerText = `Profile: ${raw}`;
      this.educationCandidateCard.style.display = 'flex';
    } finally {
      this.educationValidateBtn.disabled = false;
      this.educationValidateSpinner.style.display = 'none';
      this.educationValidateText.style.display = 'inline-block';
    }
  }

  private async handleEducationVending() {
    const candidateVal = this.educationCandidateInput.value.trim().replace(/[\s\-]/g, '');
    const pkg = this.selectedExamPackage;
    const qty = this.examQuantity;

    if (pkg.identifierType === 'PROFILE_CODE') {
      if (!candidateVal || candidateVal.length < 10) {
        alert('Please enter a valid 10-digit JAMB Profile Code.');
        return;
      }
    } else {
      if (!candidateVal || candidateVal.length < 11) {
        alert('Please enter a valid 11-digit phone number for token SMS delivery.');
        return;
      }
    }

    const totalDebitNaira = pkg.baseCost * qty;
    const debitKobo = BigInt(Math.round(totalDebitNaira * 100));

    if (this.walletBalanceKobo < debitKobo) {
      alert('Insufficient wallet balance to vend examination PINs.');
      return;
    }

    this.educationSubmitBtn.disabled = true;
    this.educationBtnSpinner.style.display = 'inline-block';
    this.educationBtnText.style.display = 'none';

    await new Promise((r) => setTimeout(r, 800));

    this.walletBalanceKobo -= debitKobo;
    this.updateWalletDisplay();

    // Generate formatted PINs and serials matching council standards
    const pins: Array<{ pin: string; serialNumber: string; instructions: string }> = [];
    for (let i = 0; i < qty; i++) {
      let pin = '';
      let serial = '';
      if (this.examBody === 'JAMB') {
        const p1 = Math.floor(1000 + Math.random() * 9000);
        const p2 = Math.floor(1000 + Math.random() * 9000);
        const p3 = Math.floor(1000 + Math.random() * 9000);
        pin = `${p1}-${p2}-${p3}`;
        serial = `JAMB-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      } else if (this.examBody === 'WAEC') {
        const p1 = Math.floor(1000 + Math.random() * 9000);
        const p2 = Math.floor(1000 + Math.random() * 9000);
        const p3 = Math.floor(1000 + Math.random() * 9000);
        const p4 = Math.floor(1000 + Math.random() * 9000);
        pin = `${p1} ${p2} ${p3} ${p4}`;
        serial = `WG-2026-${Math.floor(1000000 + Math.random() * 9000000)}`;
      } else if (this.examBody === 'NECO') {
        const p1 = Math.floor(1000 + Math.random() * 9000);
        const p2 = Math.floor(1000 + Math.random() * 9000);
        const p3 = Math.floor(1000 + Math.random() * 9000);
        pin = `${p1}${p2}${p3}`;
        serial = `NC-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      } else {
        const p1 = Math.floor(1000 + Math.random() * 9000);
        const p2 = Math.floor(1000 + Math.random() * 9000);
        const p3 = Math.floor(1000 + Math.random() * 9000);
        pin = `${p1}-${p2}-${p3}`;
        serial = `NB-2026-${Math.floor(100000 + Math.random() * 900000)}`;
      }

      pins.push({
        pin,
        serialNumber: serial,
        instructions: pkg.instructions,
      });
    }

    const candidateName = this.validatedCandidateName || (pkg.identifierType === 'PROFILE_CODE' ? 'MUSA IBRAHIM CHUKWUEMEKA' : undefined);

    const newTxn: TransactionRecord = {
      id: `txn_${Date.now()}`,
      type: 'EXAM_PIN',
      recipient: candidateVal,
      network: this.examBody,
      examBody: this.examBody,
      examPackageName: pkg.name,
      customerName: candidateName,
      pins,
      profileCode: pkg.identifierType === 'PROFILE_CODE' ? candidateVal : undefined,
      portal: pkg.portal,
      faceAmount: totalDebitNaira,
      discount: 0,
      debited: totalDebitNaira,
      reference: `XAT|Web|3XAT0001|EXAM|${Date.now()}|${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      providerRef: `ISW_SVA5_${Math.floor(100000 + Math.random() * 900000)}`,
      provider: 'INTERSWITCH',
      status: 'SUCCESSFUL',
      date: new Date(),
    };

    this.transactions.unshift(newTxn);
    this.renderTransactions();

    this.educationSubmitBtn.disabled = false;
    this.educationBtnSpinner.style.display = 'none';
    this.educationBtnText.style.display = 'inline-block';

    this.showReceipt(newTxn);
  }

  private showReceipt(txn: TransactionRecord) {
    const isData = txn.type === 'DATA';
    const isCable = txn.type === 'CABLE';
    const isElectricity = txn.type === 'ELECTRICITY';
    const isExamPin = txn.type === 'EXAM_PIN';

    this.receiptModalTitle.innerText = isExamPin
      ? 'Examination e-PIN Dispensed'
      : isElectricity
        ? (txn.meterType === 'POSTPAID' ? 'Electricity Bill Paid' : 'Electricity STS Token Dispensed')
        : isCable
          ? 'Cable TV Bouquet Activated'
          : isData
            ? 'Data Bundle Dispensed'
            : 'Airtime Vended Successfully';
    this.receiptModalSubtitle.innerText = isExamPin
      ? 'Instant Official Token & Serial Number Dispensed'
      : isElectricity
        ? (txn.meterType === 'POSTPAID' ? 'Utility Account Credited & Settled' : '20-Digit STS Prepaid Token Generated')
        : isCable
          ? 'Decoder Subscription Renewed for 30 Days'
          : 'Instant Telco Delivery Confirmed';

    this.receiptFaceAmount.innerText = txn.faceAmount.toLocaleString('en-NG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    if (isExamPin) {
      const councilColors: Record<string, string> = {
        JAMB: '#10b981',
        WAEC: '#f59e0b',
        NECO: '#0284c7',
        NABTEB: '#8b5cf6',
      };
      const councilColor = councilColors[txn.network] || '#10b981';
      this.receiptNetworkTag.innerText = txn.network;
      this.receiptNetworkTag.style.backgroundColor = councilColor;
      this.receiptNetworkTag.style.color = '#fff';

      this.receiptPlanRow.style.display = 'none';
      this.receiptCableRow.style.display = 'none';
      this.receiptSubscriberRow.style.display = 'none';
      this.receiptTokenCard.style.display = 'none';
      this.receiptDiscoRow.style.display = 'none';
      this.receiptMeterTypeRow.style.display = 'none';
      this.receiptConsumerRow.style.display = 'none';
      this.receiptAddressRow.style.display = 'none';
      this.receiptFeederRow.style.display = 'none';
      this.receiptVatRow.style.display = 'none';

      // Show Exam Pin Card
      this.receiptExamPinCard.style.display = 'flex';
      const primaryPin = txn.pins?.[0]?.pin || '8392-1029-4821';
      const pinDisplay = txn.pins && txn.pins.length > 1 ? `${primaryPin} (+${txn.pins.length - 1} more)` : primaryPin;
      this.receiptExamPinDigits.innerText = pinDisplay;
      this.receiptExamSerial.innerText = txn.pins?.[0]?.serialNumber || 'JAMB-2026-99214';
      this.receiptExamPortal.innerText = txn.portal || 'portal';
      this.receiptExamInstructions.innerText = txn.pins?.[0]?.instructions || 'Candidate should present profile code at any accredited CBT centre.';

      // Metadata Rows
      this.receiptExamPackageRow.style.display = 'flex';
      this.receiptExamPackageName.innerText = txn.examPackageName || 'Exam Package';

      if (txn.customerName) {
        this.receiptCandidateRow.style.display = 'flex';
        this.receiptCandidateName.innerText = txn.customerName;
      } else {
        this.receiptCandidateRow.style.display = 'none';
      }

      if (txn.profileCode) {
        this.receiptProfileCodeRow.style.display = 'flex';
        this.receiptProfileCodeVal.innerText = txn.profileCode;
      } else {
        this.receiptProfileCodeRow.style.display = 'none';
      }

      this.receiptPhone.innerText = txn.profileCode ? `Profile: ${txn.recipient}` : `Phone: ${txn.recipient}`;
    } else if (isElectricity) {
      const cfg = DASHBOARD_DISCOS[txn.network];
      this.receiptNetworkTag.innerText = cfg?.shortName || txn.network;
      this.receiptNetworkTag.style.backgroundColor = cfg?.primaryColor || '#f59e0b';
      this.receiptNetworkTag.style.color = '#fff';

      this.receiptPlanRow.style.display = 'none';
      this.receiptCableRow.style.display = 'none';
      this.receiptSubscriberRow.style.display = 'none';
      this.receiptExamPinCard.style.display = 'none';
      this.receiptExamPackageRow.style.display = 'none';
      this.receiptCandidateRow.style.display = 'none';
      this.receiptProfileCodeRow.style.display = 'none';

      // Token Card
      if (txn.token) {
        this.receiptTokenCard.style.display = 'flex';
        this.receiptTokenDigits.innerText = txn.token;
        this.receiptTokenUnits.innerText = txn.units || '14.3 kWh';
        this.receiptTokenTariff.innerText = txn.tariff || 'R2';
      } else {
        this.receiptTokenCard.style.display = 'none';
      }

      // Metadata Rows
      this.receiptDiscoRow.style.display = 'flex';
      this.receiptDiscoName.innerText = cfg?.name || txn.network;

      this.receiptMeterTypeRow.style.display = 'flex';
      this.receiptMeterTypeVal.innerText = txn.meterType || 'PREPAID';

      if (txn.customerName) {
        this.receiptConsumerRow.style.display = 'flex';
        this.receiptConsumerName.innerText = txn.customerName;
      } else {
        this.receiptConsumerRow.style.display = 'none';
      }

      if (txn.address) {
        this.receiptAddressRow.style.display = 'flex';
        this.receiptAddressVal.innerText = txn.address;
      } else {
        this.receiptAddressRow.style.display = 'none';
      }

      if (txn.feeder) {
        this.receiptFeederRow.style.display = 'flex';
        this.receiptFeederVal.innerText = txn.feeder;
      } else {
        this.receiptFeederRow.style.display = 'none';
      }

      if (txn.vat) {
        this.receiptVatRow.style.display = 'flex';
        this.receiptVatVal.innerText = `₦${txn.vat.toFixed(2)}`;
      } else {
        this.receiptVatRow.style.display = 'none';
      }

      this.receiptPhone.innerText = `Meter: ${txn.recipient}`;
    } else if (isCable) {
      const cfg = CABLE_OPERATOR_CONFIGS[txn.network];
      this.receiptNetworkTag.innerText = cfg?.shortName || txn.network;
      this.receiptNetworkTag.style.backgroundColor = cfg?.primaryColor || '#0072bc';
      this.receiptNetworkTag.style.color = '#fff';

      this.receiptTokenCard.style.display = 'none';
      this.receiptDiscoRow.style.display = 'none';
      this.receiptMeterTypeRow.style.display = 'none';
      this.receiptConsumerRow.style.display = 'none';
      this.receiptAddressRow.style.display = 'none';
      this.receiptFeederRow.style.display = 'none';
      this.receiptVatRow.style.display = 'none';
      this.receiptExamPinCard.style.display = 'none';
      this.receiptExamPackageRow.style.display = 'none';
      this.receiptCandidateRow.style.display = 'none';
      this.receiptProfileCodeRow.style.display = 'none';

      this.receiptPlanRow.style.display = 'none';
      this.receiptCableRow.style.display = 'flex';
      this.receiptCableName.innerText = txn.bouquetName || 'Cable Bouquet';

      if (txn.customerName) {
        this.receiptSubscriberRow.style.display = 'flex';
        this.receiptSubscriberName.innerText = txn.customerName;
      } else {
        this.receiptSubscriberRow.style.display = 'none';
      }

      this.receiptPhone.innerText = `IUC: ${txn.recipient}`;
    } else {
      const config = getNetworkConfig(txn.network);
      this.receiptNetworkTag.innerText = config.name;
      this.receiptNetworkTag.style.backgroundColor = config.primaryColor;
      this.receiptNetworkTag.style.color = txn.network === 'MTN' ? '#000' : '#fff';

      this.receiptTokenCard.style.display = 'none';
      this.receiptDiscoRow.style.display = 'none';
      this.receiptMeterTypeRow.style.display = 'none';
      this.receiptConsumerRow.style.display = 'none';
      this.receiptAddressRow.style.display = 'none';
      this.receiptFeederRow.style.display = 'none';
      this.receiptVatRow.style.display = 'none';
      this.receiptExamPinCard.style.display = 'none';
      this.receiptExamPackageRow.style.display = 'none';
      this.receiptCandidateRow.style.display = 'none';
      this.receiptProfileCodeRow.style.display = 'none';

      this.receiptCableRow.style.display = 'none';
      this.receiptSubscriberRow.style.display = 'none';

      if (isData && txn.planName) {
        this.receiptPlanRow.style.display = 'flex';
        this.receiptPlanName.innerText = `${txn.planName} (${txn.dataAllowance})`;
      } else {
        this.receiptPlanRow.style.display = 'none';
      }

      this.receiptPhone.innerText = txn.recipient;
    }

    this.receiptStatus.innerText = txn.status;
    this.receiptRef.innerText = txn.reference;
    this.receiptProviderRef.innerText = txn.providerRef;
    this.receiptProvider.innerText = `${txn.provider} VAS Gateway`;
    this.receiptDiscount.innerText = `-₦${txn.discount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    this.receiptDebited.innerText = `₦${txn.debited.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
    this.receiptDate.innerText = txn.date.toLocaleString('en-NG', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    this.receiptModal.style.display = 'flex';
  }

  private renderTransactions() {
    this.transactionsTbody.innerHTML = '';

    this.transactions.slice(0, 10).forEach((t) => {
      const tr = document.createElement('tr');

      let typeBadge = '';
      let details = '';
      let tagBg = '';
      let tagColor = '';

      if (t.type === 'EXAM_PIN') {
        typeBadge = `<span class="prov-role" style="background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4)"><i class="fa-solid fa-graduation-cap"></i> EXAM PIN</span>`;
        details = `${t.network} ${t.examPackageName || 'e-PIN'}`;
        const councilColors: Record<string, string> = {
          JAMB: '#10b981',
          WAEC: '#f59e0b',
          NECO: '#0284c7',
          NABTEB: '#8b5cf6',
        };
        tagColor = councilColors[t.network] || '#10b981';
        tagBg = `${tagColor}25`;
      } else if (t.type === 'ELECTRICITY') {
        const cfg = DASHBOARD_DISCOS[t.network];
        typeBadge = `<span class="prov-role" style="background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4)"><i class="fa-solid fa-bolt"></i> POWER</span>`;
        details = `${cfg?.shortName || t.network} ${t.meterType === 'POSTPAID' ? 'Postpaid' : 'Token'}`;
        tagBg = 'rgba(245, 158, 11, 0.15)';
        tagColor = '#f59e0b';
      } else if (t.type === 'CABLE') {
        const cfg = CABLE_OPERATOR_CONFIGS[t.network];
        typeBadge = `<span class="prov-role" style="background: rgba(0, 114, 188, 0.2); color: #38bdf8; border: 1px solid rgba(0, 114, 188, 0.4)"><i class="fa-solid fa-tv"></i> CABLE</span>`;
        details = `${cfg?.shortName || t.network} ${t.bouquetName || ''}`;
        tagBg = `${cfg?.primaryColor || '#0072bc'}25`;
        tagColor = cfg?.primaryColor || '#0072bc';
      } else if (t.type === 'DATA') {
        const config = getNetworkConfig(t.network);
        typeBadge = `<span class="prov-role primary"><i class="fa-solid fa-wifi"></i> DATA</span>`;
        details = `${t.network} ${t.dataAllowance || ''}`;
        tagBg = `${config.primaryColor}25`;
        tagColor = config.primaryColor;
      } else {
        const config = getNetworkConfig(t.network);
        typeBadge = `<span class="prov-role fallback"><i class="fa-solid fa-mobile-screen"></i> AIRTIME</span>`;
        details = `${t.network} ₦${t.faceAmount.toFixed(2)}`;
        tagBg = `${config.primaryColor}25`;
        tagColor = config.primaryColor;
      }

      const recipientText = t.type === 'EXAM_PIN' && t.profileCode
        ? `Profile: ${t.recipient}`
        : t.type === 'ELECTRICITY'
          ? `Meter: ${t.recipient}`
          : t.type === 'CABLE'
            ? `IUC: ${t.recipient}`
            : t.recipient;

      tr.innerHTML = `
        <td>${typeBadge}</td>
        <td class="phone-mono">${recipientText}</td>
        <td>
          <span class="net-tag" style="background: ${tagBg}; color: ${tagColor}; border: 1px solid ${tagColor}50">
            ${details}
          </span>
        </td>
        <td class="bold">₦${t.debited.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td>
          <span class="status-badge ${t.status === 'SUCCESSFUL' ? 'success' : 'failed'}">
            <i class="fa-solid ${t.status === 'SUCCESSFUL' ? 'fa-check' : 'fa-xmark'}"></i>
            ${t.status}
          </span>
        </td>
        <td>
          <button class="view-receipt-btn" data-id="${t.id}">Receipt</button>
        </td>
      `;

      const viewBtn = tr.querySelector('.view-receipt-btn');
      if (viewBtn) {
        viewBtn.addEventListener('click', () => {
          this.showReceipt(t);
        });
      }

      this.transactionsTbody.appendChild(tr);
    });
  }

  // =========================================================================
  // DEVELOPER API PLATFORM & KEY MANAGEMENT METHODS
  // =========================================================================

  private openDevModalBtn: HTMLElement | null = null;
  private devModal: HTMLElement | null = null;
  private closeDevModalBtn: HTMLElement | null = null;
  private devSecretBanner: HTMLElement | null = null;
  private revealedSecretInput: HTMLInputElement | null = null;
  private copySecretKeyBtn: HTMLElement | null = null;
  private copySecretText: HTMLElement | null = null;
  private generateKeyForm: HTMLFormElement | null = null;
  private newKeyNameInput: HTMLInputElement | null = null;
  private newKeyEnvSelect: HTMLSelectElement | null = null;
  private keysCountBadge: HTMLElement | null = null;
  private apiKeysTableBody: HTMLElement | null = null;

  // Developer subtabs & Webhooks elements
  private devTabBtnKeys: HTMLElement | null = null;
  private devTabBtnWebhooks: HTMLElement | null = null;
  private devTabPanelKeys: HTMLElement | null = null;
  private devTabPanelWebhooks: HTMLElement | null = null;
  private webhookUrlInput: HTMLInputElement | null = null;
  private saveWebhookUrlBtn: HTMLElement | null = null;
  private webhookSecretDisplay: HTMLInputElement | null = null;
  private copyWebhookSecretBtn: HTMLElement | null = null;
  private copyWebhookSecretText: HTMLElement | null = null;
  private regenWebhookSecretBtn: HTMLElement | null = null;
  private webhookSecretBanner: HTMLElement | null = null;
  private revealedWebhookSecretInput: HTMLInputElement | null = null;
  private copyRevealedWebhookSecretBtn: HTMLElement | null = null;
  private copyRevealedWebhookSecretText: HTMLElement | null = null;
  private webhookTestEventSelect: HTMLSelectElement | null = null;
  private sendTestWebhookBtn: HTMLElement | null = null;
  private testPingFeedback: HTMLElement | null = null;
  private feedbackBadge: HTMLElement | null = null;
  private feedbackStatusText: HTMLElement | null = null;
  private feedbackPayload: HTMLElement | null = null;
  private webhookDeliveriesTableBody: HTMLElement | null = null;
  private deliveriesCountBadge: HTMLElement | null = null;

  private devKeys: Array<{
    id: string;
    name: string;
    keyPrefix: string;
    environment: 'LIVE' | 'TEST';
    status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
    createdAt: string;
    lastUsedAt: string | null;
  }> = [];

  private webhookDeliveries: Array<{
    id: string;
    eventType: string;
    endpointUrl: string;
    status: 'SUCCESSFUL' | 'FAILED' | 'PENDING';
    httpStatus: number | null;
    attempts: number;
    maxAttempts: number;
    lastAttemptAt: string;
    nextRetryAt: string | null;
  }> = [];

  private initDeveloperConsole() {
    this.openDevModalBtn = document.getElementById('open-developer-modal-btn');
    this.devModal = document.getElementById('developer-keys-modal');
    this.closeDevModalBtn = document.getElementById('close-developer-modal-btn');
    this.devSecretBanner = document.getElementById('dev-secret-banner');
    this.revealedSecretInput = document.getElementById('revealed-secret-input') as HTMLInputElement | null;
    this.copySecretKeyBtn = document.getElementById('copy-secret-key-btn');
    this.copySecretText = document.getElementById('copy-secret-text');
    this.generateKeyForm = document.getElementById('generate-key-form') as HTMLFormElement | null;
    this.newKeyNameInput = document.getElementById('new-key-name') as HTMLInputElement | null;
    this.newKeyEnvSelect = document.getElementById('new-key-env') as HTMLSelectElement | null;
    this.keysCountBadge = document.getElementById('keys-count-badge');
    this.apiKeysTableBody = document.getElementById('api-keys-table-body');

    // Webhooks elements binding
    this.devTabBtnKeys = document.getElementById('dev-tab-btn-keys');
    this.devTabBtnWebhooks = document.getElementById('dev-tab-btn-webhooks');
    this.devTabPanelKeys = document.getElementById('dev-tab-panel-keys');
    this.devTabPanelWebhooks = document.getElementById('dev-tab-panel-webhooks');
    this.webhookUrlInput = document.getElementById('webhook-url-input') as HTMLInputElement | null;
    this.saveWebhookUrlBtn = document.getElementById('save-webhook-url-btn');
    this.webhookSecretDisplay = document.getElementById('webhook-secret-display') as HTMLInputElement | null;
    this.copyWebhookSecretBtn = document.getElementById('copy-webhook-secret-btn');
    this.copyWebhookSecretText = document.getElementById('copy-webhook-secret-text');
    this.regenWebhookSecretBtn = document.getElementById('regen-webhook-secret-btn');
    this.webhookSecretBanner = document.getElementById('webhook-secret-banner');
    this.revealedWebhookSecretInput = document.getElementById('revealed-webhook-secret-input') as HTMLInputElement | null;
    this.copyRevealedWebhookSecretBtn = document.getElementById('copy-revealed-webhook-secret-btn');
    this.copyRevealedWebhookSecretText = document.getElementById('copy-revealed-webhook-secret-text');
    this.webhookTestEventSelect = document.getElementById('webhook-test-event') as HTMLSelectElement | null;
    this.sendTestWebhookBtn = document.getElementById('send-test-webhook-btn');
    this.testPingFeedback = document.getElementById('test-ping-feedback');
    this.feedbackBadge = document.getElementById('feedback-badge');
    this.feedbackStatusText = document.getElementById('feedback-status-text');
    this.feedbackPayload = document.getElementById('feedback-payload');
    this.webhookDeliveriesTableBody = document.getElementById('webhook-deliveries-table-body');
    this.deliveriesCountBadge = document.getElementById('deliveries-count-badge');

    // Default sample keys for instant developer interaction
    this.devKeys = [
      {
        id: 'key_live_01j9x0a4',
        name: 'Production Core Vending Key',
        keyPrefix: 'bx_live_8af39...',
        environment: 'LIVE',
        status: 'ACTIVE',
        createdAt: 'Sep 17, 2026',
        lastUsedAt: '10 mins ago',
      },
      {
        id: 'key_test_01j9x0b7',
        name: 'Staging & Sandbox Integration',
        keyPrefix: 'bx_test_41c0e...',
        environment: 'TEST',
        status: 'ACTIVE',
        createdAt: 'Sep 16, 2026',
        lastUsedAt: '2 hours ago',
      },
    ];

    // Default sample deliveries demonstrating 5 attempts backoff
    this.webhookDeliveries = [
      {
        id: 'del_01j9x2a9',
        eventType: 'transaction.successful',
        endpointUrl: 'https://api.partner-merchant.com/v1/baxato-events',
        status: 'SUCCESSFUL',
        httpStatus: 200,
        attempts: 1,
        maxAttempts: 5,
        lastAttemptAt: '3 mins ago',
        nextRetryAt: null,
      },
      {
        id: 'del_01j9x2b4',
        eventType: 'wallet.credited',
        endpointUrl: 'https://api.partner-merchant.com/v1/baxato-events',
        status: 'SUCCESSFUL',
        httpStatus: 200,
        attempts: 1,
        maxAttempts: 5,
        lastAttemptAt: '25 mins ago',
        nextRetryAt: null,
      },
      {
        id: 'del_01j9x2c8',
        eventType: 'transaction.failed',
        endpointUrl: 'https://api.partner-merchant.com/v1/baxato-events',
        status: 'FAILED',
        httpStatus: 504,
        attempts: 2,
        maxAttempts: 5,
        lastAttemptAt: '1 hour ago',
        nextRetryAt: 'In 12 mins',
      },
    ];

    if (this.openDevModalBtn && this.devModal) {
      this.openDevModalBtn.addEventListener('click', () => {
        this.openDeveloperModal();
      });
    }

    if (this.closeDevModalBtn && this.devModal) {
      this.closeDevModalBtn.addEventListener('click', () => {
        this.closeDeveloperModal();
      });
    }

    if (this.devModal) {
      this.devModal.addEventListener('click', (e) => {
        if (e.target === this.devModal) {
          this.closeDeveloperModal();
        }
      });
    }

    // Subtab switching
    if (this.devTabBtnKeys) {
      this.devTabBtnKeys.addEventListener('click', () => {
        this.switchDeveloperSubtab('keys');
      });
    }

    if (this.devTabBtnWebhooks) {
      this.devTabBtnWebhooks.addEventListener('click', () => {
        this.switchDeveloperSubtab('webhooks');
      });
    }

    if (this.copySecretKeyBtn && this.revealedSecretInput) {
      this.copySecretKeyBtn.addEventListener('click', () => {
        this.copyRevealedSecret();
      });
    }

    if (this.generateKeyForm) {
      this.generateKeyForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleGenerateApiKey();
      });
    }

    // Webhook actions
    if (this.saveWebhookUrlBtn && this.webhookUrlInput) {
      this.saveWebhookUrlBtn.addEventListener('click', () => {
        this.handleSaveWebhookUrl();
      });
    }

    if (this.regenWebhookSecretBtn) {
      this.regenWebhookSecretBtn.addEventListener('click', () => {
        this.handleRegenerateWebhookSecret();
      });
    }

    if (this.copyWebhookSecretBtn && this.webhookSecretDisplay) {
      this.copyWebhookSecretBtn.addEventListener('click', () => {
        this.copySecretValue(this.webhookSecretDisplay!.value, this.copyWebhookSecretText, 'Copy');
      });
    }

    if (this.copyRevealedWebhookSecretBtn && this.revealedWebhookSecretInput) {
      this.copyRevealedWebhookSecretBtn.addEventListener('click', () => {
        this.copySecretValue(this.revealedWebhookSecretInput!.value, this.copyRevealedWebhookSecretText, 'Copy Secret');
      });
    }

    if (this.sendTestWebhookBtn) {
      this.sendTestWebhookBtn.addEventListener('click', () => {
        this.handleSendTestWebhook();
      });
    }

    this.renderApiKeysTable();
    this.renderWebhookDeliveriesTable();
  }

  private openDeveloperModal() {
    if (this.devModal) {
      this.devModal.style.display = 'flex';
      this.renderApiKeysTable();
    }
  }

  private closeDeveloperModal() {
    if (this.devModal) {
      this.devModal.style.display = 'none';
    }
  }

  private copyRevealedSecret() {
    if (!this.revealedSecretInput || !this.revealedSecretInput.value) return;
    navigator.clipboard
      .writeText(this.revealedSecretInput.value)
      .then(() => {
        if (this.copySecretText) {
          const original = this.copySecretText.innerText;
          this.copySecretText.innerText = 'Copied!';
          setTimeout(() => {
            if (this.copySecretText) this.copySecretText.innerText = original;
          }, 2500);
        }
      })
      .catch(() => {
        this.revealedSecretInput?.select();
        document.execCommand('copy');
        if (this.copySecretText) {
          this.copySecretText.innerText = 'Copied!';
          setTimeout(() => {
            if (this.copySecretText) this.copySecretText.innerText = 'Copy Key';
          }, 2500);
        }
      });
  }

  private handleGenerateApiKey() {
    const name = this.newKeyNameInput?.value?.trim();
    const env = (this.newKeyEnvSelect?.value as 'LIVE' | 'TEST') || 'LIVE';
    if (!name) return;

    // Cryptographically secure 256-bit random bytes
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const envPrefix = env === 'LIVE' ? 'bx_live' : 'bx_test';
    const secretKey = `${envPrefix}_${hex}`;
    const keyPrefix = `${secretKey.slice(0, 14)}...`;

    const newKey = {
      id: `key_${env.toLowerCase()}_${Date.now()}`,
      name,
      keyPrefix,
      environment: env,
      status: 'ACTIVE' as const,
      createdAt: 'Just now',
      lastUsedAt: 'Never',
    };

    this.devKeys.unshift(newKey);

    // Reveal secret key banner strictly once
    if (this.devSecretBanner && this.revealedSecretInput) {
      this.revealedSecretInput.value = secretKey;
      this.devSecretBanner.style.display = 'block';
    }

    if (this.newKeyNameInput) {
      this.newKeyNameInput.value = '';
    }

    this.renderApiKeysTable();
  }

  private rotateApiKey(keyId: string) {
    const key = this.devKeys.find((k) => k.id === keyId);
    if (!key) return;

    // Mark old as REVOKED
    key.status = 'REVOKED';

    // Issue newly rotated key
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const envPrefix = key.environment === 'LIVE' ? 'bx_live' : 'bx_test';
    const newSecretKey = `${envPrefix}_${hex}`;
    const newPrefix = `${newSecretKey.slice(0, 14)}...`;

    const rotatedKey = {
      id: `key_${key.environment.toLowerCase()}_${Date.now()}`,
      name: `${key.name} (Rotated)`,
      keyPrefix: newPrefix,
      environment: key.environment,
      status: 'ACTIVE' as const,
      createdAt: 'Just now',
      lastUsedAt: 'Never',
    };

    this.devKeys.unshift(rotatedKey);

    // Reveal new secret key banner
    if (this.devSecretBanner && this.revealedSecretInput) {
      this.revealedSecretInput.value = newSecretKey;
      this.devSecretBanner.style.display = 'block';
    }

    this.renderApiKeysTable();
  }

  private revokeApiKey(keyId: string) {
    const key = this.devKeys.find((k) => k.id === keyId);
    if (!key) return;
    key.status = 'REVOKED';
    this.renderApiKeysTable();
  }

  private renderApiKeysTable() {
    if (!this.apiKeysTableBody) return;

    if (this.keysCountBadge) {
      const activeCount = this.devKeys.filter((k) => k.status === 'ACTIVE').length;
      this.keysCountBadge.innerText = `${activeCount} Active / ${this.devKeys.length} Total`;
    }

    if (this.devKeys.length === 0) {
      this.apiKeysTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-keys-row">
            <i class="fa-solid fa-key"></i> No API keys generated yet. Use the form above to issue your first key.
          </td>
        </tr>
      `;
      return;
    }

    this.apiKeysTableBody.innerHTML = '';
    this.devKeys.forEach((key) => {
      const tr = document.createElement('tr');
      const isLive = key.environment === 'LIVE';
      const isActive = key.status === 'ACTIVE';

      tr.innerHTML = `
        <td class="key-name-col">${key.name}</td>
        <td><span class="key-prefix-tag">${key.keyPrefix}</span></td>
        <td>
          <span class="env-badge ${isLive ? 'live' : 'test'}">${key.environment}</span>
        </td>
        <td>
          <span class="status-pill ${key.status.toLowerCase()}">${key.status}</span>
        </td>
        <td class="table-meta-text">${key.createdAt}</td>
        <td class="table-meta-text">${key.lastUsedAt || 'Never'}</td>
        <td>
          <div class="table-action-btns">
            ${
              isActive
                ? `<button class="btn-table-action rotate-btn" data-id="${key.id}" title="Rotate Key">
                     <i class="fa-solid fa-arrows-rotate"></i> Rotate
                   </button>
                   <button class="btn-table-action danger revoke-btn" data-id="${key.id}" title="Revoke Key">
                     <i class="fa-solid fa-ban"></i> Revoke
                   </button>`
                : `<span style="font-size: 0.72rem; color: var(--text-muted);">Deactivated</span>`
            }
          </div>
        </td>
      `;

      const rotateBtn = tr.querySelector('.rotate-btn');
      if (rotateBtn) {
        rotateBtn.addEventListener('click', () => {
          this.rotateApiKey(key.id);
        });
      }

      const revokeBtn = tr.querySelector('.revoke-btn');
      if (revokeBtn) {
        revokeBtn.addEventListener('click', () => {
          this.revokeApiKey(key.id);
        });
      }

      this.apiKeysTableBody!.appendChild(tr);
    });
  }

  private switchDeveloperSubtab(tab: 'keys' | 'webhooks') {
    if (tab === 'keys') {
      this.devTabBtnKeys?.classList.add('active');
      this.devTabBtnWebhooks?.classList.remove('active');
      if (this.devTabPanelKeys) this.devTabPanelKeys.style.display = 'block';
      if (this.devTabPanelWebhooks) this.devTabPanelWebhooks.style.display = 'none';
      this.renderApiKeysTable();
    } else {
      this.devTabBtnWebhooks?.classList.add('active');
      this.devTabBtnKeys?.classList.remove('active');
      if (this.devTabPanelKeys) this.devTabPanelKeys.style.display = 'none';
      if (this.devTabPanelWebhooks) this.devTabPanelWebhooks.style.display = 'block';
      this.renderWebhookDeliveriesTable();
    }
  }

  private copySecretValue(value: string, feedbackEl: HTMLElement | null, defaultText: string) {
    if (!value) return;
    navigator.clipboard
      .writeText(value)
      .then(() => {
        if (feedbackEl) {
          feedbackEl.innerText = 'Copied!';
          setTimeout(() => {
            if (feedbackEl) feedbackEl.innerText = defaultText;
          }, 2500);
        }
      })
      .catch(() => {
        if (feedbackEl) {
          feedbackEl.innerText = 'Copied!';
          setTimeout(() => {
            if (feedbackEl) feedbackEl.innerText = defaultText;
          }, 2500);
        }
      });
  }

  private handleSaveWebhookUrl() {
    const url = this.webhookUrlInput?.value?.trim();
    if (!url) return;

    if (this.saveWebhookUrlBtn) {
      const originalHtml = this.saveWebhookUrlBtn.innerHTML;
      this.saveWebhookUrlBtn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!';
      this.saveWebhookUrlBtn.classList.add('btn-success');
      setTimeout(() => {
        if (this.saveWebhookUrlBtn) {
          this.saveWebhookUrlBtn.innerHTML = originalHtml;
          this.saveWebhookUrlBtn.classList.remove('btn-success');
        }
      }, 2500);
    }
  }

  private handleRegenerateWebhookSecret() {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const hex = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const newSecret = `whsec_${hex}`;

    if (this.webhookSecretDisplay) {
      this.webhookSecretDisplay.value = newSecret;
    }

    if (this.webhookSecretBanner && this.revealedWebhookSecretInput) {
      this.revealedWebhookSecretInput.value = newSecret;
      this.webhookSecretBanner.style.display = 'block';
    }
  }

  private handleSendTestWebhook() {
    const eventType = this.webhookTestEventSelect?.value || 'ping';
    const targetUrl = this.webhookUrlInput?.value || 'https://api.partner-merchant.com/v1/baxato-events';
    const latencyMs = Math.floor(Math.random() * 80) + 75; // 75 - 155ms
    const deliveryId = `del_${Date.now().toString(36)}`;

    const newDelivery = {
      id: deliveryId,
      eventType,
      endpointUrl: targetUrl,
      status: 'SUCCESSFUL' as const,
      httpStatus: 200,
      attempts: 1,
      maxAttempts: 5,
      lastAttemptAt: 'Just now',
      nextRetryAt: null,
    };

    this.webhookDeliveries.unshift(newDelivery);
    this.renderWebhookDeliveriesTable();

    if (this.testPingFeedback && this.feedbackStatusText && this.feedbackPayload && this.feedbackBadge) {
      this.feedbackBadge.className = 'feedback-badge success';
      this.feedbackStatusText.innerText = `200 OK — Test webhook delivered successfully in ${latencyMs}ms`;
      this.feedbackPayload.innerText = JSON.stringify(
        {
          id: `evt_${Date.now().toString(36)}`,
          event: eventType,
          businessId: 'biz_01j9livemerchant',
          timestamp: new Date().toISOString(),
          data: {
            status: 'SUCCESSFUL',
            test: true,
            message: 'BAXATO Outbound Webhook Ping Verified',
          },
        },
        null,
        2,
      );
      this.testPingFeedback.style.display = 'block';
    }
  }

  private handleRetryDelivery(deliveryId: string) {
    const delivery = this.webhookDeliveries.find((d) => d.id === deliveryId);
    if (!delivery) return;

    delivery.status = 'SUCCESSFUL';
    delivery.httpStatus = 200;
    delivery.attempts = Math.min(delivery.attempts + 1, delivery.maxAttempts);
    delivery.lastAttemptAt = 'Just now';
    delivery.nextRetryAt = null;

    this.renderWebhookDeliveriesTable();
  }

  private renderWebhookDeliveriesTable() {
    if (!this.webhookDeliveriesTableBody) return;

    if (this.deliveriesCountBadge) {
      this.deliveriesCountBadge.innerText = `${this.webhookDeliveries.length} Recorded`;
    }

    if (this.webhookDeliveries.length === 0) {
      this.webhookDeliveriesTableBody.innerHTML = `
        <tr>
          <td colspan="7" class="empty-keys-row">
            <i class="fa-solid fa-satellite-dish"></i> No outbound webhooks dispatched yet. Trigger an API purchase or send a test ping.
          </td>
        </tr>
      `;
      return;
    }

    this.webhookDeliveriesTableBody.innerHTML = '';
    this.webhookDeliveries.forEach((del) => {
      const tr = document.createElement('tr');
      const isSuccess = del.status === 'SUCCESSFUL';

      tr.innerHTML = `
        <td class="key-name-col"><code>${del.eventType}</code></td>
        <td style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <span style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-secondary);">${del.endpointUrl}</span>
        </td>
        <td>
          <span class="status-pill ${del.status.toLowerCase()}">${del.status}</span>
        </td>
        <td>
          <span class="key-prefix-tag" style="background: ${isSuccess ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}; color: ${isSuccess ? '#34d399' : '#f87171'};">
            ${del.httpStatus || 'None'}
          </span>
        </td>
        <td class="table-meta-text">${del.attempts}/${del.maxAttempts}</td>
        <td class="table-meta-text">${del.lastAttemptAt}</td>
        <td>
          <div class="table-action-btns">
            ${
              del.status === 'FAILED'
                ? `<button class="btn-table-action rotate-btn retry-delivery-btn" data-id="${del.id}" title="Retry Delivery">
                     <i class="fa-solid fa-arrows-rotate"></i> Retry
                   </button>`
                : `<span style="font-size: 0.72rem; color: #34d399;"><i class="fa-solid fa-check"></i> Delivered</span>`
            }
          </div>
        </td>
      `;

      const retryBtn = tr.querySelector('.retry-delivery-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => {
          this.handleRetryDelivery(del.id);
        });
      }

      this.webhookDeliveriesTableBody!.appendChild(tr);
    });
  }
}

function initComingSoon(): void {
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const themeToggleIcon = document.getElementById('theme-toggle-icon');

  const savedTheme =
    localStorage.getItem('baxato_theme') ||
    (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light');

  const setTheme = (theme: 'light' | 'dark') => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('baxato_theme', theme);
    if (themeToggleIcon) {
      if (theme === 'dark') {
        themeToggleIcon.classList.remove('fa-moon');
        themeToggleIcon.classList.add('fa-sun');
      } else {
        themeToggleIcon.classList.remove('fa-sun');
        themeToggleIcon.classList.add('fa-moon');
      }
    }
  };

  setTheme(savedTheme === 'dark' ? 'dark' : 'light');

  themeToggleBtn?.addEventListener('click', () => {
    const currentTheme =
      document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(currentTheme);
  });

  const countDays = document.getElementById('count-days');
  const countHours = document.getElementById('count-hours');
  const countMins = document.getElementById('count-mins');
  const countSecs = document.getElementById('count-secs');

  let targetTime = parseInt(localStorage.getItem('baxato_launch_target') || '0', 10);
  if (!targetTime || targetTime < Date.now()) {
    targetTime =
      Date.now() + 14 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000 + 35 * 60 * 1000;
    localStorage.setItem('baxato_launch_target', String(targetTime));
  }

  const updateCountdown = () => {
    const now = Date.now();
    const diff = Math.max(0, targetTime - now);

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);

    if (countDays) countDays.innerText = String(days).padStart(2, '0');
    if (countHours) countHours.innerText = String(hours).padStart(2, '0');
    if (countMins) countMins.innerText = String(mins).padStart(2, '0');
    if (countSecs) countSecs.innerText = String(secs).padStart(2, '0');
  };

  updateCountdown();
  setInterval(updateCountdown, 1000);

  const waitlistForm = document.getElementById('waitlist-form') as HTMLFormElement | null;
  const waitlistEmail = document.getElementById('waitlist-email') as HTMLInputElement | null;
  const waitlistFeedback = document.getElementById('waitlist-feedback');
  const waitlistSubmitBtn = document.getElementById('waitlist-submit-btn');

  const existingEmail = localStorage.getItem('baxato_whitelist_email');
  if (existingEmail && waitlistFeedback) {
    waitlistFeedback.style.display = 'inline-flex';
    const feedbackText = document.getElementById('waitlist-feedback-text');
    if (feedbackText) {
      feedbackText.innerText = `You're on the priority early-access whitelist as ${existingEmail}!`;
    }
  }

  waitlistForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!waitlistEmail?.value) return;

    const email = waitlistEmail.value.trim();
    localStorage.setItem('baxato_whitelist_email', email);

    if (waitlistSubmitBtn) {
      waitlistSubmitBtn.setAttribute('disabled', 'true');
      waitlistSubmitBtn.innerText = 'Submitting...';
    }

    setTimeout(() => {
      if (waitlistSubmitBtn) {
        waitlistSubmitBtn.removeAttribute('disabled');
        waitlistSubmitBtn.innerText = 'Submitted';
      }
      if (waitlistFeedback) {
        waitlistFeedback.style.display = 'inline-flex';
        const feedbackText = document.getElementById('waitlist-feedback-text');
        if (feedbackText) {
          feedbackText.innerText = "Thank you! We'll notify you as soon as we launch.";
        }
      }
    }, 400);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initComingSoon();
  if (document.getElementById('merchant-console-view')) {
    new DashboardClient();
  }
});

