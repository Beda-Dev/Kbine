/**
 * Utilitaire pour générer des références de commande uniques
 */

const crypto = require('crypto');

/**
 * Génère une référence de commande unique
 * Format: ORD-YYYYMMDD-XXXXX
 * @returns {string} Référence de commande unique
 */
const generateOrderReference = () => {
    const now = new Date();
    
    // Format de la date: YYYYMMDD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Génère un nombre aléatoire unique de 5 chiffres
    const randomNum = crypto.randomInt(10000, 99999);
    
    // Assemble la référence
    const reference = `ORD-${dateStr}-${randomNum}`;
    
    return reference;
};

/**
 * Génère une référence de commande avec timestamp pour garantir l'unicité
 * Format: ORD-YYYYMMDD-HHMMSS-XXX
 * @returns {string} Référence de commande unique
 */
const generateOrderReferenceWithTime = () => {
    const now = new Date();
    
    // Format de la date: YYYYMMDD
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;
    
    // Format de l'heure: HHMMSS
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timeStr = `${hours}${minutes}${seconds}`;
    
    // Génère un nombre aléatoire de 3 chiffres
    const randomNum = crypto.randomInt(100, 999);
    
    // Assemble la référence
    const reference = `ORD-${dateStr}-${timeStr}-${randomNum}`;
    
    return reference;
};

/**
 * Valide le format d'une référence de commande
 * @param {string} reference - Référence à valider
 * @returns {boolean} True si valide, false sinon
 */
const validateOrderReference = (reference) => {
    if (!reference || typeof reference !== 'string') {
        return false;
    }
    
    // Format: ORD-YYYYMMDD-XXXXX ou ORD-YYYYMMDD-HHMMSS-XXX
    const pattern1 = /^ORD-\d{8}-\d{5}$/;
    const pattern2 = /^ORD-\d{8}-\d{6}-\d{3}$/;
    
    return pattern1.test(reference) || pattern2.test(reference);
};

/**
 * Extrait la date d'une référence de commande
 * @param {string} reference - Référence de commande
 * @returns {Date|null} Date extraite ou null si invalide
 */
const extractDateFromReference = (reference) => {
    if (!validateOrderReference(reference)) {
        return null;
    }
    
    const parts = reference.split('-');
    const dateStr = parts[1];
    
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    
    return new Date(year, month, day);
};

module.exports = {
    generateOrderReference,
    generateOrderReferenceWithTime,
    validateOrderReference,
    extractDateFromReference
};