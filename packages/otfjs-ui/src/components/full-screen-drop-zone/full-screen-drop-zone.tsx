import { useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { HasChildren } from '../../types/has-children'
import { preventDefault } from '../../utils/event'
import { readAndCacheFont } from '../../utils/fetch-font'

export function FullScreenDropZone({ children }: HasChildren) {
  const [dragover, setDragover] = useState(false)
  const enterCount = useRef(0)
  const navigate = useNavigate()

  return (
    <div
      className="relative h-full"
      onDragOver={preventDefault}
      onDragEnter={() => {
        ++enterCount.current
        setDragover(true)
      }}
      onDragLeave={() => {
        if (--enterCount.current === 0) setDragover(false)
      }}
      onDrop={(e) => {
        e.preventDefault()

        enterCount.current = 0
        setDragover(false)

        void e.dataTransfer.files[0]
          .bytes()
          .then(readAndCacheFont)
          .then((fontId) => navigate({ to: '/', state: { fontId } }))
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
