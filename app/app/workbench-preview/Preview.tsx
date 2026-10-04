"use client";

import { useEffect } from "react";
import { Play } from "lucide-react";
import { Button, ColorField, IconButton, SegmentedControl, Slider } from "@guitar-tabs/design-system";
import { forcedStateSelector, readTokenMessage } from "../../lib/workbenchPreview";

const noop = () => undefined;

// Fixed values: every cell is a snapshot of one State, so no cell may change another.
const COLOR = "#6d28d9";
const SEGMENT = "a";
const SLIDER = 50;

const CELL = "border border-border px-4 py-3 align-middle";

function addForcedStateRules() {
  const walk = (rules: CSSRuleList, parent: CSSStyleSheet | CSSGroupingRule) => {
    for (const rule of Array.from(rules)) {
      if (rule instanceof CSSStyleRule) {
        const forced = forcedStateSelector(rule.selectorText);
        if (forced !== null) {
          const index = Array.from(parent.cssRules).indexOf(rule);
          parent.insertRule(`${forced}{${rule.style.cssText}}`, index + 1);
        }
      } else if (rule instanceof CSSGroupingRule) {
        walk(rule.cssRules, rule);
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      walk(sheet.cssRules, sheet);
    } catch {
      // Cross-origin or otherwise unreadable stylesheet: skip it.
    }
  }
}

export default function Preview() {
  useEffect(() => {
    addForcedStateRules();
    const style = document.createElement("style");
    style.textContent = "*{transition:none!important}";
    document.head.appendChild(style);
    const onMessage = (event: MessageEvent) => {
      const vars = readTokenMessage(event.origin, event.data);
      if (vars === null) return;
      for (const [key, value] of Object.entries(vars)) {
        document.documentElement.style.setProperty(key, value);
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      style.remove();
    };
  }, []);

  return (
    <main className="flex flex-col gap-6 px-6 py-6">
      <h1 className="text-xl font-semibold text-foreground">Workbench preview</h1>
      <table className="border-collapse">
        <thead>
          <tr>
            <th scope="col" className={CELL}>
              Variant
            </th>
            <th scope="col" className={CELL}>
              Default
            </th>
            <th scope="col" className={CELL}>
              Hover
            </th>
            <th scope="col" className={CELL}>
              Pressed
            </th>
            <th scope="col" className={CELL}>
              Disabled
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className={CELL}>
              Button primary
            </th>
            <td className={CELL}>
              <Button variant="primary" onClick={noop}>
                Primary
              </Button>
            </td>
            <td className={CELL}>
              <div className="force-hover">
                <Button variant="primary" onClick={noop}>
                  Primary
                </Button>
              </div>
            </td>
            <td className={CELL}>
              <div className="force-active">
                <Button variant="primary" onClick={noop}>
                  Primary
                </Button>
              </div>
            </td>
            <td className={CELL}>
              <Button variant="primary" disabled onClick={noop}>
                Primary
              </Button>
            </td>
          </tr>
          <tr>
            <th scope="row" className={CELL}>
              Button secondary
            </th>
            <td className={CELL}>
              <Button variant="secondary" onClick={noop}>
                Secondary
              </Button>
            </td>
            <td className={CELL}>
              <div className="force-hover">
                <Button variant="secondary" onClick={noop}>
                  Secondary
                </Button>
              </div>
            </td>
            <td className={CELL}>
              <div className="force-active">
                <Button variant="secondary" onClick={noop}>
                  Secondary
                </Button>
              </div>
            </td>
            <td className={CELL}>
              <Button variant="secondary" disabled onClick={noop}>
                Secondary
              </Button>
            </td>
          </tr>
          <tr>
            <th scope="row" className={CELL}>
              IconButton primary
            </th>
            <td className={CELL}>
              <IconButton icon={Play} variant="primary" aria-label="Play" onClick={noop} />
            </td>
            <td className={CELL}>
              <div className="force-hover">
                <IconButton icon={Play} variant="primary" aria-label="Play" onClick={noop} />
              </div>
            </td>
            <td className={CELL}>
              <div className="force-active">
                <IconButton icon={Play} variant="primary" aria-label="Play" onClick={noop} />
              </div>
            </td>
            <td className={CELL}>
              <IconButton icon={Play} variant="primary" aria-label="Play" disabled onClick={noop} />
            </td>
          </tr>
          <tr>
            <th scope="row" className={CELL}>
              IconButton secondary
            </th>
            <td className={CELL}>
              <IconButton icon={Play} variant="secondary" aria-label="Play" onClick={noop} />
            </td>
            <td className={CELL}>
              <div className="force-hover">
                <IconButton icon={Play} variant="secondary" aria-label="Play" onClick={noop} />
              </div>
            </td>
            <td className={CELL}>
              <div className="force-active">
                <IconButton icon={Play} variant="secondary" aria-label="Play" onClick={noop} />
              </div>
            </td>
            <td className={CELL}>
              <IconButton icon={Play} variant="secondary" aria-label="Play" disabled onClick={noop} />
            </td>
          </tr>
          <tr>
            <th scope="row" className={CELL}>
              IconButton ghost
            </th>
            <td className={CELL}>
              <IconButton icon={Play} variant="ghost" aria-label="Play" onClick={noop} />
            </td>
            <td className={CELL}>
              <div className="force-hover">
                <IconButton icon={Play} variant="ghost" aria-label="Play" onClick={noop} />
              </div>
            </td>
            <td className={CELL}>
              <div className="force-active">
                <IconButton icon={Play} variant="ghost" aria-label="Play" onClick={noop} />
              </div>
            </td>
            <td className={CELL}>
              <IconButton icon={Play} variant="ghost" aria-label="Play" disabled onClick={noop} />
            </td>
          </tr>
          <tr>
            <th scope="row" className={CELL}>
              ColorField
            </th>
            <td className={CELL}>
              <ColorField value={COLOR} onChange={noop} />
            </td>
            <td className={CELL}>
              <div className="force-hover">
                <ColorField value={COLOR} onChange={noop} />
              </div>
            </td>
            <td className={CELL}>
              <div className="force-active">
                <ColorField value={COLOR} onChange={noop} />
              </div>
            </td>
            <td className={CELL}>
              <ColorField value={COLOR} onChange={noop} disabled />
            </td>
          </tr>
          <tr>
            <th scope="row" className={CELL}>
              SegmentedControl
            </th>
            <td className={CELL}>
              <SegmentedControl
                options={[
                  { value: "a", label: "A" },
                  { value: "b", label: "B" },
                ]}
                value={SEGMENT}
                onChange={noop}
                ariaLabel="Preview options"
              />
            </td>
            <td className={CELL}>
              <div className="force-hover">
                <SegmentedControl
                  options={[
                    { value: "a", label: "A" },
                    { value: "b", label: "B" },
                  ]}
                  value={SEGMENT}
                  onChange={noop}
                  ariaLabel="Preview options"
                />
              </div>
            </td>
            <td className={CELL}>
              <div className="force-active">
                <SegmentedControl
                  options={[
                    { value: "a", label: "A" },
                    { value: "b", label: "B" },
                  ]}
                  value={SEGMENT}
                  onChange={noop}
                  ariaLabel="Preview options"
                />
              </div>
            </td>
            <td className={CELL}>
              <SegmentedControl
                options={[
                  { value: "a", label: "A" },
                  { value: "b", label: "B" },
                ]}
                value={SEGMENT}
                onChange={noop}
                ariaLabel="Preview options"
                disabled
              />
            </td>
          </tr>
          <tr>
            <th scope="row" className={CELL}>
              Slider
            </th>
            <td className={CELL}>
              <Slider value={SLIDER} onChange={noop} min={0} max={100} step={1} />
            </td>
            <td className={CELL}>
              <div className="force-hover">
                <Slider value={SLIDER} onChange={noop} min={0} max={100} step={1} />
              </div>
            </td>
            <td className={CELL}>
              <div className="force-active">
                <Slider value={SLIDER} onChange={noop} min={0} max={100} step={1} />
              </div>
            </td>
            <td className={CELL}>
              <Slider value={SLIDER} onChange={noop} min={0} max={100} step={1} disabled />
            </td>
          </tr>
        </tbody>
      </table>
    </main>
  );
}
