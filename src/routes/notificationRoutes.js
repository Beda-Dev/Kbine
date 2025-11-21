/**
 * Routes pour la gestion des notifications push Firebase
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// =========================================================
// MIDDLEWARE D'AUTHENTIFICATION
// Toutes les routes nécessitent une authentification
// =========================================================
router.use(authenticateToken);

/**
 * @route   POST /api/notifications/register-token
 * @desc    Enregistrer un token FCM pour recevoir des notifications
 * @access  Private
 * @body    { token: string, platform: 'android'|'ios' }
 */
router.post('/register-token', notificationController.registerToken);

/**
 * @route   POST /api/notifications/remove-token
 * @desc    Supprimer un token FCM (déconnexion)
 * @access  Private
 * @body    { token: string }
 */
router.post('/remove-token', notificationController.removeToken);

/**
 * @route   GET /api/notifications/history
 * @desc    Obtenir l'historique des notifications de l'utilisateur
 * @access  Private
 * @query   { page?: number, limit?: number }
 */
router.get('/history', notificationController.getHistory);

/**
 * @route   POST /api/notifications/test
 * @desc    Envoyer une notification de test (développement/admin)
 * @access  Private (Admin)
 * @body    { title: string, body: string, userId?: number }
 */
router.post('/test', 
  requireRole(['admin']), 
  notificationController.sendTestNotification
);

module.exports = router;

// =========================================================
// INSTRUCTIONS D'INTÉGRATION DANS app.js
// =========================================================
/*
1. Ajouter l'import en haut avec les autres routes:
   const notificationRoutes = require('./routes/notificationRoutes');

2. Monter les routes APRÈS les autres routes:
   app.use('/api/notifications', notificationRoutes);

3. Le fichier firebase-service-account.json doit être placé à la racine du projet
   OU définir la variable d'environnement FIREBASE_SERVICE_ACCOUNT avec le JSON

Exemple .env:
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"..."}
*/