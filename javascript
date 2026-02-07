document.addEventListener('DOMContentLoaded', function() {
    let currentUser = null;
    let currentChatId = null;
    let messages = [];
    let isAITyping = false;
    let currentAI = 'gpt-4o';
    
    const elements = {
        loginBtn: document.getElementById('loginBtn'),
        googleLogin: document.getElementById('googleLogin'),
        emailInput: document.getElementById('email'),
        passwordInput: document.getElementById('password'),
        togglePassword: document.getElementById('togglePassword'),
        statusMessage: document.getElementById('statusMessage'),
        loadingScreen: document.getElementById('loadingScreen'),
        dashboardContainer: document.querySelector('.dashboard-container'),
        logoutBtn: document.getElementById('logoutBtn'),
        userName: document.getElementById('userName'),
        userEmail: document.getElementById('userEmail'),
        userAvatar: document.getElementById('userAvatar'),
        aiModel: document.getElementById('aiModel'),
        messageInput: document.getElementById('messageInput'),
        sendBtn: document.getElementById('sendBtn'),
        messagesContainer: document.getElementById('messagesContainer'),
        welcomeScreen: document.getElementById('welcomeScreen'),
        historyList: document.getElementById('historyList'),
        historyCount: document.getElementById('historyCount'),
        newChatBtn: document.getElementById('newChatBtn'),
        clearHistoryBtn: document.getElementById('clearHistoryBtn'),
        settingsBtn: document.getElementById('settingsBtn'),
        closeSettings: document.getElementById('closeSettings'),
        settingsPanel: document.getElementById('settingsPanel'),
        fileUploadBtn: document.getElementById('fileUploadBtn'),
        voiceInputBtn: document.getElementById('voiceInputBtn'),
        webSearchToggle: document.getElementById('webSearchToggle'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        tokenCount: document.getElementById('tokenCount'),
        aiThinking: document.getElementById('aiThinking'),
        promptButtons: document.querySelectorAll('.prompt-btn'),
        openaiKey: document.getElementById('openaiKey'),
        claudeKey: document.getElementById('claudeKey'),
        geminiKey: document.getElementById('geminiKey'),
        saveKeysBtn: document.getElementById('saveKeysBtn'),
        temperature: document.getElementById('temperature'),
        tempValue: document.getElementById('tempValue'),
        maxTokens: document.getElementById('maxTokens'),
        responseSpeed: document.getElementById('responseSpeed'),
        themeOptions: document.querySelectorAll('.theme-option'),
        webSearchAuto: document.getElementById('webSearchAuto'),
        codeHighlighting: document.getElementById('codeHighlighting'),
        streamResponses: document.getElementById('streamResponses'),
        autoTranslate: document.getElementById('autoTranslate')
    };
    
    function initAuth() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                currentUser = user;
                showDashboard();
                loadUserData();
            } else {
                if (window.location.pathname.includes('index.html') || 
                    window.location.pathname === '/' || 
                    !window.location.pathname.includes('dashboard.html')) {
                    showLoginPage();
                } else {
                    window.location.href = 'index.html';
                }
            }
        });
    }
    
    // ===== LOGIN PAGE FUNCTIONS =====
    if (elements.loginBtn) {
        // Email/Password Login
        elements.loginBtn.addEventListener('click', () => {
            const email = elements.emailInput.value;
            const password = elements.passwordInput.value;
            
            if (!email || !password) {
                showStatus('Email dan password harus diisi', 'error');
                return;
            }
            
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then(() => {
                    showStatus('Login berhasil!', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                })
                .catch((error) => {
                    showStatus(`Login gagal: ${error.message}`, 'error');
                });
        });
        
        // Google Login
        elements.googleLogin.addEventListener('click', () => {
            const provider = new firebase.auth.GoogleAuthProvider();
            firebase.auth().signInWithPopup(provider)
                .then(() => {
                    showStatus('Login Google berhasil!', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                })
                .catch((error) => {
                    showStatus(`Login Google gagal: ${error.message}`, 'error');
                });
        });
        
        // Toggle Password Visibility
        if (elements.togglePassword) {
            elements.togglePassword.addEventListener('click', () => {
                const type = elements.passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                elements.passwordInput.setAttribute('type', type);
                elements.togglePassword.innerHTML = type === 'password' ? 
                    '<i class="fas fa-eye"></i>' : 
                    '<i class="fas fa-eye-slash"></i>';
            });
        }
        
        // Enter key to login
        elements.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                elements.loginBtn.click();
            }
        });
    }
    
    // ===== DASHBOARD FUNCTIONS =====
    function showDashboard() {
        elements.loadingScreen.style.display = 'none';
        elements.dashboardContainer.style.display = 'flex';
        
        // Initialize chat
        initChat();
        
        // Load chat history
        loadChatHistory();
        
        // Update user info
        updateUserInfo();
    }
    
    function updateUserInfo() {
        if (!currentUser) return;
        
        elements.userName.textContent = currentUser.displayName || 'User';
        elements.userEmail.textContent = currentUser.email;
        
        // Set avatar
        if (currentUser.photoURL) {
            elements.userAvatar.src = currentUser.photoURL;
        } else {
            const name = currentUser.displayName || currentUser.email.split('@')[0];
            elements.userAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8b5cf6&color=fff`;
        }
    }
    
    function initChat() {
        // Auto-resize textarea
        elements.messageInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
        
        // Send message on Enter (but allow Shift+Enter for new line)
        elements.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Send button click
        elements.sendBtn.addEventListener('click', sendMessage);
        
        // AI Model change
        elements.aiModel.addEventListener('change', (e) => {
            currentAI = e.target.value;
            showStatus(`Model AI diganti ke: ${e.target.options[e.target.selectedIndex].text}`, 'info');
        });
        
        // New Chat button
        elements.newChatBtn.addEventListener('click', () => {
            if (messages.length > 0) {
                if (confirm('Buat chat baru? Chat saat ini akan disimpan.')) {
                    createNewChat();
                }
            } else {
                createNewChat();
            }
        });
        
        // Clear History button
        elements.clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Hapus semua riwayat chat? Tindakan ini tidak bisa dibatalkan.')) {
                clearChatHistory();
            }
        });
        
        // Settings button
        elements.settingsBtn.addEventListener('click', () => {
            elements.settingsPanel.classList.add('active');
            document.getElementById('modalBackdrop').style.display = 'block';
        });
        
        // Close settings
        elements.closeSettings.addEventListener('click', () => {
            elements.settingsPanel.classList.remove('active');
            document.getElementById('modalBackdrop').style.display = 'none';
        });
        
        // Dark mode toggle
        elements.darkModeToggle.addEventListener('click', toggleDarkMode);
        
        // Prompt buttons
        elements.promptButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.getAttribute('data-prompt');
                elements.messageInput.value = prompt;
                elements.messageInput.focus();
                elements.messageInput.style.height = 'auto';
                elements.messageInput.style.height = (elements.messageInput.scrollHeight) + 'px';
            });
        });
        
        // File upload
        elements.fileUploadBtn.addEventListener('click', () => {
            // In a real app, this would trigger file input
            showStatus('Fitur upload file sedang dalam pengembangan', 'info');
        });
        
        // Voice input
        elements.voiceInputBtn.addEventListener('click', () => {
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                startVoiceRecognition();
            } else {
                showStatus('Browser tidak mendukung voice recognition', 'error');
            }
        });
    }
    
    function createNewChat() {
        currentChatId = 'chat_' + Date.now();
        messages = [];
        elements.messagesContainer.innerHTML = '';
        elements.welcomeScreen.style.display = 'flex';
        elements.messagesContainer.style.display = 'none';
        elements.messageInput.value = '';
        elements.messageInput.style.height = '50px';
        updateTokenCount();
    }
    
    function sendMessage() {
        const message = elements.messageInput.value.trim();
        if (!message || isAITyping) return;
        
        // Hide welcome screen
        elements.welcomeScreen.style.display = 'none';
        elements.messagesContainer.style.display = 'flex';
        
        // Add user message to UI
        addMessageToUI(message, 'user');
        
        // Clear input
        elements.messageInput.value = '';
        elements.messageInput.style.height = '50px';
        
        // Show AI thinking indicator
        elements.aiThinking.style.display = 'inline';
        isAITyping = true;
        
        // Simulate AI response (in real app, this would call backend)
        setTimeout(() => {
            simulateAIResponse(message);
        }, 1000);
        
        // Update token count
        updateTokenCount();
    }
    
    function addMessageToUI(text, sender) {
        const messageId = 'msg_' + Date.now();
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.id = messageId;
        
        const avatarIcon = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
        const avatarBg = sender === 'user' ? 'var(--accent-success)' : 'var(--accent-primary)';
        const senderName = sender === 'user' ? 'You' : getAIName(currentAI);
        
        messageDiv.innerHTML = `
            <div class="message-avatar" style="background: ${avatarBg};">
                <i class="${avatarIcon}"></i>
            </div>
            <div class="message-content">
                <div class="message-header">
                    <span class="name">${senderName}</span>
                    <span class="time">${time}</span>
                </div>
                <div class="message-text">${formatMessage(text)}</div>
                <div class="message-actions">
                    <button class="action-icon" onclick="copyMessage('${messageId}')" title="Salin">
                        <i class="fas fa-copy"></i>
                    </button>
                    ${sender === 'ai' ? `
                    <button class="action-icon" onclick="regenerateMessage('${messageId}')" title="Ulangi">
                        <i class="fas fa-redo"></i>
                    </button>
                    <button class="action-icon" onclick="rateMessage('${messageId}', 'up')" title="Suka">
                        <i class="fas fa-thumbs-up"></i>
                    </button>
                    <button class="action-icon" onclick="rateMessage('${messageId}', 'down')" title="Tidak Suka">
                        <i class="fas fa-thumbs-down"></i>
                    </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        elements.messagesContainer.appendChild(messageDiv);
        
        // Scroll to bottom
        elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
        
        // Add to messages array
        messages.push({
            id: messageId,
            text: text,
            sender: sender,
            time: time,
            aiModel: currentAI
        });
        
        // Save to history
        saveToHistory(text, sender);
    }
    
    function formatMessage(text) {
        // Simple markdown formatting
        let formatted = DOMPurify.sanitize(text);
        
        // Convert URLs to links
        formatted = formatted.replace(
            /(https?:\/\/[^\s]+)/g,
            '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
        );
        
        // Convert **bold**
        formatted = formatted.replace(
            /\*\*(.*?)\*\*/g,
            '<strong>$1</strong>'
        );
        
        // Convert *italic*
        formatted = formatted.replace(
            /\*(.*?)\*/g,
            '<em>$1</em>'
        );
        
        // Convert `code`
        formatted = formatted.replace(
            /`([^`]+)`/g,
            '<code>$1</code>'
        );
        
        // Convert ```code blocks```
        formatted = formatted.replace(
            /```([\s\S]*?)```/g,
            '<pre><code>$1</code></pre>'
        );
        
        // Convert newlines to <br>
        formatted = formatted.replace(/\n/g, '<br>');
        
        return formatted;
    }
    
    function simulateAIResponse(userMessage) {
        // Simulate different AI responses based on selected model
        const responses = {
            'gpt-4o': `Saya GPT-4o, model AI terbaru OpenAI. Anda bertanya: "${userMessage}"
            
Saya dapat membantu dengan berbagai topik seperti pemrograman, analisis data, kreativitas, dan logika kompleks.

Contoh kode JavaScript:
\`\`\`javascript
function calculateFibonacci(n) {
    if (n <= 1) return n;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) {
        [a, b] = [b, a + b];
    }
    return b;
}
\`\`\`

Ada yang bisa saya bantu lagi?`,
            
            'claude-3': `Saya Claude 3.5 Sonnet dari Anthropic. Pertanyaan Anda: "${userMessage}"
            
Sebagai AI yang fokus pada keselamatan dan reasoning, saya akan memberikan jawaban yang komprehensif:

**Analisis:** Pertanyaan ini menunjukkan ketertarikan pada teknologi AI. 

**Rekomendasi:**
1. Pelajari fundamental machine learning
2. Praktek dengan library seperti TensorFlow
3. Ikuti perkembangan penelitian terbaru

Saya siap membantu dengan penjelasan lebih detail!`,
            
            'gemini-2': `Hai! Saya Gemini 2.0 dari Google AI. Topik yang Anda tanyakan: "${userMessage}"
            
Sebagai multimodal AI, saya bisa proses teks, gambar, audio, dan video. 

Fitur unik saya:
• Multimodal understanding
• Real-time web search
• Code generation in 20+ languages
• Creative writing assistance

Mau coba fitur spesifik tertentu?`,
            
            'grok': `Yo! Saya Grok dari xAI. "${userMessage}" you say?

Haha, interesting question! Let me give you the real talk:

• No filter, no BS
• Sarcastic but accurate
• Latest info (updated real-time)
• Can roast you if you're wrong 😉

Want the uncensored version or the PG-13 one?`
        };
        
        const response = responses[currentAI] || 
            `Saya AI model ${currentAI}. Pertanyaan Anda: "${userMessage}"
            
Saya sedang memproses permintaan Anda dengan cermat. Sebagai AI canggih, saya dapat membantu dengan:
1. Pemecahan masalah kompleks
2. Analisis data
3. Generasi konten kreatif
4. Penjelasan konsep teknis

Ada aspek spesifik yang ingin Anda dalami?`;
        
        // Add AI message to UI
        addMessageToUI(response, 'ai');
        
        // Hide thinking indicator
        elements.aiThinking.style.display = 'none';
        isAITyping = false;
    }
    
    function getAIName(model) {
        const names = {
            'gpt-4o': 'GPT-4o',
            'gpt-4': 'GPT-4 Turbo',
            'claude-3': 'Claude 3.5',
            'gemini-2': 'Gemini 2.0',
            'grok': 'Grok',
            'custom': 'Custom AI',
            'auto': 'AI Universe'
        };
        return names[model] || 'AI Assistant';
    }
    
    function updateTokenCount() {
        const totalTokens = messages.reduce((sum, msg) => sum + msg.text.length, 0);
        elements.tokenCount.textContent = `Tokens: ${totalTokens.toLocaleString()}`;
        
        // Update history count
        const historyCount = messages.filter(m => m.sender === 'user').length;
        elements.historyCount.textContent = `${historyCount}/200`;
    }
    
    function saveToHistory(text, sender) {
        if (sender !== 'user') return;
        
        // In a real app, this would save to Firebase
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        historyItem.innerHTML = `
            <i class="fas fa-comment"></i>
            <span>${text.substring(0, 30)}${text.length > 30 ? '...' : ''}</span>
        `;
        
        historyItem.addEventListener('click', () => {
            // Load chat from history
            showStatus('Memuat chat dari riwayat...', 'info');
        });
        
        // Remove empty state if exists
        const emptyState = elements.historyList.querySelector('.empty');
        if (emptyState) {
            emptyState.remove();
        }
        
        elements.historyList.insertBefore(historyItem, elements.historyList.firstChild);
    }
    
    function loadChatHistory() {
        // In a real app, this would load from Firebase
        // For now, show empty state
        elements.historyList.innerHTML = `
            <div class="history-item empty">
                <i class="fas fa-comment-slash"></i>
                <p>Belum ada percakapan</p>
            </div>
        `;
    }
    
    function clearChatHistory() {
        if (confirm('Yakin hapus semua riwayat?')) {
            elements.historyList.innerHTML = `
                <div class="history-item empty">
                    <i class="fas fa-comment-slash"></i>
                    <p>Belum ada percakapan</p>
                </div>
            `;
            showStatus('Riwayat chat dihapus', 'success');
        }
    }
    
    function startVoiceRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.lang = 'id-ID';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        
        recognition.start();
        
        showStatus('Mendengarkan...', 'info');
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            elements.messageInput.value = transcript;
            showStatus('Suara dikenali', 'success');
        };
        
        recognition.onerror = (event) => {
            showStatus(`Error: ${event.error}`, 'error');
        };
    }
    
    function toggleDarkMode() {
        const isDark = document.body.classList.contains('light-theme');
        if (isDark) {
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
            elements.darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        } else {
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
            elements.darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
    
    // ===== SETTINGS FUNCTIONS =====
    function initSettings() {
        // Temperature slider
        if (elements.temperature && elements.tempValue) {
            elements.temperature.addEventListener('input', function() {
                elements.tempValue.textContent = this.value;
            });
        }
        
        // Theme selection
        if (elements.themeOptions) {
            elements.themeOptions.forEach(option => {
                option.addEventListener('click', function() {
                    // Remove active class from all
                    elements.themeOptions.forEach(opt => opt.classList.remove('active'));
                    // Add to clicked
                    this.classList.add('active');
                    
                    const theme = this.getAttribute('data-theme');
                    document.body.className = `dashboard-page ${theme}-theme`;
                    localStorage.setItem('theme', theme);
                });
            });
        }
        
        // Save API Keys
        if (elements.saveKeysBtn) {
            elements.saveKeysBtn.addEventListener('click', saveAPIKeys);
        }
        
        // Load saved settings
        loadSettings();
    }
    
    function saveAPIKeys() {
        const keys = {
            openai: elements.openaiKey.value,
            claude: elements.claudeKey.value,
            gemini: elements.geminiKey.value
        };
        
        // In a real app, this would send to backend for encryption
        localStorage.setItem('ai_keys', JSON.stringify(keys));
        showStatus('API Keys disimpan secara lokal', 'success');
    }
    
    function loadSettings() {
        // Load theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.body.className = `dashboard-page ${savedTheme}-theme`;
        
        // Update theme selector
        if (elements.themeOptions) {
            elements.themeOptions.forEach(opt => {
                opt.classList.remove('active');
                if (opt.getAttribute('data-theme') === savedTheme) {
                    opt.classList.add('active');
                }
            });
        }
        
        // Update dark mode toggle icon
        if (elements.darkModeToggle) {
            elements.darkModeToggle.innerHTML = savedTheme === 'light' ? 
                '<i class="fas fa-sun"></i>' : 
                '<i class="fas fa-moon"></i>';
        }
        
        // Load API keys
        const savedKeys = localStorage.getItem('ai_keys');
        if (savedKeys) {
            try {
                const keys = JSON.parse(savedKeys);
                if (elements.openaiKey) elements.openaiKey.value = keys.openai || '';
                if (elements.claudeKey) elements.claudeKey.value = keys.claude || '';
                if (elements.geminiKey) elements.geminiKey.value = keys.gemini || '';
            } catch (e) {
                console.error('Error loading API keys:', e);
            }
        }
        
        // Load other settings
        const settings = JSON.parse(localStorage.getItem('ai_settings') || '{}');
        if (elements.temperature) elements.temperature.value = settings.temperature || 0.7;
        if (elements.tempValue) elements.tempValue.textContent = settings.temperature || 0.7;
        if (elements.maxTokens) elements.maxTokens.value = settings.maxTokens || '2000';
        if (elements.responseSpeed) elements.responseSpeed.value = settings.responseSpeed || 'balanced';
        if (elements.webSearchAuto) elements.webSearchAuto.checked = settings.webSearchAuto || false;
        if (elements.codeHighlighting) elements.codeHighlighting.checked = settings.codeHighlighting !== false;
        if (elements.streamResponses) elements.streamResponses.checked = settings.streamResponses !== false;
        if (elements.autoTranslate) elements.autoTranslate.checked = settings.autoTranslate || false;
    }
    
    // ===== UTILITY FUNCTIONS =====
    function showStatus(message, type = 'info') {
        if (!elements.statusMessage) return;
        
        elements.statusMessage.textContent = message;
        elements.statusMessage.style.background = 
            type === 'error' ? 'var(--accent-danger)' :
            type === 'success' ? 'var(--accent-success)' :
            type === 'warning' ? 'var(--accent-warning)' :
            'var(--accent-primary)';
        
        elements.statusMessage.style.display = 'block';
        
        setTimeout(() => {
            elements.statusMessage.style.display = 'none';
        }, 3000);
    }
    
    function showLoginPage() {
        // If we're on login page, show it
        if (elements.loginBtn) {
            elements.loadingScreen.style.display = 'none';
        }
    }
    
    function loadUserData() {
        // Load user-specific data
        // This would load from Firebase in a real app
        console.log('Loading data for user:', currentUser.email);
    }
    
    // ===== GLOBAL FUNCTIONS (for inline onclick) =====
    window.copyMessage = function(messageId) {
        const messageDiv = document.getElementById(messageId);
        const messageText = messageDiv.querySelector('.message-text').innerText;
        
        navigator.clipboard.writeText(messageText).then(() => {
            showStatus('Pesan disalin ke clipboard', 'success');
        });
    };
    
    window.regenerateMessage = function(messageId) {
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex !== -1 && messages[messageIndex].sender === 'ai') {
            
            const userMessageIndex = messageIndex - 1;
            if (userMessageIndex >= 0 && messages[userMessageIndex].sender === 'user') {
                const userMessage = messages[userMessageIndex].text;
                
                document.getElementById(messages[messageIndex].id).remove();
                document.getElementById(messages[userMessageIndex].id).remove();
                
                messages.splice(userMessageIndex, 2);
              
                addMessageToUI(userMessage, 'user');
                simulateAIResponse(userMessage);
            }
        }
    };
    
    window.rateMessage = function(messageId, type) {
        showStatus(`Pesan diberi rating: ${type === 'up' ? '👍' : '👎'}`, 'info');
    };
    
    if (elements.logoutBtn) {
        elements.logoutBtn.addEventListener('click', () => {
            if (confirm('Yakin ingin keluar?')) {
                firebase.auth().signOut().then(() => {
                    window.location.href = 'index.html';
                });
            }
        });
    }
    
    if (typeof firebase !== 'undefined') {
        initAuth();
    }
    
    if (document.querySelector('.dashboard-page')) {
        initSettings();
    }
  
    if (elements.messageInput) {
        setTimeout(() => {
            elements.messageInput.focus();
        }, 1000);
    }
    
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && elements.messageInput) {
            elements.messageInput.focus();
        }
    });
});
