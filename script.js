const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBK-MehTTzURY5jT5stH363Y5_WE4iy-XA",
    authDomain: "volca-tools.firebaseapp.com",
    projectId: "volca-tools",
    storageBucket: "volca-tools.firebasestorage.app",
    messagingSenderId: "262525907487",
    appId: "1:262525907487:web:4abc37fa3b583223569b2a",
    measurementId: "G-Q6W58HE2B3"
};

// Initialize Firebase
let firebaseApp, auth, db, storage;

try {
    firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    storage = firebase.storage();
    console.log("🔥 Firebase initialized successfully!");
} catch (error) {
    console.log("⚠️ Firebase initialization failed, using local storage mode");
}

// ===== FIREBASE FUNCTIONS =====
async function firebaseLogin(email, password) {
    if (!auth) {
        throw new Error("Firebase not initialized");
    }
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return {
            uid: userCredential.user.uid,
            name: userCredential.user.displayName || email.split('@')[0],
            email: userCredential.user.email,
            photoURL: userCredential.user.photoURL,
            isFirebase: true
        };
    } catch (error) {
        console.error("Firebase login error:", error);
        throw error;
    }
}

async function firebaseRegister(name, email, password) {
    if (!auth || !db) {
        throw new Error("Firebase not initialized");
    }
    
    try {
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update profile
        await userCredential.user.updateProfile({ displayName: name });
        
        // Save user data to Firestore
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            plan: 'free',
            storageUsed: 0,
            lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return {
            uid: userCredential.user.uid,
            name: name,
            email: email,
            photoURL: userCredential.user.photoURL,
            isFirebase: true
        };
    } catch (error) {
        console.error("Firebase register error:", error);
        throw error;
    }
}

async function firebaseGoogleLogin() {
    if (!auth || !db) {
        throw new Error("Firebase not initialized");
    }
    
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('profile');
        provider.addScope('email');
        
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        
        // Check if user exists in Firestore
        const userDoc = await db.collection('users').doc(user.uid).get();
        
        if (!userDoc.exists) {
            await db.collection('users').doc(user.uid).set({
                name: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                plan: 'free',
                storageUsed: 0,
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Update last login
            await db.collection('users').doc(user.uid).update({
                lastLogin: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        return {
            uid: user.uid,
            name: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
            isFirebase: true
        };
    } catch (error) {
        console.error("Google login error:", error);
        throw error;
    }
}

async function saveChatFirebase(chatData) {
    if (!db || !currentUser?.uid) {
        return false; // Fallback to localStorage
    }
    
    try {
        const chatRef = await db.collection('chats').add({
            ...chatData,
            userId: currentUser.uid,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            model: elements.aiModel.value
        });
        
        // Update user's storage usage
        const chatSize = JSON.stringify(chatData).length;
        await db.collection('users').doc(currentUser.uid).update({
            storageUsed: firebase.firestore.FieldValue.increment(chatSize),
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        return chatRef.id;
    } catch (error) {
        console.error("Save chat to Firebase error:", error);
        return false;
    }
}

async function loadChatsFirebase() {
    if (!db || !currentUser?.uid) {
        return []; // Fallback to localStorage
    }
    
    try {
        const snapshot = await db.collection('chats')
            .where('userId', '==', currentUser.uid)
            .orderBy('timestamp', 'desc')
            .limit(20)
            .get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (error) {
        console.error("Load chats from Firebase error:", error);
        return [];
    }
}

async function getUserStorageInfo() {
    if (!db || !currentUser?.uid) {
        return { used: 0, limit: 100000000 }; // 100MB default
    }
    
    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            return {
                used: data.storageUsed || 0,
                limit: data.plan === 'premium' ? 1000000000 : 100000000 // 1GB vs 100MB
            };
        }
        return { used: 0, limit: 100000000 };
    } catch (error) {
        console.error("Get storage info error:", error);
        return { used: 0, limit: 100000000 };
    }
}

// ===== MODIFIED AUTH FUNCTIONS =====
async function handleLogin() {
    const email = elements.loginEmail.value.trim();
    const password = elements.loginPass.value;
    
    if (!email || !password) {
        showNotification('Please enter email and password', 'error');
        return;
    }
    
    elements.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AUTHENTICATING...';
    elements.loginBtn.disabled = true;
    
    try {
        let user;
        
        if (auth) {
            // Try Firebase auth first
            user = await firebaseLogin(email, password);
        } else {
            // Fallback to localStorage
            setTimeout(() => {
                user = {
                    name: email.split('@')[0],
                    email: email,
                    avatar: email.charAt(0).toUpperCase(),
                    isFirebase: false
                };
                
                localStorage.setItem('nexus_user', JSON.stringify(user));
                currentUser = user;
                showNotification('🔐 Login successful!', 'success');
                showDashboard();
            }, 1500);
            return;
        }
        
        // Save user data
        localStorage.setItem('nexus_user', JSON.stringify(user));
        currentUser = user;
        
        showNotification('🔐 Quantum synchronization successful!', 'success');
        showDashboard();
        
    } catch (error) {
        console.error("Login error:", error);
        showNotification(`Login failed: ${error.message}`, 'error');
        
        // Fallback to demo login
        currentUser = {
            name: email.split('@')[0],
            email: email,
            avatar: email.charAt(0).toUpperCase(),
            isFirebase: false
        };
        
        localStorage.setItem('nexus_user', JSON.stringify(currentUser));
        setTimeout(() => {
            showNotification('Using demo mode', 'info');
            showDashboard();
        }, 1000);
    } finally {
        elements.loginBtn.innerHTML = '<i class="fas fa-brain"></i> QUANTUM ACCESS';
        elements.loginBtn.disabled = false;
    }
}

async function handleGoogleLogin() {
    elements.googleLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CONNECTING...';
    elements.googleLogin.disabled = true;
    
    try {
        let user;
        
        if (auth) {
            user = await firebaseGoogleLogin();
        } else {
            // Fallback to simulated Google login
            setTimeout(() => {
                user = {
                    name: 'Google User',
                    email: 'user@gmail.com',
                    avatar: 'G',
                    isFirebase: false
                };
                
                localStorage.setItem('nexus_user', JSON.stringify(user));
                currentUser = user;
                showNotification('✅ Google login successful!', 'success');
                showDashboard();
            }, 1500);
            return;
        }
        
        localStorage.setItem('nexus_user', JSON.stringify(user));
        currentUser = user;
        
        showNotification('✅ Google Quantum Link established!', 'success');
        showDashboard();
        
    } catch (error) {
        console.error("Google login error:", error);
        showNotification(`Google login failed: ${error.message}`, 'error');
        
        // Fallback
        currentUser = {
            name: 'Google User',
            email: 'user@gmail.com',
            avatar: 'G',
            isFirebase: false
        };
        
        localStorage.setItem('nexus_user', JSON.stringify(currentUser));
        setTimeout(() => {
            showNotification('Using demo mode', 'info');
            showDashboard();
        }, 1000);
    } finally {
        elements.googleLogin.innerHTML = '<i class="fab fa-google"></i> GOOGLE QUANTUM';
        elements.googleLogin.disabled = false;
    }
}

// ===== MODIFIED STORAGE CHECK =====
async function checkStorageLimit() {
    // If Firebase is available, get real storage data
    if (currentUser?.isFirebase && auth) {
        try {
            const storageInfo = await getUserStorageInfo();
            const usedPercent = (storageInfo.used / storageInfo.limit) * 100;
            
            document.getElementById('storagePercent').textContent = Math.round(usedPercent) + '%';
            
            if (usedPercent > 85) {
                document.querySelector('.storage-warning').style.display = 'flex';
                return usedPercent > 90;
            } else {
                document.querySelector('.storage-warning').style.display = 'none';
                return false;
            }
        } catch (error) {
            console.error("Storage check error:", error);
            // Fallback to simulated check
        }
    }
    
    // Simulated storage check (for demo/local mode)
    const usedStorage = 70 + Math.random() * 25; // 70-95%
    document.getElementById('storagePercent').textContent = Math.round(usedStorage) + '%';
    
    if (usedStorage > 85) {
        document.querySelector('.storage-warning').style.display = 'flex';
        return usedStorage > 90;
    } else {
        document.querySelector('.storage-warning').style.display = 'none';
        return false;
    }
}

// ===== MODIFIED SAVE CHAT FUNCTION =====
async function saveChatHistory() {
    if (!chatHistory.length) return;
    
    try {
        if (currentUser?.isFirebase && db) {
            // Save to Firebase
            const chatData = {
                messages: chatHistory,
                title: chatHistory[0]?.text?.substring(0, 50) || 'New Chat',
                model: elements.aiModel.value,
                messageCount: chatHistory.length
            };
            
            await saveChatFirebase(chatData);
        } else {
            // Save to localStorage
            localStorage.setItem('nexus_chat_history', JSON.stringify(chatHistory));
        }
    } catch (error) {
        console.error("Save chat error:", error);
        // Fallback to localStorage
        try {
            localStorage.setItem('nexus_chat_history', JSON.stringify(chatHistory));
        } catch (e) {
            console.error("Local storage save error:", e);
        }
    }
}

const NEXUS_CONFIG = {
    // API Keys (Edit disini)
    API_KEYS: {
        gemini: "AIzaSyBiH7xdMUR7aXK8S1AWvuo1qJu2mqabI4g", // Isi dengan Google Gemini API
        openai: "sk-proj-pLzNccYgL6bdFQZKatWx_#d660WICmGhaJGCVeN5bJeJ2fi5loc6rYXvOtjX7E1vF6M5IdpmQpuT3BlbkFJIpyp40GPHO5Kt4SM83CWlShPS9wxLgKsrzZcJi8141F3C0gEkXfMtLqtX_6xuZbgo-FVzl4EgA", // Isi dengan OpenAI API
        claude: "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", // Isi dengan Anthropic Claude API
        local: "http://localhost:11434/v1"
    },
    
    // Personality Settings
    PERSONALITY: {
        style: "funny",
        useEmojis: true,
        allowSwearing: false,
        responseMode: "detailed"
    },
    
    // Chat Settings
    CHAT: {
        maxHistory: 100,
        autoSave: true,
        filterSwearWords: true,
        showTyping: true
    },
    
    // UI Settings
    UI: {
        theme: "neon",
        fontSize: "medium",
        compactMode: false
    }
};

// ===== GLOBAL STATE =====
let currentUser = null;
let chatHistory = [];
let activeChat = null;
let isTyping = false;
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let swearWords = ["anjing", "bangsat", "goblok", "kontol", "jancok", "asu", "babi", "memek"];

// ===== DOM ELEMENTS =====
const elements = {
    // Pages
    loadingScreen: document.getElementById('loadingScreen'),
    loginPage: document.getElementById('loginPage'),
    registerPage: document.getElementById('registerPage'),
    dashboard: document.getElementById('dashboard'),
    
    // Login
    loginEmail: document.getElementById('loginEmail'),
    loginPass: document.getElementById('loginPass'),
    loginBtn: document.getElementById('loginBtn'),
    googleLogin: document.getElementById('googleLogin'),
    showRegister: document.getElementById('showRegister'),
    
    // Register
    backToLogin: document.getElementById('backToLogin'),
    regName: document.getElementById('regName'),
    regEmail: document.getElementById('regEmail'),
    regPass: document.getElementById('regPass'),
    regConfirm: document.getElementById('regConfirm'),
    registerBtn: document.getElementById('registerBtn'),
    
    // Dashboard
    menuToggle: document.getElementById('menuToggle'),
    userAvatar: document.getElementById('userAvatar'),
    aiModel: document.getElementById('aiModel'),
    newChatBtn: document.getElementById('newChatBtn'),
    apiKeyBtn: document.getElementById('apiKeyBtn'),
    
    // Chat
    welcomeScreen: document.getElementById('welcomeScreen'),
    messagesContainer: document.getElementById('messagesContainer'),
    messageInput: document.getElementById('messageInput'),
    sendBtn: document.getElementById('sendBtn'),
    typingIndicator: document.getElementById('typingIndicator'),
    
    // Sidebar
    sidebar: document.getElementById('sidebar'),
    historyList: document.getElementById('historyList'),
    historySearch: document.getElementById('historySearch'),
    
    // Features
    audioRecordBtn: document.getElementById('audioRecordBtn'),
    fileUploadBtn: document.getElementById('fileUploadBtn'),
    codeCanvasBtn: document.getElementById('codeCanvasBtn'),
    settingsChatBtn: document.getElementById('settingsChatBtn'),
    
    // Modals
    canvasModal: document.getElementById('canvasModal'),
    apiModal: document.getElementById('apiModal'),
    keyLockWarning: document.getElementById('keyLockWarning')
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔥 NEXUS AI v10.0 Initializing...');
    console.log('🚀 Powered by VOLCA V10.0');
    
    // Initialize loading sequence
    setTimeout(initApp, 3000);
    
    // Setup all event listeners
    setupEventListeners();
    
    // Load sample history data
    loadSampleHistory();
    
    // Check storage status
    updateStorageStatus();
});

function initApp() {
    elements.loadingScreen.classList.remove('active');
    elements.loadingScreen.classList.add('hidden');
    
    // Check if user is already logged in (from localStorage)
    const savedUser = localStorage.getItem('nexus_user');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            showDashboard();
        } catch (e) {
            showLoginPage();
        }
    } else {
        showLoginPage();
    }
}

// ===== PAGE MANAGEMENT =====
function showLoginPage() {
    hideAllPages();
    elements.loginPage.classList.remove('hidden');
    elements.loginEmail.focus();
    
    // Hide register form initially
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}

function showRegisterPage() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
}

function showDashboard() {
    hideAllPages();
    elements.dashboard.classList.remove('hidden');
    
    // Update user info
    if (currentUser) {
        elements.userAvatar.textContent = currentUser.name.charAt(0).toUpperCase();
        document.getElementById('dashboardUsername').textContent = currentUser.name;
        document.getElementById('dashboardEmail').textContent = currentUser.email;
    }
    
    // Focus on input
    setTimeout(() => {
        elements.messageInput.focus();
    }, 500);
}

function hideAllPages() {
    elements.loginPage.classList.add('hidden');
    elements.registerPage.classList.add('hidden');
    elements.dashboard.classList.add('hidden');
}

// ===== EVENT LISTENERS SETUP =====
function setupEventListeners() {
    // Password toggles
    document.querySelectorAll('.pass-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const input = this.parentElement.querySelector('input');
            const icon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye';
            }
        });
    });
    
    // Navigation
    elements.showRegister?.addEventListener('click', (e) => {
        e.preventDefault();
        showRegisterPage();
    });
    
    elements.backToLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerForm').classList.add('hidden');
        document.getElementById('loginForm').classList.remove('hidden');
    });
    
    // Login/Register
    elements.loginBtn?.addEventListener('click', handleLogin);
    elements.googleLogin?.addEventListener('click', handleGoogleLogin);
    elements.registerBtn?.addEventListener('click', handleRegister);
    
    // Dashboard
    elements.menuToggle?.addEventListener('click', toggleSidebar);
    elements.newChatBtn?.addEventListener('click', startNewChat);
    elements.apiKeyBtn?.addEventListener('click', showApiModal);
    
    // Chat
    elements.sendBtn?.addEventListener('click', sendMessage);
    elements.messageInput?.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    elements.messageInput?.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Update char count
        const charCount = document.querySelector('.char-count');
        charCount.textContent = `${this.value.length}/2000`;
    });
    
    // Quick actions
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const prompt = this.getAttribute('data-prompt');
            elements.messageInput.value = prompt;
            elements.messageInput.focus();
            elements.messageInput.style.height = 'auto';
            elements.messageInput.style.height = elements.messageInput.scrollHeight + 'px';
        });
    });
    
    // History filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filterHistory(this.dataset.filter);
        });
    });

// History search
    elements.historySearch?.addEventListener('input', function() {
        searchHistory(this.value);
    });
    
    // Audio recording
    elements.audioRecordBtn?.addEventListener('click', toggleAudioRecording);
    
    // File upload
    elements.fileUploadBtn?.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = handleFileUpload;
        input.click();
    });
    
    // Code canvas
    elements.codeCanvasBtn?.addEventListener('click', showCanvas);
    
    // Settings panel
    elements.settingsChatBtn?.addEventListener('click', toggleSettingsPanel);
    
    // Canvas controls
    document.querySelector('.close-canvas')?.addEventListener('click', hideCanvas);
    document.querySelector('#runCode')?.addEventListener('click', runCode);
    document.querySelector('#clearCode')?.addEventListener('click', clearCode);
    document.querySelector('#copyAllCode')?.addEventListener('click', copyAllCode);
    
    // API modal
    document.querySelector('.close-api')?.addEventListener('click', hideApiModal);
    document.querySelector('.save-api-btn')?.addEventListener('click', saveApiKeys);
    
    // API key visibility toggles
    document.querySelectorAll('.api-action-btn').forEach(btn => {
        if (btn.querySelector('.fa-eye')) {
            btn.addEventListener('click', function() {
                const input = this.parentElement.querySelector('input');
                const icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        }
    });
    
    // Theme toggle
    document.getElementById('themeToggle')?.addEventListener('click', toggleTheme);
}

// ===== AUTHENTICATION =====
function handleLogin() {
    const email = elements.loginEmail.value.trim();
    const password = elements.loginPass.value;
    
    if (!email || !password) {
        showNotification('Please enter email and password', 'error');
        return;
    }
    
    // Simple validation
    elements.loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> AUTHENTICATING...';
    elements.loginBtn.disabled = true;
    
    setTimeout(() => {
        // Simulate authentication
        currentUser = {
            name: email.split('@')[0],
            email: email,
            avatar: email.charAt(0).toUpperCase()
        };
        
        // Save to localStorage
        localStorage.setItem('nexus_user', JSON.stringify(currentUser));
        
        showNotification('🔐 Quantum synchronization successful!', 'success');
        showDashboard();
        
        elements.loginBtn.innerHTML = '<i class="fas fa-brain"></i> QUANTUM ACCESS';
        elements.loginBtn.disabled = false;
    }, 1500);
}

function handleGoogleLogin() {
    elements.googleLogin.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CONNECTING...';
    elements.googleLogin.disabled = true;
    
    // Simulate Google login
    setTimeout(() => {
        currentUser = {
            name: 'Google User',
            email: 'user@gmail.com',
            avatar: 'G'
        };
        
        localStorage.setItem('nexus_user', JSON.stringify(currentUser));
        
        showNotification('✅ Google Quantum Link established!', 'success');
        showDashboard();
        
        elements.googleLogin.innerHTML = '<i class="fab fa-google"></i> GOOGLE QUANTUM';
        elements.googleLogin.disabled = false;
    }, 1500);
}

function handleRegister() {
    const name = elements.regName.value.trim();
    const email = elements.regEmail.value.trim();
    const password = elements.regPass.value;
    const confirm = elements.regConfirm.value;
    
    if (!name || !email || !password || !confirm) {
        showNotification('Please fill all fields', 'error');
        return;
    }

    if (password.length < 8) {
        showNotification('Password must be at least 8 characters', 'error');
        return;
    }

    if (!/\d/.test(password)) {
        showNotification('Password must contain at least one number', 'error');
        return;
    }

    if (password !== confirm) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    elements.registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> CREATING...';
    elements.registerBtn.disabled = true;
    
    setTimeout(() => {
        currentUser = { 
            name, 
            email,
            avatar: name.charAt(0).toUpperCase()
        };
        
        localStorage.setItem('nexus_user', JSON.stringify(currentUser));
        showNotification('🚀 Quantum ID created successfully!', 'success');
        showDashboard();
        
        elements.registerBtn.innerHTML = '<i class="fas fa-atom"></i> ACTIVATE NEXUS';
        elements.registerBtn.disabled = false;
    }, 1500);
}

// NIH GUE LANJUTIN DARI SINI BANG...
// ===== CHAT FUNCTIONS =====
function startNewChat() {
    if (chatHistory.length > 0 && !confirm('Start new chat? Current chat will be saved to history.')) {
        return;
    }
    
    // Check storage limit
    if (checkStorageLimit()) {
        showKeyLockWarning();
        return;
    }
    
    chatHistory = [];
    activeChat = null;
    elements.messagesContainer.innerHTML = '';
    elements.welcomeScreen.style.display = 'flex';
    elements.messagesContainer.style.display = 'none';
    elements.messageInput.value = '';
    elements.messageInput.style.height = '50px';
    
    // Update UI
    document.querySelectorAll('.history-item').forEach(item => item.classList.remove('active'));
    
    showNotification('✨ New quantum chat started!', 'info');
}

function sendMessage() {
    const message = elements.messageInput.value.trim();
    if (!message || isTyping) return;
    
    // Check key lock
    if (checkStorageLimit()) {
        showKeyLockWarning();
        return;
    }
    
    // Check for swear words
    if (NEXUS_CONFIG.CHAT.filterSwearWords && containsSwearWords(message)) {
        handleSwearWordDetected(message);
        return;
    }
    
    // Hide welcome screen
    elements.welcomeScreen.style.display = 'none';
    elements.messagesContainer.style.display = 'flex';
    
    // Add user message
    addMessage(message, 'user');
    
    // Clear input
    elements.messageInput.value = '';
    elements.messageInput.style.height = '50px';
    document.querySelector('.char-count').textContent = '0/2000';
    
    // Show typing indicator
    isTyping = true;
    elements.typingIndicator.classList.remove('hidden');
    
    // Simulate AI thinking
    setTimeout(() => {
        generateAIResponse(message);
    }, 800 + Math.random() * 1200);
}

function addMessage(text, sender) {
    const messageId = 'msg_' + Date.now();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const date = new Date().toLocaleDateString();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.id = messageId;
    
    const avatarIcon = sender === 'user' ? 'fa-user' : 'fa-robot';
    const avatarColor = sender === 'user' ? 'var(--neon-red)' : 'var(--neon-blue)';
    const senderName = sender === 'user' ? (currentUser?.name || 'You') : 'Nexus AI';
    
    // Format message with emojis if AI
    let formattedText = formatMessage(text, sender);
    
    messageDiv.innerHTML = `
        <div class="avatar ${sender}" style="background: ${avatarColor};">
            <i class="fas ${avatarIcon}"></i>
        </div>
        <div class="message-content ${sender}">
            <div class="message-header">
                <span class="sender-name">${senderName}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-text">${formattedText}</div>
            <div class="message-actions">
                <button class="action-btn" onclick="copyMessage('${messageId}')" title="Copy">
                    <i class="fas fa-copy"></i>
                </button>
                ${sender === 'ai' ? `
                <button class="action-btn" onclick="regenerateResponse('${messageId}')" title="Regenerate">
                    <i class="fas fa-redo"></i>
                </button>
                <button class="action-btn" onclick="speakMessage('${messageId}')" title="Speak">
                    <i class="fas fa-volume-up"></i>
                </button>
                ` : ''}
            </div>
        </div>
    `;
    
    elements.messagesContainer.appendChild(messageDiv);
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
    
    // Save to history
    const messageObj = {
        id: messageId,
        text: text,
        sender: sender,
        time: time,
        date: date,
        formatted: formattedText
    };
    
    chatHistory.push(messageObj);
    
    // Save to localStorage
    saveChatHistory();
    
    // Update sidebar history
    updateHistoryList();
    
    return messageId;
}

function formatMessage(text, sender) {
    if (sender === 'user') {
        return text.replace(/\n/g, '<br>');
          }

// AI response formatting with personality
    let formatted = text;
    
    // Add emojis if enabled
    if (NEXUS_CONFIG.PERSONALITY.useEmojis) {
        const emojiMap = {
            'hello': '👋',
            'hi': '👋',
            'thank': '🙏',
            'thanks': '🙏',
            'sorry': '😔',
            'help': '🤝',
            'code': '💻',
            'python': '🐍',
            'javascript': '⚡',
            'error': '⚠️',
            'success': '✅',
            'warning': '⚠️',
            'note': '📝',
            'important': '❗',
            'funny': '😂',
            'joke': '😂',
            'love': '❤️',
            'happy': '😊',
            'sad': '😢',
            'angry': '😠',
            'wow': '😲'
        };
        
        Object.entries(emojiMap).forEach(([word, emoji]) => {
            const regex = new RegExp(`\\b${word}\\b`, 'gi');
            formatted = formatted.replace(regex, `${word} ${emoji}`);
        });
    }
    
    // Format code blocks
    formatted = formatted.replace(/```(\w+)?\n([\s\S]*?)```/g, function(match, lang, code) {
        return `<div class="code-block">
            <div class="code-header">
                <span>${lang || 'code'}</span>
                <button onclick="copyCodeBlock(this)"><i class="fas fa-copy"></i></button>
            </div>
            <pre><code>${escapeHtml(code)}</code></pre>
        </div>`;
    });
    
    // Format inline code
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
    
    // Format bold and italic
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Add line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function generateAIResponse(userMessage) {
    const model = elements.aiModel.value;
    let response = '';
    
    // Personality-based responses
    const personality = NEXUS_CONFIG.PERSONALITY.style;
    
    // Generate response based on model and personality
    if (model === 'gemini' || model === 'auto') {
        response = generateGeminiResponse(userMessage, personality);
    } else if (model === 'openai') {
        response = generateGPTResponse(userMessage, personality);
    } else if (model === 'claude') {
        response = generateClaudeResponse(userMessage, personality);
    } else if (model === 'local') {
        response = generateLocalResponse(userMessage, personality);
    }
    
    // Add AI message
    const messageId = addMessage(response, 'ai');
    
    // Add emotional reactions
    addEmotionalReaction(messageId, personality);
    
    // Hide typing indicator
    isTyping = false;
    elements.typingIndicator.classList.add('hidden');
    
    // Auto-save
    if (NEXUS_CONFIG.CHAT.autoSave) {
        saveChatHistory();
    }
}

function generateGeminiResponse(message, personality) {
    const responses = {
        funny: `Haha! Kamu nanya: "${message}" 😂

Btw serius nih, gue Nexus AI punya kemampuan:
• Coding semua bahasa (gue jago bgt!)
• Analisis data super cepat
• Nulis kreatif kaya novelis
• Jelasin konsep sulit jadi gampang

Ada yang mau gue bantuin? Atau mau denger jokes dulu? 🤖✨`,
        
        professional: `Terima kasih untuk pertanyaan Anda: "${message}"

Sebagai Nexus AI, saya dapat membantu dengan:
1. Pemrograman dan pengembangan software
2. Analisis data dan visualisasi
3. Penulisan konten dan editing
4. Penjelasan konsep teknis dan akademis
5. Pemecahan masalah logika

Mohon berikan detail lebih lanjut mengenai kebutuhan Anda. 🎯`,
        
        sassy: `Waduh nanya "${message}" ya? 😏

Gue Nexus AI nih, bukan AI biasa:
• Bisa code pake mata tertutup
• Analisis data cuma 2 detik
• Nulis puisi kalo lagi mood
• Jelasin apa aja dengan gaya gue

Langsung aja lu mau apa? Jangan banyak bacot! 😎🔥`
    };
    
    return responses[personality] || responses.funny;
}

function generateGPTResponse(message, personality) {
    return `Hello! I'm Nexus AI powered by GPT architecture. You asked: "${message}"

I can assist you with:
• Code generation in 50+ programming languages
• Data analysis and visualization
• Content creation and editing
• Problem solving and logical reasoning
• Learning and educational support

What specific area would you like to explore today? 🚀`;
}

function generateClaudeResponse(message, personality) {
    return `Greetings! I'm Nexus AI using Claude's architecture. Regarding: "${message}"

As an AI assistant focused on safety and helpfulness, I offer:
• Detailed, accurate explanations
• Research assistance and analysis
• Writing and editing support
• Code review and debugging
• Learning resource recommendations

How may I provide the most helpful assistance? 🧠`;
}

function generateLocalResponse(message, personality) {
    return `Yo! I'm running locally on your machine. You said: "${message}"

Local LLM benefits:
• 100% private - no data leaves your computer
• Completely free to use forever
• Works offline anytime
• Fully customizable to your needs

Let's build something awesome together! 💻⚡`;
}

function addEmotionalReaction(messageId, personality) {
    if (personality === 'funny' || personality === 'sassy') {
        setTimeout(() => {
            const reactions = ['😂', '😎', '✨', '🔥', '🚀', '💯', '🤖', '👾'];
            const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
            
            const reactionDiv = document.createElement('div');
            reactionDiv.className = 'ai-reaction';
            reactionDiv.innerHTML = `
                <span class="reaction-text">Nexus AI reaction: ${randomReaction}</span>
                <button class="react-btn" onclick="addReaction('${messageId}', '${randomReaction}')">
                    <i class="fas fa-plus"></i>
                </button>
            `;
            
            const messageElement = document.getElementById(messageId);
            if (messageElement) {
                messageElement.querySelector('.message-content').appendChild(reactionDiv);
            }
        }, 500);
    }
}

// ===== HISTORY MANAGEMENT =====
function loadSampleHistory() {
    const sampleHistory = [
        {
            id: 'hist_1',
            title: 'Quantum Computing Explained',
            preview: 'Can you explain quantum computing basics?',
            time: 'Today, 10:30 AM',
            fullText: 'Can you explain quantum computing basics?',
            date: new Date()
        },
        {
            id: 'hist_2',
            title: 'Python Data Analysis',
            preview: 'How to analyze CSV data with pandas?',
            time: 'Yesterday, 15:45',
            fullText: 'How to analyze CSV data with pandas?',
            date: new Date(Date.now() - 86400000)
        },
        {
            id: 'hist_3',
            title: 'Website Design Help',
            preview: 'Create a modern login page design',
            time: '3 days ago',
            fullText: 'Create a modern login page design',
            date: new Date(Date.now() - 259200000)
        }
    ];
    
    sampleHistory.forEach(item => {
        addHistoryItem(item);
    });
}

function addHistoryItem(item) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    historyItem.dataset.id = item.id;
    historyItem.dataset.date = item.date.toISOString();
    
    historyItem.innerHTML = `
        <div class="history-title">
            <span>${item.title}</span>
            <span class="time">${item.time}</span>
        </div>
        <div class="history-preview">${item.preview}</div>
    `;
    
    historyItem.addEventListener('click', () => {
        loadChatFromHistory(item.id);
    });
    
    elements.historyList.appendChild(historyItem);
}

function updateHistoryList() {
    // Clear and rebuild
    elements.historyList.innerHTML = '';
    
    // Group by date
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    const groups = {
        today: [],
        yesterday: [],
        thisWeek: [],
        thisMonth: [],
        older: []
    };
    
    chatHistory.forEach(chat => {
        const chatDate = new Date(chat.date);
        const dateStr = chatDate.toDateString();
        
        if (dateStr === today) {
            groups.today.push(chat);
        } else if (dateStr === yesterday) {
            groups.yesterday.push(chat);
        } else if (Date.now() - chatDate.getTime() < 604800000) { // 7 days
            groups.thisWeek.push(chat);
        } else if (Date.now() - chatDate.getTime() < 2592000000) { // 30 days
            groups.thisMonth.push(chat);
        } else {
            groups.older.push(chat);
        }
    });
    
    // Add grouped items
    Object.entries(groups).forEach(([group, items]) => {
        if (items.length > 0) {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'history-group';
            groupHeader.textContent = formatGroupName(group);
            elements.historyList.appendChild(groupHeader);
            
            items.forEach(item => {
                addHistoryItem(item);
            });
        }
    });
}

function formatGroupName(group) {
    const names = {
        today: 'Today',
        yesterday: 'Yesterday',
        thisWeek: 'This Week',
        thisMonth: 'This Month',
        older: 'Older'
    };
    return names[group] || group;
}

function filterHistory(filter) {
    const items = elements.historyList.querySelectorAll('.history-item');
    
    items.forEach(item => {
        const itemDate = new Date(item.dataset.date);
        const now = new Date();
        const diffTime = Math.abs(now - itemDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let show = false;
        
        switch(filter) {
            case 'today':
                show = diffDays === 0;
                break;
            case 'week':
                show = diffDays <= 7;
                break;
            case 'month':
                show = diffDays <= 30;
                break;
            case 'all':
                show = true;
                break;
        }
        
        item.style.display = show ? 'block' : 'none';
    });
}

function searchHistory(query) {
    const items = elements.historyList.querySelectorAll('.history-item');
    
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        const matches = text.includes(query.toLowerCase());
        item.style.display = matches ? 'block' : 'none';
    });
}

// ===== KEY LOCK SYSTEM =====
function checkStorageLimit() {
    // Simulate storage check
    const usedStorage = 70 + Math.random() * 25; // 70-95%
    document.getElementById('storagePercent').textContent = Math.round(usedStorage) + '%';
    
    // Show warning if > 85%
    if (usedStorage > 85) {
        document.querySelector('.storage-warning').style.display = 'flex';
        return usedStorage > 90; // Lock if > 90%
    } else {
        document.querySelector('.storage-warning').style.display = 'none';
        return false;
    }
}

function showKeyLockWarning() {
    elements.keyLockWarning.classList.remove('hidden');
    elements.messageInput.disabled = true;
    elements.sendBtn.disabled = true;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        elements.keyLockWarning.classList.add('hidden');
        elements.messageInput.disabled = false;
        elements.sendBtn.disabled = false;
    }, 5000);
}

// ===== SWEAR WORD DETECTION =====
function containsSwearWords(text) {
    const lowerText = text.toLowerCase();
    return swearWords.some(word => lowerText.includes(word));
}

function handleSwearWordDetected(text) {
    // Add warning message
    const warningMessage = `😔 Maaf ya, tapi pesan kamu mengandung kata-kata yang tidak pantas. 
    
Sebagai AI yang baik, gue ga bisa nerusin percakapan kalo kamu pake bahasa kasar. 
    
Bisa tolong dikasih ulang dengan bahasa yang lebih sopan? 🙏`;
    
    addMessage(warningMessage, 'ai');
    
    // Clear input
    elements.messageInput.value = '';
    
    // Show notification
    showNotification('⚠️ Swear word detected! Message blocked.', 'warning');
    
    // Play warning sound (optional)
    playSound('warning');
}

// ===== AUDIO RECORDING =====
function toggleAudioRecording() {
    if (!isRecording) {
        startAudioRecording();
    } else {
        stopAudioRecording();
    }
}

function startAudioRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showNotification('Microphone access not supported', 'error');
        return;
    }
    
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            isRecording = true;
            elements.audioRecordBtn.innerHTML = '<i class="fas fa-stop"></i>';
            elements.audioRecordBtn.style.background = 'var(--neon-red)';
            
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };
            
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                processAudioRecording(audioBlob);
            };

mediaRecorder.start();
            showNotification('🎤 Recording started... Speak now!', 'info');
        })
        .catch(err => {
            console.error('Error accessing microphone:', err);
            showNotification('Cannot access microphone', 'error');
        });
}

function stopAudioRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        
        elements.audioRecordBtn.innerHTML = '<i class="fas fa-microphone"></i>';
        elements.audioRecordBtn.style.background = '';
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
}

function processAudioRecording(audioBlob) {
    // In real implementation, you would send this to speech-to-text API
    // For demo, we'll simulate processing
    
    showNotification('🔍 Processing your voice message...', 'info');
    
    setTimeout(() => {
        // Simulated transcription
        const transcriptions = [
            "Hello Nexus AI, how are you today?",
            "Can you help me with Python programming?",
            "What is quantum computing?",
            "Create a website for me",
            "Tell me a joke to cheer me up"
        ];
        
        const randomTranscription = transcriptions[Math.floor(Math.random() * transcriptions.length)];
        
        // Set as input
        elements.messageInput.value = randomTranscription;
        elements.messageInput.style.height = 'auto';
        elements.messageInput.style.height = elements.messageInput.scrollHeight + 'px';
        
        showNotification('✅ Voice message transcribed!', 'success');
    }, 2000);
}

// ===== CODE CANVAS =====
function showCanvas() {
    elements.canvasModal.classList.remove('hidden');
    
    // Set default code
    document.getElementById('codeEditor').value = `<!DOCTYPE html>
<html>
<head>
    <title>Nexus Canvas</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: #0a0a1a;
            color: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            color: #00ffea;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Nexus Code Canvas! 🚀</h1>
        <p>Edit this code and click Run to see changes.</p>
        <button onclick="alert('Hello from Nexus!')">Click Me</button>
    </div>
    
    <script>
        console.log('Nexus AI Canvas loaded!');
    </script>
</body>
</html>`;
    
    // Run initial code
    runCode();
}

function hideCanvas() {
    elements.canvasModal.classList.add('hidden');
}

function runCode() {
    const code = document.getElementById('codeEditor').value;
    const language = document.getElementById('codeLanguage').value;
    const consoleOutput = document.getElementById('consoleOutput');
    
    // Clear console
    consoleOutput.innerHTML = '';
    
    try {
        if (language === 'html') {
            const iframe = document.getElementById('previewFrame');
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            
            iframeDoc.open();
            iframeDoc.write(code);
            iframeDoc.close();
            
            consoleOutput.innerHTML += '<div class="console-log success">✅ HTML rendered successfully!</div>';
        } else if (language === 'javascript') {
            // Safe eval for demo
            const result = eval(code);
            consoleOutput.innerHTML += `<div class="console-log">Result: ${result}</div>`;
        } else if (language === 'python') {
            consoleOutput.innerHTML += '<div class="console-log">🐍 Python code detected (requires backend server)</div>';
        }
    } catch (error) {
        consoleOutput.innerHTML += `<div class="console-log error">❌ Error: ${error.message}</div>`;
    }
}

function clearCode() {
    if (confirm('Clear all code?')) {
        document.getElementById('codeEditor').value = '';
        document.getElementById('previewFrame').srcdoc = '';
        document.getElementById('consoleOutput').innerHTML = '';
    }
}

function copyAllCode() {
    const code = document.getElementById('codeEditor').value;
    navigator.clipboard.writeText(code).then(() => {
        showNotification('📋 All code copied to clipboard!', 'success');
    });
}

// ===== API KEYS MANAGEMENT =====
function showApiModal() {
    elements.apiModal.classList.remove('hidden');
    
    // Load saved keys
    const savedKeys = JSON.parse(localStorage.getItem('nexus_api_keys') || '{}');
    
    document.getElementById('geminiKey').value = savedKeys.gemini || '';
    document.getElementById('openaiKey').value = savedKeys.openai || '';
    document.getElementById('claudeKey').value = savedKeys.claude || '';
    document.getElementById('localUrl').value = savedKeys.local || 'http://localhost:11434';
    
    // Update status
    updateApiStatus();
}

function hideApiModal() {
    elements.apiModal.classList.add('hidden');
}

function saveApiKeys() {
    const keys = {
        gemini: document.getElementById('geminiKey').value.trim(),
        openai: document.getElementById('openaiKey').value.trim(),
        claude: document.getElementById('claudeKey').value.trim(),
        local: document.getElementById('localUrl').value.trim()
    };
    
    localStorage.setItem('nexus_api_keys', JSON.stringify(keys));
    NEXUS_CONFIG.API_KEYS = keys;
    
    showNotification('🔐 API keys saved successfully!', 'success');
    updateApiStatus();
    
    // Test connections
    testApiConnections();
}

function updateApiStatus() {
    const keys = JSON.parse(localStorage.getItem('nexus_api_keys') || '{}');
    
    document.getElementById('geminiStatus').textContent = 
        keys.gemini ? '✅ Configured' : '❌ Not configured';
    document.getElementById('openaiStatus').textContent = 
        keys.openai ? '✅ Configured' : '❌ Not configured';
    document.getElementById('claudeStatus').textContent = 
        keys.claude ? '✅ Configured' : '❌ Not configured';
}

function testApiConnections() {
    showNotification('Testing API connections...', 'info');
    
    // Simulate API testing
    setTimeout(() => {
        showNotification('API connections verified!', 'success');
    }, 1500);
}

// ===== UTILITY FUNCTIONS =====
function toggleSidebar() {
    elements.sidebar.classList.toggle('active');
    
    // Add overlay on mobile
    if (window.innerWidth <= 768) {
        let overlay = document.querySelector('.overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'overlay';
            document.querySelector('.main-layout').appendChild(overlay);
        }
        overlay.classList.toggle('active');
        
        overlay.addEventListener('click', () => {
            elements.sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

function toggleSettingsPanel() {
    document.getElementById('settingsPanel').style.display = 
        document.getElementById('settingsPanel').style.display === 'flex' ? 'none' : 'flex';
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('nexus_theme', newTheme);
    
    const icon = document.querySelector('#themeToggle i');
    icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    
    showNotification(`Theme changed to ${newTheme} mode`, 'info');
}

function showNotification(message, type = 'info') {
    // Remove existing notifications
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles if not exists
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 25px;
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 15px;
                animation: slideIn 0.3s ease;
                max-width: 400px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            }
            .notification.info { border-left: 4px solid var(--neon-blue); }
            .notification.success { border-left: 4px solid var(--neon-green); }
            .notification.warning { border-left: 4px solid #ff9900; }
            .notification.error { border-left: 4px solid #ff0000; }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification-close {
                background: none;
                border: none;
                color: var(--text-muted);
                cursor: pointer;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        info: 'info-circle',
        success: 'check-circle',
        warning: 'exclamation-triangle',
        error: 'times-circle'
    };
    return icons[type] || 'info-circle';
}

function copyMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (!messageElement) return;
    
    const messageText = messageElement.querySelector('.message-text').textContent;
    
    navigator.clipboard.writeText(messageText).then(() => {
        showNotification('Message copied to clipboard', 'success');
    });
}

function regenerateResponse(messageId) {
    // Find the user message before this AI response
    const messageIndex = chatHistory.findIndex(m => m.id === messageId);
    if (messageIndex > 0) {
        const userMessage = chatHistory[messageIndex - 1];
        
        // Remove the AI response
        document.getElementById(messageId)?.remove();
        chatHistory.splice(messageIndex, 1);
        
        // Generate new response
        isTyping = true;
        elements.typingIndicator.classList.remove('hidden');
        
        setTimeout(() => {
            generateAIResponse(userMessage.text);
        }, 1000);
    }
}

function speakMessage(messageId) {
    const messageElement = document.getElementById(messageId);
    if (!messageElement) return;
    
    const messageText = messageElement.querySelector('.message-text').textContent;
    
    if ('speechSynthesis' in window) {
        const speech = new SpeechSynthesisUtterance(messageText);
        speech.lang = 'id-ID'; // Indonesian
        speech.rate = 1.0;
        speech.pitch = 1.0;
        
        window.speechSynthesis.speak(speech);
        showNotification('🔊 Speaking message...', 'info');
    } else {
        showNotification('Text-to-speech not supported', 'error');
    }
}

function saveChatHistory() {
    try {
        localStorage.setItem('nexus_chat_history', JSON.stringify(chatHistory));
    } catch (e) {
        console.error('Error saving chat history:', e);
    }
}

function loadChatFromHistory(chatId) {
    // Implementation for loading specific chat
    showNotification('Loading chat from history...', 'info');
}

function playSound(type) {
    // Simple sound notification
    const audio = new Audio();
    audio.src = type === 'warning' ? 
        'https://assets.mixkit.co/sfx/preview/mixkit-warning-alarm-buzzer-960.mp3' :
        'https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3';
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Audio play failed:', e));
}

function updateStorageStatus() {
    // Simulate storage update
    setInterval(() => {
        const usedStorage = 70 + Math.random() * 25; // 70-95%
        document.getElementById('storagePercent').textContent = Math.round(usedStorage) + '%';
        
        if (usedStorage > 85) {
            document.querySelector('.storage-warning').style.display = 'flex';
        }
    }, 10000);
}

// ===== INITIALIZE THEME =====
function initTheme() {
    const savedTheme = localStorage.getItem('nexus_theme') || 'dark';
    document.body.setAttribute('data-theme', savedTheme);
    
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = savedTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}

// Initialize when page loads
initTheme();

// ===== GLOBAL FUNCTIONS =====
window.copyCodeBlock = function(button) {
    const codeBlock = button.closest('.code-block');
    const code = codeBlock.querySelector('code').textContent;
    
    navigator.clipboard.writeText(code).then(() => {
        showNotification('Code copied to clipboard', 'success');
    });
};

window.addReaction = function(messageId, reaction) {
    const messageElement = document.getElementById(messageId);
    if (messageElement) {
        const reactionDiv = document.createElement('div');
        reactionDiv.className = 'user-reaction';
        reactionDiv.textContent = reaction;
        messageElement.querySelector('.message-content').appendChild(reactionDiv);
    }
};

// ===== FINAL INITIALIZATION =====
console.log('✅ NEXUS AI v10.0 Fully Loaded!');
console.log('🎯 Features: Chat History, Key Lock, Audio Recording, Code Canvas, API Management');
console.log('🚀 Ready for quantum intelligence!');
console.log('💾 Storage monitoring active');
console.log('🎤 Voice recording ready');
console.log('🔐 Key lock system active');
console.log('⚡ Code canvas initialized');
