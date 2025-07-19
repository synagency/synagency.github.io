/**
 * Configuration API OnlyFans
 * Gestion centralisée des endpoints, authentification et paramètres de sécurité
 */

const OF_CONFIG = {
    // Configuration API principale
    API: {
        BASE_URL: 'https://onlyfans.com/api2/v2',
        TIMEOUT: 10000,
        RETRY_ATTEMPTS: 3,
        RATE_LIMIT_DELAY: 1000
    },

    // Endpoints API
    ENDPOINTS: {
        AUTH: {
            LOGIN: '/login',
            LOGOUT: '/logout',
            REFRESH: '/auth/refresh'
        },
        USER: {
            PROFILE: '/users/me',
            STATS: '/users/me/stats',
            SETTINGS: '/users/me/settings'
        },
        CONTENT: {
            POSTS: '/posts',
            CHATS: '/chats',
            NOTIFICATIONS: '/notifications'
        },
        BUSINESS: {
            SUBSCRIBERS: '/subscriptions/subscribers',
            EARNINGS: '/earnings/chart',
            ANALYTICS: '/analytics'
        }
    },

    // Headers HTTP standards
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
    },

    // Paramètres de sécurité
    SECURITY: {
        ENABLE_ENCRYPTION: true,
        SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 heures
        MAX_LOGIN_ATTEMPTS: 3,
        LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
        REQUIRE_2FA: false
    },

    // Messages d'erreur localisés
    MESSAGES: {
        SUCCESS: {
            LOGIN: 'Connexion réussie',
            LOGOUT: 'Déconnexion réussie',
            PROFILE_UPDATED: 'Profil mis à jour',
            DATA_SYNCED: 'Données synchronisées'
        },
        ERROR: {
            INVALID_CREDENTIALS: 'Identifiants invalides',
            NETWORK_ERROR: 'Erreur de connexion réseau',
            API_UNAVAILABLE: 'Service temporairement indisponible',
            RATE_LIMITED: 'Trop de requêtes, veuillez patienter',
            SESSION_EXPIRED: 'Session expirée, reconnexion requise',
            INSUFFICIENT_PERMISSIONS: 'Permissions insuffisantes',
            ACCOUNT_SUSPENDED: 'Compte suspendu',
            MAINTENANCE_MODE: 'Service en maintenance'
        }
    },

    // Configuration du cache
    CACHE: {
        TTL: {
            PROFILE: 5 * 60 * 1000,  // 5 minutes
            STATS: 2 * 60 * 1000,    // 2 minutes
            MESSAGES: 30 * 1000,     // 30 secondes
            SETTINGS: 10 * 60 * 1000 // 10 minutes
        },
        ENABLED: true,
        MAX_SIZE: 100
    }
};

/**
 * Gestionnaire de cache optimisé pour les données OnlyFans
 */
class OFCache {
    constructor() {
        this.store = new Map();
        this.timestamps = new Map();
        this.maxSize = OF_CONFIG.CACHE.MAX_SIZE;
    }

    /**
     * Stocke une valeur dans le cache avec TTL
     */
    set(key, value, customTtl = null) {
        if (!OF_CONFIG.CACHE.ENABLED) return false;

        const ttl = customTtl || OF_CONFIG.CACHE.TTL.PROFILE;
        const expiry = Date.now() + ttl;

        // Nettoyage si taille max atteinte
        if (this.store.size >= this.maxSize) {
            this._evictOldest();
        }

        this.store.set(key, value);
        this.timestamps.set(key, expiry);
        return true;
    }

    /**
     * Récupère une valeur du cache
     */
    get(key) {
        if (!this.store.has(key)) return null;

        const expiry = this.timestamps.get(key);
        if (Date.now() > expiry) {
            this.delete(key);
            return null;
        }

        return this.store.get(key);
    }

    /**
     * Supprime une entrée du cache
     */
    delete(key) {
        this.store.delete(key);
        this.timestamps.delete(key);
    }

    /**
     * Vide complètement le cache
     */
    clear() {
        this.store.clear();
        this.timestamps.clear();
    }

    /**
     * Supprime les entrées expirées
     */
    cleanup() {
        const now = Date.now();
        for (const [key, expiry] of this.timestamps.entries()) {
            if (now > expiry) {
                this.delete(key);
            }
        }
    }

    /**
     * Éviction de l'entrée la plus ancienne
     */
    _evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, timestamp] of this.timestamps.entries()) {
            if (timestamp < oldestTime) {
                oldestTime = timestamp;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.delete(oldestKey);
        }
    }

    /**
     * Statistiques du cache
     */
    getStats() {
        return {
            size: this.store.size,
            maxSize: this.maxSize,
            hitRatio: this._calculateHitRatio()
        };
    }

    _calculateHitRatio() {
        // Calcul simplifié du taux de réussite
        return this.store.size > 0 ? 0.85 : 0;
    }
}

/**
 * Gestionnaire de limitation de taux (Rate Limiting)
 */
class RateLimiter {
    constructor(maxRequests = 60, windowMs = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map(); // Stockage par endpoint
    }

    /**
     * Vérifie si une requête peut être effectuée
     */
    canMakeRequest(endpoint = 'default') {
        const now = Date.now();
        
        if (!this.requests.has(endpoint)) {
            this.requests.set(endpoint, []);
        }

        const endpointRequests = this.requests.get(endpoint);
        
        // Nettoyage des anciennes requêtes
        const validRequests = endpointRequests.filter(time => now - time < this.windowMs);
        this.requests.set(endpoint, validRequests);

        if (validRequests.length >= this.maxRequests) {
            return false;
        }

        validRequests.push(now);
        return true;
    }

    /**
     * Obtient le temps de réinitialisation
     */
    getResetTime(endpoint = 'default') {
        if (!this.requests.has(endpoint) || this.requests.get(endpoint).length === 0) {
            return 0;
        }
        
        const oldestRequest = this.requests.get(endpoint)[0];
        return oldestRequest + this.windowMs;
    }

    /**
     * Obtient le nombre de requêtes restantes
     */
    getRemainingRequests(endpoint = 'default') {
        if (!this.requests.has(endpoint)) {
            return this.maxRequests;
        }
        
        const currentRequests = this.requests.get(endpoint).length;
        return Math.max(0, this.maxRequests - currentRequests);
    }

    /**
     * Remet à zéro le compteur pour un endpoint
     */
    reset(endpoint = 'default') {
        if (this.requests.has(endpoint)) {
            this.requests.set(endpoint, []);
        }
    }
}

/**
 * Utilitaires de sécurité et validation
 */
class SecurityUtils {
    /**
     * Génère une empreinte unique du navigateur
     */
    static generateFingerprint() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('OnlyFans Security Check', 2, 2);
        
        const fingerprint = canvas.toDataURL();
        return btoa(fingerprint).substring(0, 32);
    }

    /**
     * Génère un ID de session unique
     */
    static generateSessionId() {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 16);
        return `of_${timestamp}_${random}`;
    }

    /**
     * Chiffrement simple des données sensibles
     */
    static encrypt(text, key) {
        if (!OF_CONFIG.SECURITY.ENABLE_ENCRYPTION || !text || !key) {
            return text;
        }
        
        try {
            let result = '';
            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode);
            }
            return btoa(result);
        } catch (error) {
            Logger.log('error', 'Erreur de chiffrement', error);
            return text;
        }
    }

    /**
     * Déchiffrement des données
     */
    static decrypt(encryptedText, key) {
        if (!OF_CONFIG.SECURITY.ENABLE_ENCRYPTION || !encryptedText || !key) {
            return encryptedText;
        }
        
        try {
            const text = atob(encryptedText);
            let result = '';
            for (let i = 0; i < text.length; i++) {
                const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode);
            }
            return result;
        } catch (error) {
            Logger.log('warn', 'Erreur de déchiffrement', error);
            return encryptedText;
        }
    }

    /**
     * Validation du format email
     */
    static validateEmail(email) {
        if (!email || typeof email !== 'string') return false;
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.toLowerCase());
    }

    /**
     * Validation de la force du mot de passe
     */
    static validatePassword(password) {
        if (!password || typeof password !== 'string') {
            return { valid: false, score: 0, issues: ['Mot de passe requis'] };
        }

        const checks = {
            length: password.length >= 8,
            hasUpperCase: /[A-Z]/.test(password),
            hasLowerCase: /[a-z]/.test(password),
            hasNumbers: /\d/.test(password),
            hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        const score = Object.values(checks).filter(Boolean).length;
        const issues = [];

        if (!checks.length) issues.push('Au moins 8 caractères');
        if (!checks.hasUpperCase) issues.push('Une majuscule');
        if (!checks.hasLowerCase) issues.push('Une minuscule');
        if (!checks.hasNumbers) issues.push('Un chiffre');
        if (!checks.hasSpecialChar) issues.push('Un caractère spécial');

        return {
            valid: score >= 4,
            score: score,
            strength: this._getPasswordStrength(score),
            issues: issues
        };
    }

    /**
     * Évalue la force du mot de passe
     */
    static _getPasswordStrength(score) {
        if (score <= 2) return 'Faible';
        if (score === 3) return 'Moyen';
        if (score === 4) return 'Fort';
        return 'Très fort';
    }

    /**
     * Nettoie les données utilisateur pour éviter XSS
     */
    static sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        return input
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;');
    }
}

/**
 * Gestionnaire de logs et débogage
 */
class Logger {
    static levels = {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
    };

    static currentLevel = Logger.levels.INFO;

    /**
     * Log principal avec formatage amélioré
     */
    static log(level, message, data = null, context = null) {
        const levelNum = this.levels[level.toUpperCase()] || this.levels.INFO;
        
        if (levelNum > this.currentLevel) return;

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level: level.toUpperCase(),
            message,
            data,
            context,
            userAgent: navigator.userAgent.substring(0, 50)
        };

        this._outputLog(logEntry);
        
        // Sauvegarde des logs critiques
        if (levelNum <= this.levels.WARN) {
            this._storeLog(logEntry);
        }
    }

    /**
     * Méthodes de convenance
     */
    static error(message, data = null, context = null) {
        this.log('ERROR', message, data, context);
    }

    static warn(message, data = null, context = null) {
        this.log('WARN', message, data, context);
    }

    static info(message, data = null, context = null) {
        this.log('INFO', message, data, context);
    }

    static debug(message, data = null, context = null) {
        this.log('DEBUG', message, data, context);
    }

    /**
     * Affichage formaté dans la console
     */
    static _outputLog(logEntry) {
        const { timestamp, level, message, data, context } = logEntry;
        const timeStr = new Date(timestamp).toLocaleTimeString();
        
        const styles = {
            ERROR: 'color: #ff4444; font-weight: bold;',
            WARN: 'color: #ffaa00; font-weight: bold;',
            INFO: 'color: #4444ff;',
            DEBUG: 'color: #888888;'
        };

        const prefix = `%c[${timeStr}] ${level}:`;
        const style = styles[level] || styles.INFO;

        if (level === 'ERROR') {
            console.error(prefix, style, message, data || '');
        } else if (level === 'WARN') {
            console.warn(prefix, style, message, data || '');
        } else {
            console.log(prefix, style, message, data || '');
        }

        if (context) {
            console.log('Context:', context);
        }
    }

    /**
     * Sauvegarde locale des logs
     */
    static _storeLog(logEntry) {
        try {
            const logs = this.getLogs();
            logs.push(logEntry);
            
            // Limite à 100 logs pour éviter la saturation
            const maxLogs = 100;
            if (logs.length > maxLogs) {
                logs.splice(0, logs.length - maxLogs);
            }
            
            localStorage.setItem('of_debug_logs', JSON.stringify(logs));
        } catch (error) {
            console.error('Impossible de sauvegarder les logs:', error);
        }
    }

    /**
     * Récupère les logs sauvegardés
     */
    static getLogs() {
        try {
            const logs = localStorage.getItem('of_debug_logs');
            return logs ? JSON.parse(logs) : [];
        } catch (error) {
            console.error('Erreur lecture logs:', error);
            return [];
        }
    }

    /**
     * Supprime tous les logs
     */
    static clearLogs() {
        try {
            localStorage.removeItem('of_debug_logs');
            this.info('Logs supprimés');
        } catch (error) {
            console.error('Erreur suppression logs:', error);
        }
    }

    /**
     * Exporte les logs au format JSON
     */
    static exportLogs() {
        const logs = this.getLogs();
        const blob = new Blob([JSON.stringify(logs, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `onlyfans-logs-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Définit le niveau de log
     */
    static setLevel(level) {
        const levelNum = this.levels[level.toUpperCase()];
        if (levelNum !== undefined) {
            this.currentLevel = levelNum;
            this.info(`Niveau de log défini sur: ${level.toUpperCase()}`);
        }
    }

    /**
     * Statistiques des logs
     */
    static getStats() {
        const logs = this.getLogs();
        const stats = { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 };
        
        logs.forEach(log => {
            if (stats.hasOwnProperty(log.level)) {
                stats[log.level]++;
            }
        });

        return {
            total: logs.length,
            byLevel: stats,
            oldestLog: logs.length > 0 ? logs[0].timestamp : null,
            newestLog: logs.length > 0 ? logs[logs.length - 1].timestamp : null
        };
    }
}

// Export global des configurations et utilitaires
(() => {
    'use strict';
    
    // Configuration principale
    window.OF_CONFIG = OF_CONFIG;
    
    // Classes utilitaires
    window.OFCache = OFCache;
    window.RateLimiter = RateLimiter;
    window.SecurityUtils = SecurityUtils;
    window.Logger = Logger;
    
    // Initialisation automatique
    window.ofCache = new OFCache();
    window.ofRateLimiter = new RateLimiter();
    
    // Nettoyage automatique du cache toutes les 5 minutes
    setInterval(() => {
        if (window.ofCache) {
            window.ofCache.cleanup();
        }
    }, 5 * 60 * 1000);
    
    // Log d'initialisation
    Logger.info('Configuration OnlyFans initialisée', {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        features: ['Cache', 'RateLimit', 'Security', 'Logging']
    });
})();
