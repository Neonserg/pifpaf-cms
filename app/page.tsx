import { createServerSupabaseClient } from "@/lib/supabase/server";

// Phase 0 sanity check: a real round trip to Supabase, not a stub. Once the
// page builder (Phase 2) lands, this will be replaced by the actual
// block-rendering homepage.
export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const { data: settings, error } = await supabase
    .from("settings")
    .select("site_title, site_description")
    .single();

  return (
    <main style={{ maxWidth: 640, margin: "80px auto", padding: "0 24px" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>pifpaf-cms — Phase 0</h1>
      <p style={{ color: "var(--muted)", marginBottom: 24 }}>
        Каркас Next.js + Supabase розгорнуто. Публічна частина сайту зʼявиться у Фазі 4.
      </p>
      {error ? (
        <p style={{ color: "var(--rec)" }}>
          Не вдалося звʼязатися з Supabase: {error.message}
        </p>
      ) : (
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            padding: 16,
            background: "var(--surface)",
          }}
        >
          <p style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 6 }}>
            З’єднання з Supabase — OK
          </p>
          <p style={{ fontWeight: 600 }}>{settings?.site_title}</p>
          <p style={{ color: "var(--muted)", fontSize: 14 }}>{settings?.site_description}</p>
        </div>
      )}
    </main>
  );
}
