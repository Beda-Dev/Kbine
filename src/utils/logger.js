/**
 * Configuration du système de logs avec Winston - VERSION AMÉLIORÉE
 * 
 * Ce fichier configure Winston, une librairie de logging robuste pour Node.js.
 * Il gère les logs à différents niveaux et les envoie vers plusieurs destinations
 * avec rotation automatique et horodatage.
 * 
 * Niveaux de logs (du plus critique au moins critique):
 * - error: Erreurs critiques (pannes, exceptions)
 * - warn: Avertissements (problèmes non bloquants)
 * - info: Informations générales (démarrage, connexions)
 * - debug: Informations de debug (développement)
 * 
 * NOUVEAUTÉS:
 * - Fichiers horodatés par jour (YYYY-MM-DD)
 * - Rotation automatique avec limite de taille
 * - Nettoyage automatique des vieux logs
 * - Logs séparés par type (error, warn, debug)
 * - Méthodes helper pour logs métier
 * 
 * Usage dans le code:
 * const logger = require('../utils/logger');
 * logger.info('Serveur démarré');
 * logger.error('Erreur de connexion DB', error);
 * logger.logPayment('initialized', { orderId: 123 });
 */

// ===============================
// IMPORTS DES MODULES
// ===============================

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// ===============================
// CRÉATION DU DOSSIER DE LOGS
// ===============================

/**
 * Crée le dossier logs s'il n'existe pas
 * 
 * Le dossier sera créé à la racine du projet: /logs
 * Tous les fichiers de logs seront stockés dans ce dossier
 */
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`[Logger] Dossier de logs créé: ${logsDir}`);
}

// ===============================
// FORMATS DE LOG PERSONNALISÉS
// ===============================

/**
 * Format pour la console (développement)
 * 
 * Affichage coloré et lisible:
 * 2024-01-15 10:30:00 [info]: Message ici
 * 
 * Les couleurs par niveau:
 * - error: rouge
 * - warn: jaune
 * - info: vert
 * - debug: bleu
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(), // Coloration selon le niveau
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    
    // Ajouter les métadonnées si présentes (userId, orderId, etc.)
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata, null, 2)}`;
    }
    
    return msg;
  })
);

/**
 * Format pour les fichiers (production)
 * 
 * Format JSON structuré pour faciliter:
 * - Le parsing automatique
 * - L'analyse par des outils (ELK, Splunk, etc.)
 * - La recherche et le filtrage
 * 
 * Exemple de sortie:
 * {
 *   "timestamp": "2024-01-15 10:30:00",
 *   "level": "info",
 *   "message": "Paiement initié",
 *   "orderId": 123,
 *   "service": "kbine-backend"
 * }
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Inclut la stack trace des erreurs
  winston.format.json() // Format JSON pour parsing facile
);

// ===============================
// GÉNÉRATION DES NOMS DE FICHIERS HORODATÉS
// ===============================

/**
 * Génère un nom de fichier avec la date du jour
 * 
 * @param {string} level - Le niveau de log (error, warn, info, debug)
 * @returns {string} Chemin complet du fichier de log
 * 
 * Exemples:
 * - getLogFileName('error') => /logs/error-2024-01-15.log
 * - getLogFileName('combined') => /logs/combined-2024-01-15.log
 * 
 * Un nouveau fichier est créé chaque jour automatiquement
 */
const getLogFileName = (level) => {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0]; // Format YYYY-MM-DD
  return path.join(logsDir, `${level}-${dateStr}.log`);
};

// ===============================
// CONFIGURATION DES TRANSPORTS
// ===============================

/**
 * Transports = Destinations où les logs seront envoyés
 * 
 * Chaque transport peut avoir:
 * - Son propre niveau de log
 * - Son propre format
 * - Sa propre limite de taille
 * - Sa propre durée de conservation
 */
const transports = [
  /**
   * Transport 1: Console (développement uniquement)
   * 
   * Affiche les logs en temps réel dans le terminal
   * Niveau: debug (capture tout en développement)
   * Format: Coloré et lisible
   */
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || 'debug',
    format: consoleFormat
  }),

  /**
   * Transport 2: Fichier combined (tous les logs)
   * 
   * Fichier: logs/combined-YYYY-MM-DD.log
   * Contenu: Tous les logs info et au-dessus
   * Taille max: 10MB par fichier
   * Conservation: 30 jours
   * 
   * Usage: Historique complet des opérations
   */
  new winston.transports.File({
    filename: getLogFileName('combined'),
    level: 'info',
    format: fileFormat,
    maxsize: 10485760, // 10MB (10 * 1024 * 1024 bytes)
    maxFiles: 30, // Garder 30 fichiers (environ 30 jours)
  }),

  /**
   * Transport 3: Fichier error (erreurs uniquement)
   * 
   * Fichier: logs/error-YYYY-MM-DD.log
   * Contenu: Uniquement les erreurs critiques
   * Taille max: 10MB par fichier
   * Conservation: 90 jours (plus long pour les erreurs)
   * 
   * Usage: Monitoring, alertes, investigation des pannes
   */
  new winston.transports.File({
    filename: getLogFileName('error'),
    level: 'error',
    format: fileFormat,
    maxsize: 10485760,
    maxFiles: 90, // Garder 90 jours d'erreurs
  }),

  /**
   * Transport 4: Fichier warn (avertissements)
   * 
   * Fichier: logs/warn-YYYY-MM-DD.log
   * Contenu: Avertissements (problèmes non critiques)
   * Taille max: 5MB par fichier
   * Conservation: 30 jours
   * 
   * Usage: Détection de problèmes potentiels
   */
  new winston.transports.File({
    filename: getLogFileName('warn'),
    level: 'warn',
    format: fileFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 30,
  }),

  /**
   * Transport 5: Fichier debug (développement)
   * 
   * Fichier: logs/debug-YYYY-MM-DD.log
   * Contenu: Logs de débogage détaillés
   * Taille max: 10MB par fichier
   * Conservation: 7 jours (pas besoin de garder longtemps)
   * 
   * Usage: Debugging pendant le développement
   */
  new winston.transports.File({
    filename: getLogFileName('debug'),
    level: 'debug',
    format: fileFormat,
    maxsize: 10485760,
    maxFiles: 7, // Garder seulement 7 jours
  })
];

// ===============================
// CRÉATION DU LOGGER PRINCIPAL
// ===============================

/**
 * Logger Winston configuré avec tous les transports
 * 
 * Paramètres globaux:
 * - level: Niveau minimum à logger (configurable via LOG_LEVEL)
 * - format: Format des logs (JSON pour les fichiers)
 * - defaultMeta: Métadonnées ajoutées à tous les logs
 * - transports: Liste des destinations
 * - exitOnError: false = ne pas quitter en cas d'erreur de log
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: fileFormat,
  defaultMeta: { 
    service: 'kbine-backend',
    environment: process.env.NODE_ENV || 'development'
  },
  transports,
  exitOnError: false // Ne pas crasher si le système de log a un problème
});

// ===============================
// LOGS DE DÉMARRAGE
// ===============================

/**
 * Log initial pour confirmer que le système de logs est opérationnel
 * 
 * Affiche:
 * - Le répertoire des logs
 * - Le niveau de log actif
 * - L'environnement (dev/prod)
 * - Les fichiers créés
 */
logger.info('🚀 Logger initialisé', {
  logsDirectory: logsDir,
  logLevel: process.env.LOG_LEVEL || 'info',
  environment: process.env.NODE_ENV || 'development',
  files: {
    combined: getLogFileName('combined'),
    error: getLogFileName('error'),
    warn: getLogFileName('warn'),
    debug: getLogFileName('debug')
  }
});

// ===============================
// GESTION DES ERREURS NON GÉRÉES
// ===============================

/**
 * Capturer les exceptions non gérées
 * 
 * Si une exception échappe aux try/catch, elle sera loggée
 * dans un fichier séparé: logs/exceptions.log
 * 
 * Exemple: TypeError, ReferenceError non attrapés
 */
logger.exceptions.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'exceptions.log'),
    format: fileFormat
  })
);

/**
 * Capturer les rejets de promesses non gérés
 * 
 * Si une promesse est rejetée sans .catch(), elle sera loggée
 * dans un fichier séparé: logs/rejections.log
 * 
 * Exemple: await somePromise() qui rejette sans try/catch
 */
logger.rejections.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'rejections.log'),
    format: fileFormat
  })
);

// ===============================
// NETTOYAGE AUTOMATIQUE DES VIEUX LOGS
// ===============================

/**
 * Nettoie les fichiers de logs trop anciens
 * 
 * @param {number} daysToKeep - Nombre de jours à conserver (défaut: 30)
 * 
 * Fonctionnement:
 * 1. Liste tous les fichiers dans /logs
 * 2. Vérifie la date de modification de chaque fichier
 * 3. Supprime les fichiers plus vieux que daysToKeep
 * 
 * Lancé automatiquement:
 * - Au démarrage du serveur
 * - Tous les jours à minuit
 */
const cleanOldLogs = (daysToKeep = 30) => {
  try {
    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // Convertir en millisecondes

    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtime.getTime(); // Âge du fichier en ms

      if (age > maxAge) {
        fs.unlinkSync(filePath);
        logger.info(`🗑️ Ancien fichier de log supprimé: ${file}`, {
          age: `${Math.floor(age / (24 * 60 * 60 * 1000))} jours`,
          maxAge: `${daysToKeep} jours`
        });
      }
    });
  } catch (error) {
    logger.error('Erreur lors du nettoyage des logs', { 
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
}, 24 * 60 * 60 * 1000); // 24 heures en millisecondes

// ===============================
// MÉTHODES HELPER PERSONNALISÉES
// ===============================

/**
 * Log HTTP avec détails de la requête
 * 
 * @param {Object} req - Objet requête Express
 * @param {Object} res - Objet réponse Express
 * @param {number} duration - Durée de traitement en ms
 * 
 * Usage:
 * const start = Date.now();
 * // ... traiter la requête ...
 * logger.logHTTP(req, res, Date.now() - start);
 * 
 * Log automatique selon le code de statut:
 * - 5xx: error (rouge)
 * - 4xx: warn (jaune)
 * - 2xx/3xx: info (vert)
 */
logger.logHTTP = (req, res, duration) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    duration: `${duration}ms`,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  };

  if (res.statusCode >= 500) {
    logger.error('HTTP Error', logData);
  } else if (res.statusCode >= 400) {
    logger.warn('HTTP Warning', logData);
  } else {
    logger.info('HTTP Request', logData);
  }
};

/**
 * Log de paiement
 * 
 * @param {string} action - Action effectuée (initialized, success, failed)
 * @param {Object} data - Données du paiement
 * 
 * Usage:
 * logger.logPayment('initialized', { 
 *   orderId: 123, 
 *   amount: 1000, 
 *   method: 'wave' 
 * });
 * 
 * Facilite la recherche dans les logs:
 * grep "💳 Payment" logs/combined-2024-01-15.log
 */
logger.logPayment = (action, data) => {
  logger.info(`💳 Payment: ${action}`, {
    type: 'payment',
    action,
    ...data
  });
};

/**
 * Log de commande
 * 
 * @param {string} action - Action effectuée (created, completed, failed)
 * @param {Object} data - Données de la commande
 * 
 * Usage:
 * logger.logOrder('created', { 
 *   orderId: 456, 
 *   userId: 789, 
 *   amount: 2000 
 * });
 * 
 * Facilite la recherche dans les logs:
 * grep "📦 Order" logs/combined-2024-01-15.log
 */
logger.logOrder = (action, data) => {
  logger.info(`📦 Order: ${action}`, {
    type: 'order',
    action,
    ...data
  });
};

/**
 * Log de notification
 * 
 * @param {string} action - Action effectuée (sent, failed, queued)
 * @param {Object} data - Données de la notification
 * 
 * Usage:
 * logger.logNotification('sent', { 
 *   userId: 123, 
 *   type: 'order_completed',
 *   channel: 'fcm'
 * });
 * 
 * Facilite la recherche dans les logs:
 * grep "🔔 Notification" logs/combined-2024-01-15.log
 */
logger.logNotification = (action, data) => {
  logger.info(`🔔 Notification: ${action}`, {
    type: 'notification',
    action,
    ...data
  });
};

// ===============================
// EXPORT DU LOGGER
// ===============================

/**
 * Export du logger configuré
 * 
 * UTILISATION DANS LE CODE:
 * 
 * // 1. Import du logger
 * const logger = require('../utils/logger');
 * 
 * // 2. Logs basiques
 * logger.info('Serveur démarré sur le port 3000');
 * logger.warn('Limite de rate atteinte', { ip: '192.168.1.1' });
 * logger.error('Erreur de connexion DB', { error: err.message });
 * logger.debug('Debug info', { data: {...} });
 * 
 * // 3. Logs avec métadonnées
 * logger.info('Utilisateur créé', { 
 *   userId: 123, 
 *   phoneNumber: '0701234567' 
 * });
 * 
 * // 4. Logs métier (helpers)
 * logger.logPayment('initialized', { orderId: 123, amount: 1000 });
 * logger.logOrder('completed', { orderId: 456, status: 'success' });
 * logger.logNotification('sent', { userId: 789, type: 'order_completed' });
 * 
 * STRUCTURE DES FICHIERS DE LOGS:
 * 
 * logs/
 * ├── combined-2024-01-15.log    (tous les logs du 15 janvier)
 * ├── error-2024-01-15.log       (erreurs du 15 janvier)
 * ├── warn-2024-01-15.log        (avertissements du 15 janvier)
 * ├── debug-2024-01-15.log       (debug du 15 janvier)
 * ├── exceptions.log             (exceptions non gérées)
 * └── rejections.log             (promesses rejetées non gérées)
 * 
 * FORMAT JSON DES LOGS:
 * 
 * {
 *   "timestamp": "2024-01-15 10:30:00",
 *   "level": "info",
 *   "message": "💳 Payment: initialized",
 *   "type": "payment",
 *   "action": "initialized",
 *   "orderId": 123,
 *   "amount": 1000,
 *   "method": "wave",
 *   "service": "kbine-backend",
 *   "environment": "production"
 * }
 * 
 * VARIABLES D'ENVIRONNEMENT:
 * 
 * LOG_LEVEL=debug     # Niveau minimum (debug, info, warn, error)
 * NODE_ENV=production # Environnement (development, production)
 */
module.exports = logger;