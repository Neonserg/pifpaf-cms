import type { Metadata } from "next";
import { getPublicSiteData } from "@/lib/public-pages";
import PublicSidebar from "./public-sidebar";
import CookieNotice from "./cookie-notice";
import { GalleryZoomProvider } from "./gallery-zoom-context";
import "@/styles/public.css";

// Keep in sync with the page-level revalidate in [[...slug]]/page.tsx.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const { settings } = await getPublicSiteData();
  return {
    title: settings?.site_title ?? "pifpaf",
    description: settings?.site_description ?? undefined,
    icons: settings?.favicon_url ? { icon: settings.favicon_url } : undefined,
    openGraph: settings?.og_image_url ? { images: [settings.og_image_url] } : undefined,
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { tree, settings } = await getPublicSiteData();

  return (
    <div className="public-shell">
      <PublicSidebar
        tree={tree}
        collapsedDefault={settings?.sidebar_collapsed_default ?? false}
        logoLightUrl={settings?.logo_light_url ?? null}
        logoDarkUrl={settings?.logo_dark_url ?? null}
      />
      <main className="public-main">
        <GalleryZoomProvider>
          {children}
          {settings?.copyright_text && <footer className="public-footer">{settings.copyright_text}</footer>}
        </GalleryZoomProvider>
      </main>
      {settings?.cookie_notice_enabled && <CookieNotice />}
    </div>
  );
}
