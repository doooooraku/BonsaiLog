#!/bin/bash
# =============================================================================
# monitor.sh
# =============================================================================
# Real-time crash and error monitoring for Android apps.
# Detects crashes, ANRs, and fatal errors, then auto-saves log snapshots.
#
# Usage:
#   bash scripts/debug/monitor.sh            # Monitor mode (crash + error)
#   bash scripts/debug/monitor.sh --all      # Show all app logs (verbose)
#   bash scripts/debug/monitor.sh --crash    # Crash buffer only
#
# Prerequisites:
#   - adb in PATH (WSL2 wrapper is fine)
#   - Phone connected via USB with USB debugging authorized
#
# Stop: Ctrl+C
# =============================================================================

set -euo pipefail

# --- Load config and common helpers -----------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=debug.config.sh
source "$SCRIPT_DIR/debug.config.sh"
# shellcheck source=debug_common.sh
source "$SCRIPT_DIR/debug_common.sh"

# --- False positive exclusion patterns ---------------------------------------
# System events that contain the package name but are not actual app crashes.
# Common false positives across Android apps:
#   - Finsky (Google Play): VerifyApps package scanning
#   - FullBackup_native: Android backup data measurement
#   - installd: cache purge / storage management
#   - PFTBT / Backup: backup transfer errors (quota exceeded, etc.)
#   - ActivityManager: process lifecycle (bkup, prev, empty = normal termination)
FALSE_POSITIVE_PATTERN="Finsky|FullBackup_native|installd|PFTBT|BackupManagerService|VerifyApps|installPackageLI|force stop.*installPackage|has died: (bkup|prev|empty|cch)"

# --- Prerequisite checks (using common helpers) ------------------------------
DEVICE_ID=$(check_device)
info "Device detected: $DEVICE_ID"

# --- Mode selection ----------------------------------------------------------
MODE="monitor"

case "${1:-}" in
  --all)
    MODE="all"
    info "Mode: all logs (verbose)"
    ;;
  --crash)
    MODE="crash"
    info "Mode: crash buffer only"
    ;;
  --help|-h)
    echo "Usage: $0 [--all|--crash|--help]"
    echo ""
    echo "  (no args)   Crash and error monitoring mode (recommended)"
    echo "  --all       Show all app logs (verbose, high volume)"
    echo "  --crash     Show crash buffer only"
    echo "  --help      Show this help"
    echo ""
    echo "Features:"
    echo "  - PID-based filtering to minimize false positives"
    echo "  - Automatic PID tracking on app restart"
    echo "  - Known system event exclusion (Backup, Play Store, etc.)"
    echo "  - Auto-save on crash detection"
    exit 0
    ;;
esac

# --- Prepare log directory ---------------------------------------------------
mkdir -p "$SESSION_DIR"

# --- Cleanup handler ---------------------------------------------------------
cleanup() {
  echo ""
  info "Monitoring stopped"
  info "Saved logs: $SESSION_DIR/"
  if [ "${CRASH_COUNT:-0}" -eq 0 ]; then
    info "Crashes detected: 0 (all clear)"
  else
    warn "Crashes detected: ${CRASH_COUNT}"
  fi
  exit 0
}
trap cleanup INT TERM

# --- Get initial app PID -----------------------------------------------------
APP_PID=$(get_app_pid)
if [ -n "$APP_PID" ]; then
  info "${APP_LABEL} PID: $APP_PID (PID-based filtering active)"
else
  warn "${APP_LABEL} is not running (monitoring by package name)"
fi

echo ""
echo "=============================================="
echo "  ${APP_LABEL} Crash Monitor"
echo "=============================================="
echo "  Package:  $PACKAGE_NAME"
echo "  Device:   $DEVICE_ID"
echo "  PID:      ${APP_PID:-(not running, auto-tracking)}"
echo "  Log dir:  $SESSION_DIR/"
echo "  Stop:     Ctrl+C"
echo "=============================================="
echo ""

case "$MODE" in
  all)
    # All logs: filter to the app's process
    if [ -n "$APP_PID" ]; then
      info "${APP_LABEL} PID: $APP_PID"
      run_adb logcat --pid="$APP_PID" -v threadtime
    else
      warn "${APP_LABEL} is not running. Filtering all logs by package name"
      run_adb logcat -v threadtime | grep --line-buffered -i "$PACKAGE_NAME"
    fi
    ;;

  crash)
    # Crash buffer only
    info "Monitoring crash buffer..."
    run_adb logcat -b crash -v threadtime
    ;;

  monitor)
    # Monitor mode: detect crashes and auto-save
    info "Crash and error monitoring started..."
    info "False positive exclusions: Finsky, FullBackup, installd, PFTBT, Backup lifecycle"

    # Clear log buffer (exclude old logs)
    run_adb logcat -c 2>/dev/null || true

    CRASH_COUNT=0
    LAST_PID_CHECK=0

    # Monitor crash + main buffers
    run_adb logcat -b crash,main -v threadtime 2>/dev/null | while IFS= read -r line; do

      # --- PID auto-tracking (re-check every 10 seconds) ---
      NOW=$(date +%s)
      if [ $((NOW - LAST_PID_CHECK)) -ge 10 ]; then
        NEW_PID=$(get_app_pid)
        if [ -n "$NEW_PID" ] && [ "$NEW_PID" != "${APP_PID:-}" ]; then
          APP_PID="$NEW_PID"
          info "PID updated: $APP_PID"
        fi
        LAST_PID_CHECK=$NOW
      fi

      # --- Filtering ---
      # Step 1: PID-based filter (high precision)
      IS_APP_LOG=false
      if [ -n "${APP_PID:-}" ]; then
        if echo "$line" | grep -q " ${APP_PID} "; then
          IS_APP_LOG=true
        fi
      fi

      # Step 2: Package name filter (fallback)
      if [ "$IS_APP_LOG" = false ]; then
        if echo "$line" | grep -qi "$PACKAGE_NAME"; then
          IS_APP_LOG=true
        fi
      fi

      # Skip lines unrelated to the app
      if [ "$IS_APP_LOG" = false ]; then
        continue
      fi

      # Step 3: Exclude false positives
      if echo "$line" | grep -qE "$FALSE_POSITIVE_PATTERN"; then
        continue
      fi

      # Step 4: Detect crash/error keywords
      if echo "$line" | grep -qi "FATAL\|Exception\|Error\|ANR\|CRASH\|died\|killed"; then
        CRASH_COUNT=$((CRASH_COUNT + 1))
        TIMESTAMP=$(date +%Y%m%d_%H%M%S)

        echo ""
        echo -e "${RED}!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!${NC}"
        echo -e "${RED}  Crash/Error Detected #${CRASH_COUNT}${NC}"
        echo -e "${RED}  Time: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
        echo -e "${RED}  PID:  ${APP_PID:-unknown}${NC}"
        echo -e "${RED}!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!${NC}"
        echo ""
        echo "$line"
        echo ""

        # Save crash line to dedicated file
        echo "=== Crash #${CRASH_COUNT} at $TIMESTAMP (PID: ${APP_PID:-unknown}) ===" >> "$SESSION_DIR/crash_${TIMESTAMP}.log"
        echo "$line" >> "$SESSION_DIR/crash_${TIMESTAMP}.log"

        # Dump full log buffer for context around the crash
        run_adb logcat -d -v threadtime > "$SESSION_DIR/full_${TIMESTAMP}.log" 2>/dev/null

        info "Logs saved:"
        info "  Crash:    $SESSION_DIR/crash_${TIMESTAMP}.log"
        info "  Full log: $SESSION_DIR/full_${TIMESTAMP}.log"
        echo ""
      fi
    done
    ;;
esac
