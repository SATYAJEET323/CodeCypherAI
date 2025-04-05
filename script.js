document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const themeToggle = document.querySelector('.theme-toggle');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const voiceButton = document.getElementById('voice-button');
    
    // Theme Toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Check for saved theme preference or use preferred color scheme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.body.classList.add(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.body.classList.add('dark-mode');
    }
    
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
    
    // Voice Recognition Setup
    let recognition = null;
    initSpeechRecognition();
    
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
        // First check if this is a code or table response
        if (isCodePrompt(text)) {
            const code = extractCode(text);
            if (code) return code;
        }
        
        if (isDifferencePrompt(text)) {
            const table = extractTable(text);
            if (table) return table;
        }

        // Process for clean, structured text without markdown
        return formatCleanText(text);
    }

    function formatCleanText(text) {
        // Clean up the text by removing markdown symbols
        let cleanedText = text
            .replace(/\*\*/g, '') // Remove markdown bold
            .replace(/\*/g, '')   // Remove markdown italics
            .replace(/`/g, '')    // Remove code ticks
            .replace(/^#+\s+/gm, '') // Remove markdown headings
            .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Remove markdown links

        // Split into paragraphs and process each one
        let paragraphs = cleanedText.split('\n\n').filter(p => p.trim());
        let formattedHTML = '';
        
        paragraphs.forEach((para, index) => {
            // Add paragraph breaks between paragraphs
            if (index > 0) {
                formattedHTML += '<div class="paragraph-gap"></div>';
            }
            
            // Highlight key terms and add proper line breaks
            formattedHTML += `<p>${highlightKeyTerms(addLineBreaks(para))}</p>`;
        });

        return formattedHTML;
    }

    function highlightKeyTerms(text) {
        // Highlight important terms
        const keyTerms = [
            'important', 'note', 'warning', 'key', 'essential',
            'benefit', 'advantage', 'disadvantage', 'difference',
            'example', 'tip', 'remember', 'warning', 'caution'
        ];
        
        const pattern = new RegExp(`\\b(${keyTerms.join('|')})\\b`, 'gi');
        return text.replace(pattern, '<span class="highlight">$1</span>');
    }

    function addLineBreaks(text) {
        // Convert single newlines to proper HTML line breaks
        return text.replace(/\n/g, '<br>');
    }

    // function formatConciseText(text) {
    //     // Clean up the text first
    //     let cleanedText = text
    //         .replace(/\*\*/g, '') // Remove markdown bold
    //         .replace(/\*/g, '')   // Remove markdown italics
    //         .replace(/`/g, '');   // Remove code ticks

    //     // Split into paragraphs
    //     let paragraphs = cleanedText.split('\n\n');
        
    //     // Process each paragraph
    //     let formattedHTML = '';
    //     let isFirstParagraph = true;
        
    //     paragraphs.forEach(para => {
    //         if (!para.trim()) return;
            
    //         // For the first paragraph (summary), keep it concise
    //         if (isFirstParagraph) {
    //             formattedHTML += `<p class="summary">${highlightKeyTerms(para)}</p>`;
    //             isFirstParagraph = false;
    //         } 
    //         // For subsequent paragraphs (details), add expandable sections
    //         else {
    //             formattedHTML += `
    //                 <div class="expandable-section">
    //                     <div class="expandable-content">
    //                         <p>${highlightKeyTerms(para)}</p>
    //                     </div>
    //                     <button class="expand-btn">Show more</button>
    //                 </div>
    //             `;
    //         }
    //     });

    //     return formattedHTML;
    // }
    
    
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
    
    function formatStructuredText(text) {
        return text
            .replace(/^(#\s?(.*))/gm, '<strong class="response-title">$2</strong>')
            .replace(/^(##\s?(.*))/gm, '<small><em class="response-subtitle">$2</em></small>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
    }

    
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
    
    // Copy button functionality
    document.addEventListener('click', function(e) {
        // Handle copy buttons (existing functionality)
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
        
        // Handle expand buttons (new functionality)
        if (e.target.classList.contains('expand-btn')) {
            const btn = e.target;
            const content = btn.previousElementSibling;
            
            if (content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                btn.textContent = 'Show more';
            } else {
                content.classList.add('expanded');
                btn.textContent = 'Show less';
            }
        }
    });
    
    async function callGeminiAPI(prompt, loadingId) {
        try {
            // Load API key from environment variable
            let apiKey;
            
            // Try to get from window.__ENV first (for development)
            if (window.__ENV && window.__ENV.GEMINI_API_KEY) {
                apiKey = window.__ENV.GEMINI_API_KEY;
            } 
            // Fallback to trying to load from .env file
            else {
                try {
                    const response = await fetch('/.env');
                    if (response.ok) {
                        const envText = await response.text();
                        const envLines = envText.split('\n');
                        for (const line of envLines) {
                            if (line.startsWith('GEMINI_API_KEY=')) {
                                apiKey = line.split('=')[1].trim();
                                break;
                            }
                        }
                    }
                } catch (err) {
                    console.log('Could not load .env file:', err);
                }
            }
            
            // Final fallback to prompt
            if (!apiKey) {
                apiKey = prompt("Please enter your key:");
                if (!apiKey) {
                    updateBotMessage(loadingId, "SERVER key is required to use this service.");
                    return;
                }
            }
            
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
            
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
                throw new Error(`SERVER request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.candidates && data.candidates[0].content.parts[0].text) {
                updateBotMessage(loadingId, data.candidates[0].content.parts[0].text);
            } else {
                updateBotMessage(loadingId, "I couldn't process that request. Please try again.");
            }
        } catch (error) {
            console.error('Error calling Gemini API:', error);
            updateBotMessage(loadingId, "Sorry, I encountered an error. Please check your SERVER and try again.");
        }
    }
});