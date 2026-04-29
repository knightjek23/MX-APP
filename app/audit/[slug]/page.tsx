/**
 * /audit/[slug] — the report page.
 * Server component: fetches the audit from Supabase, renders AuditReport.
 * 404 if slug not found.
 */

import { notFound } from "next/navigation";
import { AuditService } from "@/lib/services/audit";
import { getSupabaseClient } from "@/lib/db/supabase";
import { AuditReport } from "@/components/audit-report";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function AuditPage({ params }: Props) {
  const { slug } = await params;

  const service = new AuditService(getSupabaseClient());
  const audit = await service.fetch(slug);

  if (!audit) {
    notFound();
  }

  return <AuditReport audit={audit} />;
}

// Run-time render, no caching — audits are per-request lookups.
export const dynamic = "force-dynamic";
