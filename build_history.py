"""
One-time script: backfill history_weekly / history_daily into scores.json
by replaying all git commits that touched scores.json (oldest → newest).

Run once from the stock-analysis directory:
    python3 build_history.py
"""
import subprocess
import json
import os

SCORES_FILE = "scores.json"
MAX_HISTORY = 20


def git_log_commits():
    result = subprocess.run(
        ["git", "log", "--format=%H %ai", "--", SCORES_FILE],
        capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__))
    )
    lines = [l.strip() for l in result.stdout.strip().splitlines() if l.strip()]
    # Return oldest first
    return list(reversed(lines))


def get_scores_at(commit_hash):
    result = subprocess.run(
        ["git", "show", f"{commit_hash}:{SCORES_FILE}"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        return None
    try:
        return json.loads(result.stdout)
    except Exception:
        return None


def main():
    commits = git_log_commits()
    print(f"Found {len(commits)} commits touching {SCORES_FILE}")

    # histories[sym] = {"weekly": [...], "daily": [...]}
    histories = {}

    for i, line in enumerate(commits):
        parts = line.split(" ", 1)
        h = parts[0]
        date_str = parts[1] if len(parts) > 1 else "?"
        data = get_scores_at(h)
        if not data:
            print(f"  [{i+1}/{len(commits)}] {h[:8]} — skip (parse error)")
            continue
        count = 0
        for cat, stocks in data.get("stocks", {}).items():
            if not isinstance(stocks, list):
                continue
            for s in stocks:
                sym = s.get("sym")
                if not sym:
                    continue
                if sym not in histories:
                    histories[sym] = {"weekly": [], "daily": []}
                if "weekly" in s:
                    histories[sym]["weekly"].append(s["weekly"])
                if "daily" in s:
                    histories[sym]["daily"].append(s["daily"])
                count += 1
        print(f"  [{i+1}/{len(commits)}] {h[:8]} {date_str[:10]} — {count} stocks")

    # Load current scores.json and inject accumulated histories
    with open(SCORES_FILE) as f:
        current = json.load(f)

    injected = 0
    for cat, stocks in current.get("stocks", {}).items():
        if not isinstance(stocks, list):
            continue
        for stock in stocks:
            sym = stock.get("sym")
            if not sym or sym not in histories:
                continue
            h = histories[sym]
            # Keep last MAX_HISTORY entries; exclude the very last (= current score)
            stock["history_weekly"] = h["weekly"][-MAX_HISTORY-1:-1] if len(h["weekly"]) > 1 else []
            stock["history_daily"]  = h["daily"][-MAX_HISTORY-1:-1]  if len(h["daily"])  > 1 else []
            injected += 1

    with open(SCORES_FILE, "w") as f:
        json.dump(current, f, indent=2)

    print(f"\nDone. Injected history for {injected} stock entries into {SCORES_FILE}.")
    unique_syms = len(histories)
    max_pts = max((len(v["weekly"]) for v in histories.values()), default=0)
    print(f"Unique symbols with history: {unique_syms}, max data points: {max_pts}")


if __name__ == "__main__":
    main()
