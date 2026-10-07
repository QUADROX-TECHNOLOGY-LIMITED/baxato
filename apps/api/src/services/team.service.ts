import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  db,
  businesses,
  users,
  businessMembers,
  teamInvitations,
  eq,
  and,
  desc,
  gt,
} from '@baxato/database';
import {
  UserRole,
  InvitationStatus,
  KycStatus,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  ValidationError,
  generateEntityId,
} from '@baxato/common';
import { zeptoMailService } from './zeptomail.service.js';
import { auditService } from './audit.service.js';
import { generateToken } from '../plugins/auth.plugin.js';

export class TeamService {
  /**
   * Helper to verify caller has permission to view or manage the business team.
   */
  private async getCallerRole(businessId: string, callerId: string): Promise<UserRole> {
    const [biz] = await db
      .select({ id: businesses.id, ownerId: businesses.ownerId })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) {
      throw new NotFoundError('Business');
    }

    if (biz.ownerId === callerId) {
      return UserRole.BUSINESS_OWNER;
    }

    const [member] = await db
      .select({ role: businessMembers.role })
      .from(businessMembers)
      .where(and(eq(businessMembers.businessId, businessId), eq(businessMembers.userId, callerId)))
      .limit(1);

    if (!member) {
      throw new ForbiddenError('You do not belong to this business.');
    }

    return member.role as UserRole;
  }

  /**
   * List all active team members (including the Business Owner).
   */
  public async listMembers(businessId: string, callerId: string) {
    await this.getCallerRole(businessId, callerId);

    const [biz] = await db
      .select({
        id: businesses.id,
        ownerId: businesses.ownerId,
        createdAt: businesses.createdAt,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) {
      throw new NotFoundError('Business');
    }

    // 1. Fetch Owner details
    const [ownerUser] = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, biz.ownerId))
      .limit(1);

    // 2. Fetch other team members
    const membersList = await db
      .select({
        id: businessMembers.id,
        userId: businessMembers.userId,
        role: businessMembers.role,
        joinedAt: businessMembers.createdAt,
      })
      .from(businessMembers)
      .where(eq(businessMembers.businessId, businessId));

    const result = [];

    if (ownerUser) {
      result.push({
        id: `owner-${ownerUser.id}`,
        userId: ownerUser.id,
        name: `${ownerUser.firstName} ${ownerUser.lastName}`.trim(),
        email: ownerUser.email,
        role: UserRole.BUSINESS_OWNER,
        isOwner: true,
        joinedAt: biz.createdAt,
      });
    }

    for (const m of membersList) {
      // Avoid duplicate display if owner was somehow in members table
      if (m.userId === biz.ownerId) continue;
      const [u] = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, m.userId))
        .limit(1);

      result.push({
        id: m.id,
        userId: m.userId,
        name: u ? `${u.firstName} ${u.lastName}`.trim() : 'Team Member',
        email: u?.email || '',
        role: m.role as UserRole,
        isOwner: false,
        joinedAt: m.joinedAt,
      });
    }

    return result;
  }

  /**
   * List pending, non-expired invitations for a business.
   */
  public async listInvitations(businessId: string, callerId: string) {
    await this.getCallerRole(businessId, callerId);

    const now = new Date();
    const invites = await db
      .select({
        id: teamInvitations.id,
        email: teamInvitations.email,
        role: teamInvitations.role,
        status: teamInvitations.status,
        expiresAt: teamInvitations.expiresAt,
        createdAt: teamInvitations.createdAt,
        invitedById: teamInvitations.invitedById,
      })
      .from(teamInvitations)
      .where(
        and(
          eq(teamInvitations.businessId, businessId),
          eq(teamInvitations.status, InvitationStatus.PENDING),
        ),
      );

    const activeInvites = invites.filter((inv) => new Date(inv.expiresAt) > now);

    const result = [];
    for (const inv of activeInvites) {
      const [inviter] = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, inv.invitedById))
        .limit(1);

      result.push({
        id: inv.id,
        email: inv.email,
        role: inv.role as UserRole,
        status: inv.status,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        invitedBy: inviter
          ? `${inviter.firstName} ${inviter.lastName}`.trim() || inviter.email
          : 'Workspace Admin',
      });
    }

    return result;
  }

  /**
   * Dispatches a new team invitation.
   */
  public async inviteMember(
    businessId: string,
    callerId: string,
    email: string,
    role: UserRole,
    clientIp?: string,
    userAgent?: string,
  ) {
    const callerRole = await this.getCallerRole(businessId, callerId);

    // Permission guard
    if (callerRole !== UserRole.BUSINESS_OWNER && callerRole !== UserRole.BUSINESS_ADMIN) {
      throw new ForbiddenError('Only the business owner or admin can invite team members.');
    }

    // Role restrictions
    if (role === UserRole.BUSINESS_OWNER) {
      throw new ValidationError('Cannot invite someone as Owner. Transfer ownership instead.');
    }
    if (callerRole !== UserRole.BUSINESS_OWNER && role === UserRole.BUSINESS_ADMIN) {
      throw new ForbiddenError('Only the business owner can invite another Administrator.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    const [biz] = await db
      .select({ id: businesses.id, name: businesses.name, ownerId: businesses.ownerId })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    if (!biz) {
      throw new NotFoundError('Business');
    }

    // 1. Check if user is already Owner
    const [existingOwner] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, biz.ownerId))
      .limit(1);

    if (existingOwner && existingOwner.email.toLowerCase() === normalizedEmail) {
      throw new ConflictError('This user is already the owner of this business.');
    }

    // 2. Check if user is already an active member
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser) {
      const [existingMembership] = await db
        .select({ id: businessMembers.id })
        .from(businessMembers)
        .where(
          and(
            eq(businessMembers.businessId, businessId),
            eq(businessMembers.userId, existingUser.id),
          ),
        )
        .limit(1);

      if (existingMembership) {
        throw new ConflictError(`${normalizedEmail} is already an active member of this business.`);
      }
    }

    // 3. Invalidate any existing pending invitation for this email in this business
    await db
      .update(teamInvitations)
      .set({ status: InvitationStatus.REVOKED, updatedAt: new Date() })
      .where(
        and(
          eq(teamInvitations.businessId, businessId),
          eq(teamInvitations.email, normalizedEmail),
          eq(teamInvitations.status, InvitationStatus.PENDING),
        ),
      );

    // 4. Generate cryptographically secure token & SHA-256 hash
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invitation] = await db
      .insert(teamInvitations)
      .values({
        businessId,
        invitedById: callerId,
        email: normalizedEmail,
        role,
        tokenHash,
        status: InvitationStatus.PENDING,
        expiresAt,
      })
      .returning();

    // 5. Fetch inviter profile for the email
    const [inviter] = await db
      .select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(eq(users.id, callerId))
      .limit(1);

    const inviterName = inviter
      ? `${inviter.firstName} ${inviter.lastName}`.trim() || inviter.email
      : 'A team member';

    // 6. Send Email via ZeptoMail
    await zeptoMailService.sendTeamInvitationEmail({
      toEmail: normalizedEmail,
      inviterName,
      businessName: biz.name,
      role,
      rawToken,
      expiresAt,
    });

    // 7. Audit log
    await auditService.log({
      userId: callerId,
      businessId,
      action: 'TEAM_MEMBER_INVITED',
      resourceType: 'TEAM_INVITATION',
      resourceId: invitation!.id,
      ipAddress: clientIp,
      userAgent,
      changes: {
        email: normalizedEmail,
        role,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      invitationId: invitation!.id,
      email: normalizedEmail,
      role,
      expiresAt,
      rawToken, // Provided so the UI can offer a direct "Copy Invite Link" option
    };
  }

  /**
   * Revoke a pending invitation.
   */
  public async revokeInvitation(
    businessId: string,
    callerId: string,
    invitationId: string,
    clientIp?: string,
    userAgent?: string,
  ) {
    const callerRole = await this.getCallerRole(businessId, callerId);
    if (callerRole !== UserRole.BUSINESS_OWNER && callerRole !== UserRole.BUSINESS_ADMIN) {
      throw new ForbiddenError('Only the business owner or admin can revoke invitations.');
    }

    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(and(eq(teamInvitations.id, invitationId), eq(teamInvitations.businessId, businessId)))
      .limit(1);

    if (!invitation) {
      throw new NotFoundError('Invitation');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new ValidationError(`Invitation is already ${invitation.status.toLowerCase()}.`);
    }

    await db
      .update(teamInvitations)
      .set({ status: InvitationStatus.REVOKED, updatedAt: new Date() })
      .where(eq(teamInvitations.id, invitationId));

    await auditService.log({
      userId: callerId,
      businessId,
      action: 'TEAM_INVITATION_REVOKED',
      resourceType: 'TEAM_INVITATION',
      resourceId: invitationId,
      ipAddress: clientIp,
      userAgent,
      changes: {
        email: invitation.email,
        role: invitation.role,
      },
    });

    return { success: true, message: 'Invitation successfully revoked.' };
  }

  /**
   * Resend a pending invitation (generates new token and refreshes expiry).
   */
  public async resendInvitation(
    businessId: string,
    callerId: string,
    invitationId: string,
    clientIp?: string,
    userAgent?: string,
  ) {
    const callerRole = await this.getCallerRole(businessId, callerId);
    if (callerRole !== UserRole.BUSINESS_OWNER && callerRole !== UserRole.BUSINESS_ADMIN) {
      throw new ForbiddenError('Only the business owner or admin can resend invitations.');
    }

    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(and(eq(teamInvitations.id, invitationId), eq(teamInvitations.businessId, businessId)))
      .limit(1);

    if (!invitation) {
      throw new NotFoundError('Invitation');
    }

    const [biz] = await db
      .select({ name: businesses.name })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    const [inviter] = await db
      .select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(eq(users.id, callerId))
      .limit(1);

    const inviterName = inviter
      ? `${inviter.firstName} ${inviter.lastName}`.trim() || inviter.email
      : 'A team member';

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await db
      .update(teamInvitations)
      .set({
        tokenHash,
        status: InvitationStatus.PENDING,
        expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(teamInvitations.id, invitationId));

    await zeptoMailService.sendTeamInvitationEmail({
      toEmail: invitation.email,
      inviterName,
      businessName: biz?.name || 'BAXATO Workspace',
      role: invitation.role,
      rawToken,
      expiresAt,
    });

    await auditService.log({
      userId: callerId,
      businessId,
      action: 'TEAM_INVITATION_RESENT',
      resourceType: 'TEAM_INVITATION',
      resourceId: invitationId,
      ipAddress: clientIp,
      userAgent,
      changes: {
        email: invitation.email,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      success: true,
      rawToken,
      expiresAt,
      message: `Invitation resent to ${invitation.email}.`,
    };
  }

  /**
   * Update an existing team member's role.
   */
  public async updateMemberRole(
    businessId: string,
    callerId: string,
    memberId: string,
    newRole: UserRole,
    clientIp?: string,
    userAgent?: string,
  ) {
    const callerRole = await this.getCallerRole(businessId, callerId);
    if (callerRole !== UserRole.BUSINESS_OWNER && callerRole !== UserRole.BUSINESS_ADMIN) {
      throw new ForbiddenError('Only the business owner or admin can update member roles.');
    }

    if (newRole === UserRole.BUSINESS_OWNER) {
      throw new ValidationError('Cannot promote to Owner. Transfer ownership instead.');
    }

    if (callerRole !== UserRole.BUSINESS_OWNER && newRole === UserRole.BUSINESS_ADMIN) {
      throw new ForbiddenError('Only the business owner can assign the Administrator role.');
    }

    const [member] = await db
      .select()
      .from(businessMembers)
      .where(and(eq(businessMembers.id, memberId), eq(businessMembers.businessId, businessId)))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Team member');
    }

    if (member.userId === callerId) {
      throw new ForbiddenError('You cannot change your own role.');
    }

    if (callerRole !== UserRole.BUSINESS_OWNER && member.role === UserRole.BUSINESS_ADMIN) {
      throw new ForbiddenError('Only the business owner can alter an Administrator role.');
    }

    await db
      .update(businessMembers)
      .set({ role: newRole, updatedAt: new Date() })
      .where(eq(businessMembers.id, memberId));

    await auditService.log({
      userId: callerId,
      businessId,
      action: 'TEAM_MEMBER_ROLE_UPDATED',
      resourceType: 'TEAM_MEMBER',
      resourceId: memberId,
      ipAddress: clientIp,
      userAgent,
      changes: {
        previousRole: member.role,
        newRole,
      },
    });

    return {
      success: true,
      memberId,
      role: newRole,
      message: `Member role updated to ${newRole}.`,
    };
  }

  /**
   * Removes a member from the business.
   */
  public async removeMember(
    businessId: string,
    callerId: string,
    memberId: string,
    clientIp?: string,
    userAgent?: string,
  ) {
    const callerRole = await this.getCallerRole(businessId, callerId);
    if (callerRole !== UserRole.BUSINESS_OWNER && callerRole !== UserRole.BUSINESS_ADMIN) {
      throw new ForbiddenError('Only the business owner or admin can remove team members.');
    }

    const [biz] = await db
      .select({ ownerId: businesses.ownerId })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1);

    const [member] = await db
      .select()
      .from(businessMembers)
      .where(and(eq(businessMembers.id, memberId), eq(businessMembers.businessId, businessId)))
      .limit(1);

    if (!member) {
      throw new NotFoundError('Team member');
    }

    if (member.userId === biz?.ownerId) {
      throw new ForbiddenError('Cannot remove the business owner.');
    }

    if (member.userId === callerId) {
      throw new ForbiddenError('You cannot remove yourself from the business.');
    }

    if (callerRole !== UserRole.BUSINESS_OWNER && member.role === UserRole.BUSINESS_ADMIN) {
      throw new ForbiddenError('Only the business owner can remove an Administrator.');
    }

    await db.delete(businessMembers).where(eq(businessMembers.id, memberId));

    await auditService.log({
      userId: callerId,
      businessId,
      action: 'TEAM_MEMBER_REMOVED',
      resourceType: 'TEAM_MEMBER',
      resourceId: memberId,
      ipAddress: clientIp,
      userAgent,
      changes: {
        removedUserId: member.userId,
        role: member.role,
      },
    });

    return { success: true, message: 'Team member successfully removed from business.' };
  }

  /**
   * Validates an invitation token from the email link.
   * Public endpoint (no auth required).
   */
  public async validateInvitationToken(rawToken: string) {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new ValidationError('Invitation token is required.');
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

    const [invitation] = await db
      .select()
      .from(teamInvitations)
      .where(eq(teamInvitations.tokenHash, tokenHash))
      .limit(1);

    if (!invitation) {
      throw new NotFoundError('Invalid invitation link. Please request a new invitation.');
    }

    const [biz] = await db
      .select({ id: businesses.id, name: businesses.name, slug: businesses.slug })
      .from(businesses)
      .where(eq(businesses.id, invitation.businessId))
      .limit(1);

    const [inviter] = await db
      .select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(eq(users.id, invitation.invitedById))
      .limit(1);

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new ValidationError('This invitation has already been accepted.');
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      throw new ValidationError('This invitation was revoked by the workspace administrator.');
    }

    if (new Date() > invitation.expiresAt || invitation.status === InvitationStatus.EXPIRED) {
      if (invitation.status !== InvitationStatus.EXPIRED) {
        await db
          .update(teamInvitations)
          .set({ status: InvitationStatus.EXPIRED, updatedAt: new Date() })
          .where(eq(teamInvitations.id, invitation.id));
      }
      throw new ValidationError('This invitation has expired. Please ask your administrator to resend it.');
    }

    // Check if the user already exists in the system
    const [existingUser] = await db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.email, invitation.email.toLowerCase()))
      .limit(1);

    let isAlreadyMember = false;
    let isOwner = false;

    if (existingUser) {
      if (biz && biz.ownerId === existingUser.id) {
        isAlreadyMember = true;
        isOwner = true;
      } else {
        const [existingMember] = await db
          .select({ id: businessMembers.id })
          .from(businessMembers)
          .where(
            and(
              eq(businessMembers.businessId, invitation.businessId),
              eq(businessMembers.userId, existingUser.id),
            ),
          )
          .limit(1);

        if (existingMember) {
          isAlreadyMember = true;
        }
      }
    }

    return {
      valid: true,
      invitationId: invitation.id,
      businessId: invitation.businessId,
      businessName: biz?.name || 'BAXATO Workspace',
      businessSlug: biz?.slug || 'workspace',
      email: invitation.email,
      role: invitation.role as UserRole,
      inviterName: inviter ? `${inviter.firstName} ${inviter.lastName}`.trim() || inviter.email : 'A team member',
      expiresAt: invitation.expiresAt,
      existingAccount: Boolean(existingUser),
      userName: existingUser ? `${existingUser.firstName} ${existingUser.lastName}`.trim() : null,
      isAlreadyMember,
      isOwner,
    };
  }

  /**
   * Accepts an invitation and provisions or links the user into the business.
   */
  public async acceptInvitation(params: {
    rawToken: string;
    userId?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    phoneNumber?: string;
    clientIp?: string;
    userAgent?: string;
  }) {
    const { rawToken, userId, firstName, lastName, password, phoneNumber, clientIp, userAgent } = params;

    const validation = await this.validateInvitationToken(rawToken);
    const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

    let resolvedUserId: string;
    let resolvedUserEmail: string;

    if (userId) {
      // 1. Logged in caller
      const [existingCaller] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existingCaller) {
        throw new NotFoundError('User');
      }

      // Security & Session integrity check: Caller must match invited email!
      if (existingCaller.email.toLowerCase() !== validation.email.toLowerCase()) {
        throw new ConflictError(
          `You are currently signed in as ${existingCaller.email}, but this invitation was sent to ${validation.email}. Please sign out to accept this invitation.`,
        );
      }

      // Check if already owner of this business
      const [biz] = await db
        .select({ id: businesses.id, ownerId: businesses.ownerId })
        .from(businesses)
        .where(eq(businesses.id, validation.businessId))
        .limit(1);

      if (biz && biz.ownerId === existingCaller.id) {
        throw new ConflictError('You are already the owner of this workspace.');
      }

      // Check if already an active member of this business
      const [existingMember] = await db
        .select({ id: businessMembers.id })
        .from(businessMembers)
        .where(
          and(
            eq(businessMembers.businessId, validation.businessId),
            eq(businessMembers.userId, existingCaller.id),
          ),
        )
        .limit(1);

      if (existingMember) {
        throw new ConflictError('You are already an active member of this workspace.');
      }

      resolvedUserId = existingCaller.id;
      resolvedUserEmail = existingCaller.email;
    } else {
      // 2. Not logged in: check if user account with invitation email already exists
      const [existingUser] = await db
        .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.email, validation.email.toLowerCase()))
        .limit(1);

      if (existingUser) {
        if (!password) {
          throw new ValidationError(
            `An account already exists for ${validation.email}. Please provide your password to accept and join.`,
          );
        }
        const isMatch = await bcrypt.compare(password, existingUser.passwordHash || '');
        if (!isMatch) {
          throw new ValidationError('Incorrect password for existing account.');
        }
        resolvedUserId = existingUser.id;
        resolvedUserEmail = existingUser.email;
      } else {
        // 3. Brand new user: provision account
        if (!firstName || !lastName || !password) {
          throw new ValidationError('First name, last name, and password are required to create your account.');
        }
        const hasMinLength = password.length >= 8;
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecial = /[^A-Za-z0-9]/.test(password);

        if (!hasMinLength || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
          throw new ValidationError(
            'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
          );
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const [newUser] = await db
          .insert(users)
          .values({
            email: validation.email.toLowerCase(),
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phoneNumber: phoneNumber?.trim() || null,
            passwordHash,
            role: validation.role,
            isEmailVerified: true, // Auto-verified through email invite token!
            status: 'ACTIVE',
            kycStatus: KycStatus.UNVERIFIED,
          })
          .returning();

        if (!newUser) {
          throw new Error('Failed to provision user record.');
        }

        resolvedUserId = newUser.id;
        resolvedUserEmail = newUser.email;
      }
    }

    // Check if membership already recorded
    const [alreadyMember] = await db
      .select({ id: businessMembers.id })
      .from(businessMembers)
      .where(
        and(
          eq(businessMembers.businessId, validation.businessId),
          eq(businessMembers.userId, resolvedUserId),
        ),
      )
      .limit(1);

    if (!alreadyMember) {
      await db.insert(businessMembers).values({
        businessId: validation.businessId,
        userId: resolvedUserId,
        role: validation.role,
      });
    }

    // Mark invitation accepted
    await db
      .update(teamInvitations)
      .set({
        status: InvitationStatus.ACCEPTED,
        updatedAt: new Date(),
      })
      .where(eq(teamInvitations.tokenHash, tokenHash));

    // Audit log
    await auditService.log({
      userId: resolvedUserId,
      businessId: validation.businessId,
      action: 'TEAM_INVITATION_ACCEPTED',
      resourceType: 'TEAM_MEMBER',
      resourceId: resolvedUserId,
      ipAddress: clientIp,
      userAgent,
      changes: {
        invitationId: validation.invitationId,
        role: validation.role,
      },
    });

    // Generate authenticated session JWT token
    const token = generateToken({
      id: resolvedUserId,
      email: resolvedUserEmail,
      role: validation.role,
      businessId: validation.businessId,
      kycStatus: KycStatus.UNVERIFIED,
    });

    return {
      success: true,
      token,
      user: {
        id: resolvedUserId,
        email: resolvedUserEmail,
        role: validation.role,
        businessId: validation.businessId,
        businessName: validation.businessName,
      },
      message: `Successfully joined ${validation.businessName}!`,
    };
  }
}

export const teamService = new TeamService();
