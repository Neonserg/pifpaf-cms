import DOMPurify from "isomorphic-dompurify";

// Rich-text blocks are stored as raw HTML produced by the admin's contentEditable
// editor and rendered on the public site via dangerouslySetInnerHTML. Sanitizing
// at render time neutralizes any script/handler that reached the database —
// whether from a pasted payload, a future user-supplied source, or an RLS gap.
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty ?? "", { USE_PROFILES: { html: true } });
}
