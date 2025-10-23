const logger = require('../utils/logger');
const paymentService = require('../services/paymentService');
const { PAYMENT_METHODS, PAYMENT_STATUS } = paymentService;
const paymentConfig = require('../config/payment');

/**
 * @route   POST /api/payments
 * @desc    Créer un nouveau paiement
 * @access  Private
 */
const createPayment = async (req, res, next) => {
    try {
        console.log('[PaymentController] [createPayment] Début', JSON.stringify(req.body, null, 2));
        const payment = await paymentService.createPayment(req.body);
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
        console.log('[PaymentController] [getPayments] Succès', { count: result?.data?.length || 0 });
        
        res.json({
            success: true,
            ...result
        });
    } catch (error) {
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
    try {
        console.log('[PaymentController] [getPaymentById] Début', { id: req.params.id });
        const payment = await paymentService.getPaymentById(req.params.id);
        console.log('[PaymentController] [getPaymentById] Succès', { id: payment?.id });
        
        res.json({
            success: true,
            data: payment
        });
    } catch (error) {
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
 * 🔧 CORRECTION: Ajout de logs détaillés et meilleure gestion des erreurs
 */
const updatePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        console.log('[PaymentController] [updatePayment] Début', {
            paymentId: id,
            body: req.body,
            userId: req.user?.id
        });
        
        // Validation de l'ID
        const paymentId = parseInt(id);
        if (isNaN(paymentId)) {
            console.log('[PaymentController] [updatePayment] ID invalide');
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide'
            });
        }
        
        // Appel du service
        console.log('[PaymentController] [updatePayment] Appel du service');
        const payment = await paymentService.updatePayment(paymentId, req.body);
        
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
 * 🔧 CORRECTION: Ajout de logs détaillés et meilleure gestion des erreurs
 */
const deletePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        
        console.log('[PaymentController] [deletePayment] Début', {
            paymentId: id,
            userId: req.user?.id,
            userRole: req.user?.role
        });
        
        // Validation de l'ID
        const paymentId = parseInt(id);
        if (isNaN(paymentId)) {
            console.log('[PaymentController] [deletePayment] ID invalide');
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide'
            });
        }
        
        // Appel du service
        console.log('[PaymentController] [deletePayment] Appel du service');
        await paymentService.deletePayment(paymentId);
        
        console.log('[PaymentController] [deletePayment] Succès', { paymentId: id });
        
        logger.info(`Paiement supprimé - ID: ${id}`, { 
            paymentId: id,
            deletedBy: req.user?.id
        });
        
        // 204 No Content - pas de body dans la réponse
        res.status(204).send();
    } catch (error) {
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
    try {
        console.log('[PaymentController] [updatePaymentStatus] Début', { id: req.params.id, body: req.body });
        const { id } = req.params;
        const { status, notes } = req.body;
        
        const payment = await paymentService.updatePaymentStatus(id, status, notes);
        console.log('[PaymentController] [updatePaymentStatus] Succès', { id });
        
        logger.info(`Statut du paiement mis à jour - ID: ${id}`, { 
            paymentId: id,
            status,
            notes
        });
        
        res.json({
            success: true,
            message: 'Statut du paiement mis à jour avec succès',
            data: payment
        });
    } catch (error) {
        console.log('[PaymentController] [updatePaymentStatus] Erreur', { message: error.message });
        logger.error('Erreur lors de la mise à jour du statut du paiement', { 
            error: error.message,
            stack: error.stack,
            paymentId: req.params.id,
            status: req.body.status
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
    try {
        console.log('[PaymentController] [refundPayment] Début', { id: req.params.id, body: req.body });
        const { id } = req.params;
        const { reason } = req.body;
        
        const payment = await paymentService.refundPayment(id, reason);
        console.log('[PaymentController] [refundPayment] Succès', { id });
        
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
        console.log('[PaymentController] [refundPayment] Erreur', { message: error.message });
        logger.error('Erreur lors du remboursement du paiement', { 
            error: error.message,
            stack: error.stack,
            paymentId: req.params.id,
            reason: req.body.reason
        });
        
        if (error.message.includes('non trouvé')) {
            return res.status(404).json({
                success: false,
                error: error.message
            });
        }
        
        if (error.message.includes('Seuls les paiements réussis') || 
            error.message.includes('déjà été remboursé')) {
            return res.status(400).json({
                success: false,
                error: error.message
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Erreur lors du remboursement',
            details: error.message
        });
    }
};





/**
 * @route   POST /api/payments/initialize
 * @desc    Initialiser un paiement (Wave ou TouchPoint)
 * @access  Public
 */
const initializePayment = async (req, res) => {
  try {
    console.log('[PaymentController] [initializePayment] Début', JSON.stringify(req.body, null, 2))
    const result = await paymentService.initializePayment(req.body)
    console.log('[PaymentController] [initializePayment] Succès', { payment_id: result?.payment_id, transaction_id: result?.transaction_id })

    logger.info("Paiement initialisé avec succès", {
      paymentId: result.payment_id,
      transactionId: result.transaction_id,
    })

    res.status(200).json({
      success: true,
      message: "Paiement initialisé avec succès",
      data: result,
    })
  } catch (error) {
    console.log('[PaymentController] [initializePayment] Erreur', { message: error.message })
    logger.error("Erreur lors de l'initialisation du paiement", {
      error: error.message,
      body: req.body,
    })

    if (error.message.includes("non trouvée")) {
      return res.status(404).json({
        success: false,
        error: error.message,
      })
    }

    if (error.message.includes("déjà été payée")) {
      return res.status(409).json({
        success: false,
        error: error.message,
      })
    }

    if (error.message.includes("ne correspond pas")) {
      return res.status(400).json({
        success: false,
        error: error.message,
      })
    }

    res.status(500).json({
      success: false,
      error: "Erreur lors de l'initialisation du paiement",
      details: error.message,
    })
  }
}

/**
 * @route   POST /api/payments/webhook/wave
 * @desc    Webhook Wave pour notification de paiement
 * @access  Public (avec vérification signature)
 */
const waveWebhook = async (req, res) => {
  try {
    console.log('[PaymentController] [waveWebhook] Début', { signature: req.headers["wave-signature"]?.length || 0 })
    const signature = req.headers["wave-signature"]
    const body = JSON.stringify(req.body)

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: "Signature manquante",
      })
    }

    const result = await paymentService.processWaveWebhook(signature, body)

    logger.info("Webhook Wave traité avec succès", { result })
    console.log('[PaymentController] [waveWebhook] Succès')

    res.status(200).json({
      success: true,
      message: "Webhook traité avec succès",
    })
  } catch (error) {
    console.log('[PaymentController] [waveWebhook] Erreur', { message: error.message })
    logger.error("Erreur traitement webhook Wave", {
      error: error.message,
    })

    res.status(400).json({
      success: false,
      error: error.message,
    })
  }
}

/**
 * @route   POST /api/payments/webhook/touchpoint
 * @desc    Webhook TouchPoint pour notification de paiement
 * @access  Public
 */
const touchpointWebhook = async (req, res) => {
  try {
    console.log('[PaymentController] [touchpointWebhook] Début', JSON.stringify(req.body, null, 2))
    const result = await paymentService.processTouchPointWebhook(req.body)

    logger.info("Webhook TouchPoint traité avec succès", { result })
    console.log('[PaymentController] [touchpointWebhook] Succès')

    res.status(200).json({
      success: true,
      message: "Webhook traité avec succès",
    })
  } catch (error) {
    console.log('[PaymentController] [touchpointWebhook] Erreur', { message: error.message })
    logger.error("Erreur traitement webhook TouchPoint", {
      error: error.message,
    })

    res.status(400).json({
      success: false,
      error: error.message,
    })
  }
}

/**
 * @route   GET /api/payments/status/:order_reference
 * @desc    Vérifier le statut d'un paiement
 * @access  Public
 */
const checkPaymentStatus = async (req, res) => {
  try {
    console.log('[PaymentController] [checkPaymentStatus] Début', { order_reference: req.params.order_reference })
    const { order_reference } = req.params

    const result = await paymentService.checkPaymentStatus(order_reference)
    console.log('[PaymentController] [checkPaymentStatus] Succès')

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.log('[PaymentController] [checkPaymentStatus] Erreur', { message: error.message })
    logger.error("Erreur vérification statut paiement", {
      error: error.message,
      orderReference: req.params.order_reference,
    })

    if (error.message.includes("Aucun paiement trouvé")) {
      return res.status(404).json({
        success: false,
        error: error.message,
      })
    }

    res.status(500).json({
      success: false,
      error: "Erreur lors de la vérification du statut",
      details: error.message,
    })
  }
}

// Export des constantes pour utilisation dans les routes
module.exports = {
    // Constantes
    PAYMENT_METHODS,
    PAYMENT_STATUS,
    
    // Contrôleurs
    createPayment,
    getPayments,
    getPaymentById,
    updatePayment,
    deletePayment,
    updatePaymentStatus,
    refundPayment,
    waveWebhook,
    touchpointWebhook,
    checkPaymentStatus,
    initializePayment,
};