/**
 * Configuration Firebase Admin SDK
 * 
 * Ce fichier initialise Firebase Admin pour envoyer des notifications push
 * via Firebase Cloud Messaging (FCM).
 */

const admin = require('firebase-admin');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

// =========================================================
// INITIALISATION FIREBASE ADMIN
// =========================================================

let firebaseAdmin = null;
let messaging = null;
let isInitialized = false;

try {
  let serviceAccount = null;

  // 1. Essayer de charger depuis la variable d'environnement
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.log('[Firebase] 📋 Chargement depuis FIREBASE_SERVICE_ACCOUNT (env var)...');
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    // Correction automatique des \n dans la private_key si nécessaire
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    console.log('[Firebase] ✅ Credentials chargées depuis env var');
  } catch (parseError) {
    console.error('[Firebase] ❌ Erreur parsing FIREBASE_SERVICE_ACCOUNT:', parseError.message);
    serviceAccount = null;
  }
}

  // 2. Si env var non disponible, essayer de charger le fichier
  if (!serviceAccount) {
    // En environnement Docker, le fichier est à la racine (/app/firebase-service-account.json)
    // En développement local, il est à la racine du projet
    const credentialsPath = process.env.NODE_ENV === 'production' 
      ? path.join('/app', 'firebase-service-account.json')
      : path.join(__dirname, '../../firebase-service-account.json');
    console.log('[Firebase] 🔍 Recherche fichier credentials à:', credentialsPath);

    if (fs.existsSync(credentialsPath)) {
      console.log('[Firebase] 📂 Fichier trouvé, chargement...');
      try {
        const credentialsContent = fs.readFileSync(credentialsPath, 'utf8');
        serviceAccount = JSON.parse(credentialsContent);
        console.log('[Firebase] ✅ Credentials chargées depuis fichier');
      } catch (readError) {
        console.error('[Firebase] ❌ Erreur lecture fichier:', readError.message);
        serviceAccount = null;
      }
    } else {
      console.log('[Firebase] ⚠️  Fichier credentials non trouvé à:', credentialsPath);
    }
  }

  // 3. Si les credentials sont disponibles, initialiser Firebase
  if (serviceAccount && serviceAccount.project_id) {
    console.log('[Firebase] 🚀 Initialisation Firebase Admin SDK...');
    
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    });

    messaging = admin.messaging();
    isInitialized = true;

    logger.info('✅ Firebase Admin SDK initialisé avec succès', {
      projectId: serviceAccount.project_id
    });

    console.log('[Firebase] ✅ Firebase Admin SDK initialisé');
    console.log('[Firebase] Project ID:', serviceAccount.project_id);
    console.log('[Firebase] Firebase Cloud Messaging disponible');
    console.log('[Firebase] Messaging instance:', messaging);
console.log('[Firebase] Has sendMulticast?', typeof messaging?.sendMulticast);
  } else {
    console.warn('[Firebase] ⚠️  Credentials Firebase non disponibles');
    console.warn('[Firebase] ℹ️  Fournir FIREBASE_SERVICE_ACCOUNT ou firebase-service-account.json');
    
    logger.warn('Firebase Admin SDK non initialisé - credentials manquantes', {
      envVarExists: !!process.env.FIREBASE_SERVICE_ACCOUNT
    });

    console.warn('[Firebase] ⚠️  Les notifications push ne seront pas disponibles');
  }

} catch (error) {
  logger.error('❌ Erreur initialisation Firebase Admin SDK', {
    error: error.message,
    stack: error.stack
  });

  console.error('[Firebase] ❌ ERREUR initialisation Firebase:', error.message);
  console.warn('[Firebase] ⚠️  Les notifications push ne seront pas disponibles');
}

// =========================================================
// EXPORTS
// =============================================
// ============

/**
 * Vérifier si Firebase est initialisé
 */
const isFirebaseInitialized = () => {
  return isInitialized && messaging !== null;
};

/**
 * Obtenir l'instance Firebase Admin
 * ⚠️ Peut retourner null si non initialisé
 */
const getFirebaseAdmin = () => {
  return firebaseAdmin;
};

/**
 * Obtenir l'instance Firebase Cloud Messaging
 * ⚠️ Peut retourner null si non initialisé
 */
const getMessaging = () => {
  return messaging;
};

module.exports = {
  admin: firebaseAdmin,
  messaging,
  isFirebaseInitialized,
  getFirebaseAdmin,
  getMessaging
};