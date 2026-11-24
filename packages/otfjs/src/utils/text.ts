// Encoders and decoders are stateless when used without `stream`, so share
// one of each rather than creating them on every call. `@__PURE__` lets
// bundlers drop the ones a bundle doesn't use.

export const utf8Encoder = /* @__PURE__ */ new TextEncoder()
export const utf8Decoder = /* @__PURE__ */ new TextDecoder()
export const utf16beDecoder = /* @__PURE__ */ new TextDecoder('utf-16be')
