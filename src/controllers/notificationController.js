/**
 * Contrôleur de gestion des notifications push
 */

const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

/**
 * @route   POST /api/notifications/register-token
 * @desc    Enregistrer un token FCM pour un utilisateur
 * @access  Private
 */
const registerToken = async (req, res, next) => {
  console.log('[NotificationController] [registerToken] Début', {
    userId: req.user.id,
    body: req.body
  });

  try {
    const { token, platform } = req.body;
    const userId = req.user.id;

    // Validation
    if (!token) {
      console.log('[NotificationController] [registerToken] Token manquant');
      return res.status(400).json({
        success: false,
        error: 'Le token FCM est requis'
      });
    }

    if (!platform || !['android', 'ios'].includes(platform)) {
      console.log('[NotificationController] [registerToken] Plateforme invalide');
      return res.status(400).json({
        success: false,
        error: 'La plateforme doit être "android" ou "ios"'
      });
    }

    await notificationService.registerToken(userId, token, platform);

    logger.info('Token FCM enregistré', {
      userId,
      platform
    });

    console.log('[NotificationController] [registerToken] Succès');

    res.json({
      success: true,
      message: 'Token enregistré avec succès'
    });
  } catch (error) {
    console.log('[NotificationController] [registerToken] Erreur', {
      message: error.message
    });

    logger.error('Erreur enregistrement token', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'enregistrement du token',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/notifications/remove-token
 * @desc    Supprimer un token FCM (déconnexion)
 * @access  Private
 */
const removeToken = async (req, res, next) => {
  console.log('[NotificationController] [removeToken] Début', {
    userId: req.user.id,
    body: req.body
  });

  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      console.log('[NotificationController] [removeToken] Token manquant');
      return res.status(400).json({
        success: false,
        error: 'Le token FCM est requis'
      });
    }

    await notificationService.removeToken(userId, token);

    logger.info('Token FCM supprimé', { userId });
    console.log('[NotificationController] [removeToken] Succès');

    res.json({
      success: true,
      message: 'Token supprimé avec succès'
    });
  } catch (error) {
    console.log('[NotificationController] [removeToken] Erreur', {
      message: error.message
    });

    logger.error('Erreur suppression token', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du token',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/notifications/history
 * @desc    Obtenir l'historique des notifications d'un utilisateur
 * @access  Private
 */
const getHistory = async (req, res, next) => {
  console.log('[NotificationController] [getHistory] Début', {
    userId: req.user.id,
    query: req.query
  });

  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await notificationService.getNotificationHistory(
      userId,
      page,
      limit
    );

    console.log('[NotificationController] [getHistory] Succès', {
      count: result.notifications.length
    });

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination
    });
  } catch (error) {
    console.log('[NotificationController] [getHistory] Erreur', {
      message: error.message
    });

    logger.error('Erreur récupération historique', {
      error: error.message,
      userId: req.user?.id
    });

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de l\'historique',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/notifications/test
 * @desc    Envoyer une notification de test (dev/admin)
 * @access  Private (Admin)
 */
const sendTestNotification = async (req, res, next) => {
  console.log('[NotificationController] [sendTestNotification] Début', {
    userId: req.user.id,
    body: req.body
  });

  try {
    const { title, body, userId } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        error: 'Le titre et le corps sont requis'
      });
    }

    // Déterminer les tokens cibles
    let tokens;
    if (userId) {
      tokens = await notificationService.getUserTokens(userId);
    } else {
      tokens = await notificationService.getStaffTokens();
    }

    if (tokens.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Aucun token trouvé pour cet utilisateur'
      });
    }

    const response = await notificationService.sendToTokens(
      tokens,
      { title, body },
      { type: 'test' }
    );

    logger.info('Notification de test envoyée', {
      userId: userId || 'staff',
      successCount: response?.successCount
    });

    console.log('[NotificationController] [sendTestNotification] Succès');

    res.json({
      success: true,
      message: 'Notification de test envoyée',
      successCount: response?.successCount,
      failureCount: response?.failureCount
    });
  } catch (error) {
    console.log('[NotificationController] [sendTestNotification] Erreur', {
      message: error.message
    });

    logger.error('Erreur envoi notification test', {
      error: error.message
    });

    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'envoi de la notification',
      details: error.message
    });
  }
};

module.exports = {
  registerToken,
  removeToken,
  getHistory,
  sendTestNotification
};