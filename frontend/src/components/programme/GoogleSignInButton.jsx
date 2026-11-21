import { useEffect, useRef, useState } from "react";

const GIS_SRC = "https://accounts.google.com/gsi/client";
let gisPromise = null;

/** Load Google Identity Services once per page. */
const loadGis = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!gisPromise) {
    gisPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = GIS_SRC;
      s.async = true;
      s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => {
        gisPromise = null;
        reject(new Error("Could not load Google Sign-In"));
      };
      document.head.appendChild(s);
    });
  }
  return gisPromise;
};

export const googleSignOut = () => {
  try {
    window.google?.accounts?.id?.disableAutoSelect();
  } catch {
    /* GIS not loaded — nothing to clear */
  }
};

/**
 * Renders Google's official "Sign in with Google" button. `onCredential` receives
 * the ID token (a JWT) — send it to the API, which verifies it; never trust its
 * contents client-side.
 */
export const GoogleSignInButton = ({ clientId, onCredential, theme = "dark", text = "continue_with" }) => {
  const ref = useRef(null);
  const cb = useRef(onCredential);
  const [error, setError] = useState("");
  cb.current = onCredential;

  useEffect(() => {
    let cancelled = false;
    loadGis()
      .then(() => {
        if (cancelled || !ref.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res) => res?.credential && cb.current(res.credential),
          ux_mode: "popup",
          auto_select: false,
          cancel_on_tap_outside: true,
          itp_support: true,
          use_fedcm_for_prompt: true,
        });
        ref.current.innerHTML = "";
        window.google.accounts.id.renderButton(ref.current, {
          type: "standard",
          theme: theme === "light" ? "outline" : "filled_black",
          size: "large",
          text,
          shape: "rectangular",
          logo_alignment: "left",
          width: Math.min(360, ref.current.offsetWidth || 320),
        });
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [clientId, theme, text]);

  return (
    <div>
      <div ref={ref} className="min-h-[44px] w-full max-w-[360px]" data-testid="google-signin-button" />
      {error && (
        <p className="mt-3 text-sm text-red-400" data-testid="google-signin-error">
          {error}. Check your connection or disable content blockers for this page, then reload.
        </p>
      )}
    </div>
  );
};

export default GoogleSignInButton;
