#!/usr/bin/env bash
# Copies the web game into www/ for Capacitor to bundle into the app.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf www && mkdir -p www
cp -r ../gemfall/index.html ../gemfall/js ../gemfall/assets ../gemfall/fonts www/
