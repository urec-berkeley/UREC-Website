'use client';

import { useActionState, useEffect, useState } from 'react';
import { createInvite, getPendingInvites, removeInvite } from './actions';

interface Invite {
  id: string;
  guest_email: string;
  created_at: string;
  expires_at: string;
  status: string;
}

interface InviteFormProps {
  courseId: string;
}

export function InviteForm({ courseId }: InviteFormProps) {
  const [createState, createAction] = useActionState(createInvite, {});
  const [removeState, removeAction] = useActionState(removeInvite, {});
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  async function loadInvites() {
    const result = await getPendingInvites(courseId);
    if (result.invites) setInvites(result.invites as Invite[]);
    setLoading(false);
  }

  useEffect(() => { loadInvites(); }, [courseId]);

  useEffect(() => {
    if (createState.inviteId || removeState) loadInvites();
  }, [createState.inviteId, removeState]);

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <form action={createAction} className="mt-3">
        <input type="hidden" name="course_id" value={courseId} />

        {createState.error && (
          <div className="mb-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
            {createState.error}
          </div>
        )}
        {createState.inviteLink && (
          <div className="mb-3 rounded-md bg-green-50 p-3 text-sm text-green-700">
            <p className="font-medium">Invite created! Send this link to the guest:</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createState.inviteLink}
                className="flex-1 rounded border border-green-300 bg-white px-2 py-1 text-xs text-text"
                onFocus={(e) => e.target.select()}
              />
              <button
                type="button"
                onClick={() => copyLink(createState.inviteLink!)}
                className="whitespace-nowrap rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-green-600">Expires in 7 days.</p>
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="email"
            name="guest_email"
            placeholder="guest@example.com"
            required
            className="flex-1 rounded-md border border-hair px-3 py-2 text-sm text-text outline-none focus:border-blue"
          />
          <button
            type="submit"
            className="whitespace-nowrap rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Send Invite
          </button>
        </div>
      </form>

      <div className="mt-4">
        {loading ? (
          <p className="text-xs text-muted">Loading invites…</p>
        ) : invites.length === 0 ? (
          <p className="text-xs text-muted">No pending invites.</p>
        ) : (
          <ul className="mt-2 divide-y divide-hair border-t border-hair">
            {invites.map((inv) => (
              <li key={inv.id} className="flex items-center justify-between gap-4 py-2.5">
                <div>
                  <p className="text-sm text-text">{inv.guest_email}</p>
                  <p className="text-xs text-muted">
                    Expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <form action={removeAction} className="m-0">
                  <input type="hidden" name="invite_id" value={inv.id} />
                  <button
                    type="submit"
                    className="rounded-md border border-hair px-2 py-1 text-xs font-medium text-neg hover:bg-[#fdecea]"
                  >
                    Cancel
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
