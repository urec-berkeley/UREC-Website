'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { acceptInvite } from '@/app/(app)/directory/actions';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = useState<{ error?: string; success?: boolean }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function handleAccept() {
      if (!token) {
        setState({ error: 'No invite token provided' });
        setLoading(false);
        return;
      }

      const result = await acceptInvite(token);
      if (result.error) {
        setState({ error: result.error });
      } else {
        setState({ success: true });
      }
      setLoading(false);
    }

    handleAccept();
  }, [token]);

  if (loading) {
    return <div className="p-8 text-center">Validating invite...</div>;
  }

  if (state.error) {
    return (
      <div className="max-w-md mx-auto p-8">
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          {state.error}
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Please contact the course administrator for a new invite.
        </p>
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="max-w-md mx-auto p-8">
        <div className="p-4 bg-green-50 text-green-700 rounded-lg">
          ✓ Invite accepted! Redirecting to signup...
        </div>
      </div>
    );
  }

  return null;
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
