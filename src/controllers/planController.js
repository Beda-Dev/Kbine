const planService = require('../services/planService');
const logger = require('../utils/logger');

/**
 * Crée un nouveau plan
 */
const createPlan = async (req, res, next) => {
    logger.info('📋 Création plan - Début', {
        planData: req.validated || req.body,
        createdBy: req.user?.id,
        ip: req.ip
    });
    try {
        // Utiliser les données validées par le middleware
        const planData = req.validated || req.body;
        
        logger.info('📋 Création plan en cours', {
            name: planData.name,
            type: planData.type,
            amount: planData.amount,
            createdBy: req.user?.id
        });
        logger.info('[PlanController] [createPlan] Création de plan', {
            name: planData.name,
            type: planData.type
        });
        
        const plan = await planService.create(planData);
        
        logger.info('📋 Plan créé avec succès', {
            planId: plan.id,
            name: plan.name,
            type: plan.type,
            amount: plan.amount,
            createdBy: req.user?.id,
            ip: req.ip
        });
        
        res.status(201).json({
            success: true,
            data: plan
        });
    } catch (error) {
        logger.error('📋 Erreur création plan', {
            error: {
                message: error.message,
                stack: error.stack
            },
            planData: req.validated || req.body,
            createdBy: req.user?.id,
            ip: req.ip
        });
        logger.error('[PlanController] [createPlan] Erreur', {
            error: error.message
        });
        next(error);
    }
};

/**
 * Récupère tous les plans
 */
const getPlans = async (req, res, next) => {
    logger.info('📋 Récupération liste plans - Début', {
        query: req.query,
        userId: req.user?.id,
        ip: req.ip
    });
    try {
        const { includeInactive } = req.query;
        
        logger.debug('📋 Paramètres récupération plans', {
            includeInactive,
            userId: req.user?.id
        });
        logger.debug('[PlanController] [getPlans] Récupération des plans', {
            includeInactive
        });
        
        const plans = await planService.findAll(includeInactive === 'true');
        
        logger.info('📋 Plans récupérés avec succès', {
            count: plans.length,
            includeInactive,
            userId: req.user?.id,
            ip: req.ip
        });
        
        res.json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        logger.error('📋 Erreur récupération plans', {
            error: {
                message: error.message,
                stack: error.stack
            },
            query: req.query,
            userId: req.user?.id,
            ip: req.ip
        });
        logger.error('[PlanController] [getPlans] Erreur', {
            error: error.message
        });
        next(error);
    }
};

/**
 * Récupère un plan par son ID
 */
const getPlanById = async (req, res, next) => {
    logger.info('📋 Récupération plan par ID - Début', {
        planId: req.params.id,
        userId: req.user?.id,
        ip: req.ip
    });
    try {
        const planId = parseInt(req.params.id);
        
        logger.debug('📋 Recherche plan par ID', {
            planId,
            userId: req.user?.id
        });
        logger.debug('[PlanController] [getPlanById] Récupération du plan', {
            planId
        });
        
        const plan = await planService.findById(planId);
        
        if (!plan) {
            logger.warn('📋 Plan non trouvé', {
                planId,
                userId: req.user?.id,
                ip: req.ip
            });
            return res.status(404).json({
                success: false,
                error: 'Plan non trouvé'
            });
        }
        
        logger.info('📋 Plan récupéré avec succès', {
            planId,
            planName: plan.name,
            planType: plan.type,
            userId: req.user?.id,
            ip: req.ip
        });
        
        res.json({
            success: true,
            data: plan
        });
    } catch (error) {
        logger.error('📋 Erreur récupération plan par ID', {
            error: {
                message: error.message,
                stack: error.stack
            },
            planId: req.params.id,
            userId: req.user?.id,
            ip: req.ip
        });
        logger.error('[PlanController] [getPlanById] Erreur', {
            error: error.message,
            planId: req.params.id
        });
        next(error);
    }
};

/**
 * Met à jour un plan
 */
const updatePlan = async (req, res, next) => {
    logger.info('📋 Mise à jour plan - Début', {
        planId: req.params.id,
        updateData: req.validated || req.body,
        updatedBy: req.user?.id,
        ip: req.ip
    });
    try {
        const planId = parseInt(req.params.id);
        // Utiliser les données validées par le middleware
        const updateData = req.validated || req.body;
        
        logger.info('📋 Mise à jour plan en cours', {
            planId,
            fields: Object.keys(updateData),
            updatedBy: req.user?.id
        });
        logger.info('[PlanController] [updatePlan] Mise à jour du plan', {
            planId,
            fields: Object.keys(updateData)
        });
        
        const plan = await planService.update(planId, updateData);
        
        if (!plan) {
            logger.warn('📋 Plan non trouvé pour mise à jour', {
                planId,
                updatedBy: req.user?.id,
                ip: req.ip
            });
            return res.status(404).json({
                success: false,
                error: 'Plan non trouvé'
            });
        }
        
        logger.info('📋 Plan mis à jour avec succès', {
            planId,
            updatedFields: Object.keys(updateData),
            updatedBy: req.user?.id,
            ip: req.ip
        });
        
        res.json({
            success: true,
            data: plan
        });
    } catch (error) {
        logger.error('📋 Erreur mise à jour plan', {
            error: {
                message: error.message,
                stack: error.stack
            },
            planId: req.params.id,
            updateData: req.validated || req.body,
            updatedBy: req.user?.id,
            ip: req.ip
        });
        logger.error('[PlanController] [updatePlan] Erreur', {
            error: error.message,
            planId: req.params.id
        });
        next(error);
    }
};

/**
 * Supprime un plan
 */
const deletePlan = async (req, res, next) => {
    logger.info('📋 Suppression plan - Début', {
        planId: req.params.id,
        deletedBy: req.user?.id,
        ip: req.ip
    });
    try {
        const planId = parseInt(req.params.id);
        
        logger.info('📋 Suppression plan en cours', {
            planId,
            deletedBy: req.user?.id
        });
        logger.info('[PlanController] [deletePlan] Suppression du plan', {
            planId
        });
        
        const success = await planService.deleteById(planId);
        
        if (!success) {
            logger.warn('📋 Plan non trouvé pour suppression', {
                planId,
                deletedBy: req.user?.id,
                ip: req.ip
            });
            return res.status(404).json({
                success: false,
                error: 'Plan non trouvé'
            });
        }
        
        logger.info('📋 Plan supprimé avec succès', {
            planId,
            deletedBy: req.user?.id,
            ip: req.ip
        });
        
        // 204 No Content ne doit pas avoir de body
        res.status(204).send();
    } catch (error) {
        logger.error('📋 Erreur suppression plan', {
            error: {
                message: error.message,
                stack: error.stack
            },
            planId: req.params.id,
            deletedBy: req.user?.id,
            ip: req.ip
        });
        logger.error('[PlanController] [deletePlan] Erreur', {
            error: error.message,
            planId: req.params.id
        });
        next(error);
    }
};

/**
 * Récupère les plans par opérateur
 */
const getPlansByOperator = async (req, res, next) => {
    logger.info('📋 Récupération plans par opérateur - Début', {
        operatorId: req.params.operatorId,
        userId: req.user?.id,
        ip: req.ip
    });
    try {
        const operatorId = parseInt(req.params.operatorId);
        
        logger.debug('📋 Recherche plans par opérateur', {
            operatorId,
            userId: req.user?.id
        });
        logger.debug('[PlanController] [getPlansByOperator] Récupération', {
            operatorId
        });
        
        const plans = await planService.findByOperatorId(operatorId);
        
        logger.info('📋 Plans opérateur récupérés avec succès', {
            operatorId,
            count: plans.length,
            userId: req.user?.id,
            ip: req.ip
        });
        
        res.json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        logger.error('📋 Erreur récupération plans par opérateur', {
            error: {
                message: error.message,
                stack: error.stack
            },
            operatorId: req.params.operatorId,
            userId: req.user?.id,
            ip: req.ip
        });
        logger.error('[PlanController] [getPlansByOperator] Erreur', {
            error: error.message,
            operatorId: req.params.operatorId
        });
        next(error);
    }
};

/**
 * Recherche des plans par numéro de téléphone
 * CORRECTION: Récupérer phoneNumber depuis req.params au lieu de req.body
 */
const findPlansByPhoneNumber = async (req, res, next) => {
    logger.info('📋 Recherche plans par téléphone - Début', {
        phoneNumber: req.params.phoneNumber,
        userId: req.user?.id,
        ip: req.ip
    });
    try {
        const { phoneNumber } = req.params;
        
        logger.debug('📋 Recherche plans par numéro de téléphone', {
            phoneNumber: '***',
            userId: req.user?.id
        });
        logger.debug('[PlanController] [findPlansByPhoneNumber] Recherche', {
            phoneNumber: '***'
        });
        
        const plans = await planService.findByPhoneNumber(phoneNumber);
        
        logger.info('📋 Plans téléphone récupérés avec succès', {
            phoneNumber: '***',
            count: plans.length,
            userId: req.user?.id,
            ip: req.ip
        });
        
        res.json({
            success: true,
            count: plans.length,
            data: plans
        });
    } catch (error) {
        logger.error('📋 Erreur recherche plans par téléphone', {
            error: {
                message: error.message,
                stack: error.stack
            },
            phoneNumber: req.params.phoneNumber,
            userId: req.user?.id,
            ip: req.ip
        });
        logger.error('[PlanController] [findPlansByPhoneNumber] Erreur', {
            error: error.message
        });
        next(error);
    }
};

module.exports = {
    createPlan,
    getPlans,
    getPlanById,
    updatePlan,
    deletePlan,
    getPlansByOperator,
    findPlansByPhoneNumber
};