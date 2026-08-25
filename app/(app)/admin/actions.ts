"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getIsExec } from "@/lib/data/queries";
import { revalidatePath } from "next/cache";

export async function getAllUsers() {
  if (!(await getIsExec())) return { error: "Only exec can view all users." };

  const admin = createAdminClient();

  const [
    { data: users, error: usersErr },
    { data: accountRoles, error: arErr },
    { data: enrollments, error: enErr },
    { data: roles, error: rolesErr },
    { data: courses, error: coursesErr },
  ] = await Promise.all([
    admin
      .from("users")
      .select("id, email, full_name, avatar_url, created_at")
      .order("full_name"),
    admin
      .from("account_roles")
      .select("user_id, role_id, role:roles(id, name)")
      .order("user_id"),
    admin
      .from("enrollments")
      .select("user_id, course_id, role_id, role:roles(name), course:courses(name, code)")
      .order("user_id"),
    admin.from("roles").select("id, name, scope").order("name"),
    admin.from("courses").select("id, name, code").order("name"),
  ]);

  const err = usersErr || arErr || enErr || rolesErr || coursesErr;
  if (err) return { error: err.message };

  return {
    users: users ?? [],
    accountRoles: accountRoles ?? [],
    enrollments: enrollments ?? [],
    roles: roles ?? [],
    courses: courses ?? [],
  };
}

export async function assignAccountRole(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  if (!(await getIsExec())) return { error: "Only exec can assign roles." };

  const userId = formData.get("user_id") as string;
  const roleId = formData.get("role_id") as string;
  if (!userId || !roleId) return { error: "Missing user or role." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("account_roles")
    .upsert({ user_id: userId, role_id: roleId }, { onConflict: "user_id,role_id", ignoreDuplicates: true });

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return {};
}

export async function removeAccountRole(
  userId: string,
  roleId: string,
): Promise<{ error?: string }> {
  if (!(await getIsExec())) return { error: "Only exec can remove roles." };

  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (currentUser?.id === userId) {
    return { error: "You can't remove your own account role." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("account_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role_id", roleId);

  if (error) return { error: error.message };
  revalidatePath("/admin");
  return {};
}
