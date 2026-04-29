/* ═══════════════════════════════════════════
           Terminal — Live terminal panel, SSE log stream connection
           ═══════════════════════════════════════════ */

        /* ── Execution State ── */
        let isExecuting = false;
        let sseSource = null;  // SSE connection reference

        /* ── Run Pipeline: Start Orchestration via Global Action Bar ── */
        async function runPipeline() {
            if (!activeProjectId) return alert('Please activate a project first');

            const rows = document.querySelectorAll('#pipeline-editor .prompt-row.selected');
            if (rows.length === 0) return alert('No tasks selected for orchestration. Toggle the checkboxes on the right of each task.');

            // Collect indices of selected tasks (in order)
            const taskIndices = [];
            rows.forEach(row => {
                const idx = parseInt(row.dataset.index, 10);
                taskIndices.push(idx);
            });

            // Show terminal panel and open it
            const termPanel = document.getElementById('terminal-panel');
            termPanel.classList.add('visible');
            document.getElementById('terminal-content').classList.add('open');
            clearTerminal();
            appendToTerminal('▶ Preparing pipeline execution...', 'event-info');

            // Set execution state
            setExecutionState(true);

            try {
                const response = await fetch(`/api/project/${activeProjectId}/tasks/orchestrate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskIndices })
                });

                const result = await response.json();

                if (result.success) {
                    appendToTerminal(`  → ${taskIndices.length} task(s) queued for execution.`, 'event-info');
                    // Connect to SSE stream if available
                    connectToLogStream(activeProjectId);
                    // Also poll for status updates
                    pollOrchestrationStatusForActionBar();
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (error) {
                setExecutionState(false);
                appendToTerminal(`✗ Error: ${error.message}`, 'event-stderr');
                console.error('Pipeline error:', error);
            }
        }

        /* ── Stop Pipeline: Cancel running execution ── */
        async function stopPipeline() {
            if (!activeProjectId) return;
            if (!confirm('Stop the current pipeline execution?')) return;

            appendToTerminal('⏹ Sending stop signal...', 'event-stderr');

            try {
                const response = await fetch(`/api/project/${activeProjectId}/tasks/cancel`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                const result = await response.json();

                if (result.success) {
                    // Close SSE connection
                    disconnectLogStream();
                    
                    setExecutionState(false);
                    appendToTerminal('✓ Execution cancelled by user.', 'event-info');

                    // Reload pipeline to show updated states
                    await loadPipeline();
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            } catch (error) {
                appendToTerminal(`✗ Stop failed: ${error.message}`, 'event-stderr');
                console.error('Stop error:', error);
                // Force reset state
                setExecutionState(false);
                disconnectLogStream();
            }
        }

        /* ── Poll orchestration status for action bar ── */
        async function pollOrchestrationStatusForActionBar() {
            const maxPolls = 600; // 5 minutes max
            let pollCount = 0;

            const poll = async () => {
                if (pollCount++ > maxPolls || !isExecuting) return;

                try {
                    const response = await fetch(`/api/project/${activeProjectId}/tasks`);
                    const data = await response.json();
                    const tasks = data.tasks || [];

                    const selectedRows = document.querySelectorAll('#pipeline-editor .prompt-row.selected');
                    let allDone = true;

                    selectedRows.forEach(row => {
                        const idx = parseInt(row.dataset.index, 10);
                        const task = tasks[idx];
                        if (task && (task.state === 'done' || task.state === 'failed')) {
                            row.className = `prompt-row ${task.orchestrate ? 'selected' : ''} ${task.state}`;
                        } else {
                            allDone = false;
                        }
                    });

                    if (!allDone && isExecuting) {
                        setTimeout(poll, 2000);
                    } else if (allDone) {
                        const doneCount = tasks.filter(t => t.state === 'done').length;
                        const failedCount = tasks.filter(t => t.state === 'failed').length;
                        setExecutionState(false);
                        appendToTerminal(`✓ Pipeline complete: ${doneCount} succeeded, ${failedCount} failed`, 'event-info');
                        disconnectLogStream();
                        await loadPipeline();
                    } else {
                        setTimeout(poll, 2000);
                    }
                } catch (e) {
                    setTimeout(poll, 2000);
                }
            };

            poll();
        }

        /* ── Terminal Panel: Toggle ── */
        function toggleTerminal() {
            const content = document.getElementById('terminal-content');
            const icon = document.getElementById('terminal-toggle-icon');
            content.classList.toggle('open');
            icon.textContent = content.classList.contains('open') ? '▲' : '▼';
        }

        /* ── Terminal Panel: Append Log Entry ── */
        function appendToTerminal(text, className = '') {
            const log = document.getElementById('terminal-log');
            if (!log) return;

            const entry = document.createElement('div');
            if (className) entry.className = className;

            const timestamp = document.createElement('span');
            timestamp.style.color = '#555';
            timestamp.style.marginRight = '8px';
            timestamp.textContent = `[${new Date().toLocaleTimeString()}]`;
            entry.appendChild(timestamp);
            entry.appendChild(document.createTextNode(text));

            log.appendChild(entry);
            log.scrollTop = log.scrollHeight; // Auto-scroll to bottom
        }

        /* ── Terminal Panel: Clear Log ── */
        function clearTerminal() {
            const log = document.getElementById('terminal-log');
            if (log) log.innerHTML = '';
        }

        /* ── SSE: Connect to Log Stream ── */
        function connectToLogStream(projectId) {
            // Close any existing connection
            disconnectLogStream();

            try {
                sseSource = new EventSource(`/api/project/${projectId}/tasks/stream`);

                sseSource.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        switch (data.type) {
                            case 'orchestration_start':
                                appendToTerminal(`▶ Orchestration started for project ${projectId}`, 'event-session');
                                break;
                            case 'task_start':
                                appendToTerminal(`  └─ Running task ${data.taskIndex}: "${data.prompt || ''}" [${data.agent || 'aider'}]`, 'event-info');
                                break;
                            case 'task_done':
                                appendToTerminal(`  ✓ Task ${data.taskIndex} completed`, 'event-info');
                                break;
                            case 'task_failed':
                                appendToTerminal(`  ✗ Task ${data.taskIndex} failed: ${data.error || 'Unknown error'}`, 'event-stderr');
                                break;
                            case 'orchestration_complete':
                                appendToTerminal(`✓ All tasks done: ${data.completed} succeeded, ${data.failed} failed`, 'event-session');
                                break;
                            case 'stdout':
                                if (data.text && data.text.trim()) {
                                    appendToTerminal(`    ${data.text.trim()}`, 'event-stdout');
                                }
                                break;
                            case 'stderr':
                                if (data.text && data.text.trim()) {
                                    appendToTerminal(`    [err] ${data.text.trim()}`, 'event-stderr');
                                }
                                break;
                            case 'tool_use':
                                appendToTerminal(`  ⚡ Tool: ${data.toolName}`, 'event-tool');
                                break;
                            case 'file_created':
                                appendToTerminal(`  📄 File: ${data.filePath}`, 'event-file');
                                break;
                            case 'session_start':
                                appendToTerminal(`▶ Session ${data.sessionId || ''} started`, 'event-session');
                                break;
                            case 'session_end':
                                appendToTerminal(`▶ Session ended (exit code: ${data.exitCode})`, 'event-session');
                                break;
                            case 'session_error':
                                appendToTerminal(`✗ Session error: ${data.error}`, 'event-stderr');
                                break;
                        }
                    } catch (e) {
                        console.error('SSE parse error:', e);
                    }
                };

                sseSource.onerror = (err) => {
                    console.error('SSE connection error:', err);
                    appendToTerminal('⚠ Stream connection lost.', 'event-stderr');
                };

                appendToTerminal('  → Connected to live output stream.', 'event-info');
            } catch (e) {
                console.error('SSE connection failed:', e);
                appendToTerminal('⚠ Could not connect to live stream.', 'event-stderr');
            }
        }

        /* ── SSE: Disconnect Log Stream ── */
        function disconnectLogStream() {
            if (sseSource) {
                sseSource.close();
                sseSource = null;
            }
        }

        /* ── Event Listeners for Terminal/Execution Controls ── */
        function bindTerminalEventListeners() {
            // Run pipeline button (global action bar)
            const runBtn = document.getElementById('btn-run-pipeline');
            if (runBtn) {
                runBtn.addEventListener('click', runPipeline);
            }

            // Stop pipeline button (global action bar)
            const stopBtn = document.getElementById('btn-stop');
            if (stopBtn) {
                stopBtn.addEventListener('click', stopPipeline);
            }

            // Toggle terminal header click
            const terminalHeader = document.getElementById('terminal-header-toggle');
            if (terminalHeader) {
                terminalHeader.addEventListener('click', toggleTerminal);
            }
        }

        // Bind listeners once DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindTerminalEventListeners);
        } else {
            bindTerminalEventListeners();
        }

        /* ── Terminal hooks called by projects.js when activation state changes ── */
        function onProjectActivated() {
            updateActionBarVisibility(true);
        }

        async function onProjectReset() {
            setExecutionState(false);
            disconnectLogStream();
            updateActionBarVisibility(false);
        }

        // Export hooks for cross-module communication
        if (typeof window !== 'undefined') {
            window.__terminalHooks = { onProjectActivated, onProjectReset };
        }
