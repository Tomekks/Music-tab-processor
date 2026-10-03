#!/usr/bin/env python3
"""Cmd+K palette wireframe (two states side by side) from real names. Usage: python3 gen_palette.py"""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
def t(n, v=None, h=24, **k):
    x = {"name": n, "type": "text", "height": h}
    if v: x["variant"] = v
    x.update(k); return x
def row(label, kind, selected=False, swatch=None, marker=None, sub=None):
    left = [t(label + (" (selected)" if selected else ""), h=24)]
    kids = []
    if swatch: kids.append({"name": "swatch " + swatch, "type": "icon", "width": 24, "height": 24})
    kids.append({"name": "Label block", "direction": "vertical", "gap": 2, "grow": True, "children": left + ([t(sub, "caption", 16)] if sub else [])})
    right = [t(kind, "caption", 16)] + ([t(marker, "caption", 16)] if marker else [])
    kids.append({"name": "Meta", "direction": "vertical", "gap": 2, "align": "flex-end", "children": right})
    r = {"name": "Result: " + label, "direction": "horizontal", "gap": 12, "align": "center", "padding": [8, 12], "children": kids}
    if selected: r["type"] = "card"; r["name"] = "Result (selected): " + label
    return r
def group(title, rows): return {"name": "Group: " + title, "direction": "vertical", "gap": 0, "children": [t(title, "caption", 16)] + rows}
def palette(title, query, groups, hints=True):
    return {"name": title, "width": 600, "direction": "vertical", "gap": 8, "children": [
        t(title, "caption", 16),
        {"name": "Palette", "direction": "vertical", "children": [
            {"name": "Search row", "direction": "horizontal", "gap": 12, "align": "center", "height": 56, "padding": [0, 16], "children": [
                {"name": "search icon (lucide search)", "type": "icon", "width": 20, "height": 20},
                {"name": query, "type": "input", "height": 40, "grow": True}, t("esc", "caption", 16)]},
            {"name": "Divider", "type": "divider"},
            {"name": "Results (scroll inside the palette)", "direction": "vertical", "gap": 12, "padding": 12, "children": groups},
            {"name": "Divider 2", "type": "divider"},
            {"name": "Footer hints", "direction": "horizontal", "gap": 24, "height": 40, "align": "center", "padding": [0, 16],
             "children": [t("up / down  move", "caption", 16), t("enter  open", "caption", 16), t("esc  close", "caption", 16)]}]}]}
empty = palette("State 1: opened, nothing typed", "Search components, variants, tokens, terms...", [
    group("Unsaved changes (3) - jump back to what you were editing", [
        row("semantic.color.accent", "Token", True, "#4A90D9", "edited", "was #AE97F7  now #4A90D9"),
        row("semantic.state.hoverOpacity", "Token", False, None, "edited", "was 8%  now 10%"),
        row("component.button.paddingX", "Token", False, None, "edited", "was 16px  now 20px")]),
    group("Recent", [row("Button / Primary", "Variant"), row("Foundations", "Page"), row("Slider", "Component")])])
typed = palette("State 2: typing \"dividers\" (matches a description, not a name)", "dividers", [
    group("Tokens", [
        row("semantic.color.border", "Token", True, "#E6DFD8", "From Main", "Default border color for inputs, cards, and [dividers]")]),
    group("Components", [t("no match", "caption", 16)]),
    group("Variants", [t("no match", "caption", 16)]),
    group("Terms (Glossary)", [t("no match", "caption", 16)])])
d = {"name": "Design System Workbench - Command palette v2", "viewport": {"width": 1440, "height": 900}, "root": {"name": "Page", "direction": "vertical", "children": [
    {"name": "Dimmed workbench behind (page and unsaved changes unaffected)", "direction": "horizontal", "gap": 48, "grow": True, "justify": "center", "padding": [64, 24], "children": [empty, typed]}]}}
json.dump(d, open(os.path.join(here, "command-palette-v2.wireframe.json"), "w"), indent=2)
