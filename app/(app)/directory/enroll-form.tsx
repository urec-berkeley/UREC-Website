"use client";

import { useActionState } from "react";
import { FormError, SubmitButton } from "../ui/form-controls";

type FormState = { error?: string };
type Role = { id: string; name: string };
type Section = { id: string; name: string };

export function EnrollForm({
  action,
  roles,
  sections,
  defaultRoleId,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  roles: Role[];
  sections: Section[];
  defaultRoleId: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className="border-t border-hair px-4 py-4">
    <FormError error={state?.error} />
    <label className="mt-3 block text-xs font-medium text-muted">
    Emails
    <textarea
      name="emails"
      rows={3}
      required
      placeholder="one or many, separated by commas, spaces, or new lines&#10;jane@berkeley.edu, guest.speaker@gmail.com"
      className="mt-1 w-full rounded-md border border-hair bg-white px-3 py-2 text-sm text-text outline-none focus:border-blue"
      />
    </label>
    <div className="mt-3 flex flex-wrap items-end gap-3">
    <label className="text-xs font-medium text-muted">
    Role
    <select
      name="role_id"
      required
      defaultValue={defaultRoleId}
      className="mt-1 block rounded-md border border-hair bg-white px-2 py-1.5 text-sm text-text outline-none focus:border-blue"
      >
      {roles.map((r) => (
        <option key={r.id} value={r.id}>
          {r.name}
        </option>
        ))}
    </select>
    </label>
    <label className="text-xs font-medium text-muted">
    Section
    <select
      name="section_id"
      defaultValue=""
      className="mt-1 block rounded-md border border-hair bg-white px-2 py-1.5 text-sm text-text outline-none focus:border-blue"
      >
    <option value="">No section</option>
      {sections.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
        ))}
    </select>
    </label>
    <SubmitButton
      pendingText="Adding…"
      className="rounded-md bg-sky px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy"
      >
    Add to course
    </SubmitButton>
    </div>
    <p className="mt-3 text-xs text-muted">
    People who&rsquo;ve signed in are added right away. Anyone who
    hasn&rsquo;t is invited &mdash; they&rsquo;re enrolled automatically
    the first time they log in with Google. Non-@berkeley.edu emails
    (guest speakers, alumni, collaborators) are also added to the
    approved-guest list below, since the platform normally only lets
    Berkeley accounts sign in at all.
    </p>
    </form>
    );
}
