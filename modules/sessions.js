/* ═══════════════════════════════════════════
           Sessions — Session loading, viewing, chat display
           ═══════════════════════════════════════════ */

// Track selected session IDs for bulk deletion
let selectedSessions = new Set();

        async function loadSessions(isPolling = false) {
            try {
                const response = await fetch('/api/logs');
                const sessions = await response.json();
                const body = document.getElementById('sessions-body');
                
                if (sessions.length === 0) {
                    if (!isPolling) {
                        body.innerHTML = '<tr><td colspan="3" style="text-align:center">No recorded sessions found.</td></tr>';
                    }
                    // Clear selections when no sessions
                    selectedSessions.clear();
                    updateBulkActionBar();
                    return;
                }

                const newHtml = sessions.map(function(s) {
                    const isChecked = selectedSessions.has(s.id) ? 'checked' : '';
                    return '<tr data-session-id="' + s.id + '" class="session-row' + (selectedSessions.has(s.id) ? ' selected' : '') + '">' +
                           '<td><input type="checkbox" class="session-checkbox" data-session-id="' + s.id + '" ' + isChecked + '></td>' +
                           '<td>' + s.id + '</td>' +
                           '<td><span class="btn view-btn" data-session-id="' + s.id + '">View</span> <button class="delete-log-btn" data-session-id="' + s.id + '" title="Delete log">🗑️</button></td>' +
                           '</tr>';
                }).join('');

                if (body.innerHTML !== newHtml) {
                    body.innerHTML = newHtml;
                }

                // Update select all checkbox state
                updateSelectAllCheckbox();
            } catch (e) {
                if (!isPolling) {
                    document.getElementById('sessions-body').innerHTML = '<tr><td colspan="3" style="text-align:center; color:red">Error loading sessions.</td></tr>';
                }
            }
        }

        async function viewSession(id) {
            try {
                const response = await fetch('/api/logs/' + id);
                const rawData = await response.json();
                const exchanges = Array.isArray(rawData) ? rawData : [rawData];
                document.getElementById('session-title').textContent = 'Session: ' + id;

                const chatDisplay = document.getElementById('chat-display');
                chatDisplay.innerHTML = '';

                exchanges.forEach((exchange, index) => {
                    if (index > 0) {
                        const sep = document.createElement('div');
                        sep.className = 'message system';
                        sep.textContent = `--- Exchange ${index + 1} ---`;
                        chatDisplay.appendChild(sep);
                    }

                    if (exchange.request && exchange.request.messages) {
                        exchange.request.messages.forEach(msg => {
                            chatDisplay.appendChild(createMessageElement(msg.role, msg.content));
                        });
                    }

                    if (exchange.response) {
                        const assistantContent = parseSSEResponse(exchange.response);
                        chatDisplay.appendChild(createMessageElement('assistant', assistantContent));
                    }
                });

                // Render JSON tree view
                renderJsonView(exchanges);

                document.getElementById('list-view').style.display = 'none';
                document.getElementById('detail-view').style.display = 'block';
            } catch (e) {
                console.error(e);
                alert('Error loading session details');
            }
        }

        function createMessageElement(role, content) {
            const div = document.createElement('div');
            div.className = 'message ' + role;
            const label = document.createElement('span');
            label.className = 'role-label';
            label.textContent = role;
            const text = document.createElement('div');
            text.textContent = content;
            div.appendChild(label);
            div.appendChild(text);
            return div;
        }

        function parseSSEResponse(raw) {
            let fullText = '';
            const lines = raw.split('\n');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.substring(6).trim();
                    if (jsonStr === '[DONE]') continue;
                    try {
                        const parsed = JSON.parse(jsonStr);
                        const content = parsed.choices?.[0]?.delta?.content || '';
                        fullText += content;
                    } catch (e) {}
                }
            }
            return fullText || '(No response content captured)';
        }

        function showList() {
            document.getElementById('list-view').style.display = 'block';
            document.getElementById('detail-view').style.display = 'none';
        }

        /* ── Delete Log (single) ── */
        async function deleteLog(id) {
            if (!confirm('Delete this log? This cannot be undone.')) {
                return;
            }
            
            try {
                const response = await fetch('/api/logs/' + id, { method: 'DELETE' });
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || 'Failed to delete log');
                }
                
                // Remove from selection set if present
                selectedSessions.delete(id);
                
                // Refresh the session list
                loadSessions();
            } catch (e) {
                console.error('Error deleting log:', e);
                alert('Error deleting log: ' + e.message);
            }
        }

        /* ── Bulk Delete Selected Logs ── */
        async function deleteSelectedLogs() {
            const ids = Array.from(selectedSessions);
            if (ids.length === 0) {
                return;
            }

            const message = `Delete ${ids.length} selected session(s)? This cannot be undone.\n\nSelected: ${ids.join(', ')}`;
            if (!confirm(message)) {
                return;
            }

            try {
                const response = await fetch('/api/logs/bulk-delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: ids })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Failed to delete logs');
                }

                // Clear selections and refresh
                selectedSessions.clear();
                updateBulkActionBar();
                loadSessions();

                alert('Successfully deleted ' + result.deletedCount + ' session(s).');
            } catch (e) {
                console.error('Error deleting logs:', e);
                alert('Error deleting logs: ' + e.message);
            }
        }

        /* ── Select All / Deselect All ── */
        function toggleSelectAll() {
            const checkbox = document.getElementById('select-all-checkbox');
            if (!checkbox) return;

            const checkboxes = document.querySelectorAll('.session-checkbox');
            const allChecked = checkbox.checked;

            checkboxes.forEach(cb => {
                cb.checked = allChecked;
                const id = cb.getAttribute('data-session-id');
                if (allChecked) {
                    selectedSessions.add(id);
                } else {
                    selectedSessions.delete(id);
                }
            });

            // Update row highlighting
            document.querySelectorAll('.session-row').forEach(row => {
                const id = row.getAttribute('data-session-id');
                if (allChecked) {
                    row.classList.add('selected');
                } else {
                    row.classList.remove('selected');
                }
            });

            updateBulkActionBar();
        }

        /* ── Update Select All Checkbox State ── */
        function updateSelectAllCheckbox() {
            const checkbox = document.getElementById('select-all-checkbox');
            if (!checkbox) return;

            const allCheckboxes = document.querySelectorAll('.session-checkbox');
            if (allCheckboxes.length === 0) {
                checkbox.checked = false;
                checkbox.indeterminate = false;
                return;
            }

            const checkedCount = Array.from(allCheckboxes).filter(cb => cb.checked).length;
            checkbox.checked = checkedCount === allCheckboxes.length;
            checkbox.indeterminate = checkedCount > 0 && checkedCount < allCheckboxes.length;
        }

        /* ── Update Bulk Action Bar Visibility ── */
        function updateBulkActionBar() {
            const bar = document.getElementById('bulk-action-bar');
            const countEl = document.getElementById('delete-count');
            const selectedCountEl = document.getElementById('selected-count');

            if (!bar) return;

            const count = selectedSessions.size;
            if (count > 0) {
                bar.classList.remove('hidden');
                countEl.textContent = count;
                selectedCountEl.textContent = count + ' session(s) selected';
            } else {
                bar.classList.add('hidden');
            }
        }

        /* ── Event Listeners for Sessions ── */
        function bindSessionsEventListeners() {
            // Session table row delegation: view session on "View" button click
            const sessionsBody = document.getElementById('sessions-body');
            if (sessionsBody) {
                sessionsBody.addEventListener('click', function(e) {
                    // Handle checkbox clicks
                    const checkbox = e.target.closest('.session-checkbox');
                    if (checkbox) {
                        e.stopPropagation();
                        const id = checkbox.getAttribute('data-session-id');
                        if (checkbox.checked) {
                            selectedSessions.add(id);
                            checkbox.closest('.session-row').classList.add('selected');
                        } else {
                            selectedSessions.delete(id);
                            checkbox.closest('.session-row').classList.remove('selected');
                        }
                        updateSelectAllCheckbox();
                        updateBulkActionBar();
                        return;
                    }

                    // Handle delete button clicks
                    const deleteBtn = e.target.closest('.delete-log-btn');
                    if (deleteBtn) {
                        e.stopPropagation();
                        const id = deleteBtn.getAttribute('data-session-id');
                        if (id) deleteLog(id);
                        return;
                    }

                    // Handle view button clicks
                    const viewBtn = e.target.closest('.view-btn');
                    if (viewBtn) {
                        const id = viewBtn.getAttribute('data-session-id');
                        if (id) viewSession(id);
                        return;
                    }

                    // Fallback: handle row click for view (legacy behavior)
                    const row = e.target.closest('tr');
                    if (row && !e.target.closest('.delete-log-btn') && !e.target.closest('.view-btn') && !e.target.closest('.session-checkbox')) {
                        const id = row.getAttribute('data-session-id');
                        if (id) viewSession(id);
                    }
                });
            }

            // Select all checkbox
            const selectAllCheckbox = document.getElementById('select-all-checkbox');
            if (selectAllCheckbox) {
                selectAllCheckbox.addEventListener('click', function(e) {
                    e.stopPropagation();
                    toggleSelectAll();
                });
            }

            // Delete selected button
            const deleteSelectedBtn = document.getElementById('btn-delete-selected');
            if (deleteSelectedBtn) {
                deleteSelectedBtn.addEventListener('click', function() {
                    deleteSelectedLogs();
                });
            }

            // Back to list link
            const backLink = document.getElementById('btn-back-to-list');
            if (backLink) {
                backLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    showList();
                });
            }
        }

        // Bind listeners once DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindSessionsEventListeners);
        } else {
            bindSessionsEventListeners();
        }

        // Poll sessions every 5 seconds when list view is visible
        setInterval(function() {
            if (document.getElementById('list-view').style.display !== 'none') {
                loadSessions(true);
            }
        }, 5000);

        // Initial session load (also done in pipeline.js for the override pattern)
        loadSessions();