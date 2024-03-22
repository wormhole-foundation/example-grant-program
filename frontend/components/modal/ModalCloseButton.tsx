import Close from '@images/close.inline.svg'

// It places itself relative to the parent
// Parent should have the style  position:relative/absolute
export function ModalCloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className="text-white: absolute right-0 top-0 flex h-[50px] w-[50px] items-center justify-center border-b border-l border-light-25 bg-black hover:bg-white hover:text-black"
      onClick={onClick}
    >
      <Close />
    </button>
  )
}
