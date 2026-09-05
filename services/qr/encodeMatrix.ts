import qrcode from 'qrcode-generator'
import type { QrMatrix } from '~/domain/qr/models'

/** The dependency owns encoding only; EventScope owns every rendered pixel. */
export function encodeQrMatrix(value: string): QrMatrix {
  const code = qrcode(0, 'H')
  code.addData(value, 'Byte')
  code.make()
  const size = code.getModuleCount()
  const modules = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, column) => code.isDark(row, column))
  )
  return { size, modules }
}
