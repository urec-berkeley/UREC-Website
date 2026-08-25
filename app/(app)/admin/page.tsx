import { getIsExec } from "@/lib/data/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAllUsers } from "./actions";
import { UserCard } from "./role-editor";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const isExec = await getIsExec();
  if (!isExec) redirect("/dashboard");

  const { q: rawQuery, filter } = await searchParams;
  const query = (rawQuery ?? "").trim().toLowerCase();

  const result = await getAllUsers();
  if (result.error) {
    return (
      <div className="mx-auto w-full max-w-3xl px-8 py-12">
        <h1 className="font-display text-2xl font-bold text-navy-deep">Admin</h1>
        <p className="mt-4 text-sm text-neg">{result.error}</p>
      </div>
    );
  }

  const { users, accountRoles, enrollments, roles } = result;
  const accountScopedRoles = (roles ?? []).filter((r: { scope: string }) => r.scope === "account");

  type AccountRoleRow = {
    user_id: string;
    role_id: string;
    role: { id: string; name: string } | null;
  };
  type EnrollmentRow = {
    user_id: string;
    course_id: string;
    role_id: string;
    role: { name: string } | null;
    course: { name: string; code: string | null } | null;
  };

  const arByUser = new Map<string, AccountRoleRow[]>();
  for (const ar of (accountRoles ?? []) as AccountRoleRow[]) {
    const list = arByUser.get(ar.user_id) ?? [];
    list.push(ar);
    arByUser.set(ar.user_id, list);
  }

  const enByUser = new Map<string, EnrollmentRow[]>();
  for (const en of (enrollments ?? []) as EnrollmentRow[]) {
    const list = enByUser.get(en.user_id) ?? [];
    list.push(en);
    enByUser.set(en.user_id, list);
  }

  type UserRow = { id: string; email: string; full_name: string | null; created_at: string };
  let filteredUsers = (users ?? []) as UserRow[];

  if (filter === "exec") {
    filteredUsers = filteredUsers.filter((u) => arByUser.has(u.id));
  } else if (filter === "members") {
    filteredUsers = filteredUsers.filter((u) => !arByUser.has(u.id));
  }

  if (query) {
    filteredUsers = filteredUsers.filter(
      (u) =>
        (u.full_name ?? "").toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query),
    );
  }

  const totalUsers = (users ?? []).length;
  const execCount = arByUser.size;

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-deep">Admin</h1>
          <p className="mt-2 text-sm text-muted">
            {totalUsers} user{totalUsers !== 1 ? "s" : ""} on the platform
            &middot; {execCount} exec
          </p>
        </div>
        <Link
          href="/courses"
          className="whitespace-nowrap rounded-md border border-hair px-4 py-2 text-xs font-medium text-text transition-colors hover:bg-[#eef7ff]"
        >
          Manage Courses
        </Link>
      </div>

      {/* Filter pills */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/admin"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${!filter ? "border-blue bg-pale text-sky" : "border-hair text-muted"}`}
        >
          All ({totalUsers})
        </Link>
        <Link
          href="/admin?filter=exec"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === "exec" ? "border-blue bg-pale text-sky" : "border-hair text-muted"}`}
        >
          Exec ({execCount})
        </Link>
        <Link
          href="/admin?filter=members"
          className={`rounded-full border px-3 py-1 text-xs font-medium ${filter === "members" ? "border-blue bg-pale text-sky" : "border-hair text-muted"}`}
        >
          Members ({totalUsers - execCount})
        </Link>
      </div>

      {/* Search */}
      <form action="/admin" className="mt-4">
        {filter && <input type="hidden" name="filter" value={filter} />}
        <input
          type="search"
          name="q"
          defaultValue={rawQuery ?? ""}
          placeholder="Search by name or email…"
          className="w-full rounded-md border border-hair bg-white px-4 py-2 text-sm text-text outline-none focus:border-blue"
        />
      </form>
      {query && (
        <p className="mt-2 text-xs text-muted">
          {filteredUsers.length} match{filteredUsers.length === 1 ? "" : "es"} for &ldquo;{rawQuery}&rdquo;
          {" · "}
          <Link
            href={filter ? `/admin?filter=${filter}` : "/admin"}
            className="text-blue hover:underline"
          >
            clear
          </Link>
        </p>
      )}

      {/* User list */}
      <ul className="mt-6 flex flex-col gap-3">
        {filteredUsers.map((u) => (
          <UserCard
            key={u.id}
            user={u}
            accountRoles={arByUser.get(u.id) ?? []}
            enrollments={enByUser.get(u.id) ?? []}
            allAccountRoles={accountScopedRoles}
          />
        ))}
        {filteredUsers.length === 0 && (
          <li className="py-6 text-sm text-muted">No users match.</li>
        )}
      </ul>
    </div>
  );
}
