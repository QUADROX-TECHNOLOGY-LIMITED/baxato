'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  UserPlus,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  X,
  Search,
  ArrowLeft,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import {
  getStoredAuthToken,
  getStoredUser,
  getStoredBusiness,
  clearSessionAndRedirect,
} from '@/lib/auth-session';

export type UserRole =
  | 'BUSINESS_OWNER'
  | 'BUSINESS_ADMIN'
  | 'FINANCE'
  | 'DEVELOPER'
  | 'SUPPORT'
  | 'VIEWER';

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

const ROLE_DISPLAY: Record<UserRole, { name: string; description: string }> = {
  BUSINESS_OWNER: {
    name: 'Owner',
    description: 'Full root access to all organization resources, legal settings, and financials.',
  },
  BUSINESS_ADMIN: {
    name: 'Administrator',
    description: 'Full access to business settings, vending services, team members, and operations.',
  },
  DEVELOPER: {
    name: 'Developer',
    description: 'Access to API keys, webhooks, vending integrations, technical logs, and docs.',
  },
  FINANCE: {
    name: 'Finance & Billing',
    description: 'Access to wallet balances, bank funding, transaction accounting, and statements.',
  },
  SUPPORT: {
    name: 'Customer Support',
    description: 'Access to transaction lookups, receipt generation, and token retrieval.',
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
    category: 'Vending & Transactions',
    items: [
      {
        permission: 'Vend services (Airtime, Data, Electricity, Cable TV)',
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
        permission: 'View electricity PINs & scratch tokens',
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
        permission: 'Export financial reports & ledger statements',
        owner: true,
        admin: true,
        developer: false,
        finance: true,
        support: false,
        viewer: false,
      },
    ],
  },
  {
    category: 'Developer & Technical',
    items: [
      {
        permission: 'Manage API keys (Live & Test)',
        owner: true,
        admin: false,
        developer: true,
        finance: false,
        support: false,
        viewer: false,
      },
      {
        permission: 'Configure webhooks & inspect event logs',
        owner: true,
        admin: true,
        developer: true,
        finance: false,
        support: false,
        viewer: false,
      },
      {
        permission: 'Access API sandbox & technical documentation',
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

export default function TeamManagementPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  // Data states
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'roles'>('members');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals & Action states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('DEVELOPER');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    rawToken?: string;
  } | null>(null);

  const [roleChangeTarget, setRoleChangeTarget] = useState<TeamMember | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('DEVELOPER');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [revokingInviteId, setRevokingInviteId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  const token = typeof window !== 'undefined' ? getStoredAuthToken() : null;
  const user = typeof window !== 'undefined' ? getStoredUser() : null;
  const business = typeof window !== 'undefined' ? getStoredBusiness() : null;

  const businessName = business?.name || 'Workspace';
  const merchantName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Merchant';
  const kycStatus = user?.kycStatus || 'UNVERIFIED';
  const userRole = user?.role || 'BUSINESS_OWNER';
  const isOwnerOrAdmin = userRole === 'BUSINESS_OWNER' || userRole === 'BUSINESS_ADMIN';

  useEffect(() => {
    if (!token) {
      clearSessionAndRedirect();
      return;
    }
    if (isOwnerOrAdmin) {
      fetchTeamData();
    } else {
      setIsLoading(false);
    }
  }, [token, isOwnerOrAdmin]);

  const fetchTeamData = async () => {
    setIsLoading(true);
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'x-business-id': business?.id || '',
      };

      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/team/members', { headers }),
        fetch('/api/team/invites', { headers }),
      ]);

      const membersJson = await membersRes.json().catch(() => null);
      const invitesJson = await invitesRes.json().catch(() => null);

      if (membersJson?.success && Array.isArray(membersJson.data?.members)) {
        setMembers(membersJson.data.members);
      }
      if (invitesJson?.success && Array.isArray(invitesJson.data?.invitations)) {
        setInvitations(invitesJson.data.invitations);
      }
    } catch (err) {
      console.error('Failed to load team data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSubmittingInvite(true);
    setInviteFeedback(null);

    try {
      const res = await fetch('/api/team/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-business-id': business?.id || '',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        setInviteFeedback({
          type: 'error',
          message: json?.error?.message || 'Failed to send invitation. Please try again.',
        });
      } else {
        setInviteFeedback({
          type: 'success',
          message: `Invitation email dispatched to ${inviteEmail}.`,
          rawToken: json.data?.rawToken,
        });
        setInviteEmail('');
        fetchTeamData();
      }
    } catch {
      setInviteFeedback({
        type: 'error',
        message: 'Network error while sending invitation.',
      });
    } finally {
      setIsSubmittingInvite(false);
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    setResendingInviteId(inviteId);
    try {
      const res = await fetch(`/api/team/invites/${inviteId}/resend`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-business-id': business?.id || '',
        },
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        fetchTeamData();
      }
    } catch (err) {
      console.error('Failed to resend invite:', err);
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    setRevokingInviteId(inviteId);
    try {
      const res = await fetch(`/api/team/invites/${inviteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-business-id': business?.id || '',
        },
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        fetchTeamData();
      }
    } catch (err) {
      console.error('Failed to revoke invite:', err);
    } finally {
      setRevokingInviteId(null);
    }
  };

  const handleUpdateRole = async () => {
    if (!roleChangeTarget) return;
    setIsUpdatingRole(true);
    try {
      const res = await fetch(`/api/team/members/${roleChangeTarget.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-business-id': business?.id || '',
        },
        body: JSON.stringify({ role: selectedNewRole }),
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        setRoleChangeTarget(null);
        fetchTeamData();
      }
    } catch (err) {
      console.error('Failed to update member role:', err);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    setIsRemovingMember(true);
    try {
      const res = await fetch(`/api/team/members/${removeTarget.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-business-id': business?.id || '',
        },
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        setRemoveTarget(null);
        fetchTeamData();
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    } finally {
      setIsRemovingMember(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
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
      const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
      return Math.max(0, days);
    } catch {
      return 0;
    }
  };

  const getInitials = (name: string, email: string) => {
    if (name && name.trim()) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  // Filtered members
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || m.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [members, searchQuery, roleFilter]);

  // Filtered invitations
  const filteredInvitations = useMemo(() => {
    return invitations.filter((inv) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        inv.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || inv.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [invitations, searchQuery, roleFilter]);

  const tabs = [
    { id: 'members' as const, label: 'Members', count: members.length },
    { id: 'invitations' as const, label: 'Invitations', count: invitations.length },
    { id: 'roles' as const, label: 'Roles & permissions', count: null },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-150">
      {/* Sidebar Navigation */}
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        userRole={userRole}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen min-w-0">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          kycStatus={kycStatus}
          userRole={userRole}
          isRefreshing={isLoading}
          onRefresh={fetchTeamData}
        />

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6 min-w-0">
          {!isOwnerOrAdmin ? (
            <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md mx-auto text-center space-y-4 shadow-xs mt-12">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Access Restricted
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Team and collaborator management is restricted to Workspace Owners and Administrators.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-[#126BEB] text-white font-medium text-xs sm:text-sm hover:bg-[#0B5CC7] transition-colors"
                >
                  Return to Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* KYC Banner if unverified */}
              {kycStatus !== 'VERIFIED' && (
                <KycBanner kycStatus={kycStatus} userRole={userRole} onOpenKycModal={() => setIsKycModalOpen(true)} />
              )}

          {/* Page Header (Stripe Standard) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors sm:hidden"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </Link>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  Team members
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Manage team members and their account permissions.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => {
                  setInviteFeedback(null);
                  setInviteEmail('');
                  setIsInviteModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium bg-[#126BEB] hover:bg-[#0B5CC7] text-white shadow-xs transition-colors shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite member</span>
              </button>
            </div>
          </div>

          {/* Horizontal Tabs */}
          <div className="border-b border-slate-200 dark:border-slate-800 w-full overflow-hidden">
            <nav className="flex space-x-6 sm:space-x-8 overflow-x-auto scrollbar-none pb-px" aria-label="Tabs">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap py-3 px-1 border-b-2 text-xs sm:text-sm font-medium transition-colors shrink-0 flex items-center gap-2 ${
                      isActive
                        ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                            : 'bg-slate-100 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* TAB 1: MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              {/* Search & Filter Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1220] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="appearance-none pl-3 pr-8 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1220] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#126BEB] cursor-pointer"
                    >
                      <option value="ALL">All roles</option>
                      <option value="BUSINESS_OWNER">Owner</option>
                      <option value="BUSINESS_ADMIN">Administrator</option>
                      <option value="DEVELOPER">Developer</option>
                      <option value="FINANCE">Finance & Billing</option>
                      <option value="SUPPORT">Customer Support</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Members Table (Clean Standard) */}
              <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead className="bg-slate-50/80 dark:bg-[#080E1A] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 sm:px-6">Name</th>
                        <th className="py-3 px-4 sm:px-6">Role</th>
                        <th className="py-3 px-4 sm:px-6">Status</th>
                        <th className="py-3 px-4 sm:px-6">Date Added</th>
                        <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            <div className="inline-flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin text-[#126BEB]" />
                              <span>Loading members...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center">
                            <div className="max-w-sm mx-auto space-y-2">
                              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                                <Users className="w-5 h-5" />
                              </div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {searchQuery || roleFilter !== 'ALL'
                                  ? 'No members match your criteria'
                                  : 'No team members yet'}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {searchQuery || roleFilter !== 'ALL'
                                  ? 'Try clearing your search query or role filter.'
                                  : 'Invite your teammates to collaborate in this workspace.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredMembers.map((member) => {
                          const roleInfo = ROLE_DISPLAY[member.role] || ROLE_DISPLAY.VIEWER;
                          const roleName = member.isOwner ? 'Owner' : roleInfo.name;

                          return (
                            <tr
                              key={member.id}
                              className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              {/* Member Name + Avatar */}
                              <td className="py-3.5 px-4 sm:px-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-semibold text-xs shrink-0">
                                    {getInitials(member.name, member.email)}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-medium text-slate-900 dark:text-white block truncate">
                                      {member.name || member.email}
                                    </span>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                      {member.email}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Role (Clean Standard Text) */}
                              <td className="py-3.5 px-4 sm:px-6 text-slate-700 dark:text-slate-300 font-normal">
                                {roleName}
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4 sm:px-6">
                                <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-normal">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Active
                                </span>
                              </td>

                              {/* Joined Date */}
                              <td className="py-3.5 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400">
                                {formatDate(member.joinedAt)}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 sm:px-6 text-right">
                                {member.isOwner ? (
                                  <span className="text-xs text-slate-400">—</span>
                                ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        setRoleChangeTarget(member);
                                        setSelectedNewRole(member.role);
                                      }}
                                      className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                                    >
                                      Edit role
                                    </button>
                                    <button
                                      onClick={() => setRemoveTarget(member)}
                                      className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                                      title="Remove member"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INVITATIONS */}
          {activeTab === 'invitations' && (
            <div className="space-y-4">
              {/* Search Toolbar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search invitations by email..."
                    className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0A1220] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    setInviteFeedback(null);
                    setInviteEmail('');
                    setIsInviteModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#126BEB]" />
                  <span>New invitation</span>
                </button>
              </div>

              {/* Invitations Table */}
              <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead className="bg-slate-50/80 dark:bg-[#080E1A] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4 sm:px-6">Invitee</th>
                        <th className="py-3 px-4 sm:px-6">Role</th>
                        <th className="py-3 px-4 sm:px-6">Invited By</th>
                        <th className="py-3 px-4 sm:px-6">Expires In</th>
                        <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {isLoading ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400">
                            <div className="inline-flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 animate-spin text-[#126BEB]" />
                              <span>Loading invitations...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredInvitations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center">
                            <div className="max-w-sm mx-auto space-y-2">
                              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
                                <Mail className="w-5 h-5" />
                              </div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {searchQuery ? 'No invitations match your query' : 'No pending invitations'}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {searchQuery
                                  ? 'Check your email spelling or clear the search.'
                                  : 'When you invite teammates, their pending invites will show up here.'}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredInvitations.map((inv) => {
                          const roleInfo = ROLE_DISPLAY[inv.role] || ROLE_DISPLAY.VIEWER;
                          const remainingDays = getRemainingDays(inv.expiresAt);

                          return (
                            <tr
                              key={inv.id}
                              className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                            >
                              {/* Email */}
                              <td className="py-3.5 px-4 sm:px-6">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                                    <Mail className="w-3.5 h-3.5" />
                                  </div>
                                  <span className="font-medium text-slate-900 dark:text-white">
                                    {inv.email}
                                  </span>
                                </div>
                              </td>

                              {/* Role */}
                              <td className="py-3.5 px-4 sm:px-6 text-slate-700 dark:text-slate-300 font-normal">
                                {roleInfo.name}
                              </td>

                              {/* Inviter */}
                              <td className="py-3.5 px-4 sm:px-6 text-xs text-slate-500 dark:text-slate-400">
                                {inv.invitedBy}
                              </td>

                              {/* Expiration */}
                              <td className="py-3.5 px-4 sm:px-6">
                                <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-normal">
                                  <Clock className="w-3.5 h-3.5" />
                                  {remainingDays === 0
                                    ? 'Expires today'
                                    : `${remainingDays} ${remainingDays === 1 ? 'day' : 'days'} left`}
                                </span>
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 sm:px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => handleResendInvite(inv.id)}
                                    disabled={resendingInviteId === inv.id}
                                    className="px-2.5 py-1 text-xs font-medium rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-1"
                                  >
                                    {resendingInviteId === inv.id ? (
                                      <RefreshCw className="w-3 h-3 animate-spin text-[#126BEB]" />
                                    ) : (
                                      <RefreshCw className="w-3 h-3" />
                                    )}
                                    <span>Resend</span>
                                  </button>
                                  <button
                                    onClick={() => handleRevokeInvite(inv.id)}
                                    disabled={revokingInviteId === inv.id}
                                    className="px-2.5 py-1 text-xs font-medium rounded-md border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100/60 dark:hover:bg-red-900/50 transition-colors"
                                  >
                                    Revoke
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ROLES & PERMISSIONS */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              {/* Header Description */}
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Roles & permissions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  An overview of capabilities available to each workspace role.
                </p>
              </div>

              {/* Grid Table */}
              <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50/80 dark:bg-[#080E1A] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="py-3 px-4 font-semibold uppercase tracking-wider min-w-[240px]">
                          Permission
                        </th>
                        <th className="py-3 px-3 font-semibold text-center min-w-[80px]">Owner</th>
                        <th className="py-3 px-3 font-semibold text-center min-w-[80px]">Admin</th>
                        <th className="py-3 px-3 font-semibold text-center min-w-[80px]">Developer</th>
                        <th className="py-3 px-3 font-semibold text-center min-w-[80px]">Finance</th>
                        <th className="py-3 px-3 font-semibold text-center min-w-[80px]">Support</th>
                        <th className="py-3 px-3 font-semibold text-center min-w-[80px]">Viewer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {PERMISSION_GRID.map((cat, catIdx) => (
                        <React.Fragment key={catIdx}>
                          <tr className="bg-slate-50/50 dark:bg-slate-900/40">
                            <td
                              colSpan={7}
                              className="py-2.5 px-4 font-semibold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-wide border-y border-slate-200 dark:border-slate-800"
                            >
                              {cat.category}
                            </td>
                          </tr>

                          {cat.items.map((row, rIdx) => {
                            const renderCheck = (allowed: boolean) => (
                              <div className="flex items-center justify-center">
                                {allowed ? (
                                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600 font-bold">—</span>
                                )}
                              </div>
                            );

                            return (
                              <tr
                                key={rIdx}
                                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                              >
                                <td className="py-3 px-4 text-xs font-medium text-slate-800 dark:text-slate-200">
                                  {row.permission}
                                </td>
                                <td className="py-3 px-3">{renderCheck(row.owner)}</td>
                                <td className="py-3 px-3">{renderCheck(row.admin)}</td>
                                <td className="py-3 px-3">{renderCheck(row.developer)}</td>
                                <td className="py-3 px-3">{renderCheck(row.finance)}</td>
                                <td className="py-3 px-3">{renderCheck(row.support)}</td>
                                <td className="py-3 px-3">{renderCheck(row.viewer)}</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </main>
      </div>

      {/* MODAL: INVITE TEAM MEMBER (Stripe Style) */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl relative">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                  Invite team member
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Invite collaborators to your workspace.
                </p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="p-6 space-y-5">
              {inviteFeedback && (
                <div
                  className={`p-3.5 rounded-lg border text-xs ${
                    inviteFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {inviteFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    )}
                    <span className="font-medium">{inviteFeedback.message}</span>
                  </div>

                  {inviteFeedback.rawToken && (
                    <div className="mt-3 pt-2.5 border-t border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] truncate select-all">
                        {`${window.location.origin}/invite/${inviteFeedback.rawToken}`}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `${window.location.origin}/invite/${inviteFeedback.rawToken}`,
                          )
                        }
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium shrink-0 flex items-center gap-1 transition-colors"
                      >
                        {copiedToken ? (
                          <>
                            <Check className="w-3 h-3" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                  />
                </div>
              </div>

              {/* Role Radio Group (Stripe Standard) */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                  Role
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {(
                    [
                      'BUSINESS_ADMIN',
                      'DEVELOPER',
                      'FINANCE',
                      'SUPPORT',
                      'VIEWER',
                    ] as UserRole[]
                  ).map((roleOption) => {
                    const info = ROLE_DISPLAY[roleOption];
                    const isSelected = inviteRole === roleOption;

                    return (
                      <label
                        key={roleOption}
                        onClick={() => setInviteRole(roleOption)}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-[#126BEB] bg-blue-50/40 dark:bg-blue-950/20'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#0A1220]'
                        }`}
                      >
                        <input
                          type="radio"
                          name="inviteRole"
                          checked={isSelected}
                          onChange={() => setInviteRole(roleOption)}
                          className="mt-0.5 text-[#126BEB] focus:ring-[#126BEB]"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                            {info.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {info.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  className="px-4 py-2 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-medium text-xs sm:text-sm transition-colors shadow-xs flex items-center gap-1.5"
                >
                  {isSubmittingInvite && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Send invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE MEMBER ROLE (Stripe Style) */}
      {roleChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Edit role
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Update permissions for{' '}
                <strong className="text-slate-800 dark:text-slate-200">
                  {roleChangeTarget.name || roleChangeTarget.email}
                </strong>
                .
              </p>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {(
                [
                  'BUSINESS_ADMIN',
                  'DEVELOPER',
                  'FINANCE',
                  'SUPPORT',
                  'VIEWER',
                ] as UserRole[]
              ).map((roleOption) => {
                const info = ROLE_DISPLAY[roleOption];
                const isSelected = selectedNewRole === roleOption;

                return (
                  <label
                    key={roleOption}
                    onClick={() => setSelectedNewRole(roleOption)}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-[#126BEB] bg-blue-50/40 dark:bg-blue-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-[#0A1220]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="newRole"
                      checked={isSelected}
                      onChange={() => setSelectedNewRole(roleOption)}
                      className="mt-0.5 text-[#126BEB] focus:ring-[#126BEB]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                        {info.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {info.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRoleChangeTarget(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateRole}
                disabled={isUpdatingRole}
                className="px-4 py-2 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-medium text-xs sm:text-sm transition-colors shadow-xs flex items-center gap-1.5"
              >
                {isUpdatingRole && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Save changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REMOVE MEMBER CONFIRMATION */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-center text-red-600 dark:text-red-400">
              <Trash2 className="w-5 h-5" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Remove team member
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to remove{' '}
                <strong className="text-slate-900 dark:text-white">
                  {removeTarget.name || removeTarget.email}
                </strong>{' '}
                from this workspace? They will immediately lose access to all resources.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRemoveTarget(null)}
                className="px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveMember}
                disabled={isRemovingMember}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-xs sm:text-sm transition-colors shadow-xs flex items-center gap-1.5"
              >
                {isRemovingMember && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Remove</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KYC Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => {
          setIsKycModalOpen(false);
          fetchTeamData();
        }}
      />
    </div>
  );
}
