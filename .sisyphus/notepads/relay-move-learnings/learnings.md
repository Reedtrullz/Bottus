Moved ComfyUI health check and DM sending from before login to after login in src/relay/index.ts.

- Action: Deleted the block (lines near 570-592) that performed the Readiness check before login.
- Action: Inserted the same block immediately after 'await discord.login();' to ensure the user context is available.
- Verification: Build passes; search for the block appears only after the login call.

- Rationale: User cache and DM sending require a logged-in discord client; moving to after login ensures the DM can be delivered successfully.
