async function bytes(this: Blob | Request | Response): Promise<Uint8Array> {
  return new Uint8Array(await this.arrayBuffer())
}

for (const C of ['Blob', 'Request', 'Response']) {
  const p = (globalThis as any)[C]?.prototype
  if (p && !p.bytes) p.bytes = bytes
}
