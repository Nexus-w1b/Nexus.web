document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const elements = {
        loginEmail: document.getElementById('loginEmail'),
        loginPassword: document.getElementById('loginPassword'),
        togglePassword: document.getElementById('togglePassword'),
        passwordStrength: document.getElementById('passwordStrength'),
        strengthBar: document.querySelector('.strength-bar'),
        strengthText: document.querySelector('.strength-text'),
        nexusLoginBtn: document.getElementById('nexusLoginBtn'),
        googleLoginBtn: document.getElementById('googleLoginBtn'),
        showRegisterBtn: document.getElementById('showRegisterBtn'),
        accessKeyDisplay: document.getElementById('accessKeyDisplay'),
        statusText: document.getElementById('statusText')
    };
    
    // Check for saved credentials
    checkSavedLogin();
    
    // Password visibility toggle
    if (elements.togglePassword) {
        elements.togglePassword.addEventListener('click', function() {
            const type = elements.loginPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            elements.loginPassword.setAttribute('type', type);
            this.innerHTML = type === 'password' ? 
                '<i class="fas fa-eye"></i>' : 
                '<i class="fas fa-eye-slash"></i>';
            
            playSound('clickSound');
        });
    }
    
    // Password strength indicator
    if (elements.loginPassword) {
        elements.loginPassword.addEventListener('input', function() {
            const password = this.value;
            
            if (password.length === 0) {
                elements.strengthBar.style.width = '0%';
                elements.strengthBar.style.background = 'var(--quantum-error)';
                elements.strengthText.textContent = 'Security Level: None';
                return;
            }
            
            const strength = checkPasswordStrength(password);
            
            elements.strengthBar.style.width = strength.percentage + '%';
            
            switch (strength.level) {
                case 'weak':
                    elements.strengthBar.style.background = 'var(--quantum-error)';
                    elements.strengthText.textContent = 'Security Level: Weak';
                    elements.strengthText.style.color = 'var(--quantum-error)';
                    break;
                case 'medium':
                    elements.strengthBar.style.background = 'var(--quantum-warning)';
                    elements.strengthText.textContent = 'Security Level: Medium';
                    elements.strengthText.style.color = 'var(--quantum-warning)';
                    break;
                case 'strong':
                    elements.strengthBar.style.background = 'var(--quantum-success)';
                    elements.strengthText.textContent = 'Security Level: Strong';
                    elements.strengthText.style.color = 'var(--quantum-success)';
                    break;
            }
        });
    }
    
    // Enter key to login
    if (elements.loginPassword) {
        elements.loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                elements.nexusLoginBtn.click();
                createParticleBurst(e.clientX, e.clientY, 'var(--quantum-accent)');
            }
        });
    }
    
    // Email/Password Login
    if (elements.nexusLoginBtn) {
        elements.nexusLoginBtn.addEventListener('click', async function() {
            const email = elements.loginEmail.value.trim();
            const password = elements.loginPassword.value;
            
            // Validate inputs
            if (!email || !password) {
                showNexusStatus('Please enter both email and password', 'error');
                return;
            }
            
            if (!isValidEmail(email)) {
                showNexusStatus('Please enter a valid email address', 'error');
                return;
            }
            
            // Add loading state
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>QUANTUM SYNCHRONIZING...</span>';
            this.disabled = true;
            
            // Play login sound
            playSound('loginSound');
            
            // Attempt login
            const result = await nexusAuthInstance.login(email, password);
            
            if (result.success) {
                // Save login for next time
                saveLoginCredentials(email);
                
                // Show success animation
                this.innerHTML = '<i class="fas fa-check"></i><span>ACCESS GRANTED!</span>';
                this.style.background = 'linear-gradient(135deg, var(--quantum-success), var(--quantum-secondary))';
                
                // Particle burst effect
                const rect = this.getBoundingClientRect();
                createParticleBurst(rect.left + rect.width/2, rect.top + rect.height/2, 'var(--quantum-success)');
                
                // Redirect will happen in auth state change handler
            } else {
                // Reset button
                this.innerHTML = '<i class="fas fa-brain"></i><span>QUANTUM SYNCHRONIZATION</span>';
                this.disabled = false;
                
                if (result.needsVerification) {
                    // Show verification reminder
                    setTimeout(() => {
                        showNexusStatus('Check your email for verification link!', 'warning');
                    }, 1000);
                }
            }
        });
    }
    
        // Google Login
    if (elements.googleLoginBtn) {
        elements.googleLoginBtn.addEventListener('click', async function() {
            // Add loading state
            const originalHTML = this.innerHTML;
            this.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>CONNECTING TO GOOGLE...</span>';
            this.disabled = true;
            
            // Play sound
            playSound('clickSound');
            
            // Attempt Google login
            const result = await nexusAuthInstance.loginWithGoogle();
            
            if (!result.success) {
                // Reset button
                this.innerHTML = originalHTML;
                this.disabled = false;
            }
        });
    }
    
    // Show register page
    if (elements.showRegisterBtn) {
        elements.showRegisterBtn.addEventListener('click', function() {
            playSound('clickSound');
            createParticleBurst(this.getBoundingClientRect().left + this.offsetWidth/2, 
                              this.getBoundingClientRect().top + this.offsetHeight/2,
                              'var(--quantum-secondary)');
            
            // Redirect to register page (to be implemented)
            showNexusStatus('Redirecting to registration portal...', 'info');
            setTimeout(() => {
                window.location.href = 'register.html';
            }, 1000);
        });
    }
    
    // Check for special access keys in URL
    checkURLForAccessKeys();
    
    // Add particle effects to button clicks
    document.querySelectorAll('.nexus-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = rect.left + rect.width/2;
            const y = rect.top + rect.height/2;
            
            if (this.classList.contains('login-btn')) {
                createParticleBurst(x, y, 'var(--quantum-primary)');
            } else if (this.classList.contains('google-btn')) {
                createParticleBurst(x, y, 'var(--quantum-blue)');
            } else {
                createParticleBurst(x, y, 'var(--quantum-accent)');
            }
            
            playSound('clickSound');
        });
    });
    
    // Add hover effects to inputs
    document.querySelectorAll('.nexus-input-group input').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
    });
    
    // Add animated background interaction
    document.addEventListener('mousemove', throttle(function(e) {
        const particles = document.querySelectorAll('#universeCanvas canvas');
        if (particles.length > 0) {
            // This would interact with particles.js if implemented
        }
    }, 50));
});

// ===== HELPER FUNCTIONS =====

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function saveLoginCredentials(email) {
    try {
        localStorage.setItem('nexus_last_email', email);
        localStorage.setItem('nexus_last_login', Date.now());
    } catch (e) {
        console.log('Could not save credentials:', e);
    }
}

function checkSavedLogin() {
    try {
        const lastEmail = localStorage.getItem('nexus_last_email');
        const lastLogin = localStorage.getItem('nexus_last_login');
        
        if (lastEmail && elements.loginEmail) {
            elements.loginEmail.value = lastEmail;
            
            // Auto-focus password field if email exists
            setTimeout(() => {
                if (elements.loginPassword) {
                    elements.loginPassword.focus();
                }
            }, 500);
        }
        
        // Check if it's been less than 7 days since last login
        if (lastLogin && (Date.now() - parseInt(lastLogin)) < 7 * 24 * 60 * 60 * 1000) {
            if (elements.accessKeyDisplay) {
                elements.accessKeyDisplay.textContent = 'ACCESS: RETURNING USER';
                elements.accessKeyDisplay.style.color = 'var(--quantum-success)';
            }
        }
    } catch (e) {
        console.log('Could not load saved login:', e);
    }
}

function checkURLForAccessKeys() {
    const urlParams = new URLSearchParams(window.location.search);
    const accessKey = urlParams.get('key');
    const vipCode = urlParams.get('vip');
    
    if (accessKey === '1418649629' || vipCode === 'phbas29h') {
        // VOLCA MODE ACTIVATED
        if (elements.accessKeyDisplay) {
            elements.accessKeyDisplay.textContent = 'ACCESS: VOLCA MODE UNLOCKED 🔥';
            elements.accessKeyDisplay.style.color = 'var(--quantum-primary)';
            elements.accessKeyDisplay.classList.add('quantum-flicker');
        }
        
        showNexusStatus('🔥 VOLCA MODE DETECTED - UNRESTRICTED ACCESS GRANTED! 🔥', 'success');
        
        // Save to localStorage
        localStorage.setItem('nexus_volca_mode', 'true');
        
        // Play special sound
        setTimeout(() => {
            playSound('loginSound');
        }, 500);
        
        // Remove key from URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    // Check for saved VOLCA mode
    if (localStorage.getItem('nexus_volca_mode') === 'true') {
        if (elements.accessKeyDisplay) {
            elements.accessKeyDisplay.textContent = 'ACCESS: VOLCA MODE ACTIVE 🔥';
            elements.accessKeyDisplay.style.color = 'var(--quantum-primary)';
            elements.accessKeyDisplay.classList.add('quantum-flicker');
        }
    }
}

// Initialize audio context for better sound performance
function initAudioContext() {
    if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
        window.audioContext = new (AudioContext || webkitAudioContext)();
        
        // Resume audio context on user interaction
        document.addEventListener('click', function initAudio() {
            if (window.audioContext && window.audioContext.state === 'suspended') {
                window.audioContext.resume();
            }
            document.removeEventListener('click', initAudio);
        });
    }
}

// Call initialization
initAudioContext();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        isValidEmail,
        saveLoginCredentials,
        checkSavedLogin,
        checkURLForAccessKeys
    };
                  }
