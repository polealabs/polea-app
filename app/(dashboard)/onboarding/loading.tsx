import { Skeleton } from '@/components/ui/Skeleton'

export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <Skeleton className="h-9 w-28 mx-auto rounded-lg" />
          <Skeleton className="h-4 w-64 max-w-full mx-auto" />
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#1A1510]/8 p-8 space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <Skeleton className="h-11 w-full rounded-lg" />
        </div>
      </div>
    </div>
  )
}
