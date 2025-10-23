// ==========================================
// FILE: paymentValidator.js (MIS À JOUR)
// Modifications:
// - Ajout du champ payment_phone
// ==========================================
const Joi = require('joi');

/**
 * Schémas de validation pour les paiements
 */

// Schéma de base pour un paiement
const paymentSchema = Joi.object({
    order_id: Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'L\'ID de la commande doit être un nombre',
            'number.integer': 'L\'ID de la commande doit être un entier',
            'number.positive': 'L\'ID de la commande doit être un nombre positif',
            'any.required': 'L\'ID de la commande est obligatoire'
        }),
    
    amount: Joi.number()
        .positive()
        .precision(2)
        .required()
        .messages({
            'number.base': 'Le montant doit être un nombre',
            'number.positive': 'Le montant doit être un nombre positif',
            'number.precision': 'Le montant doit avoir au maximum 2 décimales',
            'any.required': 'Le montant est obligatoire'
        }),
    
    payment_method: Joi.string()
        .valid('wave', 'orange_money', 'mtn_money', 'moov_money')
        .required()
        .messages({
            'string.base': 'La méthode de paiement doit être une chaîne de caractères',
            'any.only': 'Méthode de paiement non valide',
            'any.required': 'La méthode de paiement est obligatoire'
        }),
    
    payment_phone: Joi.string()
        .pattern(/^0[0-9]{9}$/)
        .optional()
        .allow(null, '')
        .messages({
            'string.base': 'Le numéro de téléphone de paiement doit être une chaîne de caractères',
            'string.pattern.base': 'Le numéro de téléphone doit être un numéro ivoirien valide (10 chiffres commençant par 0)'
        }),
    
    payment_reference: Joi.string()
        .required()
        .messages({
            'string.base': 'La référence de paiement doit être une chaîne de caractères',
            'string.empty': 'La référence de paiement ne peut pas être vide',
            'any.required': 'La référence de paiement est obligatoire'
        }),
    
    external_reference: Joi.string()
        .optional()
        .messages({
            'string.base': 'La référence externe doit être une chaîne de caractères'
        }),
    
    status: Joi.string()
        .valid('pending', 'success', 'failed', 'refunded')
        .default('pending')
        .messages({
            'string.base': 'Le statut doit être une chaîne de caractères',
            'any.only': 'Statut de paiement non valide'
        }),
    
    status_notes: Joi.string()
        .optional()
        .messages({
            'string.base': 'Les notes de statut doivent être une chaîne de caractères'
        }),
    
    callback_data: Joi.object()
        .optional()
        .messages({
            'object.base': 'Les données de callback doivent être un objet'
        })
});

/**
 * Validation pour la création d'un paiement
 */
// const createPaymentValidation = (data) => {
//     return paymentSchema.validate(data, { 
//         abortEarly: false,
//         stripUnknown: true
//     });
// };

/**
 * Validation pour la mise à jour d'un paiement
 */
const updatePaymentValidation = (data) => {
    const updateSchema = Joi.object({
        order_id: Joi.number()
            .integer()
            .positive()
            .messages({
                'number.base': 'L\'ID de la commande doit être un nombre',
                'number.integer': 'L\'ID de la commande doit être un entier',
                'number.positive': 'L\'ID de la commande doit être un nombre positif'
            }),
        amount: Joi.number()
            .positive()
            .precision(2)
            .messages({
                'number.base': 'Le montant doit être un nombre',
                'number.positive': 'Le montant doit être un nombre positif',
                'number.precision': 'Le montant doit avoir au maximum 2 décimales'
            }),
        
        payment_phone: Joi.string()
            .pattern(/^0[0-9]{9}$/)
            .allow(null, '')
            .messages({
                'string.base': 'Le numéro de téléphone de paiement doit être une chaîne de caractères',
                'string.pattern.base': 'Le numéro de téléphone doit être un numéro ivoirien valide (10 chiffres commençant par 0)'
            }),
            
        status: Joi.string()
            .valid('pending', 'success', 'failed', 'refunded')
            .messages({
                'string.base': 'Le statut doit être une chaîne de caractères',
                'any.only': 'Statut de paiement non valide. Les statuts valides sont: pending, success, failed, refunded'
            }),
            
        status_notes: Joi.string()
            .trim()
            .allow('', null)
            .messages({
                'string.base': 'Les notes de statut doivent être une chaîne de caractères'
            }),
            
        callback_data: Joi.object()
            .messages({
                'object.base': 'Les données de callback doivent être un objet'
            })
    }).min(1).messages({
        'object.min': 'Au moins un champ doit être fourni pour la mise à jour'
    });
    
    return updateSchema.validate(data, { 
        abortEarly: false,
        stripUnknown: true
    });
};

/**
 * Validation pour la mise à jour du statut d'un paiement
 */
const updatePaymentStatusValidation = (data) => {
    const schema = Joi.object({
        status: Joi.string()
            .valid('pending', 'success', 'failed', 'refunded')
            .required()
            .messages({
                'string.base': 'Le statut doit être une chaîne de caractères',
                'any.only': 'Statut de paiement non valide. Les statuts acceptés sont: pending, success, failed, refunded',
                'any.required': 'Le statut est obligatoire'
            }),
            
        notes: Joi.string()
            .trim()
            .allow('', null)
            .messages({
                'string.base': 'Les notes doivent être une chaîne de caractères'
            })
    });
    
    return schema.validate(data, { 
        abortEarly: false,
        stripUnknown: true
    });
};

/**
 * Validation pour un remboursement
 */
const refundPaymentValidation = (data) => {
    const schema = Joi.object({
        reason: Joi.string()
            .trim()
            .max(500)
            .required()
            .messages({
                'string.base': 'La raison du remboursement doit être une chaîne de caractères',
                'string.empty': 'La raison du remboursement ne peut pas être vide',
                'string.max': 'La raison ne doit pas dépasser 500 caractères',
                'any.required': 'La raison du remboursement est obligatoire'
            })
    });
    
    return schema.validate(data, { 
        abortEarly: false,
        stripUnknown: true
    });
};

/**
 * Validation de l'ID de paiement
 */
const paymentIdValidation = (id) => {
    const schema = Joi.number()
        .integer()
        .positive()
        .required()
        .messages({
            'number.base': 'L\'ID du paiement doit être un nombre',
            'number.integer': 'L\'ID du paiement doit être un entier',
            'number.positive': 'L\'ID du paiement doit être un nombre positif',
            'any.required': 'L\'ID du paiement est obligatoire'
        });
    
    return schema.validate(id, { convert: true });
};

/**
 * Validation pour la création d'un paiement
 */
const createPaymentValidation = (data) => {
  const schema = Joi.object({
    order_reference: Joi.string()
      .pattern(/^ORD-\d{8}-[A-Z0-9]{5}$/)
      .required()
      .messages({
        "string.base": "La référence de commande doit être une chaîne de caractères",
        "string.pattern.base": "Format de référence de commande invalide (ex: ORD-20250123-ABC12)",
        "any.required": "La référence de commande est obligatoire",
      }),

    amount: Joi.number().positive().precision(2).required().messages({
      "number.base": "Le montant doit être un nombre",
      "number.positive": "Le montant doit être un nombre positif",
      "number.precision": "Le montant doit avoir au maximum 2 décimales",
      "any.required": "Le montant est obligatoire",
    }),

    payment_phone: Joi.string()
      .pattern(/^0[0-9]{9}$/)
      .required()
      .messages({
        "string.base": "Le numéro de téléphone doit être une chaîne de caractères",
        "string.pattern.base":
          "Le numéro de téléphone doit être un numéro ivoirien valide (10 chiffres commençant par 0)",
        "any.required": "Le numéro de téléphone est obligatoire",
      }),

    payment_method: Joi.string().valid("wave", "orange_money", "mtn_money", "moov_money").required().messages({
      "string.base": "La méthode de paiement doit être une chaîne de caractères",
      "any.only": "Méthode de paiement non valide. Méthodes acceptées: wave, orange_money, mtn_money, moov_money",
      "any.required": "La méthode de paiement est obligatoire",
    }),

    otp: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .optional()
      .messages({
        "string.base": "L'OTP doit être une chaîne de caractères",
        "string.pattern.base": "L'OTP doit être un code à 6 chiffres",
      }),
  })

  return schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  })
}

/**
 * Validation pour la mise à jour d'un paiement
 */
// const updatePaymentValidation = (data) => {
//   const schema = Joi.object({
//     amount: Joi.number().positive().precision(2).optional().messages({
//       "number.base": "Le montant doit être un nombre",
//       "number.positive": "Le montant doit être un nombre positif",
//       "number.precision": "Le montant doit avoir au maximum 2 décimales",
//     }),

//     payment_method: Joi.string().valid("wave", "orange_money", "mtn_money", "moov_money").optional().messages({
//       "string.base": "La méthode de paiement doit être une chaîne de caractères",
//       "any.only": "Méthode de paiement non valide. Méthodes acceptées: wave, orange_money, mtn_money, moov_money",
//     }),
//   })

//   return schema.validate(data, {
//     abortEarly: false,
//     stripUnknown: true,
//   })
// }

/**
 * Validation pour la mise à jour du statut d'un paiement
 */
// const updatePaymentStatusValidation = (data) => {
//   const schema = Joi.object({
//     status: Joi.string().valid("pending", "success", "failed", "refunded").required().messages({
//       "string.base": "Le statut doit être une chaîne de caractères",
//       "any.only": "Statut non valide. Statuts acceptés: pending, success, failed, refunded",
//       "any.required": "Le statut est obligatoire",
//     }),
//   })

//   return schema.validate(data, {
//     abortEarly: false,
//     stripUnknown: true,
//   })
// }

/**
 * Validation pour le remboursement d'un paiement
 */
// const refundPaymentValidation = (data) => {
//   const schema = Joi.object({
//     payment_id: Joi.string().required().messages({
//       "string.base": "L'ID de paiement doit être une chaîne de caractères",
//       "any.required": "L'ID de paiement est obligatoire",
//     }),

//     amount: Joi.number().positive().precision(2).required().messages({
//       "number.base": "Le montant doit être un nombre",
//       "number.positive": "Le montant doit être un nombre positif",
//       "number.precision": "Le montant doit avoir au maximum 2 décimales",
//       "any.required": "Le montant est obligatoire",
//     }),
//   })

//   return schema.validate(data, {
//     abortEarly: false,
//     stripUnknown: true,
//   })
// }

// /**
//  * Validation pour l'ID de paiement
//  */
// const paymentIdValidation = (data) => {
//   const schema = Joi.object({
//     payment_id: Joi.string().required().messages({
//       "string.base": "L'ID de paiement doit être une chaîne de caractères",
//       "any.required": "L'ID de paiement est obligatoire",
//     }),
//   })

//   return schema.validate(data, {
//     abortEarly: false,
//     stripUnknown: true,
//   })
// }

/**
 * Validation pour l'initialisation d'un paiement
 */
const initializePaymentValidation = (data) => {
  const schema = Joi.object({
    order_reference: Joi.string()
      .pattern(/^ORD-\d{8}-[A-Z0-9]{5}$/)
      .required()
      .messages({
        "string.base": "La référence de commande doit être une chaîne de caractères",
        "string.pattern.base": "Format de référence de commande invalide (ex: ORD-20250123-ABC12)",
        "any.required": "La référence de commande est obligatoire",
      }),

    amount: Joi.number().positive().precision(2).required().messages({
      "number.base": "Le montant doit être un nombre",
      "number.positive": "Le montant doit être un nombre positif",
      "number.precision": "Le montant doit avoir au maximum 2 décimales",
      "any.required": "Le montant est obligatoire",
    }),

    payment_phone: Joi.string()
      .pattern(/^0[0-9]{9}$/)
      .required()
      .messages({
        "string.base": "Le numéro de téléphone doit être une chaîne de caractères",
        "string.pattern.base":
          "Le numéro de téléphone doit être un numéro ivoirien valide (10 chiffres commençant par 0)",
        "any.required": "Le numéro de téléphone est obligatoire",
      }),

    payment_method: Joi.string().valid("wave", "orange_money", "mtn_money", "moov_money").required().messages({
      "string.base": "La méthode de paiement doit être une chaîne de caractères",
      "any.only": "Méthode de paiement non valide. Méthodes acceptées: wave, orange_money, mtn_money, moov_money",
      "any.required": "La méthode de paiement est obligatoire",
    }),

    otp: Joi.string()
      .pattern(/^[0-9]{6}$/)
      .optional()
      .messages({
        "string.base": "L'OTP doit être une chaîne de caractères",
        "string.pattern.base": "L'OTP doit être un code à 6 chiffres",
      }),
  })

  return schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  })
}

module.exports = {
    // Nouvelles fonctions de validation (recommandé)
    createPaymentValidation,
    updatePaymentValidation,
    updatePaymentStatusValidation,
    refundPaymentValidation,
    paymentIdValidation,
    initializePaymentValidation,
    
    // Constantes
    PAYMENT_METHODS: ['wave', 'orange_money', 'mtn_money', 'moov_money'],
    PAYMENT_STATUS: ['pending', 'success', 'failed', 'refunded']
};