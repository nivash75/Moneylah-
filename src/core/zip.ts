const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** A ZIP archive with the files stored uncompressed, which is all a spreadsheet needs. */
export function zip(files: { name: string; text: string }[]): Uint8Array {
  const encoder = new TextEncoder();
  const body: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;

  /** Little-endian fields, as [byte width, value]. */
  const record = (fields: [2 | 4, number][], ...tail: Uint8Array[]) => {
    const head = fields.reduce((n, [width]) => n + width, 0);
    const out = new Uint8Array(tail.reduce((n, part) => n + part.length, head));
    const view = new DataView(out.buffer);
    let at = 0;
    for (const [width, value] of fields) {
      if (width === 2) view.setUint16(at, value, true);
      else view.setUint32(at, value, true);
      at += width;
    }
    for (const part of tail) { out.set(part, at); at += part.length; }
    return out;
  };

  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = encoder.encode(file.text);
    // Version 2.0, UTF-8 names, stored, dated 1 January 1980.
    const shared: [2 | 4, number][] = [[2, 20], [2, 0x0800], [2, 0], [2, 0], [2, 0x21], [4, crc32(data)], [4, data.length], [4, data.length], [2, name.length], [2, 0]];
    const local = record([[4, 0x04034b50], ...shared], name, data);
    directory.push(record([[4, 0x02014b50], [2, 20], ...shared, [2, 0], [2, 0], [2, 0], [4, 0], [4, offset]], name));
    body.push(local);
    offset += local.length;
  }
  const size = directory.reduce((n, part) => n + part.length, 0);
  const end = record([[4, 0x06054b50], [2, 0], [2, 0], [2, files.length], [2, files.length], [4, size], [4, offset], [2, 0]]);

  const parts = [...body, ...directory, end];
  const out = new Uint8Array(parts.reduce((n, part) => n + part.length, 0));
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}
