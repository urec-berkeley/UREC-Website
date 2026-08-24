'use client';

import { useState } from 'react';
import { useActionState } from 'react';
import { createInvite } from './actions';
import { FormError } from '@/app/(app)/components/form-error';

interface InviteFormProps {
  courseId: string;
}

export function InviteForm({ courseId }: InviteFormProps) {
  const [state, action] = useActionState(createInvite, {});

  return (
    <form action={action} className="border-t border-t-gray-200 rounded-lg p-4">
      <FormError error={state?.error} />
      
      <div className="mb-4">
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Guest Email
        </label>
        <input
          type="email"
          name="guest_email"
          placeholder="guest@example.com"
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
        />
      </div>

      <input type="hidden" name="course_id" value={courseId} />

      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
      >
        Send Invite
      </button>
    </form>
  );
}
