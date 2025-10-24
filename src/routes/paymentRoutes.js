// ==========================================
// FILE: paymentRoutes.js (CORRIGÉ)
// ==========================================
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { 
    createPaymentValidation,
    updatePaymentValidation,
    updatePaymentStatusValidation,
    refundPaymentValidation,
    paymentIdValidation,
    initializePaymentValidation,
    PAYMENT_METHODS,
    PAYMENT_STATUS
} = require('../validators/paymentValidator');
const { authenticateToken, requireRole } = require('../middlewares/auth');

/**
 * Routes pour la gestion des paiements
 * 
 * ORDRE CRITIQUE:
 * 1. Routes publiques (webhooks, status checks)
 * 2. Routes statiques (/methods, /status)
 * 3. Middleware d'authentification
 * 4. Routes protégées statiques
 * 5. Routes avec paramètres dynamiques (/:id)
 */

// ==========================================
// SECTION 1: ROUTES PUBLIQUES (sans authentification)
// ==========================================

/**
 * Webhooks - DOIVENT être publics pour recevoir les callbacks
 */

/**
 * @route   POST /api/payments/webhook/wave
 * @desc    Webhook Wave pour notification de paiement
 * @access  Public (avec vérification signature côté contrôleur)
 */
router.post('/webhook/wave', paymentController.waveWebhook);

/**
 * @route   POST /api/payments/webhook/touchpoint
 * @desc    Webhook TouchPoint pour notification de paiement
 * @access  Public
 */
router.post('/webhook/touchpoint', paymentController.touchpointWebhook);

/**
 * Routes publiques de consultation
 */

/**
 * @route   POST /api/payments/initialize
 * @desc    Initialiser un paiement (Wave ou TouchPoint)
 * @access  Public
 */
router.post('/initialize',
    (req, res, next) => {
        console.log('[PaymentRoutes] POST /initialize - Validation', { body: req.body });
        
        const { error, value } = initializePaymentValidation(req.body);
        if (error) {
            console.log('[PaymentRoutes] Erreur validation initialize', {
                error: error.message,
                details: error.details
            });
            
            return res.status(400).json({
                success: false,
                error: 'Données de paiement invalides',
                details: error.details.map(d => d.message)
            });
        }
        
        req.body = value;
        console.log('[PaymentRoutes] Validation initialize OK');
        next();
    },
    paymentController.initializePayment
);

/**
 * @route   GET /api/payments/status/:order_reference
 * @desc    Vérifier le statut d'un paiement par référence de commande
 * @access  Public
 */
router.get('/status/:order_reference', paymentController.checkPaymentStatus);

/**
 * @route   GET /api/payments/methods
 * @desc    Récupérer les méthodes de paiement disponibles
 * @access  Public
 */
router.get('/methods', (req, res) => {
    console.log('[PaymentRoutes] GET /methods');
    res.json({
        success: true,
        data: PAYMENT_METHODS
    });
});

// ==========================================
// SECTION 2: MIDDLEWARE D'AUTHENTIFICATION
// Toutes les routes ci-dessous nécessitent une authentification
// ==========================================
router.use(authenticateToken);

// ==========================================
// SECTION 3: ROUTES PROTÉGÉES - TOUTES LES ROUTES STATIQUES D'ABORD
// ==========================================

/**
 * @route   GET /api/payments/statuses
 * @desc    Récupérer les statuts de paiement disponibles
 * @access  Private
 */
router.get('/statuses', (req, res) => {
    console.log('[PaymentRoutes] GET /statuses');
    res.json({
        success: true,
        data: PAYMENT_STATUS
    });
});

/**
 * @route   GET /api/payments
 * @desc    Récupérer tous les paiements (avec pagination et filtres)
 * @access  Private (Admin/Staff)
 */
router.get('/', 
    requireRole(['staff', 'admin']),
    paymentController.getPayments
);

/**
 * @route   POST /api/payments
 * @desc    Créer un nouveau paiement
 * @access  Private
 */
router.post('/', 
    (req, res, next) => {
        console.log('[PaymentRoutes] POST / - Validation', { body: req.body });
        
        const { error, value } = createPaymentValidation(req.body);
        if (error) {
            console.log('[PaymentRoutes] Erreur validation create', {
                error: error.message,
                details: error.details
            });
            
            return res.status(400).json({
                success: false,
                error: 'Données de paiement invalides',
                details: error.details.map(d => d.message)
            });
        }
        
        req.body = value;
        console.log('[PaymentRoutes] Validation create OK');
        next();
    },
    paymentController.createPayment
);

// ==========================================
// SECTION 4: ROUTES AVEC PARAMÈTRES DYNAMIQUES
// Ces routes DOIVENT être à la fin pour ne pas capturer les routes statiques
// ==========================================

/**
 * @route   GET /api/payments/:id
 * @desc    Récupérer un paiement par son ID
 * @access  Private
 */
router.get('/:id', 
    (req, res, next) => {
        console.log('[PaymentRoutes] GET /:id - Validation', { id: req.params.id });
        
        const paymentId = parseInt(req.params.id, 10);
        
        if (isNaN(paymentId)) {
            console.log('[PaymentRoutes] ID invalide');
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide'
            });
        }
        
        const { error } = paymentIdValidation(paymentId);
        if (error) {
            console.log('[PaymentRoutes] Erreur validation ID', {
                error: error.message,
                details: error.details
            });
            
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide',
                details: error.details.map(d => d.message)
            });
        }
        
        console.log('[PaymentRoutes] Validation ID OK');
        next();
    },
    paymentController.getPaymentById
);

/**
 * @route   PUT /api/payments/:id
 * @desc    Mettre à jour un paiement
 * @access  Private (Admin)
 */
router.put('/:id', 
    requireRole(['admin']),
    (req, res, next) => {
        console.log('[PaymentRoutes] PUT /:id - Validation', {
            id: req.params.id,
            body: req.body
        });
        
        // Validation de l'ID
        const paymentId = parseInt(req.params.id, 10);
        if (isNaN(paymentId)) {
            console.log('[PaymentRoutes] ID invalide');
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide'
            });
        }
        
        // Validation des données de mise à jour
        const { error, value } = updatePaymentValidation(req.body);
        if (error) {
            console.log('[PaymentRoutes] Erreur validation update', {
                error: error.message,
                details: error.details
            });
            
            return res.status(400).json({
                success: false,
                error: 'Données de mise à jour invalides',
                details: error.details.map(d => d.message)
            });
        }
        
        req.body = value;
        console.log('[PaymentRoutes] Validation update OK');
        next();
    },
    paymentController.updatePayment
);

/**
 * @route   DELETE /api/payments/:id
 * @desc    Supprimer un paiement (soft delete)
 * @access  Private (Admin)
 */
router.delete('/:id', 
    requireRole(['admin']),
    (req, res, next) => {
        console.log('[PaymentRoutes] DELETE /:id - Validation', { id: req.params.id });
        
        const paymentId = parseInt(req.params.id, 10);
        if (isNaN(paymentId)) {
            console.log('[PaymentRoutes] ID invalide');
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide'
            });
        }
        
        console.log('[PaymentRoutes] Validation delete OK');
        next();
    },
    paymentController.deletePayment
);

/**
 * @route   PATCH /api/payments/:id/status
 * @desc    Mettre à jour le statut d'un paiement
 * @access  Private (Admin/Staff)
 */
router.patch('/:id/status', 
    requireRole(['staff', 'admin']),
    (req, res, next) => {
        console.log('[PaymentRoutes] PATCH /:id/status - Validation', {
            id: req.params.id,
            body: req.body
        });
        
        // Validation de l'ID
        const paymentId = parseInt(req.params.id, 10);
        
        if (isNaN(paymentId)) {
            console.log('[PaymentRoutes] ID invalide');
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide'
            });
        }
        
        const idResult = paymentIdValidation(paymentId);
        if (idResult.error) {
            console.log('[PaymentRoutes] Erreur validation ID', {
                error: idResult.error.message
            });
            
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide',
                details: idResult.error.details.map(d => d.message)
            });
        }
        
        // Validation des données de statut
        const { error, value } = updatePaymentStatusValidation(req.body);
        if (error) {
            console.log('[PaymentRoutes] Erreur validation status', {
                error: error.message,
                details: error.details
            });
            
            return res.status(400).json({
                success: false,
                error: 'Données de statut invalides',
                details: error.details.map(d => d.message)
            });
        }
        
        req.body = value;
        console.log('[PaymentRoutes] Validation status OK');
        next();
    },
    paymentController.updatePaymentStatus
);

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Rembourser un paiement
 * @access  Private (Admin)
 */
router.post('/:id/refund', 
    requireRole(['admin']),
    (req, res, next) => {
        console.log('[PaymentRoutes] POST /:id/refund - Validation', {
            id: req.params.id,
            body: req.body
        });
        
        // Validation de l'ID
        const paymentId = parseInt(req.params.id, 10);
        
        if (isNaN(paymentId)) {
            console.log('[PaymentRoutes] ID invalide');
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide'
            });
        }
        
        const idResult = paymentIdValidation(paymentId);
        if (idResult.error) {
            console.log('[PaymentRoutes] Erreur validation ID', {
                error: idResult.error.message
            });
            
            return res.status(400).json({
                success: false,
                error: 'ID de paiement invalide',
                details: idResult.error.details.map(d => d.message)
            });
        }
        
        // Validation des données de remboursement
        const { error, value } = refundPaymentValidation(req.body);
        if (error) {
            console.log('[PaymentRoutes] Erreur validation refund', {
                error: error.message,
                details: error.details
            });
            
            return res.status(400).json({
                success: false,
                error: 'Données de remboursement invalides',
                details: error.details.map(d => d.message)
            });
        }
        
        req.body = value;
        console.log('[PaymentRoutes] Validation refund OK');
        next();
    },
    paymentController.refundPayment
);

module.exports = router;