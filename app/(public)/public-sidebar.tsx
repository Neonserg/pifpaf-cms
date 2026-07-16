"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { PageNode } from "@/lib/public-pages";

function nodeHref(node: PageNode): string | null {
  if (node.fullPath === "") return "/";
  if (node.fullPath) return `/${node.fullPath}`;
  return null;
}

function findActiveAncestors(nodes: PageNode[], pathname: string, trail: string[] = []): string[] | null {
  for (const node of nodes) {
    if (nodeHref(node) === pathname) return trail;
    if (node.children.length) {
      const found = findActiveAncestors(node.children, pathname, [...trail, node.id]);
      if (found) return found;
    }
  }
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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    function syncFromStorage() {
      const stored = window.localStorage.getItem("pifpaf-sidebar-collapsed");
      if (stored !== null) setCollapsed(stored === "1");
      setHydrated(true);
    }
    syncFromStorage();
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem("pifpaf-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed, hydrated]);

  useEffect(() => {
    function syncActiveAncestors() {
      const ancestors = findActiveAncestors(tree, pathname);
      if (ancestors?.length) {
        setExpanded((prev) => new Set([...prev, ...ancestors]));
      }
      setMobileOpen(false);
    }
    syncActiveAncestors();
  }, [pathname, tree]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

    if (node.type === "category") {
      const isExpanded = expanded.has(node.id);
      return (
        <li key={node.id}>
          <button
            type="button"
            className="public-nav-item public-nav-category"
            style={{ paddingLeft: indent }}
            onClick={() => toggleExpand(node.id)}
            aria-expanded={isExpanded}
          >
            <span className={`public-nav-caret${isExpanded ? " open" : ""}`} aria-hidden="true" />
            {node.title}
          </button>
          {isExpanded && node.children.length > 0 && (
            <ul className="public-nav-children">{node.children.map((child) => renderNode(child, depth + 1))}</ul>
          )}
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
        {node.children.length > 0 && (
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
          <Link href="/" className="public-brand">
            pifpaf
          </Link>
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
        </div>
        <ul className="public-nav-list">{tree.map((node) => renderNode(node, 0))}</ul>
      </aside>
    </>
  );
}
