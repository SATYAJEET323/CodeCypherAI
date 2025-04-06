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
    
    // [Previous code remains the same until callGeminiAPI function]

    async function callGeminiAPI(prompt, loadingId) {
        try {
            // First check for custom prompts
            const lowerPrompt = prompt.toLowerCase();
            
            // Owner/development related questions - now with concise responses
            const ownerPrompts = [
                'who is the owner', 'who built this', 'who created you', 
                'who developed you', 'who made you', 'who owns you',
                'who maintains you', 'who is behind you', 'who trained you',
                'what data was used', 'how were you trained', 'machine learning techniques',
                'programming languages used', 'intellectual property', 'development team',
                'key datasets', 'training process', 'unbiased data', 'model architecture'
            ];
            
            if (ownerPrompts.some(term => lowerPrompt.includes(term))) {
                const response = `I was created by Satyajeet Sanjay Desai through CodeCypher AI. I'm an AI assistant specialized in technical and programming help, built using modern machine learning techniques.`;
                updateBotMessage(loadingId, response);
                return;
            }
            
            // Personal questions - concise version
            const personalPrompts = [
                'who is satyajeet', 'about satyajeet', 'satyajeet desai',
                'your creator background', 'who made you background',
                'satyajeet sanjay desai'
            ];
            
            if (personalPrompts.some(term => lowerPrompt.includes(term))) {
                const response = `Satyajeet Sanjay Desai is a Computer Engineering student and full-stack developer specializing in AI, web development, and software engineering.`;
                updateBotMessage(loadingId, response);
                return;
            }
    
            // For Netlify environment variable issue
            let apiKey = process.env.GEMINI_API_KEY || window.__ENV?.GEMINI_API_KEY;
            
            if (!apiKey) {
                try {
                    // Fallback for Netlify (create a public config file instead)
                    const response = await fetch('/config.json');
                    if (response.ok) {
                        const config = await response.json();
                        apiKey = config.GEMINI_API_KEY;
                    }
                } catch (err) {
                    console.log('Could not load config:', err);
                }
            }
            
            if (!apiKey) {
                apiKey = prompt("Please enter your API key:");
                if (!apiKey) {
                    updateBotMessage(loadingId, "API key is required.");
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
                            text: `Respond concisely to: ${prompt} (keep response under 150 words)`
                        }]
                    }]
                })
            });
            
            if (!response.ok) throw new Error(`API request failed`);
            
            const data = await response.json();
            const fullResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that request.";
            
            // Truncate response if too long
            const conciseResponse = fullResponse.length > 300 
                ? fullResponse.substring(0, 300) + '...' 
                : fullResponse;
                
            updateBotMessage(loadingId, conciseResponse);
        } catch (error) {
            console.error('Error:', error);
            updateBotMessage(loadingId, "Sorry, I encountered an error. Please try again.");
        }
    }

// [Rest of your existing code]
});
