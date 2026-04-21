// Zod schemas and inferred types for the Legible audit result.
// This is the contract between ClaudeService.audit() and <AuditReport />.
// Also used as the input_schema of the `submit_audit` tool (see PROJECT.md §3.2).

import { z } from "zod";

export const PrioritySchema = z.enum(["P1", "P2", "P3"]);

export const CategorySchema = z.enum([
  "semantic_html",
  "aria",
  "schema",
  "hidden_content",
  "entity",
  "initial_html",
  "contrast",
  "personalization",
  "empty_state",
  "figma_export",
]);

export const AnnotationSchema = z.object({
  priority: PrioritySchema,
  category: CategorySchema,
  recommendation: z.string().min(10).max(800),
  rationale: z.string().min(10).max(600),
  code_hint: z.string().nullable(),
});

export const FrameAuditSchema = z.object({
  node_id: z.string(),
  name: z.string(),
  annotations: z.array(AnnotationSchema),
});

export const EntityConflictSchema = z.object({
  variants: z.array(z.string()).min(2),
  occurrences: z.array(
    z.object({
      node_id: z.string(),
      variant: z.string(),
    })
  ),
  recommended: z.string(),
});

export const AuditSummarySchema = z.object({
  p1_count: z.number().int().nonnegative(),
  p2_count: z.number().int().nonnegative(),
  p3_count: z.number().int().nonnegative(),
  overall_score: z.number().int().min(0).max(100),
});

export const AuditResultSchema = z.object({
  audit_version: z.literal("v1"),
  scope: z.enum(["full-file", "single-frame"]),
  frames: z.array(FrameAuditSchema),
  // Always [] when scope === "single-frame"
  entity_conflicts: z.array(EntityConflictSchema),
  summary: AuditSummarySchema,
});

// Inferred TypeScript types — import these in service layer and components.
export type Priority = z.infer<typeof PrioritySchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Annotation = z.infer<typeof AnnotationSchema>;
export type FrameAudit = z.infer<typeof FrameAuditSchema>;
export type EntityConflict = z.infer<typeof EntityConflictSchema>;
export type AuditSummary = z.infer<typeof AuditSummarySchema>;
export type AuditResult = z.infer<typeof AuditResultSchema>;
