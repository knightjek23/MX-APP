"use client";

/**
 * AuditForm — the landing page form. Plain React state (no RHF) since
 * the form has only three fields. POSTs to /api/audit, redirects to
 * /audit/[slug] on success, displays error inline on failure.
 */

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Loader2 } from "lucide-react";

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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        err instanceof Error ? err.message : "Network error. Check your connection."
      );
      setPending(false);
    }
  }

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-neutral-100 focus:border-transparent transition-shadow";

  const labelClass =
    "block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowNodeId((s) => !s)}
          className="flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
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
            />
            <p className="text-[11px] text-neutral-500 dark:text-neutral-500 mt-1">
              Right-click a frame in Figma → Copy link. Paste the URL above — the
              node ID is parsed automatically.
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
            className="font-normal text-neutral-500 dark:text-neutral-400 underline underline-offset-2"
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
          autoComplete="off"
        />
        <p className="text-[11px] text-neutral-500 dark:text-neutral-500 mt-1">
          Your token is used once to fetch the file, then discarded. Never stored.
        </p>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200/70 dark:border-red-900/50 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending || !figmaUrl.trim() || !figmaPat.trim()}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 text-sm font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Auditing…
          </>
        ) : (
          "Run audit"
        )}
      </button>

      <p className="text-center text-[11px] text-neutral-500 dark:text-neutral-500">
        Typical audit takes 15–45 seconds.
      </p>
    </form>
  );
}
