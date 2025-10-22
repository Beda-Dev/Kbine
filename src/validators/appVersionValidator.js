// FILE: appVersionValidator.js
const Joi = require('joi');

/**
 * Validation pour la récupération de version
 */
const getVersionValidation = (query) => {
    const schema = Joi.object({
        platform: Joi.string()
            .valid('ios', 'android')
            .required()
            .messages({
                'string.base': 'La plateforme doit être une chaîne de caractères',
                'any.only': 'La plateforme doit être "ios" ou "android"',
                'any.required': 'La plateforme est requise'
            })
    });

    return schema.validate(query, { abortEarly: false });
};

/**
 * Validation pour la mise à jour de version
 */
const updateVersionValidation = (data) => {
    const schema = Joi.object({
        ios_version: Joi.string()
            .pattern(/^\d+\.\d+\.\d+$/)
            .required()
            .messages({
                'string.base': 'La version iOS doit être une chaîne de caractères',
                'string.pattern.base': 'La version iOS doit être au format X.X.X (ex: 1.1.2)',
                'any.required': 'La version iOS est requise'
            }),
            
        ios_build_number: Joi.number()
            .integer()
            .positive()
            .required()
            .messages({
                'number.base': 'Le numéro de build iOS doit être un nombre',
                'number.integer': 'Le numéro de build iOS doit être un entier',
                'number.positive': 'Le numéro de build iOS doit être positif',
                'any.required': 'Le numéro de build iOS est requis'
            }),
            
        android_version: Joi.string()
            .pattern(/^\d+\.\d+\.\d+$/)
            .required()
            .messages({
                'string.base': 'La version Android doit être une chaîne de caractères',
                'string.pattern.base': 'La version Android doit être au format X.X.X (ex: 1.1.2)',
                'any.required': 'La version Android est requise'
            }),
            
        android_build_number: Joi.number()
            .integer()
            .positive()
            .required()
            .messages({
                'number.base': 'Le numéro de build Android doit être un nombre',
                'number.integer': 'Le numéro de build Android doit être un entier',
                'number.positive': 'Le numéro de build Android doit être positif',
                'any.required': 'Le numéro de build Android est requis'
            }),
            
        force_update: Joi.boolean()
            .default(false)
            .messages({
                'boolean.base': 'Le champ force_update doit être un booléen'
            })
    });

    return schema.validate(data, { abortEarly: false, stripUnknown: true });
};

module.exports = {
    getVersionValidation,
    updateVersionValidation
};