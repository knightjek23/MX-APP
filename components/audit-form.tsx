"use client";

/**
 * AuditForm — the landing page form. Plain React state (no RHF) since
 * the form has only three fields. POSTs to /api/audit, redirects to
 * /audit/[slug] on success, displays error inline on failure.
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, RotateCw } from "lucide-react";
import { AuditProgress, extractFigmaFileName } from "./audit-progress";

export function AuditForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [figmaUrl, setFigmaUrl] = useState("");
  const [nodeId, setNodeId] = useState("");
  const [figmaPat, setFigmaPat] = useState("");
  const [showNodeId, setShowNodeId] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from ?figma_url=... when the entity-conflicts upsell links back.
  useEffect(() => {
    const prefilled = searchParams.get("figma_url");
    if (prefilled) setFigmaUrl(prefilled);
  }, [searchParams]);

  // Submit the audit. Extracted from onSubmit so the "Try again" button
  // inside the error box can call it directly without going through the
  // form's submit event.
  async function submitAudit() {
    if (!figmaUrl.trim() || !figmaPat.trim()) return;
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          figma_url: figmaUrl.trim(),
          figma_pat: figmaPat.trim(),
          node_id: nodeId.trim() || undefined,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error?.message ?? "Something went wrong. Try again.");
        setPending(false);
        return;
      }
      router.push(`/audit/${body.slug}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Connection dropped. Check your network and try again."
      );
      setPending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitAudit();
  }

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-legible-cream bg-white dark:bg-legible-bg text-legible-text text-sm font-light placeholder:text-legible-text-faded focus:outline-none focus:ring-2 focus:ring-legible-orange/60 focus:border-transparent transition-shadow";

  const labelClass =
    "block text-xs font-light text-legible-text mb-1.5";

  // While the audit is running, swap the form body for the dynamic
  // checklist (ai-transparency-patterns: Dynamic Checklist pattern).
  // The form unmounts on success (router.push) or re-renders with an
  // error message on failure.
  if (pending) {
    return <AuditProgress fileName={extractFigmaFileName(figmaUrl)} />;
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4"
      autoComplete="off"
      // Hint to password managers (1Password, LastPass, Bitwarden) to skip
      // this form. Combined with field-level attributes below, this stops
      // Clerk login credentials from autofilling into the Figma fields.
      data-1p-ignore="true"
      data-lpignore="true"
    >
      <div>
        <label htmlFor="figma_url" className={labelClass}>
          Figma file URL
        </label>
        <input
          id="figma_url"
          type="url"
          required
          placeholder="https://www.figma.com/design/..."
          value={figmaUrl}
          onChange={(e) => setFigmaUrl(e.target.value)}
          disabled={pending}
          className={inputClass}
          autoComplete="off"
          data-1p-ignore="true"
          data-lpignore="true"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowNodeId((s) => !s)}
          className="flex items-center gap-1 text-xs font-light text-legible-text-muted hover:text-legible-text transition-colors"
        >
          <ChevronDown
            className={`w-3 h-3 transition-transform ${showNodeId ? "rotate-180" : ""}`}
          />
          Scope to a frame? (optional)
        </button>
        {showNodeId && (
          <div className="mt-2">
            <input
              id="node_id"
              type="text"
              placeholder="e.g. 31:198"
              value={nodeId}
              onChange={(e) => setNodeId(e.target.value)}
              disabled={pending}
              className={inputClass}
              autoComplete="off"
              data-1p-ignore="true"
              data-lpignore="true"
            />
            <p className="text-[11px] font-light text-legible-text-faded mt-1">
              Right-click a frame in Figma → Copy link, then paste the URL
              above. The node ID gets picked up automatically.
            </p>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="figma_pat" className={labelClass}>
          Figma personal access token{" "}
          <a
            href="https://help.figma.com/hc/en-us/articles/8085703771159-Manage-personal-access-tokens"
            target="_blank"
            rel="noopener noreferrer"
            className="font-light text-legible-text-faded underline underline-offset-2 hover:text-legible-orange transition-colors"
          >
            How do I get one?
          </a>
        </label>
        <input
          id="figma_pat"
          type="password"
          required
          placeholder="figd_..."
          value={figmaPat}
          onChange={(e) => setFigmaPat(e.target.value)}
          disabled={pending}
          className={inputClass}
          // Chrome ignores autoComplete="off" on password fields; using
          // "new-password" is the documented escape hatch — it tells the
          // browser this is a fresh secret, not a saved login.
          autoComplete="new-password"
          data-1p-ignore="true"
          data-lpignore="true"
        />
        <p className="text-[11px] font-light text-legible-text-faded mt-1">
          Used once to fetch the file, then discarded. Never stored.
        </p>
      </div>

      {error && (
        <div className="px-3 py-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200/70 dark:border-red-900/50">
          <p className="text-sm text-red-700 dark:text-red-400 leading-snug mb-2">
            {error}
          </p>
          <button
            type="button"
            onClick={submitAudit}
            disabled={!figmaUrl.trim() || !figmaPat.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 dark:bg-red-500 text-white text-xs font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      )}

      <button
        type="submit"
        disabled={!figmaUrl.trim() || !figmaPat.trim()}
        className="legible-cta-stroke w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-brand text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        Run audit
      </button>

      <p className="text-center text-[11px] font-light text-legible-text-faded">
        Most audits take 15 to 45 seconds.
      </p>
    </form>
  );
}
