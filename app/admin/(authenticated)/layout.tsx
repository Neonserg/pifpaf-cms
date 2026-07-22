import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { signOut } from "../actions";
import RailNav from "./rail-nav";
import "@/styles/admin.css";

export default async function AuthenticatedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Belt-and-suspenders: middleware already redirects unauthenticated
  // requests, but a Server Component render can't rely on that alone.
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <div className="admin-app">
      <RailNav userEmail={session.email} />
      <div className="admin-workspace">
        <div className="admin-topbar">
          <span style={{ fontSize: 13, color: "var(--muted)" }}>pifpaf.online</span>
          <form action={signOut}>
            <button className="btn subtle" type="submit">
              Вийти
            </button>
          </form>
        </div>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
