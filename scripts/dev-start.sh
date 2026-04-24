#!/usr/bin/env bash
# dev-start.sh — One-command development session startup
# Usage: bash scripts/dev-start.sh [--clean] [--port PORT]
#
# This script:
#   1. Verifies ADB connection to a physical device
#   2. Sets up port forwarding (adb reverse) for Metro bundler
#   3. Starts Metro bundler with expo-dev-client support
#
# Prerequisites:
#   - Dev build APK installed on device
#   - USB debugging enabled on device
#   - Device connected via USB

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# --- Default values ---
CLEAN=false
PORT=8081

# --- Parse arguments ---
usage() {
  cat <<USAGE
Usage: $0 [OPTIONS]

Options:
  --clean       Clear Metro cache before starting
  --port PORT   Metro bundler port (default: 8081)
  -h, --help    Show this help

Examples:
  bash scripts/dev-start.sh              # Normal start
  bash scripts/dev-start.sh --clean      # Start with cache clear
  bash scripts/dev-start.sh --port 8082  # Custom port
USAGE
  exit 0
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean) CLEAN=true; shift ;;
    --port)
      if [[ -z "${2:-}" ]]; then
        echo "ERROR: --port requires a value" >&2
        exit 1
      fi
      PORT="$2"; shift 2
      ;;
    -h|--help) usage ;;
    *)
      echo "ERROR: Unknown option: $1" >&2
      usage
      ;;
  esac
done

cd "$PROJECT_ROOT"

# --- Step 1: Verify ADB connection ---
echo "=== Step 1: Checking ADB connection ==="
# WSL2 workaround: unset ADB_SERVER_SOCKET to avoid router-IP socket issue
ADB_CMD="env -u ADB_SERVER_SOCKET adb"

if ! $ADB_CMD devices 2>/dev/null | grep -q 'device$'; then
  echo "ERROR: No Android device found."
  echo ""
  echo "Troubleshooting:"
  echo "  1. Is the device connected via USB?"
  echo "  2. Is USB debugging enabled? (Settings > Developer options > USB debugging)"
  echo "  3. Did you authorize the PC on the device? (check for USB debugging dialog)"
  echo "  4. Try: env -u ADB_SERVER_SOCKET adb devices"
  exit 1
fi

DEVICE=$($ADB_CMD devices | grep 'device$' | head -1 | awk '{print $1}')
echo "  Device found: $DEVICE"

# --- Step 2: Set up port forwarding ---
echo ""
echo "=== Step 2: Setting up port forwarding (port $PORT) ==="
$ADB_CMD reverse tcp:"$PORT" tcp:"$PORT"
echo "  adb reverse tcp:$PORT tcp:$PORT — OK"

# --- Step 3: Start Metro bundler ---
echo ""
echo "=== Step 3: Starting Metro bundler ==="
if [ "$CLEAN" = true ]; then
  echo "  Mode: --clean (clearing Metro cache)"
  echo ""
  npx expo start --dev-client --port "$PORT" --clear
else
  echo "  Mode: normal"
  echo ""
  npx expo start --dev-client --port "$PORT"
fi
