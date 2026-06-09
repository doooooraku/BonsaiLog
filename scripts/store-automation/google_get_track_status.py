#!/usr/bin/env python3
"""Sess81: Google Play Console の track (= Closed testing / Production) 状態を取得 (ADR-0043 Sess81)。

使い方:
  python3 google_get_track_status.py            # 全 track の状態を表示
  python3 google_get_track_status.py --config <path>

取得対象:
- alpha (= Closed testing)
- beta (= Open testing)
- production
- internal (= Internal testing)

表示項目:
- track 名
- リリース状態 (status: completed / inProgress / halted / draft)
- リリースの versionCode
- countryTargeting (= 販売対象国 / Countries)
- userFraction (= rollout percentage)
"""
from __future__ import annotations
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _common as C  # noqa

AP = "https://androidpublisher.googleapis.com/androidpublisher/v3"


def get_edits_id(token, pkg):
    """edit セッションを開始 (= track 状態取得には必須)。"""
    r = C.http("POST", f"{AP}/applications/{pkg}/edits", token=token, json_body={})
    return r["id"]


def commit_edit(token, pkg, edit_id):
    """edit セッションを read-only で終了 (= validate)。"""
    try:
        C.http("POST", f"{AP}/applications/{pkg}/edits/{edit_id}:validate", token=token, json_body={})
    except Exception:
        pass


def list_tracks(token, pkg, edit_id):
    return C.http("GET", f"{AP}/applications/{pkg}/edits/{edit_id}/tracks", token=token)


def summarize_release(rel: dict) -> dict:
    return {
        "name": rel.get("name", "?"),
        "status": rel.get("status", "?"),
        "userFraction": rel.get("userFraction"),
        "versionCodes": rel.get("versionCodes", []),
        "countryTargeting": rel.get("countryTargeting"),
        "releaseNotesCount": len(rel.get("releaseNotes", [])),
    }


def main():
    _commit_flag, cfg_path = C.parse_args(sys.argv[1:])
    cfg = C.load_config(cfg_path)
    g = cfg["google"]
    pkg = g["packageName"]
    C.log(f"=== Google Play Track 状態取得 / {cfg['appName']} ({pkg}) ===")

    token = C.google_token(g)
    C.log("  ✅ 認証OK")

    edit_id = get_edits_id(token, pkg)
    C.log(f"  ✅ edit セッション開始 (id={edit_id[:12]}...)")
    try:
        tracks = list_tracks(token, pkg, edit_id)
        for t in tracks.get("tracks", []):
            track_name = t.get("track", "?")
            releases = t.get("releases", [])
            C.log(f"\n--- track: {track_name} ---")
            if not releases:
                C.log("  (release なし)")
                continue
            for i, rel in enumerate(releases):
                summary = summarize_release(rel)
                C.log(f"  release[{i}]:")
                C.log(f"    name: {summary['name']}")
                C.log(f"    status: {summary['status']}")
                if summary["userFraction"] is not None:
                    C.log(f"    userFraction (rollout %): {summary['userFraction']}")
                C.log(f"    versionCodes: {summary['versionCodes']}")
                ct = summary["countryTargeting"]
                if ct is None:
                    C.log("    countryTargeting: なし (= 全世界対象)")
                else:
                    included = ct.get("countries", [])
                    include_rest = ct.get("includeRestOfWorld", False)
                    C.log(f"    countryTargeting.countries (= {len(included)} 国): {included}")
                    C.log(f"    countryTargeting.includeRestOfWorld: {include_rest}")
                    if "JP" in included:
                        C.log("    ✅ JP (日本) 含まれる")
                    elif include_rest:
                        C.log("    ✅ JP (日本) 含まれる (= includeRestOfWorld=true 経由)")
                    else:
                        C.log("    ❌ JP (日本) が countries に含まれていない")
                C.log(f"    releaseNotesCount: {summary['releaseNotesCount']}")
    finally:
        commit_edit(token, pkg, edit_id)


if __name__ == "__main__":
    main()
