'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Mail,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import AccessRestricted from '@/components/dashboard/AccessRestricted';
import ModalDialog from '@/components/ModalDialog';
import BaxatoLoader from '@/components/BaxatoLoader';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  getStoredBusiness,
  getStoredUser,
  handleAuthResponse,
} from '@/lib/auth-session';
import { showToast } from '@/lib/toast';

export type UserRole =
  | 'BUSINESS_OWNER'
  | 'BUSINESS_ADMIN'
  | 'FINANCE'
  | 'DEVELOPER'
  | 'SUPPORT'
  | 'VIEWER';

type TeamTab = 'members' | 'invitations' | 'roles';

interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  isOwner: boolean;
  joinedAt: string;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  expiresAt: string;
  createdAt: string;
  invitedBy: string;
}

const ASSIGNABLE_ROLES: UserRole[] = [
  'BUSINESS_ADMIN',
  'DEVELOPER',
  'FINANCE',
  'SUPPORT',
  'VIEWER',
];

const ROLE_DISPLAY: Record<UserRole, { name: string; description: string }> = {
  BUSINESS_OWNER: {
    name: 'Owner',
    description: 'Full access to workspace settings, wallets, team management, and transfers.',
  },
  BUSINESS_ADMIN: {
    name: 'Administrator',
    description: 'Manage workspace profile, team members, API keys, webhooks, and bill payments.',
  },
  DEVELOPER: {
    name: 'Developer',
    description: 'Manage API keys, webhook endpoints, utility API integrations, and logs.',
  },
  FINANCE: {
    name: 'Finance & Billing',
    description: 'View wallet balances, funding accounts, transactions, and ledger statements.',
  },
  SUPPORT: {
    name: 'Customer Support',
    description: 'Assist customers with transaction lookups, receipts, and meter tokens.',
  },
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access to overview metrics and transaction summaries.',
  },
};

interface MatrixRow {
  permission: string;
  owner: boolean;
  admin: boolean;
  developer: boolean;
  finance: boolean;
  support: boolean;
  viewer: boolean;
}

interface MatrixCategory {
  category: string;
  items: MatrixRow[];
}

const PERMISSION_GRID: MatrixCategory[] = [
  {
    category: 'Workspace & Administration',
    items: [
      {
        permission: 'Manage business profile & KYC',
        owner: true,
        admin: true,
        developer: false,
        finance: false,
        support: false,
        viewer: false,
      },
      {
        permission: 'Invite and manage team members',
        owner: true,
        admin: true,
        developer: false,
        finance: false,
        support: false,
        viewer: false,
      },
      {
        permission: 'View workspace audit logs',
        owner: true,
        admin: true,
        developer: false,
        finance: false,
        support: false,
        viewer: false,
      },
      {
        permission: 'Transfer workspace ownership',
        owner: true,
        admin: false,
        developer: false,
        finance: false,
        support: false,
        viewer: false,
      },
    ],
  },
  {
    category: 'Bills & Transactions',
    items: [
      {
        permission: 'Process bill payments (Airtime, Data, Electricity, Cable TV, Exam PINs)',
        owner: true,
        admin: true,
        developer: true,
        finance: false,
        support: false,
        viewer: false,
      },
      {
        permission: 'Search transactions & download receipts',
        owner: true,
        admin: true,
        developer: true,
        finance: true,
        support: true,
        viewer: true,
      },
      {
        permission: 'View electricity tokens & exam PINs',
        owner: true,
        admin: true,
        developer: false,
        finance: false,
        support: true,
        viewer: false,
      },
    ],
  },
  {
    category: 'Wallet & Billing',
    items: [
      {
        permission: 'View wallet balances & funding accounts',
        owner: true,
        admin: true,
        developer: false,
        finance: true,
        support: false,
        viewer: false,
      },
      {
        permission: 'Initiate wallet transfers & payouts',
        owner: true,
        admin: false,
        developer: false,
        finance: false,
        support: false,
        viewer: false,
      },
    ],
  },
  {
    category: 'Developer & APIs',
    items: [
      {
        permission: 'Manage API keys (Live & Test)',
        owner: true,
        admin: true,
        developer: true,
        finance: false,
        support: false,
        viewer: false,
      },
      {
        permission: 'Configure webhooks & inspect delivery logs',
        owner: true,
        admin: true,
        developer: true,
        finance: false,
        support: false,
        viewer: false,
      },
      {
        permission: 'View developer API reference & examples',
        owner: true,
        admin: true,
        developer: true,
        finance: true,
        support: true,
        viewer: true,
      },
    ],
  },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function TeamManagementPage() {
  const membersTabId = useId();
  const invitationsTabId = useId();
  const rolesTabId = useId();
  const membersTableTitleId = useId();
  const invitationsTableTitleId = useId();
  const rolesTableTitleId = useId();
  const memberSearchId = useId();
  const roleFilterId = useId();
  const inviteSearchId = useId();
  const inviteModalTitleId = useId();
  const inviteEmailId = useId();
  const inviteEmailErrorId = useId();
  const roleModalTitleId = useId();
  const removeModalTitleId = useId();

  const tabRefs = useRef<Record<TeamTab, HTMLButtonElement | null>>({
    members: null,
    invitations: null,
    roles: null,
  });
  const inviteEmailRef = useRef<HTMLInputElement>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  const [businessId, setBusinessId] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [merchantName, setMerchantName] = useState<string>('');
  const [kycStatus, setKycStatus] = useState<string>('INITIALIZING');
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [activeTab, setActiveTab] = useState<TeamTab>('members');

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteEmailTouched, setInviteEmailTouched] = useState(false);
  const [inviteEmailError, setInviteEmailError] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('DEVELOPER');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [createdInviteLink, setCreatedInviteLink] = useState<string>('');
  const [inviteFormError, setInviteFormError] = useState<string>('');
  const [inviteLinksById, setInviteLinksById] = useState<Record<string, string>>({});

  const [roleChangeTarget, setRoleChangeTarget] = useState<TeamMember | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('DEVELOPER');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const isOwnerOrAdmin =
    userRole === 'BUSINESS_OWNER' || userRole === 'BUSINESS_ADMIN';

  const syncWorkspaceFromStorage = useCallback(() => {
    const user = getStoredUser();
    const biz = getStoredBusiness();
    const resolvedRole = biz?.role || user?.role || 'BUSINESS_OWNER';

    setBusinessId(biz?.id || '');
    setBusinessName(biz?.name || '');
    setMerchantName(
      `${user?.firstName || ''} ${user?.lastName || ''}`.trim() ||
        user?.firstName ||
        '',
    );
    setKycStatus(user?.kycStatus || 'UNVERIFIED');
    setUserRole(resolvedRole);

    return {
      bizId: biz?.id || '',
      role: resolvedRole,
    };
  }, []);

  const fetchTeamData = useCallback(
    async (explicitBizId?: string) => {
      const token = getStoredAuthToken();
      if (!token) {
        clearSessionAndRedirect('expired');
        return;
      }

      const activeBizId = explicitBizId ?? getStoredBusiness()?.id ?? '';
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        ...(activeBizId ? { 'x-business-id': activeBizId } : {}),
      };

      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/team/members', { headers }),
        fetch('/api/team/invites', { headers }),
      ]);

      const [membersJson, invitesJson] = await Promise.all([
        membersRes.json().catch(() => null),
        invitesRes.json().catch(() => null),
      ]);

      if (
        handleAuthResponse(membersRes, membersJson) ||
        handleAuthResponse(invitesRes, invitesJson)
      ) {
        return;
      }

      if (membersRes.ok && membersJson?.success && Array.isArray(membersJson.data?.members)) {
        setMembers(membersJson.data.members);
      } else if (!membersRes.ok) {
        showToast({
          type: 'error',
          message: membersJson?.error?.message || 'Unable to load team members.',
        });
      }

      if (
        invitesRes.ok &&
        invitesJson?.success &&
        Array.isArray(invitesJson.data?.invitations)
      ) {
        setInvitations(invitesJson.data.invitations);
      } else if (!invitesRes.ok) {
        showToast({
          type: 'error',
          message: invitesJson?.error?.message || 'Unable to load pending invitations.',
        });
      }
    },
    [],
  );

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    const { bizId, role } = syncWorkspaceFromStorage();
    const canManage = role === 'BUSINESS_OWNER' || role === 'BUSINESS_ADMIN';

    if (!canManage) {
      setIsInitialLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        await fetchTeamData(bizId);
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    })();

    const handleBusinessSwitched = async () => {
      const next = syncWorkspaceFromStorage();
      if (next.role === 'BUSINESS_OWNER' || next.role === 'BUSINESS_ADMIN') {
        setIsRefreshing(true);
        await fetchTeamData(next.bizId);
        setIsRefreshing(false);
      } else {
        setMembers([]);
        setInvitations([]);
      }
    };

    window.addEventListener('bx_business_switched', handleBusinessSwitched);
    return () => {
      cancelled = true;
      window.removeEventListener('bx_business_switched', handleBusinessSwitched);
    };
  }, [fetchTeamData, syncWorkspaceFromStorage]);

  const handleRefresh = async () => {
    if (!isOwnerOrAdmin || isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchTeamData(businessId);
      showToast({ type: 'success', message: 'Team directory updated.' });
    } catch {
      showToast({ type: 'error', message: 'Network error refreshing team data.' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const validateInviteEmailValue = (value: string): string => {
    const clean = value.trim();
    if (!clean) return 'Enter a team member email address.';
    if (!EMAIL_PATTERN.test(clean)) return 'Enter an email address in the format name@company.com.';
    return '';
  };

  const openInviteModal = () => {
    setInviteEmail('');
    setInviteEmailTouched(false);
    setInviteEmailError('');
    setInviteFormError('');
    setCreatedInviteLink('');
    setInviteRole('DEVELOPER');
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteFormError('');

    const emailErr = validateInviteEmailValue(inviteEmail);
    setInviteEmailTouched(true);
    setInviteEmailError(emailErr);
    if (emailErr) {
      inviteEmailRef.current?.focus();
      return;
    }

    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    setIsSubmittingInvite(true);
    try {
      const res = await fetch('/api/team/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(businessId ? { 'x-business-id': businessId } : {}),
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const json = await res.json().catch(() => null);
      if (handleAuthResponse(res, json)) return;

      if (!res.ok || !json?.success) {
        setInviteFormError(json?.error?.message || 'Could not send invitation.');
        return;
      }

      const recipient = inviteEmail.trim();
      const rawToken = json.data?.rawToken as string | undefined;
      const invitationId = json.data?.invitationId as string | undefined;
      const inviteLink =
        rawToken && typeof window !== 'undefined'
          ? `${window.location.origin}/invite/${rawToken}`
          : '';

      if (inviteLink) {
        setCreatedInviteLink(inviteLink);
        if (invitationId) {
          setInviteLinksById((prev) => ({ ...prev, [invitationId]: inviteLink }));
        }
      } else {
        setIsInviteModalOpen(false);
      }

      setInviteEmail('');
      setInviteEmailTouched(false);
      setInviteEmailError('');
      showToast({ type: 'success', message: `Invitation sent to ${recipient}.` });
      await fetchTeamData(businessId);
    } catch {
      setInviteFormError('Network error while sending invitation.');
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleResendInvite = async (invite: TeamInvitation) => {
    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    setResendingInviteId(invite.id);
    try {
      const res = await fetch(`/api/team/invites/${invite.id}/resend`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(businessId ? { 'x-business-id': businessId } : {}),
        },
      });
      const json = await res.json().catch(() => null);
      if (handleAuthResponse(res, json)) return;

      if (!res.ok || !json?.success) {
        showToast({
          type: 'error',
          message: json?.error?.message || 'Unable to resend invitation.',
        });
        return;
      }

      const rawToken = json.data?.rawToken as string | undefined;
      if (rawToken && typeof window !== 'undefined') {
        const link = `${window.location.origin}/invite/${rawToken}`;
        setInviteLinksById((prev) => ({ ...prev, [invite.id]: link }));
      }
      showToast({ type: 'success', message: `Invitation resent to ${invite.email}.` });
      await fetchTeamData(businessId);
    } catch {
      showToast({ type: 'error', message: 'Network error resending invitation.' });
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleRevokeInvite = async (invite: TeamInvitation) => {
    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    setRevokingInviteId(invite.id);
    try {
      const res = await fetch(`/api/team/invites/${invite.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(businessId ? { 'x-business-id': businessId } : {}),
        },
      });
      const json = await res.json().catch(() => null);
      if (handleAuthResponse(res, json)) return;

      if (!res.ok || !json?.success) {
        showToast({
          type: 'error',
          message: json?.error?.message || 'Unable to revoke invitation.',
        });
        return;
      }

      showToast({ type: 'success', message: `Invitation for ${invite.email} revoked.` });
      await fetchTeamData(businessId);
    } catch {
      showToast({ type: 'error', message: 'Network error revoking invitation.' });
    } finally {
      setRevokingInviteId(null);
    }
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleChangeTarget) return;

    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    setIsUpdatingRole(true);
    try {
      const res = await fetch(`/api/team/members/${roleChangeTarget.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(businessId ? { 'x-business-id': businessId } : {}),
        },
        body: JSON.stringify({ role: selectedNewRole }),
      });
      const json = await res.json().catch(() => null);
      if (handleAuthResponse(res, json)) return;

      if (!res.ok || !json?.success) {
        showToast({
          type: 'error',
          message: json?.error?.message || 'Unable to update member role.',
        });
        return;
      }

      const targetName = roleChangeTarget.name || roleChangeTarget.email;
      setRoleChangeTarget(null);
      showToast({ type: 'success', message: `Updated role for ${targetName}.` });
      await fetchTeamData(businessId);
    } catch {
      showToast({ type: 'error', message: 'Network error updating member role.' });
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;

    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    setIsRemovingMember(true);
    try {
      const res = await fetch(`/api/team/members/${removeTarget.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          ...(businessId ? { 'x-business-id': businessId } : {}),
        },
      });
      const json = await res.json().catch(() => null);
      if (handleAuthResponse(res, json)) return;

      if (!res.ok || !json?.success) {
        showToast({
          type: 'error',
          message: json?.error?.message || 'Unable to remove team member.',
        });
        return;
      }

      const removedName = removeTarget.name || removeTarget.email;
      setRemoveTarget(null);
      showToast({ type: 'success', message: `${removedName} removed from workspace.` });
      await fetchTeamData(businessId);
    } catch {
      showToast({ type: 'error', message: 'Network error removing team member.' });
    } finally {
      setIsRemovingMember(false);
    }
  };

  const copyText = async (text: string, id: string, label = 'Invite link copied.') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast({ type: 'success', message: label });
      setTimeout(() => {
        setCopiedId((prev) => (prev === id ? null : prev));
      }, 2000);
    } catch {
      showToast({ type: 'error', message: 'Unable to copy to clipboard.' });
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getRemainingDays = (expiresAtStr: string) => {
    try {
      const diff = new Date(expiresAtStr).getTime() - Date.now();
      return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    } catch {
      return 0;
    }
  };

  const getInitials = (name: string, email: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
      return name.trim().slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    current: TeamTab,
  ) => {
    const order: TeamTab[] = ['members', 'invitations', 'roles'];
    const idx = order.indexOf(current);
    let nextIdx = -1;

    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % order.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + order.length) % order.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = order.length - 1;

    if (nextIdx !== -1) {
      e.preventDefault();
      const target = order[nextIdx];
      setActiveTab(target);
      tabRefs.current[target]?.focus();
    }
  };

  const filteredMembers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return members.filter((m) => {
      const matchesQuery =
        !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
      const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
      return matchesQuery && matchesRole;
    });
  }, [members, searchQuery, roleFilter]);

  const filteredInvitations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return invitations.filter((inv) => !q || inv.email.toLowerCase().includes(q));
  }, [invitations, searchQuery]);

  if (isInitialLoading) {
    return <BaxatoLoader variant="fullscreen" />;
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        userRole={userRole}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          businessName={businessName}
          kycStatus={kycStatus}
          userRole={userRole}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          sticky={false}
        />

        <main className="flex-1 px-4 py-5 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
          {!isOwnerOrAdmin ? (
            <AccessRestricted description="Team members, pending invitations, and role permissions are restricted to Workspace Owners and Administrators." />
          ) : (
            <>
              <KycBanner
                kycStatus={kycStatus}
                userRole={userRole}
                onOpenKycModal={() => setIsKycModalOpen(true)}
              />

              {/* Top Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Back to Dashboard</span>
                </Link>

                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  aria-label="Refresh team directory"
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#126BEB]' : 'text-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    Team
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Manage workspace access and role permissions for teammates.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openInviteModal}
                  className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-sm font-medium transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <UserPlus className="w-4 h-4" aria-hidden="true" />
                  <span>Invite Member</span>
                </button>
              </div>

              {/* Accessible Tabs */}
              <div className="border-b border-slate-200 dark:border-slate-800">
                <div
                  role="tablist"
                  aria-label="Team management sections"
                  className="flex items-center gap-6 overflow-x-auto scrollbar-none"
                >
                  {(
                    [
                      { id: 'members' as const, label: 'Members', count: members.length, tabId: membersTabId },
                      { id: 'invitations' as const, label: 'Invitations', count: invitations.length, tabId: invitationsTabId },
                      { id: 'roles' as const, label: 'Roles & Permissions', count: null, tabId: rolesTabId },
                    ]
                  ).map((tab) => {
                    const isSelected = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        ref={(el) => {
                          tabRefs.current[tab.id] = el;
                        }}
                        id={tab.tabId}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => setActiveTab(tab.id)}
                        onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                        className={`relative py-3 text-sm font-medium whitespace-nowrap shrink-0 flex items-center gap-2 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#126BEB] ${
                          isSelected
                            ? 'border-[#126BEB] dark:border-[#38BDF8] text-[#126BEB] dark:text-[#38BDF8] font-semibold'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                      >
                        <span>{tab.label}</span>
                        {tab.count !== null && (
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              isSelected
                                ? 'bg-[#126BEB]/10 dark:bg-[#38BDF8]/15 text-[#126BEB] dark:text-[#38BDF8]'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {tab.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* TAB 1: MEMBERS */}
              {activeTab === 'members' && (
                <section
                  role="tabpanel"
                  aria-labelledby={membersTabId}
                  className="space-y-4"
                >
                  <search>
                    <form
                      onSubmit={(e) => e.preventDefault()}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                    >
                      <div className="relative flex-1 sm:max-w-sm">
                        <label htmlFor={memberSearchId} className="sr-only">
                          Search team members by name or email
                        </label>
                        <Search
                          className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          id={memberSearchId}
                          type="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search by name or email..."
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          className="w-full h-11 pl-10 pr-9 text-base sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB] focus:border-transparent"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            aria-label="Clear member search"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="relative sm:w-52">
                        <label htmlFor={roleFilterId} className="sr-only">
                          Filter members by role
                        </label>
                        <select
                          id={roleFilterId}
                          value={roleFilter}
                          onChange={(e) => setRoleFilter(e.target.value)}
                          className="w-full h-11 appearance-none pl-3.5 pr-9 text-base sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#126BEB] focus:border-transparent cursor-pointer"
                        >
                          <option value="ALL">All roles</option>
                          <option value="BUSINESS_OWNER">Owner</option>
                          <option value="BUSINESS_ADMIN">Administrator</option>
                          <option value="DEVELOPER">Developer</option>
                          <option value="FINANCE">Finance &amp; Billing</option>
                          <option value="SUPPORT">Customer Support</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                        <ChevronDown
                          className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                      </div>
                    </form>
                  </search>

                  <div className="bg-[#FFFFFF] dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <h2 id={membersTableTitleId} className="sr-only">
                      Workspace members
                    </h2>

                    {filteredMembers.length === 0 ? (
                      <div className="py-12 px-4 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                          <Users className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {searchQuery || roleFilter !== 'ALL'
                            ? 'No members match your filters'
                            : 'No team members yet'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {searchQuery || roleFilter !== 'ALL'
                            ? 'Clear your search query or select All roles.'
                            : 'Invite colleagues to collaborate in this workspace.'}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Desktop Responsive Table */}
                        <div
                          tabIndex={0}
                          role="region"
                          aria-labelledby={membersTableTitleId}
                          className="hidden md:block overflow-x-auto"
                        >
                          <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50/70 dark:bg-[#081020] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                              <tr>
                                <th scope="col" className="py-3.5 px-6">
                                  Member
                                </th>
                                <th scope="col" className="py-3.5 px-4">
                                  Role
                                </th>
                                <th scope="col" className="py-3.5 px-4">
                                  Status
                                </th>
                                <th scope="col" className="py-3.5 px-4">
                                  Added
                                </th>
                                <th scope="col" className="py-3.5 px-6 text-right">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                              {filteredMembers.map((member) => {
                                const roleInfo = ROLE_DISPLAY[member.role] || ROLE_DISPLAY.VIEWER;
                                const roleName = member.isOwner ? 'Owner' : roleInfo.name;

                                return (
                                  <tr
                                    key={member.id}
                                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                                  >
                                    <th scope="row" className="py-3.5 px-6 font-normal text-left">
                                      <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-semibold text-xs shrink-0">
                                          {getInitials(member.name, member.email)}
                                        </div>
                                        <div className="min-w-0">
                                          <span className="font-medium text-slate-900 dark:text-white block truncate">
                                            {member.name || member.email}
                                          </span>
                                          <span className="text-xs text-slate-500 dark:text-slate-400 block truncate">
                                            {member.email}
                                          </span>
                                        </div>
                                      </div>
                                    </th>
                                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                                      {roleName}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Active
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                                      {formatDate(member.joinedAt)}
                                    </td>
                                    <td className="py-3.5 px-6 text-right">
                                      {member.isOwner ? (
                                        <span className="text-xs text-slate-400">—</span>
                                      ) : (
                                        <div className="flex items-center justify-end gap-2">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setRoleChangeTarget(member);
                                              setSelectedNewRole(member.role);
                                            }}
                                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                          >
                                            Edit role
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setRemoveTarget(member)}
                                            aria-label={`Remove ${member.name || member.email}`}
                                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                          >
                                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Stacked Cards */}
                        <ul className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredMembers.map((member) => {
                            const roleInfo = ROLE_DISPLAY[member.role] || ROLE_DISPLAY.VIEWER;
                            const roleName = member.isOwner ? 'Owner' : roleInfo.name;

                            return (
                              <li key={member.id} className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-semibold text-xs shrink-0">
                                      {getInitials(member.name, member.email)}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                        {member.name || member.email}
                                      </p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                        {member.email}
                                      </p>
                                    </div>
                                  </div>
                                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 shrink-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Active
                                  </span>
                                </div>

                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                  <span>Role: {roleName}</span>
                                  <span>Added {formatDate(member.joinedAt)}</span>
                                </div>

                                {!member.isOwner && (
                                  <div className="flex items-center gap-2 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRoleChangeTarget(member);
                                        setSelectedNewRole(member.role);
                                      }}
                                      className="flex-1 h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                      Edit role
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setRemoveTarget(member)}
                                      className="h-9 px-3 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400 hover:bg-red-100/60 transition-colors cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </div>
                </section>
              )}

              {/* TAB 2: INVITATIONS */}
              {activeTab === 'invitations' && (
                <section
                  role="tabpanel"
                  aria-labelledby={invitationsTabId}
                  className="space-y-4"
                >
                  <search>
                    <form
                      onSubmit={(e) => e.preventDefault()}
                      className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                    >
                      <div className="relative flex-1 sm:max-w-sm">
                        <label htmlFor={inviteSearchId} className="sr-only">
                          Search invitations by email
                        </label>
                        <Search
                          className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                          aria-hidden="true"
                        />
                        <input
                          id={inviteSearchId}
                          type="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search invitations by email..."
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          className="w-full h-11 pl-10 pr-9 text-base sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB] focus:border-transparent"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            aria-label="Clear invitation search"
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={openInviteModal}
                        className="inline-flex items-center justify-center gap-1.5 h-11 px-4 text-xs sm:text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                      >
                        <UserPlus className="w-4 h-4 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                        <span>New Invite</span>
                      </button>
                    </form>
                  </search>

                  <div className="bg-[#FFFFFF] dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <h2 id={invitationsTableTitleId} className="sr-only">
                      Pending workspace invitations
                    </h2>

                    {filteredInvitations.length === 0 ? (
                      <div className="py-12 px-4 text-center space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                          <Mail className="w-5 h-5" aria-hidden="true" />
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {searchQuery ? 'No invitations match your query' : 'No pending invitations'}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {searchQuery
                            ? 'Check the email spelling or clear the search filter.'
                            : 'Sent invitations awaiting acceptance appear here.'}
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Desktop Table */}
                        <div
                          tabIndex={0}
                          role="region"
                          aria-labelledby={invitationsTableTitleId}
                          className="hidden md:block overflow-x-auto"
                        >
                          <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50/70 dark:bg-[#081020] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                              <tr>
                                <th scope="col" className="py-3.5 px-6">
                                  Invitee
                                </th>
                                <th scope="col" className="py-3.5 px-4">
                                  Role
                                </th>
                                <th scope="col" className="py-3.5 px-4">
                                  Invited By
                                </th>
                                <th scope="col" className="py-3.5 px-4">
                                  Expires
                                </th>
                                <th scope="col" className="py-3.5 px-6 text-right">
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                              {filteredInvitations.map((inv) => {
                                const roleInfo = ROLE_DISPLAY[inv.role] || ROLE_DISPLAY.VIEWER;
                                const remainingDays = getRemainingDays(inv.expiresAt);
                                const directLink = inviteLinksById[inv.id];

                                return (
                                  <tr
                                    key={inv.id}
                                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                                  >
                                    <th scope="row" className="py-3.5 px-6 font-normal text-left">
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                                          <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                                        </div>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                          {inv.email}
                                        </span>
                                      </div>
                                    </th>
                                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                                      {roleInfo.name}
                                    </td>
                                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                                      {inv.invitedBy}
                                    </td>
                                    <td className="py-3.5 px-4">
                                      <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                                        <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                                        {remainingDays === 0
                                          ? 'Expires today'
                                          : `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} left`}
                                      </span>
                                    </td>
                                    <td className="py-3.5 px-6 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        {directLink && (
                                          <button
                                            type="button"
                                            onClick={() => copyText(directLink, inv.id)}
                                            className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                          >
                                            {copiedId === inv.id ? (
                                              <Check className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                                            ) : (
                                              <Copy className="w-3 h-3" aria-hidden="true" />
                                            )}
                                            <span>{copiedId === inv.id ? 'Copied' : 'Copy link'}</span>
                                          </button>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleResendInvite(inv)}
                                          disabled={resendingInviteId === inv.id}
                                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                        >
                                          <RefreshCw
                                            className={`w-3 h-3 ${resendingInviteId === inv.id ? 'animate-spin text-[#126BEB]' : ''}`}
                                            aria-hidden="true"
                                          />
                                          <span>Resend</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRevokeInvite(inv)}
                                          disabled={revokingInviteId === inv.id}
                                          className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100/60 dark:hover:bg-red-900/40 transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                          Revoke
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Stacked Cards */}
                        <ul className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                          {filteredInvitations.map((inv) => {
                            const roleInfo = ROLE_DISPLAY[inv.role] || ROLE_DISPLAY.VIEWER;
                            const remainingDays = getRemainingDays(inv.expiresAt);
                            const directLink = inviteLinksById[inv.id];

                            return (
                              <li key={inv.id} className="p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                      {inv.email}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {roleInfo.name} · Invited by {inv.invitedBy}
                                    </p>
                                  </div>
                                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 shrink-0">
                                    <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                                    {remainingDays === 0 ? 'Today' : `${remainingDays}d left`}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  {directLink && (
                                    <button
                                      type="button"
                                      onClick={() => copyText(directLink, inv.id)}
                                      className="h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                                    >
                                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                      <span>{copiedId === inv.id ? 'Copied' : 'Copy link'}</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleResendInvite(inv)}
                                    disabled={resendingInviteId === inv.id}
                                    className="flex-1 h-9 px-3 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                  >
                                    <RefreshCw
                                      className={`w-3.5 h-3.5 ${resendingInviteId === inv.id ? 'animate-spin' : ''}`}
                                      aria-hidden="true"
                                    />
                                    <span>Resend</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeInvite(inv)}
                                    disabled={revokingInviteId === inv.id}
                                    className="flex-1 h-9 px-3 text-xs font-medium rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-400 cursor-pointer disabled:opacity-50"
                                  >
                                    Revoke
                                  </button>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </>
                    )}
                  </div>
                </section>
              )}

              {/* TAB 3: ROLES & PERMISSIONS */}
              {activeTab === 'roles' && (
                <section
                  role="tabpanel"
                  aria-labelledby={rolesTabId}
                  className="space-y-4"
                >
                  <div>
                    <h2 id={rolesTableTitleId} className="text-sm font-semibold text-slate-900 dark:text-white">
                      Roles &amp; permissions
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Capabilities assigned to each workspace role.
                    </p>
                  </div>

                  <div className="bg-[#FFFFFF] dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <div
                      tabIndex={0}
                      role="region"
                      aria-labelledby={rolesTableTitleId}
                      className="overflow-x-auto"
                    >
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-50/70 dark:bg-[#081020] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                          <tr>
                            <th scope="col" className="py-3.5 px-5 font-semibold uppercase tracking-wider min-w-[240px]">
                              Permission
                            </th>
                            <th scope="col" className="py-3.5 px-3 font-semibold text-center min-w-[80px]">
                              Owner
                            </th>
                            <th scope="col" className="py-3.5 px-3 font-semibold text-center min-w-[80px]">
                              Admin
                            </th>
                            <th scope="col" className="py-3.5 px-3 font-semibold text-center min-w-[80px]">
                              Developer
                            </th>
                            <th scope="col" className="py-3.5 px-3 font-semibold text-center min-w-[80px]">
                              Finance
                            </th>
                            <th scope="col" className="py-3.5 px-3 font-semibold text-center min-w-[80px]">
                              Support
                            </th>
                            <th scope="col" className="py-3.5 px-3 font-semibold text-center min-w-[80px]">
                              Viewer
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {PERMISSION_GRID.map((cat) => (
                            <React.Fragment key={cat.category}>
                              <tr className="bg-slate-50/50 dark:bg-slate-900/40">
                                <th
                                  scope="colgroup"
                                  colSpan={7}
                                  className="py-2.5 px-5 font-semibold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wide border-y border-slate-200 dark:border-slate-800"
                                >
                                  {cat.category}
                                </th>
                              </tr>
                              {cat.items.map((row) => {
                                const renderCell = (allowed: boolean, roleLabel: string) => (
                                  <td className="py-3 px-3 text-center">
                                    {allowed ? (
                                      <Check
                                        className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto"
                                        aria-label={`${roleLabel}: Allowed`}
                                      />
                                    ) : (
                                      <span
                                        className="text-slate-300 dark:text-slate-600 font-semibold"
                                        aria-label={`${roleLabel}: Not allowed`}
                                      >
                                        —
                                      </span>
                                    )}
                                  </td>
                                );

                                return (
                                  <tr
                                    key={row.permission}
                                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors"
                                  >
                                    <th scope="row" className="py-3 px-5 text-xs font-medium text-slate-800 dark:text-slate-200">
                                      {row.permission}
                                    </th>
                                    {renderCell(row.owner, 'Owner')}
                                    {renderCell(row.admin, 'Admin')}
                                    {renderCell(row.developer, 'Developer')}
                                    {renderCell(row.finance, 'Finance')}
                                    {renderCell(row.support, 'Support')}
                                    {renderCell(row.viewer, 'Viewer')}
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* MODAL: INVITE MEMBER */}
      <ModalDialog
        isOpen={isInviteModalOpen}
        onClose={() => {
          if (!isSubmittingInvite) setIsInviteModalOpen(false);
        }}
        dismissible={!isSubmittingInvite}
        ariaLabelledBy={inviteModalTitleId}
        maxWidthClass="max-w-lg"
      >
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 id={inviteModalTitleId} className="text-base font-semibold text-slate-900 dark:text-white">
              Invite team member
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Send a workspace invitation and assign access permissions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !isSubmittingInvite && setIsInviteModalOpen(false)}
            aria-label="Close invite dialog"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSendInvite} noValidate className="p-6 space-y-5">
          {createdInviteLink && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 space-y-2.5">
              <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">
                Invitation link ready. You can share it directly if needed:
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdInviteLink}
                  aria-label="Direct invitation link"
                  className="flex-1 h-9 px-2.5 text-xs font-mono rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-[#070D18] text-slate-700 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => copyText(createdInviteLink, 'modal-invite-link')}
                  className="h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {copiedId === 'modal-invite-link' ? (
                    <>
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {inviteFormError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{inviteFormError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor={inviteEmailId}
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Email address
            </label>
            <input
              ref={inviteEmailRef}
              id={inviteEmailId}
              name="email"
              type="email"
              required
              autoFocus
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="colleague@company.com"
              value={inviteEmail}
              aria-invalid={inviteEmailTouched && Boolean(inviteEmailError)}
              aria-describedby={
                inviteEmailTouched && inviteEmailError ? inviteEmailErrorId : undefined
              }
              onChange={(e) => {
                const val = e.target.value;
                setInviteEmail(val);
                if (inviteEmailError) {
                  setInviteEmailError(validateInviteEmailValue(val));
                }
              }}
              onBlur={() => {
                if (inviteEmail.trim() || inviteEmailTouched) {
                  setInviteEmailTouched(true);
                  setInviteEmailError(validateInviteEmailValue(inviteEmail));
                }
              }}
              className={`w-full h-11 px-3.5 text-base sm:text-sm rounded-lg border bg-white dark:bg-[#070D18] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                inviteEmailTouched && inviteEmailError
                  ? 'border-red-500 focus:ring-red-500/40'
                  : 'border-slate-300 dark:border-slate-700 focus:ring-[#126BEB]'
              }`}
            />
            {inviteEmailTouched && inviteEmailError && (
              <p id={inviteEmailErrorId} className="text-xs text-red-600 dark:text-red-400">
                {inviteEmailError}
              </p>
            )}
          </div>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Role
            </legend>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {ASSIGNABLE_ROLES.map((roleOption) => {
                const info = ROLE_DISPLAY[roleOption];
                const radioId = `invite-role-${roleOption}`;
                const isSelected = inviteRole === roleOption;

                return (
                  <label
                    key={roleOption}
                    htmlFor={radioId}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-[#126BEB] bg-blue-50/40 dark:bg-blue-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#0B1528]'
                    }`}
                  >
                    <input
                      id={radioId}
                      type="radio"
                      name="inviteRole"
                      value={roleOption}
                      checked={isSelected}
                      onChange={() => setInviteRole(roleOption)}
                      className="mt-0.5 accent-[#126BEB]"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                        {info.name}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                        {info.description}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => !isSubmittingInvite && setIsInviteModalOpen(false)}
              className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
            >
              {createdInviteLink ? 'Done' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmittingInvite}
              className="h-11 px-5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-medium text-sm transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmittingInvite && <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>Send Invite</span>
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: EDIT MEMBER ROLE */}
      <ModalDialog
        isOpen={Boolean(roleChangeTarget)}
        onClose={() => {
          if (!isUpdatingRole) setRoleChangeTarget(null);
        }}
        dismissible={!isUpdatingRole}
        ariaLabelledBy={roleModalTitleId}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleUpdateRole} className="p-6 space-y-5">
          <div>
            <h2 id={roleModalTitleId} className="text-base font-semibold text-slate-900 dark:text-white">
              Edit member role
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Update permissions for{' '}
              <strong className="text-slate-800 dark:text-slate-200">
                {roleChangeTarget?.name || roleChangeTarget?.email}
              </strong>
              .
            </p>
          </div>

          <fieldset className="space-y-2 max-h-72 overflow-y-auto pr-1">
            <legend className="sr-only">Select member role</legend>
            {ASSIGNABLE_ROLES.map((roleOption) => {
              const info = ROLE_DISPLAY[roleOption];
              const radioId = `edit-role-${roleOption}`;
              const isSelected = selectedNewRole === roleOption;

              return (
                <label
                  key={roleOption}
                  htmlFor={radioId}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-[#126BEB] bg-blue-50/40 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#0B1528]'
                  }`}
                >
                  <input
                    id={radioId}
                    type="radio"
                    name="newRole"
                    value={roleOption}
                    checked={isSelected}
                    onChange={() => setSelectedNewRole(roleOption)}
                    className="mt-0.5 accent-[#126BEB]"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white block">
                      {info.name}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block mt-0.5">
                      {info.description}
                    </span>
                  </div>
                </label>
              );
            })}
          </fieldset>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => !isUpdatingRole && setRoleChangeTarget(null)}
              className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingRole}
              className="h-11 px-5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-medium text-sm transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isUpdatingRole && <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>Confirm</span>
            </button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: REMOVE MEMBER CONFIRMATION */}
      <ModalDialog
        isOpen={Boolean(removeTarget)}
        onClose={() => {
          if (!isRemovingMember) setRemoveTarget(null);
        }}
        dismissible={!isRemovingMember}
        ariaLabelledBy={removeModalTitleId}
        maxWidthClass="max-w-md"
      >
        <div className="p-6 space-y-5">
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-center text-red-600 dark:text-red-400">
            <Trash2 className="w-5 h-5" aria-hidden="true" />
          </div>

          <div className="space-y-1.5">
            <h2 id={removeModalTitleId} className="text-base font-semibold text-slate-900 dark:text-white">
              Remove team member
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Remove{' '}
              <strong className="text-slate-900 dark:text-white">
                {removeTarget?.name || removeTarget?.email}
              </strong>{' '}
              from this workspace? They will immediately lose access to all workspace resources.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              autoFocus
              onClick={() => !isRemovingMember && setRemoveTarget(null)}
              className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRemoveMember}
              disabled={isRemovingMember}
              className="h-11 px-5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isRemovingMember && <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>Remove</span>
            </button>
          </div>
        </div>
      </ModalDialog>

      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => {
          setIsKycModalOpen(false);
          fetchTeamData(businessId);
        }}
      />
    </div>
  );
}
