import { Skeleton } from '@/components/ui/Skeleton'

export function DashboardHomeSkeleton() {
  return (
    <div className="w-full p-6 md:p-8 xl:p-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-9">
        <div className="space-y-3 min-w-0 flex-1">
          <Skeleton className="h-10 w-full max-w-[min(100%,340px)]" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="flex gap-2.5 shrink-0">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white rounded-2xl border border-border-warm p-5 shadow-sm relative overflow-hidden"
          >
            <Skeleton className="h-3 w-24 mb-3" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-border-warm p-6 shadow-sm">
            <div className="flex justify-between mb-5">
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-7 w-36" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-stretch gap-2 min-h-[104px]">
              {Array.from({ length: 7 }, (_, j) => (
                <div key={j} className="flex-1 flex flex-col justify-end items-center gap-2">
                  <Skeleton className="w-full max-w-[40px] h-12 rounded-t-md" />
                  <Skeleton className="h-2.5 w-8" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-border-warm shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border-warm">
              <Skeleton className="h-4 w-32" />
            </div>
            {Array.from({ length: 4 }, (_, k) => (
              <div key={k} className="px-6 py-4 border-b border-border-warm/70 last:border-b-0">
                <Skeleton className="h-4 w-full max-w-lg" />
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-border-warm p-5 shadow-sm space-y-3">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
          <div className="bg-white rounded-2xl border border-border-warm p-5 shadow-sm space-y-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
