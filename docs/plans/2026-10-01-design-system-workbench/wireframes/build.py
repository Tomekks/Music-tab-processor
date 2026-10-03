#!/usr/bin/env python3
"""Render a wireframe JSON to HTML with the vertical-divider patch (the stock skill template lacks it).
Usage: python3 build.py name.wireframe.json  ->  name.wireframe.html
The skill itself stays unchanged; the two replacements below are the whole patch."""
import sys, os
here = os.path.dirname(os.path.abspath(__file__))
tpl = open(os.path.join(here, "../../../../.claude/skills/wireframe/wireframe-template.html")).read()
css = "  .wf-type-divider { "
patch_css = "  .wf-type-divider.wf-type-divider-v { width: 1px; height: auto; align-self: stretch; flex-shrink: 0; }\n"
old_cls = "el.className = 'wf-type-divider';"
new_cls = "el.className = 'wf-type-divider' + (node.direction === 'vertical' ? ' wf-type-divider-v' : '');"
assert old_cls in tpl and "const WIREFRAME_DATA = null;" in tpl
i = tpl.index("  .wf-type-divider")
j = tpl.index("\n", tpl.index("}", i)) + 1
tpl = tpl[:j] + patch_css + tpl[j:]
tpl = tpl.replace(old_cls, new_cls)
src = sys.argv[1]
data = open(src).read()
out = src.replace(".json", ".html")
open(out, "w").write(tpl.replace("const WIREFRAME_DATA = null;", "const WIREFRAME_DATA = " + data + ";", 1))
print("wrote", out)
