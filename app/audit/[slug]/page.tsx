/**
 * /audit/[slug] — the report page.
 * Server component: fetches the audit from Supabase, renders AuditReport.
 * 404 if slug not found.
 *
 * Public route — anyone with the slug URL can view. Auth check happens
 * here only to compute whether the viewer is the audit's owner, so we
 * can show a "Yours" indicator. Anonymous viewers see the same content
 * minus the indicator.
 */

import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AuditService } from "@/lib/services/audit";
import { getSupabaseClient } from "@/lib/db/supabase";
import { AuditReport } from "@/components/audit-report";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AuditPage({ params }: Props) {
  const { slug } = await params;
  const { userId } = await auth();

  const service = new AuditService(getSupabaseClient());
  const audit = await service.fetch(slug);

  if (!audit) {
    notFound();
  }

  return <AuditReport audit={audit} viewerUserId={userId} />;
}

// Run-time render, no caching — audits are per-request lookups.
export const dynamic = "force-dynamic";
