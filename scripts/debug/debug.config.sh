#!/bin/bash
# =============================================================================
# debug.config.sh
# =============================================================================
# App-specific configuration for debug scripts.
# Auto-detects the Android package name and app label from app.json.
#
# Usage: source this file from other debug scripts.
#   source "$(dirname "$0")/debug.config.sh"
# =============================================================================

# --- Project root detection --------------------------------------------------
# Resolve the directory containing this config file, then go up to project root.
_CONFIG_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$_CONFIG_DIR/../.." && pwd)"

# --- Auto-detect from app.json ----------------------------------------------
PACKAGE_NAME=$(node -e "
  const fs = require('fs');
  const json = JSON.parse(fs.readFileSync('${PROJECT_ROOT}/app.json', 'utf8'));
  const expo = json.expo || json;
  console.log(expo.android?.package || 'com.example.myapp');
")

APP_LABEL=$(node -e "
  const fs = require('fs');
  const json = JSON.parse(fs.readFileSync('${PROJECT_ROOT}/app.json', 'utf8'));
  const expo = json.expo || json;
  console.log(expo.name || 'MyApp');
")

# --- Session storage ---------------------------------------------------------
SESSION_DIR="${PROJECT_ROOT}/.debug-sessions"

# Sanitize app label for use in filenames and temp paths
_SAFE_LABEL=$(echo "$APP_LABEL" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr -cd '[:alnum:]_')
SESSION_STATE_FILE="/tmp/${_SAFE_LABEL}_debug_session"
DEVICE_RECORDING_PATH="/sdcard/${_SAFE_LABEL}_debug_recording.mp4"
