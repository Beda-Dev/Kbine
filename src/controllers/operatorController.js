// ==========================================
// FILE: operatorController.js
// ==========================================
const operatorsService = require('../services/operatorsService');
const logger = require('../utils/logger');

/**
 * Récupère tous les opérateurs
 * @route GET /api/operators
 */
const getAllOperators = async (req, res, next) => {
    logger.info('📡 Récupération tous opérateurs - Début', {
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    try {
        logger.debug('[OperatorController] [getAllOperators] Récupération des opérateurs');
        
        const operators = await operatorsService.findAll();
        
        logger.info('📡 Opérateurs récupérés avec succès', {
            count: operators.length,
            ip: req.ip
        });
        
        res.json({
            success: true,
            count: operators.length,
            data: operators
        });
    } catch (error) {
        logger.error('📡 Erreur récupération opérateurs', {
            error: {
                message: error.message,
                stack: error.stack
            },
            ip: req.ip
        });
        logger.error('[OperatorController] [getAllOperators] Erreur', {
            error: error.message
        });
        next(error);
    }
};

/**
 * Récupère un opérateur par son ID
 * @route GET /api/operators/:id
 */
const getOperatorById = async (req, res, next) => {
    logger.info('📡 Récupération opérateur par ID - Début', {
        operatorId: req.params.id,
        ip: req.ip
    });
    try {
        const operatorId = parseInt(req.params.id);
        
        logger.debug('[OperatorController] [getOperatorById] Récupération', {
            operatorId
        });
        
        const operator = await operatorsService.findById(operatorId);
        
        if (!operator) {
            logger.warn('📡 Opérateur non trouvé', {
                operatorId,
                ip: req.ip
            });
            return res.status(404).json({
                success: false,
                error: 'Opérateur non trouvé'
            });
        }
        
        logger.info('📡 Opérateur récupéré avec succès', {
            operatorId,
            operatorName: operator.name,
            ip: req.ip
        });
        
        res.json({
            success: true,
            data: operator
        });
    } catch (error) {
        logger.error('📡 Erreur récupération opérateur par ID', {
            error: {
                message: error.message,
                stack: error.stack
            },
            operatorId: req.params.id,
            ip: req.ip
        });
        logger.error('[OperatorController] [getOperatorById] Erreur', {
            error: error.message,
            operatorId: req.params.id
        });
        next(error);
    }
};

/**
 * Crée un nouvel opérateur
 * @route POST /api/operators
 * @requires admin ou staff
 */
const createOperator = async (req, res, next) => {
    logger.info('📡 Création opérateur - Début', {
        createdBy: req.user?.id,
        operatorData: req.validated || req.body,
        ip: req.ip
    });
    try {
        // Utiliser les données validées par le middleware
        const operatorData = req.validated || req.body;
        
        logger.info('[OperatorController] [createOperator] Création', {
            name: operatorData.name,
            code: operatorData.code
        });
        
        // Vérification de l'unicité du code
        const existingOperator = await operatorsService.findByCode(operatorData.code);
        if (existingOperator) {
            logger.warn('📡 Opérateur avec code existe déjà', {
                code: operatorData.code,
                existingId: existingOperator.id,
                createdBy: req.user?.id,
                ip: req.ip
            });
            return res.status(409).json({
                success: false,
                error: 'Un opérateur avec ce code existe déjà'
            });
        }

        // Création de l'opérateur
        const operator = await operatorsService.create(operatorData);

        logger.info('📡 Opérateur créé avec succès', {
            operatorId: operator.id,
            name: operator.name,
            code: operator.code,
            createdBy: req.user?.id,
            ip: req.ip
        });

        res.status(201).json({
            success: true,
            message: 'Opérateur créé avec succès',
            data: operator
        });
    } catch (error) {
        logger.error('📡 Erreur création opérateur', {
            error: {
                message: error.message,
                stack: error.stack
            },
            createdBy: req.user?.id,
            operatorData: req.validated || req.body,
            ip: req.ip
        });
        logger.error('[OperatorController] [createOperator] Erreur', {
            error: error.message
        });
        next(error);
    }
};

/**
 * Met à jour un opérateur existant
 * @route PUT /api/operators/:id
 * @requires admin ou staff
 */
const updateOperator = async (req, res, next) => {
    logger.info('📡 Mise à jour opérateur - Début', {
        operatorId: req.params.id,
        updatedBy: req.user?.id,
        updateData: req.validated || req.body,
        ip: req.ip
    });
    try {
        const operatorId = parseInt(req.params.id);
        // Utiliser les données validées par le middleware
        const updateData = req.validated || req.body;
        
        logger.info('[OperatorController] [updateOperator] Mise à jour', {
            operatorId,
            fields: Object.keys(updateData)
        });

        // Vérification de l'existence de l'opérateur
        const existingOperator = await operatorsService.findById(operatorId);
        if (!existingOperator) {
            logger.warn('📡 Opérateur non trouvé pour mise à jour', {
                operatorId,
                updatedBy: req.user?.id,
                ip: req.ip
            });
            return res.status(404).json({
                success: false,
                error: 'Opérateur non trouvé'
            });
        }

        // Vérification de l'unicité du code si modifié
        if (updateData.code && updateData.code !== existingOperator.code) {
            const operatorWithSameCode = await operatorsService.findByCode(updateData.code);
            if (operatorWithSameCode) {
                logger.warn('📡 Code opérateur déjà utilisé', {
                    newCode: updateData.code,
                    existingId: operatorWithSameCode.id,
                    operatorId,
                    updatedBy: req.user?.id,
                    ip: req.ip
                });
                return res.status(409).json({
                    success: false,
                    error: 'Un autre opérateur avec ce code existe déjà'
                });
            }
        }

        // Mise à jour de l'opérateur
        const updatedOperator = await operatorsService.update(operatorId, updateData);

        logger.info('📡 Opérateur mis à jour avec succès', {
            operatorId,
            updatedFields: Object.keys(updateData),
            updatedBy: req.user?.id,
            ip: req.ip
        });

        res.json({
            success: true,
            message: 'Opérateur mis à jour avec succès',
            data: updatedOperator
        });
    } catch (error) {
        logger.error('📡 Erreur mise à jour opérateur', {
            error: {
                message: error.message,
                stack: error.stack
            },
            operatorId: req.params.id,
            updatedBy: req.user?.id,
            ip: req.ip
        });
        logger.error('[OperatorController] [updateOperator] Erreur', {
            error: error.message,
            operatorId: req.params.id
        });
        next(error);
    }
};

/**
 * Supprime un opérateur
 * @route DELETE /api/operators/:id
 * @requires admin ou staff
 */
const deleteOperator = async (req, res, next) => {
    logger.info('📡 Suppression opérateur - Début', {
        operatorId: req.params.id,
        deletedBy: req.user?.id,
        ip: req.ip
    });
    try {
        const operatorId = parseInt(req.params.id);
        
        logger.info('[OperatorController] [deleteOperator] Suppression', {
            operatorId
        });

        // Vérification de l'existence de l'opérateur
        const operator = await operatorsService.findById(operatorId);
        if (!operator) {
            logger.warn('📡 Opérateur non trouvé pour suppression', {
                operatorId,
                deletedBy: req.user?.id,
                ip: req.ip
            });
            return res.status(404).json({
                success: false,
                error: 'Opérateur non trouvé'
            });
        }

        // Suppression de l'opérateur
        await operatorsService.deleteById(operatorId);

        logger.info('📡 Opérateur supprimé avec succès', {
            operatorId,
            operatorName: operator.name,
            deletedBy: req.user?.id,
            ip: req.ip
        });

        // 204 No Content ne doit pas avoir de body
        res.status(204).send();
    } catch (error) {
        logger.error('📡 Erreur suppression opérateur', {
            error: {
                message: error.message,
                stack: error.stack
            },
            operatorId: req.params.id,
            deletedBy: req.user?.id,
            ip: req.ip
        });
        logger.error('[OperatorController] [deleteOperator] Erreur', {
            error: error.message,
            operatorId: req.params.id
        });
        
        if (error.message.includes('impossible de supprimer')) {
            logger.warn('📡 Suppression opérateur impossible - Contraintes', {
                operatorId: req.params.id,
                reason: error.message,
                deletedBy: req.user?.id,
                ip: req.ip
            });
            return res.status(400).json({
                success: false,
                error: 'Impossible de supprimer cet opérateur',
                details: error.message
            });
        }
        
        next(error);
    }
};

module.exports = {
    getAllOperators,
    getOperatorById,
    createOperator,
    updateOperator,
    deleteOperator
};
