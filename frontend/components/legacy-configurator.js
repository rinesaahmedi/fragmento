"use client";

import { useEffect, useRef } from "react";

function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-legacy-src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.dataset.legacySrc = src;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true },
    );
    script.addEventListener("error", reject, { once: true });
    document.body.appendChild(script);
  });
}

export default function LegacyConfigurator({
  title,
  styles,
  bodyHtml,
  externalScripts,
  inlineScripts,
}) {
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) {
      return;
    }

    initializedRef.current = true;
    document.title = title || document.title;

    let cancelled = false;

    const boot = async () => {
      for (const src of externalScripts) {
        if (cancelled) {
          return;
        }
        await loadExternalScript(src);
      }

      for (const code of inlineScripts) {
        if (cancelled) {
          return;
        }
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.dataset.legacyInline = "true";
        script.text = code;
        document.body.appendChild(script);
      }

      document.dispatchEvent(new Event("DOMContentLoaded"));
    };

    boot().catch((error) => {
      console.error("Failed to boot legacy configurator", error);
    });

    return () => {
      cancelled = true;
    };
  }, [externalScripts, inlineScripts, title]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <main dangerouslySetInnerHTML={{ __html: bodyHtml }} />
    </>
  );
}
