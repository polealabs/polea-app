import { Skeleton } from '@/components/ui/Skeleton'

type ModuleTableSkeletonProps = {
  maxWidthClass?: string
  rows?: number
  showToolbarButton?: boolean
}

export function ModuleTableSkeleton({
  maxWidthClass = 'max-w-6xl',
  rows = 8,
  showToolbarButton = true,
}: ModuleTableSkeletonProps) {
  return (
    <div className={`p-6 ${maxWidthClass} mx-auto`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44 sm:w-52" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
        {showToolbarButton ? <Skeleton className="h-10 w-36 rounded-lg shrink-0" /> : null}
      </div>
      <div className="bg-white rounded-2xl border border-[#1A1510]/8 shadow-sm overflow-hidden">
        <div className="h-12 bg-[#FAF6F0] border-b border-[#1A1510]/8 flex items-center px-5 gap-6">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-20 hidden sm:block" />
          <Skeleton className="h-3 w-14 hidden md:block" />
          <Skeleton className="h-3 w-12 ml-auto hidden sm:block" />
        </div>
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className={`flex flex-wrap items-center gap-4 px-5 py-4 ${
              i < rows - 1 ? 'border-b border-[#1A1510]/5' : ''
            }`}
          >
            <Skeleton className="h-4 flex-1 min-w-[120px]" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24 hidden sm:block" />
            <Skeleton className="h-4 w-16 hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  )
}
