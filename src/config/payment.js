/**
 * Configuration des systèmes de paiement Wave et TouchPoint
 */

const paymentConfig = {
  // Configuration Wave
  wave: {
    apiUrl: process.env.WAVE_API_URL || 'https://api.wavepayments.com',
    apiToken: process.env.WAVE_API_TOKEN || 'your_api_token',
    webhookSecret: process.env.WAVE_WEBHOOK_SECRET || 'your_webhook_secret',
    currency: "XOF",
  },

  // Configuration TouchPoint
  touchpoint: {
    apiUrl: process.env.TOUCHPOINT_API_URL || 'https://api.touchpoint.com',
    username: process.env.TOUCHPOINT_USERNAME || 'your_username',
    password: process.env.TOUCHPOINT_PASSWORD || 'your_password',
    agencyCode: process.env.TOUCHPOINT_AGENCY_CODE || 'your_agency_code',
    loginAgent: process.env.TOUCHPOINT_LOGIN_AGENT || 'your_login_agent',
    passwordAgent: process.env.TOUCHPOINT_PASSWORD_AGENT || 'your_password_agent',

    // Codes de service TouchPoint
    serviceCodes: {
      mtn_money: "PAIEMENTMARCHAND_MTN_CI",
      orange_money: "PAIEMENTMARCHANDOMPAYCIDIRECT",
      moov_money: "PAIEMENTMARCHAND_MOOV_CI",
      wave: "CI_PAIEMENTWAVE_TP",
    },
  },

  // URL de l'application pour les callbacks
  appUrl: process.env.APP_URL || "http://localhost:3000",

  // Statuts de paiement
  paymentStatus: {
    INITIATED: "pending",
    ACCEPTED: "success",
    REFUSED: "failed",
    TIMEOUT: "failed",
    SUCCESSFUL: "success",
  },
}

console.log('[PaymentConfig] Chargement configuration', {
  wave: {
    apiUrl: paymentConfig.wave.apiUrl,
    currency: paymentConfig.wave.currency,
    apiToken_len: process.env.WAVE_API_TOKEN ? process.env.WAVE_API_TOKEN.length : 0,
    webhookSecret_len: process.env.WAVE_WEBHOOK_SECRET ? process.env.WAVE_WEBHOOK_SECRET.length : 0,
  },
  touchpoint: {
    apiUrl: paymentConfig.touchpoint.apiUrl,
    username: paymentConfig.touchpoint.username,
    password_len: process.env.TOUCHPOINT_PASSWORD ? process.env.TOUCHPOINT_PASSWORD.length : 0,
    loginAgent: paymentConfig.touchpoint.loginAgent,
    passwordAgent_len: process.env.TOUCHPOINT_PASSWORD_AGENT ? process.env.TOUCHPOINT_PASSWORD_AGENT.length : 0,
    agencyCode: paymentConfig.touchpoint.agencyCode,
    serviceCodes: paymentConfig.touchpoint.serviceCodes,
  },
  appUrl: paymentConfig.appUrl,
})

module.exports = paymentConfig
