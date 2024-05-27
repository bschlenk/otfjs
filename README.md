# otfjs

This project is my way of learning more about how fonts work under the hood. My goal is to eventually use the knowledge gained to write a Figma plugin for creating fonts using SVG paths.

## Development

This project is built with [pnpm]. First, make sure dependencies are installed. Run the following from the root of the repo:

```sh
pnpm install
```

Then spin up the dev server:

```sh
pnpm dev
```

This runs `tsc --watch` in the `otfjs` package and `vite dev` in the `otfjs-ui` package, so any changes you make to either package will be picked up automatically.

## Reference

- [Microsoft OpenType font spec][otf-spec]

  This spec is very well written and easy to undersatnd. It's made working on this project a delight.

- [Apple TrueType reference manual][tt-manual]

  Not as good as the Microsoft docs, but generally the graphics explaining the complex instructions are more helpful as they give examples where the freedom and projection vectors are in different directions.

[pnpm]: https://pnpm.io/
[otf-spec]: https://learn.microsoft.com/en-us/typography/opentype/spec/
[tt-manual]: https://developer.apple.com/fonts/TrueType-Reference-Manual/
