/**
 * Controller d'authentification amélioré
 * 
 * Ce contrôleur gère l'authentification des utilisateurs via:
 * - Login avec création automatique de compte
 * - Refresh des tokens JWT
 * - Déconnexion avec invalidation des sessions
 * 
 * Utilise les services:
 * - userService pour les opérations utilisateurs
 * - logger pour les traces
 * - jwt utils pour la gestion des tokens
 */

const userService = require('../services/userService');
const logger = require('../utils/logger');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const db = require('../config/database');
const jwt = require('jsonwebtoken');


/**
 * POST /api/auth/login
 * Authentification par numéro de téléphone avec création automatique
 */
const login = async (req, res) => {
  logger.info('🔐 Connexion utilisateur - Début', {
    phoneNumber: req.body.phoneNumber,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  console.log('=== Début de la fonction login ===');
  console.log('Corps de la requête reçu:', req.body);
  
  try {
    const { phoneNumber, full_name } = req.body;
    console.log('Tentative de connexion avec le numéro:', phoneNumber);

    // Validation des données d'entrée
    if (!phoneNumber) {
      logger.warn('🔐 Connexion: Numéro de téléphone manquant', {
        ip: req.ip,
        body: req.body
      });
      console.error('Erreur: Aucun numéro de téléphone fourni');
      return res.status(400).json({ error: 'Numéro de téléphone requis' });
    }

    // Recherche de l'utilisateur existant
    logger.debug('🔐 Recherche utilisateur existant', { phoneNumber });
    console.log('Recherche de l\'utilisateur par numéro de téléphone');
    let user = await userService.findByPhoneNumber(phoneNumber);
    let isNewUser = false;
    console.log('Utilisateur trouvé:', user ? 'Oui' : 'Non');

    if (!user) {
      try {
        // Création d'un nouvel utilisateur avec full_name optionnel
        user = await userService.create({
          phoneNumber: phoneNumber,
          full_name: full_name || null,
          role: 'client'
        });
        isNewUser = true;

        logger.info('👤 Nouvel utilisateur créé lors connexion', {
          userId: user.id,
          phoneNumber: user.phone_number,
          full_name: user.full_name,
          ip: req.ip
        });

        logger.info('Nouvel utilisateur créé lors du login', {
          userId: user.id,
          phoneNumber: user.phone_number,
          full_name: user.full_name
        });

      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          // Gérer le cas de course (race condition)
          user = await userService.findByPhoneNumber(phoneNumber);
        } else {
          throw error;
        }

      }

    } else {
      logger.info('👤 Utilisateur existant connecté', {
        userId: user.id,
        phoneNumber: user.phone_number,
        ip: req.ip
      });
      logger.info('Utilisateur existant connecté', {
        userId: user.id,
        phoneNumber: user.phone_number
      });
    }

    // Génération des tokens
    logger.debug('🔐 Génération tokens JWT', { userId: user.id });
    console.log('Génération des tokens pour l\'utilisateur ID:', user.id);
    const token = generateToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);
    console.log('Tokens générés avec succès');

    // Calcul de la date d'expiration (24h)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Sauvegarde de la session en base de données
    logger.debug('🔐 Sauvegarde session BDD', {
      userId: user.id,
      expiresAt: expiresAt.toISOString()
    });
    console.log('Sauvegarde de la session en base de données');
    try {
      await db.execute(
        'INSERT INTO sessions (user_id, token, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
        [user.id, token, refreshToken, expiresAt]
      );
      logger.info('🔐 Session sauvegardée avec succès', { userId: user.id });
      console.log('Session sauvegardée avec succès');
    } catch (dbError) {
      logger.error('🔐 Erreur sauvegarde session', {
        error: dbError.message,
        userId: user.id
      });
      console.error('Erreur lors de la sauvegarde de la session:', dbError);
      throw dbError;
    }

    // Réponse avec les informations utilisateur et tokens
    const responseData = {
      token: token,
      // refreshToken: refreshToken,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        full_name: user.full_name || null,
        role: user.role,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      },
      // isNewUser: isNewUser
    };
    
    logger.info('🔐 Connexion réussie', {
      userId: user.id,
      phoneNumber: user.phone_number,
      role: user.role,
      isNewUser,
      ip: req.ip
    });
    
    console.log('Réponse de connexion préparée:', {
      userId: user.id,
      phoneNumber: user.phone_number,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isNewUser: isNewUser
    });
    
    return res.status(200).json(responseData);

  } catch (error) {
    logger.error('🔐 Erreur lors connexion', {
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      phoneNumber: req.body.phoneNumber,
      ip: req.ip,
      body: req.body
    });
    console.error('=== ERREUR LORS DU LOGIN ===');
    console.error('Erreur détaillée:', error);
    console.error('Stack trace:', error.stack);
    logger.error('Erreur lors du login:', error);
    
    // Log plus détaillé pour les erreurs de base de données
    if (error.sql) {
      console.error('Erreur SQL:', error.sql);
      console.error('Paramètres SQL:', error.parameters);
    }
    
    return res.status(500).json({ 
      error: 'Erreur serveur lors de la connexion',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * POST /api/auth/refresh
 * Rafraîchissement du token JWT
 */
const refreshToken = async (req, res) => {
  logger.info('🔄 Rafraîchissement token - Début', {
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  try {
    const { refreshToken: tokenToRefresh } = req.body;

    // Validation des données d'entrée
    if (!tokenToRefresh) {
      logger.warn('🔄 Refresh token manquant', { ip: req.ip });
      return res.status(400).json({ error: 'Refresh token requis' });
    }

    // Vérification du refresh token
    logger.debug('🔄 Vérification refresh token');
    const decoded = verifyRefreshToken(tokenToRefresh);

    // Recherche de la session active
    logger.debug('🔄 Recherche session active', { refreshToken: tokenToRefresh.substring(0, 20) + '...' });
    const [sessions] = await db.execute(
      'SELECT * FROM sessions WHERE refresh_token = ? AND expires_at > NOW()',
      [tokenToRefresh]
    );

    if (sessions.length === 0) {
      logger.warn('🔄 Session expirée ou invalide', {
        refreshToken: tokenToRefresh.substring(0, 20) + '...',
        ip: req.ip
      });
      return res.status(401).json({ error: 'Session expirée ou invalide' });
    }

    const session = sessions[0];
    logger.debug('🔄 Session trouvée', { sessionId: session.id, userId: session.user_id });
    const user = await userService.findById(session.user_id);

    if (!user) {
      logger.warn('🔄 Utilisateur non trouvé', { userId: session.user_id });
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    // Génération de nouveaux tokens
    logger.debug('🔄 Génération nouveaux tokens', { userId: user.id });
    const newToken = generateToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id);

    // Calcul de la nouvelle date d'expiration (24h)
    const newExpiresAt = new Date();
    newExpiresAt.setHours(newExpiresAt.getHours() + 24);

    // Mise à jour de la session
    logger.debug('🔄 Mise à jour session', { sessionId: session.id });
    await db.execute(
      'UPDATE sessions SET token = ?, refresh_token = ?, expires_at = ? WHERE id = ?',
      [newToken, newRefreshToken, newExpiresAt, session.id]
    );

    logger.info('🔄 Token rafraîchi avec succès', {
      userId: user.id,
      sessionId: session.id,
      ip: req.ip
    });
    logger.info('Token rafraîchi', { userId: user.id });

    return res.status(200).json({
      token: newToken,
      // refreshToken: newRefreshToken,
      user: {
        id: user.id,
        phone_number: user.phone_number,
        full_name: user.full_name || null,
        role: user.role,
        created_at: user.createdAt,
        updated_at: user.updatedAt
      }
    });

  } catch (error) {
    logger.error('🔄 Erreur rafraîchissement token', {
      error: {
        message: error.message,
        stack: error.stack
      },
      ip: req.ip
    });
    logger.error('Erreur lors du refresh token:', error);
    return res.status(500).json({ error: 'Erreur serveur lors du rafraîchissement' });
  }
};

/**
 * POST /api/auth/logout
 * Déconnexion utilisateur avec invalidation des sessions
 */
const logout = async (req, res) => {
  logger.info('🚪 Déconnexion utilisateur - Début', {
    ip: req.ip,
    hasRefreshToken: !!req.body.refreshToken,
    hasAuthToken: !!req.headers.authorization
  });
  try {
    const { refreshToken: tokenToInvalidate } = req.body;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (tokenToInvalidate) {
      // Invalidation de la session spécifique
      logger.debug('🚪 Invalidation session spécifique', {
        refreshToken: tokenToInvalidate.substring(0, 20) + '...'
      });
      await db.execute(
        'DELETE FROM sessions WHERE refresh_token = ?',
        [tokenToInvalidate]
      );
    } else if (token) {
      // Invalidation de toutes les sessions de l'utilisateur
      logger.debug('🚪 Invalidation toutes sessions utilisateur');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'kbine_secret_key');
      await db.execute(
        'DELETE FROM sessions WHERE user_id = ?',
        [decoded.userId]
      );
    }

    logger.info('🚪 Utilisateur déconnecté avec succès', { ip: req.ip });
    logger.info('Utilisateur déconnecté');

    return res.status(200).json({
      message: 'Déconnexion réussie'
    });

  } catch (error) {
    logger.error('🚪 Erreur déconnexion', {
      error: {
        message: error.message,
        stack: error.stack
      },
      ip: req.ip
    });
    logger.error('Erreur lors du logout:', error);
    return res.status(500).json({ error: 'Erreur serveur lors de la déconnexion' });
  }
};

module.exports = {
  login,
  refreshToken,
  logout
};