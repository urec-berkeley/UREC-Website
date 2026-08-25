"use client";

import { useActionState, useState } from "react";
import { assignAccountRole, removeAccountRole } from "./actions";

type AccountRole = {
  role_id: string;
  role: { id: string; name: string } | null;
};

type Enrollment = {
  course_id: string;
  role_id: string;
  role: { name: string } | null;
  course: { name: string; code: string | null } | null;
};

type UserCardProps = {
  user: { id: string; email: string; full_name: string | null; created_at: string };
  accountRoles: AccountRole[];
  enrollments: Enrollment[];
  allAccountRoles: { id: string; name: string }[];
};

export function UserCard({ user, accountRoles, enrollments, allAccountRoles }: UserCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [assignState, assignAction] = useActionState(assignAccountRole, {});
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const assignedRoleIds = new Set(accountRoles.map((ar) => ar.role_id));
  const availableRoles = allAccountRoles.filter((r) => !assignedRoleIds.has(r.id));

  async function handleRemove(roleId: string) {
    if (!window.confirm("Remove this account role?")) return;
    setRemoving(roleId);
    setRemoveError(null);
    const result = await removeAccountRole(user.id, roleId);
    setRemoving(null);
    if (result.error) setRemoveError(result.error);
  }

  const isExecUser = accountRoles.length > 0;

  return (
    <li className="rounded-md border border-hair bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between gap-4 px-5 py-3.5 text-left transition-colors hover:bg-[#f9fafb]"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-text">
            {user.full_name ?? user.email}
          </p>
          <p className="truncate text-xs text-muted">{user.email}</p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {accountRoles.map((ar) => (
            <span
              key={ar.role_id}
              className="whitespace-nowrap rounded-full bg-navy/10 px-2.5 py-0.5 text-[11px] font-semibold text-navy"
            >
              {ar.role?.name ?? "Unknown"}
            </span>
          ))}
          {enrollments.length > 0 && (
            <span className="whitespace-nowrap text-xs text-muted">
              {enrollments.length} course{enrollments.length !== 1 ? "s" : ""}
            </span>
          )}
          <svg
            className={`h-4 w-4 text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-hair px-5 py-4">
          {/* Account roles section */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Account Roles
            </h4>
            {accountRoles.length === 0 ? (
              <p className="mt-2 text-xs text-muted">No account roles — regular member.</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {accountRoles.map((ar) => (
                  <span
                    key={ar.role_id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-navy/10 px-3 py-1 text-xs font-medium text-navy"
                  >
                    {ar.role?.name}
                    <button
                      type="button"
                      onClick={() => handleRemove(ar.role_id)}
                      disabled={removing === ar.role_id}
                      className="ml-0.5 rounded-full p-0.5 text-navy/50 transition-colors hover:bg-navy/10 hover:text-neg disabled:opacity-50"
                      title={`Remove ${ar.role?.name} role`}
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
            {removeError && (
              <p className="mt-2 text-xs text-neg">{removeError}</p>
            )}

            {availableRoles.length > 0 && (
              <form action={assignAction} className="mt-3 flex items-center gap-2">
                <input type="hidden" name="user_id" value={user.id} />
                <select
                  name="role_id"
                  className="rounded-md border border-hair px-2 py-1.5 text-xs text-text"
                  required
                >
                  <option value="">Add role…</option>
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-navy px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-navy-deep"
                >
                  Add
                </button>
              </form>
            )}
            {assignState.error && (
              <p className="mt-2 text-xs text-neg">{assignState.error}</p>
            )}
          </div>

          {/* Course enrollments section */}
          <div className="mt-5">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Course Enrollments
            </h4>
            {enrollments.length === 0 ? (
              <p className="mt-2 text-xs text-muted">Not enrolled in any course.</p>
            ) : (
              <ul className="mt-2 divide-y divide-hair">
                {enrollments.map((e, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-xs text-text">
                      {e.course?.name ?? "Unknown"}
                      {e.course?.code && (
                        <span className="ml-1 text-muted">({e.course.code})</span>
                      )}
                    </span>
                    <span className="whitespace-nowrap rounded-full border border-hair px-2 py-0.5 text-[11px] font-medium text-muted">
                      {e.role?.name ?? "Member"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-4 text-[11px] text-muted">
            Joined {new Date(user.created_at).toLocaleDateString()}
          </p>
        </div>
      )}
    </li>
  );
}
