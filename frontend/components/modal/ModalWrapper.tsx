export function ModalWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed left-0 top-0 z-50 flex h-screen w-full bg-black bg-opacity-[35%]  ">
      <div className=" flex h-screen w-full items-start justify-center overflow-auto p-6 backdrop-blur-sm lg:items-center">
        {children}
      </div>
    </div>
  )
}
