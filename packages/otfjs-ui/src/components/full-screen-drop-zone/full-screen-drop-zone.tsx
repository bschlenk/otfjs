import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { NotAFontError } from 'otfjs'

import { HasChildren } from '../../types/has-children'
import { readAndCacheFont } from '../../utils/fetch-font'

export function FullScreenDropZone({ children }: HasChildren) {
  const [dragover, setDragover] = useState(false)
  const enterCount = useRef(0)
  const navigate = useNavigate()

  return (
    <div
      className="relative h-full"
      onDragEnter={(e) => {
        if (enterCount.current++ !== 0) return
        setDragover(mightBeFontDrag(e.dataTransfer))
      }}
      onDragLeave={() => {
        if (--enterCount.current === 0) setDragover(false)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = dragover ? 'copy' : 'none'
      }}
      onDrop={(e) => {
        e.preventDefault()

        enterCount.current = 0
        setDragover(false)

        const file = e.dataTransfer.files[0]
        if (!file) {
          console.warn('No file dropped')
          return
        }

        void file
          .bytes()
          .then(readAndCacheFont)
          .then((fontId) => navigate({ to: '/', state: { fontId } }))
          .catch((err: unknown) => {
            // Rethrow parse errors in real fonts so they surface for debugging.
            if (!(err instanceof NotAFontError)) throw err
            console.error(`${file.name} is not a font file`)
          })
      }}
    >
      {children}
      {dragover && (
        <div className="bg-opacity-50 absolute top-0 right-0 bottom-0 left-0 grid place-content-center bg-black">
          <div className="rounded-2xl border-2 border-dashed bg-slate-700 p-16">
            Load font
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Checks whether a drag might be carrying a font file. During a drag, browsers
 * only expose each item's kind and MIME type, not its name or contents. Font
 * MIME types vary by OS and browser and are often empty, so an empty or generic
 * type counts as a possible font. Only drags that are clearly not fonts (text,
 * links, images, etc.) return false.
 */
function mightBeFontDrag(dataTransfer: DataTransfer) {
  const items = Array.from(dataTransfer.items)
  return items.some((item) => item.kind === 'file' && isFontLikeType(item.type))
}

function isFontLikeType(type: string) {
  return (
    type === '' ||
    type === 'application/octet-stream' ||
    type === 'application/vnd.ms-opentype' ||
    // Covers font/*, application/font-woff, application/x-font-ttf, etc.
    type.includes('font')
  )
}
