import { TelecomNetwork, ValidationError } from '@baxato/common';
import { db, systemSettings, eq } from '@baxato/database';
import { env } from '@baxato/config';

export interface KillSwitchesConfig {
  AIRTIME: boolean;
  DATA: boolean;
  ELECTRICITY: boolean;
  CABLE: boolean;
  EDUCATION: boolean;
  TRANSFERS: boolean;
}

export interface DisabledNetworksConfig {
  AIRTIME: TelecomNetwork[];
  DATA: TelecomNetwork[];
}

export interface SystemSettingsState {
  maintenanceMode: boolean;
  maintenanceNotice: string;
  killSwitches: KillSwitchesConfig;
  disabledNetworks: DisabledNetworksConfig;
  disabledDataPlans: string[];
  feeSchedules: {
    airtimeDiscountBps: number;
    dataDiscountBps: number;
    electricityFeeNaira: number;
    cableFeeNaira: number;
    educationPinMarkupNaira: number;
  };
  securityPolicies: {
    compulsoryStaff2Fa: boolean;
    sessionExpiryHours: number;
    maxFailedLoginsBeforeLock: number;
  };
}

export interface UpdateSystemSettingsInput {
  maintenanceMode?: boolean;
  maintenanceNotice?: string;
  killSwitches?: Partial<KillSwitchesConfig>;
  disabledNetworks?: {
    AIRTIME?: TelecomNetwork[];
    DATA?: TelecomNetwork[];
  };
  disabledDataPlans?: string[];
}

const SETTINGS_KEY = 'GLOBAL';
const VALID_NETWORKS = new Set<string>(Object.values(TelecomNetwork));

const DEFAULT_SETTINGS: SystemSettingsState = {
  maintenanceMode: false,
  maintenanceNotice: '',
  killSwitches: {
    AIRTIME: false,
    DATA: false,
    ELECTRICITY: false,
    CABLE: false,
    EDUCATION: false,
    TRANSFERS: false,
  },
  disabledNetworks: {
    AIRTIME: [],
    DATA: [],
  },
  disabledDataPlans: [],
  feeSchedules: {
    airtimeDiscountBps: 250,
    dataDiscountBps: 300,
    electricityFeeNaira: 100,
    cableFeeNaira: 100,
    educationPinMarkupNaira: 250,
  },
  securityPolicies: {
    compulsoryStaff2Fa: true,
    sessionExpiryHours: 24,
    maxFailedLoginsBeforeLock: 5,
  },
};

function normalizeNetworksList(list?: unknown): TelecomNetwork[] {
  if (!Array.isArray(list)) return [];
  const unique = new Set<TelecomNetwork>();
  for (const item of list) {
    if (typeof item !== 'string' || !VALID_NETWORKS.has(item)) {
      throw new ValidationError(
        `Invalid network '${String(item)}'. Supported: ${Object.values(TelecomNetwork).join(', ')}`,
      );
    }
    unique.add(item as TelecomNetwork);
  }
  return Array.from(unique);
}

function normalizePlanIds(list?: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const unique = new Set<string>();
  for (const item of list) {
    if (typeof item === 'string' && item.trim()) {
      unique.add(item.trim());
    }
  }
  return Array.from(unique);
}

class ServiceControlsService {
  private cachedSettings: SystemSettingsState | null = null;
  private cacheExpiresAt = 0;

  private buildStateFromRow(row?: {
    maintenanceMode?: boolean;
    killSwitches?: Record<string, boolean> | null;
    disabledNetworks?: { AIRTIME?: string[]; DATA?: string[] } | null;
    disabledDataPlans?: string[] | null;
  }): SystemSettingsState {
    const ks = (row?.killSwitches || {}) as Record<string, unknown>;
    const dn = (row?.disabledNetworks || {}) as Record<string, unknown>;

    return {
      maintenanceMode: Boolean(row?.maintenanceMode ?? false),
      maintenanceNotice: typeof ks.maintenanceNotice === 'string' ? ks.maintenanceNotice : '',
      killSwitches: {
        AIRTIME: Boolean(ks.AIRTIME),
        DATA: Boolean(ks.DATA),
        ELECTRICITY: Boolean(ks.ELECTRICITY),
        CABLE: Boolean(ks.CABLE),
        EDUCATION: Boolean(ks.EDUCATION),
        TRANSFERS: Boolean(ks.TRANSFERS),
      },
      disabledNetworks: {
        AIRTIME: Array.isArray(dn.AIRTIME)
          ? (dn.AIRTIME.filter((n) => VALID_NETWORKS.has(String(n))) as TelecomNetwork[])
          : [],
        DATA: Array.isArray(dn.DATA)
          ? (dn.DATA.filter((n) => VALID_NETWORKS.has(String(n))) as TelecomNetwork[])
          : [],
      },
      disabledDataPlans: Array.isArray(row?.disabledDataPlans)
        ? row!.disabledDataPlans.filter((id): id is string => typeof id === 'string')
        : [],
      feeSchedules: { ...DEFAULT_SETTINGS.feeSchedules },
      securityPolicies: { ...DEFAULT_SETTINGS.securityPolicies },
    };
  }

  public invalidateCache(): void {
    this.cachedSettings = null;
    this.cacheExpiresAt = 0;
  }

  public async getSettings(): Promise<SystemSettingsState> {
    if (env.NODE_ENV !== 'test' && this.cachedSettings && Date.now() < this.cacheExpiresAt) {
      return this.cachedSettings;
    }

    try {
      const [row] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, SETTINGS_KEY))
        .limit(1);

      const state = this.buildStateFromRow(row);
      if (env.NODE_ENV !== 'test') {
        this.cachedSettings = state;
        this.cacheExpiresAt = Date.now() + 5000;
      }
      return state;
    } catch {
      return this.buildStateFromRow(undefined);
    }
  }

  public async updateSettings(
    input: UpdateSystemSettingsInput,
    updatedById?: string,
  ): Promise<SystemSettingsState> {
    const current = await this.getSettings();

    const nextMaintenanceMode =
      typeof input.maintenanceMode === 'boolean' ? input.maintenanceMode : current.maintenanceMode;
    const nextNotice =
      typeof input.maintenanceNotice === 'string'
        ? input.maintenanceNotice.trim()
        : current.maintenanceNotice;

    const nextKillSwitches: KillSwitchesConfig & { maintenanceNotice?: string } = {
      AIRTIME: input.killSwitches?.AIRTIME ?? current.killSwitches.AIRTIME,
      DATA: input.killSwitches?.DATA ?? current.killSwitches.DATA,
      ELECTRICITY: input.killSwitches?.ELECTRICITY ?? current.killSwitches.ELECTRICITY,
      CABLE: input.killSwitches?.CABLE ?? current.killSwitches.CABLE,
      EDUCATION: input.killSwitches?.EDUCATION ?? current.killSwitches.EDUCATION,
      TRANSFERS: input.killSwitches?.TRANSFERS ?? current.killSwitches.TRANSFERS,
    };

    const nextDisabledNetworks: DisabledNetworksConfig = {
      AIRTIME:
        input.disabledNetworks?.AIRTIME !== undefined
          ? normalizeNetworksList(input.disabledNetworks.AIRTIME)
          : current.disabledNetworks.AIRTIME,
      DATA:
        input.disabledNetworks?.DATA !== undefined
          ? normalizeNetworksList(input.disabledNetworks.DATA)
          : current.disabledNetworks.DATA,
    };

    const nextDisabledDataPlans =
      input.disabledDataPlans !== undefined
        ? normalizePlanIds(input.disabledDataPlans)
        : current.disabledDataPlans;

    const storedKillSwitches: Record<string, any> = { ...nextKillSwitches };
    if (nextNotice) {
      storedKillSwitches.maintenanceNotice = nextNotice;
    }

    const [existing] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, SETTINGS_KEY))
      .limit(1);

    let savedRow;
    if (existing) {
      const [updated] = await db
        .update(systemSettings)
        .set({
          maintenanceMode: nextMaintenanceMode,
          killSwitches: storedKillSwitches,
          disabledNetworks: nextDisabledNetworks,
          disabledDataPlans: nextDisabledDataPlans,
          updatedById: updatedById ?? existing.updatedById ?? null,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.key, SETTINGS_KEY))
        .returning();
      savedRow = updated;
    } else {
      const [inserted] = await db
        .insert(systemSettings)
        .values({
          key: SETTINGS_KEY,
          maintenanceMode: nextMaintenanceMode,
          killSwitches: storedKillSwitches,
          disabledNetworks: nextDisabledNetworks,
          disabledDataPlans: nextDisabledDataPlans,
          updatedById: updatedById ?? null,
        })
        .returning();
      savedRow = inserted;
    }

    this.invalidateCache();
    return this.buildStateFromRow(savedRow);
  }
}

export const serviceControlsService = new ServiceControlsService();

