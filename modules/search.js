/* ═══════════════════════════════════════════
           Search — Search/filter functionality across views
           ═══════════════════════════════════════════ */

        /* ── Search/Filter Functionality ── */

        /**
         * Error/failure keywords to search for in session data
         */
        const ERROR_KEYWORDS = ['error', 'fail', 'exception', 'stack trace', 'denied', 'unauthorized', 'forbidden', 'timeout'];

        /**
         * Highlight matching text within an element using a query string
         */
        function highlightTextInElement(element, query) {
            if (!query || !element) return;

            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
            const textNodes = [];
            let node;
            while (node = walker.nextNode()) {
                if (node.parentElement && !node.parentElement.classList.contains('json-toggle')) {
                    textNodes.push(node);
                }
            }

            textNodes.forEach(textNode => {
                const text = textNode.textContent;
                const lowerText = text.toLowerCase();
                const lowerQuery = query.toLowerCase();
                const index = lowerText.indexOf(lowerQuery);

                if (index !== -1) {
                    const span = document.createElement('span');
                    span.innerHTML = text.substring(0, index);
                    const mark = document.createElement('mark');
                    mark.className = 'search-highlight-match';
                    mark.textContent = text.substring(index, index + query.length);
                    span.appendChild(mark);
                    span.innerHTML += text.substring(index + query.length);
                    textNode.parentNode.replaceChild(span, textNode);
                }
            });
        }

        /**
         * Clear all search highlights from an element
         */
        function clearHighlightsFromElement(element) {
            if (!element) return;
            const marks = element.querySelectorAll('mark.search-highlight-match');
            marks.forEach(mark => {
                const parent = mark.parentNode;
                parent.replaceChild(document.createTextNode(mark.textContent), mark);
                parent.normalize();
            });
        }

        /**
         * Filter session list rows based on search query
         */
        function filterSessions(query) {
            const tbody = document.getElementById('sessions-body');
            if (!tbody) return;

            // Clear previous highlights
            clearHighlightsFromElement(tbody);

            const rows = tbody.querySelectorAll('tr');
            let matchCount = 0;

            if (!query || query.trim() === '') {
                // Show all rows when no query
                rows.forEach(row => { row.style.display = ''; });
                updateSearchCount(0, 0);
                return;
            }

            const lowerQuery = query.toLowerCase();

            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                let rowMatch = false;

                cells.forEach(cell => {
                    const text = cell.textContent.toLowerCase();
                    if (text.includes(lowerQuery)) {
                        rowMatch = true;
                    }
                });

                // Also check for error keywords in the session data
                if (!rowMatch) {
                    ERROR_KEYWORDS.forEach(keyword => {
                        if (lowerQuery.includes(keyword)) {
                            rowMatch = true;
                        }
                    });
                }

                if (rowMatch) {
                    row.style.display = '';
                    matchCount++;
                    highlightTextInElement(row, query);
                } else {
                    row.style.display = 'none';
                }
            });

            updateSearchCount(matchCount, rows.length);
        }

        /**
         * Update the search count display
         */
        function updateSearchCount(matches, total) {
            const countEl = document.getElementById('search-count');
            if (!countEl) return;

            const query = (document.getElementById('search-input')?.value || '').trim();
            if (!query) {
                countEl.textContent = '';
            } else if (matches === 0) {
                countEl.textContent = `No matches`;
            } else {
                countEl.textContent = `${matches} of ${total} sessions`;
            }
        }

        /**
         * Clear the search input and reset filters
         */
        function clearSearch() {
            const input = document.getElementById('search-input');
            if (input) {
                input.value = '';
            }

            // Clear highlights from session list
            const tbody = document.getElementById('sessions-body');
            if (tbody) clearHighlightsFromElement(tbody);

            // Show all rows
            const rows = tbody?.querySelectorAll('tr');
            if (rows) {
                rows.forEach(row => { row.style.display = ''; });
            }

            updateSearchCount(0, 0);
        }

        /**
         * Search within the currently viewed session detail
         */
        function searchInDetail(query) {
            const chatDisplay = document.getElementById('chat-display');
            const jsonContainer = document.getElementById('json-tree-container');

            // Clear previous highlights first
            if (chatDisplay) clearHighlightsFromElement(chatDisplay);
            if (jsonContainer) clearHighlightsFromElement(jsonContainer);

            if (!query || query.trim() === '') return;

            // Highlight in chat display
            if (chatDisplay) highlightTextInElement(chatDisplay, query);

            // Highlight in JSON tree
            if (jsonContainer) highlightTextInElement(jsonContainer, query);
        }

        /**
         * Handle search input change (real-time filtering)
         */
        function onSearchInput() {
            const query = (document.getElementById('search-input')?.value || '').trim();

            // Check if we're in list view or detail view
            const listView = document.getElementById('list-view');
            if (listView && listView.style.display !== 'none') {
                filterSessions(query);
            } else {
                searchInDetail(query);
            }
        }

        /* ── Event Listeners for Search ── */
        function bindSearchEventListeners() {
            // Search input oninput handler (real-time filtering)
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.addEventListener('input', onSearchInput);
            }

            // Clear search button
            const clearBtn = document.getElementById('btn-clear-search');
            if (clearBtn) {
                clearBtn.addEventListener('click', clearSearch);
            }
        }

        // Bind listeners once DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bindSearchEventListeners);
        } else {
            bindSearchEventListeners();
        }
