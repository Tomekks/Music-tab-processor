#!/usr/bin/env python3
"""Generate the Foundations wireframes from the real default-brand tokens (all values, no 'N more rows').
Usage: python3 gen_foundations.py   -> foundations-v5 (Main brand) and child-brand-dark-v2 (demo-child, dark)."""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
tok = json.load(open(os.path.join(here, "../../../../app/packages/design-system/brands/default/tokens.json")))
prim = {k: v["$value"] for k, v in tok["primitive"]["color"].items()}
def val(v):
    v = v["$value"]
    if v.startswith("{primitive.color."): return prim[v[len("{primitive.color."):-1]].upper()
    if v.startswith("{semantic.color."): return tok["semantic"]["color"][v[len("{semantic.color."):-1]]["$value"]
    return v
def hexv(v):
    v = v["$value"] if isinstance(v, dict) else v
    while v.startswith("{"):
        path = v[1:-1].split(".")
        node = tok
        for part in path: node = node[part]
        v = node["$value"]
    return v.upper() if v.startswith("#") else v
dark = {k: hexv(v) for k, v in tok["dark"]["semantic"]["color"].items()}

def t(n, v=None, h=24, **k):
    x = {"name": n, "type": "text", "height": h}
    if v: x["variant"] = v
    x.update(k); return x
def help_icon(tip): return {"name": "? help icon (lucide circle-help) - hover: " + tip, "type": "icon", "width": 20, "height": 20}
def head(title, tip, variant="heading", h=32):
    return {"name": "Heading row: " + title, "direction": "horizontal", "gap": 8, "align": "center",
            "children": [t(title, variant=variant, h=h), help_icon(tip)]}
def info_icon(desc):
    tip = ("hover: " + desc) if desc else "empty: no description yet, click to add one"
    return {"name": "info icon (lucide info) - " + tip, "type": "icon", "width": 20, "height": 20}
def toggle(on): return {"name": "on" if on else "off", "type": "input", "width": 72, "height": 28}

def row(name, value, desc, kind, child=None, selected=False):
    """child: None (Main brand) | 'inherited' | 'overridden'"""
    ch = [t(name + (" (selected)" if selected else ""), h=24, width=190)]
    if kind == "color":
        ch += [{"name": "swatch " + value, "type": "icon", "width": 32, "height": 32}, t(value, "caption", 16, width=64)]
    else:
        if kind == "pct":
            # one value with a unit switch (px = fixed, % = share of the window width)
            ch += [{"name": value.replace("px", ""), "type": "input", "height": 32, "width": 72},
                   {"name": "px  v  (or %)", "type": "input", "height": 32, "width": 96}]
        else:
            w = 200 if kind == "font" else 96
            ch += [{"name": value, "type": "input", "height": 32, "width": w}]
    ch.append(info_icon(desc))
    ch.append({"name": " ", "grow": True, "height": 1})
    if child:
        if child == "overridden": ch.append({"name": "Revert", "type": "link", "height": 24, "width": 50})
        else: ch.append({"name": " ", "width": 50, "height": 1})
        ch.append(toggle(child == "inherited"))
    return {"name": "Row " + name + (" [" + child + "]" if child else ""), "direction": "horizontal", "gap": 12,
            "align": "center", "height": 40, "children": ch}

def sections(child=None, mode="light", overrides=()):
    S = []
    def add(title, tip, rows): S.append({"name": "Section: " + title, "direction": "vertical", "gap": 8,
                                         "children": [head(title, tip)] + rows}); S.append({"name": "Divider " + title, "type": "divider"})
    def st(path): return "overridden" if (child and path in overrides) else ("inherited" if child else None)
    rows = []
    for k, v in tok["semantic"]["color"].items():
        shown = dark.get(k, hexv(v)) if mode == "dark" else hexv(v)
        if child and k == "accent" and mode == "dark": shown = "#7C5CE0"
        rows.append(row(k, shown, v.get("$description", "")[:88], "color", st("color." + k), selected=(k == "accent")))
    add("Color", "semantic.color: swatch, hex and one-line use. Select a row to edit it in the inspector.", rows)
    add("State", "semantic.state: opacities shared by hover, pressed, focus, disabled, muted and loop.",
        [row(k, v["$value"], v.get("$description", "")[:88], "num", st("state." + k)) for k, v in tok["semantic"]["state"].items()])
    add("Focus ring", "semantic.focus: one ring style for every interactive Component.",
        [row(k, hexv(v) if k == "ringColor" else v["$value"], v.get("$description", "")[:88], "color" if k == "ringColor" else "num", st("focus." + k)) for k, v in tok["semantic"]["focus"].items()])
    add("Radius", "semantic.radius", [row(k, v["$value"], v.get("$description", "")[:88], "num", st("radius." + k)) for k, v in tok["semantic"]["radius"].items()])
    add("Space", "semantic.space: seven steps.", [row(k, v["$value"], "Space step " + k, "num", st("space." + k)) for k, v in tok["semantic"]["space"].items()])
    add("Typography", "semantic.typography: the two font families. Text styles come in slice 3.",
        [row(k, v["$value"].replace("var(--font-geist-", "Geist ").replace(")", "").replace("sans", "Sans").replace("mono", "Mono"), v.get("$description", "")[:88], "font", st("typography." + k)) for k, v in tok["semantic"]["typography"].items()])
    add("Layout", "semantic.layout", [row(k, v["$value"], v.get("$description", "")[:88], "pct", st("layout." + k)) for k, v in tok["semantic"]["layout"].items()])
    return S[:-1]

def shell(name, brand, mode, child, inspector, overrides=()):
    d = json.load(open(os.path.join(here, "workbench-structure-v10.wireframe.json")))
    d["name"] = name
    top = d["root"]["children"][0]
    top["children"][0]["name"] = "Design System - brand: " + brand + " (switcher)"
    top["children"][1]["name"] = "Mode toggle (" + mode + " active)"
    body = d["root"]["children"][2]
    side, _, canvas, _, insp = body["children"]
    side["name"] = "Left Sidebar (fixed in view; its list scrolls inside this column)"
    for c in side["children"]:
        if c["name"] == "Top Sections":
            for l in c["children"]:
                if l["name"] == "Foundations": l.update(name="Foundations (selected)", type="button")
        if c["name"].startswith("Components"):
            c["name"] = "Components (A-Z, scrolls within the sidebar)"
            c["children"] = [c["children"][0]] + [{"name": n, "type": "link", "height": 48} for n in ["Button", "Color Field", "Icon Button", "Segmented Control", "Slider"]]
    sticky = [t("Foundations", "caption", 16), head("Foundations", "Shared values every Component reads, generated from the brand tokens.", "display", 48),
              {"name": "Jump links", "direction": "horizontal", "gap": 16, "children": [{"name": n, "type": "link", "height": 24} for n in ["Color", "State", "Focus ring", "Radius", "Space", "Typography", "Layout"]]}]
    if child:
        sticky.append({"name": "Column heading row", "direction": "horizontal", "justify": "flex-end", "children": [t("From Main", "caption", 16, width=72)]})
    canvas["name"] = "Canvas (sticky header stays; the content below scrolls inside this column)"
    canvas["children"] = [
        {"name": "Canvas Header (sticky: crumbs, title, links" + (", column heading" if child else "") + ")", "direction": "vertical", "gap": 8, "children": sticky},
        {"name": "Sticky Divider", "type": "divider"},
        {"name": "Canvas Content (scrolls)", "direction": "vertical", "gap": 24, "grow": True, "children": sections(child, mode.split()[0], overrides)}]
    insp["name"] = "Right Inspector (fixed in view; scrolls inside this column if tall)"
    insp["children"] = inspector
    return d

def pickrow(label, ph): return {"name": label + " row", "direction": "horizontal", "gap": 8, "align": "center", "children": [t(label, width=96), {"name": ph, "type": "input", "height": 40, "grow": True}, {"name": " ", "type": "input", "width": 40, "height": 40}]}
used = {"name": "Used by section", "direction": "vertical", "gap": 4, "children": [
    {"name": "Used by header row", "direction": "horizontal", "justify": "space-between", "align": "center", "children": [t("Used by (4)  - expandable, generated"), {"name": "chevron", "type": "icon", "width": 20, "height": 20}]},
    {"name": "Expanded list: each row opens that Component page with the Variant selected", "direction": "vertical", "children": [
        {"name": n, "type": "link", "height": 32} for n in ["Button / Primary - background", "Button / Primary - hover mix (code, not a token)", "Slider - fill", "Segmented Control / Selected - background"]]}]}
desc = lambda s: {"name": "Description section", "direction": "vertical", "gap": 8, "children": [t(s), {"name": tok["semantic"]["color"]["accent"]["$description"][:140], "type": "input", "height": 96}]}
hdr = lambda right: {"name": "Inspector Header", "direction": "vertical", "gap": 4, "children": [
    {"name": "Title Row", "direction": "horizontal", "justify": "space-between", "align": "center", "children": [
        {"name": "Title with info", "direction": "horizontal", "gap": 8, "align": "center", "children": [t("accent", "heading", 32),
            {"name": "info icon (lucide info) - hover shows the description, click opens it to edit", "type": "icon", "width": 20, "height": 20}]},
        {"name": right, "type": "link", "height": 24}]},
    t("Foundations / Color / semantic.color.accent", "caption", 16)]}

main_insp = [hdr("Reset to default"), {"name": "Header Divider", "type": "divider"},
             {"name": "Value section", "direction": "vertical", "gap": 12, "children": [t("Value"), pickrow("Light", hexv(tok["semantic"]["color"]["accent"])), pickrow("Dark", dark.get("accent", hexv(tok["semantic"]["color"]["accent"])))]},
             {"name": "Section Divider", "type": "divider"}, used]
def val_block(label, hv, note, from_main):
    return {"name": label + " block", "direction": "vertical", "gap": 8, "children": [
        {"name": label + " header", "direction": "horizontal", "justify": "space-between", "align": "center", "children": [t(label), {"name": "From Main: " + ("on" if from_main else "off"), "type": "input", "height": 28, "width": 120}]},
        {"name": label + " value row", "direction": "horizontal", "gap": 8, "align": "center", "children": [{"name": hv, "type": "input", "height": 40, "grow": True}, {"name": " ", "type": "input", "width": 40, "height": 40}]},
        t(note, "caption", 16)]}
child_insp = [hdr("Revert to Main"), {"name": "Header Divider", "type": "divider"},
              {"name": "Values", "direction": "vertical", "gap": 16, "children": [
                  val_block("Light", "#4A90D9", "Own value. Main: #AE97F7", False),
                  val_block("Dark (editing now)", "#7C5CE0", "Own value. Turn From Main on to inherit without losing it.", False)]},
              {"name": "Section Divider", "type": "divider"}, used]

json.dump(shell("Design System Workbench - Foundations v5 (all real tokens)", "default", "light", None, main_insp),
          open(os.path.join(here, "foundations-v5.wireframe.json"), "w"), indent=2)
json.dump(shell("Design System Workbench - Child brand, dark mode v2", "demo-child (child of default)", "dark", "x", child_insp, overrides=("color.accent",)),
          open(os.path.join(here, "child-brand-dark-v2.wireframe.json"), "w"), indent=2)
