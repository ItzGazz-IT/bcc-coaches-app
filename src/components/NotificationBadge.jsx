function NotificationBadge({ count }) {
  if (!count || count === 0) return null

  return (
    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg border-2 border-white dark:border-gray-800">
      {count > 99 ? '99+' : count}
    </div>
  )
}

export default NotificationBadge
