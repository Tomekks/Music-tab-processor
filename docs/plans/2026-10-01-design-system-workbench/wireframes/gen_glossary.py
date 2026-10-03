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
    x = {"name": n, "type": "text"}
    if h: x["height"] = h
    if v: x["variant"] = v
    x.update(k); return x
def icon(n): return {"name": n, "type": "icon", "width": 20, "height": 20}
def term_card(x, editing=False, new=False):
    label = x["term"] + (" (" + x["note"] + ")" if x["note"] else "")
    if editing or new:
        actions = {"name": "Actions", "direction": "horizontal", "gap": 8, "align": "center", "children": [
            {"name": "Save", "type": "button", "height": 32}, icon("x icon (lucide x) - cancel")]}
    else:
        actions = icon("pencil icon (lucide pencil) - click to edit")
    head = [{"name": "Name block", "direction": "horizontal", "gap": 8, "align": "center", "children": (
        [{"name": "New term name", "type": "input", "height": 32, "width": 240}, {"name": "Group (Brands / Tokens and structure) v", "type": "input", "height": 32, "width": 240}]
        if new else [t(label, None, 24)] + ([t("edited", "caption", 16)] if editing else []))}, actions]
    title = {"name": "Title row", "direction": "horizontal", "justify": "space-between", "align": "center", "children": head}
    if editing or new:
        body = [{"name": "" if new else x["def"][:260], "type": "input", "height": 72},
                {"name": "" if new else "Avoid: " + x["avoid"], "type": "input", "height": 32}]
        if new: body[0]["name"] = "Definition"; body[1]["name"] = "Avoid: (words not to use, comma separated)"
    else:
        body = [t(x["def"][:300] + ("..." if len(x["def"]) > 300 else ""), None, None)] + ([t("Avoid: " + x["avoid"], "caption", 16)] if x["avoid"] else [])
    c = {"name": "Term: " + x["term"], "direction": "vertical", "gap": 4, "padding": [8, 16], "children": [title] + body}
    return c

content = []
for gname, terms in groups:
    content.append({"name": "Group: " + gname, "direction": "vertical", "gap": 4, "children": [t(gname, "heading", 32)] + [term_card(x, editing=(x["term"] == "Variant")) for x in terms] + ([term_card({"term": "(new term)", "note": None, "def": "", "avoid": ""}, new=True)] if gname.startswith("Tokens") else [])})
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
        {"name": "Title row", "direction": "horizontal", "justify": "space-between", "align": "center", "children": [
            {"name": "Title with help", "direction": "horizontal", "gap": 8, "align": "center", "children": [t("Glossary", "display", 48), icon("? help icon (lucide circle-help) - hover: The words this design system uses. Edit a term with its pencil; saved with Save.")]},
            {"name": "+ Add term", "type": "button", "height": 40}]},
        {"name": "Jump links", "direction": "horizontal", "gap": 16, "children": [{"name": g[0], "type": "link", "height": 24} for g in groups]}]},
    {"name": "Sticky Divider", "type": "divider"},
    {"name": "Canvas Content (scrolls)", "direction": "vertical", "gap": 24, "grow": True, "children": content}]
# no inspector on the Glossary page
body["children"] = [side, body["children"][1], canvas]
json.dump(d, open(os.path.join(here, "glossary-v1.wireframe.json"), "w"), indent=2)
print(sum(len(g[1]) for g in groups), "terms:", [g[0] for g in groups])
