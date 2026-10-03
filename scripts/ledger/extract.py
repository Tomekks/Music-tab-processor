#!/usr/bin/env python3
"""Rule-ledger step 1: pull rule-like lines out of the docs. Read-only, no model.

Writes docs/work/ledger/rules.tsv and incidents.tsv. Columns:
  id  source  file:line  section  dup_of  text
`dup_of` is the id of an earlier near-identical line (difflib >= 0.88), so the
classifier only has to judge each distinct rule once.
Re-runnable; it overwrites its own output only.
"""
import difflib
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MEM = Path.home() / ".claude/projects/-Users-tomsvarpins-Projects-guitar-tab-processor/memory"
OUT = ROOT / "docs/work/ledger"

RULE = re.compile(r"\b(never|always|must|do not|don.t|only|no exceptions|required|forbidden|stop and)\b", re.I)
INCIDENT = re.compile(r"\b(incident|observed|root cause|regress\w*|crash\w*|silently|lesson|bug|broke|failed|shipped)\b", re.I)

# Rule sources: (glob relative to ROOT, label)
RULE_SOURCES = [
    ("AGENTS.md", "agents"), ("app/AGENTS.md", "agents"), ("START_HERE.md", "agents"),
    ("pipeline/VERIFY.md", "process"), ("app/STATUS.md", "state"),
    ("docs/*.md", "docs"), ("docs/web-app-workflow/*.md", "process"), ("docs/decisions/*.md", "decision"),
]
SKIP = {"DRIFT_LOG_archive.md"}
INCIDENT_SOURCES = ["docs/plans/**/*.md", "docs/decisions/*.md", "docs/web-app-workflow/*.md", "docs/DRIFT_LOG*.md", "app/STATUS.md"]


def norm(s):
    return re.sub(r"[^a-z0-9 ]+", "", s.lower()).strip()


def lines_of(path):
    """Yield (lineno, section, text) for body lines; tracks the nearest heading."""
    section, in_front = "", False
    for i, raw in enumerate(path.read_text(errors="replace").splitlines(), 1):
        if i == 1 and raw.strip() == "---":
            in_front = True
            continue
        if in_front:
            in_front = raw.strip() != "---"
            continue
        if raw.startswith("#"):
            section = raw.lstrip("# ").strip()[:60]
            continue
        text = re.sub(r"\s+", " ", raw.replace("\t", " ")).strip(" -*>|")
        if len(text) < 25 or set(text) <= set("-|: "):
            continue
        yield i, section, text[:300]


def collect(patterns, regex, label_of):
    rows = []
    for pat in patterns:
        for p in sorted(ROOT.glob(pat)):
            if p.name in SKIP or not p.is_file():
                continue
            for i, sec, text in lines_of(p):
                if regex.search(text):
                    rows.append((label_of(pat), f"{p.relative_to(ROOT)}:{i}", sec, text))
    return rows


def write(name, rows, prefix):
    seen, out = [], []
    for n, (src, loc, sec, text) in enumerate(rows, 1):
        rid, key, dup = f"{prefix}{n:03d}", norm(text), ""
        for oid, okey in seen:
            if difflib.SequenceMatcher(None, key, okey).quick_ratio() >= 0.88 and \
               difflib.SequenceMatcher(None, key, okey).ratio() >= 0.88:
                dup = oid
                break
        seen.append((rid, key))
        out.append("\t".join([rid, src, loc, sec, dup, text]))
    (OUT / name).write_text("id\tsource\tfile:line\tsection\tdup_of\ttext\n" + "\n".join(out) + "\n")
    return len(out), sum(1 for r in out if r.split("\t")[4])


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    label = dict(RULE_SOURCES)
    rules = collect([s for s, _ in RULE_SOURCES], RULE, lambda pat: label[pat])

    # Memory notes and user-level CLAUDE.md: one row per file (each is a rule), read-only.
    extra = []
    for p in sorted(MEM.glob("*.md")) if MEM.exists() else []:
        if p.name == "MEMORY.md":
            continue
        m = re.search(r"^description:\s*(.+)$", p.read_text(errors="replace"), re.M)
        if m:
            extra.append(("memory", f"~/.claude/.../memory/{p.name}:1", "", m.group(1).strip()[:300]))
    user_md = Path.home() / ".claude/CLAUDE.md"
    if user_md.exists():
        for i, sec, text in lines_of(user_md):
            extra.append(("user-claude-md", f"~/.claude/CLAUDE.md:{i}", sec, text))

    n, d = write("rules.tsv", rules + extra, "R")
    print(f"rules.tsv: {n} rows ({len(rules)} from repo docs, {len(extra)} from memory/user config), {d} near-duplicates")

    inc = collect(INCIDENT_SOURCES, INCIDENT, lambda pat: "incident")
    n, d = write("incidents.tsv", inc, "I")
    print(f"incidents.tsv: {n} rows, {d} near-duplicates")


if __name__ == "__main__":
    sys.exit(main())
