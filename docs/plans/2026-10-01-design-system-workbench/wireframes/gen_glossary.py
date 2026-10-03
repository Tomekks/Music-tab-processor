#!/usr/bin/env python3
"""Glossary wireframe from the real CONTEXT.md terms. Usage: python3 gen_glossary.py"""
import json, os, re
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, "../../../../CONTEXT.md")).read()
lang = src.split("## Language")[1]
groups, cur = [], None
for line in lang.split("\n"):
    if line.startswith("### "): cur = [line[4:].strip(), []]; groups.append(cur); continue
    m = re.match(r"\*\*(.+?)\*\*(?: \((.*?)\))?:$", line)
    if m:
        if cur is None: cur = ["Brands", []]; groups.append(cur)
        cur[1].append({"term": m.group(1), "note": m.group(2), "def": [], "avoid": ""})
    elif cur and cur[1]:
        term = cur[1][-1]
        if line.startswith("_Avoid_:"): term["avoid"] = line[len("_Avoid_:"):].strip(); term["in_avoid"] = True
        elif line.strip() and term.get("in_avoid"): term["avoid"] += " " + line.strip()
        elif line.strip(): term["def"].append(line.strip())
for g in groups:
    for t_ in g[1]: t_["def"] = " ".join(t_["def"])

def t(n, v=None, h=24, **k):
    x = {"name": n, "type": "text", "height": h}
    if v: x["variant"] = v
    x.update(k); return x
def icon(n): return {"name": n, "type": "icon", "width": 20, "height": 20}
def term_card(x, editing=False):
    title = {"name": "Title row", "direction": "horizontal", "justify": "space-between", "align": "center", "children": [
        {"name": "Term + marker", "direction": "horizontal", "gap": 8, "align": "center", "children": [
            t(x["term"] + (" (" + x["note"] + ")" if x["note"] else ""), "heading", 32)] + ([t("edited", "caption", 16)] if editing else [])},
        {"name": "Done / Cancel" if editing else "pencil icon (lucide pencil) - click to edit", "type": "link" if editing else "icon", **({"height": 24} if editing else {"width": 20, "height": 20})}]}
    if editing:
        body = [{"name": x["def"][:230] + "  [editable text box]", "type": "input", "height": 120},
                {"name": "Avoid: " + x["avoid"] + "  [editable]", "type": "input", "height": 40},
                t("Saved with Save, like a token edit. The term name is fixed.", "caption", 16)]
    else:
        body = [t(x["def"][:300] + ("..." if len(x["def"]) > 300 else ""), None, 72)] + ([t("Avoid: " + x["avoid"], "caption", 16)] if x["avoid"] else [])
    c = {"name": "Term: " + x["term"], "direction": "vertical", "gap": 8, "padding": 16, "children": [title] + body}
    if editing: c["type"] = "card"
    return c

content = []
for gname, terms in groups:
    content.append({"name": "Group: " + gname, "direction": "vertical", "gap": 12, "children": [t(gname, "heading", 32)] + [term_card(x, editing=(x["term"] == "Variant")) for x in terms]})
    content.append({"name": "Divider " + gname, "type": "divider"})
content = content[:-1]

d = json.load(open(os.path.join(here, "workbench-structure-v10.wireframe.json")))
d["name"] = "Design System Workbench - Glossary v1 (real terms)"
top = d["root"]["children"][0]
top["children"][0]["name"] = "Design System - brand: default (switcher)"
body = d["root"]["children"][2]
side, _, canvas, _, insp = body["children"]
side["name"] = "Left Sidebar (fixed in view; its list scrolls inside this column)"
for c in side["children"]:
    if c["name"] == "Top Sections":
        for l in c["children"]:
            if l["name"] == "Glossary": l.update(name="Glossary (selected)", type="button")
    if c["name"].startswith("Components"):
        c["name"] = "Components (A-Z, scrolls within the sidebar)"
        c["children"] = [c["children"][0]] + [{"name": n, "type": "link", "height": 48} for n in ["Button", "Color Field", "Icon Button", "Segmented Control", "Slider"]]
canvas["name"] = "Canvas (sticky header stays; terms scroll inside this column). The inspector column is hidden on this page."
canvas["children"] = [
    {"name": "Canvas Header (sticky)", "direction": "vertical", "gap": 8, "children": [
        t("Glossary", "caption", 16),
        {"name": "Title row", "direction": "horizontal", "gap": 8, "align": "center", "children": [t("Glossary", "display", 48), icon("? help icon (lucide circle-help) - hover: The words this design system uses. Edit a term with its pencil; saved with Save.")]},
        {"name": "Jump links", "direction": "horizontal", "gap": 16, "children": [{"name": g[0], "type": "link", "height": 24} for g in groups]}]},
    {"name": "Sticky Divider", "type": "divider"},
    {"name": "Canvas Content (scrolls)", "direction": "vertical", "gap": 24, "grow": True, "children": content}]
# no inspector on the Glossary page
body["children"] = [side, body["children"][1], canvas]
json.dump(d, open(os.path.join(here, "glossary-v1.wireframe.json"), "w"), indent=2)
print(sum(len(g[1]) for g in groups), "terms:", [g[0] for g in groups])
