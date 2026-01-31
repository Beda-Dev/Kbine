const express = require('express');
const router = express.Router();
const { enqueueWebhook, getQueueStats } = require('../services/webhookQueue');
const logger = require('../utils/logger');

// ===============================
// ROUTE: STATS DE LA QUEUE
// ===============================

/**
 * GET /webhooks/stats
 * Retourne les statistiques de la queue de webhooks
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json({
      queue: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`Erreur stats webhooks: ${error.message}`);
    res.status(500).json({ error: 'Erreur lors de la recuperation des stats' });
  }
});

// ===============================
// ROUTE: TESTER L'ENVOI (DEBUG)
// ===============================

/**
 * POST /webhooks/test
 * Ajoute un webhook test a la queue
 *
 * Body: { url: "https://webhook.site/xxx" }
 */
router.post('/test', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL requise' });
    }

    // Envoyer le webhook a la queue
    const job = await enqueueWebhook(
      url,
      { test: true, timestamp: new Date() },
      'test.event',
      'test-user'
    );

    res.status(202).json({
      message: 'Webhook ajoute a la queue',
      jobId: job.id,
      status: 'pending',
    });
  } catch (error) {
    logger.error(`Erreur test webhook: ${error.message}`);
    res.status(500).json({ error: 'Erreur lors de l\'ajout du webhook' });
  }
});

module.exports = router;
