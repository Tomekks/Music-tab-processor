#!/usr/bin/env python3
"""Unsaved / saved / error / conflict states wireframe. Usage: python3 gen_states.py"""
import json, os
here = os.path.dirname(os.path.abspath(__file__))
def t(n, v=None, h=24, **k):
    x = {"name": n, "type": "text"}
    if h: x["height"] = h
    if v: x["variant"] = v
    x.update(k); return x
def bar(label, status, buttons):
    return {"name": "State: " + label, "direction": "vertical", "gap": 6, "children": [
        t(label, "caption", 16),
        {"name": "Top bar strip", "direction": "horizontal", "height": 56, "padding": [0, 16], "gap": 16, "align": "center", "type": "card", "children": [
            {"name": "Design System - brand: default (switcher)", "type": "input", "height": 40, "width": 320},
            {"name": "Mode toggle", "type": "icon", "width": 40, "height": 40},
            {"name": "Spacer", "grow": True, "direction": "vertical", "children": []},
            {"name": "Status slot", "direction": "horizontal", "gap": 12, "align": "center", "children": status}] + buttons}]}
def link(n): return {"name": n, "type": "link", "height": 40}
def btn(n): return {"name": n, "type": "button", "height": 40}
x_icon = {"name": "x icon (lucide x) - dismiss", "type": "icon", "width": 20, "height": 20}

states = [
 bar("1. Nothing changed: status slot empty, no Save or Discard", [t("", None, 24, name=" ")], []),
 bar("2. Unsaved edits: click the count to open the changes list", [t("3 unsaved changes  v", None, 24)], [link("Discard"), btn("Save")]),
 bar("3. Saving: Save is disabled so a second click cannot start a second write", [t("Saving...", None, 24)], [link("Discard (disabled)"), btn("Saving...")]),
 bar("4. Just saved: shown for 5 s, then fades to state 1 (or state 2 if other edits remain)", [t("Saved 3 tokens 14:02", None, 24)], []),
 bar("5. Discarded: shown for 5 s with Undo, then fades like state 4", [t("Discarded 3 changes", None, 24), link("Undo")], []),
 bar("6. Save failed: nothing was written (saves are all or nothing, then re-read to confirm); stays until dismissed or a retry works; edits stay staged", [t("Couldn't save: tokens.json is read-only. Nothing was written.", None, 24), x_icon], [link("Discard"), btn("Retry save")]),
 bar("7. File changed on disk since you opened it: Save stops, nothing is overwritten", [t("tokens.json changed outside the workbench", None, 24)], [link("Review changes"), btn("Reload")]),
]

def change_row(name, was, now, kind, color=False):
    def val(label, v):
        kids = ([{"name": "swatch " + v, "type": "icon", "width": 20, "height": 20}] if color else []) + [t(label + " " + v, "caption", 16)]
        return {"name": label + " value", "direction": "horizontal", "gap": 6, "align": "center", "width": 150 if color else None, "children": kids}
    w = val("was", was); n = val("now", now)
    if not color: w.pop("width"); n.pop("width")
    return {"name": "Change: " + name, "direction": "horizontal", "gap": 12, "align": "center", "height": 40, "children": [
        t(kind, "caption", 16, width=56), t(name, None, 24, width=240), w, n, {"name": " ", "grow": True, "height": 1}, link("Discard")]}
popover = {"name": "Changes list (opens from 'N unsaved changes'; click a row to jump to it)", "width": 760, "direction": "vertical", "gap": 8, "padding": 16, "type": "card", "children": [
    t("Unsaved changes (4)", "heading", 32),
    change_row("semantic.color.accent", "#AE97F7", "#4A90D9", "Token", color=True),
    change_row("semantic.state.hoverOpacity", "8%", "10%", "Token"),
    change_row("component.button.paddingX", "16px", "20px", "Token"),
    change_row("Variant", "A named version of a Component...", "(definition edited)", "Term"),
    {"name": "Divider", "type": "divider"},
    {"name": "Footer", "direction": "horizontal", "justify": "space-between", "align": "center", "children": [
        t("Discard removes only that change. Cmd+Z undoes the last edit.", "caption", 16), btn("Save all")]}]}

marker = {"name": "Edited row marker (in lists and on the canvas)", "direction": "vertical", "gap": 6, "children": [
    t("Edited rows get a dot until saved or discarded", "caption", 16),
    {"name": "Sample row", "direction": "horizontal", "gap": 12, "align": "center", "height": 40, "children": [
        {"name": "edited dot", "type": "icon", "width": 10, "height": 10}, t("accent", None, 24, width=150),
        {"name": "swatch #4A90D9", "type": "icon", "width": 32, "height": 32}, t("#4A90D9", "caption", 16, width=64), t("was #AE97F7", "caption", 16)]}]}
leave = {"name": "Leaving with unsaved edits", "direction": "vertical", "gap": 6, "children": [
    t("Moving between pages keeps edits staged. Closing or reloading the tab shows the browser's own 'Leave site?' warning when something is unsaved.", "caption", 16)]}

d = {"name": "Design System Workbench - Unsaved, saved and error states v1", "viewport": {"width": 1440, "height": 1300},
     "root": {"name": "Page", "direction": "vertical", "gap": 24, "padding": 32, "children": [t("Top bar status slot, seven states", "heading", 32)] + states + [
         t("Changes list", "heading", 32), popover, marker, leave]}}
json.dump(d, open(os.path.join(here, "save-states-v1.wireframe.json"), "w"), indent=2)
