/**
 * DELETE /api/audits/[slug]
 *
 * Owner-scoped delete. Requires Clerk auth; the service method filters
 * on user_id so a non-owner can't delete someone else's audit by URL
 * guessing. We surface "not found OR not yours" as a single 404 to
 * avoid leaking which slugs exist.
 *
 * On success: { deleted: true }. Dashboard refreshes client-side via
 * router.refresh() in the calling component.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { AuditService, AuditFetchError } from "@/lib/services/audit";
import { getSupabaseClient } from "@/lib/db/supabase";
import { logger } from "@/lib/logger";

function errorResponse(status: number, message: string, code: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return errorResponse(401, "Sign in to delete audits.", "auth_required");
  }

  const { slug } = await params;

  try {
    const service = new AuditService(getSupabaseClient());
    const { deleted } = await service.deleteBySlug(slug, userId);

    if (!deleted) {
      // Either the slug doesn't exist or the user isn't the owner. We
      // collapse both to 404 — leaking the difference would let an
      // attacker enumerate which slugs are owned vs missing.
      return errorResponse(
        404,
        "Audit not found, or it isn't yours to delete.",
        "audit_not_found"
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    if (err instanceof AuditFetchError) {
      logger.error("audit.delete.persist_error", { slug, message: err.message });
      return errorResponse(
        500,
        "Failed to delete audit. Try again.",
        "delete_error"
      );
    }
    logger.error("audit.delete.unexpected", {
      slug,
      error: err instanceof Error ? err.message : String(err),
    });
    return errorResponse(
      500,
      "Something went wrong. Try again.",
      "internal_error"
    );
  }
}
