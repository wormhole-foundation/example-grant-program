import { Button } from '@components/buttons/Button'
import { ModalWrapper } from '@components/modal/ModalWrapper'
import Link from 'next/link'
import { useState } from 'react'
import { classNames } from 'utils/classNames'

type DisclaimerProps = {
  showModal?: boolean
  onAgree: () => void
}
export function Disclaimer({ onAgree, showModal }: DisclaimerProps) {
  const [agreed, setAgreed] = useState(false)
  return showModal ? (
    <ModalWrapper>
      <div className="relative  min-h-[480px] w-full max-w-[588px] border border-light-25 bg-black bg-opacity-50">
        <h3 className="disclaimer-title">
          {'Supplemental Token Airdrop Terms'}
        </h3>
        <div className="scrollbar flex max-h-[300px] flex-col gap-3 overflow-auto border-b border-light-25 px-6 py-5 font-body text-base font-light leading-5 tracking-widest md:px-10">
          <p>
            {`Welcome to the Supplemental Token Airdrop Terms (these “Airdrop Terms”) for the W token airdrop (the “Airdrop”) by Crossware Limited (“Organization”, “we” or “us”). These Airdrop Terms are supplemental to, and incorporate by reference, our general `}
            <Link href="https://wormhole.com/terms" target="_blank">
              <u>Terms of Service</u>
            </Link>
            {` (“General Terms”). Defined terms used but not defined herein have the meaning set forth in the General Terms. The Airdrop, and your participation in it, is a Service defined under the General Terms. These Airdrop Terms govern your ability to use our Services in order to participate in the Airdrop. Please read these Airdrop Terms carefully, as they include important information about your legal rights. By participating in the Airdrop or claiming Airdrop tokens, you are agreeing to these Airdrop Terms. If you do not understand or agree to these Airdrop Terms, please do not participate in the Airdrop.`}
          </p>
          <p>
            {`SECTION 7 OF THE GENERAL TERMS CONTAINS AN ARBITRATION CLAUSE AND CLASS ACTION WAIVER. PLEASE REVIEW SUCH CLAUSES CAREFULLY, SINCE IT AFFECTS YOUR RIGHTS. BY AGREEING TO THESE AIRDROP TERMS, YOU AGREE TO RESOLVE ALL DISPUTES RELATED TO THE AIRDROP THROUGH BINDING INDIVIDUAL ARBITRATION AND TO WAIVE YOUR RIGHT TO PARTICIPATE IN CLASS ACTIONS, CLASS ARBITRATIONS OR REPRESENTATIVE ACTIONS, AS SET FORTH IN THE GENERAL TERMS. YOU HAVE THE RIGHT TO OPT-OUT OF THE ARBITRATION CLAUSE AND THE CLASS ACTION WAIVER AS EXPLAINED IN SECTION 7 OF THE GENERAL TERMS.`}
          </p>
          <ol className="claim-ol">
            <li>
              You agree and acknowledge that you have the sole responsibility
              and liability for all taxes in connection with your participation
              in the Airdrop and you should consult a tax advisor.
            </li>
            <li>
              You agree and acknowledge that you are solely responsible for
              complying with all applicable laws of the jurisdiction you are
              located or participating in the Airdrop from.
            </li>
            <li>
              You agree and acknowledge that you (a) may receive tokens for free
              via the Airdrop (other than applicable taxes, if any), (b) were
              not previously promised any tokens, and (c) took no action in
              anticipation of or in reliance on receiving any tokens or an
              Airdrop.
            </li>
            <li>
              Your eligibility to receive Airdrop tokens or participate in the
              Airdrop is subject to our sole discretion. To the extent you
              believe you should have received any airdropped tokens based on
              any documentation or points system released by us from time to
              time, such documentation does not entitle you to any tokens or to
              participate in the Airdrop and therefore you have no claim for any
              such tokens.  You agree not to engage in any activities that are
              designed to obtain more Airdrop tokens than you are entitled to.
              You agree that you are the legal owner of the blockchain address
              that you use to access or participate in the Airdrop.
            </li>
            <li>
              You agree and acknowledge that you are not a Prohibited Person and
              you will not use a VPN or other tool to circumvent any geoblock or
              other restrictions that we may have implemented for Airdrop
              recipients. Any such circumvention, or attempted circumvention,
              may permanently disqualify you from participation in the Airdrop
              in our discretion.
            </li>
            <li>
              To participate in the Airdrop, you will need to connect a
              compatible third-party digital wallet (“Wallet”). By using a
              Wallet, you agree that you are using the Wallet under the terms
              and conditions of the applicable third-party provider of such
              Wallet. Wallets are not associated with, maintained by, supported
              by or affiliated with the Organization. When you interact with the
              Services, you retain control over your digital assets at all
              times. We accept no responsibility or liability to you in
              connection with your use of a Wallet, and we make no
              representations or warranties regarding how the Services will
              operate or be compatible with any specific Wallet.{' '}
              <strong>
                The private keys necessary to access the assets held in a Wallet
                are not held by the Organization. The Organization has no
                ability to help you access or recover your private keys and/or
                seed phrases for your Wallet. You are solely responsible for
                maintaining the confidentiality of your private keys and you are
                responsible for any transactions signed with your private keys
              </strong>
            </li>
            <li>
              You agree and acknowledge that if you are unable to claim an
              Airdrop due to technical bugs, smart contract issue, gas fees,
              wallet incompatibility, loss of access to a wallet or the keys
              thereto, or for any other reason, you will have no recourse or
              claim against us or our affiliates and that we and our affiliates
              will not bear any liability.
            </li>
            <li>
              You agree and acknowledge that claiming an Airdrop may require
              reliance on or an integration with third party products (e.g., a
              wallet or an unaffiliated network or blockchain) that we do not 
              control. In the event that you are unable to access such products
              or integrations, or if they fail for any reason, and you are
              unable to participate in an Airdrop or claim Airdrop tokens, you
              will have no recourse or claim against us or our affiliates and we
              and our affiliates will not bear any liability.
            </li>
            <li>
              You agree and acknowledge that the regulatory regime governing
              blockchain technologies, cryptocurrencies and other digital assets
              is uncertain, that new regulations or policies may materially
              adversely affect the potential utility or value of such
              cryptocurrencies and digital assets, and that there are risks of
              new taxation related to the purchase or sale of cryptocurrencies
              and other digital assets.
            </li>
            <li>
              You agree and acknowledge that cryptocurrencies and other similar
              digital assets are neither (i) deposits of or guaranteed by a bank
              nor (ii) insured by the FDIC or by any other governmental agency.
            </li>
          </ol>

          <p>
            These Airdrop Terms and the General Terms contain the entire
            agreement between you and the Organization regarding the Airdrop,
            and supersede all prior and contemporaneous understandings between
            the parties regarding the Airdrop. We may modify these Airdrop Terms
            from time to time in which case we will update the “Last Revised”
            date at the top of these Airdrop Terms. The updated Airdrop Terms
            will be effective as of the time of posting, or such later date as
            may be specified in the updated Airdrop Terms. Your continued access
            or participation in the Airdrop after the modifications have become
            effective will be deemed your acceptance of the modified Airdrop
            Terms.{' '}
          </p>
        </div>
        <div className="[&>button]:w-[200px] flex min-h-fit flex-col items-stretch gap-4 px-6 py-5 text-sm md:px-10">
          <div
            className="flex items-center justify-center gap-2 hover:cursor-pointer"
            onClick={() => setAgreed((agreed) => !agreed)}
          >
            <span
              className={classNames(
                'relative h-4 w-4 border',
                agreed
                  ? 'before:absolute before:left-1/2 before:top-1/2 before:h-2.5 before:w-2.5 before:-translate-x-1/2 before:-translate-y-1/2 before:bg-light'
                  : ''
              )}
            ></span>
            I have read, understand, and accept these terms.
          </div>
          <Button
            onClick={() => agreed && onAgree()}
            type={'primary'}
            disabled={!agreed}
          >
            <span className="w-[90%]">{'Agree and continue'}</span>
          </Button>
        </div>
      </div>
    </ModalWrapper>
  ) : (
    <></>
  )
}
