import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "pifpaf",
  description: "pifpaf.online — фотопортфоліо",
};

// Public site defaults to light regardless of OS preference — only an explicit
// toggle (persisted below) should ever switch to dark. Runs before paint to
// avoid a flash of the wrong theme.
const THEME_INIT_SCRIPT = `try{if(localStorage.getItem('pifpaf-theme')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
