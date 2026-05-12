"use client";

/**
 * AuditRowMenu — kebab dropdown attached to each row on /audits.
 *
 * Four actions:
 *   - Re-run audit       (pre-fills the form on / with the same file URL)
 *   - Open in Figma      (jumps to the source file in a new tab)
 *   - Copy share link    (puts the public /audit/[slug] URL on the clipboard)
 *   - Delete audit       (red, opens confirmation dialog → DELETE /api/audits/[slug])
 *
 * Custom dropdown rather than Radix/shadcn primitive — small surface,
 * no extra dep. Closes on click-outside and Escape.
 *
 * Delete uses a modal confirmation. On success, router.refresh() is
 * called so the dashboard re-renders without the deleted row (Next 15
 * server-component refresh, no full page reload).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  ExternalLink,
  RotateCw,
  Link2,
  Check,
  Trash2,
  Loader2,
} from "lucide-react";

interface Props {
  slug: string;
  shareLink: string; // e.g. "/audit/abc123"
  rerunUrl: string; // e.g. "/?figma_url=https%3A%2F%2F..."
  figmaUrl: string; // original Figma file URL
}

export function AuditRowMenu({ slug, shareLink, rerunUrl, figmaUrl }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click + Escape. Dialog has its own escape handling.
  useEffect(() => {
    if (!open || confirming) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, confirming]);

  // Escape closes the dialog separately.
  useEffect(() => {
    if (!confirming) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        setConfirming(false);
        setDeleteError(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirming, deleting]);

  const copyShareLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${shareLink}`;
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 900);
    } catch {
      // Silent fail — clipboard requires a secure context.
    }
  };

  const openDeleteConfirm = () => {
    setOpen(false);
    setDeleteError(null);
    setConfirming(true);
  };

  const cancelDelete = () => {
    if (deleting) return;
    setConfirming(false);
    setDeleteError(null);
  };

  const confirmDelete = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      const res = await fetch(`/api/audits/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body?.error?.message ?? `Delete failed (${res.status})`
        );
      }
      setConfirming(false);
      setDeleting(false);
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete. Try again."
      );
      setDeleting(false);
    }
  };

  const itemClass =
    "w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors";
  const dangerItemClass =
    "w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors";

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          aria-label="More actions"
          aria-haspopup="menu"
          aria-expanded={open}
          className="p-1 rounded-md text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg p-1 z-20"
          >
            <a
              role="menuitem"
              href={rerunUrl}
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <RotateCw className="w-3.5 h-3.5" />
              Re-run audit
            </a>
            <a
              role="menuitem"
              href={figmaUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className={itemClass}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open in Figma
            </a>
            <button
              role="menuitem"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                copyShareLink();
              }}
              className={itemClass}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5" />
                  Copy share link
                </>
              )}
            </button>
            <div className="my-1 border-t border-neutral-200 dark:border-neutral-800" />
            <button
              role="menuitem"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openDeleteConfirm();
              }}
              className={dangerItemClass}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete audit
            </button>
          </div>
        )}
      </div>

      {confirming && (
        <DeleteConfirmDialog
          onCancel={cancelDelete}
          onConfirm={confirmDelete}
          deleting={deleting}
          error={deleteError}
        />
      )}
    </>
  );
}

interface DialogProps {
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
  error: string | null;
}

function DeleteConfirmDialog({
  onCancel,
  onConfirm,
  deleting,
  error,
}: DialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-audit-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-6"
    >
      {/* Backdrop */}
      <div
        onClick={onCancel}
        className="absolute inset-0 bg-neutral-950/40 dark:bg-neutral-950/70 backdrop-blur-sm"
        aria-hidden="true"
      />
      {/* Card */}
      <div className="relative bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl p-6 w-full max-w-sm">
        <h2
          id="delete-audit-title"
          className="text-base font-medium text-neutral-900 dark:text-neutral-100 mb-2"
        >
          Delete this audit?
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed mb-5">
          This permanently removes the audit from your account and breaks the
          shareable link. It can&apos;t be undone.
        </p>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200/70 dark:border-red-900/50 text-xs text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="px-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-red-600 dark:bg-red-500 text-white hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {deleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
