#!/usr/bin/env python3
"""Cmd+K palette wireframe from real components/tokens/terms. Usage: python3 gen_palette.py"""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
def t(n, v=None, h=24, **k):
    x = {"name": n, "type": "text", "height": h}
    if v: x["variant"] = v
    x.update(k); return x
def res(label, kind, selected=False):
    return {"name": "Result: " + label, "type": "card", "direction": "horizontal", "justify": "space-between", "align": "center", "height": 40, "padding": [0, 12],
            "children": [t(label + (" (selected)" if selected else ""), h=24), t(kind, "caption", 16)]} if selected else \
           {"name": "Result: " + label, "direction": "horizontal", "justify": "space-between", "align": "center", "height": 40, "padding": [0, 12],
            "children": [t(label, h=24), t(kind, "caption", 16)]}
def group(title, rows): return {"name": "Group: " + title, "direction": "vertical", "gap": 0, "children": [t(title, "caption", 16)] + rows}
palette = {"name": "Command palette (Cmd+K / click the sidebar search)", "width": 640, "direction": "vertical", "gap": 0, "children": [
    {"name": "Search row", "direction": "horizontal", "gap": 12, "align": "center", "height": 56, "padding": [0, 16], "children": [
        {"name": "search icon (lucide search)", "type": "icon", "width": 20, "height": 20},
        {"name": "button", "type": "input", "height": 40, "grow": True},
        t("esc", "caption", 16)]},
    {"name": "Divider", "type": "divider"},
    {"name": "Results (scroll inside the palette; grouped by type, all matches shown)", "direction": "vertical", "gap": 12, "padding": 12, "children": [
        group("Components", [res("Button", "Component", True), res("Icon Button", "Component")]),
        group("Variants", [res("Button / Primary", "Variant"), res("Button / Secondary", "Variant"), res("Icon Button / Primary", "Variant"), res("Icon Button / Secondary", "Variant"), res("Icon Button / Ghost", "Variant")]),
        group("Tokens", [res("component.button.primaryBackground", "Token"), res("component.button.primaryText", "Token"), res("component.button.secondaryBackground", "Token"), res("component.button.secondaryText", "Token"), res("component.button.secondaryBorder", "Token"), t("... all other matches continue in the scrolling list", "caption", 16)]),
        group("Terms (Glossary)", [t("no match for 'button'", "caption", 16)])]},
    {"name": "Divider 2", "type": "divider"},
    {"name": "Footer hints", "direction": "horizontal", "gap": 24, "height": 40, "align": "center", "padding": [0, 16], "children": [
        t("up / down  move", "caption", 16), t("enter  open", "caption", 16), t("esc  close", "caption", 16)]}]}
d = {"name": "Design System Workbench - Command palette v1", "viewport": {"width": 1440, "height": 900}, "root": {"name": "Page", "direction": "vertical", "children": [
    {"name": "Dimmed workbench behind (the page you were on stays as it was; unsaved changes unaffected)", "direction": "vertical", "grow": True, "align": "center", "padding": [96, 0], "children": [palette]}]}}
json.dump(d, open(os.path.join(here, "command-palette-v1.wireframe.json"), "w"), indent=2)
