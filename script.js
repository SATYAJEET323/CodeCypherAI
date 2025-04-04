document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const themeToggle = document.querySelector('.theme-toggle');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const navLinks = document.querySelectorAll('.nav-link');
    
    // Theme Toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Check for saved theme preference or use preferred color scheme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.classList.add(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
    }
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            // Here you would typically load different content based on the page
            // For this demo, we'll just show a message
            addBotMessage(`You navigated to ${this.textContent} page. This is a demo - in a real app, this would load different content.`);
        });
    });
    
    // Send message on button click
    sendButton.addEventListener('click', sendMessage);
    
    // Send message on Enter key (but allow Shift+Enter for new lines)
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
        
        // Auto-resize textarea as user types
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
    });
    
    // Initial greeting
    setTimeout(() => {
        addBotMessage("Hello! I'm your Satyajeet's AI assistant. How can I help you today?");
    }, 500);
    
    // Functions
    function toggleTheme() {
        document.body.classList.toggle('dark-mode');
        const theme = document.body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode';
        localStorage.setItem('theme', theme);
    }
    
    function sendMessage() {
        const message = userInput.value.trim();
        if (message) {
            addUserMessage(message);
            userInput.value = '';
            userInput.style.height = 'auto';
            
            // Show loading indicator
            const loadingId = addBotMessage('<div class="loading-dots"><span></span><span></span><span></span></div>', true);
            
            // Call Gemini API
            callGeminiAPI(message, loadingId);
        }
    }
    
    function addUserMessage(text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message user-message';
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }
    
    function addBotMessage(text, isHTML = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';
        
        if (isHTML) {
            messageDiv.innerHTML = text;
        } else {
            // Format response - convert markdown code blocks, tables, etc.
            const formattedText = formatResponse(text);
            messageDiv.innerHTML = formattedText;
        }
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
        return messageDiv;
    }
    
    function updateBotMessage(id, text) {
        id.innerHTML = formatResponse(text);
        scrollToBottom();
    }
    
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    function formatResponse(text) {
        // Check if prompt asks for differences/comparison (table)
        if (isDifferencePrompt(text)) {
            return extractTable(text) || text; // Fallback to raw text if no table found
        }
        
        // Check if prompt asks for code
        if (isCodePrompt(text)) {
            return extractCode(text) || text; // Fallback to raw text if no code found
        }
        
        // Default formatting for other responses
        return formatStructuredText(text);
    }
    
    // Helper functions
    function isDifferencePrompt(text) {
        const triggers = ["difference between", "compare", "comparison", "vs", "versus"];
        return triggers.some(term => text.toLowerCase().includes(term));
    }
    
    function isCodePrompt(text) {
        const triggers = ["code for", "example of", "how to write", "implementation of", "program"];
        return triggers.some(term => text.toLowerCase().includes(term));
    }
    
    function extractTable(text) {
        const tableMatch = text.match(/(\|.*\|[\r\n])((?:\|.*\|[\r\n])+)/);
        if (tableMatch) {
            return formatTable(tableMatch[0]);
        }
        return null;
    }
    
    function formatTable(tableText) {
        const [headerRow, ...rows] = tableText.trim().split('\n');
        const headers = headerRow.split('|').slice(1, -1).map(h => h.trim());
        
        let html = '<div class="response-table"><table><thead><tr>';
        headers.forEach(header => {
            html += `<th>${header}</th>`;
        });
        html += '</tr></thead><tbody>';
        
        rows.forEach(row => {
            if (row.trim()) {
                html += '<tr>';
                row.split('|').slice(1, -1).forEach(cell => {
                    html += `<td>${cell.trim()}</td>`;
                });
                html += '</tr>';
            }
        });
        
        return html + '</tbody></table></div>';
    }
    
    function extractCode(text) {
        const codeBlock = text.match(/```(\w*)([\s\S]*?)```/);
        if (codeBlock) {
            const [_, language, code] = codeBlock;
            return formatCode(code.trim(), language);
        }
        return null;
    }
    
    function formatCode(code, language) {
        return `
            <div class="code-response">
                <div class="code-header">
                    <strong>${language ? language.toUpperCase() : 'CODE'}</strong>
                    <small><em>Implementation Example</em></small>
                </div>
                <pre><code>${code}</code></pre>
            </div>
        `;
    }
    
    // New DOM elements
    const voiceButton = document.getElementById('voice-button');
    let recognition = null;
    
    // Initialize Speech Recognition
    function initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            
            recognition.onstart = () => {
                voiceButton.classList.add('listening');
            };
            
            recognition.onend = () => {
                voiceButton.classList.remove('listening');
            };
            
            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                userInput.value = transcript;
                // Auto-send if the transcript ends with a question mark
                if (transcript.trim().endsWith('?')) {
                    setTimeout(() => sendMessage(), 500);
                }
            };
            
            recognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                addBotMessage("Voice input failed. Please try again.");
            };
        } else {
            voiceButton.style.display = 'none';
            console.warn('Speech Recognition API not supported');
        }
    }
    
    // Voice button handler
    voiceButton.addEventListener('click', () => {
        if (!recognition) {
            initSpeechRecognition();
            return;
        }
        
        if (voiceButton.classList.contains('listening')) {
            recognition.stop();
        } else {
            try {
                recognition.start();
            } catch (error) {
                console.error('Speech recognition start failed:', error);
            }
        }
    });
    
    // Enhanced formatResponse function
    function formatResponse(text) {
        // Check if prompt asks for differences/comparison (table)
        if (isDifferencePrompt(text)) {
            const table = extractTable(text);
            return table ? table : formatStructuredText(text);
        }
        
        // Check if prompt asks for code
        if (isCodePrompt(text)) {
            const code = extractCode(text);
            return code ? code : formatStructuredText(text);
        }
        
        // Default formatting for other responses
        return formatStructuredText(text);
    }
    
    // Enhanced code extraction with copy button
    function extractCode(text) {
        const codeBlock = text.match(/```(\w*)([\s\S]*?)```/);
        if (codeBlock) {
            const [_, language, code] = codeBlock;
            return formatCode(code.trim(), language);
        }
        return null;
    }
    
    function formatCode(code, language) {
        const randomId = 'code-' + Math.random().toString(36).substring(2, 9);
        return `
            <div class="code-response">
                <div class="code-header">
                    <div class="code-title">
                        <strong>${language ? language.toUpperCase() : 'CODE'}</strong>
                        <small><em>Implementation Example</em></small>
                    </div>
                    <div class="code-actions">
                        <button class="copy-btn" data-target="${randomId}">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
                <pre id="${randomId}"><code>${code}</code></pre>
            </div>
        `;
    }
    
    // Copy button functionality
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('copy-btn') || e.target.closest('.copy-btn')) {
            const button = e.target.classList.contains('copy-btn') ? e.target : e.target.closest('.copy-btn');
            const targetId = button.getAttribute('data-target');
            const codeElement = document.getElementById(targetId);
            
            if (codeElement) {
                navigator.clipboard.writeText(codeElement.textContent)
                    .then(() => {
                        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
                        button.classList.add('copied');
                        setTimeout(() => {
                            button.innerHTML = '<i class="fas fa-copy"></i> Copy';
                            button.classList.remove('copied');
                        }, 2000);
                    })
                    .catch(err => {
                        console.error('Failed to copy text: ', err);
                    });
            }
        }
    });
    function formatStructuredText(text) {
        // Format headings and lists
        return text
            .replace(/^(#\s?(.*))/gm, '<strong class="response-title">$2</strong>') // # Title → bold
            .replace(/^(##\s?(.*))/gm, '<small><em class="response-subtitle">$2</em></small>') // ## Subtitle → small italic
            .replace(/\n\n/g, '</p><p>') // Paragraphs
            .replace(/\n/g, '<br>'); // Line breaks
    }
    
    async function callGeminiAPI(prompt, loadingId) {
        const apiKey = 'AIzaSyCT8C5LrfUxIBLs7IMGCHntfx7hullpfKM'; // Replace with your actual API key
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                updateBotMessage(loadingId, data.candidates[0].content.parts[0].text);
            } else {
                updateBotMessage(loadingId, "I couldn't process that request. Please try again.");
            }
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            updateBotMessage(loadingId, "Sorry, I encountered an error. Please check your API key and try again.");
        }
    }
});