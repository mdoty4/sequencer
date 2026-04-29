/* ═══════════════════════════════════════════
           app.js — Global state declarations
           
           All application logic has been modularized
           into the modules/ directory. This file
           only declares shared global state that
           modules need to access across boundaries.
           
           Module load order (in index.html):
           1. dom-helpers.js   — Shared DOM utilities
           2. core.js          — App init, tabs, proxy polling
           3. projects.js      — Project CRUD + activation
           4. sessions.js      — Session loading, viewing
           5. json-viewer.js   — JSON tree view + syntax highlighting
           6. search.js        — Search/filter across views
           7. terminal.js      — Terminal panel + SSE log stream
           8. pipeline.js      — Pipeline editor, drag-drop, orchestration
           ═══════════════════════════════════════════ */

        // ── Active project tracking ──
        let activeProjectId = null;