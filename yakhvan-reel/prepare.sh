#!/bin/sh
# Copies the source reel into assets/ and splits it into JPEG frames for index.html.
# usage: ./prepare.sh path/to/source.mp4
set -e
cd "$(dirname "$0")"
mkdir -p assets/frames out
cp "$1" assets/source.mp4
ffmpeg -v error -y -i assets/source.mp4 -q:v 2 assets/frames/%05d.jpg
ls assets/frames | wc -l
