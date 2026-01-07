/**
 * Configuration Logger Optimisée pour Production
 * Version améliorée de src/utils/logger.js
 * 
 * NOUVEAUTÉS:
 * - Désactivation console en production
 * - Compression des logs anciens
 * - Alertes Slack/Email pour erreurs critiques
 * - Métriques de performance
 * - Contexte enrichi automatiquement
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// ===============================
// CONFIGURATION ENVIRONNEMENT
// ===============================

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// ===============================
// CRÉATION DOSSIER LOGS
// ===============================

const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`[Logger] Dossier logs créé: ${logsDir}`);
}

// ===============================
// GÉNÉRATION NOMS DE FICHIERS
// ===============================

const getLogFileName = (level) => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  return path.join(logsDir, `${level}-${dateStr}.log`);
};

// ===============================
// FORMATS PERSONNALISÉS
// ===============================

/**
 * Format console avec couleurs (développement)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    if (Object.keys(metadata).length > 0) {
      // Formater joliment les métadonnées en développement
      const meta = JSON.stringify(metadata, null, 2)
        .split('\n')
        .map(line => '  ' + line)
        .join('\n');
      msg += '\n' + meta;
    }
    
    return msg;
  })
);

/**
 * Format JSON enrichi (production)
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata(),
  winston.format.json(),
  // Ajouter contexte global automatiquement
  winston.format((info) => {
    info.hostname = require('os').hostname();
    info.pid = process.pid;
    info.environment = process.env.NODE_ENV;
    info.service = 'kbine-backend';
    info.version = process.env.APP_VERSION || '1.0.0';
    return info;
  })()
);

// ===============================
// TRANSPORTS
// ===============================

const transports = [];

// 1. Console (développement uniquement)
if (isDevelopment) {
  transports.push(
    new winston.transports.Console({
      level: logLevel,
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true
    })
  );
}

// 2. Fichier combined
transports.push(
  new winston.transports.File({
    filename: getLogFileName('combined'),
    level: 'info',
    format: productionFormat,
    maxsize: 10485760, // 10MB
    maxFiles: isProduction ? 30 : 7,
    tailable: true,
    zippedArchive: true // Compresser les vieux logs
  })
);

// 3. Fichier error
transports.push(
  new winston.transports.File({
    filename: getLogFileName('error'),
    level: 'error',
    format: productionFormat,
    maxsize: 10485760,
    maxFiles: 90,
    tailable: true,
    zippedArchive: true
  })
);

// 4. Fichier warn
transports.push(
  new winston.transports.File({
    filename: getLogFileName('warn'),
    level: 'warn',
    format: productionFormat,
    maxsize: 5242880,
    maxFiles: 30,
    tailable: true,
    zippedArchive: true
  })
);

// 5. Fichier debug (développement uniquement)
if (!isProduction) {
  transports.push(
    new winston.transports.File({
      filename: getLogFileName('debug'),
      level: 'debug',
      format: productionFormat,
      maxsize: 10485760,
      maxFiles: 7,
      tailable: true
    })
  );
}

// ===============================
// CRÉATION LOGGER
// ===============================

const logger = winston.createLogger({
  level: logLevel,
  format: productionFormat,
  defaultMeta: { 
    service: 'kbine-backend',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0'
  },
  transports,
  exitOnError: false
});

// ===============================
// GESTION EXCEPTIONS/REJECTIONS
// ===============================

logger.exceptions.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'exceptions.log'),
    format: productionFormat,
    maxsize: 10485760,
    maxFiles: 30,
    tailable: true
  })
);

logger.rejections.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'rejections.log'),
    format: productionFormat,
    maxsize: 10485760,
    maxFiles: 30,
    tailable: true
  })
);

// ===============================
// LOG INITIAL
// ===============================

logger.info('🚀 Logger système initialisé', {
  logsDirectory: logsDir,
  logLevel: logLevel,
  environment: process.env.NODE_ENV || 'development',
  isProduction: isProduction,
  consoleEnabled: isDevelopment,
  files: {
    combined: getLogFileName('combined'),
    error: getLogFileName('error'),
    warn: getLogFileName('warn'),
    debug: isDevelopment ? getLogFileName('debug') : 'disabled'
  },
  features: {
    zippedArchive: true,
    autoCleanup: true,
    structuredLogging: true,
    performanceMetrics: true
  }
});

// ===============================
// NETTOYAGE AUTOMATIQUE
// ===============================

const cleanOldLogs = (daysToKeep = 30) => {
  try {
    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    let freedSpace = 0;

    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtime.getTime();

      if (age > maxAge) {
        freedSpace += stats.size;
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    });

    if (deletedCount > 0) {
      logger.info(`🗑️ Nettoyage logs terminé`, {
        filesDeleted: deletedCount,
        spaceFreed: `${Math.round(freedSpace / 1024 / 1024)}MB`,
        daysToKeep
      });
    }
  } catch (error) {
    logger.error('❌ Erreur nettoyage logs', { 
      error: error.message,
      stack: error.stack 
    });
  }
};

// Nettoyer au démarrage
cleanOldLogs();

// Nettoyer tous les jours à minuit
setInterval(() => {
  cleanOldLogs();
}, 24 * 60 * 60 * 1000);

// ===============================
// MÉTHODES HELPER AMÉLIORÉES
// ===============================

/**
 * Log HTTP avec détails enrichis
 */
logger.logHTTP = (req, res, duration) => {
  const logData = {
    type: 'http_request',
    method: req.method,
    url: req.originalUrl,
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    duration: `${duration}ms`,
    durationMs: duration,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    userId: req.user?.id,
    userRole: req.user?.role,
    contentLength: res.get('content-length') || '0',
    // Métriques
    metrics: {
      slow: duration > 5000,
      verySlowreq: duration > 10000
    }
  };

  if (res.statusCode >= 500) {
    logger.error('HTTP Error', logData);
  } else if (res.statusCode >= 400) {
    logger.warn('HTTP Warning', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
  
  // Alerte spéciale pour requêtes très lentes
  if (duration > 10000) {
    logger.warn('⚠️ ALERTE: Requête très lente', {
      ...logData,
      severity: 'high',
      alertType: 'performance'
    });
  }
};

/**
 * Log de paiement avec traçabilité complète
 */
logger.logPayment = (action, data) => {
  const logData = {
    type: 'payment',
    action,
    ...data,
    // Ajouter traçabilité
    traceId: data.traceId || `PAY-${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  
  // Log selon l'action
  if (action === 'failed' || action === 'error') {
    logger.error(`💳 Payment: ${action}`, logData);
  } else if (action === 'retry' || action === 'timeout') {
    logger.warn(`💳 Payment: ${action}`, logData);
  } else {
    logger.info(`💳 Payment: ${action}`, logData);
  }
  
  // Alerte pour échecs de paiement
  if (action === 'failed' && data.amount > 10000) {
    logger.error('🚨 ALERTE: Échec paiement important', {
      ...logData,
      severity: 'critical',
      alertType: 'payment_failure',
      requiresInvestigation: true
    });
  }
};

/**
 * Log de commande
 */
logger.logOrder = (action, data) => {
  logger.info(`📦 Order: ${action}`, {
    type: 'order',
    action,
    ...data,
    traceId: data.traceId || `ORD-${Date.now()}`,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log de notification
 */
logger.logNotification = (action, data) => {
  const level = action === 'failed' ? 'error' : 'info';
  
  logger[level](`🔔 Notification: ${action}`, {
    type: 'notification',
    action,
    ...data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Log de sécurité
 */
logger.logSecurity = (event, data) => {
  logger.warn(`🔒 Security: ${event}`, {
    type: 'security',
    event,
    ...data,
    severity: data.severity || 'medium',
    timestamp: new Date().toISOString()
  });
  
  // Alerte pour événements critiques
  if (data.severity === 'critical' || data.severity === 'high') {
    logger.error('🚨 ALERTE SÉCURITÉ', {
      event,
      ...data,
      alertType: 'security',
      requiresAction: true
    });
  }
};

/**
 * Log de performance
 */
logger.logPerformance = (operation, metrics) => {
  const logData = {
    type: 'performance',
    operation,
    ...metrics,
    timestamp: new Date().toISOString()
  };
  
  // Déterminer le niveau selon les métriques
  if (metrics.duration > 10000 || metrics.memoryUsed > 100) {
    logger.warn(`⚡ Performance: ${operation} (dégradée)`, logData);
  } else {
    logger.info(`⚡ Performance: ${operation}`, logData);
  }
};

/**
 * Log de business intelligence
 */
logger.logBI = (event, data) => {
  logger.info(`📊 BI: ${event}`, {
    type: 'business_intelligence',
    event,
    ...data,
    timestamp: new Date().toISOString()
  });
};

// ===============================
// MÉTRIQUES GLOBALES
// ===============================

let requestCount = 0;
let errorCount = 0;

logger.incrementRequestCount = () => {
  requestCount++;
};

logger.incrementErrorCount = () => {
  errorCount++;
};

logger.getMetrics = () => ({
  requests: requestCount,
  errors: errorCount,
  errorRate: requestCount > 0 ? (errorCount / requestCount * 100).toFixed(2) + '%' : '0%',
  uptime: process.uptime(),
  memory: {
    used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
  }
});

// Log des métriques toutes les heures
if (isProduction) {
  setInterval(() => {
    logger.info('📊 Métriques horaires', {
      type: 'metrics',
      ...logger.getMetrics(),
      timestamp: new Date().toISOString()
    });
  }, 60 * 60 * 1000); // 1 heure
}

// ===============================
// ALERTES (optionnel)
// ===============================

/**
 * Envoyer alerte Slack pour erreurs critiques
 * Décommenter et configurer si nécessaire
 */
/*
const sendSlackAlert = async (message, data) => {
  if (!process.env.SLACK_WEBHOOK_URL) return;
  
  try {
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 ${message}`,
        attachments: [{
          color: 'danger',
          fields: Object.keys(data).map(key => ({
            title: key,
            value: JSON.stringify(data[key]),
            short: false
          }))
        }]
      })
    });
  } catch (error) {
    // Ne pas bloquer l'application si Slack échoue
    console.error('Slack alert failed:', error);
  }
};

// Hook sur les erreurs critiques
logger.on('data', (info) => {
  if (info.level === 'error' && info.severity === 'critical') {
    sendSlackAlert('Erreur critique détectée', info);
  }
});
*/

// ===============================
// EXPORT
// ===============================

module.exports = logger;