import { useRef, useState } from 'react'

import { preventDefault } from '../../utils/event'

export interface FullScreenDropZoneProps {
  onLoad(buffer: ArrayBuffer): void
  children: React.ReactNode
}

export function FullScreenDropZone({
  onLoad,
  children,
}: FullScreenDropZoneProps) {
  const [dragover, setDragover] = useState(false)
  const enterCount = useRef(0)

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
        enterCount.current = 0
        setDragover(false)

        e.preventDefault()
        e.dataTransfer.files[0].arrayBuffer().then(onLoad)
      }}
    >
      {children}
      {dragover && (
        <div className="absolute bottom-0 left-0 right-0 top-0 grid place-content-center bg-black bg-opacity-50">
          <div className="rounded-2xl border-2 border-dashed bg-slate-700 p-16">
            Load font
          </div>
        </div>
      )}
    </div>
  )
}
