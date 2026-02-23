## Learnings from image-generation relay patch
- Replaced image generation handling to use structured result: `{ success, imageUrl, error }` and userId context.
- Updated user-facing messages to be Norwegian: success path shows the image with label, failure path logs warning and sends an apology with error detail.
- This reduces reliance on a raw URL return and improves error handling and user feedback.
