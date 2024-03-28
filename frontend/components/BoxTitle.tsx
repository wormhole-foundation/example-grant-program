import { ReactNode } from 'react'

export function BoxTitle({ children }: { children: ReactNode }) {
  return (
    <h4 className="border-b border-light border-opacity-25 bg-dark bg-opacity-30 px-4 py-8 font-header  text-[28px] font-light leading-[1.2] sm:px-10">
      {children}
    </h4>
  )
}
