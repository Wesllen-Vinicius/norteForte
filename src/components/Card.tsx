// src/components/Card.tsx
type CardProps = {
  title: string
  value: string | number
  icon?: React.ReactNode
}

export default function Card({ title, value, icon }: CardProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-md p-4 shadow-sm hover:shadow-md transition-shadow
                    dark:bg-neutral-900 dark:border-neutral-800">
      <div className="flex items-center justify-between text-sm text-neutral-600 mb-1
                      dark:text-neutral-400">
        {title}
        {icon && <span className="text-base text-neutral-800 dark:text-white">{icon}</span>}
      </div>
      <div className="text-2xl font-semibold text-neutral-800 dark:text-white">{value}</div>
    </div>
  )
}
