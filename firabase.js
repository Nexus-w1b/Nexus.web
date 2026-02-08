const getFirebaseConfig = () => {
    if (window.NEXUS_CONFIG && window.NEXUS_CONFIG.FIREBASE) {
        return window.NEXUS_CONFIG.FIREBASE;
    }
    
    return {
        apiKey: "AIzaSyBK-MehTTzURY5jT5stH363Y5_WE4iy-XA",
        authDomain: "volca-tools.firebaseapp.com",
        projectId: "volca-tools",
        storageBucket: "volca-tools.firebasestorage.app",
        messagingSenderId: "262525907487",
        appId: "1:262525907487:web:4abc37fa3b583223569b2a"
    };
};

const nexusFirebaseConfig = getFirebaseConfig();

if (!nexusFirebaseConfig.apiKey) {
    console.error("❌ Firebase API key is missing!");
    console.info("💡 Please edit js/nexus-config.js and add your Firebase configuration");
    
    if (typeof showNexusStatus === 'function') {
        showNexusStatus("Firebase configuration missing! Please check console.", "error");
    }
}

let nexusApp, nexusAuth, nexusFirestore, nexusStorage;
try {
    nexusApp = firebase.initializeApp(nexusFirebaseConfig, 'NexusAI');
    nexusAuth = firebase.auth(nexusApp);
    nexusFirestore = firebase.firestore(nexusApp);
    nexusStorage = firebase.storage(nexusApp);
    console.log("✅ Firebase initialized successfully");
} catch (error) {
    console.error("❌ Firebase initialization failed:", error);
}
