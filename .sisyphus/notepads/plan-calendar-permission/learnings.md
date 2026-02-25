Plan: Calendar Skill - Permission checks for deleteEvent
- Added imports for Permission and audit-log (import lines after line 3)
- Updated deleteEvent signature to accept optional ctx: HandlerContext
- Implemented runtime permission check at start of deleteEvent using Permission.DELETE_EVENT
- If no permission, log denial via security.auditLogger and respond with Norwegian message
- Updated call site to pass ctx into deleteEvent
- Ensured audit path will be executed for permission-denied cases
