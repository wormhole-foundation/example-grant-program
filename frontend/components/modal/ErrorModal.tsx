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
            include your transaction. Please try again in a few minutes
          </p>
        </div>
        <div className="bg-black bg-opacity-50 px-10 py-8">
          <Button
            type={'primary'}
            onClick={() => {
              showModal(false)
            }}
          >
            <span className="flex  items-center gap-2">
              Try again
              <svg
                width={13}
                height={9}
                viewBox="0 0 13 9"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8.13445 8.97557L13 4.4995L8.13445 0.0234376L7.11722 0.959101L10.2404 3.83123L4.43299e-08 3.83123L5.98891e-08 5.16772L10.2404 5.16772L7.11722 8.03985L8.13445 8.97557Z"
                  fill="currentColor"
                />
              </svg>
            </span>
          </Button>
        </div>
      </div>
    </ModalWrapper>
  )
}
