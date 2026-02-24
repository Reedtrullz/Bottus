Decision Log: PlanRouter LSP fixes
- Preferred minimal changes: remove unused imports and fields to satisfy LSP without altering runtime behavior.
- Avoid storing unused results from database create calls unless needed for downstream logic.
- Use underscore-prefixed parameter names for intentionally unused parameters to silence linting.
- No behavioral changes to routing logic beyond suppressing warnings.
