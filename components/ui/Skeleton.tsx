type SkeletonProps = {
  className?: string
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-md bg-[#1A1510]/[0.08] ${className}`.trim()}
      aria-hidden
    />
  )
}
