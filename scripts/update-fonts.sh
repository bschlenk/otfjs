#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT="$SCRIPT_DIR/.."

FONTS_JSON="$ROOT/packages/otfjs-ui/src/fonts.json"
GOOGLE_FONTS="$ROOT/fonts/google"
UI_PUBLIC_DIR="$ROOT/packages/otfjs-ui/public"
PREVIEW_DIR="$UI_PUBLIC_DIR/previews"
PREVIEW_SVG="$UI_PUBLIC_DIR/preview.svg"

set -o allexport
source "$ROOT/.env"
set +o allexport

npx otf fetch-font-data > "$FONTS_JSON"
npx otf fetch-fonts "$FONTS_JSON" "$GOOGLE_FONTS"
npx otf gen-previews -d "$PREVIEW_DIR" "$GOOGLE_FONTS"/*
npx svg-sprite-generator -d "$PREVIEW_DIR" -o "$PREVIEW_SVG"