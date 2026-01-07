/**
 * Contrôleur de gestion des paiements
 * ✅ VERSION CORRIGÉE - TOUS LES PAIEMENTS PASSENT PAR TOUCHPOINT
 */

const logger = require('../utils/logger');
const paymentService = require('../services/paymentService');
const touchpointService = require('../services/touchpointService');
const { PAYMENT_METHODS, PAYMENT_STATUS } = paymentService;

/**
 * @route   POST /api/payments
 * @desc    Créer un nouveau paiement
 * @access  Private
 */
const createPayment = async (req, res, next) => {
    logger.info('💳 Création paiement - Début', {
        paymentData: req.body,
        userId: req.user?.id,
        ip: req.ip
    });
    try {
        console.log('[PaymentController] [createPayment] Début', JSON.stringify(req.body, null, 2));
        const payment = await paymentService.createPayment(req.body);
        
        logger.info('💳 Paiement créé avec succès', {
            paymentId: payment.id,
            orderId: payment.order_id,
            amount: payment.amount,
            method: payment.payment_method,
            userId: req.user?.id,
            ip: req.ip
        });
        console.log('[PaymentController] [createPayment] Succès', { paymentId: payment?.id });
        
        logger.info(`Paiement créé avec succès - ID: ${payment.id}`, { 
            paymentId: payment.id,
            orderId: payment.order_id
        });
        
        res.status(201).json({
            success: true,
            message: 'Paiement créé avec succès',
            data: payment
        });
    } catch (error) {
        logger.error('💳 Erreur création paiement', {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            paymentData: req.body,
            userId: req.user?.id,
            ip: req.ip
        });
        console.log('[PaymentController] [createPayment] Erreur', { message: error.message });
        logger.error('Erreur lors de la création du paiement', { 
            error: error.message,
            stack: error.stack,
            body: req.body 
        });
        
        if (error.message.includes('existe déjà')) {
            return res.status(409).json({
                success: false,
                error: error.message
            });
        }
        
        if (error.message.includes('non trouvée')) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la création du paiement',
            details: error.message
        });
    }
};

/**
 * @route   GET /api/payments
 * @desc    Récupérer tous les paiements avec pagination et filtres
 * @access  Private/Admin
 */
const getPayments = async (req, res, next) => {
    logger.info('💳 Récupération liste paiements - Début', {
        query: req.query,
        userId: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip
    });
    try {
        console.log('[PaymentController] [getPayments] Début', JSON.stringify(req.query, null, 2));
        const { 
            page = 1, 
            limit = 10, 
            status, 
            payment_method, 
            start_date, 
            end_date,
            order_id,
            user_id,
            plan_id
        } = req.query;
        
        logger.debug('💳 Paramètres récupération paiements', {
            page,
            limit,
            status,
            payment_method,
            start_date,
            end_date,
            order_id,
            user_id,
            plan_id
        });
        
        const result = await paymentService.getPayments({
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            payment_method,
            start_date,
            end_date,
            order_id: order_id ? parseInt(order_id) : undefined,
            user_id: user_id ? parseInt(user_id) : undefined,
            plan_id: plan_id ? parseInt(plan_id) : undefined
        });
        
        logger.info('💳 Paiements récupérés avec succès', {
            count: result?.data?.length || 0,
            page: parseInt(page),
            limit: parseInt(limit),
            userId: req.user?.id,
            ip: req.ip
        });
        console.log('[PaymentController] [getPayments] Succès', { count: result?.data?.length || 0 });
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        logger.error('💳 Erreur récupération paiements', {
            error: {
                message: error.message,
                stack: error.stack
            },
            query: req.query,
            userId: req.user?.id,
            ip: req.ip
        });
        console.log('[PaymentController] [getPayments] Erreur', { message: error.message });
        logger.error('Erreur lors de la récupération des paiements', { 
            error: error.message,
            stack: error.stack
        });
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des paiements',
            details: error.message
        });
    }
};

/**
 * @route   GET /api/payments/:id
 * @desc    Récupérer un paiement par son ID
 * @access  Private
 */
const getPaymentById = async (req, res, next) => {
    logger.info('💳 Récupération paiement par ID - Début', {
        paymentId: req.params.id,
        userId: req.user?.id,
        ip: req.ip
    });
    try {
        logger.debug('💳 Recherche paiement par ID', { paymentId: req.params.id });
        console.log('[PaymentController] [getPaymentById] Début', { id: req.params.id });
        const payment = await paymentService.getPaymentById(req.params.id);
        
        logger.info('💳 Paiement récupéré avec succès', {
            paymentId: payment?.id,
            orderId: payment?.order_id,
            userId: req.user?.id,
            ip: req.ip
        });
        console.log('[PaymentController] [getPaymentById] Succès', { id: payment?.id });
        
        res.json({
            success: true,
            data: payment
        });
    } catch (error) {
        logger.error('💳 Erreur récupération paiement par ID', {
            error: {
                message: error.message,
                stack: error.stack
            },
            paymentId: req.params.id,
            userId: req.user?.id,
            ip: req.ip
        });
        console.log('[PaymentController] [getPaymentById] Erreur', { message: error.message });
        logger.error('Erreur lors de la récupération du paiement', { 
            error: error.message,
            stack: error.stack,
            paymentId: req.params.id 
        });
        
        if (error.message.includes('non trouvé')) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération du paiement',
            details: error.message
        });
    }
};

/**
 * @route   PUT /api/payments/:id
 * @desc    Mettre à jour un paiement
 * @access  Private/Admin
 */
const updatePayment = async (req, res, next) => {
    logger.info('💳 Mise à jour paiement - Début', {
        paymentId: req.params.id,
        updateData: req.body,
        updatedBy: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip
    });
    try {
        const { id } = req.params;
        
        logger.debug('💳 Paramètres mise à jour paiement', {
            paymentId: id,
            updateData: req.body,
            updatedBy: req.user?.id
        });
        console.log('[PaymentController] [updatePayment] Début', {
            paymentId: id,
            body: req.body,
            userId: req.user?.id
        });
        
        const paymentId = parseInt(id);
        if (isNaN(paymentId)) {
            logger.warn('💳 ID paiement invalide pour mise à jour', {
                paymentId: id,
                updatedBy: req.user?.id,
                ip: req.ip
            });
            console.log('[PaymentController] [updatePayment] ID invalide');
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide'
            });
        }
        
        const payment = await paymentService.updatePayment(paymentId, req.body);
        
        logger.info('💳 Paiement mis à jour avec succès', {
            paymentId: id,
            updates: req.body,
            updatedBy: req.user?.id,
            ip: req.ip
        });
        console.log('[PaymentController] [updatePayment] Succès', { paymentId: id });
        
        logger.info(`Paiement mis à jour - ID: ${id}`, { 
            paymentId: id,
            updates: req.body
        });
        
        res.json({
            success: true,
            message: 'Paiement mis à jour avec succès',
            data: payment
        });
    } catch (error) {
        logger.error('💳 Erreur mise à jour paiement', {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            paymentId: req.params.id,
            updateData: req.body,
            updatedBy: req.user?.id,
            ip: req.ip
        });
        console.error('[PaymentController] [updatePayment] Erreur', {
            error: error.message,
            stack: error.stack,
            paymentId: req.params.id
        });
        
        logger.error('Erreur lors de la mise à jour du paiement', { 
            error: error.message,
            stack: error.stack,
            paymentId: req.params.id,
            updates: req.body
        });
        
        if (error.message.includes('non trouvé')) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        
        if (error.message.includes('Statut invalide')) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du paiement',
            details: error.message
        });
    }
};

/**
 * @route   DELETE /api/payments/:id
 * @desc    Supprimer un paiement (soft delete)
 * @access  Private/Admin
 */
const deletePayment = async (req, res, next) => {
    logger.info('💳 Suppression paiement - Début', {
        paymentId: req.params.id,
        deletedBy: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip
    });
    try {
        const { id } = req.params;
        
        logger.debug('💳 Paramètres suppression paiement', {
            paymentId: id,
            deletedBy: req.user?.id
        });
        console.log('[PaymentController] [deletePayment] Début', {
            paymentId: id,
            userId: req.user?.id,
            userRole: req.user?.role
        });
        
        const paymentId = parseInt(id);
        if (isNaN(paymentId)) {
            logger.warn('💳 ID paiement invalide pour suppression', {
                paymentId: id,
                deletedBy: req.user?.id,
                ip: req.ip
            });
            console.log('[PaymentController] [deletePayment] ID invalide');
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide'
            });
        }
        
        await paymentService.deletePayment(paymentId);
        
        logger.info('💳 Paiement supprimé avec succès', {
            paymentId: id,
            deletedBy: req.user?.id,
            ip: req.ip
        });
        console.log('[PaymentController] [deletePayment] Succès', { paymentId: id });
        
        logger.info(`Paiement supprimé - ID: ${id}`, { 
            paymentId: id,
            deletedBy: req.user?.id
        });
        
        res.status(204).send();
    } catch (error) {
        logger.error('💳 Erreur suppression paiement', {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            paymentId: req.params.id,
            deletedBy: req.user?.id,
            ip: req.ip
        });
        console.error('[PaymentController] [deletePayment] Erreur', {
            error: error.message,
            stack: error.stack,
            paymentId: req.params.id
        });
        
        logger.error('Erreur lors de la suppression du paiement', {
            error: error.message,
            stack: error.stack,
            paymentId: req.params.id
        });
        
        if (error.message.includes('non trouvé')) {
            return res.status(404).json({
                success: false,
                error: 'Paiement non trouvé'
            });
        }
        
        if (error.message.includes('Impossible de supprimer')) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la suppression du paiement',
            details: error.message
        });
    }
};

/**
 * @route   PATCH /api/payments/:id/status
 * @desc    Mettre à jour le statut d'un paiement
 * @access  Private/Admin
 */
const updatePaymentStatus = async (req, res, next) => {
    logger.info('💳 Mise à jour statut paiement - Début', {
        paymentId: req.params.id,
        newStatus: req.body.status,
        notes: req.body.notes,
        updatedBy: req.user?.id,
        ip: req.ip
    });
    try {
        console.log('[PaymentController] [updatePaymentStatus] Début', { id: req.params.id, body: req.body });
        const { id } = req.params;
        const { status, notes } = req.body;
        
        logger.debug('💳 Appel service mise à jour statut paiement', {
            paymentId: id,
            newStatus: status,
            notes,
            updatedBy: req.user?.id
        });
        const payment = await paymentService.updatePaymentStatus(id, status, notes);
        console.log('[PaymentController] [updatePaymentStatus] Succès', { id });
        
        logger.info(`Statut du paiement mis à jour - ID: ${id}`, { 
            paymentId: id,
            status,
            notes,
            updatedBy: req.user?.id
        });
        
        res.json({
            success: true,
            message: 'Statut du paiement mis à jour avec succès',
            data: payment
        });
    } catch (error) {
        logger.error('💳 Erreur mise à jour statut paiement', {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            paymentId: req.params.id,
            newStatus: req.body.status,
            notes: req.body.notes,
            updatedBy: req.user?.id,
            ip: req.ip
        });
        console.log('[PaymentController] [updatePaymentStatus] Erreur', { message: error.message });
        logger.error('Erreur lors de la mise à jour du statut du paiement', { 
            error: error.message,
            stack: error.stack,
            paymentId: req.params.id,
            status: req.body.status
        });
        
        if (error.message.includes('non trouvé')) {
            logger.warn('💳 Paiement non trouvé pour mise à jour statut', {
                paymentId: req.params.id,
                updatedBy: req.user?.id,
                ip: req.ip
            });
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        
        if (error.message.includes('Statut invalide')) {
            logger.warn('💳 Statut invalide pour mise à jour paiement', {
                paymentId: req.params.id,
                invalidStatus: req.body.status,
                updatedBy: req.user?.id,
                ip: req.ip
            });
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
        
        logger.error('💳 Erreur non gérée mise à jour statut paiement', {
            error: {
                message: error.message,
                stack: error.stack
            },
            paymentId: req.params.id,
            newStatus: req.body.status,
            updatedBy: req.user?.id,
            ip: req.ip
        });
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour du statut',
            details: error.message
        });
    }
};

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Rembourser un paiement
 * @access  Private/Admin
 */
const refundPayment = async (req, res, next) => {
    logger.info('💳 Remboursement paiement - Début', {
        paymentId: req.params.id,
        reason: req.body.reason,
        refundedBy: req.user?.id,
        ip: req.ip
    });
    try {
        console.log('[PaymentController] [refundPayment] Début', { id: req.params.id, body: req.body });
        const { id } = req.params;
        const { reason } = req.body;
        
        logger.debug('💳 Appel service remboursement paiement', {
            paymentId: id,
            reason,
            refundedBy: req.user?.id
        });
        const payment = await paymentService.refundPayment(id, reason);
        console.log('[PaymentController] [refundPayment] Succès', { id });
        
        logger.info('💳 Paiement remboursé avec succès', {
            paymentId: id,
            reason,
            refundedBy: req.user?.id,
            ip: req.ip
        });
        logger.info(`Paiement remboursé - ID: ${id}`, { 
            paymentId: id,
            reason
        });
        
        res.json({
            success: true,
            message: 'Paiement remboursé avec succès',
            data: payment
        });
    } catch (error) {
        logger.error('💳 Erreur remboursement paiement', {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            paymentId: req.params.id,
            reason: req.body.reason,
            refundedBy: req.user?.id,
            ip: req.ip
        });
        console.log('[PaymentController] [refundPayment] Erreur', { message: error.message });
        logger.error('Erreur lors du remboursement du paiement', { 
            error: error.message,
            stack: error.stack,
            paymentId: req.params.id,
            reason: req.body.reason
        });
        
        if (error.message.includes('non trouvé')) {
            logger.warn('💳 Paiement non trouvé pour remboursement', {
                paymentId: req.params.id,
                refundedBy: req.user?.id,
                ip: req.ip
            });
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        
        if (error.message.includes('Seuls les paiements réussis') || 
            error.message.includes('déjà été remboursé')) {
            logger.warn('💳 Remboursement impossible - conditions non remplies', {
                paymentId: req.params.id,
                errorMessage: error.message,
                refundedBy: req.user?.id,
                ip: req.ip
            });
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
        
        logger.error('💳 Erreur non gérée remboursement paiement', {
            error: {
                message: error.message,
                stack: error.stack
            },
            paymentId: req.params.id,
            reason: req.body.reason,
            refundedBy: req.user?.id,
            ip: req.ip
        });
        res.status(500).json({
            success: false,
            error: 'Erreur lors du remboursement',
            details: error.message
        });
    }
};

/**
 * @route   POST /api/payments/initialize
 * @desc    Initialiser un paiement via TouchPoint (Wave, MTN, Orange, Moov)
 * @access  Public
 */
const initializePayment = async (req, res) => {
    logger.info('💳 Initialisation paiement - Début', {
        paymentData: req.body,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    try {
        console.log('[PaymentController] [initializePayment] Début', JSON.stringify(req.body, null, 2));
        
        logger.debug('💳 Appel service initialisation paiement', {
            paymentData: req.body,
            ip: req.ip
        });
        const result = await paymentService.initializePayment(req.body);
        console.log('[PaymentController] [initializePayment] Succès', { 
            payment_id: result?.payment_id, 
            transaction_id: result?.transaction_id 
        });

        logger.info('💳 Paiement initialisé avec succès', {
            paymentId: result.payment_id,
            transactionId: result.transaction_id,
            paymentMethod: result.payment_method,
            ip: req.ip
        });
        logger.info("Paiement initialisé avec succès", {
            paymentId: result.payment_id,
            transactionId: result.transaction_id,
            paymentMethod: result.payment_method,
        });

        res.status(200).json({
            success: true,
            message: "Paiement initialisé avec succès",
            data: result,
        });
    } catch (error) {
        logger.error('💳 Erreur initialisation paiement', {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            paymentData: req.body,
            ip: req.ip
        });
        console.log('[PaymentController] [initializePayment] Erreur', { message: error.message });
        logger.error("Erreur lors de l'initialisation du paiement", {
            error: error.message,
            body: req.body,
        });

        if (error.message.includes("non trouvée")) {
            logger.warn('💳 Commande non trouvée pour initialisation paiement', {
                errorMessage: error.message,
                paymentData: req.body,
                ip: req.ip
            });
            return res.status(404).json({
                success: false,
                error: error.message,
            });
        }

        if (error.message.includes("déjà été payée")) {
            logger.warn('💳 Commande déjà payée pour initialisation paiement', {
                errorMessage: error.message,
                paymentData: req.body,
                ip: req.ip
            });
            return res.status(409).json({
                success: false,
                error: error.message,
            });
        }

        if (error.message.includes("ne correspond pas") || error.message.includes("OTP")) {
            logger.warn('💳 Erreur validation initialisation paiement', {
                errorMessage: error.message,
                paymentData: req.body,
                ip: req.ip
            });
            return res.status(400).json({
                success: false,
                error: error.message,
            });
        }

        logger.error('💳 Erreur non gérée initialisation paiement', {
            error: {
                message: error.message,
                stack: error.stack
            },
            paymentData: req.body,
            ip: req.ip
        });
        res.status(500).json({
            success: false,
            error: "Erreur lors de l'initialisation du paiement",
            details: error.message,
        });
    }
};

/**
 * ✅ SUPPRIMÉ: waveWebhook - Wave passe maintenant par TouchPoint
 * Tous les webhooks passent par TouchPoint
 */

/**
 * @route   POST /api/payments/webhook/touchpoint
 * @desc    Webhook TouchPoint pour notification de paiement
 * @access  Public
 */
const touchpointWebhook = async (req, res) => {
    logger.info('💳 Webhook TouchPoint - Début', {
        webhookData: req.body,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    try {
        console.log('[PaymentController] [touchpointWebhook] Début', JSON.stringify(req.body, null, 2));
        
        logger.debug('💳 Appel service traitement webhook TouchPoint', {
            webhookData: req.body,
            ip: req.ip
        });
        const result = await paymentService.processTouchPointWebhook(req.body);

        logger.info('💳 Webhook TouchPoint traité avec succès', {
            result,
            ip: req.ip
        });
        logger.info("Webhook TouchPoint traité avec succès", { result });
        console.log('[PaymentController] [touchpointWebhook] Succès');

        res.status(200).json({
            success: true,
            message: "Webhook traité avec succès",
        });
    } catch (error) {
        logger.error('💳 Erreur traitement webhook TouchPoint', {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            webhookData: req.body,
            ip: req.ip
        });
        console.log('[PaymentController] [touchpointWebhook] Erreur', { message: error.message });
        logger.error("Erreur traitement webhook TouchPoint", {
            error: error.message,
        });

        res.status(400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * @route   GET /api/payments/status/:order_reference
 * @desc    Vérifier le statut d'un paiement
 * @access  Public
 */
const checkPaymentStatus = async (req, res) => {
    try {
        console.log('[PaymentController] [checkPaymentStatus] Début', { 
            order_reference: req.params.order_reference 
        });
        const { order_reference } = req.params;

        const result = await paymentService.checkPaymentStatus(order_reference);
        console.log('[PaymentController] [checkPaymentStatus] Succès');

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.log('[PaymentController] [checkPaymentStatus] Erreur', { message: error.message });
        logger.error("Erreur vérification statut paiement", {
            error: error.message,
            orderReference: req.params.order_reference,
        });

        if (error.message.includes("Aucun paiement trouvé")) {
            return res.status(404).json({
                success: false,
                error: error.message,
            });
        }

        res.status(500).json({
            success: false,
            error: "Erreur lors de la vérification du statut",
            details: error.message,
        });
    }
};

/**
 * @route   GET /api/payments/user/:user_id
 * @desc    Récupérer tous les paiements d'un utilisateur avec filtres avancés
 * @access  Private
 */
const getUserPayments = async (req, res, next) => {
    try {
        const { user_id } = req.params;
        const { 
            page = 1, 
            limit = 10, 
            status, 
            payment_method,
            date,
            start_date,
            end_date,
            sort_by = 'created_at',
            sort_order = 'DESC'
        } = req.query;

        console.log('[PaymentController] [getUserPayments] Début', {
            userId: user_id,
            filters: { status, payment_method, date, start_date, end_date },
            pagination: { page, limit },
            sort: { sort_by, sort_order }
        });

        const userId = parseInt(user_id, 10);
        if (isNaN(userId)) {
            console.log('[PaymentController] [getUserPayments] ID utilisateur invalide');
            return res.status(400).json({
                success: false,
                error: 'ID utilisateur invalide'
            });
        }

        const result = await paymentService.getUserPayments({
            user_id: userId,
            page: parseInt(page),
            limit: parseInt(limit),
            status,
            payment_method,
            date,
            start_date,
            end_date,
            sort_by,
            sort_order: sort_order.toUpperCase()
        });

        console.log('[PaymentController] [getUserPayments] Succès', { 
            count: result?.data?.length || 0,
            total: result?.pagination?.total
        });

        logger.info('Paiements utilisateur récupérés', {
            userId,
            count: result?.data?.length,
            filters: { status, payment_method, date }
        });

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination
        });
    } catch (error) {
        console.log('[PaymentController] [getUserPayments] Erreur', { 
            message: error.message,
            userId: req.params.user_id
        });

        logger.error('Erreur récupération paiements utilisateur', {
            error: error.message,
            userId: req.params.user_id,
            filters: req.query
        });

        if (error.message.includes('Utilisateur non trouvé')) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des paiements',
            details: error.message
        });
    }
};

/**
 * @route   GET /api/payments/touchpoint/verify/:transaction_id
 * @desc    Vérifier le statut d'une transaction directement depuis TouchPoint (sans mise à jour)
 * @access  Private
 */
const verifyTransactionStatus = async (req, res, next) => {
    try {
        const { transaction_id } = req.params;
        
        console.log('[PaymentController] [verifyTransactionStatus] Début', { 
            transactionId: transaction_id,
            userId: req.user?.id
        });

        const result = await touchpointService.checkTransactionStatus(transaction_id);
        
        console.log('[PaymentController] [verifyTransactionStatus] Succès', { 
            transactionId: transaction_id,
            status: result?.status
        });

        logger.info('Statut TouchPoint vérifié', {
            transactionId: transaction_id,
            status: result?.status,
            verifiedBy: req.user?.id
        });

        res.json({...result});
    } catch (error) {
        console.log('[PaymentController] [verifyTransactionStatus] Erreur', { 
            message: error.message,
            transactionId: req.params.transaction_id
        });

        logger.error('Erreur vérification statut TouchPoint', {
            error: error.message,
            transactionId: req.params.transaction_id,
            userId: req.user?.id
        });

        res.status(500).json({
            success: false,
            error: 'Erreur lors de la vérification du statut auprès de TouchPoint',
            details: error.message
        });
    }
};

// Export des constantes et contrôleurs
module.exports = {
    // Constantes
    PAYMENT_METHODS,
    PAYMENT_STATUS,
    
    // Contrôleurs CRUD basiques
    createPayment,
    getPayments,
    getPaymentById,
    updatePayment,
    deletePayment,
    updatePaymentStatus,
    refundPayment,
    
    // Contrôleurs spécifiques TouchPoint
    initializePayment,
    touchpointWebhook,
    checkPaymentStatus,
    getUserPayments,
    verifyTransactionStatus,
};