import { ReactNode } from 'react'
import { classNames } from 'utils/classNames'

export type ButtonProps = {
  onClick: () => void
  type: 'primary' | 'secondary' | 'tertiary'
  disabled?: boolean
  children: ReactNode
}

export function Button({ onClick, type, disabled, children }: ButtonProps) {
  const className =
    type === 'primary'
      ? 'wbtn'
      : type === 'secondary'
      ? 'wbtn wbtn-secondary '
      : 'hover:cursor-pointer '

  return (
    <button
      className={`${className} flex items-center justify-center disabled:cursor-not-allowed disabled:opacity-40`}
      onClick={onClick}
      disabled={disabled}
    >
      <span
        className={
          'relative inline-flex items-center gap-2.5 whitespace-nowrap'
        }
      >
        {children}
      </span>
    </button>
  )
}
