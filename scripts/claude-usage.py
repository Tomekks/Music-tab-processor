#!/usr/bin/env python3
"""Claude token use from the session transcripts (mechanical, no model involved).
Each assistant message is logged several times, so every message id is counted once.
Usage: claude-usage.py days [N]            one line per local day, last N days (default all)
       claude-usage.py windows E1 E2 ...   one line per consecutive pair of epoch seconds
Columns: msgs, output tokens, cache-creation tokens, cache-read tokens (cheap), fresh input tokens.
Transcripts: $CLAUDE_TRANSCRIPTS or ~/.claude/projects/*-guitar-tab-processor* (worktree sessions included)."""
import glob, json, os, sys, time
from datetime import datetime

def messages():
    root = os.environ.get("CLAUDE_TRANSCRIPTS") or os.path.expanduser("~/.claude/projects/*-guitar-tab-processor*")
    seen, out = set(), []
    for path in glob.glob(os.path.join(root, "**", "*.jsonl"), recursive=True):
        for line in open(path, errors="replace"):
            if '"usage"' not in line:
                continue
            try:
                d = json.loads(line)
            except ValueError:
                continue
            m = d.get("message")
            if not isinstance(m, dict) or not m.get("usage") or not m.get("id") or m["id"] in seen:
                continue
            seen.add(m["id"])
            u = m["usage"]
            try:
                ts = datetime.fromisoformat(d["timestamp"].replace("Z", "+00:00")).timestamp()
            except (KeyError, ValueError):
                continue
            out.append((ts, [u.get("output_tokens") or 0, u.get("cache_creation_input_tokens") or 0,
                             u.get("cache_read_input_tokens") or 0, u.get("input_tokens") or 0]))
    return out

def fmt(n, v): return f"{n:5d} msgs  out {v[0]:>9,}  cache-create {v[1]:>10,}  cache-read {v[2]:>12,}  fresh {v[3]:>6,}"

def main(argv):
    cmd = argv[1] if len(argv) > 1 else ""
    msgs = messages()
    if cmd == "days":
        days = {}
        for ts, v in msgs:
            day = time.strftime("%Y-%m-%d", time.localtime(ts))
            n, tot = days.setdefault(day, [0, [0, 0, 0, 0]])
            days[day][0] += 1
            for i in range(4): tot[i] += v[i]
        keep = sorted(days)[-int(argv[2]):] if len(argv) > 2 else sorted(days)
        for d in keep: print(d, fmt(days[d][0], days[d][1]))
    elif cmd == "windows" and len(argv) >= 4:
        e = [float(x) for x in argv[2:]]
        for a, b in zip(e, e[1:]):
            tot, n = [0, 0, 0, 0], 0
            for ts, v in msgs:
                if a < ts <= b:
                    n += 1
                    for i in range(4): tot[i] += v[i]
            print(fmt(n, tot))
    else:
        print(__doc__); return 2
    return 0

if __name__ == "__main__":
    sys.exit(main(sys.argv))
