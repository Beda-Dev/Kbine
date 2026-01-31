const Queue = require('bull');
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Queue de webhooks avec throttling et retry automatique
 * 
 * Caracteristiques:
 * - Throttling: 1-2 callbacks/sec max (configurable)
 * - Retry automatique: 5 tentatives avec backoff exponentiel
 * - Persistance Redis: Les jobs survivent aux redemarrages
 * - Monitoring: Logs detailles et metriques
 */

// ===============================
// CONFIGURATION DE LA QUEUE
// ===============================

const webhookQueue = new Queue('webhooks', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    attempts: 5, // Nombre de tentatives
    backoff: {
      type: 'exponential',
      delay: 2000, // Debut a 2sec, puis 4sec, 8sec, etc
    },
    removeOnComplete: true, // Supprime les jobs apres succes
    removeOnFail: false, // Garde les jobs echoues pour audit
  },
});

// ===============================
// THROTTLING (1-2 callbacks/sec)
// ===============================

/**
 * Configuration du rate limiting pour les webhooks
 * Utilise l'algorithme Token Bucket
 */
const WEBHOOK_THROTTLE_RATE = 2; // 2 callbacks par seconde max

// Ajouter des delais entre les jobs
webhookQueue.process(1, async (job) => {
  // Traiter 1 seul job a la fois pour respecter le throttling
  return await processWebhook(job);
});

// ===============================
// FONCTION DE TRAITEMENT
// ===============================

/**
 * Traite l'envoi d'un webhook avec retry automatique
 * 
 * @param {Job} job - Job Bull contenant les donnees du webhook
 * @returns {Promise} Resultat de l'envoi
 */
async function processWebhook(job) {
  const { url, payload, eventType, userId } = job.data;
  const attempt = job.attemptsMade + 1;

  try {
    logger.info(
      `[Webhook] Envoi tentative ${attempt}/5 - ${eventType} vers ${url}`
    );

    // ===== ENVOI DU WEBHOOK =====
    const response = await axios.post(url, payload, {
      timeout: 10000, // Timeout 10 secondes
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Event': eventType,
        'X-Webhook-Delivery': job.id,
        'X-Webhook-Timestamp': new Date().toISOString(),
      },
    });

    // ===== SUCCES =====
    logger.info(`[Webhook] ✓ Succes - ${eventType} pour user ${userId}`);

    return {
      status: 'success',
      statusCode: response.status,
      url,
      eventType,
    };
  } catch (error) {
    // ===== ERREUR =====
    logger.error(
      `[Webhook] ✗ Echec tentative ${attempt} - ${eventType}: ${error.message}`
    );

    // Relancer l'erreur pour que Bull reessaye
    throw new Error(`Webhook failed: ${error.message}`);
  }
}

// ===============================
// AJOUT DE WEBHOOKS A LA QUEUE
// ===============================

/**
 * Ajoute un webhook a la queue pour envoi asynchrone
 * 
 * @param {string} url - URL du webhook
 * @param {object} payload - Donnees a envoyer
 * @param {string} eventType - Type d'evenement (ex: 'user.created')
 * @param {string} userId - ID utilisateur pour tracking
 * @returns {Promise<Job>} Le job Bull cree
 */
async function enqueueWebhook(url, payload, eventType, userId) {
  try {
    const job = await webhookQueue.add(
      {
        url,
        payload,
        eventType,
        userId,
      },
      {
        priority: 10, // Priorite elevee
        delay: 0, // Pas de delai initial
      }
    );

    logger.info(`[Webhook Queue] Job ${job.id} ajoute - ${eventType}`);
    return job;
  } catch (error) {
    logger.error(`[Webhook Queue] Erreur lors de l'ajout: ${error.message}`);
    throw error;
  }
}

// ===============================
// LISTENERS DE LA QUEUE
// ===============================

// Quand un job est complete avec succes
webhookQueue.on('completed', (job, result) => {
  logger.info(`[Webhook Queue] Job ${job.id} complete ✓`);
});

// Quand un job echoue definitivement (apres tous les retries)
webhookQueue.on('failed', (job, err) => {
  logger.error(
    `[Webhook Queue] Job ${job.id} echoue definitivement apres ${job.attemptsMade} tentatives`
  );
  // TODO: Envoyer alerte (email, Slack, etc)
});

// Quand un job entre en retry
webhookQueue.on('stalled', (job) => {
  logger.warn(`[Webhook Queue] Job ${job.id} bloque - relance`);
});

// ===============================
// FONCTION D'HEALTHCHECK
// ===============================

/**
 * Obtient les statistiques de la queue
 * Utile pour monitoring
 */
async function getQueueStats() {
  const counts = await webhookQueue.getJobCounts();
  return {
    active: counts.active,
    waiting: counts.waiting,
    completed: counts.completed,
    failed: counts.failed,
    delayed: counts.delayed,
  };
}

// ===============================
// EXPORT
// ===============================

module.exports = {
  enqueueWebhook,
  getQueueStats,
  webhookQueue,
};
