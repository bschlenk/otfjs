# HintDump

Swift executable that runs the Apple TrueType reference interpreter on a font glyph
and prints the hinted point coordinates as JSON.

## Setup

1. Clone the Apple reference repo:
   ```
   git clone https://github.com/apple/truetype-hinting-interpreter-example /tmp/tt-hint-ref
   ```

2. Copy `main.swift` into the repo and add the target to `Package.swift`:
   ```swift
   .executableTarget(
       name: "HintDump",
       dependencies: ["SwiftTrueTypeInterpreter"],
       path: "Sources/HintDump",
       swiftSettings: [
           .swiftLanguageMode(.v6),
           .strictMemorySafety(),
       ]
   ),
   ```

3. Build:
   ```
   cd /tmp/tt-hint-ref
   swift build --target HintDump
   ```

## Usage

```
swift run HintDump <font.ttf> <glyphIndex> <pointSize>
```

Example — Roboto 'C' at 16 px:
```
swift run HintDump fonts/google/Roboto.ttf 39 16
```

## Output format

JSON object with fields:
- `glyphIndex`, `pointSize`, `upem`, `advanceWidth`, `leftSideBearing`
- `points[]`: one entry per glyph point (not including phantom points):
  - `x_fu`, `y_fu`: original font units (Int16)
  - `x_scaled`, `y_scaled`: pixel F26Dot6 before hinting (`FU × pointSize × 64 / upem`)
  - `x_hinted`, `y_hinted`: raw F26Dot6 bitPatterns after hinting
  - `onCurve`, `xMoved`, `yMoved`: flags

## Interpreting hinted coordinates

The `x_hinted`/`y_hinted` values are in Apple's internal coordinate system (see
discussion 0003). To convert to pixel floats:

```
pixel = hinted_value × pointSize / (upem × 64)
```

## Key reference values (Roboto glyph 39 = 'C')

| pointSize | pt5 (baseline) y_hinted | pt16 (cap height) y_hinted |
|---|---|---|
| 16 | 0 | 93 248 (≈ 11.375 px) |
| 64 | −1280 | 94 464 (≈ 46.125 px) |
