/**
 * Minimal ZIP file creator — no external dependencies.
 * Produces a valid ZIP archive with stored (uncompressed) files.
 */

export class SimpleZip {
  private files: { name: string; data: Uint8Array }[] = []

  addFile(name: string, data: Uint8Array | string) {
    const bytes = typeof data === 'string'
      ? new TextEncoder().encode(data)
      : data
    this.files.push({ name, data: bytes })
  }

  generate(): Blob {
    const localHeaders: Uint8Array[] = []
    const centralHeaders: Uint8Array[] = []
    let offset = 0

    for (const file of this.files) {
      const nameBytes = new TextEncoder().encode(file.name)

      // Local file header
      const localHeader = new Uint8Array(30 + nameBytes.length)
      const localView = new DataView(localHeader.buffer)

      localView.setUint32(0, 0x04034b50, true)
      localView.setUint16(4, 20, true)
      localView.setUint16(6, 0, true)
      localView.setUint16(8, 0, true)
      localView.setUint16(10, 0, true)
      localView.setUint16(12, 0, true)
      localView.setUint32(14, this.crc32(file.data), true)
      localView.setUint32(18, file.data.length, true)
      localView.setUint32(22, file.data.length, true)
      localView.setUint16(26, nameBytes.length, true)
      localView.setUint16(28, 0, true)
      localHeader.set(nameBytes, 30)

      localHeaders.push(localHeader)
      localHeaders.push(file.data)

      // Central directory header
      const centralHeader = new Uint8Array(46 + nameBytes.length)
      const centralView = new DataView(centralHeader.buffer)

      centralView.setUint32(0, 0x02014b50, true)
      centralView.setUint16(4, 20, true)
      centralView.setUint16(6, 20, true)
      centralView.setUint16(8, 0, true)
      centralView.setUint16(10, 0, true)
      centralView.setUint16(12, 0, true)
      centralView.setUint16(14, 0, true)
      centralView.setUint32(16, this.crc32(file.data), true)
      centralView.setUint32(20, file.data.length, true)
      centralView.setUint32(24, file.data.length, true)
      centralView.setUint16(28, nameBytes.length, true)
      centralView.setUint16(30, 0, true)
      centralView.setUint16(32, 0, true)
      centralView.setUint16(34, 0, true)
      centralView.setUint16(36, 0, true)
      centralView.setUint32(38, 0, true)
      centralView.setUint32(42, offset, true)
      centralHeader.set(nameBytes, 46)

      centralHeaders.push(centralHeader)
      offset += localHeader.length + file.data.length
    }

    // End of central directory
    const centralDirSize = centralHeaders.reduce((sum, h) => sum + h.length, 0)
    const endRecord = new Uint8Array(22)
    const endView = new DataView(endRecord.buffer)

    endView.setUint32(0, 0x06054b50, true)
    endView.setUint16(4, 0, true)
    endView.setUint16(6, 0, true)
    endView.setUint16(8, this.files.length, true)
    endView.setUint16(10, this.files.length, true)
    endView.setUint32(12, centralDirSize, true)
    endView.setUint32(16, offset, true)
    endView.setUint16(20, 0, true)

    const allParts = [...localHeaders, ...centralHeaders, endRecord]
    return new Blob(allParts as BlobPart[], { type: 'application/zip' })
  }

  private crc32(data: Uint8Array): number {
    let crc = 0xFFFFFFFF
    const table = this.getCrcTable()
    for (let i = 0; i < data.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xFF]
    }
    return (crc ^ 0xFFFFFFFF) >>> 0
  }

  private getCrcTable(): Uint32Array {
    const table = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
      }
      table[i] = c
    }
    return table
  }
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1]
  const binary = atob(base64)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i)
  }
  return array
}
