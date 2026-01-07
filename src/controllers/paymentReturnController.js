/**
 * Contrôleur pour les pages de retour de paiement
 * Affiche le statut du paiement avec une interface HTML riche
 */

const logger = require('../utils/logger');
const paymentService = require('../services/paymentService');
const db = require('../config/database');
const { getSuccessPage, getFailedPage } = require('../templates/paymentPages');

/**
 * Récupérer les informations de paiement par order_reference
 * Amélioration: Cherche d'abord via order_reference, puis avec retry si nécessaire
 */
const getPaymentByOrderReference = async (orderReference) => {
    logger.debug('💳 Recherche paiement par référence commande', {
        orderReference,
        ip: req?.ip
    });
    try {
        console.log('[getPaymentByOrderReference] Recherche pour:', orderReference);
        
        const [payments] = await db.execute(
            `SELECT p.*, o.amount as order_amount, o.id as order_id
             FROM payments p
             INNER JOIN orders o ON p.order_id = o.id
             WHERE o.order_reference = ?
             ORDER BY p.created_at DESC
             LIMIT 1`,
            [orderReference]
        );
        
        console.log('[getPaymentByOrderReference] Résultats trouvés:', payments?.length || 0);
        if (payments && payments.length > 0) {
            logger.info('💳 Paiement trouvé par référence commande', {
                orderReference,
                paymentId: payments[0].id,
                status: payments[0].status,
                amount: payments[0].amount
            });
            console.log('[getPaymentByOrderReference] Paiement trouvé:', {
                id: payments[0].id,
                status: payments[0].status,
                amount: payments[0].amount
            });
            return payments[0];
        }
        
        // Si aucun paiement trouvé, vérifier que la commande existe au moins
        console.log('[getPaymentByOrderReference] Aucun paiement trouvé, vérification de la commande');
        const [orders] = await db.execute(
            `SELECT id, order_reference FROM orders WHERE order_reference = ?`,
            [orderReference]
        );
        
        if (orders && orders.length > 0) {
            logger.warn('💳 Commande existe mais pas de paiement trouvé', {
                orderReference,
                orderId: orders[0].id
            });
            console.warn('[getPaymentByOrderReference] Commande existe mais pas de paiement trouvé:', orderReference);
            return null; // Commande existe mais paiement not found
        }
        
        logger.warn('💳 Ni commande ni paiement trouvé', {
            orderReference
        });
        console.warn('[getPaymentByOrderReference] Ni commande ni paiement trouvé pour:', orderReference);
        return null;
    } catch (error) {
        logger.error('💳 Erreur recherche paiement par référence commande', {
            error: {
                message: error.message,
                stack: error.stack
            },
            orderReference
        });
        console.error('[getPaymentByOrderReference] Erreur SQL:', error);
        logger.error('Erreur récupération paiement', { 
            error: error.message,
            orderReference 
        });
        return null;
    }
};

/**
 * @route   GET /payments/return/:orderReference/successful
 * @desc    Page de succès du paiement
 * @access  Public
 */
const paymentSuccessful = async (req, res) => {
    logger.info('💳 Page retour paiement succès - Début', {
        orderReference: req.params.orderReference,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    try {
        const { orderReference } = req.params;
        console.log('[PaymentReturnController] Succès - orderReference:', orderReference);
        
        const payment = await getPaymentByOrderReference(orderReference);
        
        if (!payment) {
            logger.warn('💳 Paiement non trouvé pour page succès', {
                orderReference,
                ip: req.ip
            });
            console.warn('[PaymentReturnController] Paiement non trouvé pour:', orderReference);
            
            // Afficher la page de succès même si le paiement n'est pas encore trouvé
            // (peut être un problème de timing avec le webhook)
            return res.send(getSuccessPage({
                orderReference,
                amount: 0,
                paymentMethod: 'unknown',
                transactionId: 'En attente de confirmation',
                fees: 0,
                timestamp: new Date().toLocaleString('fr-CI')
            }));
        }
        
        logger.info('💳 Données paiement récupérées pour page succès', {
            orderReference,
            paymentId: payment.id,
            paymentMethod: payment.payment_method,
            amount: payment.amount,
            status: payment.status,
            orderAmount: payment.order_amount,
            hasCallback: !!payment.callback_data,
            ip: req.ip
        });
        console.log('[PaymentReturnController] Données du paiement:', {
            id: payment.id,
            payment_method: payment.payment_method,
            amount: payment.amount,
            status: payment.status,
            order_amount: payment.order_amount,
            has_callback: !!payment.callback_data
        });
        
        logger.debug('💳 Parsing callback_data pour page succès', {
            orderReference,
            hasCallbackData: !!payment.callback_data
        });
        let callbackData = {};
        try {
            if (payment.callback_data) {
                if (typeof payment.callback_data === 'string') {
                    callbackData = JSON.parse(payment.callback_data);
                } else {
                    callbackData = payment.callback_data;
                }
            }
        } catch (parseError) {
            logger.error('💳 Erreur parsing callback_data page succès', {
                error: {
                    message: parseError.message,
                    stack: parseError.stack
                },
                orderReference,
                ip: req.ip
            });
            console.error('[PaymentReturnController] Erreur parsing callback_data:', parseError);
            callbackData = {};
        }
        
        logger.debug('💳 Préparation données HTML page succès', {
            orderReference,
            amount: payment.order_amount || payment.amount,
            paymentMethod: payment.payment_method || 'unknown',
            hasCallbackData: !!payment.callback_data,
            ip: req.ip
        });
        const htmlData = {
            orderReference,
            amount: payment.order_amount || payment.amount,
            paymentMethod: payment.payment_method || 'unknown',
            transactionId: payment.external_reference || payment.id || 'unknown',
            fees: callbackData?.touchpoint_response?.fees || callbackData?.fees || 0,
            timestamp: payment.created_at 
                ? new Date(payment.created_at).toLocaleString('fr-CI')
                : new Date().toLocaleString('fr-CI')
        };
        
        console.log('[PaymentReturnController] Données pour la page HTML:', htmlData);
        
        logger.info('💳 Page succès générée avec succès', {
            orderReference,
            paymentId: payment.id,
            ip: req.ip
        });
        const html = getSuccessPage(htmlData);
        
        res.send(html);
    } catch (error) {
        logger.error('💳 Erreur page retour paiement succès', {
            error: {
                message: error.message,
                stack: error.stack
            },
            orderReference: req.params.orderReference,
            ip: req.ip
        });
        console.error('[PaymentReturnController] Erreur page succès:', error);
        console.error('[PaymentReturnController] Stack:', error.stack);
        logger.error('Erreur page succès', { 
            error: error.message, 
            stack: error.stack,
            orderReference: req.params.orderReference 
        });
        res.status(500).send(getErrorPage('Erreur', 'Une erreur est survenue lors du traitement de votre paiement. Nous enquêtons sur cette situation.'));
    }
};

/**
 * @route   GET /payments/return/:orderReference/failed
 * @desc    Page d'échec du paiement
 * @access  Public
 */
const paymentFailed = async (req, res) => {
    logger.info('💳 Page retour paiement échec - Début', {
        orderReference: req.params.orderReference,
        ip: req.ip,
        userAgent: req.headers['user-agent']
    });
    try {
        const { orderReference } = req.params;
        console.log('[PaymentReturnController] Échec', { orderReference });
        
        const payment = await getPaymentByOrderReference(orderReference);
        
        if (!payment) {
            logger.warn('💳 Paiement non trouvé pour page échec', {
                orderReference,
                ip: req.ip
            });
            return res.status(404).send(getErrorPage('Paiement non trouvé', 'Nous n\'avons pas pu trouver votre paiement.'));
        }
        
        logger.debug('💳 Parsing callback_data pour page échec', {
            orderReference,
            hasCallbackData: !!payment.callback_data
        });
        const callbackData = payment.callback_data ? JSON.parse(payment.callback_data) : {};
        const reason = callbackData.webhook_data?.reason || 'Raison inconnue';
        
        logger.info('💳 Page échec générée', {
            orderReference,
            reason,
            paymentId: payment.id,
            ip: req.ip
        });
        const html = getFailedPage({
            orderReference,
            amount: payment.order_amount || payment.amount,
            paymentMethod: payment.payment_method,
            transactionId: payment.external_reference,
            reason,
            timestamp: new Date(payment.created_at).toLocaleString('fr-CI')
        });
        
        res.send(html);
    } catch (error) {
        logger.error('💳 Erreur page retour paiement échec', {
            error: {
                message: error.message,
                stack: error.stack
            },
            orderReference: req.params.orderReference,
            ip: req.ip
        });
        logger.error('Erreur page échec', { error: error.message });
        res.status(500).send(getErrorPage('Erreur', 'Une erreur est survenue.'));
    }
};

/**
 * Obtenir l'icône de la méthode de paiement
 */
const getPaymentMethodIcon = (method) => {
    const icons = {
        wave: '<i class="fas fa-wave-square" style="color: #667eea;"></i>',
        orange_money: '<i class="fas fa-mobile-alt" style="color: #ff9900;"></i>',
        mtn_money: '<i class="fas fa-coins" style="color: #ffcc00;"></i>',
        moov_money: '<i class="fas fa-wallet" style="color: #00cc00;"></i>'
    };
    return icons[method] || '<i class="fas fa-credit-card"></i>';
};

/**
 * Obtenir le label de la méthode de paiement
 */
const getPaymentMethodLabel = (method) => {
    const labels = {
        wave: 'Wave',
        orange_money: 'Orange Money',
        mtn_money: 'MTN Money',
        moov_money: 'Moov Money'
    };
    return labels[method] || 'Paiement Mobile';
};

/**
 * Générer une page d'erreur générique
 */
const getErrorPage = (title, message) => {
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Kbine</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 500px;
            width: 100%;
            padding: 40px;
            text-align: center;
            animation: slideUp 0.6s ease-out;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .icon {
            font-size: 60px;
            color: #f5576c;
            margin-bottom: 20px;
        }
        h1 { color: #333; margin-bottom: 10px; }
        p { color: #666; margin-bottom: 30px; }
        .btn {
            padding: 12px 24px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3); }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon"><i class="fas fa-exclamation-triangle"></i></div>
        <h1>${title}</h1>
        <p>${message}</p>
        
    </div>
</body>
</html>
    `;
};

module.exports = {
    paymentSuccessful,
    paymentFailed,
    getPaymentMethodIcon,
    getPaymentMethodLabel,
    getErrorPage
};
