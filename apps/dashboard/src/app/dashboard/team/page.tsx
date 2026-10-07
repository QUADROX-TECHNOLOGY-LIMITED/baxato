'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  Wallet,
  Headphones,
  Eye,
  Mail,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  X,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
  Lock,
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

const ROLE_CONFIG: Record<
  UserRole,
  {
    name: string;
    icon: React.ElementType;
    badgeStyle: string;
    colorHex: string;
    description: string;
    canDo: string[];
    cannotDo: string[];
  }
> = {
  BUSINESS_OWNER: {
    name: 'Business Owner',
    icon: ShieldCheck,
    badgeStyle: 'bg-purple-950/60 text-purple-300 border-purple-800/80',
    colorHex: '#A855F7',
    description: 'Root Merchant Founder with absolute control over the organization.',
    canDo: [
      'Full administrative control over all features',
      'Invite, change roles, and remove any team member',
      'Manage API keys, webhooks, and technical integrations',
      'Fund operational wallet and inspect ledgers',
      'Transfer ownership or delete organization',
    ],
    cannotDo: ['None (Root Controller)'],
  },
  BUSINESS_ADMIN: {
    name: 'Administrator',
    icon: Shield,
    badgeStyle: 'bg-sky-950/60 text-sky-300 border-sky-800/80',
    colorHex: '#38BDF8',
    description: 'General Manager overseeing operations, team workflows, and settings.',
    canDo: [
      'Invite and manage team members (Developers, Finance, Support)',
      'Manage business profile and KYC documentation',
      'View operational wallet balance and funding history',
      'Configure webhook endpoints and inspect transactions',
    ],
    cannotDo: [
      'Cannot transfer business ownership',
      'Cannot delete the business',
      'Cannot remove or alter the Business Owner',
    ],
  },
  FINANCE: {
    name: 'Finance & Billing',
    icon: Wallet,
    badgeStyle: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
    colorHex: '#34D399',
    description: 'Accountant overseeing wallet balance, deposits, and financial reconciliation.',
    canDo: [
      'View operational wallet balance and virtual account details',
      'Inspect transaction debits, adjustments, and refunds',
      'Reconcile bank deposits and funding confirmations',
      'Export financial statements (CSV/PDF)',
    ],
    cannotDo: [
      'Cannot generate or view API keys',
      'Cannot configure webhook endpoints',
      'Cannot invite or remove team members',
      'Cannot edit legal business profile or KYC',
    ],
  },
  DEVELOPER: {
    name: 'Developer',
    icon: Key,
    badgeStyle: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
    colorHex: '#FBBF24',
    description: 'Technical Lead integrating software with BAXATO /v1 vending APIs.',
    canDo: [
      'Generate, rotate, and revoke Live & Test API keys',
      'Register webhook endpoints and test HMAC signing secrets',
      'View webhook delivery attempts, retries, and technical logs',
      'Access interactive API documentation (Scalar) and test sandbox',
    ],
    cannotDo: [
      'Cannot invite or manage team members',
      'Cannot edit business legal profile or KYC',
      'Cannot manage business bank funding',
    ],
  },
  SUPPORT: {
    name: 'Customer Support',
    icon: Headphones,
    badgeStyle: 'bg-teal-950/60 text-teal-300 border-teal-800/80',
    colorHex: '#2DD4BF',
    description: 'Customer Care representative assisting with queries and dispute receipts.',
    canDo: [
      'Search transactions by Reference, Customer Phone, Meter Number, or Smartcard',
      'View generated electricity token PINs and exam scratch codes',
      'Query provider status to resolve customer disputes',
      'Download customer-facing transaction receipts',
    ],
    cannotDo: [
      'Cannot view total wallet balance',
      'Cannot access API keys or webhooks',
      'Cannot vend services or issue adjustments',
      'Cannot manage team members',
    ],
  },
  VIEWER: {
    name: 'Viewer',
    icon: Eye,
    badgeStyle: 'bg-slate-800/70 text-slate-300 border-slate-700',
    colorHex: '#94A3B8',
    description: 'Passive observer with read-only visibility into dashboard analytics.',
    canDo: [
      'View aggregate transaction volume charts',
      'View high-level overview metrics and graphs',
      'Read-only access to basic business profile',
    ],
    cannotDo: [
      'Cannot take any mutating actions',
      'Cannot view API secrets or private keys',
      'Cannot view customer private contact information',
    ],
  },
};

export default function TeamManagementPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [kycModalOpen, setKycModalOpen] = useState(false);

  // Data state
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'matrix'>('members');

  // Modals & Actions state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('DEVELOPER');
  const [isSubmittingInvite, setIsSubmittingInvite] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; message: string; rawToken?: string } | null>(null);

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

  useEffect(() => {
    if (!token) {
      clearSessionAndRedirect();
      return;
    }
    fetchTeamData();
  }, [token]);

  const fetchTeamData = async () => {
    setLoading(true);
    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        'x-business-id': business?.id || '',
      };

      const [membersRes, invitesRes] = await Promise.all([
        fetch('/api/team/members', { headers }),
        fetch('/api/team/invites', { headers }),
      ]);

      const membersJson = await membersRes.json();
      const invitesJson = await invitesRes.json();

      if (membersJson.success) {
        setMembers(membersJson.data.members || []);
      }
      if (invitesJson.success) {
        setInvitations(invitesJson.data.invitations || []);
      }
    } catch (err) {
      console.error('Failed to fetch team data:', err);
    } finally {
      setLoading(false);
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

      const json = await res.json();
      if (!res.ok || !json.success) {
        setInviteFeedback({
          type: 'error',
          message: json.error?.message || 'Failed to send invitation. Please try again.',
        });
      } else {
        setInviteFeedback({
          type: 'success',
          message: `Invitation successfully dispatched to ${inviteEmail}.`,
          rawToken: json.data?.rawToken,
        });
        setInviteEmail('');
        fetchTeamData();
      }
    } catch {
      setInviteFeedback({
        type: 'error',
        message: 'Network error while dispatching invitation.',
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
      const json = await res.json();
      if (json.success) {
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
      const json = await res.json();
      if (json.success) {
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
      const json = await res.json();
      if (json.success) {
        setRoleChangeTarget(null);
        fetchTeamData();
      }
    } catch (err) {
      console.error('Failed to update role:', err);
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
      const json = await res.json();
      if (json.success) {
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

  return (
    <div className="min-h-screen bg-[#060D18] text-slate-100 flex flex-col font-sans">
      <Sidebar
        businessName={business?.name || 'Workspace'}
        merchantName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Merchant'}
        kycStatus={user?.kycStatus || 'UNVERIFIED'}
        onOpenKycModal={() => setKycModalOpen(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="lg:pl-72 flex flex-col flex-1">
        <Header
          onToggleSidebar={() => setSidebarOpen(true)}
          onOpenKycModal={() => setKycModalOpen(true)}
          merchantName={`${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Merchant'}
          kycStatus={user?.kycStatus || 'UNVERIFIED'}
          isRefreshing={loading}
          onRefresh={fetchTeamData}
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          <KycBanner
            kycStatus={user?.kycStatus || 'UNVERIFIED'}
            onOpenKycModal={() => setKycModalOpen(true)}
          />

          {/* Top Header Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0A1224] border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    Team & Organization
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                      {members.length} {members.length === 1 ? 'Member' : 'Members'}
                    </span>
                  </h1>
                  <p className="text-sm text-slate-400">
                    Manage workspace collaborators, operational roles, and access controls for{' '}
                    <span className="text-slate-200 font-medium">{business?.name || 'Workspace'}</span>.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setInviteFeedback(null);
                setIsInviteModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4" />
              Invite Team Member
            </button>
          </div>

          {/* Role Counts Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {(
              [
                'BUSINESS_OWNER',
                'BUSINESS_ADMIN',
                'DEVELOPER',
                'FINANCE',
                'SUPPORT',
                'VIEWER',
              ] as UserRole[]
            ).map((roleKey) => {
              const cfg = ROLE_CONFIG[roleKey];
              const count = members.filter((m) => m.role === roleKey).length;
              const Icon = cfg.icon;
              return (
                <div
                  key={roleKey}
                  className="bg-[#0A1224] border border-slate-800/60 rounded-xl p-3.5 flex items-center gap-3 hover:border-slate-700/80 transition-colors"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: `${cfg.colorHex}15`,
                      borderColor: `${cfg.colorHex}30`,
                      color: cfg.colorHex,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 truncate">{cfg.name}</p>
                    <p className="text-lg font-bold text-white leading-none mt-0.5">{count}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'members'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              Active Members
              <span className="px-2 py-0.5 text-xs rounded-full bg-slate-800 text-slate-300">
                {members.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'invitations'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-4 h-4" />
              Pending Invitations
              {invitations.length > 0 && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300">
                  {invitations.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'matrix'
                  ? 'border-sky-500 text-sky-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield className="w-4 h-4" />
              Permissions Guide
            </button>
          </div>

          {/* TAB 1: ACTIVE MEMBERS */}
          {activeTab === 'members' && (
            <div className="bg-[#0A1224] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-[#0D162C] text-xs uppercase text-slate-400 border-b border-slate-800 tracking-wider">
                    <tr>
                      <th className="py-3.5 px-6 font-semibold">Team Member</th>
                      <th className="py-3.5 px-6 font-semibold">Assigned Role</th>
                      <th className="py-3.5 px-6 font-semibold">Joined Date</th>
                      <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
                          Loading team members...
                        </td>
                      </tr>
                    ) : members.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-500">
                          No team members found.
                        </td>
                      </tr>
                    ) : (
                      members.map((member) => {
                        const cfg = ROLE_CONFIG[member.role] || ROLE_CONFIG.VIEWER;
                        const isSelf = member.userId === user?.id;

                        return (
                          <tr
                            key={member.id}
                            className="hover:bg-slate-800/20 transition-colors group"
                          >
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                                  {member.name.slice(0, 2).toUpperCase() || 'MB'}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold text-white flex items-center gap-2 truncate">
                                    {member.name}
                                    {isSelf && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800">
                                        YOU
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 truncate">{member.email}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-6">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badgeStyle}`}
                              >
                                <cfg.icon className="w-3.5 h-3.5" />
                                {cfg.name}
                              </span>
                            </td>

                            <td className="py-4 px-6 text-xs text-slate-400 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                {new Date(member.joinedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </div>
                            </td>

                            <td className="py-4 px-6 text-right">
                              {member.isOwner ? (
                                <span className="text-xs text-purple-400 font-medium px-2 py-1 rounded bg-purple-950/40 border border-purple-900/50">
                                  Primary Owner
                                </span>
                              ) : isSelf ? (
                                <span className="text-xs text-slate-500 italic">Self Account</span>
                              ) : (
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setRoleChangeTarget(member);
                                      setSelectedNewRole(member.role);
                                    }}
                                    className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                                  >
                                    Change Role
                                  </button>
                                  <button
                                    onClick={() => setRemoveTarget(member)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                                    title="Remove from Workspace"
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
          )}

          {/* TAB 2: PENDING INVITATIONS */}
          {activeTab === 'invitations' && (
            <div className="bg-[#0A1224] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-[#0D162C] text-xs uppercase text-slate-400 border-b border-slate-800 tracking-wider">
                    <tr>
                      <th className="py-3.5 px-6 font-semibold">Invited Email</th>
                      <th className="py-3.5 px-6 font-semibold">Assigned Role</th>
                      <th className="py-3.5 px-6 font-semibold">Invited By</th>
                      <th className="py-3.5 px-6 font-semibold">Expiration</th>
                      <th className="py-3.5 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-500" />
                          Loading invitations...
                        </td>
                      </tr>
                    ) : invitations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          <Mail className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          No pending invitations. All team members are active.
                        </td>
                      </tr>
                    ) : (
                      invitations.map((inv) => {
                        const cfg = ROLE_CONFIG[inv.role] || ROLE_CONFIG.VIEWER;
                        const remainingDays = Math.max(
                          0,
                          Math.ceil(
                            (new Date(inv.expiresAt).getTime() - Date.now()) /
                              (1000 * 60 * 60 * 24),
                          ),
                        );

                        return (
                          <tr key={inv.id} className="hover:bg-slate-800/20 transition-colors">
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                  <Mail className="w-4 h-4" />
                                </div>
                                <span className="font-semibold text-white">{inv.email}</span>
                              </div>
                            </td>

                            <td className="py-4 px-6">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badgeStyle}`}
                              >
                                <cfg.icon className="w-3.5 h-3.5" />
                                {cfg.name}
                              </span>
                            </td>

                            <td className="py-4 px-6 text-xs text-slate-400">
                              {inv.invitedBy}
                            </td>

                            <td className="py-4 px-6">
                              <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-900/50 px-2.5 py-1 rounded-md">
                                <Clock className="w-3.5 h-3.5" />
                                Expires in {remainingDays} {remainingDays === 1 ? 'day' : 'days'}
                              </span>
                            </td>

                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleResendInvite(inv.id)}
                                  disabled={resendingInviteId === inv.id}
                                  className="px-2.5 py-1 text-xs rounded-lg bg-sky-950 hover:bg-sky-900 text-sky-400 border border-sky-800 font-medium transition-colors flex items-center gap-1"
                                >
                                  {resendingInviteId === inv.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <RefreshCw className="w-3 h-3" />
                                  )}
                                  Resend
                                </button>
                                <button
                                  onClick={() => handleRevokeInvite(inv.id)}
                                  disabled={revokingInviteId === inv.id}
                                  className="px-2.5 py-1 text-xs rounded-lg bg-red-950/50 hover:bg-red-900/60 text-red-400 border border-red-900/50 font-medium transition-colors"
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
          )}

          {/* TAB 3: PERMISSIONS GUIDE MATRIX */}
          {activeTab === 'matrix' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(Object.keys(ROLE_CONFIG) as UserRole[]).map((roleKey) => {
                const cfg = ROLE_CONFIG[roleKey];
                const Icon = cfg.icon;

                return (
                  <div
                    key={roleKey}
                    className="bg-[#0A1224] border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${cfg.badgeStyle}`}
                        >
                          <Icon className="w-4 h-4" />
                          {cfg.name}
                        </span>
                      </div>

                      <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                        {cfg.description}
                      </p>

                      <div className="space-y-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-2 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" /> Core Capabilities ("Can Do")
                          </p>
                          <ul className="space-y-1.5">
                            {cfg.canDo.map((item, idx) => (
                              <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                <span className="text-emerald-400 mt-0.5">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2 flex items-center gap-1.5">
                            <X className="w-3.5 h-3.5" /> Strict Restrictions ("Cannot Do")
                          </p>
                          <ul className="space-y-1.5">
                            {cfg.cannotDo.map((item, idx) => (
                              <li key={idx} className="text-xs text-slate-400 flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* MODAL: INVITE TEAM MEMBER */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0B1328] border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl relative">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Invite Team Member</h2>
                  <p className="text-xs text-slate-400">
                    Send an onboarding invitation link to join this workspace.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendInvite} className="p-6 space-y-5">
              {inviteFeedback && (
                <div
                  className={`p-4 rounded-xl border flex flex-col gap-2 ${
                    inviteFeedback.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                      : 'bg-red-950/40 border-red-800/80 text-red-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {inviteFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span className="text-sm font-medium">{inviteFeedback.message}</span>
                  </div>

                  {inviteFeedback.rawToken && (
                    <div className="mt-2 pt-2 border-t border-emerald-800/40 flex items-center justify-between gap-2 bg-emerald-950/60 p-2 rounded-lg">
                      <span className="text-xs font-mono text-emerald-300 truncate">
                        {`${window.location.origin}/invite/${inviteFeedback.rawToken}`}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `${window.location.origin}/invite/${inviteFeedback.rawToken}`,
                          )
                        }
                        className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-700 text-white rounded text-xs font-medium shrink-0 flex items-center gap-1"
                      >
                        {copiedToken ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Link
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Invitee Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-[#080E1C] border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Assign Operational Role
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {(
                    [
                      'BUSINESS_ADMIN',
                      'DEVELOPER',
                      'FINANCE',
                      'SUPPORT',
                      'VIEWER',
                    ] as UserRole[]
                  ).map((roleOption) => {
                    const cfg = ROLE_CONFIG[roleOption];
                    const isSelected = inviteRole === roleOption;
                    const Icon = cfg.icon;

                    return (
                      <div
                        key={roleOption}
                        onClick={() => setInviteRole(roleOption)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-sky-950/40 border-sky-500 shadow-md ring-1 ring-sky-500'
                            : 'bg-[#080E1C] border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Icon
                            className="w-4 h-4"
                            style={{ color: cfg.colorHex }}
                          />
                          <span className="text-sm font-bold text-white">
                            {cfg.name}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {cfg.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  The invitee will receive a branded invitation email with an onboarding link valid for <strong>7 days</strong>.
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvite}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-md flex items-center gap-2"
                >
                  {isSubmittingInvite && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CHANGE MEMBER ROLE */}
      {roleChangeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0B1328] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Change Member Role</h3>
            <p className="text-xs text-slate-400">
              Update the operational permissions for <strong className="text-slate-200">{roleChangeTarget.name}</strong> ({roleChangeTarget.email}).
            </p>

            <div className="space-y-2">
              {(
                [
                  'BUSINESS_ADMIN',
                  'DEVELOPER',
                  'FINANCE',
                  'SUPPORT',
                  'VIEWER',
                ] as UserRole[]
              ).map((roleOption) => {
                const cfg = ROLE_CONFIG[roleOption];
                const isSelected = selectedNewRole === roleOption;
                const Icon = cfg.icon;

                return (
                  <label
                    key={roleOption}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-950/40 border-sky-500'
                        : 'bg-[#080E1C] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" style={{ color: cfg.colorHex }} />
                      <div>
                        <p className="text-sm font-bold text-white">{cfg.name}</p>
                        <p className="text-xs text-slate-400">{cfg.description}</p>
                      </div>
                    </div>
                    <input
                      type="radio"
                      name="role"
                      value={roleOption}
                      checked={isSelected}
                      onChange={() => setSelectedNewRole(roleOption)}
                      className="text-sky-500 focus:ring-sky-500"
                    />
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setRoleChangeTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={isUpdatingRole}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm flex items-center gap-1.5"
              >
                {isUpdatingRole && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REMOVE MEMBER CONFIRMATION */}
      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0B1328] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-950/50 border border-red-800/80 flex items-center justify-center text-red-400">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Remove Team Member?</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-200">{removeTarget.name}</strong> ({removeTarget.email}) from this workspace? They will immediately lose access to all resources.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setRemoveTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleRemoveMember}
                disabled={isRemovingMember}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm flex items-center gap-1.5"
              >
                {isRemovingMember && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Yes, Remove Member
              </button>
            </div>
          </div>
        </div>
      )}

      <KycModal
        isOpen={kycModalOpen}
        onClose={() => setKycModalOpen(false)}
        onSuccess={() => {
          setKycModalOpen(false);
          fetchTeamData();
        }}
      />
    </div>
  );
}
