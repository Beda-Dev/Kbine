/**
 * Service de paiement TouchPoint (MTN, Orange Money, Moov, Wave)
 * 
 */

const axios = require("axios")
const logger = require("../utils/logger")
const paymentConfig = require("../config/payment")
const retryableHttpClient = require("../utils/retryableHttpClient")

class TouchPointService {
  constructor() {
    this.apiUrl = paymentConfig.touchpoint.apiUrl
    this.username = paymentConfig.touchpoint.username
    this.password = paymentConfig.touchpoint.password
    this.agencyCode = paymentConfig.touchpoint.agencyCode
    this.loginAgent = paymentConfig.touchpoint.loginAgent
    this.passwordAgent = paymentConfig.touchpoint.passwordAgent
    this.serviceCodes = paymentConfig.touchpoint.serviceCodes
    this.partnerName = paymentConfig.touchpoint.partnerName
    this.appUrl = paymentConfig.appUrl
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
   * Générer les URLs de callback pour Wave
   */
  generateCallbackUrls(orderReference, paymentMethod) {
    const baseUrl = this.appUrl
    
    return {
      return_url: `${baseUrl}/payments/return/${orderReference}/successful`,
      cancel_url: `${baseUrl}/payments/return/${orderReference}/failed`,
      error_url: `${baseUrl}/payments/return/${orderReference}/failed`
    }
  }

  /**
   * Formater le numéro de téléphone (retirer le préfixe +225 si présent)
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber) return phoneNumber
    
    // Si le numéro commence par +225, on le retire
    if (phoneNumber.startsWith('+225')) {
      return phoneNumber.substring(4)
    }
    
    // Si le numéro a 10 chiffres et ne commence pas par 225
    if (phoneNumber.length === 10 && phoneNumber.startsWith('0')) {
      return phoneNumber
    }
    
    return phoneNumber
  }

  /**
   * Créer une transaction TouchPoint
   * ✅ AMÉLIORÉE - Support complet de Wave avec return_url, cancel_url, partner_name
   */
  async createTransaction(params) {
    console.log('[TouchPointService] Création de transaction:', JSON.stringify(params, null, 2))
    const { 
      amount, 
      payment_phone, 
      payment_method, 
      transaction_id, 
      otp,
      order_reference,
      return_url,
      cancel_url,
      error_url
    } = params

    try {
      // Validation OTP pour Orange Money
      if (payment_method === "orange_money" && !otp) {
        throw new Error("L'OTP est obligatoire pour les paiements Orange Money")
      }

      logger.info("[TouchPointService] Création transaction", {
        amount,
        payment_phone,
        payment_method,
        transaction_id,
        order_reference
      })

      const serviceCode = this.getServiceCode(payment_method)
      console.log(`[TouchPointService] Code de service pour ${payment_method}:`, serviceCode)

      if (!serviceCode) {
        throw new Error(`Méthode de paiement non supportée: ${payment_method}`)
      }

      // Formater le numéro de téléphone
      const formattedPhone = this.formatPhoneNumber(payment_phone)
      console.log('[TouchPointService] Numéro formaté:', formattedPhone)

      // Construction de base de la transaction
      const transactionData = {
        idFromClient: transaction_id,
        amount: parseFloat(amount),
        callback: `${this.appUrl}/api/payments/webhook/touchpoint`,
        recipientNumber: formattedPhone,
        serviceCode: serviceCode,
        additionnalInfos: {
          destinataire: formattedPhone,
          recipientEmail: null,
          recipientFirstName: null,
          recipientLastName: null
        }
      }

      // ✅ Configuration spécifique pour Wave (comme dans PHP)
      if (payment_method === "wave") {
        // Générer ou utiliser les URLs fournies
        const callbackUrls = return_url && cancel_url 
          ? { return_url, cancel_url, error_url: error_url || cancel_url }
          : this.generateCallbackUrls(order_reference || transaction_id, payment_method)

        transactionData.additionnalInfos.partner_name = this.partnerName
        transactionData.additionnalInfos.return_url = callbackUrls.return_url
        transactionData.additionnalInfos.cancel_url = callbackUrls.cancel_url

        console.log('[TouchPointService] Configuration Wave:', {
          partner_name: this.partnerName,
          return_url: callbackUrls.return_url,
          cancel_url: callbackUrls.cancel_url
        })
      }

      // ✅ Configuration spécifique pour Orange Money 
      if (payment_method === "orange_money" && otp) {
        transactionData.additionnalInfos.otp = otp
        console.log('[TouchPointService] OTP ajouté pour Orange Money')
      }

      // Construction de l'URL
      const url = `${this.apiUrl}/${this.agencyCode}/transaction?loginAgent=${this.loginAgent}&passwordAgent=${this.passwordAgent}`
      console.log('[TouchPointService] URL de la requête:', url)
      console.log('[TouchPointService] Données envoyées:', JSON.stringify(transactionData, null, 2))

      // ✅ Appel API avec retry automatique pour les 429
      const response = await retryableHttpClient.put(url, transactionData, {
        auth: {
          username: this.username,
          password: this.password,
        },
        headers: {
          "Content-Type": "application/json",
        }
      })

      console.log('[TouchPointService] Réponse de l\'API:', JSON.stringify(response.data, null, 2))
      
      logger.info("[TouchPointService] Transaction créée avec succès", {
        status: response.data.status,
        transaction_id,
        payment_method,
        numTransaction: response.data.numTransaction
      })

      // ✅ Structure de réponse enrichie (comme dans PHP)
      const result = {
        success: true,
        status: response.data.status || 'INITIATED',
        transaction_id: transaction_id,
        touchpoint_transaction_id: response.data.numTransaction || response.data.idFromClient || response.data.id,
        message: response.data.message || "Transaction initiée avec succès",
        payment_method: payment_method,
        raw_response: response.data
      }

      // Ajouter les URLs de retour pour Wave
      if (payment_method === "wave" && transactionData.additionnalInfos.return_url) {
        result.return_url = transactionData.additionnalInfos.return_url
        result.cancel_url = transactionData.additionnalInfos.cancel_url
      }

      // Ajouter les frais si présents (comme dans PHP)
      if (response.data.fees) {
        result.fees = response.data.fees
      }

      return result
    } catch (error) {
      logger.error("[TouchPointService] Erreur création transaction", {
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        payment_method,
        transaction_id
      })

      // Message d'erreur détaillé
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message
        || "Erreur inconnue lors de la création de la transaction"

      throw new Error(`Erreur TouchPoint (${payment_method}): ${errorMessage}`)
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
      ACCEPTED: "pending",
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
    console.log('[TouchPointService] [checkTransactionStatus] === DÉBUT ===');
    console.log('[TouchPointService] [checkTransactionStatus] Vérification du statut de la transaction:', transactionId);
    console.log('[TouchPointService] [checkTransactionStatus] Type de transactionId:', typeof transactionId);
    
    try {
      console.log('[TouchPointService] [checkTransactionStatus] Construction de l\'URL');
      console.log('[TouchPointService] [checkTransactionStatus] apiUrl:', this.apiUrl);
      console.log('[TouchPointService] [checkTransactionStatus] agencyCode:', this.agencyCode);
      console.log('[TouchPointService] [checkTransactionStatus] loginAgent:', this.loginAgent);
      console.log('[TouchPointService] [checkTransactionStatus] passwordAgent:', this.passwordAgent);
      
      const url = `${this.apiUrl}/${this.agencyCode}/transaction/${transactionId}?loginAgent=${this.loginAgent}&passwordAgent=${this.passwordAgent}`;
      console.log('[TouchPointService] [checkTransactionStatus] URL construite:', url);
      
      console.log('[TouchPointService] [checkTransactionStatus] Préparation des headers d\'authentification');
      console.log('[TouchPointService] [checkTransactionStatus] Username:', this.username);
      console.log('[TouchPointService] [checkTransactionStatus] Password:', this.password ? '***' : 'non défini');
      
      console.log('[TouchPointService] [checkTransactionStatus] Envoi de la requête GET');
      // ✅ Appel API avec retry automatique pour les 429
      const response = await retryableHttpClient.get(url, {
        auth: {
          username: this.username,
          password: this.password,
        },
        timeout: 15000,
      });

      console.log('[TouchPointService] [checkTransactionStatus] Réponse reçue du serveur');
      console.log('[TouchPointService] [checkTransactionStatus] Status HTTP:', response.status);
      console.log('[TouchPointService] [checkTransactionStatus] Headers de réponse:', response.headers);
      console.log('[TouchPointService] [checkTransactionStatus] Données de réponse:', JSON.stringify(response.data, null, 2));

      const touchpointStatus = response.data.status;
      console.log('[TouchPointService] [checkTransactionStatus] Statut TouchPoint reçu:', touchpointStatus);

      const mappedStatus = this.mapStatus(touchpointStatus);
      console.log('[TouchPointService] [checkTransactionStatus] Statut mappé vers interne:', mappedStatus);

      const result = {
        success: true,
        status: response.data.status,
        // mapped_status: mappedStatus,
        data: response.data,
      };

      console.log('[TouchPointService] [checkTransactionStatus] Construction du résultat final');
      console.log('[TouchPointService] [checkTransactionStatus] Résultat:', JSON.stringify(result, null, 2));
      
      console.log('[TouchPointService] [checkTransactionStatus] === FIN RÉUSSIE ===');
      return result;
      
    } catch (error) {
      console.log('[TouchPointService] [checkTransactionStatus] === ERREUR ===');
      console.log('[TouchPointService] [checkTransactionStatus] Type d\'erreur:', error.constructor.name);
      console.log('[TouchPointService] [checkTransactionStatus] Message d\'erreur:', error.message);
      console.log('[TouchPointService] [checkTransactionStatus] Stack trace:', error.stack);
      
      if (error.response) {
        console.log('[TouchPointService] [checkTransactionStatus] Erreur HTTP détectée');
        console.log('[TouchPointService] [checkTransactionStatus] Status HTTP:', error.response.status);
        console.log('[TouchPointService] [checkTransactionStatus] Headers de réponse:', error.response.headers);
        console.log('[TouchPointService] [checkTransactionStatus] Données d\'erreur:', JSON.stringify(error.response.data, null, 2));
      } else if (error.request) {
        console.log('[TouchPointService] [checkTransactionStatus] Erreur réseau détectée');
        console.log('[TouchPointService] [checkTransactionStatus] Aucune réponse reçue du serveur');
        console.log('[TouchPointService] [checkTransactionStatus] Request:', error.request);
      } else {
        console.log('[TouchPointService] [checkTransactionStatus] Erreur client détectée');
      }

      logger.error("[TouchPointService] [checkTransactionStatus] Erreur vérification statut", {
        error: error.message,
        transactionId,
        statusCode: error.response?.status,
        errorData: error.response?.data,
      });

      console.log('[TouchPointService] [checkTransactionStatus] Propagation de l\'erreur');
      throw error;
    }
  }

  /**
   * Annuler une transaction en attente
   */
  async cancelTransaction(transactionId) {
    try {
      console.log('[TouchPointService] Annulation transaction:', transactionId)
      
      const url = `${this.apiUrl}/${this.agencyCode}/transaction/${transactionId}/cancel?loginAgent=${this.loginAgent}&passwordAgent=${this.passwordAgent}`
      
      // ✅ Appel API avec retry automatique pour les 429
      const response = await retryableHttpClient.post(url, {}, {
        auth: {
          username: this.username,
          password: this.password,
        },
        timeout: 15000,
      })

      logger.info('[TouchPointService] Transaction annulée', {
        transactionId,
        response: response.data
      })

      return {
        success: true,
        message: "Transaction annulée avec succès",
        data: response.data
      }
    } catch (error) {
      logger.error("[TouchPointService] Erreur annulation transaction", {
        error: error.message,
        transactionId,
      })
      throw error
    }
  }
}

module.exports = new TouchPointService()