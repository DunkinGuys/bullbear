import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto py-24 text-center">
      <div className="text-6xl font-bold text-gray-700 mb-4">404</div>
      <h1 className="text-xl font-semibold mb-2">Page not found</h1>
      <p className="text-gray-500 mb-8">
        The page you requested does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-block px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 font-medium transition"
      >
        Go Home
      </Link>
    </div>
  );
}
