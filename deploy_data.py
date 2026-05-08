import subprocess
import shutil
import os
import json

def run_script():
    print("Running run_daily_calc.py...")
    subprocess.run(["python3", "run_daily_calc.py"], check=True)

def copy_files():
    print("Copying JSON files...")
    target_dir = "../stock-analysis"
    shutil.copy("breadth.json", target_dir)
    _write_updated_at(os.path.join(target_dir, "breadth.json"),
                      os.path.join(target_dir, "breadth.updated_at.txt"))

    target_scores = os.path.join(target_dir, "scores.json")
    watchlist = []
    old_stocks = {}  # sym -> stock entry from existing scores.json
    if os.path.exists(target_scores):
        try:
            with open(target_scores) as f:
                existing = json.load(f)
            watchlist = existing.get("stocks", {}).get("watchlist", [])
            for cat, stocks in existing.get("stocks", {}).items():
                if isinstance(stocks, list):
                    for s in stocks:
                        if "sym" in s:
                            old_stocks[s["sym"]] = s
        except Exception:
            pass

    with open("scores.json") as f:
        new_data = json.load(f)

    # Carry forward and accumulate historical scores (up to 20 entries each)
    for cat, stocks in new_data.get("stocks", {}).items():
        if not isinstance(stocks, list):
            continue
        for stock in stocks:
            sym = stock.get("sym")
            if not sym:
                continue
            old = old_stocks.get(sym, {})
            hist_w = list(old.get("history_weekly", []))
            if "weekly" in old:
                hist_w.append(old["weekly"])
            stock["history_weekly"] = hist_w[-20:]
            hist_d = list(old.get("history_daily", []))
            if "daily" in old:
                hist_d.append(old["daily"])
            stock["history_daily"] = hist_d[-20:]

    new_data.setdefault("stocks", {})["watchlist"] = watchlist

    with open(target_scores, "w") as f:
        json.dump(new_data, f, indent=2)
    _write_updated_at(target_scores,
                      os.path.join(target_dir, "scores.updated_at.txt"))

def _write_updated_at(json_path, out_path):
    """Emit a tiny pointer file containing the JSON's updated_at value.
    Clients poll this cheap file and only re-download the full JSON when it changes."""
    try:
        with open(json_path) as f:
            data = json.load(f)
        stamp = str(data.get("updated_at", "")).strip()
    except Exception:
        stamp = ""
    with open(out_path, "w") as f:
        f.write(stamp)

def git_operations():
    print("Committing and pushing in ../stock-analysis...")
    target_dir = "../stock-analysis"
    
    # Change directory to target_dir for git commands
    original_dir = os.getcwd()
    os.chdir(target_dir)
    
    subprocess.run(["git", "add",
                    "breadth.json", "scores.json",
                    "breadth.updated_at.txt", "scores.updated_at.txt"], check=True)
    subprocess.run(["git", "commit", "-m", "Update data: breadth.json and scores.json"], check=True)
    subprocess.run(["git", "push", "origin"], check=True)
    
    os.chdir(original_dir)

def main():
    try:
        run_script()
        copy_files()
        git_operations()
        print("Done successfully.")
    except Exception as e:
        print(f"Error occurred: {e}")

if __name__ == "__main__":
    main()
