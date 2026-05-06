#!/usr/bin/env bash
# scripts/ci/wait-for-pr.sh
# CI checks を polling し、fail / pass / runner flake (timeout) を判定して自動 rerun。
#
# 解決する問題 (本セッション学び A6 / A7):
# - `gh pr checks --watch` が Bash tool で意図せず background 化される問題
# - `gh pr checks 2>&1 | grep pass` だけだと fail 検出漏れ
# - GitHub Actions runner 取得失敗で 15 分 pending → fail のフレーク (cancel + rerun が必要)
#
# Usage:
#   bash scripts/ci/wait-for-pr.sh <pr-num> [timeout-sec]
#
# Exit codes:
#   0 = all checks passed
#   1 = real failure (check failed in CI logic)
#   2 = max retries exceeded (still flaking)

set -euo pipefail

PR_NUM="${1:?Usage: wait-for-pr.sh <pr-num> [timeout-sec]}"
TIMEOUT_PER_ROUND="${2:-360}" # default 6 min
MAX_RETRIES="${MAX_RETRIES:-2}"

wait_one_round() {
  # returns:
  #   0 = all checks done (pass or fail; check exit code separately via gh pr checks)
  #   3 = timeout (likely runner flake)
  local start=$SECONDS
  while true; do
    local out
    out=$(gh pr checks "$PR_NUM" 2>&1) || true
    if echo "$out" | grep -qE $'\tfail\t'; then
      return 0 # done with fail
    fi
    if ! echo "$out" | grep -q $'\tpending\t'; then
      return 0 # done with pass
    fi
    sleep 10
    if [ $((SECONDS - start)) -gt "$TIMEOUT_PER_ROUND" ]; then
      return 3 # timeout
    fi
  done
}

retry_count=0
while true; do
  if wait_one_round; then
    final_out=$(gh pr checks "$PR_NUM" 2>&1) || true
    if echo "$final_out" | grep -qE $'\tfail\t'; then
      echo "[wait-for-pr] PR #${PR_NUM} CI failed (real failure):"
      gh pr checks "$PR_NUM" || true
      exit 1
    fi
    echo "[wait-for-pr] PR #${PR_NUM} CI passed:"
    gh pr checks "$PR_NUM" || true
    exit 0
  fi

  # rc == 3: timeout, runner flake possible
  retry_count=$((retry_count + 1))
  if [ "$retry_count" -gt "$MAX_RETRIES" ]; then
    echo "[wait-for-pr] max retries (${MAX_RETRIES}) exceeded, still pending:"
    gh pr checks "$PR_NUM" || true
    exit 2
  fi

  echo "[wait-for-pr] timeout after ${TIMEOUT_PER_ROUND}s — retry ${retry_count}/${MAX_RETRIES}: cancel + rerun"

  # 当該 PR の最新 run を取得して cancel + rerun
  RUN_ID=$(gh pr view "$PR_NUM" --json statusCheckRollup -q '.statusCheckRollup[0].detailsUrl' 2>/dev/null |
    grep -oE '/runs/[0-9]+' | head -1 | grep -oE '[0-9]+' || true)

  if [ -n "$RUN_ID" ]; then
    gh run cancel "$RUN_ID" >/dev/null 2>&1 || true
    sleep 5
    gh run rerun --failed "$RUN_ID" >/dev/null 2>&1 || true
    echo "[wait-for-pr] cancelled + rerun triggered for run ${RUN_ID}"
  else
    echo "[wait-for-pr] WARN: could not extract run id, manual rerun may be needed"
  fi
done
