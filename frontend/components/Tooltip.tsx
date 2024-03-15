import Tippy from '@tippyjs/react'
import React, { ReactNode } from 'react'
import 'tippy.js/animations/scale.css'

type TooltipProps = {
  content: ReactNode
  placement?: any
  className?: string
  children?: ReactNode
  contentClassName?: string
}

const Tooltip = ({
  children,
  content,
  className,
  placement = 'top',
}: TooltipProps) => {
  return content ? (
    <Tippy
      animation="scale"
      placement={placement}
      appendTo={() => document.body}
      maxWidth="15rem"
      interactive
      hideOnClick={false}
      content={
        <div
          className={` border border-white border-opacity-25 bg-black bg-opacity-80 p-3 text-xs leading-snug text-white shadow-md ${className}`}
        >
          {content}
        </div>
      }
    >
      <div>{children}</div>
    </Tippy>
  ) : (
    <>{children}</>
  )
}

export default Tooltip
