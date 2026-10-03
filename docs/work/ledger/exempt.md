# Exempt and dropped rule ids (2026-10-02)

`scripts/check-rules.sh` treats these KEEP/MERGE ids as accounted for without a `covers:` line.

## Product facts (live in the decision docs, not agent rules)
R043 R053 R060 R061 R062 R174 R175 R177 R181 R182 R186 R194 R195

## Already recorded elsewhere
- Claude memory or global CLAUDE.md: R198 R209 R215 R217 R218
- Decision rationale (docs/decisions/0009): R192
- Backlog header (standing rule already there): R044

## Claimed later
R107 R108 R109 are claimed in step E (the `/review` command).

## Dropped
R079 (file names standing alone): matches owner ruling 15; treat as DROP.
