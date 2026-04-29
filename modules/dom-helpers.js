/* ═══════════════════════════════════════════
           DOM Helpers — Shared utilities & event bindings
           ═══════════════════════════════════════════ */

        /* ── Settings Drawer ── */
        function openSettingsDrawer() {
            document.getElementById('drawer-backdrop').classList.add('open');
            document.getElementById('settings-drawer').classList.add('open');
            if (!configLoaded) loadConfig();
        }

        function closeSettingsDrawer() {
            document.getElementById('drawer-backdrop').classList.remove('open');
            document.getElementById('settings-drawer').classList.remove('open');
        }

        // Close drawer with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeSettingsDrawer();
        });

        /* ── Show/Hide Global Action Bar ── */
        function updateActionBarVisibility(show) {
            const bar = document.getElementById('global-action-bar');
            if (show && activeProjectId) {
                bar.classList.remove('hidden');
            } else {
                bar.classList.add('hidden');
            }
        }

        /* ── Update Action Bar Button States ── */
        function setExecutionState(running) {
            isExecuting = running;
            const btnRun = document.getElementById('btn-run-pipeline');
            const btnStop = document.getElementById('btn-stop');
            const btnSave = document.getElementById('btn-save');
            const statusEl = document.getElementById('action-bar-status');

            if (running) {
                btnRun.disabled = true;
                btnStop.disabled = false;
                btnSave.disabled = true;
                statusEl.innerHTML = '<div class="spinner"></div> Running...';
            } else {
                btnRun.disabled = false;
                btnStop.disabled = true;
                btnSave.disabled = false;
                statusEl.innerHTML = '';
            }
        }