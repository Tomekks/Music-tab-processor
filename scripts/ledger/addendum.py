#!/usr/bin/env python3
"""Ledger addendum: the keyword net missed rules that use no trigger word.
Appends every substantive line of the two core files that is not already in
rules.tsv as new rows (continuing the id sequence), so existing ids never change.
Idempotent: lines already present are skipped.
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TSV = ROOT / "docs/work/ledger/rules.tsv"
FILES = ["AGENTS.md", "app/AGENTS.md"]

rows = TSV.read_text().splitlines()
have = {r.split("\t")[2] for r in rows[1:]}
nxt = max(int(r.split("\t")[0][1:]) for r in rows[1:]) + 1
added = []
for f in FILES:
    section = ""
    for i, raw in enumerate((ROOT / f).read_text().splitlines(), 1):
        if raw.startswith("#"):
            section = raw.lstrip("# ").strip()[:60]
            continue
        text = re.sub(r"\s+", " ", raw.replace("\t", " ")).strip(" -*>|")
        if len(text) < 40 or f"{f}:{i}" in have:
            continue
        added.append("\t".join([f"R{nxt:03d}", "agents-addendum", f"{f}:{i}", section, "", text[:300]]))
        nxt += 1
TSV.write_text("\n".join(rows + added) + "\n")
print(f"added {len(added)} rows (ids up to R{nxt - 1:03d})")
