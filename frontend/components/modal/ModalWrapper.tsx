export function ModalWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed left-0 top-0 z-50 flex h-[100vh] w-full items-center justify-center p-6 before:absolute before:inset-0 before:bg-black before:bg-opacity-[35%] before:backdrop-blur-sm">
      {children}
    </div>
  )
}
