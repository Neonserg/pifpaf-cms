import { db } from "@/lib/db/client";
import { settings } from "@/lib/db/schema";
import SettingsForm from "./settings-form";
import ChangePasswordForm from "./change-password-form";

export default async function SettingsPage() {
  const [settingsRow] = await db.select().from(settings).limit(1);

  if (!settingsRow) {
    return <div style={{ padding: 24, color: "var(--rec)" }}>Помилка: налаштування не знайдено</div>;
  }

  return (
    <>
      <SettingsForm initialSettings={settingsRow} />
      <ChangePasswordForm />
    </>
  );
}
