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
  logger.info(' Enregistrement token FCM - Début', {
    userId: req.user.id,
    platform: req.body.platform,
    ip: req.ip
  });
  console.log('[NotificationController] [registerToken] Début', {
    userId: req.user.id,
    body: req.body
  });

  try {
    const { token, platform } = req.body;
    const userId = req.user.id;

    // Validation
    if (!token) {
      logger.warn(' Token FCM manquant', {
        userId: req.user.id,
        ip: req.ip
      });
      console.log('[NotificationController] [registerToken] Token manquant');
      return res.status(400).json({
        success: false,
        error: 'Le token FCM est requis'
      });
    }

    if (!platform || !['android', 'ios'].includes(platform)) {
      logger.warn(' Plateforme invalide', {
        userId: req.user.id,
        platform,
        ip: req.ip
      });
      console.log('[NotificationController] [registerToken] Plateforme invalide');
      return res.status(400).json({
        success: false,
        error: 'La plateforme doit être "android" ou "ios"'
      });
    }

    await notificationService.registerToken(userId, token, platform);

    logger.info(' Token FCM enregistré avec succès', {
      userId,
      platform,
      tokenPrefix: token.substring(0, 20) + '...'
    });
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
    logger.error(' Erreur enregistrement token FCM', {
      error: {
        message: error.message,
        stack: error.stack
      },
      userId: req.user?.id,
      platform: req.body.platform,
      ip: req.ip
    });
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
  logger.info(' Suppression token FCM - Début', {
    userId: req.user.id,
    ip: req.ip
  });
  console.log('[NotificationController] [removeToken] Début', {
    userId: req.user.id,
    body: req.body
  });

  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      logger.warn(' Token FCM manquant pour suppression', {
        userId: req.user.id,
        ip: req.ip
      });
      console.log('[NotificationController] [removeToken] Token manquant');
      return res.status(400).json({
        success: false,
        error: 'Le token FCM est requis'
      });
    }

    await notificationService.removeToken(userId, token);

    logger.info(' Token FCM supprimé avec succès', {
      userId,
      tokenPrefix: token.substring(0, 20) + '...'
    });
    logger.info('Token FCM supprimé', { userId });
    console.log('[NotificationController] [removeToken] Succès');

    res.json({
      success: true,
      message: 'Token supprimé avec succès'
    });
  } catch (error) {
    logger.error(' Erreur suppression token FCM', {
      error: {
        message: error.message,
        stack: error.stack
      },
      userId: req.user?.id,
      ip: req.ip
    });
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
  logger.info(' Récupération historique notifications - Début', {
    userId: req.user.id,
    page: req.query.page,
    limit: req.query.limit,
    ip: req.ip
  });
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

    logger.info(' Historique notifications récupéré avec succès', {
      userId,
      count: result.notifications.length,
      page,
      limit
    });
    console.log('[NotificationController] [getHistory] Succès', {
      count: result.notifications.length
    });

    res.json({
      success: true,
      data: result.notifications,
      pagination: result.pagination
    });
  } catch (error) {
    logger.error(' Erreur récupération historique notifications', {
      error: {
        message: error.message,
        stack: error.stack
      },
      userId: req.user?.id,
      page: req.query.page,
      limit: req.query.limit,
      ip: req.ip
    });
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
  logger.info(' Envoi notification test - Début', {
    userId: req.user.id,
    targetUserId: req.body.userId,
    title: req.body.title,
    ip: req.ip
  });
  console.log('[NotificationController] [sendTestNotification] Début', {
    userId: req.user.id,
    body: req.body
  });

  try {
    const { title, body, userId } = req.body;

    if (!title || !body) {
      logger.warn(' Titre ou corps manquant pour notification test', {
        userId: req.user.id,
        title,
        body,
        ip: req.ip
      });
      return res.status(400).json({
        success: false,
        error: 'Le titre et le corps sont requis'
      });
    }

    // Déterminer les tokens cibles
    logger.debug(' Recherche tokens cibles', { userId, targetUserId: userId });
    let tokens;
    if (userId) {
      tokens = await notificationService.getUserTokens(userId);
    } else {
      tokens = await notificationService.getStaffTokens();
    }

    if (tokens.length === 0) {
      logger.warn(' Aucun token trouvé pour notification test', {
        targetUserId: userId || 'staff',
        tokenCount: 0
      });
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

    logger.info(' Notification test envoyée avec succès', {
      targetUserId: userId || 'staff',
      tokenCount: tokens.length,
      successCount: response?.successCount,
      failureCount: response?.failureCount,
      sentBy: req.user.id
    });
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
    logger.error(' Erreur envoi notification test', {
      error: {
        message: error.message,
        stack: error.stack
      },
      sentBy: req.user?.id,
      targetUserId: req.body.userId,
      ip: req.ip
    });
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