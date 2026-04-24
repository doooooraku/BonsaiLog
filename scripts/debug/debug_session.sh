#!/bin/bash
# =============================================================================
# debug_session.sh
# =============================================================================
# Manages debug sessions with start/stop/status subcommands.
# Automatically collects logs, screenshots, screen recordings, and memory info
# into a single session folder.
#
# Usage:
#   bash scripts/debug/debug_session.sh start          # Start a session
#   bash scripts/debug/debug_session.sh stop           # Stop and collect artifacts
#   bash scripts/debug/debug_session.sh status         # Check session status
#   bash scripts/debug/debug_session.sh start --no-record  # Start without recording
#
# Prerequisites:
#   - adb in PATH (WSL2 wrapper is fine)
#   - Phone connected via USB with USB debugging authorized
#
# Session artifacts (generated on stop):
#   .debug-sessions/session_YYYYMMDD_HHMMSS/
#   ├── before.png       Screenshot before operations
#   ├── after.png        Screenshot after operations
#   ├── logcat.log       Full log during session
#   ├── recording.mp4    Screen recording (omitted with --no-record)
#   ├── meminfo.txt      Memory usage snapshot
#   └── summary.md       Session summary (for Claude Code analysis)
# =============================================================================

set -uo pipefail

# --- Load config and common helpers -----------------------------------------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=debug.config.sh
source "$SCRIPT_DIR/debug.config.sh"
# shellcheck source=debug_common.sh
source "$SCRIPT_DIR/debug_common.sh"

# =============================================================================
# start: Begin a debug session
# =============================================================================
cmd_start() {
  local do_record=true
  for arg in "$@"; do
    case "$arg" in
      --no-record) do_record=false ;;
    esac
  done

  # Check for existing session
  if [ -f "$SESSION_STATE_FILE" ]; then
    warn "A session is already running"
    cat "$SESSION_STATE_FILE"
    echo ""
    warn "Run 'stop' first, or delete $SESSION_STATE_FILE if stale"
    exit 1
  fi

  local device_id
  device_id=$(check_device)

  # Create session folder
  local timestamp
  timestamp=$(date +%Y%m%d_%H%M%S)
  local session_dir="$SESSION_DIR/session_${timestamp}"
  mkdir -p "$session_dir"

  info "Session started: session_${timestamp}"
  info "Device: $device_id"
  info "Output: $session_dir/"

  # Clear log buffer
  run_adb logcat -c 2>/dev/null || true

  # Initial screenshot
  take_screenshot "$session_dir/before.png"

  # Start logcat in background
  run_adb logcat -v threadtime > "$session_dir/logcat.log" 2>/dev/null &
  local logcat_pid=$!
  info "logcat started (PID: $logcat_pid)"

  # Start screen recording in background
  local record_pid=""
  if [ "$do_record" = true ]; then
    run_adb shell screenrecord --time-limit 180 "$DEVICE_RECORDING_PATH" &
    record_pid=$!
    info "Screen recording started (PID: $record_pid, limit: 3 min)"
  else
    info "Screen recording: skipped (--no-record)"
  fi

  # Record app PID
  local app_pid
  app_pid=$(get_app_pid)

  # Save session state to file
  cat > "$SESSION_STATE_FILE" <<EOF
SESSION_DIR="$session_dir"
SESSION_TIMESTAMP="$timestamp"
DEVICE_ID="$device_id"
LOGCAT_PID="$logcat_pid"
RECORD_PID="${record_pid:-}"
APP_PID="${app_pid:-unknown}"
DO_RECORD="$do_record"
START_TIME="$(date +%s)"
START_TIME_HUMAN="$(date '+%Y-%m-%d %H:%M:%S')"
EOF

  echo ""
  echo -e "${BOLD}=============================================${NC}"
  echo -e "${BOLD}  ${APP_LABEL} Debug Session${NC}"
  echo -e "${BOLD}=============================================${NC}"
  echo -e "  Session:    session_${timestamp}"
  echo -e "  Device:     $device_id"
  echo -e "  App PID:    ${app_pid:-not running}"
  echo -e "  logcat:     running (PID: $logcat_pid)"
  if [ "$do_record" = true ]; then
    echo -e "  Recording:  running (limit: 3 min)"
  else
    echo -e "  Recording:  OFF"
  fi
  echo -e "  Output:     $session_dir/"
  echo -e "${BOLD}=============================================${NC}"
  echo ""
  echo -e "${CYAN}  Operate the app now.${NC}"
  echo -e "${CYAN}  When done: bash scripts/debug/debug_session.sh stop${NC}"
  echo ""
}

# =============================================================================
# stop: End session and collect artifacts
# =============================================================================
cmd_stop() {
  if [ ! -f "$SESSION_STATE_FILE" ]; then
    error "No active session found"
    exit 1
  fi

  # Load session state
  # shellcheck disable=SC1090
  source "$SESSION_STATE_FILE"

  local device_id
  device_id=$(check_device 2>/dev/null || echo "disconnected")

  info "Stopping session: session_${SESSION_TIMESTAMP}"

  # Stop logcat
  if kill -0 "$LOGCAT_PID" 2>/dev/null; then
    kill "$LOGCAT_PID" 2>/dev/null || true
    wait "$LOGCAT_PID" 2>/dev/null || true
    info "logcat stopped"
  else
    warn "logcat was already stopped"
  fi

  # Stop screen recording
  if [ "$DO_RECORD" = true ] && [ -n "${RECORD_PID:-}" ]; then
    if kill -0 "$RECORD_PID" 2>/dev/null; then
      kill "$RECORD_PID" 2>/dev/null || true
      wait "$RECORD_PID" 2>/dev/null || true
    fi
    # Also stop the on-device recording process
    run_adb shell pkill -2 screenrecord 2>/dev/null || true
    sleep 2

    # Pull recording from device
    if run_adb shell ls "$DEVICE_RECORDING_PATH" &>/dev/null; then
      run_adb pull "$DEVICE_RECORDING_PATH" "$SESSION_DIR/recording.mp4" 2>/dev/null
      run_adb shell rm -f "$DEVICE_RECORDING_PATH" 2>/dev/null || true
      info "Screen recording saved: recording.mp4"
    else
      warn "Recording file not found (recording may have been too short)"
    fi
  fi

  # Final screenshot and memory info
  if [ "$device_id" != "disconnected" ]; then
    take_screenshot "$SESSION_DIR/after.png"

    run_adb shell dumpsys meminfo "$PACKAGE_NAME" > "$SESSION_DIR/meminfo.txt" 2>/dev/null || true
    info "Memory info saved: meminfo.txt"
  fi

  # Count log lines and errors
  local log_lines=0
  local error_lines=0
  if [ -f "$SESSION_DIR/logcat.log" ]; then
    log_lines=$(wc -l < "$SESSION_DIR/logcat.log")
    error_lines=$(grep -ci "error\|exception\|fatal\|crash" "$SESSION_DIR/logcat.log" || echo "0")
  fi

  # Calculate session duration
  local end_time
  end_time=$(date +%s)
  local duration=$(( end_time - START_TIME ))
  local duration_min=$(( duration / 60 ))
  local duration_sec=$(( duration % 60 ))

  # Generate summary file
  cat > "$SESSION_DIR/summary.md" <<SUMMARY
# Debug Session: session_${SESSION_TIMESTAMP}

## Overview
| Item | Value |
|------|-------|
| App | ${APP_LABEL} (${PACKAGE_NAME}) |
| Start time | ${START_TIME_HUMAN} |
| End time | $(date '+%Y-%m-%d %H:%M:%S') |
| Duration | ${duration_min}m ${duration_sec}s |
| Device | ${DEVICE_ID} |
| App PID | ${APP_PID} |

## Artifacts
| File | Description |
|------|-------------|
| before.png | Screenshot before operations |
| after.png | Screenshot after operations |
| logcat.log | Full log (${log_lines} lines) |
| recording.mp4 | Screen recording |
| meminfo.txt | Memory usage |

## Log Summary
- Total lines: ${log_lines}
- Error-related lines: ${error_lines}

## Extracted Errors (first 20)
\`\`\`
$(grep -i "error\|exception\|fatal\|crash" "$SESSION_DIR/logcat.log" 2>/dev/null | head -20 || echo "(none)")
\`\`\`
SUMMARY

  info "Summary saved: summary.md"

  # Clean up session state
  rm -f "$SESSION_STATE_FILE"

  echo ""
  echo -e "${BOLD}=============================================${NC}"
  echo -e "${BOLD}  Session Complete${NC}"
  echo -e "${BOLD}=============================================${NC}"
  echo -e "  Duration:   ${duration_min}m ${duration_sec}s"
  echo -e "  Log lines:  ${log_lines}"
  echo -e "  Errors:     ${error_lines}"
  echo -e "  Output:     $SESSION_DIR/"
  echo -e "${BOLD}=============================================${NC}"
  echo ""
  echo -e "${CYAN}  Artifacts:${NC}"
  ls -lh "$SESSION_DIR/" 2>/dev/null | tail -n +2
  echo ""
}

# =============================================================================
# status: Check session state
# =============================================================================
cmd_status() {
  if [ ! -f "$SESSION_STATE_FILE" ]; then
    info "No active session"
    exit 0
  fi

  # shellcheck disable=SC1090
  source "$SESSION_STATE_FILE"

  local now
  now=$(date +%s)
  local elapsed=$(( now - START_TIME ))
  local elapsed_min=$(( elapsed / 60 ))
  local elapsed_sec=$(( elapsed % 60 ))

  local logcat_status="stopped"
  if kill -0 "$LOGCAT_PID" 2>/dev/null; then
    logcat_status="running"
  fi

  local record_status="OFF"
  if [ "$DO_RECORD" = true ] && [ -n "${RECORD_PID:-}" ]; then
    if kill -0 "$RECORD_PID" 2>/dev/null; then
      record_status="running"
    else
      record_status="stopped (3 min elapsed or ended)"
    fi
  fi

  local log_lines=0
  if [ -f "$SESSION_DIR/logcat.log" ]; then
    log_lines=$(wc -l < "$SESSION_DIR/logcat.log")
  fi

  echo ""
  echo -e "${BOLD}  Debug Session Status${NC}"
  echo -e "  Session:    session_${SESSION_TIMESTAMP}"
  echo -e "  Elapsed:    ${elapsed_min}m ${elapsed_sec}s"
  echo -e "  logcat:     ${logcat_status} (${log_lines} lines)"
  echo -e "  Recording:  ${record_status}"
  echo -e "  Output:     $SESSION_DIR/"
  echo ""
}

# =============================================================================
# help
# =============================================================================
cmd_help() {
  echo "Usage: $0 <command> [options]"
  echo ""
  echo "Commands:"
  echo "  start [--no-record]  Start a session (log collection + recording)"
  echo "  stop                 Stop session and collect artifacts"
  echo "  status               Show session status"
  echo "  help                 Show this help"
  echo ""
  echo "Typical workflow:"
  echo "  1. bash scripts/debug/debug_session.sh start"
  echo "  2. (operate the app)"
  echo "  3. bash scripts/debug/debug_session.sh stop"
  echo "  4. Inspect .debug-sessions/session_*/"
}

# =============================================================================
# main
# =============================================================================
case "${1:-help}" in
  start)  shift; cmd_start "$@" ;;
  stop)   cmd_stop ;;
  status) cmd_status ;;
  help|--help|-h) cmd_help ;;
  *)
    error "Unknown command: $1"
    cmd_help
    exit 1
    ;;
esac
