/* ═══════════════════════════════════════════
           JSON Viewer — JSON tree view, syntax highlighting, collapsible nodes
           ═══════════════════════════════════════════ */

        // Current JSON view mode (default: tree)
        let currentJsonViewMode = 'tree';

        /**
         * Render JSON in the detail view (tree or raw mode)
         */
        function renderJsonView(exchanges) {
            const treeContainer = document.getElementById('json-tree-container');
            const rawContent = document.getElementById('json-raw-content');

            // Clear previous content
            treeContainer.innerHTML = '';
            rawContent.textContent = '';

            if (currentJsonViewMode === 'tree') {
                const tree = renderJsonTree(exchanges);
                treeContainer.appendChild(tree);
            } else {
                rawContent.textContent = JSON.stringify(exchanges, null, 2);
            }
        }

        /**
         * Set JSON view mode (tree or raw)
         */
        function setJsonViewMode(mode) {
            currentJsonViewMode = mode;

            // Update button states
            const btnTree = document.getElementById('btn-tree-view');
            const btnRaw = document.getElementById('btn-raw-view');
            if (btnTree) btnTree.classList.toggle('active', mode === 'tree');
            if (btnRaw) btnRaw.classList.toggle('active', mode === 'raw');

            // Re-render with current mode
            const title = document.getElementById('session-title').textContent;
            const id = title.replace('Session: ', '');
            if (id) {
                fetch('/api/logs/' + id)
                    .then(r => r.json())
                    .then(data => {
                        const exchanges = Array.isArray(data) ? data : [data];
                        renderJsonView(exchanges);
                    })
                    .catch(e => console.error('Error re-rendering JSON:', e));
            }
        }

        /* ── JSON Syntax Highlighting & Tree View ── */

        /**
         * Escape HTML special characters to prevent XSS
         */
        function escapeHtmlForJson(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        /**
         * Get the CSS class for a JSON value type
         */
        function getJsonClass(value) {
            if (value === null) return 'json-null';
            if (value === true || value === false) return 'json-boolean';
            if (typeof value === 'number') return 'json-number';
            if (typeof value === 'string') return 'json-string';
            return '';
        }

        /**
         * Recursively render a JSON value as an HTML tree structure
         * @param {any} data - The JSON data to render
         * @param {string} keyName - Optional key name (for object properties)
         * @param {number} depth - Current nesting depth
         * @returns {HTMLElement} The rendered tree element
         */
        function renderJsonNode(data, keyName, depth) {
            if (data === null) {
                return createJsonLeaf(keyName, 'null', 'json-null');
            }

            if (typeof data === 'boolean') {
                return createJsonLeaf(keyName, data.toString(), 'json-boolean');
            }

            if (typeof data === 'number') {
                return createJsonLeaf(keyName, data.toString(), 'json-number');
            }

            if (typeof data === 'string') {
                const escapedValue = escapeHtmlForJson(data);
                return createJsonLeaf(keyName, `"${escapedValue}"`, 'json-string');
            }

            if (Array.isArray(data)) {
                return renderJsonArray(data, keyName, depth);
            }

            if (typeof data === 'object') {
                return renderJsonObject(data, keyName, depth);
            }

            return createJsonLeaf(keyName, String(data), '');
        }

        /**
         * Create a leaf node (primitive value) with optional key
         */
        function createJsonLeaf(keyName, value, valueClass) {
            const line = document.createElement('span');
            line.className = 'json-tree-line';

            if (keyName !== undefined) {
                const keySpan = document.createElement('span');
                keySpan.className = 'json-key';
                keySpan.textContent = `"${escapeHtmlForJson(keyName)}": `;
                line.appendChild(keySpan);
            }

            const valSpan = document.createElement('span');
            valSpan.className = valueClass;
            valSpan.innerHTML = value;
            line.appendChild(valSpan);

            return line;
        }

        /**
         * Render a JSON object as a collapsible tree
         */
        function renderJsonObject(obj, keyName, depth) {
            const keys = Object.keys(obj);
            if (keys.length === 0) {
                return createJsonLeaf(keyName, '{}', 'json-bracket');
            }

            const container = document.createElement('span');
            container.className = 'json-tree';

            // Toggle button
            const toggle = document.createElement('span');
            toggle.className = 'json-toggle json-expanded';
            container.appendChild(toggle);

            // Opening brace with key
            const openLine = document.createElement('span');
            openLine.className = 'json-tree-line';
            if (keyName !== undefined) {
                const keySpan = document.createElement('span');
                keySpan.className = 'json-key';
                keySpan.textContent = `"${escapeHtmlForJson(keyName)}": `;
                openLine.appendChild(keySpan);
            }
            const openBrace = document.createElement('span');
            openBrace.className = 'json-bracket';
            openBrace.textContent = '{ ';
            openLine.appendChild(openBrace);

            // Preview text (shown when collapsed)
            const preview = document.createElement('span');
            preview.className = 'json-preview';
            preview.style.display = 'none';
            const sampleKey = escapeHtmlForJson(keys[0]);
            preview.textContent = `{ ${sampleKey}: ... (${keys.length} items) }`;

            container.appendChild(openLine);
            container.appendChild(preview);

            // Children container
            const children = document.createElement('span');
            children.className = 'json-children';

            keys.forEach((key, index) => {
                const childLine = document.createElement('span');
                childLine.className = 'json-tree-line';

                // Comma before all but first item
                if (index > 0) {
                    const comma = document.createElement('span');
                    comma.className = 'json-comma';
                    comma.textContent = ',';
                    childLine.appendChild(comma);
                }

                const indent = document.createElement('span');
                indent.style.display = 'inline-block';
                indent.style.width = (depth * 1.4) + 'em';
                childLine.appendChild(indent);

                const node = renderJsonNode(obj[key], key, depth + 1);
                childLine.appendChild(node);

                // Trailing comma (for consistency with formatted JSON)
                if (index < keys.length - 1) {
                    const comma = document.createElement('span');
                    comma.className = 'json-comma';
                    comma.textContent = ',';
                    childLine.appendChild(comma);
                }

                children.appendChild(childLine);
            });

            container.appendChild(children);

            // Closing brace line
            const closeLine = document.createElement('span');
            closeLine.className = 'json-tree-line';
            const closeIndent = document.createElement('span');
            closeIndent.style.display = 'inline-block';
            closeIndent.style.width = (depth * 1.4) + 'em';
            closeLine.appendChild(closeIndent);
            const closeBrace = document.createElement('span');
            closeBrace.className = 'json-bracket';
            closeBrace.textContent = '}';
            closeLine.appendChild(closeBrace);
            container.appendChild(closeLine);

            // Collapse/expand toggle handler
            toggle.addEventListener('click', function() {
                const isCollapsed = container.classList.contains('json-collapsed');
                if (isCollapsed) {
                    // Expand
                    container.classList.remove('json-collapsed');
                    container.classList.add('json-expanded');
                    children.style.display = '';
                    preview.style.display = 'none';
                } else {
                    // Collapse
                    container.classList.remove('json-expanded');
                    container.classList.add('json-collapsed');
                    children.style.display = 'none';
                    preview.style.display = '';
                }
            });

            // Start expanded
            container.classList.add('json-expanded');

            return container;
        }

        /* ── Event Listeners for JSON Viewer ── */
        function bindJsonViewerEventListeners() {
            const btnTree = document.getElementById('btn-tree-view');
            if (btnTree) {
                btnTree.addEventListener('click', function() {
                    setJsonViewMode('tree');
                });
            }

            const btnRaw = document.getElementById('btn-raw-view');
            if (btnRaw) {
                btnRaw.addEventListener('click', function() {
                    setJsonViewMode('raw');
                });
            }
        }

        // Bind listeners once DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindJsonViewerEventListeners);
        } else {
            bindJsonViewerEventListeners();
        }

        /**
         * Render a JSON array as a collapsible tree
         */
        function renderJsonArray(arr, keyName, depth) {
            if (arr.length === 0) {
                return createJsonLeaf(keyName, '[]', 'json-bracket');
            }

            const container = document.createElement('span');
            container.className = 'json-tree';

            // Toggle button
            const toggle = document.createElement('span');
            toggle.className = 'json-toggle json-expanded';
            container.appendChild(toggle);

            // Opening bracket with key
            const openLine = document.createElement('span');
            openLine.className = 'json-tree-line';
            if (keyName !== undefined) {
                const keySpan = document.createElement('span');
                keySpan.className = 'json-key';
                keySpan.textContent = `"${escapeHtmlForJson(keyName)}": `;
                openLine.appendChild(keySpan);
            }
            const openBrace = document.createElement('span');
            openBrace.className = 'json-bracket';
            openBrace.textContent = '[ ';
            openLine.appendChild(openBrace);

            // Preview text (shown when collapsed)
            const preview = document.createElement('span');
            preview.className = 'json-preview';
            preview.style.display = 'none';
            preview.textContent = `[ ${arr.length} items ]`;

            container.appendChild(openLine);
            container.appendChild(preview);

            // Children container
            const children = document.createElement('span');
            children.className = 'json-children';

            arr.forEach((item, index) => {
                const childLine = document.createElement('span');
                childLine.className = 'json-tree-line';

                // Comma before all but first item
                if (index > 0) {
                    const comma = document.createElement('span');
                    comma.className = 'json-comma';
                    comma.textContent = ',';
                    childLine.appendChild(comma);
                }

                const indent = document.createElement('span');
                indent.style.display = 'inline-block';
                indent.style.width = (depth * 1.4) + 'em';
                childLine.appendChild(indent);

                const node = renderJsonNode(item, undefined, depth + 1);
                childLine.appendChild(node);

                // Trailing comma
                if (index < arr.length - 1) {
                    const comma = document.createElement('span');
                    comma.className = 'json-comma';
                    comma.textContent = ',';
                    childLine.appendChild(comma);
                }

                children.appendChild(childLine);
            });

            container.appendChild(children);

            // Closing bracket line
            const closeLine = document.createElement('span');
            closeLine.className = 'json-tree-line';
            const closeIndent = document.createElement('span');
            closeIndent.style.display = 'inline-block';
            closeIndent.style.width = (depth * 1.4) + 'em';
            closeLine.appendChild(closeIndent);
            const closeBrace = document.createElement('span');
            closeBrace.className = 'json-bracket';
            closeBrace.textContent = ']';
            closeLine.appendChild(closeBrace);
            container.appendChild(closeLine);

            // Collapse/expand toggle handler
            toggle.addEventListener('click', function() {
                const isCollapsed = container.classList.contains('json-collapsed');
                if (isCollapsed) {
                    container.classList.remove('json-collapsed');
                    container.classList.add('json-expanded');
                    children.style.display = '';
                    preview.style.display = 'none';
                } else {
                    container.classList.remove('json-expanded');
                    container.classList.add('json-collapsed');
                    children.style.display = 'none';
                    preview.style.display = '';
                }
            });

            // Start expanded
            container.classList.add('json-expanded');

            return container;
        }

        /**
         * Render a complete JSON object as an interactive tree
         * @param {any} data - The JSON data to render
         * @returns {HTMLElement} Container with the rendered tree
         */
        function renderJsonTree(data) {
            const container = document.createElement('div');
            container.className = 'json-tree-container';

            // Render each top-level element (usually an array of exchanges)
            if (Array.isArray(data)) {
                data.forEach((item, index) => {
                    const line = document.createElement('span');
                    line.className = 'json-tree-line';

                    // Array index label
                    const idxSpan = document.createElement('span');
                    idxSpan.className = 'json-key';
                    idxSpan.textContent = `[${index}]`;
                    line.appendChild(idxSpan);

                    const colon = document.createElement('span');
                    colon.className = 'json-colon';
                    colon.textContent = ': ';
                    line.appendChild(colon);

                    const node = renderJsonNode(item, undefined, 0);
                    line.appendChild(node);

                    // Comma between items
                    if (index < data.length - 1) {
                        const comma = document.createElement('span');
                        comma.className = 'json-comma';
                        comma.textContent = ',';
                        line.appendChild(comma);
                    }

                    container.appendChild(line);
                });
            } else {
                const node = renderJsonNode(data, undefined, 0);
                container.appendChild(node);
            }

            return container;
        }