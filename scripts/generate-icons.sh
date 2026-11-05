#!/bin/sh
# Renders the PNG app icons from the SVG sources in `public/icons/`. Needs
# `rsvg-convert` (librsvg). Run after changing an SVG and commit the PNGs.
set -e
cd "$(dirname "$0")/../public/icons"

rsvg-convert -w 192 -h 192 icon.svg -o icon-192.png
rsvg-convert -w 512 -h 512 icon.svg -o icon-512.png
rsvg-convert -w 512 -h 512 icon-maskable.svg -o icon-maskable-512.png
# iOS rounds the corners itself, so the home screen icon is the full-bleed one.
rsvg-convert -w 180 -h 180 icon-maskable.svg -o apple-touch-icon.png
