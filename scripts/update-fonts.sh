#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT="$SCRIPT_DIR/.."
UI_SRC_DIR="$ROOT/packages/otfjs-ui/src"

FONTS_JSON="$UI_SRC_DIR/fonts.json"
GOOGLE_FONTS="$ROOT/fonts/google"
UI_PUBLIC_DIR="$ROOT/packages/otfjs-ui/public"
PREVIEW_DIR="$UI_PUBLIC_DIR/previews"
PREVIEW_SVG="$UI_PUBLIC_DIR/preview.svg"
COMPLEX_PATH="$UI_SRC_DIR/fonts-complex.json"

set -o allexport
source "$ROOT/.env"
set +o allexport

echo "Fetching font data..."
npx otf fetch-font-data > "$FONTS_JSON"

echo "Fetching font files..."
npx otf fetch-fonts "$FONTS_JSON" "$GOOGLE_FONTS"

echo "Generating font previews..."
npx otf gen-previews -d "$PREVIEW_DIR" "$GOOGLE_FONTS"/*

echo "Generating preview sprite..."
npx otf sprite "$PREVIEW_DIR" "$UI_PUBLIC_DIR" "$COMPLEX_PATH"
