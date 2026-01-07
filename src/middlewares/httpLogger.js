/**
 * Middleware de logging automatique des requêtes HTTP
 * À placer dans: src/middlewares/httpLogger.js
 * 
 * Ce middleware capture automatiquement toutes les requêtes HTTP
 * et les log avec des informations détaillées.
 */

const logger = require('../utils/logger');
const onFinished = require('on-finished'); // npm install on-finished

/**
 * Détermine le niveau de log selon le code de statut HTTP
 */
const getLogLevel = (statusCode) => {
  if (statusCode >= 500) return 'error';
  if (statusCode >= 400) return 'warn';
  if (statusCode >= 300) return 'info';
  return 'info';
};

/**
 * Détermine l'icône selon la méthode HTTP
 */
const getMethodIcon = (method) => {
  const icons = {
    GET: '📥',
    POST: '📤',
    PUT: '✏️',
    PATCH: '🔧',
    DELETE: '🗑️'
  };
  return icons[method] || '📡';
};

/**
 * Détermine l'icône selon le code de statut
 */
const getStatusIcon = (statusCode) => {
  if (statusCode >= 500) return '💥';
  if (statusCode >= 400) return '⚠️';
  if (statusCode >= 300) return '↪️';
  if (statusCode >= 200) return '✅';
  return '📊';
};

/**
 * Masque les données sensibles dans les URLs et headers
 */
const sanitizeUrl = (url) => {
  // Masquer les tokens dans les query params
  return url.replace(/([?&]token=)[^&]*/gi, '$1***')
            .replace(/([?&]api_key=)[^&]*/gi, '$1***')
            .replace(/([?&]password=)[^&]*/gi, '$1***');
};

const sanitizeHeaders = (headers) => {
  const sensitive = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];
  const sanitized = { ...headers };
  
  sensitive.forEach(key => {
    if (sanitized[key]) {
      sanitized[key] = '***';
    }
  });
  
  return sanitized;
};

/**
 * Middleware principal de logging HTTP
 */
const httpLogger = (req, res, next) => {
  // Marquer le début de la requête
  const startTime = Date.now();
  const startDate = new Date();
  
  // Capturer des infos sur la requête
  const requestInfo = {
    method: req.method,
    url: sanitizeUrl(req.originalUrl || req.url),
    baseUrl: req.baseUrl,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type'),
    contentLength: req.get('content-length') || '0',
    protocol: req.protocol,
    hostname: req.hostname,
    // Données utilisateur si authentifié
    userId: req.user?.id,
    userRole: req.user?.role,
    // Headers (sanitisés)
    headers: sanitizeHeaders(req.headers),
    // Query params (pour GET)
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    // Body size (sans le contenu pour éviter de logger des données sensibles)
    bodySize: req.body ? JSON.stringify(req.body).length : 0
  };
  
  // Log de début de requête (niveau debug uniquement)
  logger.debug(`${getMethodIcon(req.method)} ${req.method} ${req.originalUrl} - Début`, {
    ...requestInfo,
    timestamp: startDate.toISOString()
  });
  
  // Capturer la fin de la requête
  onFinished(res, (err, res) => {
    const duration = Date.now() - startTime;
    const endDate = new Date();
    
    // Informations de réponse
    const responseInfo = {
      statusCode: res.statusCode,
      statusMessage: res.statusMessage,
      contentLength: res.get('content-length') || '0',
      contentType: res.get('content-type'),
      duration: `${duration}ms`,
      durationNumeric: duration
    };
    
    // Données complètes pour le log
    const logData = {
      type: 'http_request',
      ...requestInfo,
      ...responseInfo,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      error: err ? {
        message: err.message,
        stack: err.stack
      } : undefined
    };
    
    // Déterminer le niveau de log
    const level = getLogLevel(res.statusCode);
    
    // Message de log formaté
    const message = `${getStatusIcon(res.statusCode)} ${getMethodIcon(req.method)} ${req.method} ${sanitizeUrl(req.originalUrl)} - ${res.statusCode} (${duration}ms)`;
    
    // Logger selon le niveau
    logger[level](message, logData);
    
    // Alertes spéciales
    if (duration > 5000) {
      logger.warn(`⏱️ Requête lente détectée: ${req.method} ${req.originalUrl}`, {
        duration: `${duration}ms`,
        threshold: '5000ms',
        url: req.originalUrl,
        method: req.method
      });
    }
    
    if (res.statusCode === 429) {
      logger.warn(`🚫 Rate limit atteint`, {
        ip: req.ip,
        url: req.originalUrl,
        userAgent: req.get('user-agent')
      });
    }
  });
  
  next();
};

/**
 * Middleware de logging des erreurs Express
 * À placer APRÈS toutes les routes mais AVANT errorHandler
 */
const errorLogger = (err, req, res, next) => {
  const errorInfo = {
    type: 'express_error',
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
      code: err.code,
      statusCode: err.statusCode || 500
    },
    request: {
      method: req.method,
      url: sanitizeUrl(req.originalUrl),
      ip: req.ip,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      body: req.body ? '***' : undefined, // Ne pas logger le body complet
      query: req.query
    },
    timestamp: new Date().toISOString()
  };
  
  // Toujours logger les erreurs
  logger.error(`💥 Erreur Express: ${err.message}`, errorInfo);
  
  // Passer au gestionnaire d'erreurs suivant
  next(err);
};

/**
 * Middleware de logging des routes 404
 */
const notFoundLogger = (req, res, next) => {
  logger.warn(`🔍 Route non trouvée: ${req.method} ${req.originalUrl}`, {
    type: 'not_found',
    method: req.method,
    url: sanitizeUrl(req.originalUrl),
    ip: req.ip,
    userAgent: req.get('user-agent'),
    referrer: req.get('referrer'),
    timestamp: new Date().toISOString()
  });
  
  next();
};

/**
 * Logger pour les événements Socket.IO
 */
const socketLogger = (io) => {
  io.on('connection', (socket) => {
    logger.info(`🔌 Socket.IO: Nouvelle connexion`, {
      type: 'socket_connection',
      socketId: socket.id,
      ip: socket.handshake.address,
      userAgent: socket.handshake.headers['user-agent'],
      timestamp: new Date().toISOString()
    });
    
    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Socket.IO: Déconnexion`, {
        type: 'socket_disconnection',
        socketId: socket.id,
        reason: reason,
        timestamp: new Date().toISOString()
      });
    });
    
    socket.on('error', (error) => {
      logger.error(`🔌 Socket.IO: Erreur`, {
        type: 'socket_error',
        socketId: socket.id,
        error: {
          message: error.message,
          stack: error.stack
        },
        timestamp: new Date().toISOString()
      });
    });
  });
};

/**
 * Wrapper pour les routes async qui catch automatiquement les erreurs
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    logger.error(`💥 Erreur async route: ${req.method} ${req.originalUrl}`, {
      type: 'async_route_error',
      error: {
        message: error.message,
        stack: error.stack
      },
      request: {
        method: req.method,
        url: req.originalUrl,
        params: req.params,
        query: req.query
      },
      timestamp: new Date().toISOString()
    });
    next(error);
  });
};

module.exports = {
  httpLogger,
  errorLogger,
  notFoundLogger,
  socketLogger,
  asyncHandler
};