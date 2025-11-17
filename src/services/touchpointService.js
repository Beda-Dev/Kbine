/**
 * Service de paiement TouchPoint (MTN, Orange Money, Moov, Wave)
 * ✅ VERSION CORRIGÉE
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
     */
  async createTransaction(params) {
    console.log('[TouchPointService] Création de transaction:', JSON.stringify(params, null, 2))
    const { amount, payment_phone, payment_method, transaction_id, otp } = params

    try {
      //  Validation OTP pour Orange Money
      if (payment_method === "orange_money" && !otp) {
        throw new Error("L'OTP est obligatoire pour les paiements Orange Money")
      }

      logger.info("[TouchPointService] Création transaction", {
        amount,
        payment_phone,
        payment_method,
        transaction_id,
      })

      const serviceCode = this.getServiceCode(payment_method)
      console.log(`[TouchPointService] Code de service pour ${payment_method}:`, serviceCode)

      if (!serviceCode) {
        throw new Error(`Méthode de paiement non supportée: ${payment_method}`)
      }

      
      const transactionData = {
        idFromClient: transaction_id,
        amount: parseFloat(amount), 
        callback: `${paymentConfig.appUrl}/api/payments/webhook/touchpoint`,
        recipientNumber: payment_phone,
        serviceCode: serviceCode,
        additionnalInfos: {
          destinataire: payment_phone,
        }
      }

      //  l'OTP pour Orange Money
      if (payment_method === "orange_money" && otp) {
        transactionData.additionnalInfos.otp = otp
      }

      
      const url = `${this.apiUrl}/${this.agencyCode}/transaction?loginAgent=${this.loginAgent}&passwordAgent=${this.passwordAgent}`
      console.log('[TouchPointService] URL de la requête:', url)
      console.log('[TouchPointService] Données envoyées:', JSON.stringify(transactionData, null, 2))

      
      const response = await axios.put(url, transactionData, {
        auth: {
          username: this.username,
          password: this.password,
        },
        headers: {
          "Content-Type": "application/json",
        }
      })

      console.log('[TouchPointService] Réponse de l\'API:', JSON.stringify(response.data, null, 2))
      
      logger.info("[TouchPointService] Transaction créée", {
        status: response.data.status,
        transaction_id,
      })

      // Retourner une structure cohérente
      return {
        success: true,
        status: response.data.status || 'INITIATED',
        transaction_id: transaction_id,
        touchpoint_transaction_id: response.data.idFromClient || response.data.id,
        message: response.data.message || "Transaction initiée avec succès",
        raw_response: response.data 
      }
    } catch (error) {
      logger.error("[TouchPointService] Erreur création transaction", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })

     
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message
        || "Erreur inconnue lors de la création de la transaction"

      throw new Error(`Erreur TouchPoint: ${errorMessage}`)
    }
  }

  /**
   * Mapper le statut TouchPoint vers le statut interne
   */
  mapStatus(touchpointStatus) {
    console.log(`[TouchPointService] Mapping du statut: ${touchpointStatus}`)
    
    const statusMap = {
      SUCCESSFUL: "success",
      INITIATED: "pending",
      PENDING: "pending",
      FAILED: "failed",
      TIMEOUT: "failed",
      CANCELLED: "failed",
      REFUSED: "failed",
    }

    const status = statusMap[touchpointStatus?.toUpperCase()] || "pending"
    console.log(`[TouchPointService] Statut mappé: ${status}`)
    return status
  }

  /**
   * Vérifier le statut d'une transaction
   */
  async checkTransactionStatus(transactionId) {
    try {
      const url = `${this.apiUrl}/${this.agencyCode}/transaction/${transactionId}?loginAgent=${this.loginAgent}&passwordAgent=${this.passwordAgent}`
      
      const response = await axios.get(url, {
        auth: {
          username: this.username,
          password: this.password,
        },
        timeout: 15000,
      })

      return {
        success: true,
        status: response.data.status,
        data: response.data,
      }
    } catch (error) {
      logger.error("[TouchPointService] Erreur vérification statut", {
        error: error.message,
        transactionId,
      })
      throw error
    }
  }
}

module.exports = new TouchPointService()