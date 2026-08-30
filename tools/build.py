#!/usr/bin/env python3
"""Pack src/ modules into the single-file index.html (HELL TRAIN standalone build).

Usage: python3 tools/build.py

Reads src/<module>.js for every module listed in the existing payload order,
re-injects them into the hell-train-payload JSON, and rewrites index.html.
Icons come from src/icons.json. The loader shell and CSS of index.html are
preserved untouched.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"
SRC = ROOT / "src"

PAYLOAD_RE = re.compile(
    r'(<script id="hell-train-payload" type="application/json">\n)(.*?)(\n</script>)',
    re.S,
)


def load_payload() -> dict:
    html = HTML.read_text()
    m = PAYLOAD_RE.search(html)
    if not m:
        sys.exit("payload not found in index.html")
    return json.loads(m.group(2))


def main() -> None:
    payload = load_payload()
    # Derive the module order: keep the existing order, drop removed files,
    # append anything new (sorted for stability).
    existing = [f for f in payload["order"] if (SRC / f).exists()]
    known = set(existing)
    fresh = sorted(
        str(p.relative_to(SRC)).replace("\\", "/")
        for p in SRC.rglob("*.js")
        if str(p.relative_to(SRC)).replace("\\", "/") not in known
    )
    order = existing + fresh
    payload["order"] = order
    sources = {}
    for f in order:
        p = SRC / f
        if not p.exists():
            sys.exit(f"missing module source: {f}")
        sources[f] = p.read_text()
    icons = json.loads((SRC / "icons.json").read_text())
    payload["sources"] = sources
    payload["icons"] = icons

    html = HTML.read_text()
    new_payload = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    # Match the original encoder: "</" escaped as "<\/" (safe inside <script>).
    new_payload = new_payload.replace("</", "<\\/")
    html = PAYLOAD_RE.sub(lambda m: m.group(1) + new_payload + m.group(3), html, count=1)
    HTML.write_text(html)
    total = sum(len(s) for s in sources.values())
    print(f"packed {len(sources)} modules ({total} chars) into index.html ({len(html)} bytes)")


if __name__ == "__main__":
    main()
