import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  check,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Property names intentionally match the DB column names (snake_case), not
// idiomatic Drizzle camelCase — the whole UI layer already consumes
// snake_case row shapes from the previous Supabase/PostgREST client, and
// keeping the wire format identical avoids touching 20+ display components.

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  password_hash: text("password_hash").notNull(),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (t) => [uniqueIndex("admins_email_key").on(t.email)]);

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parent_id: uuid("parent_id").references((): AnyPgColumn => pages.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    slug: text("slug"),
    is_home: boolean("is_home").notNull().default(false),
    external_url: text("external_url"),
    sort_order: integer("sort_order").notNull().default(0),
    is_hidden: boolean("is_hidden").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("pages_slug_key").on(t.slug),
    index("pages_parent_id_idx").on(t.parent_id),
    check("pages_type_check", sql`${t.type} = ANY (ARRAY['category', 'content', 'link', 'spacer'])`),
  ]
);

export const blocks = pgTable(
  "blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    page_id: uuid("page_id")
      .notNull()
      .references(() => pages.id),
    type: text("type").notNull(),
    sort_order: integer("sort_order").notNull().default(0),
    data: jsonb("data").notNull().default({}),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [
    index("blocks_page_id_idx").on(t.page_id),
    check("blocks_type_check", sql`${t.type} = ANY (ARRAY['text', 'columns', 'gallery', 'media'])`),
  ]
);

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  type: text("type").notNull(),
  storage_path: text("storage_path").notNull(),
  width: integer("width"),
  height: integer("height"),
  created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (t) => [
  check("media_type_check", sql`${t.type} = ANY (ARRAY['photo', 'video'])`),
]);

export const forms = pgTable(
  "forms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    page_id: uuid("page_id").references(() => pages.id),
    title: text("title").notNull().default("Форма"),
    fields: jsonb("fields").notNull().default([]),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
  },
  (t) => [index("forms_page_id_idx").on(t.page_id)]
);

export const form_submissions = pgTable(
  "form_submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    form_id: uuid("form_id")
      .notNull()
      .references(() => forms.id),
    data: jsonb("data").notNull(),
    is_read: boolean("is_read").notNull().default(false),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    ip_hash: text("ip_hash"),
  },
  (t) => [
    index("form_submissions_form_id_idx").on(t.form_id),
    index("form_submissions_ip_hash_created_at_idx").on(t.ip_hash, t.created_at),
  ]
);

export const settings = pgTable(
  "settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    site_title: text("site_title"),
    site_description: text("site_description"),
    favicon_url: text("favicon_url"),
    og_image_url: text("og_image_url"),
    copyright_text: text("copyright_text"),
    cookie_notice_enabled: boolean("cookie_notice_enabled").notNull().default(true),
    sidebar_collapsed_default: boolean("sidebar_collapsed_default").notNull().default(false),
    home_page_id: uuid("home_page_id").references(() => pages.id),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
    logo_light_url: text("logo_light_url"),
    logo_dark_url: text("logo_dark_url"),
  },
  (t) => [index("settings_home_page_id_idx").on(t.home_page_id)]
);

export type PageRow = typeof pages.$inferSelect;
export type PageInsert = typeof pages.$inferInsert;
export type BlockRow = typeof blocks.$inferSelect;
export type BlockInsert = typeof blocks.$inferInsert;
export type MediaRow = typeof media.$inferSelect;
export type MediaInsert = typeof media.$inferInsert;
export type FormRow = typeof forms.$inferSelect;
export type FormSubmissionRow = typeof form_submissions.$inferSelect;
export type SettingsRow = typeof settings.$inferSelect;
export type AdminRow = typeof admins.$inferSelect;
