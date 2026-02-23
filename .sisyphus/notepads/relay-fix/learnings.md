## Learnings from image-generation relay patch
- Replaced image generation handling to use structured result: `{ success, imageUrl, error }` and userId context.
- Updated user-facing messages to be Norwegian: success path shows the image with label, failure path logs warning and sends an apology with error detail.
- This reduces reliance on a raw URL return and improves error handling and user feedback.

## Bottus v2 package.json update
- Replaced googleapis with better-sqlite3, node-schedule, rrule in dependencies
- Added devDependencies: @types/better-sqlite3, @types/node-schedule
- npm install may fail in this environment without Python build tools; recommended to run in CI with Python and proper compilers or use node version with prebuilt binaries
