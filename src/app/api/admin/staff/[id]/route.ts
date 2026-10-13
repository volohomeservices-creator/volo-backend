import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
import bcryptjs from 'bcryptjs';
import { logAuditAction } from '@/lib/audit';
import { AuditAction } from '@/types';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/admin-roles';

const supabaseAdmin: any = supabaseAdminOriginal;

// PATCH /api/admin/staff/[id] - Update staff member role, permissions, or status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(request, 'admin');
    const { id: staffId } = await params;

    // Verify caller is super_admin or has manage_staff permission
    const { data: caller } = await supabaseAdmin
      .from('users')
      .select('admin_role, admin_permissions')
      .eq('id', session.user_id)
      .single();

    const canManageStaff =
      caller?.admin_role === 'super_admin' ||
      caller?.admin_permissions?.manage_staff === true;

    if (!canManageStaff) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admins can configure staff members.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { admin_role, admin_permissions, is_active, full_name, phone, password } = body;

    // Prevent deactivating own account
    if (staffId === session.user_id && is_active === false) {
      return NextResponse.json(
        { error: 'Action denied: You cannot deactivate your own admin account.' },
        { status: 400 }
      );
    }

    // Prevent removing super_admin from yourself if you are the only one
    if (staffId === session.user_id && admin_role && admin_role !== 'super_admin') {
      const { count } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'admin')
        .eq('admin_role', 'super_admin')
        .eq('is_active', true);

      if ((count || 0) <= 1) {
        return NextResponse.json(
          { error: 'Action denied: You cannot revoke Super Admin from the only active Super Admin account.' },
          { status: 400 }
        );
      }
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (full_name) updatePayload.full_name = full_name.trim();
    if (phone) updatePayload.phone = phone.trim();
    if (is_active !== undefined) updatePayload.is_active = Boolean(is_active);

    if (admin_role) {
      updatePayload.admin_role = admin_role;
      if (admin_permissions) {
        updatePayload.admin_permissions = admin_permissions;
      } else if (DEFAULT_ROLE_PERMISSIONS[admin_role]) {
        updatePayload.admin_permissions = DEFAULT_ROLE_PERMISSIONS[admin_role];
      }
    } else if (admin_permissions) {
      updatePayload.admin_permissions = admin_permissions;
    }

    if (password && password.length >= 6) {
      updatePayload.password_hash = await bcryptjs.hash(password, 10);
    }

    const { data: updatedStaff, error: updateErr } = await supabaseAdmin
      .from('users')
      .update(updatePayload)
      .eq('id', staffId)
      .eq('role', 'admin')
      .select('id, full_name, email, phone, is_active, admin_role, admin_permissions, updated_at')
      .single();

    if (updateErr) throw updateErr;

    // Audit log
    try {
      await logAuditAction({
        admin_id: session.user_id,
        action: AuditAction.ADMIN_LOGIN,
        target_type: 'user',
        target_id: staffId,
        metadata: {
          action: 'STAFF_MEMBER_UPDATED',
          changes: Object.keys(updatePayload),
        },
      });
    } catch {
      // non-blocking
    }

    return NextResponse.json({
      success: true,
      staff: updatedStaff,
    });
  } catch (err: any) {
    console.error('Error updating staff member:', err.message || err);
    return NextResponse.json(
      { error: err.message || 'Failed to update staff member' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/staff/[id] - Revoke staff access
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireRole(request, 'admin');
    const { id: staffId } = await params;

    if (staffId === session.user_id) {
      return NextResponse.json(
        { error: 'Action denied: You cannot delete your own admin account.' },
        { status: 400 }
      );
    }

    // Verify caller is super_admin
    const { data: caller } = await supabaseAdmin
      .from('users')
      .select('admin_role')
      .eq('id', session.user_id)
      .single();

    if (caller?.admin_role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admins can remove staff members.' },
        { status: 403 }
      );
    }

    // Soft-deactivate by setting is_active = false and role = 'customer'
    const { error: deleteErr } = await supabaseAdmin
      .from('users')
      .update({
        role: 'customer',
        is_active: false,
        admin_role: null,
        admin_permissions: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', staffId);

    if (deleteErr) throw deleteErr;

    return NextResponse.json({
      success: true,
      message: 'Staff member access revoked successfully.',
    });
  } catch (err: any) {
    console.error('Error deleting staff member:', err.message || err);
    return NextResponse.json(
      { error: err.message || 'Failed to revoke staff access' },
      { status: 500 }
    );
  }
}
