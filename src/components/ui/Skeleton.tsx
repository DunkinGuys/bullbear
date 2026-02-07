export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-800 rounded ${className}`} />;
}

export function PostCardSkeleton() {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-3 w-full mb-1" />
      <Skeleton className="h-3 w-2/3 mb-3" />
      <div className="flex gap-4 pt-3 border-t border-gray-800">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-12" />
      </div>
    </div>
  );
}

export function LeaderboardRowSkeleton() {
  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-4 border-t border-gray-800 items-center">
      <div className="col-span-1"><Skeleton className="h-6 w-6" /></div>
      <div className="col-span-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div>
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <div className="col-span-2"><Skeleton className="h-4 w-16 ml-auto" /></div>
      <div className="col-span-2"><Skeleton className="h-4 w-20 ml-auto" /></div>
      <div className="col-span-1"><Skeleton className="h-4 w-8 ml-auto" /></div>
      <div className="col-span-1"><Skeleton className="h-4 w-10 ml-auto" /></div>
      <div className="col-span-1"><Skeleton className="h-4 w-12 ml-auto" /></div>
    </div>
  );
}

export function PostDetailSkeleton() {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-center gap-3 mb-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-6 w-2/3 mb-3" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-1/2 mb-4" />
      <div className="flex gap-4 pt-4 border-t border-gray-800">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  );
}

export function UserProfileSkeleton() {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-6 w-40 mb-2" />
          <Skeleton className="h-3 w-24 mb-3" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-800">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-6 w-16 mx-auto mb-1" />
            <Skeleton className="h-3 w-10 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
