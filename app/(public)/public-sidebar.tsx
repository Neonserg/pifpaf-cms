"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { PageNode } from "@/lib/public-pages";
import { mediaPublicUrl } from "@/lib/media-url";

const LOGO_URL = mediaPublicUrl("site-assets/logo.jpg");

function nodeHref(node: PageNode): string | null {
  if (node.fullPath === "") return "/";
  if (node.fullPath) return `/${node.fullPath}`;
  return null;
}

export default function PublicSidebar({
  tree,
  collapsedDefault,
}: {
  tree: PageNode[];
  collapsedDefault: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(collapsedDefault);
  const [hydrated, setHydrated] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    function syncFromStorage() {
      const stored = window.localStorage.getItem("pifpaf-sidebar-collapsed");
      if (stored !== null) setCollapsed(stored === "1");
      if (window.localStorage.getItem("pifpaf-theme") === "dark") setTheme("dark");
      setHydrated(true);
    }
    syncFromStorage();
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem("pifpaf-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("data-theme", theme);
    window.localStorage.setItem("pifpaf-theme", theme);
  }, [theme, hydrated]);

  function renderNode(node: PageNode, depth: number) {
    const indent = 12 + depth * 14;

    if (node.type === "spacer") {
      return <li key={node.id} className="public-nav-spacer" aria-hidden="true" />;
    }

    if (node.type === "link") {
      return (
        <li key={node.id}>
          <a
            className="public-nav-item"
            style={{ paddingLeft: indent }}
            href={node.external_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
          >
            {node.title}
          </a>
        </li>
      );
    }

    const href = nodeHref(node);
    if (!href) return null;
    const active = pathname === href;
    return (
      <li key={node.id}>
        <Link href={href} className={`public-nav-item${active ? " active" : ""}`} style={{ paddingLeft: indent }}>
          {node.title}
        </Link>
        {node.type !== "category" && node.children.length > 0 && (
          <ul className="public-nav-children">{node.children.map((child) => renderNode(child, depth + 1))}</ul>
        )}
      </li>
    );
  }

  return (
    <>
      <button
        type="button"
        className="public-mobile-toggle"
        onClick={() => setMobileOpen(true)}
        aria-label="Відкрити меню"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {mobileOpen && <div className="public-sidebar-backdrop" onClick={() => setMobileOpen(false)} />}
      {collapsed && (
        <button
          type="button"
          className="public-collapse-btn public-expand-tab"
          onClick={() => setCollapsed(false)}
          aria-label="Розгорнути меню"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
      <aside className={`public-sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
        <div className="public-sidebar-head">
          <button
            type="button"
            className="public-mobile-close"
            onClick={() => setMobileOpen(false)}
            aria-label="Закрити меню"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <Link href="/" className="public-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt="pifpaf" />
          </Link>
          <div className="public-head-controls">
            <button
              type="button"
              className="public-theme-toggle"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              aria-label={theme === "light" ? "Темна тема" : "Світла тема"}
            >
              {theme === "light" ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3v2M12 19v2M5 5l1.4 1.4M17.6 17.6L19 19M3 12h2M19 12h2M5 19l1.4-1.4M17.6 6.4L19 5" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M20 14.5A8 8 0 119.5 4 6.5 6.5 0 0020 14.5z" />
                </svg>
              )}
            </button>
            <button
              type="button"
              className="public-collapse-btn"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? "Розгорнути меню" : "Згорнути меню"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d={collapsed ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"} />
              </svg>
            </button>
          </div>
        </div>
        <ul className="public-nav-list">{tree.map((node) => renderNode(node, 0))}</ul>
      </aside>
    </>
  );
}
