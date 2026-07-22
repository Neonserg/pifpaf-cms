"use client";

import { useState } from "react";
import type { FormRow as FormRowType } from "@/lib/db/schema";
import type { FormField } from "@/app/admin/(authenticated)/forms/actions";
import { submitForm } from "./actions";

type FormRow = FormRowType;

export default function PublicForm({ form }: { form: FormRow }) {
  const fields = (form.fields as unknown as FormField[]) ?? [];
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [honeypot, setHoneypot] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (fields.length === 0) return null;

  if (submitted) {
    return (
      <div className="public-form public-form-success">
        <p>Дякуємо, заявку надіслано.</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submitForm(form.id, values, honeypot);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося надіслати форму");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="public-form" onSubmit={handleSubmit}>
      <h2 className="public-form-title">{form.title}</h2>
      {error && <p className="public-form-error">{error}</p>}
      {/* Honeypot: hidden from users, tempting to bots. Kept out of the tab
          order and off-screen; a filled value silently drops the submission. */}
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />
      {fields.map((field) => (
        <div key={field.id} className="public-form-field">
          {field.type === "checkbox" ? (
            <label className="public-form-checkbox-row">
              <input
                type="checkbox"
                required={field.required}
                checked={Boolean(values[field.id])}
                onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.checked }))}
              />
              {field.label}
            </label>
          ) : (
            <>
              <label className="public-form-label" htmlFor={field.id}>
                {field.label}
                {field.required && " *"}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={field.id}
                  required={field.required}
                  value={(values[field.id] as string) ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                />
              ) : (
                <input
                  id={field.id}
                  type={field.type}
                  required={field.required}
                  value={(values[field.id] as string) ?? ""}
                  onChange={(e) => setValues((v) => ({ ...v, [field.id]: e.target.value }))}
                />
              )}
            </>
          )}
        </div>
      ))}
      <button type="submit" className="public-form-submit" disabled={submitting}>
        {submitting ? "Надсилання…" : "Надіслати"}
      </button>
    </form>
  );
}
