import type { UpdateSnapshot } from '../../../shared/update'
import { shouldShowReadyToInstall } from '../../../shared/update'

export function shouldShowUpdateButton(snapshot: UpdateSnapshot, installing: boolean): boolean {
  return installing || shouldShowReadyToInstall(snapshot)
}
