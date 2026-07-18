import { filterXSS } from "xss";

// Rich-text blocks are stored as raw HTML from the admin's contentEditable editor
// and rendered on the public site via dangerouslySetInnerHTML. Sanitizing at render
// neutralizes any script/handler/dangerous-URL that reached the database.
//
// Uses `xss` (pure JS, no jsdom) — deliberately, after isomorphic-dompurify/jsdom
// crashed the Vercel serverless runtime with ERR_REQUIRE_ESM. Do not swap this for
// a jsdom-based sanitizer.
export function sanitizeHtml(dirty: string): string {
  return filterXSS(dirty ?? "");
}
