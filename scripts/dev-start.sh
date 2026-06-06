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

# --- Step 0 (Sess71 PR-3): Native fingerprint check ---
# 編集 file が Native 影響あれば自動 build + install。 JS-only なら skip して Metro 直行。
# 環境変数:
#   SKIP_BUILD_CHECK=1     check 自体を skip (緊急時用)
#   AUTO_BUILD=0           flag あっても自動 build せず警告のみ (default: 1)
if [ "${SKIP_BUILD_CHECK:-0}" != "1" ]; then
  FLAG_PATH="${PROJECT_ROOT}/dist/.native-dirty"
  echo "=== Step 0: Native fingerprint check (Sess71 PR-3) ==="
  if [ -f "${FLAG_PATH}" ]; then
    echo "  Native flag found at ${FLAG_PATH}"
  else
    # 補完: git diff で hook 経由でない手動編集も検出
    echo "  No flag, checking via git diff (CLI mode)..."
    PATH=/home/doooo/.local/bin:/usr/bin:/bin:${PATH:-} node "${PROJECT_ROOT}/scripts/check-native-impact.mjs" --from=cli 2>&1 | sed 's/^/  /'
  fi
  if [ -f "${FLAG_PATH}" ]; then
    if [ "${AUTO_BUILD:-1}" != "0" ]; then
      echo "  Native impact detected → starting auto build (pnpm build:android:dev:local)"
      echo "  This takes 10-15 minutes. Press Ctrl+C to skip (not recommended)."
      PATH=/home/doooo/.local/bin:/usr/bin:/bin:${PATH:-} pnpm build:android:dev:local
      echo "  Build done. Installing dev APK..."
      PATH=/home/doooo/.local/bin:/usr/bin:/bin:${PATH:-} pnpm install:device:dev
      echo "  Install done. Removing flag."
      rm -f "${FLAG_PATH}"
    else
      echo "  AUTO_BUILD=0, skipping auto build. Run manually:"
      echo "    pnpm build:android:dev:local && pnpm install:device:dev"
      echo "    rm ${FLAG_PATH}"
    fi
  else
    echo "  JS-only (or no changes), Metro reload sufficient."
  fi
  echo ""
fi

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
