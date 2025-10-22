// FILE: appVersionRoutes.js
const express = require('express');
const router = express.Router();
const appVersionController = require('../controllers/appVersionController');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const { getVersionValidation, updateVersionValidation } = require('../validators/appVersionValidator');

/**
 * Routes pour la gestion des versions d'application
 */

/**
 * Récupère la version de l'application par plateforme
 * GET /api/app/version?platform={platform}
 * Accessible sans authentification
 */
router.get('/version', 
    (req, res, next) => {
        const { error } = getVersionValidation(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Paramètres de requête invalides',
                details: error.details.map(d => d.message)
            });
        }
        next();
    },
    appVersionController.getAppVersion
);

/**
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
 * Met à jour les versions de l'application
 * PUT /api/app/version
 * Admin uniquement
 */
router.put('/version',
    authenticateToken,
    requireRole(['admin']),
    (req, res, next) => {
        const { error, value } = updateVersionValidation(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                error: 'Données de mise à jour invalides',
                details: error.details.map(d => d.message)
            });
        }
        req.body = value;
        next();
    },
    appVersionController.updateAppVersion
);

module.exports = router;