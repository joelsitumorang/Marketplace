export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl sm:rounded-2xl overflow-hidden flex flex-col border border-[#E4E4DE] text-left w-full"
        >
          <div className="relative aspect-[4/3] w-full bg-[#E4E4DE]" />
          <div className="p-2.5 sm:p-4 flex flex-col flex-grow space-y-2.5">
            <div className="h-2.5 bg-[#E4E4DE] rounded w-1/3" />
            <div className="h-4 bg-[#E4E4DE] rounded w-4/5" />
            <div className="mt-auto pt-3 space-y-2">
              <div className="h-5 bg-[#E4E4DE] rounded w-1/2" />
              <div className="h-2.5 bg-[#E4E4DE] rounded w-2/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
