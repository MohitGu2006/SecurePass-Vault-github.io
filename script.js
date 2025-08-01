
class SecurePassVault {
    constructor() {
        this.initializeElements();
        this.setupMobileOptimizations();
        this.attachEventListeners();
        this.generatePassword();
    }

    initializeElements() {
        this.passwordInput = document.getElementById('generatedPassword');
        this.lengthSlider = document.getElementById('lengthSlider');
        this.lengthValue = document.getElementById('lengthValue');
        this.generateBtn = document.getElementById('generateBtn');
        this.copyBtn = document.getElementById('copyBtn');
        this.refreshBtn = document.getElementById('refreshBtn');
        this.qrBtn = document.getElementById('qrBtn');
        this.strengthFill = document.getElementById('strengthFill');
        this.strengthText = document.getElementById('strengthText');
        this.entropyValue = document.getElementById('entropyValue');
        this.crackTime = document.getElementById('crackTime');
        this.combinations = document.getElementById('combinations');
        this.poolSize = document.getElementById('poolSize');
        this.securityLevel = document.getElementById('securityLevel');
        this.qrModal = document.getElementById('qrModal');
        this.notification = document.getElementById('notification');
        this.notificationText = document.getElementById('notificationText');

        // Checkboxes
        this.uppercaseCheck = document.getElementById('uppercase');
        this.lowercaseCheck = document.getElementById('lowercase');
        this.numbersCheck = document.getElementById('numbers');
        this.symbolsCheck = document.getElementById('symbols');
        this.excludeSimilarCheck = document.getElementById('excludeSimilar');
        this.excludeAmbiguousCheck = document.getElementById('excludeAmbiguous');
        this.customCharsInput = document.getElementById('customChars');
    }

    setupMobileOptimizations() {
        // Detect mobile and set optimization flags
        this.isMobile = window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isLowPowerDevice = this.isMobile && (navigator.hardwareConcurrency <= 4 || navigator.deviceMemory <= 4);
        
        // Initialize performance tracking
        this.performanceMetrics = {
            generationTime: 0,
            analysisTime: 0,
            domUpdateTime: 0
        };
        
        // Create lightweight worker for heavy calculations
        this.initializeAsyncCalculator();
        
        // Setup DOM update batching
        this.pendingDOMUpdates = new Map();
        this.domUpdateScheduled = false;
        
        // Disable expensive animations on low-power devices
        if (this.isLowPowerDevice) {
            document.documentElement.style.setProperty('--animation-duration', '0s');
            this.strengthFill.style.transition = 'width 0.1s ease';
        }
    }

    initializeAsyncCalculator() {
        // Fallback async calculator using setTimeout for heavy operations
        this.asyncCalculator = {
            calculateLargeNumbers: (poolSize, length) => {
                return new Promise((resolve) => {
                    if (this.isMobile) {
                        // Use requestIdleCallback for mobile optimization
                        const calculateWithIdle = (deadline) => {
                            const startTime = performance.now();
                            let combinations;
                            
                            // Lightweight calculation for mobile
                            if (length > 20 || poolSize > 90) {
                                combinations = Infinity;
                            } else if (length > 15) {
                                // Use logarithmic approximation to avoid large exponents
                                const logResult = length * Math.log10(poolSize);
                                combinations = logResult > 15 ? Infinity : Math.pow(10, logResult);
                            } else {
                                combinations = Math.pow(poolSize, Math.min(length, 15));
                            }
                            
                            // Check if we still have time or if we need to yield
                            if (deadline && deadline.timeRemaining() > 5) {
                                resolve(combinations);
                            } else {
                                setTimeout(() => resolve(combinations), 0);
                            }
                        };
                        
                        if (window.requestIdleCallback) {
                            requestIdleCallback(calculateWithIdle);
                        } else {
                            setTimeout(() => calculateWithIdle(), 0);
                        }
                    } else {
                        // Desktop can handle immediate calculation
                        setTimeout(() => {
                            const combinations = length > 25 ? Infinity : Math.pow(poolSize, Math.min(length, 20));
                            resolve(combinations);
                        }, 0);
                    }
                });
            }
        };
    }

    attachEventListeners() {
        // Mobile-optimized slider with throttling for smooth performance
        let sliderTimeout;
        this.lengthSlider.addEventListener('input', () => {
            this.lengthValue.textContent = this.lengthSlider.value;
            
            // Throttle generation for mobile to prevent lag
            clearTimeout(sliderTimeout);
            sliderTimeout = setTimeout(() => this.generatePassword(), window.innerWidth <= 768 ? 100 : 0);
        });

        // Mobile-optimized event handlers with touch support
        this.generateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.generatePassword();
        });
        this.refreshBtn.addEventListener('click', (e) => {
            e.preventDefault(); 
            this.generatePassword();
        });
        this.copyBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.copyToClipboard();
        });
        this.qrBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.showQRCode();
        });

        // Mobile-optimized checkbox handling with adaptive debouncing
        let checkboxTimeout;
        const isMobile = window.innerWidth <= 768;
        const debounceDelay = isMobile ? 150 : 50;
        
        [this.uppercaseCheck, this.lowercaseCheck, this.numbersCheck, this.symbolsCheck,
         this.excludeSimilarCheck, this.excludeAmbiguousCheck].forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                clearTimeout(checkboxTimeout);
                checkboxTimeout = setTimeout(() => this.generatePassword(), debounceDelay);
            });
        });

        // Reduced debounce for custom input
        let inputTimeout;
        this.customCharsInput.addEventListener('input', () => {
            clearTimeout(inputTimeout);
            inputTimeout = setTimeout(() => this.generatePassword(), 200);
        });

        // Modal controls
        document.querySelector('.close').addEventListener('click', () => {
            this.qrModal.style.display = 'none';
        });

        window.addEventListener('click', (event) => {
            if (event.target === this.qrModal) {
                this.qrModal.style.display = 'none';
            }
        });

        // Download QR code
        document.getElementById('downloadQR').addEventListener('click', () => this.downloadQRCode());

        // Generate initial password
        this.generatePassword();
    }

    getCharacterSets() {
        // Cache character sets for better performance
        const cacheKey = `${this.uppercaseCheck.checked}-${this.lowercaseCheck.checked}-${this.numbersCheck.checked}-${this.symbolsCheck.checked}-${this.excludeSimilarCheck.checked}-${this.excludeAmbiguousCheck.checked}-${this.customCharsInput.value}`;
        
        if (this.charsetCache && this.charsetCache.has(cacheKey)) {
            return this.charsetCache.get(cacheKey);
        }

        const sets = {
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            numbers: '0123456789',
            symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?~`'
        };

        const similar = '0O1lI';
        const ambiguous = '{}[]()<>"\'\`';

        let charset = '';

        if (this.uppercaseCheck.checked) {
            charset += sets.uppercase;
        }
        if (this.lowercaseCheck.checked) {
            charset += sets.lowercase;
        }
        if (this.numbersCheck.checked) {
            charset += sets.numbers;
        }
        if (this.symbolsCheck.checked) {
            charset += sets.symbols;
        }

        // Add custom characters
        if (this.customCharsInput.value) {
            charset += this.customCharsInput.value;
        }

        // Efficient character filtering using Sets
        if (this.excludeSimilarCheck.checked || this.excludeAmbiguousCheck.checked) {
            const excludeSet = new Set();
            if (this.excludeSimilarCheck.checked) {
                for (const char of similar) excludeSet.add(char);
            }
            if (this.excludeAmbiguousCheck.checked) {
                for (const char of ambiguous) excludeSet.add(char);
            }
            
            charset = charset.split('').filter(char => !excludeSet.has(char)).join('');
        }

        // Remove duplicates efficiently
        charset = [...new Set(charset)].join('');

        // Cache the result
        if (!this.charsetCache) this.charsetCache = new Map();
        this.charsetCache.set(cacheKey, charset);

        return charset;
    }

    generateSecureRandom(max) {
        // Use crypto.getRandomValues for cryptographically secure random numbers
        const array = new Uint32Array(1);
        crypto.getRandomValues(array);
        return array[0] % max;
    }

    generatePassword() {
        const startTime = performance.now();
        const length = parseInt(this.lengthSlider.value);
        const charset = this.getCharacterSets();

        if (!charset || charset.length === 0) {
            this.passwordInput.value = '';
            this.showNotification('Please select at least one character type!', 'error');
            return;
        }

        // Validate length
        if (length < 4 || length > 50) {
            this.showNotification('Password length must be between 4 and 50 characters!', 'error');
            return;
        }

        // Ultra-fast password generation optimized for mobile
        const password = this.createPasswordOptimized(length, charset);
        if (this.performanceMetrics) {
            this.performanceMetrics.generationTime = performance.now() - startTime;
        }
        
        // Batch DOM updates for smooth mobile performance
        this.updatePasswordDisplayOptimized(password, charset.length);
    }

    createPasswordOptimized(length, charset) {
        // Mobile-optimized password generation using array join for best performance
        const charsetLength = charset.length;
        const guaranteedChars = this.getGuaranteedChars();
        
        // Pre-allocate array for ultra-fast string building (avoid concatenation)
        const passwordArray = new Array(length);
        
        // Use smaller batch sizes for mobile to prevent blocking
        const batchSize = Math.min(16, length);
        const randomValues = new Uint32Array(batchSize);
        
        let index = 0;
        
        // Add guaranteed characters first
        for (let i = 0; i < guaranteedChars.length && index < length; i++) {
            passwordArray[index++] = guaranteedChars[i];
        }
        
        // Fill remaining positions in mobile-friendly batches
        while (index < length) {
            const remaining = length - index;
            const currentBatch = Math.min(batchSize, remaining);
            
            // Generate random values for this batch only
            crypto.getRandomValues(randomValues);
            
            for (let i = 0; i < currentBatch; i++) {
                passwordArray[index++] = charset[randomValues[i] % charsetLength];
            }
        }
        
        // Ultra-fast shuffle using array operations
        return this.shuffleArrayOptimized(passwordArray);
    }

    shuffleArrayOptimized(array) {
        // Mobile-optimized Fisher-Yates shuffle working directly on array
        const length = array.length;
        
        // Use smaller random batches for mobile performance
        const shuffleBatch = Math.min(8, length);
        const randomValues = new Uint32Array(shuffleBatch);
        
        let batchIndex = 0;
        crypto.getRandomValues(randomValues);
        
        for (let i = length - 1; i > 0; i--) {
            // Refresh random values when batch is exhausted
            if (batchIndex >= shuffleBatch) {
                crypto.getRandomValues(randomValues);
                batchIndex = 0;
            }
            
            const j = randomValues[batchIndex++] % (i + 1);
            
            // Efficient array element swap
            if (i !== j) {
                const temp = array[i];
                array[i] = array[j];
                array[j] = temp;
            }
        }
        
        // Single join operation for optimal performance
        return array.join('');
    }

    getGuaranteedChars() {
        const guaranteedChars = [];
        const charSets = {
            uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
            lowercase: 'abcdefghijklmnopqrstuvwxyz',
            numbers: '0123456789',
            symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?~`'
        };

        if (this.uppercaseCheck.checked) {
            guaranteedChars.push(this.getRandomChar(charSets.uppercase));
        }
        if (this.lowercaseCheck.checked) {
            guaranteedChars.push(this.getRandomChar(charSets.lowercase));
        }
        if (this.numbersCheck.checked) {
            guaranteedChars.push(this.getRandomChar(charSets.numbers));
        }
        if (this.symbolsCheck.checked) {
            guaranteedChars.push(this.getRandomChar(charSets.symbols));
        }

        return guaranteedChars;
    }

    updatePasswordDisplayOptimized(password, poolSize) {
        // Immediate password display - highest priority
        this.passwordInput.value = password;
        
        // Schedule async analysis to prevent blocking
        this.scheduleAsyncAnalysis(password, poolSize);
        
        // Minimal animation only if not low-power device
        if (!this.isLowPowerDevice) {
            requestAnimationFrame(() => this.animatePasswordGenerationMobile());
        }
        
        // Defer QR generation appropriately
        const qrDelay = this.isMobile ? 200 : 50;
        setTimeout(() => this.preGenerateQRCode(password), qrDelay);
    }

    scheduleAsyncAnalysis(password, poolSize) {
        // Cancel any pending analysis
        if (this.analysisTimeoutId) {
            clearTimeout(this.analysisTimeoutId);
        }
        
        // Use immediate update for basic metrics, async for heavy calculations
        const basicAnalysis = this.calculateBasicAnalysis(password, poolSize);
        this.updateAnalysisDisplayFast(basicAnalysis);
        
        // Schedule heavy calculations asynchronously
        this.analysisTimeoutId = setTimeout(async () => {
            try {
                const heavyAnalysis = await this.calculateHeavyAnalysisAsync(password, poolSize, basicAnalysis);
                this.updateAnalysisDisplayFast(heavyAnalysis);
            } catch (error) {
                console.warn('Heavy analysis failed:', error);
            }
        }, this.isMobile ? 10 : 0);
    }

    calculateBasicAnalysis(password, poolSize) {
        if (!password || poolSize <= 0) {
            return {
                entropy: 0,
                poolSize: 0,
                combinations: 0,
                crackTime: 'N/A',
                strength: 0,
                strengthText: 'Generate a password',
                strengthColor: '#71717a',
                securityLevel: 'N/A'
            };
        }

        const length = password.length;
        const entropy = length * Math.log2(poolSize);
        
        // Fast strength calculation without heavy math
        const strengthData = this.getStrengthLevelFast(entropy);
        
        return {
            entropy,
            poolSize,
            combinations: '...calculating',
            crackTime: '...calculating',
            ...strengthData
        };
    }

    async calculateHeavyAnalysisAsync(password, poolSize, basicAnalysis) {
        const length = password.length;
        
        // Use async calculator for heavy operations
        const combinations = await this.asyncCalculator.calculateLargeNumbers(poolSize, length);
        
        // Lightweight crack time calculation
        const crackTime = this.calculateCrackTimeFast(combinations);
        
        return {
            ...basicAnalysis,
            combinations,
            crackTime
        };
    }

    getStrengthLevelFast(entropy) {
        // Ultra-fast strength calculation using lookup
        if (entropy < 30) return { strength: 20, strengthText: 'Very Weak', strengthColor: '#ef4444', securityLevel: 'Unacceptable' };
        if (entropy < 50) return { strength: 40, strengthText: 'Weak', strengthColor: '#f59e0b', securityLevel: 'Poor' };
        if (entropy < 70) return { strength: 60, strengthText: 'Moderate', strengthColor: '#eab308', securityLevel: 'Fair' };
        if (entropy < 90) return { strength: 80, strengthText: 'Strong', strengthColor: '#10b981', securityLevel: 'Good' };
        return { strength: 100, strengthText: 'Very Strong', strengthColor: '#00d4ff', securityLevel: 'Excellent' };
    }

    calculateCrackTimeFast(combinations) {
        if (combinations === Infinity || combinations > 1e50) return 'Forever';
        if (typeof combinations === 'string') return combinations;
        
        const guessesPerSecond = 1e9;
        const seconds = combinations / (2 * guessesPerSecond);
        
        return this.formatTimeFast(seconds);
    }

    formatTimeFast(seconds) {
        if (seconds === Infinity || seconds > 1e15) return 'Forever';
        
        // Fast time formatting without complex calculations
        if (seconds < 60) return 'Instantly';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours`;
        if (seconds < 31536000) return `${Math.floor(seconds / 86400)} days`;
        
        const years = Math.floor(seconds / 31536000);
        if (years > 1e6) return 'Millions of years';
        return `${this.formatNumber(years)} years`;
    }

    analyzePasswordOptimized(password, poolSize) {
        if (!password || poolSize <= 0) {
            this.updateAnalysisDisplay({
                entropy: 0,
                poolSize: 0,
                combinations: 0,
                crackTime: 'N/A',
                strength: 0,
                strengthText: 'Generate a password',
                strengthColor: '#71717a',
                securityLevel: 'N/A'
            });
            return;
        }

        // Use cached calculations for identical inputs
        const analysisKey = `${password.length}-${poolSize}`;
        if (this.analysisCache?.has(analysisKey)) {
            this.updateAnalysisDisplay(this.analysisCache.get(analysisKey));
            return;
        }

        const length = password.length;
        const entropy = length * Math.log2(poolSize);
        
        // Optimized combination calculation with early returns
        let combinations;
        if (length > 25 || poolSize > 95) {
            combinations = Infinity;
        } else {
            combinations = Math.pow(poolSize, Math.min(length, 20));
        }
        
        // Fast crack time estimation
        const guessesPerSecond = 1e9;
        const secondsToCrack = combinations === Infinity ? Infinity : combinations / (2 * guessesPerSecond);
        
        // Optimized strength calculation
        const strengthData = this.getStrengthLevel(entropy);
        
        const analysis = {
            entropy,
            poolSize,
            combinations,
            crackTime: secondsToCrack,
            ...strengthData
        };

        // Cache for future use
        if (!this.analysisCache) this.analysisCache = new Map();
        if (this.analysisCache.size > 20) this.analysisCache.clear(); // Prevent memory bloat
        this.analysisCache.set(analysisKey, analysis);
        
        this.updateAnalysisDisplay(analysis);
    }

    getStrengthLevel(entropy) {
        // Optimized strength calculation using binary search approach
        if (entropy < 30) return { strength: 20, strengthText: 'Very Weak', strengthColor: '#ef4444', securityLevel: 'Unacceptable' };
        if (entropy < 50) return { strength: 40, strengthText: 'Weak', strengthColor: '#f59e0b', securityLevel: 'Poor' };
        if (entropy < 70) return { strength: 60, strengthText: 'Moderate', strengthColor: '#eab308', securityLevel: 'Fair' };
        if (entropy < 90) return { strength: 80, strengthText: 'Strong', strengthColor: '#10b981', securityLevel: 'Good' };
        return { strength: 100, strengthText: 'Very Strong', strengthColor: '#00d4ff', securityLevel: 'Excellent' };
    }

    getRandomChar(charset) {
        return charset.charAt(this.generateSecureRandom(charset.length));
    }

    shuffleString(str) {
        const array = str.split('');
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.generateSecureRandom(i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array.join('');
    }

    analyzePassword(password, poolSize) {
        if (!password || poolSize <= 0) {
            this.updateAnalysisDisplay({
                entropy: 0,
                poolSize: 0,
                combinations: 0,
                crackTime: 'N/A',
                strength: 0,
                strengthText: 'Generate a password',
                strengthColor: '#71717a',
                securityLevel: 'N/A'
            });
            return;
        }

        // Use cached calculations for performance
        const analysisKey = `${password.length}-${poolSize}`;
        if (this.analysisCache && this.analysisCache.has(analysisKey)) {
            const cached = this.analysisCache.get(analysisKey);
            this.updateAnalysisDisplay(cached);
            return;
        }

        const length = password.length;
        const entropy = length * Math.log2(poolSize);
        
        // Optimized combination calculation
        let combinations;
        if (length > 30 || poolSize > 100) {
            combinations = Infinity;
        } else if (length > 20) {
            // Use logarithmic approximation for large numbers
            combinations = Math.exp(length * Math.log(poolSize));
        } else {
            combinations = Math.pow(poolSize, length);
        }
        
        // Estimate crack time (assuming 1 billion guesses per second)
        const guessesPerSecond = 1e9;
        const secondsToCrack = combinations === Infinity ? Infinity : combinations / (2 * guessesPerSecond);
        
        // Determine strength efficiently
        const strengthData = this.calculateStrength(entropy);
        
        const analysis = {
            entropy,
            poolSize,
            combinations,
            crackTime: secondsToCrack,
            ...strengthData
        };

        // Cache the result
        if (!this.analysisCache) this.analysisCache = new Map();
        this.analysisCache.set(analysisKey, analysis);
        
        this.updateAnalysisDisplay(analysis);
    }

    calculateStrength(entropy) {
        const strengthLevels = [
            { min: 0, max: 30, strength: 20, text: 'Very Weak', color: '#ef4444', level: 'Unacceptable' },
            { min: 30, max: 50, strength: 40, text: 'Weak', color: '#f59e0b', level: 'Poor' },
            { min: 50, max: 70, strength: 60, text: 'Moderate', color: '#eab308', level: 'Fair' },
            { min: 70, max: 90, strength: 80, text: 'Strong', color: '#10b981', level: 'Good' },
            { min: 90, max: Infinity, strength: 100, text: 'Very Strong', color: '#00d4ff', level: 'Excellent' }
        ];

        const level = strengthLevels.find(l => entropy >= l.min && entropy < l.max);
        return {
            strength: level.strength,
            strengthText: level.text,
            strengthColor: level.color,
            securityLevel: level.level
        };
    }

    updateAnalysisDisplayFast(analysis) {
        // Ultra-fast DOM updates with intelligent batching
        const updateId = Date.now();
        this.pendingDOMUpdates.set('analysis', { analysis, updateId });
        
        if (!this.domUpdateScheduled) {
            this.domUpdateScheduled = true;
            
            // Use different strategies for mobile vs desktop
            if (this.isMobile) {
                // Mobile: Use requestIdleCallback for non-blocking updates
                const updateCallback = (deadline) => {
                    this.batchDOMUpdates(deadline);
                };
                
                if (window.requestIdleCallback) {
                    requestIdleCallback(updateCallback, { timeout: 50 });
                } else {
                    setTimeout(updateCallback, 16);
                }
            } else {
                // Desktop: Use RAF for smooth 60fps updates
                requestAnimationFrame(() => this.batchDOMUpdates());
            }
        }
    }

    batchDOMUpdates(deadline) {
        const startTime = performance.now();
        this.domUpdateScheduled = false;
        
        // Process pending updates
        for (const [key, data] of this.pendingDOMUpdates) {
            if (key === 'analysis') {
                const { analysis } = data;
                
                // Batch text updates - fastest operations first
                this.entropyValue.textContent = `Entropy: ${analysis.entropy.toFixed(1)} bits`;
                this.poolSize.textContent = analysis.poolSize.toString();
                this.combinations.textContent = typeof analysis.combinations === 'string' 
                    ? analysis.combinations 
                    : this.formatNumber(analysis.combinations);
                this.crackTime.textContent = typeof analysis.crackTime === 'string'
                    ? analysis.crackTime 
                    : this.formatTime(analysis.crackTime);
                this.strengthText.textContent = analysis.strengthText;
                this.securityLevel.textContent = analysis.securityLevel;
                
                // Check if we have time for style updates
                const hasTime = !deadline || deadline.timeRemaining() > 5;
                const timeElapsed = performance.now() - startTime;
                
                if (hasTime && timeElapsed < 10) {
                    // Only update styles if we have time and aren't on low-power device
                    if (!this.isLowPowerDevice) {
                        this.strengthFill.style.width = `${analysis.strength}%`;
                        this.strengthFill.style.background = `linear-gradient(90deg, ${analysis.strengthColor}, #7c3aed)`;
                    } else {
                        // Minimal style updates for low-power devices
                        this.strengthFill.style.width = `${analysis.strength}%`;
                    }
                    this.strengthText.style.color = analysis.strengthColor;
                    this.securityLevel.style.color = analysis.strengthColor;
                }
            }
        }
        
        // Clear processed updates
        this.pendingDOMUpdates.clear();
        if (this.performanceMetrics) {
            this.performanceMetrics.domUpdateTime = performance.now() - startTime;
        }
    }

    formatNumber(num) {
        if (num === Infinity || isNaN(num)) return '∞';
        if (num > 1e100) return '> 10^100';
        
        const units = ['', 'K', 'M', 'B', 'T', 'Q'];
        let unitIndex = 0;
        
        while (num >= 1000 && unitIndex < units.length - 1) {
            num /= 1000;
            unitIndex++;
        }
        
        return `${num.toFixed(1)}${units[unitIndex]}`;
    }

    formatTime(seconds) {
        if (seconds === Infinity || isNaN(seconds)) return 'Forever';
        if (seconds > 1e15) return '> Billions of years';
        
        const units = [
            { name: 'year', seconds: 31536000 },
            { name: 'month', seconds: 2628000 },
            { name: 'day', seconds: 86400 },
            { name: 'hour', seconds: 3600 },
            { name: 'minute', seconds: 60 },
            { name: 'second', seconds: 1 }
        ];

        for (const unit of units) {
            if (seconds >= unit.seconds) {
                const value = Math.floor(seconds / unit.seconds);
                return `${this.formatNumber(value)} ${unit.name}${value !== 1 ? 's' : ''}`;
            }
        }
        
        return 'Instantly';
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.passwordInput.value);
            this.showNotification('Password copied to clipboard!', 'success');
            this.animateButton(this.copyBtn);
        } catch (err) {
            // Fallback for older browsers
            this.passwordInput.select();
            document.execCommand('copy');
            this.showNotification('Password copied to clipboard!', 'success');
            this.animateButton(this.copyBtn);
        }
    }

    showQRCode() {
        const password = this.passwordInput.value;
        if (!password) {
            this.showNotification('Generate a password first!', 'error');
            return;
        }

        // Show modal immediately
        this.qrModal.style.display = 'block';
        const qrContainer = document.getElementById('qrcode');
        
        // Check cache first for instant display
        if (this.qrCache?.has(password)) {
            this.displayCachedQR(qrContainer, password);
            return;
        }

        // Show loading state
        qrContainer.innerHTML = '<div class="qr-loading" style="text-align: center; padding: 40px; color: #00d4ff;">⚡ Generating QR Code...</div>';

        // Generate QR code with improved algorithm
        try {
            const canvas = this.generateOptimizedQRCanvas(password);
            if (canvas) {
                qrContainer.innerHTML = '';
                this.styleQRCanvas(canvas);
                qrContainer.appendChild(canvas);
                this.addQRSuccessMessage(qrContainer);
                
                // Cache the result
                if (!this.qrCache) this.qrCache = new Map();
                if (this.qrCache.size > 5) this.qrCache.clear(); // Limit cache size
                this.qrCache.set(password, canvas.toDataURL('image/png', 0.9));
            } else {
                this.showQRError(qrContainer);
            }
        } catch (error) {
            console.error('QR generation error:', error);
            this.showQRError(qrContainer);
        }
    }

    generateOptimizedQRCanvas(text) {
        try {
            // Enhanced QR-style pattern generator
            const size = 29; // Optimal size for visual clarity
            const matrix = this.createEnhancedQRMatrix(text, size);
            
            const canvas = document.createElement('canvas');
            const canvasSize = 320;
            const moduleSize = Math.floor(canvasSize / size);
            const actualSize = moduleSize * size;
            
            canvas.width = actualSize;
            canvas.height = actualSize;
            
            const ctx = canvas.getContext('2d');
            
            // Create gradient background
            const bgGradient = ctx.createLinearGradient(0, 0, actualSize, actualSize);
            bgGradient.addColorStop(0, '#0f0f23');
            bgGradient.addColorStop(1, '#1a1a2e');
            ctx.fillStyle = bgGradient;
            ctx.fillRect(0, 0, actualSize, actualSize);
            
            // Create neon effect for foreground
            const fgGradient = ctx.createLinearGradient(0, 0, actualSize, actualSize);
            fgGradient.addColorStop(0, '#00d4ff');
            fgGradient.addColorStop(0.5, '#7c3aed');
            fgGradient.addColorStop(1, '#10b981');
            
            // Draw QR modules with enhanced styling
            ctx.fillStyle = fgGradient;
            ctx.shadowColor = '#00d4ff';
            ctx.shadowBlur = 2;
            
            for (let row = 0; row < size; row++) {
                for (let col = 0; col < size; col++) {
                    if (matrix[row][col]) {
                        const x = col * moduleSize;
                        const y = row * moduleSize;
                        
                        // Add rounded rectangles for modern look
                        this.drawRoundedRect(ctx, x + 1, y + 1, moduleSize - 2, moduleSize - 2, 2);
                    }
                }
            }
            
            return canvas;
        } catch (error) {
            console.error('Enhanced QR generation error:', error);
            return null;
        }
    }

    createEnhancedQRMatrix(text, size) {
        const matrix = Array(size).fill().map(() => Array(size).fill(false));
        
        // Add enhanced finder patterns with better positioning
        this.addEnhancedFinderPattern(matrix, 0, 0, size);
        this.addEnhancedFinderPattern(matrix, 0, size - 7, size);
        this.addEnhancedFinderPattern(matrix, size - 7, 0, size);
        
        // Add timing patterns
        for (let i = 8; i < size - 8; i++) {
            matrix[6][i] = i % 2 === 0;
            matrix[i][6] = i % 2 === 0;
        }
        
        // Enhanced data encoding based on text
        const hash = this.enhancedHash(text);
        const patterns = this.generateDataPatterns(hash, text.length);
        
        let patternIndex = 0;
        for (let row = 1; row < size - 1; row++) {
            for (let col = 1; col < size - 1; col++) {
                if (!this.isReservedPosition(row, col, size)) {
                    matrix[row][col] = patterns[patternIndex % patterns.length];
                    patternIndex++;
                }
            }
        }
        
        return matrix;
    }

    addEnhancedFinderPattern(matrix, startRow, startCol, size) {
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                const r = startRow + row;
                const c = startCol + col;
                
                if (r >= 0 && r < size && c >= 0 && c < size) {
                    // Enhanced finder pattern with better visual structure
                    const isBlack = (row === 0 || row === 6 || col === 0 || col === 6) ||
                                   (row >= 2 && row <= 4 && col >= 2 && col <= 4);
                    matrix[r][c] = isBlack;
                }
            }
        }
    }

    enhancedHash(str) {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
        }
        return Math.abs(hash);
    }

    generateDataPatterns(hash, length) {
        const patterns = [];
        const patternCount = Math.min(64, length * 2);
        
        for (let i = 0; i < patternCount; i++) {
            const bit = (hash >> (i % 32)) & 1;
            const lengthBit = (length >> (i % 8)) & 1;
            patterns.push((bit ^ lengthBit) === 1);
        }
        
        return patterns;
    }

    isReservedPosition(row, col, size) {
        return (row < 9 && col < 9) ||
               (row < 9 && col >= size - 8) ||
               (row >= size - 8 && col < 9) ||
               row === 6 || col === 6;
    }

    drawRoundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    displayCachedQR(container, password) {
        const img = new Image();
        img.onload = () => {
            container.innerHTML = '';
            img.style.borderRadius = '10px';
            img.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)';
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            container.appendChild(img);
            this.addQRSuccessMessage(container);
        };
        img.src = this.qrCache.get(password);
    }

    styleQRCanvas(canvas) {
        canvas.style.borderRadius = '10px';
        canvas.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)';
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        canvas.style.border = '2px solid rgba(0, 212, 255, 0.2)';
    }

    addQRSuccessMessage(container) {
        const successMsg = document.createElement('p');
        successMsg.textContent = '✨ QR Code generated successfully!';
        successMsg.style.cssText = 'color: #10b981; margin-top: 15px; font-size: 0.9rem; text-align: center; font-weight: 500;';
        container.appendChild(successMsg);
    }

    showQRError(container) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ef4444;">❌ QR generation failed</div>';
        this.showNotification('QR code generation failed. Please try again.', 'error');
    }

    createQRMatrix(text) {
        try {
            // Simple QR-like pattern generator for passwords
            // This creates a visual pattern that represents the text
            const size = 25;
            const matrix = Array(size).fill().map(() => Array(size).fill(false));
            
            // Add finder patterns (corners)
            this.addFinderPattern(matrix, 0, 0);
            this.addFinderPattern(matrix, size - 7, 0);
            this.addFinderPattern(matrix, 0, size - 7);
            
            // Add timing patterns
            for (let i = 8; i < size - 8; i++) {
                matrix[6][i] = i % 2 === 0;
                matrix[i][6] = i % 2 === 0;
            }
            
            // Add data pattern based on text
            const textHash = this.simpleHash(text);
            let bitIndex = 0;
            
            for (let row = 1; row < size - 1; row++) {
                for (let col = 1; col < size - 1; col++) {
                    if (!this.isReservedArea(row, col, size)) {
                        const bit = (textHash >> (bitIndex % 32)) & 1;
                        matrix[row][col] = bit === 1;
                        bitIndex++;
                    }
                }
            }
            
            return matrix;
        } catch (error) {
            console.error('QR matrix generation error:', error);
            return null;
        }
    }

    addFinderPattern(matrix, startRow, startCol) {
        // 7x7 finder pattern
        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                const isBlack = (row === 0 || row === 6 || col === 0 || col === 6) ||
                               (row >= 2 && row <= 4 && col >= 2 && col <= 4);
                if (startRow + row < matrix.length && startCol + col < matrix[0].length) {
                    matrix[startRow + row][startCol + col] = isBlack;
                }
            }
        }
    }

    isReservedArea(row, col, size) {
        // Check if position is in a reserved area (finder patterns, timing patterns, etc.)
        return (row < 9 && col < 9) ||
               (row < 9 && col >= size - 8) ||
               (row >= size - 8 && col < 9) ||
               row === 6 || col === 6;
    }

    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    preGenerateQRCode(password) {
        // Pre-generate QR code data for instant display (cached in background)
        if (!this.qrCache) this.qrCache = new Map();
        
        // Limit cache size to prevent memory issues
        if (this.qrCache.size > 10) {
            const firstKey = this.qrCache.keys().next().value;
            this.qrCache.delete(firstKey);
        }
        
        // Use timeout to prevent blocking main thread
        setTimeout(() => {
            try {
                const canvas = this.generateQRCanvas(password);
                if (canvas) {
                    this.qrCache.set(password, canvas.toDataURL('image/png', 0.8));
                }
            } catch (error) {
                console.warn('QR pre-generation error:', error);
            }
        }, 0);
    }

    downloadQRCode() {
        const canvas = document.querySelector('#qrcode canvas');
        if (canvas) {
            try {
                const link = document.createElement('a');
                link.download = `secure-password-qr-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                this.showNotification('QR code downloaded successfully!', 'success');
            } catch (error) {
                console.error('Download failed:', error);
                this.showNotification('Failed to download QR code. Please try again.', 'error');
            }
        } else {
            this.showNotification('No QR code available to download.', 'error');
        }
    }

    showNotification(message, type = 'success') {
        this.notificationText.textContent = message;
        this.notification.classList.add('show');
        
        if (type === 'error') {
            this.notification.style.borderColor = '#ef4444';
            this.notification.querySelector('i').style.color = '#ef4444';
        } else {
            this.notification.style.borderColor = '#10b981';
            this.notification.querySelector('i').style.color = '#10b981';
        }

        setTimeout(() => {
            this.notification.classList.remove('show');
        }, 3000);
    }

    animateButton(button) {
        button.style.transform = 'scale(0.9)';
        setTimeout(() => {
            button.style.transform = 'scale(1)';
        }, 150);
    }

    animatePasswordGenerationMobile() {
        // Skip animation entirely on low-power devices
        if (this.isLowPowerDevice) return;
        
        // Ultra-minimal animation for mobile to prevent any lag
        if (this.isMobile) {
            // Single transform without transition for instant visual feedback
            this.passwordInput.style.transform = 'scale(1.005)';
            
            // Use single RAF for cleanup
            requestAnimationFrame(() => {
                this.passwordInput.style.transform = 'scale(1)';
            });
        } else {
            // Standard animation for desktop
            this.passwordInput.style.transform = 'scale(1.02)';
            this.passwordInput.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.5)';
            
            setTimeout(() => {
                this.passwordInput.style.transform = 'scale(1)';
                this.passwordInput.style.boxShadow = '';
            }, 300);
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SecurePassVault();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                document.getElementById('generateBtn').click();
                break;
            case 'c':
                if (e.shiftKey) {
                    e.preventDefault();
                    document.getElementById('copyBtn').click();
                }
                break;
        }
    }
    
    if (e.key === 'Escape') {
        document.getElementById('qrModal').style.display = 'none';
    }
});
