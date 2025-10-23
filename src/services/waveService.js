/**
 * Service de paiement Wave CI
 */

const axios = require("axios")
const crypto = require("crypto")
const logger = require("../utils/logger")
const paymentConfig = require("../config/payment")

class WaveService {
  constructor() {
    console.log('[WaveService] Initialisation', {
      apiUrl: paymentConfig.wave.apiUrl,
      currency: paymentConfig.wave.currency,
    });
    this.apiUrl = paymentConfig.wave.apiUrl
    this.apiToken = paymentConfig.wave.apiToken
    this.webhookSecret = paymentConfig.wave.webhookSecret
    this.currency = paymentConfig.wave.currency
  }

  /**
   * Créer une session de paiement Wave
   * @param {Object} params - Paramètres de paiement
   * @returns {Promise<Object>} - Données de la session
   */
  async createCheckoutSession(params) {
    const { amount, order_reference, transaction_id } = params

    try {
      logger.info("[WaveService] Création session checkout", {
        amount,
        order_reference,
        transaction_id,
      })
      console.log("[WaveService] Création session checkout", {
        amount,
        order_reference,
        transaction_id,
      })

      const sessionData = {
        amount: amount,
        currency: this.currency,
        error_url: `${paymentConfig.appUrl}/api/payments/error/${order_reference}`,
        success_url: `${paymentConfig.appUrl}/api/payments/success/${order_reference}`,
        client_reference: transaction_id,
      }
      console.log('[WaveService] sessionData', JSON.stringify(sessionData, null, 2))
      const baseUrl = (this.apiUrl || '').replace(/\/+$/, '')
      const endpoint = baseUrl.includes('/checkout/sessions') ? baseUrl : `${baseUrl}/checkout/sessions`
      console.log('[WaveService] POST URL', endpoint)

      const response = await axios.post(endpoint, sessionData, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
      })

      console.log('[WaveService] Réponse API Wave', JSON.stringify(response.data, null, 2))

      logger.info("[WaveService] Session créée avec succès", {
        sessionId: response.data.id,
        checkoutUrl: response.data.wave_launch_url,
      })

      return {
        success: true,
        session_id: response.data.id,
        checkout_url: response.data.wave_launch_url,
        transaction_id: transaction_id,
      }
    } catch (error) {
      logger.error("[WaveService] Erreur création session", {
        error: error.message,
        response: error.response?.data,
      })
      console.log('[WaveService] Erreur création session', {
        message: error.message,
        response: error.response?.data,
      })

      throw new Error(`Erreur Wave: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Vérifier la signature du webhook Wave
   * @param {string} signature - Signature Wave
   * @param {string} body - Corps de la requête
   * @returns {Object|null} - Données décodées ou null si invalide
   */
  verifyWebhookSignature(signature, body) {
    try {
      console.log('[WaveService] verifyWebhookSignature - start', {
        signatureLength: signature?.length || 0,
        bodyLength: body?.length || 0,
      })
      const parts = signature.split(",")
      const timestamp = parts[0].split("=")[1]

      const signatures = parts.slice(1).map((part) => part.split("=")[1])

      // Calculer le HMAC
      const computedHmac = crypto
        .createHmac("sha256", this.webhookSecret)
        .update(timestamp + body)
        .digest("hex")
      console.log('[WaveService] verifyWebhookSignature - computedHmac', computedHmac)

      const isValid = signatures.includes(computedHmac)
      console.log('[WaveService] verifyWebhookSignature - isValid', isValid)

      if (isValid) {
        logger.info("[WaveService] Signature webhook valide")
        const parsed = JSON.parse(body)
        console.log('[WaveService] verifyWebhookSignature - parsed body', JSON.stringify(parsed, null, 2))
        return parsed
      } else {
        logger.error("[WaveService] Signature webhook invalide", { signature })
        return null
      }
    } catch (error) {
      logger.error("[WaveService] Erreur vérification signature", { error: error.message })
      console.log('[WaveService] verifyWebhookSignature - error', { message: error.message })
      return null
    }
  }

  /**
   * Mapper le statut Wave vers le statut interne
   * @param {string} waveStatus - Statut Wave
   * @returns {string} - Statut interne
   */
  mapStatus(waveStatus) {
    console.log('[WaveService] mapStatus - input', waveStatus)
    const statusMap = {
      succeeded: "success",
      failed: "failed",
      pending: "pending",
    }

    const mapped = statusMap[waveStatus] || "pending"
    console.log('[WaveService] mapStatus - mapped', mapped)
    return mapped
  }
}

module.exports = new WaveService()
