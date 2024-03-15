import { ReactNode } from 'react'

export function Title({ children }: { children: ReactNode }) {
  return (
    <h4 className="border-b border-light border-opacity-25 bg-dark bg-opacity-30 py-8 px-4 font-header  text-[28px] font-light leading-[1.2] sm:px-10">
      {children}
    </h4>
  )
}
