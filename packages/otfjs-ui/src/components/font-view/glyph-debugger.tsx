import { useMemo, useState } from 'react'
import type { Font } from 'otfjs'
import { GlyphEnriched, glyphToSvgPath, VirtualMachine } from 'otfjs'

export interface GlyphDebuggerProps {
  glyph: GlyphEnriched
  font: Font
  upem: number
}

export function GlyphDebugger({ glyph, font, upem }: GlyphDebuggerProps) {
  const [fontSize, setFontSize] = useState(16)
  const [showHinted, setShowHinted] = useState(true)
  const [showOriginal, setShowOriginal] = useState(true)

  const vm = useMemo(() => {
    const vm = new VirtualMachine(font)
    vm.setFontSize(fontSize)
    vm.runFpgm()
    vm.runPrep()
    vm.setGlyph(glyph)
    vm.runGlyph()
    return vm
  }, [font, glyph, fontSize])

  const hintedGlyph = useMemo(() => vm.getGlyph(), [vm])

  const width = Math.max(glyph.advanceWidth || glyph.xMax - glyph.xMin, upem)
  const height = upem

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2">
          <span>Font Size:</span>
          <input
            type="range"
            min="8"
            max="72"
            value={fontSize}
            onChange={(e) => setFontSize(+e.target.value)}
            className="w-32"
          />
          <span className="w-12 text-right">{fontSize}px</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showOriginal}
            onChange={(e) => setShowOriginal(e.target.checked)}
          />
          <span>Show Original</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showHinted}
            onChange={(e) => setShowHinted(e.target.checked)}
          />
          <span>Show Hinted</span>
        </label>
      </div>

      <div className="flex flex-1 gap-4 overflow-auto">
        <div className="flex-1 min-w-0">
          <h3 className="mb-2 text-lg font-semibold">Glyph Comparison</h3>
          <div className="flex gap-4">
            {showOriginal && (
              <div className="flex-1">
                <h4 className="mb-2 text-sm text-gray-400">Original</h4>
                <svg
                  className="w-full border border-gray-700 bg-gray-900"
                  viewBox={`0 0 ${width} ${height}`}
                  style={{ height: '300px' }}
                >
                  <g transform={`matrix(1 0 0 -1 0 ${height})`}>
                    <path
                      d={glyphToSvgPath(glyph)}
                      stroke="var(--color-icon)"
                      strokeWidth={upem / 200}
                      fill="none"
                    />
                    {glyph.points.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={p.onCurve ? upem / 100 : upem / 150}
                        fill={p.onCurve ? 'var(--color-icon)' : 'none'}
                        strokeWidth={upem / 200}
                        stroke={p.onCurve ? undefined : 'var(--color-icon)'}
                      />
                    ))}
                  </g>
                </svg>
              </div>
            )}
            {showHinted && (
              <div className="flex-1">
                <h4 className="mb-2 text-sm text-gray-400">
                  Hinted ({fontSize}px)
                </h4>
                <svg
                  className="w-full border border-gray-700 bg-gray-900"
                  viewBox={`0 0 ${width} ${height}`}
                  style={{ height: '300px' }}
                >
                  <g transform={`matrix(1 0 0 -1 0 ${height})`}>
                    <path
                      d={glyphToSvgPath(hintedGlyph)}
                      stroke="lime"
                      strokeWidth={upem / 200}
                      fill="none"
                    />
                    {hintedGlyph.points.map((p, i) => (
                      <circle
                        key={i}
                        cx={p.x}
                        cy={p.y}
                        r={p.onCurve ? upem / 100 : upem / 150}
                        fill={p.onCurve ? 'lime' : 'none'}
                        strokeWidth={upem / 200}
                        stroke={p.onCurve ? undefined : 'lime'}
                      />
                    ))}
                  </g>
                </svg>
              </div>
            )}
          </div>
        </div>

        <div className="w-96 flex-shrink-0 overflow-auto">
          <h3 className="mb-2 text-lg font-semibold">Virtual Machine State</h3>
          <div className="space-y-4 text-sm">
            <div>
              <h4 className="mb-1 font-semibold text-gray-400">Graphics State</h4>
              <div className="space-y-1 rounded bg-gray-900 p-2 font-mono text-xs">
                <div>
                  Projection Vector: ({vm.gs.projectionVector.x.toFixed(3)},{' '}
                  {vm.gs.projectionVector.y.toFixed(3)})
                </div>
                <div>
                  Freedom Vector: ({vm.gs.freedomVector.x.toFixed(3)},{' '}
                  {vm.gs.freedomVector.y.toFixed(3)})
                </div>
                <div>Round State: {vm.gs.roundState}</div>
                <div>Auto Flip: {vm.gs.autoFlip ? 'Yes' : 'No'}</div>
                <div>Loop: {vm.gs.loop}</div>
                <div>Min Distance: {vm.gs.minimumDistance}</div>
              </div>
            </div>

            <div>
              <h4 className="mb-1 font-semibold text-gray-400">Reference Points</h4>
              <div className="space-y-1 rounded bg-gray-900 p-2 font-mono text-xs">
                <div>rp0: {vm.gs.rp0}</div>
                <div>rp1: {vm.gs.rp1}</div>
                <div>rp2: {vm.gs.rp2}</div>
              </div>
            </div>

            <div>
              <h4 className="mb-1 font-semibold text-gray-400">Zone Pointers</h4>
              <div className="space-y-1 rounded bg-gray-900 p-2 font-mono text-xs">
                <div>zp0: {vm.gs.zp0}</div>
                <div>zp1: {vm.gs.zp1}</div>
                <div>zp2: {vm.gs.zp2}</div>
              </div>
            </div>

            <div>
              <h4 className="mb-1 font-semibold text-gray-400">Stack</h4>
              <div className="rounded bg-gray-900 p-2 font-mono text-xs">
                {vm.stack.depth() === 0 ? (
                  <div className="text-gray-500">Empty</div>
                ) : (
                  <div className="max-h-40 overflow-auto">
                    {Array.from({ length: vm.stack.depth() }, (_, i) => {
                      const idx = vm.stack.depth() - 1 - i
                      return (
                        <div key={i}>
                          [{idx}]: {vm.stack.at(idx)}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="mb-1 font-semibold text-gray-400">CVT Table</h4>
              <div className="rounded bg-gray-900 p-2 font-mono text-xs">
                <div className="max-h-40 overflow-auto">
                  {vm.cvt.length === 0 ? (
                    <div className="text-gray-500">Empty</div>
                  ) : (
                    vm.cvt.slice(0, 20).map((value, i) => (
                      <div key={i}>
                        [{i}]: {value}
                      </div>
                    ))
                  )}
                  {vm.cvt.length > 20 && (
                    <div className="text-gray-500">
                      ... and {vm.cvt.length - 20} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
