/** Safe subset Markdown → React nodes. Never executes raw HTML. */

import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:"]);

export function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("//")) return false;
  try {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
      const url = new URL(trimmed);
      return SAFE_SCHEMES.has(url.protocol);
    }
    // Relative paths
    return trimmed.startsWith("/") && !trimmed.startsWith("//");
  } catch {
    return false;
  }
}

function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Strip any HTML tags from input before Markdown interpretation. */
export function stripRawHtml(input: string): string {
  return input.replace(/<\/?[a-zA-Z][^>]*>/g, "");
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // Links: [label](url) — only safe hrefs
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      nodes.push(escapeText(text.slice(last, m.index)));
    }
    const token = m[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) {
      nodes.push(createElement("strong", { key }, escapeText(token.slice(2, -2))));
    } else if (token.startsWith("*")) {
      nodes.push(createElement("em", { key }, escapeText(token.slice(1, -1))));
    } else if (token.startsWith("`")) {
      nodes.push(createElement("code", { key }, escapeText(token.slice(1, -1))));
    } else if (token.startsWith("[")) {
      const linkMatch = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      const label = linkMatch?.[1];
      const href = linkMatch?.[2];
      if (label && href && isSafeHref(href)) {
        nodes.push(
          createElement(
            "a",
            {
              key,
              href: href.trim(),
              rel: "noopener noreferrer",
              target: "_blank",
            },
            escapeText(label),
          ),
        );
      } else {
        nodes.push(escapeText(label ?? token));
      }
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(escapeText(text.slice(last)));
  return nodes;
}

/**
 * Render controlled Markdown as React elements.
 * Supports: paragraphs, headings ##/###, unordered lists, bold/italic/code, safe links.
 * Does not support raw HTML. Script/event markup is stripped.
 */
export function renderSafeMarkdown(source: string | null | undefined): ReactNode {
  if (!source || !source.trim()) return null;
  const cleaned = stripRawHtml(source.replace(/\r\n/g, "\n"));
  const blocks = cleaned.split(/\n{2,}/);
  const elements: ReactNode[] = [];

  blocks.forEach((block, bi) => {
    const lines = block.split("\n").map((l) => l.trimEnd());
    const first = lines[0]?.trim() ?? "";

    if (first.startsWith("### ")) {
      elements.push(
        createElement("h3", { key: `h3-${bi}` }, ...renderInline(first.slice(4), `h3i-${bi}`)),
      );
      return;
    }
    if (first.startsWith("## ")) {
      elements.push(
        createElement("h2", { key: `h2-${bi}` }, ...renderInline(first.slice(3), `h2i-${bi}`)),
      );
      return;
    }
    if (lines.every((l) => l.trim() === "" || l.trim().startsWith("- ") || l.trim().startsWith("* "))) {
      const items = lines
        .filter((l) => l.trim())
        .map((l, li) =>
          createElement(
            "li",
            { key: `li-${bi}-${li}` },
            ...renderInline(l.trim().replace(/^[-*]\s+/, ""), `lii-${bi}-${li}`),
          ),
        );
      elements.push(createElement("ul", { key: `ul-${bi}` }, items));
      return;
    }

    elements.push(
      createElement(
        "p",
        { key: `p-${bi}` },
        ...renderInline(lines.join(" "), `pi-${bi}`),
      ),
    );
  });

  return createElement(Fragment, null, elements);
}

/** For tests: returns whether dangerous patterns would be neutralized. */
export function sanitizeMarkdownForTest(source: string): string {
  return stripRawHtml(source);
}
