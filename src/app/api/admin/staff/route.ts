import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { supabaseAdmin as supabaseAdminOriginal } from '@/lib/supabase-server';
import bcryptjs from 'bcryptjs';
import { logAuditAction } from '@/lib/audit';
import { AuditAction } from '@/types';
import crypto from 'crypto';

const supabaseAdmin: any = supabaseAdminOriginal;

import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/admin-roles';

// GET /api/admin/staff - List all admin staff
export async function GET(request: Request) {
  try {
    await requireRole(request, 'admin');

    const { data: staff, error } = await supabaseAdmin
      .from('users')
      .select('id, full_name, email, phone, is_active, admin_role, admin_permissions, created_at, updated_at')
      .eq('role', 'admin')
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      staff: (staff || []).map((s: any) => ({
        ...s,
        admin_role: s.admin_role || 'super_admin',
        admin_permissions: s.admin_permissions || DEFAULT_ROLE_PERMISSIONS[s.admin_role || 'super_admin'] || DEFAULT_ROLE_PERMISSIONS.super_admin,
      })),
    });
  } catch (err: any) {
    console.error('Error fetching admin staff:', err.message || err);
    return NextResponse.json({ error: err.message || 'Failed to fetch staff roster' }, { status: 500 });
  }
}

// POST /api/admin/staff - Add a new admin staff member
export async function POST(request: Request) {
  try {
    const session = await requireRole(request, 'admin');

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
        { error: 'Forbidden: Only Super Admins can add or configure staff members.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { full_name, email, phone, password, admin_role, admin_permissions } = body;

    if (!full_name || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Full name, email, phone number, and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    // Check if email or phone already exists
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email, phone')
      .or(`email.eq.${cleanEmail},phone.eq.${cleanPhone}`)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email or phone already exists in the system.' },
        { status: 409 }
      );
    }

    const passwordHash = await bcryptjs.hash(password, 10);
    const selectedRole = admin_role || 'operations';
    const finalPermissions =
      admin_permissions ||
      DEFAULT_ROLE_PERMISSIONS[selectedRole] ||
      DEFAULT_ROLE_PERMISSIONS.operations;

    const newUid = crypto.randomUUID();

    const { data: newStaff, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        supabase_uid: newUid,
        role: 'admin',
        full_name: full_name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        password_hash: passwordHash,
        is_active: true,
        admin_role: selectedRole,
        admin_permissions: finalPermissions,
      })
      .select('id, full_name, email, phone, is_active, admin_role, admin_permissions, created_at')
      .single();

    if (insertError) throw insertError;

    // Log Audit Action
    try {
      await logAuditAction({
        admin_id: session.user_id,
        action: AuditAction.ADMIN_LOGIN,
        target_type: 'user',
        target_id: newStaff.id,
        metadata: {
          action: 'STAFF_MEMBER_CREATED',
          email: cleanEmail,
          role: selectedRole,
        },
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      staff: newStaff,
    });
  } catch (err: any) {
    console.error('Error creating staff member:', err.message || err);
    return NextResponse.json(
      { error: err.message || 'Failed to create staff member' },
      { status: 500 }
    );
  }
}
