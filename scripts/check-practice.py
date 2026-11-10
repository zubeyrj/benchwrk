"""Checks every imported library coding problem with CPython and numpy: the reference solution
must pass all checks and the starter must fail at least one. Run: python3 scripts/check-practice.py"""
import json, os, sys, tempfile, glob
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
lib = os.path.join(root, "content", "aefs", "practice")
work = tempfile.mkdtemp()
with open(os.path.join(lib, "practice_check.txt")) as f: open(os.path.join(work, "practice_check.py"), "w").write(f.read())
sys.path.insert(0, work)
import practice_check
bad = []
files = sorted(glob.glob(os.path.join(lib, "*.json")))
for path in files:
    p = json.load(open(path)); d = os.path.join(work, p["id"]); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "tests.py"), "w").write(p["tests"])
    if p.get("support"): open(os.path.join(d, "support.py"), "w").write(p["support"])
    sol = json.loads(practice_check.evaluate_json(p["solution"], os.path.join(d, "tests.py"), p.get("fixtures", ""), "", 60))
    st = json.loads(practice_check.evaluate_json(p["starter"], os.path.join(d, "tests.py"), p.get("fixtures", ""), "", 60))
    if not sol["summary"]["ok"]: bad.append(p["id"] + ": the solution fails " + str(sol["summary"]["failed"]) + " checks " + str([r["name"] + ": " + r["message"][:80] for r in sol["results"] if r["status"] != "pass"][:2]))
    if st["summary"]["ok"]: bad.append(p["id"] + ": the starter already passes")
print("\n".join(bad) if bad else "Practice: all %d problems verified (solution passes, starter fails)" % len(files))
sys.exit(1 if bad else 0)
