import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto py-24 text-center">
      <div className="text-6xl font-bold text-gray-700 mb-4">404</div>
      <h1 className="text-xl font-semibold mb-2">페이지를 찾을 수 없습니다</h1>
      <p className="text-gray-500 mb-8">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>
      <Link
        href="/"
        className="inline-block px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 font-medium transition"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
