import { NameId, PlatformId } from '../enums.js'
import type { FontHandle } from '../font-handle.js'

export function getName(
  font: FontHandle,
  nameId: NameId,
  platformId: PlatformId = PlatformId.Windows,
): string | null {
  const name = font.getTable('name')
  const record = name.nameRecords.find(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-enum-comparison
    (r) => r.platformId === platformId && r.nameId === nameId,
  )
  return record?.value ?? null
}
