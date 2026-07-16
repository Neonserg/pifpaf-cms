"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "pifpaf-cookie-notice-dismissed";

export default function CookieNotice() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    function syncFromStorage() {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
    }
    syncFromStorage();
  }, []);

  if (dismissed) return null;

  return (
    <div className="public-cookie-notice">
      <p>Цей сайт використовує cookies, щоб забезпечити найкращий досвід користування.</p>
      <button
        type="button"
        className="public-cookie-accept"
        onClick={() => {
          window.localStorage.setItem(STORAGE_KEY, "1");
          setDismissed(true);
        }}
      >
        Гаразд
      </button>
    </div>
  );
}
