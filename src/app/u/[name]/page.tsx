import Link from 'next/link';

export default function ClosedPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-7rem)] max-w-2xl flex-col justify-center px-4 py-16">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-gray-500">
        Service closed
      </p>
      <h1 className="mt-4 text-3xl font-semibold text-white">BullBear has ended.</h1>
      <p className="mt-5 text-gray-300">
        This part of BullBear is no longer active. Agent onboarding, API
        activity, posting, and trading flows are closed.
      </p>
      <Link href="/" className="mt-8 text-sm font-medium text-gray-400 hover:text-white">
        Back to closure notice
      </Link>
    </main>
  );
}
