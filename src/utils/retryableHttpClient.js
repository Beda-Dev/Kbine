/**
 * Client HTTP retryable avec backoff exponentiel
 * 
 * Gère automatiquement les erreurs 429 (Too Many Requests)
 * en respectant le header retryAfter des serveurs externes
 */

const axios = require('axios');
const logger = require('./logger');

/**
 * Configuration par défaut du retry
 */
const DEFAULT_CONFIG = {
  maxRetries: 5,           // Nombre maximum de tentatives
  initialDelayMs: 1000,    // Délai initial en ms (1 sec)
  maxDelayMs: 60000,       // Délai maximum en ms (60 sec)
  backoffMultiplier: 2,    // Multiplicateur pour chaque tentative
  retryOnStatuses: [429, 503, 504], // Codes HTTP à retry
};

/**
 * Attendre un délai (en ms)
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculer le délai de retry avec backoff exponentiel
 * 
 * @param {number} attemptNumber - Numéro de tentative (commençant à 1)
 * @param {object} retryAfterHeader - Valeur du header Retry-After du serveur (optionnel)
 * @returns {number} Délai en millisecondes
 */
const calculateRetryDelay = (attemptNumber, retryAfterHeader) => {
  // Si le serveur nous dit quand réessayer, respecter son indication
  if (retryAfterHeader) {
    // retryAfter peut être un délai en secondes ou une date HTTP
    const delaySeconds = parseInt(retryAfterHeader);
    if (!isNaN(delaySeconds)) {
      const delayMs = delaySeconds * 1000;
      return Math.min(delayMs, DEFAULT_CONFIG.maxDelayMs);
    }
  }

  // Sinon, appliquer le backoff exponentiel
  const exponentialDelay = DEFAULT_CONFIG.initialDelayMs * 
    Math.pow(DEFAULT_CONFIG.backoffMultiplier, attemptNumber - 1);
  
  // Ajouter un jitter aléatoire (±10%) pour éviter le thundering herd
  const jitter = exponentialDelay * 0.1 * Math.random();
  
  return Math.min(exponentialDelay + jitter, DEFAULT_CONFIG.maxDelayMs);
};

/**
 * Effectuer une requête HTTP avec retry automatique
 * 
 * @param {string} method - Méthode HTTP (GET, POST, PUT, DELETE, etc.)
 * @param {string} url - URL cible
 * @param {object} data - Données à envoyer (optionnel)
 * @param {object} config - Configuration axios (optionnel)
 * @returns {Promise<object>} Réponse axios
 */
const executeWithRetry = async (method, url, data = null, config = {}) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= DEFAULT_CONFIG.maxRetries; attempt++) {
    try {
      logger.debug(`[HTTP Retry] Tentative ${attempt}/${DEFAULT_CONFIG.maxRetries}`, {
        method,
        url,
        hasData: !!data,
      });

      const axiosConfig = {
        ...config,
        validateStatus: () => true, // Ne pas lever d'erreur sur aucun code HTTP
      };

      const response = await axios({
        method,
        url,
        data,
        ...axiosConfig,
      });

      // ✅ Si succès (2xx), retourner la réponse
      if (response.status >= 200 && response.status < 300) {
        logger.info(`[HTTP Retry] Succès à la tentative ${attempt}`, {
          method,
          url,
          status: response.status,
        });
        return response;
      }

      // ❌ Si erreur non-retryable, retourner la réponse
      if (!DEFAULT_CONFIG.retryOnStatuses.includes(response.status)) {
        logger.warn(`[HTTP Retry] Erreur non-retryable`, {
          method,
          url,
          status: response.status,
          statusText: response.statusText,
          data: response.data,
        });
        return response;
      }

      // 🔄 Si erreur retryable (429, 503, 504)
      lastError = {
        status: response.status,
        statusText: response.statusText,
        data: response.data,
        retryAfter: response.headers['retry-after'],
      };

      // Si c'était la dernière tentative, retourner la réponse d'erreur
      if (attempt === DEFAULT_CONFIG.maxRetries) {
        logger.error(`[HTTP Retry] Échec après ${DEFAULT_CONFIG.maxRetries} tentatives`, {
          method,
          url,
          lastStatus: response.status,
          lastError,
        });
        return response;
      }

      // Calculer le délai avant la prochaine tentative
      const retryDelayMs = calculateRetryDelay(attempt, response.headers['retry-after']);
      const retryDelaySec = Math.round(retryDelayMs / 1000);

      logger.info(`[HTTP Retry] Erreur ${response.status}, nouvelle tentative dans ${retryDelaySec}s`, {
        method,
        url,
        attemptNumber: attempt,
        retryAfterHeader: response.headers['retry-after'],
        delayMs: retryDelayMs,
      });

      // ⏳ Attendre avant la prochaine tentative
      await sleep(retryDelayMs);

    } catch (error) {
      // Erreur réseau ou autre erreur non-HTTP
      lastError = {
        error: error.message,
        code: error.code,
      };

      if (attempt === DEFAULT_CONFIG.maxRetries) {
        logger.error(`[HTTP Retry] Erreur réseau après ${DEFAULT_CONFIG.maxRetries} tentatives`, {
          method,
          url,
          error: error.message,
        });
        throw error;
      }

      const retryDelayMs = calculateRetryDelay(attempt);
      logger.warn(`[HTTP Retry] Erreur réseau, nouvelle tentative dans ${Math.round(retryDelayMs / 1000)}s`, {
        method,
        url,
        attemptNumber: attempt,
        error: error.message,
      });

      await sleep(retryDelayMs);
    }
  }

  // Ne devrait pas arriver ici
  throw new Error(`Impossible d'effectuer la requête après ${DEFAULT_CONFIG.maxRetries} tentatives`);
};

/**
 * Méthode conveniente: GET avec retry
 */
const get = (url, config = {}) => 
  executeWithRetry('GET', url, null, config);

/**
 * Méthode conveniente: POST avec retry
 */
const post = (url, data = null, config = {}) => 
  executeWithRetry('POST', url, data, config);

/**
 * Méthode conveniente: PUT avec retry
 */
const put = (url, data = null, config = {}) => 
  executeWithRetry('PUT', url, data, config);

/**
 * Méthode conveniente: DELETE avec retry
 */
const delete_ = (url, config = {}) => 
  executeWithRetry('DELETE', url, null, config);

/**
 * Méthode conveniente: PATCH avec retry
 */
const patch = (url, data = null, config = {}) => 
  executeWithRetry('PATCH', url, data, config);

module.exports = {
  executeWithRetry,
  get,
  post,
  put,
  delete: delete_,
  patch,
  calculateRetryDelay,
  DEFAULT_CONFIG,
};
