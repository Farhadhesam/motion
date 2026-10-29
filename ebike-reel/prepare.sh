#!/bin/sh
# Copies the source reel into assets/ and splits it into JPEG frames for index.html,
# upscaled to 1080x1920 (the source is 478x854) with a little sharpening.
# usage: ./prepare.sh path/to/source.mp4
set -e
cd "$(dirname "$0")"
mkdir -p assets/frames out
cp "$1" assets/source.mp4
ffmpeg -v error -y -i assets/source.mp4 -vf "scale=1080:1920:flags=lanczos,unsharp=5:5:0.7:5:5:0" -q:v 2 assets/frames/%05d.jpg
ls assets/frames | wc -l
