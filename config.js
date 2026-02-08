const NEXUS_CONFIG = {
  FIRABASE: {
  apiKey: "AIzaSyBK-MehTTzURY5jT5stH363Y5_WE4iy-XA",
  authDomain: "volca-tools.firebaseapp.com",
  projectId: "volca-tools",
  storageBucket: "volca-tools.firebasestorage.app",
  messagingSenderId: "262525907487",
  appId: "1:262525907487:web:4abc37fa3b583223569b2a",
},
    // 🤖 GOOGLE GEMINI: https://makersuite.google.com/app/apikey
    GEMINI_API_KEY: "AIzaSyBiH7xdMUR7aXK8S1AWvuo1qJu2mqabI4g",
    
    // 🧠 OPENAI: https://platform.openai.com/api-keys
    OPENAI_API_KEY: "sk-proj-pLzNccYgL6bdFQZKatWx_#d660WICmGhaJGCVeN5bJeJ2fi5loc6rYXvOtjX7E1vF6M5IdpmQpuT3BlbkFJIpyp40GPHO5Kt4SM83CWlShPS9wxLgKsrzZcJi8141F3C0gEkXfMtLqtX_6xuZbgo-FVzl4EgA",
    
    // 🎯 CLAUDE: https://console.anthropic.com/
    CLAUDE_API_KEY: "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",
    
    // ⚡ GROK: https://grok.x.ai/ (waitlist)
    GROK_API_KEY: "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",
    
    // 🆓 HUGGING FACE: https://huggingface.co/settings/tokens
    HUGGINGFACE_TOKEN: false,
    
    // 🔍 PERPLEXITY: https://www.perplexity.ai/settings/api
    PERPLEXITY_API_KEY: false,
    
    // 🎨 COHERE: https://dashboard.cohere.com/api-keys
    COHERE_API_KEY: "zpM6r8q09AALmAtyiW2IpHsm8wjEK15IbSW5YX1G",
    
    // ========== LOCAL LLM ==========
    // 💻 Install Ollama: https://ollama.ai/
    USE_LOCAL_LLM: false,
    LOCAL_LLM_URL: "http://localhost:11434/v1",
    LOCAL_MODEL: "llama2",
    
    // ========== FEATURE TOGGLES ==========
    ENABLE_VOICE: true,
    ENABLE_FILE_UPLOAD: true,
    ENABLE_CODE_CANVAS: true,
    ENABLE_DARK_WEB_SEARCH: false, // Hati-hati!
    
    // ========== SECURITY ==========
    ENCRYPTION_KEY: "nexus-change-this-secret-key",
    SESSION_TIMEOUT: 3600, // 1 jam
    
    // ========== UI CONFIG ==========
    THEME: "quantum",
    PRIMARY_COLOR: "#ff0080",
    SECONDARY_COLOR: "#00ffaa",
    LANGUAGE: "id",
    
    // ========== RATE LIMITS ==========
    MAX_TOKENS_PER_DAY: 100000,
    MAX_REQUESTS_PER_MINUTE: 60,
    
    // ========== DEBUG MODE ==========
    DEBUG: true,
    LOG_LEVEL: "info"
};

// ============================================
// 🎯 VALIDATION FUNCTION
// ============================================
function validateConfig() {
    const errors = [];
    
    if (!NEXUS_CONFIG.FIREBASE.apiKey) {
        errors.push("Firebase API key is required!");
    }
    
    if (!NEXUS_CONFIG.GEMINI_API_KEY && 
        !NEXUS_CONFIG.OPENAI_API_KEY && 
        !NEXUS_CONFIG.CLAUDE_API_KEY &&
        !NEXUS_CONFIG.USE_LOCAL_LLM) {
        errors.push("At least one AI API key or Local LLM is required!");
    }
    
    if (NEXUS_CONFIG.ENCRYPTION_KEY === "nexus-change-this-secret-key") {
        console.warn("⚠️ Please change the default encryption key!");
    }
    
    if (errors.length > 0) {
        console.error("❌ Configuration errors:", errors);
        return false;
    }
    
    console.log("✅ Nexus AI Config validated successfully!");
    return true;
}

// ============================================
// 🎯 EXPORT CONFIG
// ============================================
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { NEXUS_CONFIG, validateConfig };
} else {
    window.NEXUS_CONFIG = NEXUS_CONFIG;
    window.validateNexusConfig = validateConfig;
}
