import { ReactNode } from 'react'

export function Box({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-fit  overflow-auto border border-light border-opacity-25 bg-black bg-opacity-[35%]">
      {children}
    </div>
  )
}
