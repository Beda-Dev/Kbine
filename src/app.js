/**
 * Application principale avec système de logging intégré
 * Version améliorée de src/app.js
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Configuration et utilitaires
const config = require('./config/database');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');
const rateLimiterMiddleware = require('./middlewares/rateLimiter');

// ✅ NOUVEAU: Import des middlewares de logging
const { 
  httpLogger, 
  errorLogger, 
  notFoundLogger, 
  socketLogger 
} = require('./middlewares/httpLogger');

// Import des routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/usersRoutes');
const operatorRoutes = require('./routes/operatorRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const planRoutes = require('./routes/planRoutes');
const appVersionRoutes = require('./routes/appVersionRoutes');
const notificationRoutes = require('./routes/notificationRoutes');


const app = express();
const server = createServer(app);

// Configuration Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"]
  }
});

// ===============================
// MIDDLEWARES GLOBAUX (ORDRE IMPORTANT!)
// ===============================

// 1. Sécurité et performance
app.use(helmet());
app.use(compression());
app.use(cors());

// 2. ✅ NOUVEAU: Logging HTTP automatique (AVANT les parsers)
app.use(httpLogger);

// 3. Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 4. Rate limiting
app.use(rateLimiterMiddleware);

// ===============================
// FICHIERS STATIQUES
// ===============================

const path = require('path');
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  etag: false,
  lastModified: false
}));

// ===============================
// SOCKET.IO AVEC LOGGING
// ===============================

// ✅ NOUVEAU: Logger Socket.IO automatiquement
socketLogger(io);

app.set('io', io);

// ===============================
// ROUTES API
// ===============================

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/app', appVersionRoutes);
app.use('/api/notifications', notificationRoutes);


// ===============================
// ROUTES PUBLIQUES
// ===============================

/**
 * Health check
 * 
 */
app.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    environment: process.env.NODE_ENV || 'development'
  };
  
  logger.debug('🏥 Health check', healthData);
  res.status(200).json(healthData);
});

/**
 * Routes de retour de paiement
 */
const paymentReturnController = require('./controllers/paymentReturnController');
app.get('/payments/return/:orderReference/successful', paymentReturnController.paymentSuccessful);
app.get('/payments/return/:orderReference/failed', paymentReturnController.paymentFailed);

// ===============================
// GESTION DES ERREURS (ORDRE CRITIQUE!)
// ===============================

// 1. ✅ NOUVEAU: Logger les erreurs Express (AVANT errorHandler)
app.use(errorLogger);

// 2. Gestionnaire d'erreurs principal
app.use(errorHandler);

// 3. ✅ NOUVEAU: Route 404 avec logging (DOIT être en dernier)
app.use('*', notFoundLogger, (req, res) => {
  res.status(404).json({ 
    error: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// ===============================
// DÉMARRAGE DU SERVEUR
// ===============================

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  const env = process.env.NODE_ENV || 'development';
  const memoryUsage = process.memoryUsage();
  
  // ✅ Utiliser le logger au lieu de console.log
  logger.info('======================================');
  logger.info('🚀 Serveur kbine démarré avec succès', {
    port: PORT,
    environment: env,
    pid: process.pid,
    memory: {
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    },
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
  logger.info('======================================');
  
  // Console.log pour faciliter le développement
  console.log('======================================');
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📊 Environnement: ${env}`);
  console.log(`📝 Logs disponibles dans: ./logs/`);
  console.log('======================================');
});

// ===============================
// GESTION DES SIGNAUX DE FERMETURE
// ===============================

const gracefulShutdown = (signal) => {
  logger.info(`⚠️ Signal ${signal} reçu. Arrêt gracieux en cours...`, {
    signal,
    timestamp: new Date().toISOString()
  });
  
  server.close(() => {
    logger.info('✅ Serveur HTTP fermé', {
      timestamp: new Date().toISOString()
    });
    
    // Fermer les connexions DB, Redis, etc.
    // db.close();
    
    process.exit(0);
  });
  
  // Force quit après 30s
  setTimeout(() => {
    logger.error('❌ Arrêt forcé - timeout dépassé', {
      timestamp: new Date().toISOString()
    });
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ===============================
// GESTION DES ERREURS NON CAPTURÉES
// ===============================

process.on('uncaughtException', (error) => {
  logger.error('💥 Exception non capturée', {
    type: 'uncaught_exception',
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack
    },
    timestamp: new Date().toISOString()
  });
  
  // Arrêt gracieux
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Promise rejetée non gérée', {
    type: 'unhandled_rejection',
    reason: reason,
    promise: promise,
    timestamp: new Date().toISOString()
  });
});

module.exports = app;