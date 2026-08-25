'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (token) {
      sessionStorage.setItem('invite_token', token);
    }
  }, [token]);

  async function handleSignIn() {
    setPending(true);
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/accept-invite/complete`,
      },
    });
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">Invalid Invite</h1>
          <p className="mt-2 text-sm text-gray-600">
            No invite token was provided. Please check the link you received.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">
          You&rsquo;ve been invited to UREC
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Sign in with Google to accept your course invitation.
        </p>
        <button
          onClick={handleSignIn}
          disabled={pending}
          className="mt-6 w-full rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-60"
        >
          {pending ? 'Redirecting to Google…' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <AcceptInviteContent />
    </Suspense>
  );
}
