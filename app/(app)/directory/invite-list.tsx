'use client';

import { useEffect, useState } from 'react';
import { useActionState } from 'react';
import { getPendingInvites, removeInvite } from './actions';

interface InviteListProps {
  courseId: string;
}

export function InviteList({ courseId }: InviteListProps) {
  const [invites, setInvites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeState, removeAction] = useActionState(removeInvite, {});

  useEffect(() => {
    async function load() {
      const result = await getPendingInvites(courseId);
      if (result.invites) {
        setInvites(result.invites);
      }
      setLoading(false);
    }
    load();
  }, [courseId]);

  if (loading) return <div>Loading invites...</div>;
  if (invites.length === 0) return <div className="text-sm text-gray-500">No pending invites</div>;

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">Pending Invites</h3>
      <ul className="space-y-2">
        {invites.map((invite) => (
          <li key={invite.id} className="flex items-center justify-between p-2 border rounded text-sm">
            <div>
              <div className="font-medium">{invite.guest_email}</div>
              <div className="text-xs text-gray-500">
                Sent {new Date(invite.created_at).toLocaleDateString()}
              </div>
            </div>
            <form action={removeAction} className="m-0">
              <input type="hidden" name="invite_id" value={invite.id} />
              <button
                type="submit"
                className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
              >
                Cancel
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
