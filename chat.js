// ===== NEXUS AI CHAT SYSTEM =====
// 🎯 FILE INI AMAN - TIDAK ADA API KEYS HARDCODED

class NexusChat {
    constructor() {
        this.currentChatId = null;
        this.messages = [];
        this.isAITyping = false;
        this.currentModel = 'gemini';
        this.conversationHistory = [];
        this.settings = {
            temperature: 0.7,
            maxTokens: 2000,
            stream: true,
            codeHighlighting: true
        };
    }
    
    async sendMessage(text, options = {}) {
        // Validasi
        if (!text || text.trim() === '') {
            throw new Error('Message cannot be empty');
        }
        
        // Cek jika AI sedang typing
        if (this.isAITyping) {
            throw new Error('AI is already processing a message');
        }
        
        // Set typing state
        this.isAITyping = true;
        this.showTypingIndicator();
        
        try {
            // Add user message to UI
            this.addMessageToUI(text, 'user');
            
            // Prepare chat history
            const chatContext = this.prepareChatContext();
            
            // Get API response
            const aiResponse = await this.getAIResponse(text, chatContext);
            
            // Add AI response to UI
            this.addMessageToUI(aiResponse, 'ai');
            
            // Save to history
            this.saveToHistory(text, aiResponse);
            
            // Update conversation
            this.conversationHistory.push(
                { role: 'user', content: text },
                { role: 'assistant', content: aiResponse }
            );
            
            // Update token count
            this.updateTokenCount();
            
            return aiResponse;
            
        } catch (error) {
            console.error('Chat error:', error);
            this.addMessageToUI(
                `Sorry, I encountered an error: ${error.message}`,
                'error'
            );
            throw error;
        } finally {
            this.isAITyping = false;
            this.hideTypingIndicator();
        }
    }
    
    async getAIResponse(userMessage, context) {
        // Get API keys from central config
        const apiKeys = window.NEXUS_CONFIG ? {
            gemini: window.NEXUS_CONFIG.GEMINI_API_KEY,
            openai: window.NEXUS_CONFIG.OPENAI_API_KEY,
            claude: window.NEXUS_CONFIG.CLAUDE_API_KEY
        } : {};
        
        // Determine which provider to use
        const provider = this.selectAIProvider(apiKeys);
        
        if (!provider) {
            throw new Error('No available AI provider. Please add API keys in settings.');
        }
        
        // Prepare request based on provider
        let requestData, endpoint, headers;
        
        switch(provider) {
            case 'gemini':
                if (!apiKeys.gemini) throw new Error('Gemini API key not configured');
                endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKeys.gemini}`;
                requestData = {
                    contents: [
                        ...context.map(msg => ({
                            role: msg.role === 'user' ? 'user' : 'model',
                            parts: [{ text: msg.content }]
                        })),
                        { role: 'user', parts: [{ text: userMessage }] }
                    ],
                    generationConfig: {
                        temperature: this.settings.temperature,
                        maxOutputTokens: this.settings.maxTokens
                    }
                };
                headers = { 'Content-Type': 'application/json' };
                break;
                
            case 'openai':
                if (!apiKeys.openai) throw new Error('OpenAI API key not configured');
                endpoint = 'https://api.openai.com/v1/chat/completions';
                requestData = {
                    model: 'gpt-4',
                    messages: [
                        ...context,
                        { role: 'user', content: userMessage }
                    ],
                    temperature: this.settings.temperature,
                    max_tokens: this.settings.maxTokens,
                    stream: this.settings.stream
                };
                headers = {
                    'Authorization': `Bearer ${apiKeys.openai}`,
                    'Content-Type': 'application/json'
                };
                break;
                
            case 'claude':
                if (!apiKeys.claude) throw new Error('Claude API key not configured');
                endpoint = 'https://api.anthropic.com/v1/messages';
                requestData = {
                    model: 'claude-3-opus-20240229',
                    messages: [
                        ...context,
                        { role: 'user', content: userMessage }
                    ],
                    max_tokens: this.settings.maxTokens,
                    temperature: this.settings.temperature
                };
                headers = {
                    'x-api-key': apiKeys.claude,
                    'anthropic-version': '2023-06-01',
                    'Content-Type': 'application/json'
                };
                break;
                
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
        
        // Make API request
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestData)
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`API error (${response.status}): ${errorData.error?.message || response.statusText}`);
            }
            
            const data = await response.json();
            
            // Parse response based on provider
            switch(provider) {
                case 'gemini':
                    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
                case 'openai':
                    return data.choices?.[0]?.message?.content || 'No response generated';
                case 'claude':
                    return data.content?.[0]?.text || 'No response generated';
                default:
                    return 'Response parsing error';
            }
            
        } catch (error) {
            console.error(`${provider} API request failed:`, error);
            
            // Try fallback provider
            const fallbackProvider = this.getFallbackProvider(provider, apiKeys);
            if (fallbackProvider && fallbackProvider !== provider) {
                console.log(`Trying fallback provider: ${fallbackProvider}`);
                this.currentModel = fallbackProvider;
                return this.getAIResponse(userMessage, context);
            }
            
            throw error;
        }
    }
    
    selectAIProvider(apiKeys) {
        // Priority order
        const providers = ['gemini', 'openai', 'claude'];
        
        // Check if current model has key
        if (apiKeys[this.currentModel]) {
            return this.currentModel;
        }
        
        // Find first available provider
        for (const provider of providers) {
            if (apiKeys[provider]) {
                this.currentModel = provider;
                return provider;
            }
        }
        
        // Check local LLM
        if (window.NEXUS_CONFIG?.USE_LOCAL_LLM) {
            return 'local';
        }
        
        return null;
    }
    
    getFallbackProvider(failedProvider, apiKeys) {
        const fallbackOrder = {
            'gemini': ['openai', 'claude', 'local'],
            'openai': ['gemini', 'claude', 'local'],
            'claude': ['gemini', 'openai', 'local']
        };
        
        const fallbacks = fallbackOrder[failedProvider] || [];
        for (const provider of fallbacks) {
            if (provider === 'local' && window.NEXUS_CONFIG?.USE_LOCAL_LLM) {
                return provider;
            }
            if (apiKeys[provider]) {
                return provider;
            }
        }
        
        return null;
    }
    
    prepareChatContext() {
        // Get last 10 messages for context
        const recentMessages = this.conversationHistory.slice(-10);
        
        // Convert to provider-agnostic format
        return recentMessages.map(msg => ({
            role: msg.role,
            content: msg.content.substring(0, 1000) // Limit context length
        }));
    }
    
    addMessageToUI(text, sender) {
        const messagesContainer = document.getElementById('messagesContainer');
        if (!messagesContainer) return;
        
        const messageId = 'msg_' + Date.now();
        const timestamp = new Date().toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender}`;
        messageElement.id = messageId;
        
        // Format message with markdown support
        const formattedText = this.formatMessage(text, sender);
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas ${sender === 'user' ? 'fa-user' : 'fa-robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="sender-name">${sender === 'user' ? 'You' : 'Nexus AI'}</span>
                    <span class="message-time">${timestamp}</span>
                </div>
                <div class="message-text">${formattedText}</div>
                <div class="message-actions">
                    <button class="action-btn copy-btn" onclick="copyMessage('${messageId}')">
                        <i class="fas fa-copy"></i>
                    </button>
                    ${sender === 'ai' ? `
                    <button class="action-btn regenerate-btn" onclick="regenerateMessage('${messageId}')">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button class="action-btn like-btn" onclick="rateMessage('${messageId}', 'like')">
                        <i class="fas fa-thumbs-up"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        messagesContainer.appendChild(messageElement);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Highlight code if enabled
        if (this.settings.codeHighlighting && sender === 'ai') {
            setTimeout(() => this.highlightCode(messageElement), 100);
        }
    }
    
    formatMessage(text, sender) {
        // Basic markdown parsing
        let formatted = DOMPurify.sanitize(text);
        
        // Convert newlines to <br>
        formatted = formatted.replace(/\n/g, '<br>');
        
        // Convert **bold** to <strong>
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        // Convert *italic* to <em>
        formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
        
        // Convert `code` to <code>
        formatted = formatted.replace(/`([^`]+)`/g, '<code>$1</code>');
        
        // Convert ```code blocks```
        formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, 
            '<pre><code class="language-$1">$2</code></pre>');
        
        // Convert URLs to links
        formatted = formatted.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        return formatted;
    }
    
    highlightCode(messageElement) {
        const codeBlocks = messageElement.querySelectorAll('pre code');
        codeBlocks.forEach(block => {
            if (typeof hljs !== 'undefined') {
                hljs.highlightElement(block);
            }
        });
    }
    
    showTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.innerHTML = `
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <span>Nexus AI is thinking...</span>
            `;
            typingIndicator.style.display = 'flex';
        }
    }
    
    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.style.display = 'none';
        }
    }
    
    updateTokenCount() {
        const totalTokens = this.conversationHistory.reduce(
            (sum, msg) => sum + (msg.content?.length || 0), 0
        );
        
        const tokenDisplay = document.getElementById('tokenCount');
        if (tokenDisplay) {
            tokenDisplay.textContent = `Tokens: ${totalTokens.toLocaleString()}`;
        }
    }
    
    saveToHistory(userMessage, aiResponse) {
        // Save to localStorage
        const chatHistory = JSON.parse(localStorage.getItem('nexus_chat_history') || '[]');
        chatHistory.push({
            timestamp: new Date().toISOString(),
            user: userMessage,
            ai: aiResponse,
            model: this.currentModel
        });
        
        // Keep only last 100 conversations
        if (chatHistory.length > 100) {
            chatHistory.splice(0, chatHistory.length - 100);
        }
        
        localStorage.setItem('nexus_chat_history', JSON.stringify(chatHistory));
        
        // Save to Firebase if available
        if (window.currentUser && window.nexusFirestore) {
            this.saveToFirestore(userMessage, aiResponse);
        }
    }
    
    async saveToFirestore(userMessage, aiResponse) {
        try {
            const chatData = {
                userId: window.currentUser.uid,
                userMessage: userMessage,
                aiResponse: aiResponse,
                model: this.currentModel,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                tokens: userMessage.length + aiResponse.length
            };
            
            await window.nexusFirestore.collection('chats').add(chatData);
        } catch (error) {
            console.error('Failed to save chat to Firestore:', error);
        }
    }
    
    loadChatHistory() {
        try {
            const savedHistory = JSON.parse(localStorage.getItem('nexus_chat_history') || '[]');
            this.conversationHistory = [];
            
            savedHistory.forEach(chat => {
                this.conversationHistory.push(
                    { role: 'user', content: chat.user },
                    { role: 'assistant', content: chat.ai }
                );
            });
            
            return savedHistory;
        } catch (error) {
            console.error('Failed to load chat history:', error);
            return [];
        }
    }
    
    clearChat() {
        if (confirm('Are you sure you want to clear the chat?')) {
            this.messages = [];
            this.conversationHistory = [];
            this.currentChatId = null;
            
            const messagesContainer = document.getElementById('messagesContainer');
            if (messagesContainer) {
                messagesContainer.innerHTML = '';
            }
            
            localStorage.removeItem('nexus_current_chat');
            console.log('Chat cleared');
        }
    }
    
    exportChat(format = 'txt') {
        const chatData = this.conversationHistory.map(msg => 
            `${msg.role.toUpperCase()}: ${msg.content}`
        ).join('\n\n');
        
        const blob = new Blob([chatData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexus-chat-${new Date().toISOString().split('T')[0]}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// Global chat instance
let nexusChat = null;

// Initialize chat system
function initNexusChat() {
    if (!nexusChat) {
        nexusChat = new NexusChat();
        nexusChat.loadChatHistory();
        
        // Setup event listeners
        setupChatEventListeners();
    }
    return nexusChat;
}

// Setup DOM event listeners
function setupChatEventListeners() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendMessageBtn');
    
    if (messageInput && sendButton) {
        // Send on Enter (but allow Shift+Enter for new line)
        messageInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendButton.click();
            }
        });
        
        // Send button click
        sendButton.addEventListener('click', async function() {
            const message = messageInput.value.trim();
            if (!message || !nexusChat) return;
            
            // Disable input while processing
            messageInput.disabled = true;
            sendButton.disabled = true;
            
            try {
                await nexusChat.sendMessage(message);
                messageInput.value = '';
                messageInput.style.height = 'auto';
            } catch (error) {
                console.error('Failed to send message:', error);
            } finally {
                messageInput.disabled = false;
                sendButton.disabled = false;
                messageInput.focus();
            }
        });
        
        // Auto-resize textarea
        messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
    
    // Quick prompt buttons
    document.querySelectorAll('.prompt-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const prompt = this.getAttribute('data-prompt');
            if (messageInput) {
                messageInput.value = prompt;
                messageInput.focus();
                messageInput.dispatchEvent(new Event('input'));
            }
        });
    });
}

// Utility functions
function copyMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (!messageElement) return;
    
    const messageText = messageElement.querySelector('.message-text').textContent;
    
    navigator.clipboard.writeText(messageText).then(() => {
        showNexusStatus('Message copied to clipboard', 'success');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showNexusStatus('Failed to copy message', 'error');
    });
}

function regenerateMessage(messageId) {
    if (!nexusChat) return;
    
    const messageElement = document.getElementById(messageId);
    if (!messageElement) return;
    
    // Find the user message before this AI response
    const messages = Array.from(document.querySelectorAll('.message'));
    const aiIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (aiIndex > 0 && messages[aiIndex - 1].classList.contains('user')) {
        const userMessage = messages[aiIndex - 1].querySelector('.message-text').textContent;
        
        // Remove both messages
        messages[aiIndex - 1].remove();
        messages[aiIndex].remove();
        
        // Resend the user message
        nexusChat.sendMessage(userMessage);
    }
}

        // Resend the user message
        nexusChat.sendMessage(userMessage);
    }
}

function rateMessage(messageId, rating) {
    console.log(`Rated message ${messageId} as ${rating}`);
    showNexusStatus(`Thank you for your feedback!`, 'info');
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on a chat page
    if (document.getElementById('chatContainer')) {
        initNexusChat();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NexusChat, initNexusChat };
}