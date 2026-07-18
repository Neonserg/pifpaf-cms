"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

// Basic abuse limits for an unauthenticated, public insert. These are a first
// line against spam/flooding; a real rate limiter (per-IP) should back them.
const MAX_FIELDS = 50;
const MAX_VALUE_LENGTH = 5000;

export async function submitForm(
  formId: string,
  data: Record<string, string | boolean>,
  honeypot?: string
) {
  // Bots fill every field, including the hidden one. Pretend success so they
  // don't learn the field is a trap, but write nothing.
  if (honeypot && honeypot.trim() !== "") return;

  if (typeof formId !== "string" || formId.length === 0 || formId.length > 100) {
    throw new Error("Некоректна форма");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    throw new Error("Некоректні дані форми");
  }

  const entries = Object.entries(data);
  if (entries.length > MAX_FIELDS) {
    throw new Error("Забагато полів");
  }
  for (const [, value] of entries) {
    if (typeof value === "string" && value.length > MAX_VALUE_LENGTH) {
      throw new Error("Значення поля задовге");
    }
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase
    .from("form_submissions")
    .insert({ form_id: formId, data: data as unknown as Json });

  if (error) {
    // Don't leak raw database errors to anonymous visitors.
    console.error("submitForm failed:", error.message);
    throw new Error("Не вдалося надіслати форму");
  }
}
