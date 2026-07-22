"use client";

import { useState } from "react";
import { changePassword } from "./password-actions";

export default function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (next !== confirm) {
      setError("Новий пароль і підтвердження не збігаються");
      return;
    }

    setSaving(true);
    try {
      await changePassword(current, next);
      setSaved(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося змінити пароль");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 560 }}>
      <h2
        style={{
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--muted)",
          margin: "0 0 12px",
        }}
      >
        Зміна пароля
      </h2>

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

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <label style={fieldLabel}>Поточний пароль</label>
          <input
            type="password"
            style={inputStyle}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={fieldLabel}>Новий пароль</label>
          <input
            type="password"
            style={inputStyle}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={fieldLabel}>Підтвердіть новий пароль</label>
          <input
            type="password"
            style={inputStyle}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 20 }}>
          <button className="btn" type="submit" disabled={saving}>
            {saving ? "Збереження…" : "Змінити пароль"}
          </button>
          {saved && <span style={{ color: "var(--muted)", fontSize: 13 }}>Пароль змінено</span>}
        </div>
      </form>
    </div>
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
