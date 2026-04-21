// TODO (Prompt 3): ClaudeService per PROJECT.md §3.2 (tool-use pattern).
// Registers AuditResultSchema as submit_audit tool input_schema.
// Forces tool_choice to submit_audit. Extracts tool_use block, zod-validates.
// Returns AuditResult + metrics (tokens_input, tokens_output, latency_ms, cost_usd, tokens_compacted).
export {};
