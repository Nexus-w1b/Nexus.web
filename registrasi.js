document.addEventListener('DOMContentLoaded', function() {
    // Elements
    const elements = {
        regName: document.getElementById('regName'),
        regEmail: document.getElementById('regEmail'),
        regPassword: document.getElementById('regPassword'),
        regConfirmPassword: document.getElementById('regConfirmPassword'),
        toggleRegPassword: document.getElementById('toggleRegPassword'),
        toggleConfirmPassword: document.getElementById('toggleConfirmPassword'),
        regPasswordStrength: document.getElementById('regPasswordStrength'),
        strengthBar: document.querySelector('#regPasswordStrength .strength-bar'),
        strengthText: document.querySelector('#regPasswordStrength .strength-text'),
        strengthRules: document.querySelectorAll('#regPasswordStrength .rule'),
        passwordMatch: document.getElementById('passwordMatch'),
        agreeTerms: document.getElementById('agreeTerms'),
        newsletterOptIn: document.getElementById('newsletterOptIn'),
        nexusRegisterBtn: document.getElementById('nexusRegisterBtn'),
        googleRegisterBtn: document.getElementById('googleRegisterBtn'),
        processingScreen: document.getElementById('processingScreen'),
        processingText: document.getElementById('processingText'),
        processingProgress: document.getElementById('processingProgress')
    };
    
    // Password visibility toggles
    setupPasswordToggles();
    
    // Password strength checker
    setupPasswordStrengthChecker();
    
    // Password confirmation checker
    setupPasswordConfirmationChecker();
    
    // Registration form submission
    setupRegistrationForm();
    
    // Google registration
    setupGoogleRegistration();
    
    // Add input animations
    setupInputAnimations();
});

// ===== SETUP FUNCTIONS =====

function setupPasswordToggles() {
    // Toggle registration password
    if (elements.toggleRegPassword) {
        elements.toggleRegPassword.addEventListener('click', function() {
            const type = elements.regPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            elements.regPassword.setAttribute('type', type);
            this.innerHTML = type === 'password' ? 
                '<i class="fas fa-eye"></i>' : 
                '<i class="fas fa-eye-slash"></i>';
            
            playSound('clickSound');
            createParticleBurst(this.getBoundingClientRect().left + this.offsetWidth/2,
                              this.getBoundingClientRect().top + this.offsetHeight/2,
                              'var(--quantum-accent)');
        });
    }
    
    // Toggle confirm password
    if (elements.toggleConfirmPassword) {
        elements.toggleConfirmPassword.addEventListener('click', function() {
            const type = elements.regConfirmPassword.getAttribute('type') === 'password' ? 'text' : 'password';
            elements.regConfirmPassword.setAttribute('type', type);
            this.innerHTML = type === 'password' ? 
                '<i class="fas fa-eye"></i>' : 
                '<i class="fas fa-eye-slash"></i>';
            
            playSound('clickSound');
            createParticleBurst(this.getBoundingClientRect().left + this.offsetWidth/2,
                              this.getBoundingClientRect().top + this.offsetHeight/2,
                              'var(--quantum-accent)');
        });
    }
}

function setupPasswordStrengthChecker() {
    if (!elements.regPassword) return;
    
    elements.regPassword.addEventListener('input', function() {
        const password = this.value;
        
        // Check each rule
        const rules = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };
        
        // Update rule indicators
        elements.strengthRules.forEach(rule => {
            const ruleType = rule.textContent.toLowerCase();
            
            if (ruleType.includes('8 characters')) {
                updateRuleIcon(rule, rules.length);
            } else if (ruleType.includes('uppercase')) {
                updateRuleIcon(rule, rules.uppercase);
            } else if (ruleType.includes('lowercase')) {
                updateRuleIcon(rule, rules.lowercase);
            } else if (ruleType.includes('number')) {
                updateRuleIcon(rule, rules.number);
            } else if (ruleType.includes('special')) {
                updateRuleIcon(rule, rules.special);
            }
        });
        
        // Calculate strength percentage
        const trueCount = Object.values(rules).filter(v => v).length;
        const percentage = (trueCount / 5) * 100;
        
        // Update strength bar and text
        elements.strengthBar.style.width = percentage + '%';
        
        if (percentage <= 20) {
            elements.strengthBar.style.background = 'var(--quantum-error)';
            elements.strengthText.textContent = 'Password Strength: Very Weak';
        } else if (percentage <= 40) {
            elements.strengthBar.style.background = 'var(--quantum-error)';
            elements.strengthText.textContent = 'Password Strength: Weak';
        } else if (percentage <= 60) {
            elements.strengthBar.style.background = 'var(--quantum-warning)';
            elements.strengthText.textContent = 'Password Strength: Fair';
        } else if (percentage <= 80) {
            elements.strengthBar.style.background = 'var(--quantum-warning)';
            elements.strengthText.textContent = 'Password Strength: Good';
        } else {
            elements.strengthBar.style.background = 'var(--quantum-success)';
            elements.strengthText.textContent = 'Password Strength: Excellent';
        }
    });
}

function updateRuleIcon(ruleElement, isValid) {
    const icon = ruleElement.querySelector('i');
    if (icon) {
        if (isValid) {
            icon.className = 'fas fa-check-circle valid';
            icon.style.color = 'var(--quantum-success)';
        } else {
            icon.className = 'fas fa-times-circle invalid';
            icon.style.color = 'var(--quantum-error)';
        }
    }
}

function setupPasswordConfirmationChecker() {
    if (!elements.regConfirmPassword || !elements.passwordMatch) return;
    
    elements.regConfirmPassword.addEventListener('input', function() {
        const password = elements.regPassword.value;
        const confirmPassword = this.value;
        
        if (confirmPassword.length === 0) {
            elements.passwordMatch.style.opacity = '0';
            return;
        }
        
        if (password === confirmPassword) {
            elements.passwordMatch.innerHTML = '<i class="fas fa-check"></i><span>Passwords match</span>';
            elements.passwordMatch.style.color = 'var(--quantum-success)';
            elements.passwordMatch.style.opacity = '1';
        } else {
            elements.passwordMatch.innerHTML = '<i class="fas fa-times"></i><span>Passwords do not match</span>';
            elements.passwordMatch.style.color = 'var(--quantum-error)';
            elements.passwordMatch.style.opacity = '1';
        }
    });
}

function setupRegistrationForm() {
    if (!elements.nexusRegisterBtn) return;
    
    elements.nexusRegisterBtn.addEventListener('click', async function() {
        // Get form values
        const name = elements.regName.value.trim();
        const email = elements.regEmail.value.trim();
        const password = elements.regPassword.value;
        const confirmPassword = elements.regConfirmPassword.value;
        
        // Validate form
        const validation = validateRegistrationForm(name, email, password, confirmPassword);
        
        if (!validation.valid) {
            showNexusStatus(validation.message, 'error');
            
            // Shake animation for invalid fields
            validation.invalidFields.forEach(field => {
                const input = document.getElementById(field);
                if (input) {
                    input.classList.add('shake');
                    setTimeout(() => input.classList.remove('shake'), 500);
                }
            });
            
            return;
        }
        
                // Check terms agreement
        if (!elements.agreeTerms.checked) {
            showNexusStatus('You must agree to the terms and conditions', 'error');
            elements.agreeTerms.parentElement.classList.add('shake');
            setTimeout(() => elements.agreeTerms.parentElement.classList.remove('shake'), 500);
            return;
        }
        
        // Show processing screen
        showProcessingScreen();
        
        // Start registration process
        await processRegistration(name, email, password);
    });
}

function validateRegistrationForm(name, email, password, confirmPassword) {
    const result = {
        valid: true,
        message: '',
        invalidFields: []
    };
    
    // Check name
    if (!name) {
        result.valid = false;
        result.invalidFields.push('regName');
        result.message = 'Please enter your display name';
    } else if (name.length < 2) {
        result.valid = false;
        result.invalidFields.push('regName');
        result.message = 'Name must be at least 2 characters';
    } else if (name.length > 30) {
        result.valid = false;
        result.invalidFields.push('regName');
        result.message = 'Name must be less than 30 characters';
    }
    
    // Check email
    if (!email) {
        result.valid = false;
        result.invalidFields.push('regEmail');
        result.message = 'Please enter your email address';
    } else if (!isValidEmail(email)) {
        result.valid = false;
        result.invalidFields.push('regEmail');
        result.message = 'Please enter a valid email address';
    }
    
    // Check password
    if (!password) {
        result.valid = false;
        result.invalidFields.push('regPassword');
        result.message = 'Please create a password';
    } else if (password.length < 8) {
        result.valid = false;
        result.invalidFields.push('regPassword');
        result.message = 'Password must be at least 8 characters';
    }
    
    // Check password confirmation
    if (password !== confirmPassword) {
        result.valid = false;
        result.invalidFields.push('regConfirmPassword');
        result.message = 'Passwords do not match';
    }
    
    // If we already have a message, return
    if (!result.valid) return result;
    
    // Check password strength
    const strength = checkPasswordStrength(password);
    if (strength.level === 'weak') {
        result.valid = false;
        result.invalidFields.push('regPassword');
        result.message = 'Please create a stronger password';
    }
    
    return result;
}

async function processRegistration(name, email, password) {
    try {
        // Update processing text
        updateProcessingText('Generating quantum signature...', 1);
        await simulateProgress(25, 1000);
        
        // Check if user already exists
        updateProcessingText('Checking quantum database...', 2);
        await simulateProgress(50, 1000);
        
        const userExists = await nexusAuthInstance.checkUserExists(email);
        if (userExists) {
            hideProcessingScreen();
            showNexusStatus('This quantum ID already exists. Please login instead.', 'error');
            return;
        }
        
        // Create user account
        updateProcessingText('Creating quantum identity...', 3);
        await simulateProgress(75, 1500);
        
        const result = await nexusAuthInstance.register(email, password, name);
        
        if (result.success) {
            updateProcessingText('Finalizing Nexus integration...', 4);
            await simulateProgress(100, 1000);
            
            // Show success
            hideProcessingScreen();
            showNexusStatus('Quantum synthesis complete! Check your email for verification.', 'success');
            
            // Play success sound
            playSound('loginSound');
            
            // Redirect to login after 3 seconds
            setTimeout(() => {
                window.location.href = 'index.html?registered=true';
            }, 3000);
            
        } else {
            hideProcessingScreen();
            showNexusStatus(`Registration failed: ${result.error}`, 'error');
        }
        
    } catch (error) {
        hideProcessingScreen();
        showNexusStatus(`Quantum synthesis error: ${error.message}`, 'error');
        console.error('Registration error:', error);
    }
}

function setupGoogleRegistration() {
    if (!elements.googleRegisterBtn) return;
    
    elements.googleRegisterBtn.addEventListener('click', async function() {
        // Check terms agreement
        if (!elements.agreeTerms.checked) {
            showNexusStatus('You must agree to the terms and conditions', 'error');
            elements.agreeTerms.parentElement.classList.add('shake');
            setTimeout(() => elements.agreeTerms.parentElement.classList.remove('shake'), 500);
            return;
        }
        
        // Show processing screen
        showProcessingScreen();
        updateProcessingText('Connecting to Google Quantum Network...', 1);
        
        // Attempt Google registration
        const result = await nexusAuthInstance.loginWithGoogle();
        
        if (result.success) {
            updateProcessingText('Finalizing Nexus integration...', 4);
            await simulateProgress(100, 1000);
            
            hideProcessingScreen();
            showNexusStatus('Google Quantum Link established successfully!', 'success');
            
            // Redirect will happen automatically via auth state change
        } else {
            hideProcessingScreen();
            showNexusStatus(`Google registration failed: ${result.error}`, 'error');
        }
    });
}

function setupInputAnimations() {
    // Add focus/blur effects to all inputs
    document.querySelectorAll('.nexus-input-group input').forEach(input => {
        input.addEventListener('focus', function() {
            this.parentElement.classList.add('focused');
            createParticleBurst(
                this.getBoundingClientRect().left,
                this.getBoundingClientRect().bottom,
                'var(--quantum-accent)'
            );
        });
        
        input.addEventListener('blur', function() {
            if (!this.value) {
                this.parentElement.classList.remove('focused');
            }
        });
    });
    
    // Add particle effects to button clicks
    document.querySelectorAll('.nexus-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = rect.left + rect.width/2;
            const y = rect.top + rect.height/2;
            
            createParticleBurst(x, y, 
                this.classList.contains('register-btn') ? 'var(--quantum-primary)' : 
                this.classList.contains('google-btn') ? 'var(--quantum-blue)' : 
                'var(--quantum-accent)'
            );
            
            playSound('clickSound');
        });
    });
}

// ===== PROCESSING SCREEN FUNCTIONS =====

function showProcessingScreen() {
    if (!elements.processingScreen) return;
    
    elements.processingScreen.style.display = 'flex';
    setTimeout(() => {
        elements.processingScreen.style.opacity = '1';
    }, 10);
    
    // Start step animation
    animateProcessingSteps();
}

function hideProcessingScreen() {
    if (!elements.processingScreen) return;
    
    elements.processingScreen.style.opacity = '0';
    setTimeout(() => {
        elements.processingScreen.style.display = 'none';
    }, 500);
}

function updateProcessingText(text, step) {
    if (!elements.processingText) return;
    
    elements.processingText.textContent = text;
    
    // Update active step
    document.querySelectorAll('.processing-steps .step').forEach((stepEl, index) => {
        if (index + 1 <= step) {
            stepEl.classList.add('active');
        } else {
            stepEl.classList.remove('active');
        }
    });
}

async function simulateProgress(targetPercent, duration) {
    return new Promise(resolve => {
        let currentPercent = parseInt(elements.processingProgress.style.width) || 0;
        const increment = (targetPercent - currentPercent) / (duration / 50);
        
        const interval = setInterval(() => {
            currentPercent += increment;
            elements.processingProgress.style.width = currentPercent + '%';
            
            if (currentPercent >= targetPercent) {
                elements.processingProgress.style.width = targetPercent + '%';
                clearInterval(interval);
                resolve();
            }
        }, 50);
    });
}

function animateProcessingSteps() {
    const steps = document.querySelectorAll('.processing-steps .step');
    let currentStep = 0;
    
    const interval = setInterval(() => {
        if (!elements.processingScreen.style.display || 
            elements.processingScreen.style.display === 'none') {
            clearInterval(interval);
            return;
        }
        
        steps.forEach(step => step.classList.remove('pulsing'));
        
        if (currentStep < steps.length) {
            steps[currentStep].classList.add('pulsing');
            currentStep++;
        } else {
            currentStep = 0;
        }
    }, 1000);
}

// ===== HELPER FUNCTIONS =====

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Check for registration success parameter
function checkRegistrationSuccess() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
        showNexusStatus('Registration successful! Please check your email to verify your account.', 'success');
        
        // Remove parameter from URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// Initialize on load
checkRegistrationSuccess();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        validateRegistrationForm,
        updateProcessingText,
        showProcessingScreen,
        hideProcessingScreen
    };
}
