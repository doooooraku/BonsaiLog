#!/bin/bash
# =============================================================================
# debug_common.sh
# =============================================================================
# Shared ADB/WSL2 helpers and utilities for all debug scripts.
#
# Provides:
#   - Color output helpers: info, warn, error
#   - ADB detection (WSL2 vs native Linux)
#   - run_adb: wrapper that handles ADB_SERVER_SOCKET on WSL2
#   - check_device: verify device is connected and authorized
#   - take_screenshot: capture a screenshot from the connected device
#   - get_app_pid: get the PID of the target app
#
# Usage: source this file from other debug scripts.
#   source "$(dirname "$0")/debug_common.sh"
# =============================================================================

# --- Color output helpers ----------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# --- ADB detection -----------------------------------------------------------
# Detect whether we are running on WSL2 (Windows Subsystem for Linux).
# On WSL2, ADB_SERVER_SOCKET may be set to a non-default value which causes
# issues with some adb operations (screencap, exec-out). The run_adb function
# handles this transparently.

_IS_WSL2=false
if grep -qi "microsoft" /proc/version 2>/dev/null; then
  _IS_WSL2=true
fi

# run_adb: Execute an adb command, unsetting ADB_SERVER_SOCKET on WSL2
#          to avoid routing issues with mirrored networking mode.
#
# Usage: run_adb shell screencap -p
#        run_adb exec-out screencap -p > file.png
run_adb() {
  if [ "$_IS_WSL2" = true ] && [ -n "${ADB_SERVER_SOCKET:-}" ]; then
    env -u ADB_SERVER_SOCKET adb "$@"
  else
    adb "$@"
  fi
}

# --- Device connection check -------------------------------------------------
# check_device: Verify that an Android device is connected and USB debugging
#               is authorized. Prints the device ID on success, exits on failure.
check_device() {
  if ! command -v adb &>/dev/null; then
    error "adb not found in PATH"
    echo "  Windows: winget install Google.PlatformTools"
    echo "  WSL2:    Add Android SDK platform-tools to PATH"
    exit 1
  fi

  local status
  status=$(run_adb devices 2>/dev/null | grep -v "List" | grep -v "^$" | head -1)

  if [ -z "$status" ]; then
    error "No Android device connected"
    echo "  1. Connect your phone via USB cable"
    echo "  2. Enable 'USB debugging' in Developer Options"
    echo "  3. Tap 'Allow' on the USB debugging prompt"
    exit 1
  fi

  if echo "$status" | grep -q "unauthorized"; then
    error "USB debugging not authorized"
    echo "  Tap 'Allow' on the USB debugging prompt on your device"
    exit 1
  fi

  echo "$status" | awk '{print $1}'
}

# --- Screenshot helper -------------------------------------------------------
# take_screenshot: Capture the current screen to a local file.
#
# Usage: take_screenshot /path/to/output.png
take_screenshot() {
  local output_path="$1"
  run_adb exec-out screencap -p > "$output_path" 2>/dev/null
  if [ -s "$output_path" ]; then
    info "Screenshot saved: $output_path"
  else
    warn "Screenshot capture failed: $output_path"
    rm -f "$output_path"
  fi
}

# --- App PID helper ----------------------------------------------------------
# get_app_pid: Get the PID of the target app (requires PACKAGE_NAME to be set).
#
# Usage: pid=$(get_app_pid)
get_app_pid() {
  run_adb shell pidof -s "$PACKAGE_NAME" 2>/dev/null || echo ""
}
