/**
 * Templates HTML pour les pages de paiement
 * Contient les pages de succès et d'échec avec animations et icônes
 */

/**
 * Formater un montant en devise XOF
 * Convertit les strings en nombres et formate correctement
 */
const formatCurrency = (amount) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numAmount)) return '0 XOF';
    return numAmount.toLocaleString('fr-CI', { style: 'currency', currency: 'XOF' });
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
    return labels[method] || (method === 'unknown' ? 'Paiement en cours de confirmation' : 'Paiement Mobile');
};

/**
 * Générer la page HTML de succès
 */
const getSuccessPage = (data) => {
    const { orderReference, amount, paymentMethod, transactionId, fees, timestamp } = data;
    
    // Convertir les montants en nombres
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const numFees = typeof fees === 'string' ? parseFloat(fees) : (fees || 0);
    const totalAmount = numAmount + numFees;
    
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paiement Réussi - Kbine</title>
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
            overflow: hidden;
            animation: slideUp 0.6s ease-out;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 50px 50px;
            animation: moveBackground 20s linear infinite;
        }
        @keyframes moveBackground {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
        }
        .logo-placeholder {
            width: 100px;
            height: 100px;
            background: #fe6b35;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: white;
            border: 3px solid white;
            position: relative;
            z-index: 1;
            overflow: hidden;
        }
        .logo-placeholder img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 10px;
        }
        .success-icon {
            font-size: 60px;
            color: #4ade80;
            margin-bottom: 20px;
            animation: checkmark 0.6s ease-out;
            position: relative;
            z-index: 1;
        }
        @keyframes checkmark {
            0% { transform: scale(0) rotate(-45deg); opacity: 0; }
            50% { transform: scale(1.2); }
            100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        .header h1 {
            color: white;
            font-size: 28px;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        .header p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            position: relative;
            z-index: 1;
        }
        .content {
            padding: 40px 30px;
        }
        .amount-highlight {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
            animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.7); }
            50% { box-shadow: 0 0 0 10px rgba(102, 126, 234, 0); }
        }
        .amount-label { font-size: 12px; opacity: 0.9; margin-bottom: 5px; }
        .amount-value { font-size: 32px; font-weight: bold; }
        .info-section { margin-bottom: 30px; }
        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #f0f0f0;
            animation: fadeIn 0.6s ease-out forwards;
            opacity: 0;
        }
        .info-item:nth-child(1) { animation-delay: 0.2s; }
        .info-item:nth-child(2) { animation-delay: 0.3s; }
        .info-item:nth-child(3) { animation-delay: 0.4s; }
        .info-item:nth-child(4) { animation-delay: 0.5s; }
        .info-item:nth-child(5) { animation-delay: 0.6s; }
        .info-item:last-child { border-bottom: none; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .info-label {
            color: #666;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .info-label i { color: #667eea; width: 20px; text-align: center; }
        .info-value { font-weight: 600; color: #333; font-size: 16px; }
        .status-badge {
            display: inline-block;
            background: #4ade80;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .footer {
            padding: 30px;
            background: #f9f9f9;
            text-align: center;
            border-top: 1px solid #f0f0f0;
        }
        .btn-group {
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        .btn-secondary {
            background: white;
            color: #667eea;
            border: 2px solid #667eea;
        }
        .btn-secondary:hover { background: #f0f0f0; }
        @media (max-width: 600px) {
            .header { padding: 30px 20px; }
            .header h1 { font-size: 24px; }
            .content { padding: 30px 20px; }
            .amount-value { font-size: 28px; }
            .btn-group { flex-direction: column; }
            .btn { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-placeholder">
                <img src="/images/logo.png" alt="Logo Kbine">
            </div>
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <h1>Paiement Réussi!</h1>
            <p>Votre transaction a été complétée avec succès</p>
        </div>
        <div class="content">
            <div class="amount-highlight">
                <div class="amount-label">Montant payé</div>
                <div class="amount-value">${formatCurrency(numAmount)}</div>
            </div>
            <div class="info-section">
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-receipt"></i> Référence</span>
                    <span class="info-value">${orderReference}</span>
                </div>
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-id-card"></i> Transaction</span>
                    <span class="info-value" style="font-size: 12px; font-family: monospace;">${transactionId}</span>
                </div>
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-mobile-alt"></i> Méthode</span>
                    <span class="info-value">${getPaymentMethodLabel(paymentMethod)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-coins"></i> Frais</span>
                    <span class="info-value">${formatCurrency(numFees)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-check"></i> Statut</span>
                    <span class="status-badge">Confirmé</span>
                </div>
            </div>
        </div>

    </div>
</body>
</html>
    `;
};

/**
 * Générer la page HTML d'échec
 */
const getFailedPage = (data) => {
    const { orderReference, amount, paymentMethod, transactionId, reason, timestamp } = data;
    
    // Convertir le montant en nombre
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paiement Échoué - Kbine</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
            overflow: hidden;
            animation: slideUp 0.6s ease-out;
        }
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .header {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            padding: 40px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .header::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 50px 50px;
            animation: moveBackground 20s linear infinite;
        }
        @keyframes moveBackground {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
        }
        .logo-placeholder {
            width: 80px;
            height: 80px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 40px;
            color: white;
            border: 3px solid white;
            position: relative;
            z-index: 1;
        }
        .error-icon {
            font-size: 60px;
            color: #ef4444;
            margin-bottom: 20px;
            animation: shake 0.6s ease-out;
            position: relative;
            z-index: 1;
        }
        @keyframes shake {
            0%, 100% { transform: translateX(0) rotate(0); }
            25% { transform: translateX(-10px) rotate(-5deg); }
            75% { transform: translateX(10px) rotate(5deg); }
        }
        .header h1 {
            color: white;
            font-size: 28px;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        .header p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 14px;
            position: relative;
            z-index: 1;
        }
        .content { padding: 40px 30px; }
        .amount-highlight {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            margin: 20px 0;
        }
        .amount-label { font-size: 12px; opacity: 0.9; margin-bottom: 5px; }
        .amount-value { font-size: 32px; font-weight: bold; }
        .reason-box {
            background: #fff3cd;
            border-left: 4px solid #f5576c;
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            animation: slideIn 0.6s ease-out;
        }
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .reason-title {
            font-weight: 600;
            color: #856404;
            margin-bottom: 5px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .reason-text { color: #856404; font-size: 14px; }
        .info-section { margin-bottom: 30px; }
        .info-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #f0f0f0;
            animation: fadeIn 0.6s ease-out forwards;
            opacity: 0;
        }
        .info-item:nth-child(1) { animation-delay: 0.2s; }
        .info-item:nth-child(2) { animation-delay: 0.3s; }
        .info-item:nth-child(3) { animation-delay: 0.4s; }
        .info-item:last-child { border-bottom: none; }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
        }
        .info-label {
            color: #666;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .info-label i { color: #f5576c; width: 20px; text-align: center; }
        .info-value { font-weight: 600; color: #333; font-size: 16px; }
        .status-badge {
            display: inline-block;
            background: #ef4444;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .footer {
            padding: 30px;
            background: #f9f9f9;
            text-align: center;
            border-top: 1px solid #f0f0f0;
        }
        .btn-group {
            display: flex;
            gap: 10px;
            justify-content: center;
        }
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        .btn-primary {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(245, 87, 108, 0.3);
        }
        .btn-secondary {
            background: white;
            color: #f5576c;
            border: 2px solid #f5576c;
        }
        .btn-secondary:hover { background: #f0f0f0; }
        @media (max-width: 600px) {
            .header { padding: 30px 20px; }
            .header h1 { font-size: 24px; }
            .content { padding: 30px 20px; }
            .amount-value { font-size: 28px; }
            .btn-group { flex-direction: column; }
            .btn { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo-placeholder">
                <i class="fas fa-shopping-bag"></i>
            </div>
            <div class="error-icon">
                <i class="fas fa-times-circle"></i>
            </div>
            <h1>Paiement Échoué</h1>
            <p>Votre transaction n'a pas pu être complétée</p>
        </div>
        <div class="content">
            <div class="amount-highlight">
                <div class="amount-label">Montant</div>
                <div class="amount-value">${formatCurrency(numAmount)}</div>
            </div>
            <div class="reason-box">
                <div class="reason-title">
                    <i class="fas fa-exclamation-circle"></i>
                    Raison de l'échec
                </div>
                <div class="reason-text">${reason}</div>
            </div>
            <div class="info-section">
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-receipt"></i> Référence</span>
                    <span class="info-value">${orderReference}</span>
                </div>
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-id-card"></i> Transaction</span>
                    <span class="info-value" style="font-size: 12px; font-family: monospace;">${transactionId}</span>
                </div>
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-mobile-alt"></i> Méthode</span>
                    <span class="info-value">${getPaymentMethodLabel(paymentMethod)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label"><i class="fas fa-times"></i> Statut</span>
                    <span class="status-badge">Échoué</span>
                </div>
            </div>
        </div>
        <div class="footer">
            <p style="margin-top: 20px; color: #999; font-size: 12px;">
                Si le problème persiste, veuillez contacter notre support.
            </p>
        </div>
    </div>
</body>
</html>
    `;
};

module.exports = {
    getSuccessPage,
    getFailedPage
};
