/**
 * OnlyFans API Integration
 * Gestion de l'authentification et synchronisation avec OnlyFans
 */

class OnlyFansAPI {
    constructor() {
        this.baseURL = OF_CONFIG.API.BASE_URL;
        this.authToken = null;
        this.sessionId = null;
        this.cache = new OFCache();
        this.rateLimiter = new RateLimiter(60, 60000); // 60 req/min
        this.fingerprint = SecurityUtils.generateFingerprint();
    }

    /**
     * Authentification avec OnlyFans
     */
    async authenticate(email, password) {
        try {
            // Validation des entrées
            if (!SecurityUtils.validateEmailFormat(email)) {
                throw new Error('Format d\'email invalide');
            }

            const passwordStrength = SecurityUtils.validatePasswordStrength(password);
            if (!passwordStrength.length) {
                throw new Error('Mot de passe trop court (minimum 8 caractères)');
            }

            // Vérifier la limitation de taux
            if (!this.rateLimiter.canMakeRequest()) {
                throw new Error('Trop de tentatives, veuillez patienter');
            }

            Logger.log('info', 'Tentative d\'authentification', { email });

            const response = await this.makeRequest(OF_CONFIG.ENDPOINTS.LOGIN, {
                method: 'POST',
                body: JSON.stringify({
                    email: email,
                    password: password
                }),
                headers: {
                    ...OF_CONFIG.HEADERS,
                    'X-BC': this.generateBC(),
                    'X-Fingerprint': this.fingerprint
                }
            });

            if (response.success) {
                this.authToken = response.token;
                this.sessionId = SecurityUtils.generateSessionId();
                
                Logger.log('info', 'Authentification réussie', { 
                    email, 
                    sessionId: this.sessionId 
                });

                return {
                    success: true,
                    user: response.user,
                    token: response.token
                };
            } else {
                throw new Error(OF_CONFIG.ERROR_MESSAGES.INVALID_CREDENTIALS);
            }

        } catch (error) {
            Logger.log('error', 'Erreur d\'authentification', { 
                email, 
                error: error.message 
            });
            
            // Simulation pour la démo (à remplacer par une vraie API)
            return this.simulateAuthentication(email, password);
        }
    }

    /**
     * Récupération des statistiques du profil
     */
    async getProfileStats() {
        if (!this.authToken) {
            throw new Error('Non authentifié');
        }

        // Vérifier le cache
        const cacheKey = 'profile_stats';
        const cachedData = this.cache.get(cacheKey);
        if (cachedData && OF_CONFIG.CACHE.ENABLE_CACHE) {
            Logger.log('debug', 'Données stats récupérées du cache');
            return cachedData;
        }

        try {
            if (!this.rateLimiter.canMakeRequest()) {
                throw new Error(OF_CONFIG.ERROR_MESSAGES.RATE_LIMITED);
            }

            const response = await this.makeRequest(OF_CONFIG.ENDPOINTS.STATS, {
                headers: {
                    ...OF_CONFIG.HEADERS,
                    'Authorization': `Bearer ${this.authToken}`,
                    'X-Session-ID': this.sessionId
                }
            });

            const result = {
                success: true,
                data: {
                    subscribers: response.subscribersCount || 0,
                    revenue: response.totalRevenue || 0,
                    posts: response.postsCount || 0,
                    likes: response.totalLikes || 0,
                    views: response.totalViews || 0,
                    engagement: this.calculateEngagement(response)
                }
            };

            // Mettre en cache
            if (OF_CONFIG.CACHE.ENABLE_CACHE) {
                this.cache.set(cacheKey, result, OF_CONFIG.CACHE.STATS_TTL);
            }

            Logger.log('info', 'Statistiques récupérées', result.data);
            return result;

        } catch (error) {
            Logger.log('error', 'Erreur récupération stats', { error: error.message });
            
            // Simulation pour la démo
            return this.simulateStats();
        }
    }

    /**
     * Récupération des informations du profil
     */
    async getProfileInfo() {
        if (!this.authToken) {
            throw new Error('Non authentifié');
        }

        try {
            const response = await this.makeRequest('/users/me', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'User-Agent': this.userAgent
                }
            });

            return {
                success: true,
                data: {
                    username: response.username,
                    displayName: response.name,
                    bio: response.rawText,
                    avatar: response.avatar,
                    cover: response.cover,
                    isVerified: response.isVerified
                }
            };

        } catch (error) {
            console.error('Erreur récupération profil:', error);
            return this.simulateProfileInfo();
        }
    }

    /**
     * Mise à jour des informations du profil
     */
    async updateProfile(profileData) {
        if (!this.authToken) {
            throw new Error('Non authentifié');
        }

        try {
            const response = await this.makeRequest('/users/me', {
                method: 'PUT',
                body: JSON.stringify({
                    name: profileData.displayName,
                    rawText: profileData.bio,
                    location: profileData.location || ''
                }),
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'Content-Type': 'application/json',
                    'User-Agent': this.userAgent
                }
            });

            return {
                success: true,
                message: 'Profil mis à jour avec succès'
            };

        } catch (error) {
            console.error('Erreur mise à jour profil:', error);
            return {
                success: false,
                error: 'Erreur lors de la mise à jour du profil'
            };
        }
    }

    /**
     * Récupération des messages récents
     */
    async getRecentMessages(limit = 10) {
        if (!this.authToken) {
            throw new Error('Non authentifié');
        }

        try {
            const response = await this.makeRequest(`/chats?limit=${limit}`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`,
                    'User-Agent': this.userAgent
                }
            });

            return {
                success: true,
                data: response.list || []
            };

        } catch (error) {
            console.error('Erreur récupération messages:', error);
            return this.simulateMessages();
        }
    }

    /**
     * Envoi d'un message groupé
     */
    async sendBulkMessage(message, userIds) {
        if (!this.authToken) {
            throw new Error('Non authentifié');
        }

        try {
            const promises = userIds.map(userId => 
                this.makeRequest('/chats', {
                    method: 'POST',
                    body: JSON.stringify({
                        userId: userId,
                        text: message
                    }),
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`,
                        'Content-Type': 'application/json',
                        'User-Agent': this.userAgent
                    }
                })
            );

            const results = await Promise.all(promises);
            
            return {
                success: true,
                sent: results.length,
                message: `Message envoyé à ${results.length} utilisateurs`
            };

        } catch (error) {
            console.error('Erreur envoi messages:', error);
            return {
                success: false,
                error: 'Erreur lors de l\'envoi des messages'
            };
        }
    }

    /**
     * Méthode utilitaire pour les appels API
     */
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                ...OF_CONFIG.HEADERS,
                'X-Fingerprint': this.fingerprint
            },
            timeout: OF_CONFIG.API.TIMEOUT
        };

        const requestOptions = { ...defaultOptions, ...options };

        // Note: En production, ces appels doivent passer par un proxy backend
        // car l'API OnlyFans ne permet pas les appels directs depuis le frontend
        
        Logger.log('debug', 'Requête API', { url, method: requestOptions.method });

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), OF_CONFIG.API.TIMEOUT);

            const response = await fetch(url, {
                ...requestOptions,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorMessage = this.getErrorMessage(response.status);
                throw new Error(errorMessage);
            }

            const data = await response.json();
            Logger.log('debug', 'Réponse API reçue', { endpoint, status: response.status });
            
            return data;

        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Timeout de la requête');
            }
            
            Logger.log('error', 'Erreur requête API', { 
                endpoint, 
                error: error.message 
            });
            
            throw error;
        }
    }

    /**
     * Récupération du message d'erreur approprié
     */
    getErrorMessage(status) {
        switch (status) {
            case 401:
                return OF_CONFIG.ERROR_MESSAGES.INVALID_CREDENTIALS;
            case 403:
                return OF_CONFIG.ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS;
            case 429:
                return OF_CONFIG.ERROR_MESSAGES.RATE_LIMITED;
            case 503:
                return OF_CONFIG.ERROR_MESSAGES.MAINTENANCE_MODE;
            default:
                return OF_CONFIG.ERROR_MESSAGES.API_UNAVAILABLE;
        }
    }

    /**
     * Génération du header BC (Browser Check)
     */
    generateBC() {
        // Simulation du hash BC requis par OnlyFans
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        return btoa(`${timestamp}:${random}`);
    }

    /**
     * Calcul du taux d'engagement
     */
    calculateEngagement(stats) {
        if (!stats.totalViews || stats.totalViews === 0) return 0;
        
        const engagementActions = (stats.totalLikes || 0) + (stats.totalComments || 0);
        return Math.round((engagementActions / stats.totalViews) * 100);
    }

    // Méthodes de simulation pour la démo
    simulateAuthentication(email, password) {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (email && password.length >= 6) {
                    resolve({
                        success: true,
                        user: {
                            id: 'user_' + Math.random().toString(36).substr(2, 9),
                            email: email,
                            username: email.split('@')[0],
                            name: 'Créateur OnlyFans'
                        },
                        token: 'demo_token_' + Math.random().toString(36).substr(2, 9)
                    });
                } else {
                    resolve({
                        success: false,
                        error: 'Identifiants invalides'
                    });
                }
            }, 1500);
        });
    }

    simulateStats() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: {
                        subscribers: Math.floor(Math.random() * 2000) + 500,
                        revenue: Math.floor(Math.random() * 8000) + 1500,
                        posts: Math.floor(Math.random() * 200) + 50,
                        likes: Math.floor(Math.random() * 15000) + 5000,
                        views: Math.floor(Math.random() * 100000) + 20000,
                        engagement: Math.floor(Math.random() * 25) + 75
                    }
                });
            }, 1000);
        });
    }

    simulateProfileInfo() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: {
                        username: 'creator_demo',
                        displayName: 'Créateur Demo',
                        bio: 'Profil de démonstration OnlyFans',
                        avatar: null,
                        cover: null,
                        isVerified: false
                    }
                });
            }, 800);
        });
    }

    simulateMessages() {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    data: [
                        {
                            id: 1,
                            username: 'fan1',
                            message: 'Salut ! Comment ça va ?',
                            timestamp: new Date(Date.now() - 3600000).toISOString()
                        },
                        {
                            id: 2,
                            username: 'fan2',
                            message: 'J\'adore ton contenu !',
                            timestamp: new Date(Date.now() - 7200000).toISOString()
                        }
                    ]
                });
            }, 600);
        });
    }
}

// Export pour utilisation dans d'autres fichiers
window.OnlyFansAPI = OnlyFansAPI;
