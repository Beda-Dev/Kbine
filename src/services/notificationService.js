/**
 * Service de gestion des notifications Firebase Cloud Messaging
 * 
 * Ce service gère:
 * - L'enregistrement/suppression des tokens FCM
 * - L'envoi de notifications push
 * - L'historique des notifications
 * - La gestion des tokens invalides
 */

const { messaging, isFirebaseInitialized, getMessaging } = require('../config/firebase');
const db = require('../config/database');
const logger = require('../utils/logger');

class NotificationService {
  
  // =========================================================
  // GESTION DES TOKENS FCM
  // =========================================================
  
  /**
   * Enregistrer un token FCM pour un utilisateur
   */
  async registerToken(userId, token, platform) {
    console.log('[NotificationService] Enregistrement token', { userId, platform });
    
    try {
      await db.execute(
        `INSERT INTO fcm_tokens (user_id, token, platform)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE 
         platform = VALUES(platform),
         is_active = TRUE,
         updated_at = CURRENT_TIMESTAMP`,
        [userId, token, platform]
      );

      logger.info('✅ Token FCM enregistré', { userId, platform });
      console.log('[NotificationService] ✅ Token enregistré avec succès');
      
      return { success: true, message: 'Token enregistré avec succès' };
    } catch (error) {
      logger.error('❌ Erreur enregistrement token', {
        error: error.message,
        userId,
        platform
      });
      throw error;
    }
  }

  /**
   * Supprimer un token FCM (déconnexion)
   */
  async removeToken(userId, token) {
    console.log('[NotificationService] Suppression token', { userId });
    
    try {
      await db.execute(
        `UPDATE fcm_tokens 
         SET is_active = FALSE 
         WHERE user_id = ? AND token = ?`,
        [userId, token]
      );

      logger.info('🗑️ Token FCM supprimé', { userId });
      console.log('[NotificationService] 🗑️ Token supprimé');
      
      return { success: true, message: 'Token supprimé avec succès' };
    } catch (error) {
      logger.error('❌ Erreur suppression token', {
        error: error.message,
        userId
      });
      throw error;
    }
  }

  /**
   * Obtenir tous les tokens actifs d'un utilisateur
   */
  async getUserTokens(userId) {
    console.log('[NotificationService] Récupération tokens utilisateur', { userId });
    
    try {
      const [tokens] = await db.execute(
        `SELECT token FROM fcm_tokens 
         WHERE user_id = ? AND is_active = TRUE`,
        [userId]
      );

      const tokenList = tokens.map(row => row.token);
      console.log('[NotificationService] Tokens trouvés:', tokenList.length);
      
      return tokenList;
    } catch (error) {
      logger.error('❌ Erreur récupération tokens', {
        error: error.message,
        userId
      });
      return [];
    }
  }

  /**
   * Obtenir tous les tokens du staff/admin
   */
  async getStaffTokens() {
    console.log('[NotificationService] Récupération tokens staff');
    
    try {
      const [tokens] = await db.execute(`
        SELECT DISTINCT t.token 
        FROM fcm_tokens t
        JOIN users u ON t.user_id = u.id
        WHERE u.role IN ('admin', 'staff') AND t.is_active = TRUE
      `);

      const tokenList = tokens.map(row => row.token);
      console.log('[NotificationService] Tokens staff trouvés:', tokenList.length);
      
      return tokenList;
    } catch (error) {
      logger.error('❌ Erreur récupération tokens staff', {
        error: error.message
      });
      return [];
    }
  }

  // =========================================================
  // ENVOI DE NOTIFICATIONS
  // =========================================================

  /**
   * Envoyer une notification à des tokens spécifiques
   */
  async sendToTokens(tokens, notification, data = {}) {
    console.log('[NotificationService] Envoi notification', {
      tokenCount: tokens.length,
      title: notification.title
    });

    // Vérifier que Firebase est initialisé
    if (!isFirebaseInitialized()) {
      logger.warn('⚠️  Firebase non initialisé - notifications désactivées');
      console.log('[NotificationService] ⚠️  Firebase non initialisé');
      return null;
    }

    if (!tokens || tokens.length === 0) {
      console.log('[NotificationService] ⚠️  Aucun token disponible');
      return null;
    }

    try {
      const message = {
        notification: {
          title: notification.title,
          body: notification.body
        },
        data: {
          ...data,
          timestamp: Date.now().toString()
        },
        tokens: tokens,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: 'kbine_channel'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        }
      };

      const response = await messaging.sendMulticast(message);

      // Gérer les tokens invalides
      if (response.failureCount > 0) {
        await this._handleFailedTokens(tokens, response.responses);
      }

      logger.info('✅ Notification envoyée', {
        successCount: response.successCount,
        failureCount: response.failureCount,
        totalTokens: tokens.length
      });

      console.log('[NotificationService] ✅ Notification envoyée:', {
        success: response.successCount,
        failed: response.failureCount
      });

      return response;
    } catch (error) {
      logger.error('❌ Erreur envoi notification', {
        error: error.message,
        tokenCount: tokens.length
      });
      throw error;
    }
  }

  /**
   * Gérer les tokens invalides/expirés
   */
  async _handleFailedTokens(tokens, responses) {
    console.log('[NotificationService] Vérification tokens invalides');
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      if (!response.success) {
        const token = tokens[i];
        const error = response.error;

        // Codes d'erreur FCM indiquant un token invalide
        const invalidTokenErrors = [
          'messaging/invalid-registration-token',
          'messaging/registration-token-not-registered',
          'messaging/invalid-argument'
        ];

        if (invalidTokenErrors.includes(error.code)) {
          try {
            await db.execute(
              `UPDATE fcm_tokens SET is_active = FALSE WHERE token = ?`,
              [token]
            );
            
            logger.info('🗑️ Token invalide supprimé', {
              tokenPreview: token.substring(0, 20) + '...',
              errorCode: error.code
            });
          } catch (dbError) {
            logger.error('❌ Erreur suppression token invalide', {
              error: dbError.message
            });
          }
        }
      }
    }
  }

  // =========================================================
  // NOTIFICATIONS MÉTIER
  // =========================================================

  /**
   * 🆕 Notifier le staff d'un nouveau paiement réussi
   */
  async notifyPaymentSuccess(payment, order) {
    console.log('[NotificationService] Notification paiement réussi', {
      orderId: order.id,
      amount: payment.amount
    });

    try {
      // ✅ CORRECTION: Vérifier si Firebase est initialisé
      if (!isFirebaseInitialized()) {
        console.log('[NotificationService] ℹ️  Firebase non initialisé - notification ignorée');
        logger.warn('Firebase non initialisé - notification de paiement non envoyée', {
          paymentId: payment.id,
          orderId: order.id
        });
        return { success: false, reason: 'Firebase not initialized' };
      }

      const messaging = getMessaging();
      const tokens = await this.getStaffTokens();

      const notification = {
        title: '💰 Paiement reçu',
        body: `Paiement de ${payment.amount}F reçu - Commande #${order.order_reference}`
      };

      const data = {
        type: 'payment_success',
        orderId: order.id.toString(),
        orderReference: order.order_reference,
        amount: payment.amount.toString(),
        paymentMethod: payment.payment_method,
        customerPhone: order.phone_number
      };

      await this.sendToTokens(tokens, notification, data);

      // Enregistrer en base pour tous les staff
      await this._saveNotificationForStaff(
        notification.title,
        notification.body,
        'payment_success',
        data
      );

      logger.info('✅ Notification paiement envoyée', {
        orderId: order.id,
        tokenCount: tokens.length
      });
      

    } catch (error) {
      logger.error('❌ Erreur notification paiement', {
        error: error.message,
        orderId: order.id
      });
    }
  }

  /**
   * Notifier le client que sa commande est terminée
   */
  async notifyOrderCompleted(order) {
    console.log('[NotificationService] Notification commande terminée', {
      orderId: order.id,
      userId: order.user_id
    });

    try {
      const tokens = await this.getUserTokens(order.user_id);

      const notification = {
        title: '✅ Commande terminée',
        body: `Votre commande #${order.order_reference} a été traitée avec succès`
      };

      const data = {
        type: 'order_completed',
        orderId: order.id.toString(),
        orderReference: order.order_reference,
        status: order.status,
        amount: order.amount.toString()
      };

      await this.sendToTokens(tokens, notification, data);

      // Enregistrer en base
      await this._saveNotification(
        order.user_id,
        notification.title,
        notification.body,
        'order_completed',
        data
      );

      logger.info('✅ Notification commande terminée envoyée', {
        orderId: order.id,
        userId: order.user_id,
        tokenCount: tokens.length
      });

    } catch (error) {
      logger.error('❌ Erreur notification commande terminée', {
        error: error.message,
        orderId: order.id
      });
    }
  }

  // =========================================================
  // HISTORIQUE DES NOTIFICATIONS
  // =========================================================

  /**
   * Enregistrer une notification en base pour un utilisateur
   */
  async _saveNotification(userId, title, body, type, data) {
    try {
      await db.execute(
        `INSERT INTO notifications (user_id, title, body, type, data, is_sent, sent_at)
         VALUES (?, ?, ?, ?, ?, TRUE, NOW())`,
        [userId, title, body, type, JSON.stringify(data)]
      );

      console.log('[NotificationService] Notification enregistrée en base', { userId });
    } catch (error) {
      logger.error('❌ Erreur sauvegarde notification', {
        error: error.message,
        userId
      });
    }
  }

  /**
   * Enregistrer une notification pour tous les membres du staff
   */
  async _saveNotificationForStaff(title, body, type, data) {
    try {
      const [staffUsers] = await db.execute(`
        SELECT id FROM users WHERE role IN ('admin', 'staff')
      `);

      for (const user of staffUsers) {
        await this._saveNotification(user.id, title, body, type, data);
      }

      console.log('[NotificationService] Notifications staff enregistrées', {
        count: staffUsers.length
      });
    } catch (error) {
      logger.error('❌ Erreur sauvegarde notifications staff', {
        error: error.message
      });
    }
  }

  /**
   * Récupérer l'historique des notifications d'un utilisateur
   */
  async getNotificationHistory(userId, page = 1, limit = 20) {
    console.log('[NotificationService] Récupération historique', { userId, page, limit });

    try {
      const offset = (page - 1) * limit;

      const [notifications] = await db.execute(
        `SELECT id, title, body, type, data, sent_at, created_at
         FROM notifications 
         WHERE user_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      );

      const [totalCount] = await db.execute(
        `SELECT COUNT(*) as count FROM notifications WHERE user_id = ?`,
        [userId]
      );

      // Parser les données JSON
      const formattedNotifications = notifications.map(notif => ({
        ...notif,
        data: notif.data ? JSON.parse(notif.data) : null
      }));

      return {
        notifications: formattedNotifications,
        pagination: {
          page,
          limit,
          total: totalCount[0].count,
          hasMore: offset + notifications.length < totalCount[0].count
        }
      };
    } catch (error) {
      logger.error('❌ Erreur récupération historique', {
        error: error.message,
        userId
      });
      throw error;
    }
  }
}

module.exports = new NotificationService();