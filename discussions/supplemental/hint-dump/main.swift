// HintDump: runs the Apple TrueType interpreter on a font glyph and prints
// the hinted point coordinates as JSON, for use as test fixtures.
//
// Usage: swift run HintDump <font.ttf> <glyphIndex> <pointSize>

import Foundation
import SwiftTrueTypeInterpreter

// MARK: - Argument parsing

let args = CommandLine.arguments
guard args.count >= 4,
      let glyphIndex = Int(args[2]),
      let pointSize = Int32(args[3])
else {
  fputs("Usage: HintDump <font.ttf> <glyphIndex> <pointSize>\n", stderr)
  exit(1)
}
let fontPath = args[1]

// MARK: - Byte reader (self-contained copy)

struct ByteReader {
  let bytes: [UInt8]
  var offset: Int = 0
  mutating func u8() -> UInt8  { let v = bytes[offset]; offset += 1; return v }
  mutating func i8() -> Int8   { Int8(bitPattern: u8()) }
  mutating func u16() -> UInt16 {
    let v = (UInt16(bytes[offset]) << 8) | UInt16(bytes[offset+1]); offset += 2; return v
  }
  mutating func i16() -> Int16 { Int16(bitPattern: u16()) }
  mutating func u32() -> UInt32 {
    let v = (UInt32(bytes[offset]) << 24) | (UInt32(bytes[offset+1]) << 16)
          | (UInt32(bytes[offset+2]) << 8) | UInt32(bytes[offset+3])
    offset += 4; return v
  }
  mutating func i32() -> Int32 { Int32(bitPattern: u32()) }
  mutating func skip(_ n: Int) { offset += n }
}

// MARK: - Table reading via CoreText

import CoreText

func loadTables(from path: String) -> (
  head: (upem: Int16, locaFmt: Int16),
  maxp: sfntMaxProfileTable,
  hhea: UInt16,
  cvt: [Int16],
  fpgm: [UInt8],
  prep: [UInt8],
  glyf: [UInt8],
  loca: [UInt32],
  hmtx: [(aw: UInt16, lsb: Int16)]
) {
  let url = URL(fileURLWithPath: path) as CFURL
  guard let descs = CTFontManagerCreateFontDescriptorsFromURL(url) as? [CTFontDescriptor],
        let desc = descs.first
  else { fatalError("Cannot load font at \(path)") }
  let font = CTFontCreateWithFontDescriptor(desc, 12, nil)

  func tableBytes(_ tag: CTFontTableTag) -> [UInt8] {
    guard let data = CTFontCopyTable(font, tag, []) else { return [] }
    let len = CFDataGetLength(data)
    var out = [UInt8](repeating: 0, count: len)
    out.withUnsafeMutableBytes { buf in
      CFDataGetBytes(data, CFRange(location: 0, length: len), buf.bindMemory(to: UInt8.self).baseAddress)
    }
    return out
  }

  let headB = tableBytes(0x68656164) // 'head'
  let maxpB = tableBytes(0x6D617870) // 'maxp'
  let hheaB = tableBytes(0x68686561) // 'hhea'
  let cvtB  = tableBytes(0x63767420) // 'cvt '
  let fpgmB = tableBytes(0x6670676D) // 'fpgm'
  let prepB = tableBytes(0x70726570) // 'prep'
  let glyfB = tableBytes(0x676C7966) // 'glyf'
  let locaB = tableBytes(0x6C6F6361) // 'loca'
  let hmtxB = tableBytes(0x686D7478) // 'hmtx'

  // head
  var hr = ByteReader(bytes: headB)
  hr.skip(18)
  let upem = hr.i16()
  hr.skip(30)
  let locaFmt = hr.i16()

  // maxp
  var mr = ByteReader(bytes: maxpB)
  let maxpVer = mr.i32()
  let numGlyphs = mr.u16()
  var maxp: sfntMaxProfileTable
  if maxpVer == 0x0001_0000 {
    let maxPts = mr.u16(); let maxCtrs = mr.u16()
    let maxCPts = mr.u16(); let maxCCtrs = mr.u16()
    let maxZones = mr.u16(); let maxTwi = mr.u16()
    let maxSto = mr.u16(); let maxFdefs = mr.u16()
    let maxIdefs = mr.u16(); let maxStk = mr.u16()
    let maxInstr = mr.u16(); let maxComp = mr.u16()
    let maxDepth = mr.u16()
    maxp = sfntMaxProfileTable(
      version: maxpVer, numGlyphs: numGlyphs,
      maxPoints: maxPts, maxContours: maxCtrs,
      maxCompositePoints: maxCPts, maxCompositeContours: maxCCtrs,
      maxElements: max(maxZones, 2), maxTwilightPoints: maxTwi,
      maxStorage: maxSto, maxFunctionDefs: maxFdefs,
      maxInstructionDefs: maxIdefs, maxStackElements: maxStk,
      maxSizeOfInstructions: maxInstr,
      maxComponentElements: maxComp, maxComponentDepth: maxDepth
    )
  } else {
    maxp = sfntMaxProfileTable(version: maxpVer, numGlyphs: numGlyphs)
  }

  // hhea: numberOfHMetrics at offset 34
  var hhR = ByteReader(bytes: hheaB)
  hhR.skip(34); let numHMetrics = hhR.u16()

  // cvt
  var cvtR = ByteReader(bytes: cvtB)
  var cvt = [Int16]()
  for _ in 0..<(cvtB.count/2) { cvt.append(cvtR.i16()) }

  // loca
  let numLocaEntries = Int(numGlyphs) + 1
  var locaR = ByteReader(bytes: locaB)
  var loca = [UInt32]()
  if locaFmt == 1 {
    for _ in 0..<numLocaEntries { loca.append(locaR.u32()) }
  } else {
    for _ in 0..<numLocaEntries { loca.append(UInt32(locaR.u16()) * 2) }
  }

  // hmtx
  var hmtxR = ByteReader(bytes: hmtxB)
  var hmtx = [(aw: UInt16, lsb: Int16)]()
  var lastAW: UInt16 = 0
  for _ in 0..<numHMetrics {
    let aw = hmtxR.u16(); let lsb = hmtxR.i16()
    hmtx.append((aw, lsb)); lastAW = aw
  }
  let trailing = Int(numGlyphs) - Int(numHMetrics)
  for _ in 0..<max(0, trailing) {
    hmtx.append((lastAW, hmtxR.i16()))
  }

  return (
    head: (upem: upem, locaFmt: locaFmt),
    maxp: maxp,
    hhea: numHMetrics,
    cvt: cvt,
    fpgm: fpgmB,
    prep: prepB,
    glyf: glyfB,
    loca: loca,
    hmtx: hmtx
  )
}

// MARK: - Glyph parser (self-contained copy)

struct ParsedGlyph {
  let numContours: Int
  let endPts: [UInt16]
  let instructions: [UInt8]
  let xCoords: [Int16]
  let yCoords: [Int16]
  let onCurveFlags: [Bool]
}

func parseGlyph(glyf: [UInt8], offset: UInt32, length: UInt32) -> ParsedGlyph? {
  guard length > 0 else { return nil }
  let start = Int(offset)
  let slice = Array(glyf[start..<start+Int(length)])
  var r = ByteReader(bytes: slice)
  let nc = r.i16()
  guard nc > 0 else { return nil } // empty or composite
  let numContours = Int(nc)
  r.skip(8) // xMin, yMin, xMax, yMax
  var endPts = [UInt16]()
  for _ in 0..<numContours { endPts.append(r.u16()) }
  let instrLen = Int(r.u16())
  var instr = [UInt8]()
  for _ in 0..<instrLen { instr.append(r.u8()) }
  let pointCount = Int(endPts.last!) + 1
  var flags = [UInt8]()
  while flags.count < pointCount {
    let f = r.u8(); flags.append(f)
    if f & 0x08 != 0 { let rep = Int(r.u8()); for _ in 0..<rep { flags.append(f) } }
  }
  var xs = [Int16](); var x: Int16 = 0
  for f in flags {
    if f & 0x02 != 0 { let v = Int16(r.u8()); x &+= (f & 0x10 != 0) ? v : -v }
    else if f & 0x10 == 0 { x &+= r.i16() }
    xs.append(x)
  }
  var ys = [Int16](); var y: Int16 = 0
  for f in flags {
    if f & 0x04 != 0 { let v = Int16(r.u8()); y &+= (f & 0x20 != 0) ? v : -v }
    else if f & 0x20 == 0 { y &+= r.i16() }
    ys.append(y)
  }
  return ParsedGlyph(
    numContours: numContours, endPts: endPts, instructions: instr,
    xCoords: xs, yCoords: ys, onCurveFlags: flags.map { $0 & 0x01 != 0 }
  )
}

// MARK: - Zone storage

private let kPhantomCount = 8

@unsafe final class ZoneStorage {
  let el: UnsafeMutablePointer<fnt_ElementType>
  let ptCap: Int
  let ctrCap: Int
  init(ptCap: Int, ctrCap: Int) {
    unsafe self.ptCap = ptCap; unsafe self.ctrCap = ctrCap
    let e = UnsafeMutablePointer<fnt_ElementType>.allocate(capacity: 1)
    unsafe e.initialize(to: fnt_ElementType())
    if ptCap > 0 {
      unsafe e.pointee.x  = .allocate(capacity: ptCap); unsafe e.pointee.x.initialize(repeating:0, count:ptCap)
      unsafe e.pointee.y  = .allocate(capacity: ptCap); unsafe e.pointee.y.initialize(repeating:0, count:ptCap)
      unsafe e.pointee.ox = .allocate(capacity: ptCap); unsafe e.pointee.ox.initialize(repeating:0, count:ptCap)
      unsafe e.pointee.oy = .allocate(capacity: ptCap); unsafe e.pointee.oy.initialize(repeating:0, count:ptCap)
      unsafe e.pointee.oox = .allocate(capacity: ptCap); unsafe e.pointee.oox.initialize(repeating:0, count:ptCap)
      unsafe e.pointee.ooy = .allocate(capacity: ptCap); unsafe e.pointee.ooy.initialize(repeating:0, count:ptCap)
      unsafe e.pointee.onCurve = .allocate(capacity: ptCap); unsafe e.pointee.onCurve.initialize(repeating:0, count:ptCap)
      unsafe e.pointee.f = .allocate(capacity: ptCap); unsafe e.pointee.f.initialize(repeating:0, count:ptCap)
    }
    if ctrCap > 0 {
      unsafe e.pointee.sp = .allocate(capacity: ctrCap); unsafe e.pointee.sp.initialize(repeating:0, count:ctrCap)
      unsafe e.pointee.ep = .allocate(capacity: ctrCap); unsafe e.pointee.ep.initialize(repeating:0, count:ctrCap)
    }
    unsafe e.pointee.maxPointCount = Int32(ptCap)
    unsafe e.pointee.maxContourCount = Int32(ctrCap)
    unsafe e.pointee.pointCount = 0
    unsafe e.pointee.contourCount = 0
    unsafe self.el = e
  }
  deinit {
    if unsafe ptCap > 0 {
      unsafe el.pointee.x.deallocate(); unsafe el.pointee.y.deallocate()
      unsafe el.pointee.ox.deallocate(); unsafe el.pointee.oy.deallocate()
      unsafe el.pointee.oox.deallocate(); unsafe el.pointee.ooy.deallocate()
      unsafe el.pointee.onCurve.deallocate(); unsafe el.pointee.f.deallocate()
    }
    if unsafe ctrCap > 0 { unsafe el.pointee.sp.deallocate(); unsafe el.pointee.ep.deallocate() }
    unsafe el.deallocate()
  }
}

// MARK: - Main

let tables = loadTables(from: fontPath)
let upem = Int32(tables.head.upem)
let stretch = pointSize << 16

let interp = SwiftTrueTypeInterpreter(maxp: tables.maxp, cvtCount: UInt16(tables.cvt.count))

// Set CVT (font units → F26Dot6)
if !tables.cvt.isEmpty {
  let cvt32 = tables.cvt.map { Int32($0) << 6 }
  unsafe cvt32.withUnsafeBufferPointer { buf in
    unsafe interp.setCVT(buf.baseAddress!, count: buf.count)
  }
}

interp.setScaleFactors(
  xStretch: stretch, yStretch: stretch,
  unitsPerEm: tables.head.upem,
  pointSize: pointSize, cvtScale: stretch,
  isRotated: false, isStretched: false
)

// Allocate zones
let glyphPtCap = max(Int(tables.maxp.maxPoints), Int(tables.maxp.maxCompositePoints)) + kPhantomCount
let glyphCtrCap = max(Int(tables.maxp.maxContours), Int(tables.maxp.maxCompositeContours))
let twilightPtCap = max(Int(tables.maxp.maxTwilightPoints), 1)
let twilight = unsafe ZoneStorage(ptCap: twilightPtCap, ctrCap: 1)
let glyph   = unsafe ZoneStorage(ptCap: glyphPtCap, ctrCap: max(glyphCtrCap, 1))

var parBlock = fnt_ParameterBlock()

// Run fpgm then prep
let useFpgmAndPrep = CommandLine.arguments.count < 5 || CommandLine.arguments[4] != "nofpgm"
if useFpgmAndPrep {
  try unsafe tables.fpgm.withUnsafeBufferPointer { fpgmBuf in
    try unsafe interp.runProgram(
      fpgm: fpgmBuf.baseAddress, fpgmCount: Int32(fpgmBuf.count),
      prep: nil, prepCount: 0, glyf: nil, glyfCount: 0,
      twilightZone: nil, glyphZone: nil,
      unscaledOutlineIsWrong: false, parBlock: &parBlock
    )
    try unsafe tables.prep.withUnsafeBufferPointer { prepBuf in
      try unsafe interp.runProgram(
        fpgm: fpgmBuf.baseAddress, fpgmCount: Int32(fpgmBuf.count),
        prep: prepBuf.isEmpty ? nil : prepBuf.baseAddress, prepCount: Int32(prepBuf.count),
        glyf: nil, glyfCount: 0,
        twilightZone: unsafe twilight.el, glyphZone: nil,
        unscaledOutlineIsWrong: false, parBlock: &parBlock
      )
    }
  }
}

// Dump CVT after prep
let cvtAfterPrep = interp.cvtView().prefix(20).enumerated().map { (i, v) in "\(i)=\(v.bitPattern)" }
fputs("CVT after prep (first 20 raw F26Dot6 bitPatterns): \(cvtAfterPrep.joined(separator: " "))\n", stderr)

// Parse glyph
let offset = tables.loca[glyphIndex]
let length = tables.loca[glyphIndex + 1] - offset
guard let g = parseGlyph(glyf: tables.glyf, offset: offset, length: length) else {
  fputs("Glyph \(glyphIndex) is empty or composite\n", stderr)
  exit(1)
}

let hmtx = tables.hmtx[glyphIndex]
let aw = hmtx.aw
let lsb = hmtx.lsb
let rsb = Int16(truncatingIfNeeded: Int32(lsb) + Int32(aw))

let n = g.xCoords.count
let totalPts = n + kPhantomCount

precondition(unsafe totalPts <= glyph.ptCap)
precondition(unsafe g.numContours <= glyph.ctrCap)

let pp64 = pointSize * 64
func scale(_ v: Int16) -> Int32 { Int32(v) * pp64 / upem }

let phantoms: [(Int16, Int16)] = [(lsb,0),(rsb,0),(0,0),(0,0),(0,0),(0,0),(0,0),(0,0)]
let el = unsafe glyph.el
for i in 0..<n {
  let sx = scale(g.xCoords[i]); let sy = scale(g.yCoords[i])
  unsafe el.pointee.oox[i] = g.xCoords[i]; unsafe el.pointee.ooy[i] = g.yCoords[i]
  unsafe el.pointee.ox[i] = sx;  unsafe el.pointee.oy[i] = sy
  unsafe el.pointee.x[i]  = sx;  unsafe el.pointee.y[i]  = sy
  unsafe el.pointee.onCurve[i] = g.onCurveFlags[i] ? 1 : 0
  unsafe el.pointee.f[i] = 0
}
for j in 0..<kPhantomCount {
  let i = n + j
  let (px, py) = phantoms[j]
  let sx = scale(px); let sy = scale(py)
  unsafe el.pointee.oox[i] = px; unsafe el.pointee.ooy[i] = py
  unsafe el.pointee.ox[i] = sx; unsafe el.pointee.oy[i] = sy
  unsafe el.pointee.x[i] = sx;  unsafe el.pointee.y[i]  = sy
  unsafe el.pointee.onCurve[i] = 0; unsafe el.pointee.f[i] = 0
}

var prev = -1
for c in 0..<g.numContours {
  unsafe el.pointee.sp[c] = UInt16(prev + 1)
  unsafe el.pointee.ep[c] = g.endPts[c]
  prev = Int(g.endPts[c])
}
unsafe el.pointee.pointCount = Int32(n)
unsafe el.pointee.contourCount = Int32(g.numContours)

// Run glyph program
try unsafe tables.fpgm.withUnsafeBufferPointer { fpgmBuf in
  try unsafe tables.prep.withUnsafeBufferPointer { prepBuf in
    try unsafe g.instructions.withUnsafeBufferPointer { glyfBuf in
      try unsafe interp.runProgram(
        fpgm: fpgmBuf.baseAddress, fpgmCount: Int32(fpgmBuf.count),
        prep: prepBuf.isEmpty ? nil : prepBuf.baseAddress, prepCount: Int32(prepBuf.count),
        glyf: glyfBuf.isEmpty ? nil : glyfBuf.baseAddress, glyfCount: Int32(glyfBuf.count),
        twilightZone: unsafe twilight.el, glyphZone: unsafe glyph.el,
        unscaledOutlineIsWrong: false, parBlock: &parBlock
      )
    }
  }
}

// Output: one JSON object with unscaled (FU), scaled (F26Dot6), hinted (F26Dot6)
struct PointOutput: Encodable {
  let x_fu: Int16   // original font units
  let y_fu: Int16
  let x_scaled: Int32  // F26Dot6 scaled (before hinting)
  let y_scaled: Int32
  let x_hinted: Int32  // F26Dot6 after hinting
  let y_hinted: Int32
  let onCurve: Bool
  let xMoved: Bool    // f & 0x01: touched in x
  let yMoved: Bool    // f & 0x02: touched in y
}

var points = [PointOutput]()
for i in 0..<n {
  unsafe points.append(PointOutput(
    x_fu: el.pointee.oox[i], y_fu: el.pointee.ooy[i],
    x_scaled: el.pointee.ox[i], y_scaled: el.pointee.oy[i],
    x_hinted: el.pointee.x[i], y_hinted: el.pointee.y[i],
    onCurve: el.pointee.onCurve[i] != 0,
    xMoved: el.pointee.f[i] & 0x01 != 0,
    yMoved: el.pointee.f[i] & 0x02 != 0
  ))
}

struct Output: Encodable {
  let glyphIndex: Int
  let pointSize: Int32
  let upem: Int16
  let advanceWidth: UInt16
  let leftSideBearing: Int16
  let points: [PointOutput]
}

let output = Output(
  glyphIndex: glyphIndex, pointSize: pointSize,
  upem: tables.head.upem, advanceWidth: aw, leftSideBearing: lsb,
  points: points
)

let encoder = JSONEncoder()
encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
let json = try encoder.encode(output)
print(String(data: json, encoding: .utf8)!)
