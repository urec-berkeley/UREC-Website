'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptInvite } from '@/app/(app)/directory/actions';

function CompleteContent() {
  const router = useRouter();
  const [state, setState] = useState<{ error?: string; done?: boolean }>({});

  useEffect(() => {
    async function run() {
      const token = sessionStorage.getItem('invite_token');
      if (!token) {
        setState({ error: 'No invite token found. Please use the original invite link.' });
        return;
      }

      const result = await acceptInvite(token);
      if (result.error) {
        setState({ error: result.error });
      } else {
        sessionStorage.removeItem('invite_token');
        setState({ done: true });
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    }
    run();
  }, [router]);

  if (state.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
          <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
            {state.error}
          </div>
          <p className="mt-4 text-sm text-gray-600">
            Contact the course administrator for a new invite.
          </p>
        </div>
      </div>
    );
  }

  if (state.done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
          <div className="rounded-md bg-green-50 p-4 text-sm font-medium text-green-700">
            Invite accepted! Redirecting to the dashboard…
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-600">Accepting your invite…</p>
      </div>
    </div>
  );
}

export default function CompletePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <CompleteContent />
    </Suspense>
  );
}
