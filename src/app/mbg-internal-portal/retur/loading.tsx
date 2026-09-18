export default function Loading() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="h-8 w-48 bg-slate-200 animate-pulse rounded-lg mb-2"></div>
          <div className="h-4 w-64 bg-slate-200 animate-pulse rounded-lg"></div>
        </div>
        <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-xl"></div>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex gap-4">
          <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-xl"></div>
          <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-xl"></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-10 bg-slate-200 animate-pulse rounded-xl"></div>
          <div className="h-10 bg-slate-200 animate-pulse rounded-xl"></div>
          <div className="h-10 bg-slate-200 animate-pulse rounded-xl"></div>
          <div className="h-10 bg-slate-200 animate-pulse rounded-xl"></div>
        </div>

        <div className="hidden md:block mt-6 border-t pt-4">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 w-full bg-slate-100 animate-pulse rounded-xl"></div>
            ))}
          </div>
        </div>
        
        <div className="md:hidden space-y-4 mt-6 border-t pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 w-full bg-slate-100 animate-pulse rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
