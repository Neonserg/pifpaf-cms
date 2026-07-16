import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--paper)",
      }}
    >
      <form
        action={signIn}
        style={{
          width: 340,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius)",
          padding: 28,
          boxShadow: "var(--shadow)",
        }}
      >
        <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>pifpaf — адмінка</h1>
        <p style={{ color: "var(--muted)", fontSize: 13, margin: "0 0 20px" }}>
          Увійдіть, щоб керувати сайтом
        </p>

        {error && (
          <p
            style={{
              background: "var(--rec-soft)",
              color: "var(--rec)",
              fontSize: 13,
              padding: "8px 10px",
              borderRadius: "var(--radius)",
              marginBottom: 16,
            }}
          >
            {error}
          </p>
        )}

        <label style={fieldLabel}>Email</label>
        <input name="email" type="email" required autoFocus style={inputStyle} />

        <label style={{ ...fieldLabel, marginTop: 14 }}>Пароль</label>
        <input name="password" type="password" required style={inputStyle} />

        <button
          type="submit"
          style={{
            marginTop: 20,
            width: "100%",
            padding: "10px 0",
            background: "var(--ink)",
            color: "var(--paper)",
            border: 0,
            borderRadius: "var(--radius)",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Увійти
        </button>
      </form>
    </main>
  );
}

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--muted)",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--line)",
  borderRadius: "var(--radius)",
  background: "var(--paper)",
  color: "var(--ink)",
  font: "inherit",
};
