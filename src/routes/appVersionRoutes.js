// ==========================================
// FILE: appVersionRoutes.js (CORRIGÉ)
// ==========================================
const express = require('express');
const router = express.Router();
const appVersionController = require('../controllers/appVersionController');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { getVersionValidation, updateVersionValidation } = require('../validators/appVersionValidator');

/**
 * Routes pour la gestion des versions d'application
 * 
 * ORDRE CRITIQUE:
 * 1. Routes spécifiques AVANT les routes générales
 * 2. Routes protégées APRÈS les routes publiques
 */

// ==========================================
// ROUTES PUBLIQUES (sans authentification)
// ==========================================

/**
 * ✅ CORRECTION: Route spécifique AVANT la route générale
 * Récupère la configuration complète des versions
 * GET /api/app/version/config
 * Admin uniquement
 */
router.get('/version/config', 
    authenticateToken,
    requireRole(['admin']),
    appVersionController.getVersionConfig
);

/**
 * Récupère la version de l'application par plateforme
 * GET /api/app/version?platform={platform}
 * Accessible sans authentification
 */
router.get('/version', 
    (req, res, next) => {
        console.log('[AppVersionRoutes] GET /version - Validation query params', { query: req.query });
        
        // ✅ CORRECTION: Récupérer aussi 'value' pour les données validées
        const { error, value } = getVersionValidation(req.query);
        
        if (error) {
            console.log('[AppVersionRoutes] Erreur de validation', {
                error: error.message,
                details: error.details
            });
            
            return res.status(400).json({
                success: false,
                error: 'Paramètres de requête invalides',
                details: error.details.map(d => d.message)
            });
        }
        
        // ✅ CORRECTION: Remplacer req.query par les données validées
        req.query = value;
        console.log('[AppVersionRoutes] Validation réussie', { validatedQuery: value });
        
        next();
    },
    appVersionController.getAppVersion
);

// ==========================================
// ROUTES PROTÉGÉES - ADMIN UNIQUEMENT
// ==========================================

/**
 * Met à jour les versions de l'application
 * PUT /api/app/version
 * Admin uniquement
 */
router.put('/version',
    authenticateToken,
    requireRole(['admin']),
    (req, res, next) => {
        console.log('[AppVersionRoutes] PUT /version - Validation body', { body: req.body });
        
        // ✅ CORRECTION: Récupérer aussi 'value' pour les données validées
        const { error, value } = updateVersionValidation(req.body);
        
        if (error) {
            console.log('[AppVersionRoutes] Erreur de validation', {
                error: error.message,
                details: error.details
            });
            
            return res.status(400).json({
                success: false,
                error: 'Données de mise à jour invalides',
                details: error.details.map(d => d.message)
            });
        }
        
        // ✅ CORRECTION: Utiliser les données validées et nettoyées
        req.body = value;
        console.log('[AppVersionRoutes] Validation réussie', { validatedBody: value });
        
        next();
    },
    appVersionController.updateAppVersion
);

module.exports = router;