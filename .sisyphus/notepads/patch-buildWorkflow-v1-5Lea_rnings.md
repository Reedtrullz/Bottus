Learnings from patch: buildWorkflow simplification
- Replaced complex multi-model chain with a fixed checkpoint: v1-5-pruned-emaonly.safetensors
- Updated inputs to preserve existing behavior where possible
- Added a concise comment documenting the simplification (see code patch)
- Verification plan: compile, run unit tests, run image generation flow if applicable
