export function FormError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
      {error}
    </div>
  );
}
