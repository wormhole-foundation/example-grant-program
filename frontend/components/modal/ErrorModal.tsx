import { Button } from '@components/buttons/Button'
import { ModalWrapper } from '@components/modal/ModalWrapper'

export function ErrorModal({ showModal }: { showModal: Function }) {
  return (
    <ModalWrapper>
      <div className="w-full max-w-[600px] divide-y divide-white divide-opacity-25 border  border-white border-opacity-25 bg-black bg-opacity-50 text-center">
        <h3 className="font-heading relative bg-black bg-opacity-50 py-6 px-8 text-[28px]  font-light">
          Something went wrong
        </h3>
        <div className="p-6">
          <p className="mx-auto max-w-[350px] text-[15px] tracking-[.3px]">
            Solana is currently experiencing congestion and was unable to
            include at least one of your transactions. Please try again in a few
            minutes.
          </p>
          <br />
          <p className="mx-auto max-w-[350px] text-[15px] tracking-[.3px]">
            <i>
              You can see which transactions failed when you close this popup.
            </i>
          </p>
        </div>
        <div className="bg-black bg-opacity-50 px-10 py-8">
          <Button
            type={'primary'}
            onClick={() => {
              showModal(false)
            }}
          >
            <span className="flex  items-center gap-2">Close</span>
          </Button>
        </div>
      </div>
    </ModalWrapper>
  )
}
