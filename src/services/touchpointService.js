/**
 * Service de paiement TouchPoint (MTN, Orange Money, Moov, Wave)
 */

const axios = require("axios")
const logger = require("../utils/logger")
const paymentConfig = require("../config/payment")

class TouchPointService {
  constructor() {
    this.apiUrl = paymentConfig.touchpoint.apiUrl
    this.username = paymentConfig.touchpoint.username
    this.password = paymentConfig.touchpoint.password
    this.agencyCode = paymentConfig.touchpoint.agencyCode
    this.loginAgent = paymentConfig.touchpoint.loginAgent
    this.passwordAgent = paymentConfig.touchpoint.passwordAgent
    this.serviceCodes = paymentConfig.touchpoint.serviceCodes
  }

  /**
   * Obtenir le code de service TouchPoint selon la méthode de paiement
   * @param {string} paymentMethod - Méthode de paiement
   * @returns {string} - Code de service
   */
  getServiceCode(paymentMethod) {
    const serviceCodeMap = {
      mtn_money: this.serviceCodes.mtn_money,
      orange_money: this.serviceCodes.orange_money,
      moov_money: this.serviceCodes.moov_money,
      wave: this.serviceCodes.wave,
    }

    return serviceCodeMap[paymentMethod]
  }

  /**
   * Créer une transaction TouchPoint
   * @param {Object} params - Paramètres de paiement
   * @returns {Promise<Object>} - Résultat de la transaction
   */
  async createTransaction(params) {
    console.log('[TouchPointService] Création de transaction avec les paramètres:', JSON.stringify(params, null, 2));
    const { amount, payment_phone, payment_method, transaction_id, otp } = params

    try {
      logger.info("[TouchPointService] Création transaction", {
        amount,
        payment_phone,
        payment_method,
        transaction_id,
      })

      const serviceCode = this.getServiceCode(payment_method)
      console.log(`[TouchPointService] Code de service pour ${payment_method}:`, serviceCode);

      if (!serviceCode) {
        throw new Error(`Méthode de paiement non supportée: ${payment_method}`)
      }

      console.log('[TouchPointService] Préparation des données de transaction');
      const transactionData = {
        idFromClient: transaction_id,
        additionnalInfos: {
          recipientEmail: null,
          recipientFirstName: null,
          recipientLastName: null,
          destinataire: payment_phone,
        },
        amount: amount,
        callback: `${paymentConfig.appUrl}/api/payments/webhook/touchpoint`,
        recipientNumber: payment_phone,
        serviceCode: serviceCode,
      }

      // Ajouter l'OTP pour Orange Money
      console.log(`[TouchPointService] Vérification OTP pour ${payment_method}`, { hasOtp: !!otp });
      if (payment_method === "orange_money" && otp) {
        transactionData.additionnalInfos.otp = otp
      }

      const url = `${this.apiUrl}/${this.agencyCode}/transaction?loginAgent=${this.loginAgent}&passwordAgent=${this.passwordAgent}`
      console.log('[TouchPointService] URL de la requête:', url);
      console.log('[TouchPointService] Données envoyées:', JSON.stringify(transactionData, null, 2));

      const response = await axios.put(url, transactionData, {
        auth: {
          username: this.username,
          password: this.password,
        },
        headers: {
          "Content-Type": "application/json",
        },
      })

      console.log('[TouchPointService] Réponse de l\'API:', JSON.stringify(response.data, null, 2));
      logger.info("[TouchPointService] Transaction créée", {
        status: response.data.status,
        transaction_id,
      })

      return {
        success: true,
        status: response.data.status,
        transaction_id: transaction_id,
        message: response.data.message || "Transaction initiée",
      }
    } catch (error) {
      logger.error("[TouchPointService] Erreur création transaction", {
        error: error.message,
        response: error.response?.data,
      })

      throw new Error(`Erreur TouchPoint: ${error.response?.data?.message || error.message}`)
    }
  }

  /**
   * Mapper le statut TouchPoint vers le statut interne
   * @param {string} touchpointStatus - Statut TouchPoint
   * @returns {string} - Statut interne
   */
  mapStatus(touchpointStatus) {
    console.log(`[TouchPointService] Mapping du statut: ${touchpointStatus}`);
    const statusMap = {
      SUCCESSFUL: "success",
      INITIATED: "pending",
      FAILED: "failed",
      TIMEOUT: "failed",
    }

    const status = statusMap[touchpointStatus] || "pending";
    console.log(`[TouchPointService] Statut mappé: ${status}`);
    return status;
  }
}

module.exports = new TouchPointService()
