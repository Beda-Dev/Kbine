// ==========================================
// FILE: orderController.js (AVEC getUserOrders)
// ==========================================
const orderService = require('../services/orderService');
const logger = require('../utils/logger');

/**
 * Crée une nouvelle commande
 * POST /api/orders
 */
const createOrder = async (req, res, next) => {
    logger.info('📦 Création commande - Début', {
        userId: req.user.id,
        planId: req.body.plan_id,
        amount: req.body.amount,
        phoneNumber: req.body.phone_number,
        ip: req.ip
    });
    console.log('[OrderController] [createOrder] Début de création de commande', {
        userId: req.user.id,
        body: req.body,
        validated: req.validated
    });

    try {
        const userId = req.user.id;
        const orderData = req.validated || { ...req.body, user_id: userId };

        // S'assurer que user_id est défini
        if (!orderData.user_id) {
            orderData.user_id = userId;
        }

        console.log('[OrderController] [createOrder] Données préparées', { orderData });

        logger.info('📦 Création commande en cours', {
            userId,
            planId: orderData.plan_id,
            amount: orderData.amount,
            phoneNumber: orderData.phone_number
        });
        logger.info('[OrderController] [createOrder] Création de commande', {
            userId,
            planId: orderData.plan_id,
            amount: orderData.amount,
            phoneNumber: orderData.phone_number
        });

        console.log('[OrderController] [createOrder] Appel du service createOrder');
        const order = await orderService.createOrder(orderData);

        logger.info('📦 Commande créée avec succès', {
            orderId: order.id,
            orderReference: order.order_reference,
            userId,
            amount: order.amount,
            status: order.status,
            ip: req.ip
        });
        console.log('[OrderController] [createOrder] Commande créée avec succès', { orderId: order.id });

        res.status(201).json({
            success: true,
            message: 'Commande créée avec succès',
            data: order
        });
    } catch (error) {
        logger.error('📦 Erreur création commande', {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            userId: req.user?.id,
            orderData: req.validated || req.body,
            ip: req.ip
        });
        console.log('[OrderController] [createOrder] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            userId: req.user?.id
        });
        logger.error('[OrderController] [createOrder] Erreur', {
            error: error.message,
            userId: req.user?.id
        });
        next(error);
    }
};

/**
 * Récupère toutes les commandes avec pagination et filtres
 * GET /api/orders
 */
const getAllOrders = async (req, res, next) => {
    logger.info('📦 Récupération liste commandes - Début', {
        query: req.query,
        userRole: req.user.role,
        userId: req.user.id,
        ip: req.ip
    });
    console.log('[OrderController] [getAllOrders] Début de récupération liste', {
        query: req.query,
        user: req.user
    });

    try {
        const { page = 1, limit = 10, status, user_id, date } = req.query;
        const filters = {};

        logger.debug('📦 Application filtres commandes', {
            page,
            limit,
            status,
            userId: user_id,
            date,
            requestingUser: req.user.id,
            userRole: req.user.role
        });
        console.log('[OrderController] [getAllOrders] Paramètres reçus', {
            page,
            limit,
            status,
            userId: user_id,
            date,
            requestingUser: req.user.id
        });

        logger.debug('[OrderController] [getAllOrders] Récupération', {
            page,
            limit,
            status,
            userId: user_id,
            date,
            requestingUser: req.user.id
        });

        // Si l'utilisateur est un client, il ne peut voir que ses propres commandes
        if (req.user.role === 'client') {
            filters.userId = req.user.id;
            logger.debug('📦 Filtre client appliqué', { userId: req.user.id });
            console.log('[OrderController] [getAllOrders] Filtre appliqué pour client', { userId: req.user.id });
        } else if (user_id) {
            filters.userId = user_id;
            logger.debug('📦 Filtre utilisateur spécifique appliqué', { userId: user_id });
            console.log('[OrderController] [getAllOrders] Filtre utilisateur spécifique appliqué', { userId: user_id });
        }

        if (status) {
            filters.status = status;
            logger.debug('📦 Filtre statut appliqué', { status });
            console.log('[OrderController] [getAllOrders] Filtre statut appliqué', { status });
        }

        if (date) {
            filters.date = date;
            logger.debug('📦 Filtre date appliqué', { date });
            console.log('[OrderController] [getAllOrders] Filtre date appliqué', { date });
        }

        logger.debug('📦 Appel service findAll', { filters });
        console.log('[OrderController] [getAllOrders] Appel du service findAll', { filters });
        const orders = await orderService.findAll(filters);

        // Pagination simple côté application
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedOrders = orders.slice(startIndex, endIndex);

        logger.info('📦 Commandes récupérées avec succès', {
            totalOrders: orders.length,
            paginatedCount: paginatedOrders.length,
            page: parseInt(page),
            limit: parseInt(limit),
            filters,
            ip: req.ip
        });
        console.log('[OrderController] [getAllOrders] Pagination appliquée', {
            totalOrders: orders.length,
            startIndex,
            endIndex,
            paginatedCount: paginatedOrders.length
        });

        res.json({
            success: true,
            data: paginatedOrders,
            pagination: {
                total: orders.length,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(orders.length / limit)
            }
        });
    } catch (error) {
        logger.error('📦 Erreur récupération liste commandes', {
            error: {
                message: error.message,
                stack: error.stack
            },
            query: req.query,
            userId: req.user?.id,
            ip: req.ip
        });
        console.log('[OrderController] [getAllOrders] Erreur attrapée', {
            error: error.message,
            stack: error.stack
        });
        logger.error('[OrderController] [getAllOrders] Erreur', {
            error: error.message
        });
        next(error);
    }
};

/**
 * Récupère toutes les commandes d'un utilisateur spécifique
 * GET /api/orders/user/:userId
 */
const getUserOrders = async (req, res, next) => {
    logger.info('📦 Récupération commandes utilisateur - Début', {
        targetUserId: req.params.userId,
        requestingUser: req.user.id,
        userRole: req.user.role,
        ip: req.ip
    });
    console.log('[OrderController] [getUserOrders] Début de récupération', {
        userId: req.params.userId,
        requestingUser: req.user
    });

    try {
        const userId = parseInt(req.params.userId);

        logger.debug('📦 ID utilisateur parsé', { userId });
        console.log('[OrderController] [getUserOrders] ID parsé', { userId });

        logger.debug('[OrderController] [getUserOrders] Récupération des commandes', {
            userId,
            requestingUser: req.user.id
        });

        logger.debug('📦 Appel service findByUserId', { userId });
        console.log('[OrderController] [getUserOrders] Appel du service findByUserId');
        const orders = await orderService.findByUserId(userId);

        logger.info('📦 Commandes utilisateur récupérées avec succès', {
            targetUserId: userId,
            count: orders.length,
            requestingUser: req.user.id,
            ip: req.ip
        });
        console.log('[OrderController] [getUserOrders] Commandes récupérées', { 
            userId, 
            count: orders.length 
        });

        res.json({
            success: true,
            data: orders,
            count: orders.length
        });
    } catch (error) {
        logger.error('📦 Erreur récupération commandes utilisateur', {
            error: {
                message: error.message,
                stack: error.stack
            },
            targetUserId: req.params.userId,
            requestingUser: req.user?.id,
            ip: req.ip
        });
        console.log('[OrderController] [getUserOrders] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            userId: req.params.userId
        });
        logger.error('[OrderController] [getUserOrders] Erreur', {
            error: error.message,
            userId: req.params.userId
        });
        next(error);
    }
};

/**
 * Récupère une commande par son ID
 * GET /api/orders/:id
 */
const getOrderById = async (req, res, next) => {
    logger.info('📦 Récupération commande par ID - Début', {
        orderId: req.params.id,
        requestingUser: req.user.id,
        userRole: req.user.role,
        ip: req.ip
    });
    console.log('[OrderController] [getOrderById] Début de récupération', {
        orderId: req.params.id,
        user: req.user
    });

    try {
        const orderId = parseInt(req.params.id);

        logger.debug('📦 ID commande parsé', { orderId });
        console.log('[OrderController] [getOrderById] ID parsé', { orderId });

        logger.debug('[OrderController] [getOrderById] Récupération', {
            orderId,
            requestingUser: req.user.id
        });

        logger.debug('📦 Appel service findById', { orderId });
        console.log('[OrderController] [getOrderById] Appel du service findById');
        const order = await orderService.findById(orderId);

        if (!order) {
            logger.warn('📦 Commande non trouvée', {
                orderId,
                requestingUser: req.user.id,
                ip: req.ip
            });
            console.log('[OrderController] [getOrderById] Commande non trouvée', { orderId });
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }

        logger.debug('📦 Commande trouvée', {
            orderId,
            status: order.status,
            orderOwner: order.user_id
        });
        console.log('[OrderController] [getOrderById] Commande trouvée', { orderId, status: order.status });

        // Vérification des autorisations
        if (req.user.role === 'client' && order.user_id !== req.user.id) {
            logger.warn('📦 Accès refusé - client non propriétaire', {
                orderId,
                orderOwner: order.user_id,
                requestingUser: req.user.id,
                ip: req.ip
            });
            console.log('[OrderController] [getOrderById] Accès refusé - client non propriétaire', {
                orderId,
                orderOwner: order.user_id,
                requestingUser: req.user.id
            });
            logger.warn('[OrderController] [getOrderById] Accès refusé', {
                orderId,
                orderOwner: order.user_id,
                requestingUser: req.user.id
            });

            return res.status(403).json({
                success: false,
                error: 'Accès non autorisé à cette commande'
            });
        }

        logger.info('📦 Commande récupérée avec succès', {
            orderId,
            orderOwner: order.user_id,
            requestingUser: req.user.id,
            ip: req.ip
        });
        console.log('[OrderController] [getOrderById] Accès autorisé, retour de la commande');
        res.json({
            success: true,
            data: order
        });
    } catch (error) {
        logger.error('📦 Erreur récupération commande par ID', {
            error: {
                message: error.message,
                stack: error.stack
            },
            orderId: req.params.id,
            requestingUser: req.user?.id,
            ip: req.ip
        });
        console.log('[OrderController] [getOrderById] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            orderId: req.params.id
        });
        logger.error('[OrderController] [getOrderById] Erreur', {
            error: error.message,
            orderId: req.params.id
        });
        next(error);
    }
};

/**
 * Récupère le statut de paiement d'une commande par sa référence
 * GET /api/orders/payment-status/:id
 */
const getPaymentStatus = async (req, res, next) => {
    logger.info('📦 Récupération statut paiement commande - Début', {
        orderId: req.params.id,
        ip: req.ip
    });
    console.log('[OrderController] [getPaymentStatus] Début de récupération statut', {
        orderId: req.params.id
    });

    try {
        const orderId = req.params.id;

        logger.debug('📦 ID commande parsé pour statut paiement', { orderId });
        console.log('[OrderController] [getPaymentStatus] ID parsé', { orderId });

        logger.debug('[OrderController] [getPaymentStatus] Récupération du statut', {
            orderId
        });

        logger.debug('📦 Appel service getOrderPaymentStatus', { orderId });
        console.log('[OrderController] [getPaymentStatus] Appel du service getOrderPaymentStatus');
        const paymentStatus = await orderService.getOrderPaymentStatus(orderId);

        if (!paymentStatus) {
            logger.warn('📦 Commande non trouvée pour statut paiement', {
                orderId,
                ip: req.ip
            });
            console.log('[OrderController] [getPaymentStatus] Commande non trouvée', { orderId });
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée',
                message: `Aucune commande trouvée avec l'ID: ${orderId}`
            });
        }

        logger.info('📦 Statut paiement récupéré avec succès', {
            orderId,
            isPaid: paymentStatus.is_paid,
            paymentStatus: paymentStatus.payment?.status,
            ip: req.ip
        });
        console.log('[OrderController] [getPaymentStatus] Statut récupéré', {
            orderId,
            isPaid: paymentStatus.is_paid,
            paymentStatus: paymentStatus.payment?.status
        });

        res.json({
            success: true,
            data: paymentStatus
        });
    } catch (error) {
        logger.error('📦 Erreur récupération statut paiement', {
            error: {
                message: error.message,
                stack: error.stack
            },
            orderId: req.params.id,
            ip: req.ip
        });
        console.log('[OrderController] [getPaymentStatus] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            orderId: req.params.id
        });
        logger.error('[OrderController] [getPaymentStatus] Erreur', {
            error: error.message,
            orderId: req.params.id
        });
        next(error);
    }
};

/**
 * Met à jour une commande existante
 * PUT /api/orders/:id
 */
const updateOrder = async (req, res, next) => {
    logger.info('📦 Mise à jour commande - Début', {
        orderId: req.params.id,
        updateData: req.validated || req.body,
        updatedBy: req.user.id,
        userRole: req.user.role,
        ip: req.ip
    });
    console.log('[OrderController] [updateOrder] Début de mise à jour', {
        orderId: req.params.id,
        body: req.body,
        user: req.user
    });

    try {
        const orderId = parseInt(req.params.id);
        let updateData = req.validated || req.body;

        logger.debug('📦 Données mise à jour préparées', {
            orderId,
            updateData,
            updatedBy: req.user.id
        });
        console.log('[OrderController] [updateOrder] Données reçues', { orderId, updateData });

        logger.info('[OrderController] [updateOrder] Mise à jour', {
            orderId,
            fields: Object.keys(updateData),
            requestingUser: req.user.id
        });

        // Vérifier que la commande existe
        logger.debug('📦 Vérification existence commande', { orderId });
        console.log('[OrderController] [updateOrder] Vérification existence commande');
        const order = await orderService.findById(orderId);
        if (!order) {
            logger.warn('📦 Commande non trouvée pour mise à jour', {
                orderId,
                updatedBy: req.user.id,
                ip: req.ip
            });
            console.log('[OrderController] [updateOrder] Commande non trouvée', { orderId });
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }

        logger.debug('📦 Commande trouvée', {
            orderId,
            currentStatus: order.status,
            orderOwner: order.user_id
        });
        console.log('[OrderController] [updateOrder] Commande trouvée', { orderId, currentStatus: order.status });

        // Vérification des autorisations
        if (req.user.role === 'client') {
            logger.debug('📦 Vérification autorisations client', {
                orderId,
                orderOwner: order.user_id,
                requestingUser: req.user.id
            });
            console.log('[OrderController] [updateOrder] Vérification autorisations client');
            if (order.user_id !== req.user.id) {
                logger.warn('📦 Accès refusé - client non propriétaire', {
                    orderId,
                    orderOwner: order.user_id,
                    requestingUser: req.user.id,
                    ip: req.ip
                });
                console.log('[OrderController] [updateOrder] Accès refusé - client non propriétaire');
                return res.status(403).json({
                    success: false,
                    error: 'Accès non autorisé à cette commande'
                });
            }

            // Les clients ne peuvent modifier que le phone_number
            const allowedFields = ['phone_number'];
            const filteredData = {};
            allowedFields.forEach(field => {
                if (updateData[field] !== undefined) {
                    filteredData[field] = updateData[field];
                }
            });
            updateData = filteredData;
            logger.debug('📦 Filtre données client appliqué', {
                orderId,
                allowedFields,
                filteredData: updateData
            });
        }

        if (Object.keys(updateData).length === 0) {
            logger.warn('📦 Aucun champ valide à mettre à jour', {
                orderId,
                userRole: req.user.role,
                originalData: req.validated || req.body,
                ip: req.ip
            });
            console.log('[OrderController] [updateOrder] Aucun champ valide à mettre à jour');
            return res.status(400).json({
                success: false,
                error: 'Aucun champ valide à mettre à jour'
            });
        }

        logger.debug('📦 Appel service updateOrder', {
            orderId,
            updateData,
            updatedBy: req.user.id
        });
        console.log('[OrderController] [updateOrder] Appel du service updateOrder');
        const updatedOrder = await orderService.updateOrder(orderId, updateData);

        logger.info('📦 Commande mise à jour avec succès', {
            orderId,
            updatedFields: Object.keys(updateData),
            updatedBy: req.user.id,
            ip: req.ip
        });
        console.log('[OrderController] [updateOrder] Commande mise à jour avec succès', { orderId });

        res.json({
            success: true,
            message: 'Commande mise à jour avec succès',
            data: updatedOrder
        });
    } catch (error) {
        logger.error('📦 Erreur mise à jour commande', {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            orderId: req.params.id,
            updateData: req.validated || req.body,
            updatedBy: req.user?.id,
            ip: req.ip
        });
        console.log('[OrderController] [updateOrder] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            orderId: req.params.id
        });
        logger.error('[OrderController] [updateOrder] Erreur', {
            error: error.message,
            orderId: req.params.id
        });
        next(error);
    }
};

/**
 * Supprime une commande (admin uniquement)
 * DELETE /api/orders/:id
 */
const deleteOrder = async (req, res, next) => {
    logger.info('📦 Suppression commande - Début', {
        orderId: req.params.id,
        deletedBy: req.user.id,
        userRole: req.user.role,
        ip: req.ip
    });
    console.log('[OrderController] [deleteOrder] Début de suppression', {
        orderId: req.params.id,
        user: req.user
    });

    try {
        const orderId = parseInt(req.params.id);

        logger.debug('📦 ID commande parsé pour suppression', { orderId });
        console.log('[OrderController] [deleteOrder] ID parsé', { orderId });

        logger.info('[OrderController] [deleteOrder] Suppression', {
            orderId,
            requestingUser: req.user.id
        });

        // Vérifier que la commande existe
        logger.debug('📦 Vérification existence commande pour suppression', { orderId });
        console.log('[OrderController] [deleteOrder] Vérification existence commande');
        const order = await orderService.findById(orderId);
        if (!order) {
            logger.warn('📦 Commande non trouvée pour suppression', {
                orderId,
                deletedBy: req.user.id,
                ip: req.ip
            });
            console.log('[OrderController] [deleteOrder] Commande non trouvée', { orderId });
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }

        logger.debug('📦 Appel service deleteOrder', {
            orderId,
            orderOwner: order.user_id,
            deletedBy: req.user.id
        });
        console.log('[OrderController] [deleteOrder] Commande trouvée, appel du service deleteOrder');
        await orderService.deleteOrder(orderId);

        logger.info('📦 Commande supprimée avec succès', {
            orderId,
            orderOwner: order.user_id,
            deletedBy: req.user.id,
            ip: req.ip
        });
        console.log('[OrderController] [deleteOrder] Suppression réussie', { orderId });

        // 204 No Content ne doit pas avoir de body
        res.status(204).send();
    } catch (error) {
        logger.error('📦 Erreur suppression commande', {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            orderId: req.params.id,
            deletedBy: req.user?.id,
            ip: req.ip
        });
        console.log('[OrderController] [deleteOrder] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            orderId: req.params.id
        });
        logger.error('[OrderController] [deleteOrder] Erreur', {
            error: error.message,
            orderId: req.params.id
        });

        // Gestion des erreurs de contrainte de clé étrangère
        if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.message.includes('liée à des paiements')) {
            logger.warn('📦 Suppression impossible - Contrainte clé étrangère', {
                orderId,
                errorCode: error.code,
                errorMessage: error.message,
                deletedBy: req.user?.id,
                ip: req.ip
            });
            console.log('[OrderController] [deleteOrder] Erreur de contrainte de clé étrangère');
            return res.status(409).json({
                success: false,
                error: 'Impossible de supprimer cette commande car elle est liée à des paiements'
            });
        }

        next(error);
    }
};

/**
 * Met à jour le statut d'une commande (staff/admin)
 * PATCH /api/orders/:id/status
 */
const updateOrderStatus = async (req, res, next) => {
    logger.info('📦 Mise à jour statut commande - Début', {
        orderId: req.params.id,
        newStatus: req.body.status,
        updatedBy: req.user.id,
        userRole: req.user.role,
        ip: req.ip
    });
    console.log('[OrderController] [updateOrderStatus] Début de mise à jour statut', {
        orderId: req.params.id,
        body: req.body,
        user: req.user
    });

    try {
        const orderId = parseInt(req.params.id);
        const { status } = req.body;

        logger.debug('📦 Paramètres mise à jour statut', {
            orderId,
            status,
            updatedBy: req.user.id
        });
        console.log('[OrderController] [updateOrderStatus] Paramètres reçus', { orderId, status });

        logger.info('[OrderController] [updateOrderStatus] Mise à jour du statut', {
            orderId,
            newStatus: status,
            requestingUser: req.user.id
        });

        if (!status) {
            logger.warn('📦 Statut manquant pour mise à jour', {
                orderId,
                updatedBy: req.user.id,
                ip: req.ip
            });
            console.log('[OrderController] [updateOrderStatus] Statut manquant');
            return res.status(400).json({
                success: false,
                error: 'Le statut est requis'
            });
        }

        // Vérifier que la commande existe
        logger.debug('📦 Vérification existence commande pour mise à jour statut', { orderId });
        console.log('[OrderController] [updateOrderStatus] Vérification existence commande');
        const order = await orderService.findById(orderId);
        if (!order) {
            logger.warn('📦 Commande non trouvée pour mise à jour statut', {
                orderId,
                updatedBy: req.user.id,
                ip: req.ip
            });
            console.log('[OrderController] [updateOrderStatus] Commande non trouvée', { orderId });
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }

        logger.debug('📦 Appel service updateOrder pour statut', {
            orderId,
            oldStatus: order.status,
            newStatus: status,
            updatedBy: req.user.id
        });
        console.log('[OrderController] [updateOrderStatus] Commande trouvée, appel du service updateOrder');
        // Mettre à jour le statut
        const updatedOrder = await orderService.updateOrder(orderId, { status });

        logger.info('📦 Statut commande mis à jour avec succès', {
            orderId,
            oldStatus: order.status,
            newStatus: status,
            updatedBy: req.user.id,
            ip: req.ip
        });
        console.log('[OrderController] [updateOrderStatus] Statut mis à jour avec succès', { orderId, newStatus: status });

        res.json({
            success: true,
            message: 'Statut de la commande mis à jour avec succès',
            data: updatedOrder
        });
    } catch (error) {
        logger.error('📦 Erreur mise à jour statut commande', {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            orderId: req.params.id,
            newStatus: req.body.status,
            updatedBy: req.user?.id,
            ip: req.ip
        });
        console.log('[OrderController] [updateOrderStatus] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            orderId: req.params.id
        });
        logger.error('[OrderController] [updateOrderStatus] Erreur', {
            error: error.message,
            orderId: req.params.id
        });
        next(error);
    }
};

/**
 * Assigne une commande à un membre du staff (admin/staff)
 * POST /api/orders/:id/assign
 */
const assignOrder = async (req, res, next) => {
    logger.info('📦 Assignation commande - Début', {
        orderId: req.params.id,
        assignedTo: req.body.staff_id,
        assignedBy: req.user.id,
        userRole: req.user.role,
        ip: req.ip
    });
    console.log('[OrderController] [assignOrder] Début d assignation', {
        orderId: req.params.id,
        body: req.body,
        user: req.user
    });

    try {
        const orderId = parseInt(req.params.id);
        const { staff_id } = req.body;

        logger.debug('📦 Paramètres assignation commande', {
            orderId,
            staff_id,
            assignedBy: req.user.id
        });
        console.log('[OrderController] [assignOrder] Paramètres reçus', { orderId, staff_id });

        logger.info('[OrderController] [assignOrder] Assignation', {
            orderId,
            assignedTo: staff_id,
            requestingUser: req.user.id
        });

        if (!staff_id) {
            logger.warn('📦 staff_id manquant pour assignation', {
                orderId,
                assignedBy: req.user.id,
                ip: req.ip
            });
            console.log('[OrderController] [assignOrder] staff_id manquant');
            return res.status(400).json({
                success: false,
                error: "L'ID de l'assigné est requis"
            });
        }

        // Vérifier que la commande existe
        logger.debug('📦 Vérification existence commande pour assignation', {
            orderId,
            assignedTo: staff_id,
            assignedBy: req.user?.id
        });
        console.log('[OrderController] [assignOrder] Vérification existence commande');
        const order = await orderService.findById(orderId);
        if (!order) {
            logger.warn('📦 Commande non trouvée pour assignation', {
                orderId,
                assignedTo: staff_id,
                assignedBy: req.user?.id,
                ip: req.ip
            });
            console.log('[OrderController] [assignOrder] Commande non trouvée', { orderId });
            return res.status(404).json({
                success: false,
                error: 'Commande non trouvée'
            });
        }

        logger.debug('📦 Appel service assignation commande', {
            orderId,
            assignedTo: staff_id,
            assignedBy: req.user?.id
        });
        console.log('[OrderController] [assignOrder] Commande trouvée, appel du service updateOrder');
        // Mettre à jour l'assignation
        const updatedOrder = await orderService.updateOrder(orderId, {
            assigned_to: staff_id,
            status: 'assigned'
        });

        logger.info('📦 Commande assignée avec succès', {
            orderId,
            assignedTo: staff_id,
            assignedBy: req.user?.id,
            ip: req.ip
        });
        console.log('[OrderController] [assignOrder] Commande assignée avec succès', { orderId, assigned_to: staff_id });

        res.json({
            success: true,
            message: 'Commande assignée avec succès',
            data: updatedOrder
        });
    } catch (error) {
        logger.error('📦 Erreur assignation commande', {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            orderId: req.params.id,
            assignedTo: req.body.staff_id,
            assignedBy: req.user?.id,
            ip: req.ip
        });
        console.log('[OrderController] [assignOrder] Erreur attrapée', {
            error: error.message,
            stack: error.stack,
            orderId: req.params.id
        });
        logger.error('[OrderController] [assignOrder] Erreur', {
            error: error.message,
            orderId: req.params.id
        });
        next(error);
    }
};

module.exports = {
    createOrder,
    getAllOrders,
    getUserOrders,
    getOrderById,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    assignOrder,
    getPaymentStatus
};