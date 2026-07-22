"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

// Basic abuse limits for an unauthenticated, public insert. Backed by the
// `submit_form` Postgres function, which verifies the form exists and
// enforces a per-IP rate limit (5 submissions / 10 minutes) — direct
// INSERT into form_submissions bypasses that check, so always go through it.
const MAX_FIELDS = 50;
const MAX_VALUE_LENGTH = 5000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function clientIpHash(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  // Hashed for privacy — we only need equality for rate limiting, not the IP.
  return createHash("sha256").update(`pifpaf-form:${ip}`).digest("hex");
}

export async function submitForm(
  formId: string,
  data: Record<string, string | boolean>,
  honeypot?: string
) {
  // Bots fill every field, including the hidden one. Pretend success so they
  // don't learn the field is a trap, but write nothing.
  if (honeypot && honeypot.trim() !== "") return;

  if (typeof formId !== "string" || !UUID_RE.test(formId)) {
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

  try {
    await db.execute(
      sql`select public.submit_form(${formId}::uuid, ${JSON.stringify(data)}::jsonb, ${await clientIpHash()})`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("rate_limited")) {
      throw new Error("Забагато заявок поспіль. Спробуйте, будь ласка, пізніше.");
    }
    // Don't leak raw database errors to anonymous visitors.
    console.error("submitForm failed:", message);
    throw new Error("Не вдалося надіслати форму");
  }
}
