# Learnings

- Created a GitHub Actions workflow to validate and apply code proposal patches.
- Key considerations:
- Ensure YAML syntax is valid; validate with lsp_diagnostics after patch creation.
- The patch is base64-encoded in the workflow input and decoded at runtime for patch application.
