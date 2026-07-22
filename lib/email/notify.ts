import { Resend } from "resend";
import type { FormField } from "@/app/admin/(authenticated)/forms/actions";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Best-effort email notification for a new form submission. The submission
 * is already durably stored by submit_form() before this runs — a failure
 * here (bad API key, Resend outage) must never surface as a failed
 * submission to the visitor, so callers should swallow errors from this.
 */
export async function sendFormSubmissionEmail(
  formTitle: string,
  fields: FormField[],
  data: Record<string, string | boolean>
) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.FORM_NOTIFICATION_EMAIL;
  if (!apiKey || !to) return;

  const rows = fields
    .map((f) => {
      const value = data[f.id];
      const display = typeof value === "boolean" ? (value ? "Так" : "Ні") : (value ?? "").toString();
      return `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">${escapeHtml(f.label)}</td><td style="padding:4px 0">${escapeHtml(display)}</td></tr>`;
    })
    .join("");

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: "pifpaf <onboarding@resend.dev>",
    to,
    subject: `Нова заявка — ${formTitle}`,
    html: `<table cellpadding="0" cellspacing="0">${rows}</table>`,
  });
}
