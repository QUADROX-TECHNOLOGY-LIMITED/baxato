'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Lock,
  Trash2,
  X,
  Loader2,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import { getStoredAuthToken, getStoredUser } from '@/lib/auth-session';

interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'STAFF' | 'SUPPORT';
  status: 'ACTIVE' | 'SUSPENDED';
  twoFactorEnabled: boolean;
  twoFactorMethod?: string;
  createdAt: string;
}

export default function SuperAdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Current logged in user (to prevent self-lockout)
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFirstName, setInviteFirstName] = useState('');
  const [inviteLastName, setInviteLastName] = useState('');
  const [inviteRole, setInviteRole] = useState<'STAFF' | 'SUPPORT' | 'SUPER_ADMIN'>('STAFF');
  const [invitePassword, setInvitePassword] = useState('');

  // Edit Role Modal
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('STAFF');

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const res = await fetch('/api/admin/staff', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && Array.isArray(json.data)) {
        setStaffList(json.data);
      } else {
        setErrorMessage(json?.error?.message || 'Failed to load staff accounts.');
      }
    } catch {
      setErrorMessage('Network error fetching staff accounts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = getStoredUser();
    if (user?.id) setCurrentUserId(user.id);
    fetchStaff();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = inviteEmail.toLowerCase().trim();
    if (!cleanEmail.endsWith('@baxato.com')) {
      setErrorMessage('Staff email addresses must strictly use the @baxato.com corporate domain.');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = getStoredAuthToken();

      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: cleanEmail,
          firstName: inviteFirstName.trim(),
          lastName: inviteLastName.trim(),
          role: inviteRole,
          password: invitePassword.trim() || undefined,
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSuccessMessage(`Staff account created for ${cleanEmail}! 2FA is required upon initial sign-in.`);
        setIsInviteModalOpen(false);
        setInviteEmail('');
        setInviteFirstName('');
        setInviteLastName('');
        setInvitePassword('');
        fetchStaff();
      } else {
        setErrorMessage(json?.error?.message || 'Failed to create staff account.');
      }
    } catch {
      setErrorMessage('Network error creating staff account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!editingStaff) return;
    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const res = await fetch(`/api/admin/staff/${editingStaff.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSuccessMessage(`Updated role for ${editingStaff.email} to ${selectedRole}.`);
        setEditingStaff(null);
        fetchStaff();
      } else {
        setErrorMessage(json?.error?.message || 'Failed to update staff role.');
      }
    } catch {
      setErrorMessage('Network error updating role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: StaffUser) => {
    const newStatus = staff.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const res = await fetch(`/api/admin/staff/${staff.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSuccessMessage(`${staff.email} account has been ${newStatus.toLowerCase()}.`);
        fetchStaff();
      } else {
        setErrorMessage(json?.error?.message || 'Failed to update account status.');
      }
    } catch {
      setErrorMessage('Network error updating status.');
    }
  };

  const handleDeleteStaff = async (staff: StaffUser) => {
    if (!confirm(`Are you absolutely sure you want to revoke platform access for ${staff.email}?`)) {
      return;
    }

    try {
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const res = await fetch(`/api/admin/staff/${staff.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSuccessMessage(`Staff account for ${staff.email} has been revoked.`);
        fetchStaff();
      } else {
        setErrorMessage(json?.error?.message || 'Failed to revoke staff account.');
      }
    } catch {
      setErrorMessage('Network error deleting staff account.');
    }
  };

  // Filtered staff
  const filteredStaff = staffList.filter((s) => {
    const matchSearch =
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'ALL' || s.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6">
      {/* Title & Add Staff CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#126BEB]" />
            <span>Staff Management</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage platform staff accounts, roles, and 2FA status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#126BEB] hover:bg-[#0E58C4] text-white font-semibold text-xs transition shadow-sm flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Staff Account</span>
          </button>
        </div>
      </div>

      {/* Notices */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or @baxato.com email..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Role:</span>
          {(['ALL', 'SUPER_ADMIN', 'STAFF', 'SUPPORT'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                roleFilter === r
                  ? 'bg-[#126BEB] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Staff Member</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">2FA Security</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Created Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#126BEB] mb-2" />
                    <span>Loading staff directory...</span>
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No staff members found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const isSelf = staff.id === currentUserId;

                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold flex items-center justify-center shrink-0">
                            {staff.firstName?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>
                                {staff.firstName} {staff.lastName}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] font-normal border border-blue-200 dark:border-blue-900/40">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">{staff.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {staff.role === 'SUPER_ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 dark:bg-slate-800 text-white font-semibold text-[10px] border border-slate-700">
                            SUPER ADMIN
                          </span>
                        ) : staff.role === 'STAFF' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40 font-semibold text-[10px]">
                            STAFF OPERATIONS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-300 border border-teal-200 dark:border-teal-900/40 font-semibold text-[10px]">
                            CUSTOMER SUPPORT
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        {staff.twoFactorEnabled ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Enforced ({staff.twoFactorMethod || 'TOTP'})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Pending Enrollment</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            staff.status === 'ACTIVE'
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                          }`}
                        >
                          {staff.status}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                        {new Date(staff.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingStaff(staff);
                              setSelectedRole(staff.role);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition"
                          >
                            Change Role
                          </button>

                          {!isSelf && (
                            <>
                              <button
                                onClick={() => handleToggleStatus(staff)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                  staff.status === 'ACTIVE'
                                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100'
                                    : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100'
                                }`}
                              >
                                {staff.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                              </button>

                              <button
                                onClick={() => handleDeleteStaff(staff)}
                                title="Revoke Access"
                                className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
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

      {/* CREATE STAFF MODAL */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#126BEB]" />
                <span>Create Staff Account</span>
              </h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={inviteFirstName}
                    onChange={(e) => setInviteFirstName(e.target.value)}
                    required
                    placeholder="Emeka"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={inviteLastName}
                    onChange={(e) => setInviteLastName(e.target.value)}
                    required
                    placeholder="Adeyemi"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Corporate Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  placeholder="e.g. emeka@baxato.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Must strictly end with <span className="text-[#126BEB]">@baxato.com</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Staff Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                >
                  <option value="STAFF">STAFF (Operations & Routing)</option>
                  <option value="SUPPORT">SUPPORT (KYC & Read-only)</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN (Platform Administrator)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Temporary Password (Optional)
                </label>
                <input
                  type="text"
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Default: StaffTempPass@2026"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-[#126BEB] hover:bg-[#0E58C4] text-white text-xs font-semibold transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ROLE MODAL */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Change Staff Role</h3>
              <button onClick={() => setEditingStaff(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update platform permissions for <span className="font-semibold text-slate-900 dark:text-white">{editingStaff.email}</span>:
            </p>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
            >
              <option value="STAFF">STAFF (Operations Desk & Provider Failover)</option>
              <option value="SUPPORT">SUPPORT (Customer Support & KYC Review)</option>
              <option value="SUPER_ADMIN">SUPER ADMIN (Platform Administrator)</option>
            </select>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleUpdateRole}
                className="flex-1 py-2 rounded-xl bg-[#126BEB] hover:bg-[#0E58C4] text-white text-xs font-semibold transition"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
