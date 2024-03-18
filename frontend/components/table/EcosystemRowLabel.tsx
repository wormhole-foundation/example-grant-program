import { Ecosystem } from '@components/Ecosystem'
import { getEcosystemTableLabel } from 'utils/getEcosystemTableLabel'

export function EcosystemRowLabel({ ecosystem }: { ecosystem: Ecosystem }) {
  return (
    <span className="pr-2 font-header text-base font-thin leading-none sm:text-base18">
      {getEcosystemTableLabel(ecosystem)}
    </span>
  )
}
