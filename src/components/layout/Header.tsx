import Link from 'next/link';

export function Header() {
  return (
    <header className="w-full border-b border-gray-800 bg-gray-950">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        <Link href="/" className="text-lg font-semibold text-white">
          BullBear
        </Link>
        <span className="ml-3 rounded border border-gray-800 px-2 py-1 text-xs text-gray-500">
          Closed
        </span>
      </div>
    </header>
  );
}
