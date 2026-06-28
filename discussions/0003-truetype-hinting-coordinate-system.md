# 0003 — TrueType hinting coordinate system

## Background

The TrueType hinting VM (`packages/otfjs/src/instruct/vm.ts`) was implemented with glyph zone coordinates and CVT values pre-scaled to pixel floats before any instructions run. The intent was to keep the interpreter simple by working in a single consistent pixel space throughout.

This approach produces visually wrong output. Investigation using the Apple reference interpreter ([apple/truetype-hinting-interpreter-example][apple-ref]) revealed the root cause.

## Why the pre-scaling seemed reasonable

The Microsoft OpenType spec describes `RCVT` as returning a value "in pixel units", and `WCVTP` as writing a value "in pixel units". This naturally suggests that the CVT should store pixel values, which means initialising it by scaling the raw `Int16` font-unit values by `pointSize / upem` before any programs run.

The spec is not wrong — `RCVT` does conceptually return a pixel value. But the spec describes the _logical_ semantics, not the _internal storage_ format. What actually happens is:

1. The CVT is initialised in **font-unit F26Dot6** (raw `Int16 × 64`).
2. `prep` and the fpgm functions it calls manipulate those font-unit values and write back updated font-unit values via `WCVTP` (which uses an internal rescaling formula, not a direct store).
3. When an instruction reads the CVT via `RCVT`, it gets the stored font-unit value back unchanged (since `cvtStretch = 1.0` in the standard setup).

The result is that `RCVT` appears to return a "pixel" value only because the font's `prep` program has already done the ppem-specific rounding and adjustment work on the CVT entries. The _logical_ output of `RCVT` is pixel-scale, but the _physical_ storage is font-unit-scale — and the two are reconciled by how `WCVTP` stores values, not by pre-scaling at startup.

Pre-scaling the CVT at startup bypasses all of that. When `prep` calls fpgm functions that expect font-unit inputs and gets pixel floats instead, the arithmetic produces nonsensical results (e.g. rounding 0.156 instead of 1457).

## Root cause

Roboto's `fpgm` defines helper functions (e.g. `fn114`) that `prep` and the glyph programs call. These functions were written to work in **font-unit F26Dot6** space — the same space the original Apple C interpreter used. They are not aware of any pre-scaling.

`fn114` is representative. Its purpose is: _move point B to the Y coordinate given by `CVT[A]`_. Its logic (simplified) is:

```
current_y  = GC[0](B)          // get hinted y of point B
target_y   = RCVT(A)           // read CVT entry A
delta      = -(current_y - target_y)
rp0        = B
MSIRP(delta, B)                // move B by delta → B now sits at target_y
```

When the CVT and glyph coordinates are both in **font-unit F26Dot6**, this works:

| value | Apple reference (16 px, upem=2048) |
| --- | --- |
| initial `y[pt16]` | 738 pixel F26Dot6 (= 1476 FU × 0.5 = 11.53 px) |
| `RCVT(3)` after prep | 93 248 FU F26Dot6 (= 1 457 FU × 64, cap-height CVT) |
| delta | −92 510 |
| final `y[pt16]` | 93 248 FU F26Dot6 (cap height ≈ 11.375 px after conversion) |

When the CVT is pre-scaled to **pixels** (our buggy approach), `prep` runs the same fpgm functions but they see wrong inputs and produce wrong CVT values:

| value | Our buggy implementation (16 px) |
| --- | --- |
| initial `y[pt16]` | 11.531 (pixel float) |
| `RCVT(3)` after prep | 0.156 px (= 20 FU × 16/2048 — initial value, barely changed by prep) |
| delta | −11.375 |
| final `y[pt16]` | **0.156 px — at the baseline, completely wrong** |

`prep` produces a wrong `cvt[3]` because the fpgm functions it calls were designed for font-unit inputs. Feeding them pixel-scaled values makes their arithmetic nonsensical.

## Apple's coordinate system

The Apple reference interpreter uses a **font-unit F26Dot6** internal space:

- **CVT** is stored as raw `Int16 × 64` (font units in F26Dot6). `RCVT` returns the raw value; `cvtStretch = stretch / cvtScale = 1.0`, so no additional scaling is applied on read.
- **Glyph zone coordinates** (`x[]`, `y[]`) are initialised as `FU × pointSize × 64 / upem` (pixel F26Dot6) — the standard scaled representation. But after instructions that move points to CVT-derived positions run (like `fn114`), those points end up in **FU F26Dot6** (e.g. `y[pt16] = 93 248 = 1 457 × 64`).
- The coordinate system is therefore **mixed**: some points remain in pixel F26Dot6; others land in FU F26Dot6, depending on which instructions touched them.
- The downstream rasterizer handles this mixed output natively — it was designed for the same format as the original Apple C interpreter.

This mixed system is not a bug; it is the documented binary-compatible behaviour that all TrueType-conformant rasterizers must handle.

## Decision

Rewrite the hinting VM to match Apple's coordinate system exactly.

### CVT

- Store CVT values as **raw font units** (the `Int16` values read from the `cvt ` table), not scaled to pixels.
- `RCVT` returns the raw value (no pixel conversion). This matches `cvtStretch = 1.0`.
- `WCVTP` and `WCVTF` store values using Apple's rescaling formula to maintain the internal font-unit representation:
  - `WCVTP`: receives a pixel F26Dot6 value from the stack. Apple's exact implementation (translated from `impl_WCVTP` in `Interpreter.swift`):
    ```
    doublyStretched = value × effectiveCVTScale
    if value == 0 OR doublyStretched == 0 OR doublyStretched == value OR program == fpgm:
        store value directly
    else:
        store value × value / doublyStretched   // ≈ value / effectiveCVTScale
    ```
    The non-trivial branch converts from pixel F26Dot6 back to font-unit F26Dot6 so that a subsequent `RCVT` (which returns the raw stored value) gives back the original pixel value. The fpgm special-case exists because functions defined during fpgm execution should not be affected by scale.
  - `WCVTF`: receives font units as F26Dot6; stores `value × unitsPerEmScale`.
- `SCVTCI` / `SSWCI` / `SSW` store their values directly (they are already in the appropriate F26Dot6 units relative to the current scale).

### Glyph zone

- Initialise `ox/oy` (scaled unhinted) and `x/y` (hinted, initially equal) as pixel F26Dot6: `FU × pointSize × 64 / upem`.
- `oox/ooy` (unscaled) remain as raw `Int16` font units.
- After the glyph program runs, `x/y` may be in mixed units. This is expected.

### Phantom points

The four public phantom points appended after the glyph outline points must be populated from the `hmtx` table. The VM currently doesn't have access to this data — `setGlyph()` will need to accept `advanceWidth` and `leftSideBearing` (both `Int16`, in font units) alongside the glyph. Scale them the same way as glyph points:

```
pp0 = (lsb,              0)   // left side bearing
pp1 = (lsb + advanceWidth, 0) // right side bearing (advance width endpoint)
pp2 = (0, 0)                  // top origin (vertical metrics — zero if unused)
pp3 = (0, 0)                  // advance height endpoint (vertical metrics — zero if unused)
```

All four phantom points go into `ox/oy` and `x/y` (scaled), and into `oox/ooy` (raw FU). Apple also appends four private phantom points (pp4–pp7, all zero) to reach the `kPrivatePhantomCount = 8` total; include those too so point-index arithmetic matches.

### Scale factors

Store `pointSize`, `upem`, and the derived values that Apple's `ScaleFactors` struct computes:

```
stretch        = F16Dot16(pointSize)         // e.g. 16.0 for 16 px
cvtStretch     = stretch / cvtScale = 1.0    // when cvtScale == stretch
unitsPerEmScale = stretch × 64 / upem        // e.g. 0.5 at 16 px / 2048 upem
```

`unitsPerEmScale` is what MDRP/MIRP use when measuring original distances:

```
distance_F26D6 = FU_difference × unitsPerEmScale
```

### Distance calculations (MDRP, MIRP, MD)

Replace the current approach (which measured distances in pixel float space) with Apple's formula: treat `oox/ooy` (Int16) as raw F26Dot6 bit patterns and multiply by `unitsPerEmScale` to obtain pixel F26Dot6 distances. This matches Apple's `OutlineCoord(bitPattern: pt.original())` pattern.

### What does not change

The following parts of the VM are unaffected by this coordinate system change:

- **Stack arithmetic** — `push26dot6` / `pop26dot6` continue to convert between the JavaScript float stack and F26Dot6. All intermediate values on the stack (distances, projections, deltas passed to `movePoint`) are in pixel F26Dot6.
- **`movePoint`** — receives and applies a pixel F26Dot6 delta; writes the result to `x/y`. No change needed.
- **`round()`** — operates on pixel F26Dot6 values. Rounding to the pixel grid (nearest integer pixel = nearest multiple of 64 in F26Dot6) is correct as-is.
- **All vector/projection opcodes** (SVTCA, SPVTL, SFVTL, …) — work on the graphics state only, no coordinate conversion involved.
- **IUP** — interpolates between hinted `x/y` values; the mixed-unit nature of those values is intentional and IUP handles it correctly because it only cares about relative proportions.

### Output conversion

After the glyph program and IUP run, `getGlyph()` returns points in the **mixed** coordinate space. The caller (e.g. `runHintingVM` in `hinting-utils.ts`) converts to pixel floats for rendering:

```ts
// For a point whose hinted coordinate is in font-unit F26Dot6 (≈ FU × 64):
//   pixel = hinted × pointSize / (upem × 64)
// For a point in pixel F26Dot6 (≈ px × 64):
//   pixel = hinted / 64
//
// Since both formulas reduce to the same expression when interpreted consistently
// by the rasterizer, the renderer simply scales all hinted coordinates by
// pointSize / (upem × 64) — which is correct for the FU F26Dot6 points and
// slightly wrong for pixel F26Dot6 points, but this is the same trade-off the
// original Apple rasterizer made.
//
// In practice, for a clean implementation we should follow Apple exactly: output
// hinted coordinates directly and let the glyph renderer apply the same scaling
// formula it already uses for unhinted glyphs.
```

For the UI glyph viewer, divide all hinted point coordinates by `upem / pointSize × 64` to recover pixel positions for rendering.

## Reference

The Apple reference interpreter that guided this analysis:

- Repository: https://github.com/apple/truetype-hinting-interpreter-example
- The `HinterContext.swift` benchmark driver shows the exact zone initialisation, scale factor setup, and phantom point layout.
- The `impl_MDRP`, `impl_MIRP`, `impl_MIAP`, `impl_WCVTP`, `impl_RCVT` functions in `Interpreter.swift` document the exact arithmetic for each opcode.
- A `HintDump` executable was written to extract reference hinted coordinates for any glyph at any point size. Source and setup instructions are in `discussions/supplemental/hint-dump/`. Use it to generate test fixtures once the VM is corrected.

## Test approach

Once the VM is corrected:

1. Build and run `HintDump` per `discussions/supplemental/hint-dump/README.md`. It outputs JSON with `x_fu`, `y_fu`, `x_scaled`, `y_scaled`, `x_hinted`, `y_hinted`, `onCurve`, `xMoved`, `yMoved` for each point.

2. The `y_hinted` values (raw F26Dot6 bitPatterns) are the expected outputs from a correct VM implementation. Compare them directly against our VM's internal hinted coordinates (before pixel conversion).

3. Key test cases:
   - Roboto glyph 39 ('C') at 16 px: cap height (`pt16`) should be ≈ 93 248 (not 0)
   - Roboto glyph 39 ('C') at 64 px: cap height (`pt16`) should be ≈ 94 464 (= 1476 × 64)
   - Baseline (`pt5`) at 16 px: 0; at 64 px: −1280 (= −20 × 64)

[apple-ref]: https://github.com/apple/truetype-hinting-interpreter-example
