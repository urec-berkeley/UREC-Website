"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCourse, getIsExec } from "@/lib/data/queries";
import { revalidatePath } from "next/cache";

// RLS re-enforces exec-only on course_sections/groups/enrollments/
// group_memberships writes regardless of the UI gate on these pages —
// same pattern used throughout.
export async function createSection(
  _prev: { error?: string },
  formData: FormData,
  ): Promise<{ error?: string }> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Give the section a name." };

  const course = await getCurrentCourse();
    if (!course) return { error: "No active course found. Set one up first." };

  const supabase = await createClient();
    const { error } = await supabase
    .from("course_sections")
    .insert({ course_id: course.id, name });
    if (error) return { error: error.message };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't create the section. Try again.",
    };
  }

revalidatePath("/directory/sections");
  return {};
}

export async function assignSection(
  enrollmentId: string,
  _prev: { error?: string },
  formData: FormData,
  ): Promise<{ error?: string }> {
  try {
    const sectionId = String(formData.get("section_id") ?? "") || null;

  const supabase = await createClient();
    const { error } = await supabase
    .from("enrollments")
    .update({ section_id: sectionId })
    .eq("id", enrollmentId);
    if (error) return { error: error.message };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't update the section. Try again.",
    };
  }

revalidatePath("/directory");
  revalidatePath("/directory/sections");
  return {};
}

// Add people to the active course by pasting emails. A person who has
// already signed in is enrolled immediately; anyone who hasn't yet gets
// a pending_enrollments row that the signup trigger redeems on their
// first login. Runs under the admin (service-role) client after an
// explicit exec check — inserting an enrollment for someone else, and
// reading users across the whole table, is exactly what RLS forbids for
// a normal request, so we gate it in code instead.
//
// Non-@berkeley.edu addresses are allowed too, but only exec can add
// them — pasting a Gmail address here IS the guest invite (see
// guest_allowlist / is_allowed_guest in 20260821010000_guest_allowlist.sql).
// It's the only way in for a non-Berkeley email; proxy.ts otherwise
// signs anyone else out immediately.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function enrollMembers(
  _prev: { error?: string },
  formData: FormData,
  ): Promise<{ error?: string }> {
  try {
    if (!(await getIsExec())) return { error: "Only exec can add people." };

  const course = await getCurrentCourse();
    if (!course) return { error: "No active course found. Set one up first." };

  const roleId = String(formData.get("role_id") ?? "").trim();
    if (!roleId) return { error: "Pick a role for the members you're adding." };
    const sectionId = String(formData.get("section_id") ?? "") || null;

  // Accept commas, whitespace, or newlines between addresses.
  const raw = String(formData.get("emails") ?? "");
    const emails = Array.from(
      new Set(
        raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
        ),
      );
    if (emails.length === 0) return { error: "Paste at least one email." };

  const bad = emails.filter((e) => !EMAIL_SHAPE.test(e));
    if (bad.length > 0) {
      return {
        error: `These don't look like valid emails: ${bad.slice(0, 3).join(", ")}`,
      };
    }

  const admin = createAdminClient();

  const guestEmails = emails.filter((e) => !e.endsWith("@berkeley.edu"));
    if (guestEmails.length > 0) {
      const supabase = await createClient();
      const {
        data: { user: actor },
      } = await supabase.auth.getUser();
      const { error: guestError } = await admin.from("guest_allowlist").upsert(
        guestEmails.map((email) => ({ email, invited_by: actor?.id ?? null })),
        { onConflict: "email", ignoreDuplicates: true },
        );
      if (guestError) return { error: guestError.message };
    }

  // Who already has an account? Those get real enrollments now; the rest
  // get parked as pending invites.
  const { data: existing } = await admin
    .from("users")
    .select("id, email")
    .in("email", emails);
    const byEmail = new Map(
      ((existing ?? []) as { id: string; email: string }[]).map((u) => [
        u.email.toLowerCase(),
        u.id,
        ]),
      );

  const enrollRows = emails
    .filter((e) => byEmail.has(e))
    .map((e) => ({
      user_id: byEmail.get(e)!,
      course_id: course.id,
      section_id: sectionId,
      role_id: roleId,
    }));
    const pendingRows = emails
    .filter((e) => !byEmail.has(e))
    .map((e) => ({
      email: e,
      course_id: course.id,
      section_id: sectionId,
      role_id: roleId,
    }));

  if (enrollRows.length > 0) {
    // Don't clobber existing members: re-pasting a roster to add a few
    // new analysts must not silently downgrade someone already enrolled
    // as a Grader (or reset their section) just because their email is in
    // the box with a different role selected. Insert new enrollments only;
    // changing an existing member's role/section is done per-row above.
    const { error } = await admin
    .from("enrollments")
    .upsert(enrollRows, { onConflict: "user_id,course_id", ignoreDuplicates: true });
    if (error) return { error: error.message };
  }
    if (pendingRows.length > 0) {
      const { error } = await admin
      .from("pending_enrollments")
      .upsert(pendingRows, { onConflict: "email,course_id" });
      if (error) return { error: error.message };
    }
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't add those people. Try again.",
    };
  }

revalidatePath("/directory");
  return {};
}

export async function removeEnrollment(enrollmentId: string) {
  if (!(await getIsExec())) throw new Error("Only exec can remove people.");

const admin = createAdminClient();
  const { error } = await admin.from("enrollments").delete().eq("id", enrollmentId);
  if (error) throw new Error(error.message);

revalidatePath("/directory");
}

export async function removePending(pendingId: string) {
  if (!(await getIsExec())) throw new Error("Only exec can remove invites.");

const supabase = await createClient();
  const { error } = await supabase
  .from("pending_enrollments")
  .delete()
  .eq("id", pendingId);
  if (error) throw new Error(error.message);

revalidatePath("/directory");
}

// Revoking guest access only removes the sign-in exception — it does
// NOT touch any enrollment the person already has. If they still have
// an active enrollment in some course, they'll be signed out of the
// platform entirely on their next request, same as any outsider. Exec
// should usually remove the enrollment(s) first (or accept that as the
// intended effect).
export async function removeGuestEmail(email: string) {
  if (!(await getIsExec())) throw new Error("Only exec can revoke guest access.");

const supabase = await createClient();
  const { error } = await supabase.from("guest_allowlist").delete().eq("email", email);
  if (error) throw new Error(error.message);

revalidatePath("/directory");
}

export async function createGroup(
  _prev: { error?: string },
  formData: FormData,
  ): Promise<{ error?: string }> {
  try {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Give the group a name." };

  const course = await getCurrentCourse();
    if (!course) return { error: "No active course found. Set one up first." };

  const supabase = await createClient();
    const { error } = await supabase
    .from("groups")
    .insert({ course_id: course.id, name });
    if (error) return { error: error.message };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Couldn't create the group. Try again.",
    };
  }

revalidatePath("/directory/groups");
  return {};
}

export async function assignGroup(userId: string, groupId: string | null, formData: FormData) {
  const newGroupId = String(formData.get("group_id") ?? "") || null;

const supabase = await createClient();

if (groupId) {
  await supabase
  .from("group_memberships")
  .delete()
  .eq("user_id", userId)
  .eq("group_id", groupId);
}
  if (newGroupId) {
    const { error } = await supabase
    .from("group_memberships")
    .insert({ user_id: userId, group_id: newGroupId });
    if (error) throw new Error(error.message);
  }

revalidatePath("/directory/groups");
}

// ============ GUEST INVITE SYSTEM ============

import crypto from 'crypto';

// Generate a secure random token for invites
function generateInviteToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Create an invite for a guest
export async function createInvite(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string; inviteId?: string }> {
  const guestEmail = formData.get('guest_email') as string;
  const courseId = formData.get('course_id') as string;

  if (!guestEmail || !courseId) {
    return { error: 'Missing email or course' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(guestEmail)) {
    return { error: 'Invalid email format' };
  }

  try {
    const supabase = await createClient();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return { error: 'Not authenticated' };
    }

    const { data: execCheck } = await supabase
      .rpc('is_exec')
      .single();
    
    if (!execCheck) {
      return { error: 'Only exec can create invites' };
    }

    const token = generateInviteToken();
    const { data: invite, error } = await supabase
      .from('invites')
      .insert({
        guest_email: guestEmail.toLowerCase(),
        course_id: courseId,
        invited_by: userData.user.id,
        token,
      })
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    console.log(`Invite link: ${process.env.NEXT_PUBLIC_APP_URL}/accept-invite?token=${token}`);

    revalidatePath('/directory');
    return { inviteId: invite.id };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create invite',
    };
  }
}

// Get pending invites for a course
export async function getPendingInvites(courseId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('invites')
      .select('id, guest_email, created_at, expires_at, status')
      .eq('course_id', courseId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { invites: data || [] };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to fetch invites' };
  }
}

// Remove an invite
export async function removeInvite(
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const inviteId = formData.get('invite_id') as string;

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('invites')
      .delete()
      .eq('id', inviteId);

    if (error) return { error: error.message };

    revalidatePath('/directory');
    return {};
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to remove invite',
    };
  }
}

// Accept an invite (during guest signup)
export async function acceptInvite(
  token: string
): Promise<{ error?: string; guestEmail?: string; courseId?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .rpc('accept_invite', { invite_token: token })
      .single();

    if (error) {
      return { error: 'Invalid or expired invite' };
    }

    const row = data as { guest_email: string; course_id: string };
    return {
      guestEmail: row.guest_email,
      courseId: row.course_id,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to accept invite',
    };
  }
}
