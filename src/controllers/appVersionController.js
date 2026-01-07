// FILE: appVersionController.js
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Récupère la version de l'application par plateforme
 * GET /api/app/version?platform={platform}
 */
// Dans appVersionController.js - Amélioration de getAppVersion
const getAppVersion = async (req, res) => {
    const context = '[AppVersionController] [getAppVersion]';
    
    try {
        // ✅ Les données sont déjà validées par le middleware
        const { platform } = req.query;
        
        logger.info('📱 Récupération version application - Début', {
            platform,
            ip: req.ip
        });
        console.log(`${context} Requête reçue`, { platform });
        
        // Plus besoin de revalider ici, c'est déjà fait dans le middleware
        
        // Récupérer la configuration de version
        logger.debug(' Requête données de version', { platform });
        console.log(`${context} Récupération des données de version`);
        const [rows] = await db.execute('SELECT * FROM app_version LIMIT 1');
        
        if (rows.length === 0) {
            console.log(`${context} Aucune configuration trouvée`);
            return res.status(404).json({
                success: false,
                error: 'Configuration de version non trouvée'
            });
        }

        const appVersion = rows[0];
        let responseData;

        // Préparer la réponse selon la plateforme
        if (platform.toLowerCase() === 'ios') {
            responseData = {
                version: appVersion.ios_version,
                build_number: appVersion.ios_build_number,
                force_update: Boolean(appVersion.force_update)
            };
        } else {
            responseData = {
                version: appVersion.android_version,
                build_number: appVersion.android_build_number,
                force_update: Boolean(appVersion.force_update)
            };
        }

        logger.info(' Version application récupérée avec succès', {
            platform,
            version: responseData.version,
            buildNumber: responseData.build_number,
            forceUpdate: responseData.force_update
        });
        console.log(`${context} Données préparées pour ${platform}`, responseData);

        res.json({
            success: true,
            data: responseData,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error(`${context} Erreur serveur`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération de la version'
        });
    }
};

/**
 * Met à jour les versions de l'application (admin uniquement)
 * PUT /api/app/version
 */
const updateAppVersion = async (req, res) => {
    const context = '[AppVersionController] [updateAppVersion]';
    
    try {
        const {
            ios_version,
            ios_build_number,
            android_version,
            android_build_number,
            force_update = false
        } = req.body;

        logger.info(' Mise à jour version application - Début', {
            updatedBy: req.user?.id,
            versions: {
                ios_version,
                ios_build_number,
                android_version,
                android_build_number,
                force_update
            }
        });
        console.log(`${context} Données de mise à jour reçues`, {
            ios_version,
            ios_build_number,
            android_version,
            android_build_number,
            force_update
        });

        // Validation des données requises
        if (!ios_version || !ios_build_number || !android_version || !android_build_number) {
            logger.warn(' Données manquantes pour mise à jour version', {
                updatedBy: req.user?.id,
                provided: { ios_version, ios_build_number, android_version, android_build_number }
            });
            console.log(`${context} Données manquantes`);
            return res.status(400).json({
                success: false,
                error: 'Tous les champs de version sont requis'
            });
        }

        // Validation des types
        if (typeof ios_build_number !== 'number' || typeof android_build_number !== 'number') {
            logger.warn(' Types invalides pour mise à jour version', {
                updatedBy: req.user?.id,
                ios_build_number_type: typeof ios_build_number,
                android_build_number_type: typeof android_build_number
            });
            console.log(`${context} Types invalides`);
            return res.status(400).json({
                success: false,
                error: 'Les numéros de build doivent être des nombres'
            });
        }

        // Mettre à jour la configuration
        logger.debug(' Exécution mise à jour BDD', {
            updatedBy: req.user?.id,
            updateData: {
                ios_version,
                ios_build_number,
                android_version,
                android_build_number,
                force_update: Boolean(force_update)
            }
        });
        console.log(`${context} Exécution de la mise à jour`);
        const [result] = await db.execute(
            `UPDATE app_version SET 
                ios_version = ?, 
                ios_build_number = ?,
                android_version = ?,
                android_build_number = ?,
                force_update = ?,
                updated_at = NOW()
            WHERE id = 1`,
            [
                ios_version,
                ios_build_number,
                android_version,
                android_build_number,
                Boolean(force_update)
            ]
        );

        if (result.affectedRows === 0) {
            logger.warn(' Aucune ligne mise à jour', {
                updatedBy: req.user?.id,
                affectedRows: result.affectedRows
            });
            console.log(`${context} Aucune ligne mise à jour`);
            return res.status(404).json({
                success: false,
                error: 'Configuration de version non trouvée'
            });
        }

        // Récupérer les données mises à jour
        const [updatedRows] = await db.execute('SELECT * FROM app_version LIMIT 1');
        const updatedVersion = updatedRows[0];

        const responseData = {
            ios_version: updatedVersion.ios_version,
            ios_build_number: updatedVersion.ios_build_number,
            android_version: updatedVersion.android_version,
            android_build_number: updatedVersion.android_build_number,
            force_update: Boolean(updatedVersion.force_update)
        };

        logger.info(' Versions application mises à jour avec succès', {
            updatedBy: req.user?.id,
            newVersions: responseData,
            affectedRows: result.affectedRows
        });
        console.log(`${context} Mise à jour réussie`, responseData);

        res.json({
            success: true,
            message: 'Versions mises à jour avec succès',
            data: responseData
        });

    } catch (error) {
        logger.error(' Erreur mise à jour version application', {
            error: {
                message: error.message,
                stack: error.stack
            },
            updatedBy: req.user?.id,
            body: req.body
        });
        console.error(`${context} Erreur serveur`, {
            error: error.message,
            stack: error.stack,
            body: req.body
        });
        
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la mise à jour des versions'
        });
    }
};

/**
 * Récupère la configuration complète des versions (admin uniquement)
 * GET /api/app/version/config
 */
const getVersionConfig = async (req, res) => {
    const context = '[AppVersionController] [getVersionConfig]';
    
    try {
        logger.info('📱 Récupération configuration complète versions - Début', {
            requestedBy: req.user?.id,
            ip: req.ip
        });
        console.log(`${context} Récupération de la configuration complète`);
        
        const [rows] = await db.execute('SELECT * FROM app_version LIMIT 1');
        
        if (rows.length === 0) {
            console.log(`${context} Aucune configuration trouvée`);
            return res.status(404).json({
                success: false,
                error: 'Configuration de version non trouvée'
            });
        }

        const config = rows[0];
        const responseData = {
            ios_version: config.ios_version,
            ios_build_number: config.ios_build_number,
            android_version: config.android_version,
            android_build_number: config.android_build_number,
            force_update: Boolean(config.force_update),
            updated_at: config.updated_at,
            created_at: config.created_at
        };

        logger.info('📱 Configuration complète récupérée avec succès', {
            requestedBy: req.user?.id,
            configKeys: Object.keys(responseData)
        });
        console.log(`${context} Configuration récupérée avec succès`);
        
        res.json({
            success: true,
            data: responseData
        });

    } catch (error) {
        console.error(`${context} Erreur serveur`, {
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération de la configuration'
        });
    }
};

module.exports = {
    getAppVersion,
    updateAppVersion,
    getVersionConfig
};