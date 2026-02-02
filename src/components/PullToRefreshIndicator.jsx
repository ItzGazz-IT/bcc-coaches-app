import { Loader2 } from "lucide-react"

export default function PullToRefreshIndicator({ isPulling, pullDistance }) {
  const threshold = 80
  const isRefreshing = isPulling && pullDistance >= threshold
  const progress = Math.min((pullDistance / threshold) * 100, 100)

  if (!isPulling && pullDistance === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 transition-all duration-200"
      style={{
        transform: `translateY(${Math.min(pullDistance - 50, 50)}px)`,
        opacity: pullDistance / threshold
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg border-2 border-primary dark:border-accent">
        {isRefreshing ? (
          <Loader2 className="w-6 h-6 text-primary dark:text-accent animate-spin" />
        ) : (
          <div className="relative w-6 h-6">
            <svg className="transform -rotate-90" width="24" height="24">
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 10}`}
                strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress / 100)}`}
                className="text-primary dark:text-accent transition-all"
              />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
