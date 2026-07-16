import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "pifpaf-cms — Phase 0 scaffold",
  description: "Foundation scaffold for the pifpaf.online CMS rebuild.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body>{children}</body>
    </html>
  );
}
