const db = require('../config/database');
const logger = require('../utils/logger');
const { userValidator, userUpdateValidator } = require('../validators/userValidator');
const { authenticateToken, requireRole } = require('../middlewares/auth');
const userService = require('../services/userService');

/**
 * Récupère tous les utilisateurs
 * Accessible uniquement aux administrateurs
 */
const getAllUsers = async (req, res) => {
    logger.info('👥 Récupération liste utilisateurs - Début', {
        requestingUserId: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip
    });
    try {
        const [rows] = await db.execute('SELECT id, phone_number, full_name, role, created_at, updated_at FROM users ORDER BY created_at DESC');

        logger.info('👥 Utilisateurs récupérés avec succès', {
            count: rows.length,
            requestingUserId: req.user?.id,
            ip: req.ip
        });

        return res.json({
            success: true,
            message: 'Liste des utilisateurs récupérée avec succès',
            data: rows,
            count: rows.length
        });
    } catch (error) {
        logger.error('👥 Erreur récupération liste utilisateurs', {
            error: {
                message: error.message,
                stack: error.stack
            },
            requestingUserId: req.user?.id,
            ip: req.ip
        });
        logger.error('Erreur lors de la récupération des utilisateurs:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération des utilisateurs'
        });
    }
};

/**
 * Récupère un utilisateur par son ID
 * Accessible aux administrateurs et à l'utilisateur lui-même
 */
const getUserById = async (req, res) => {
    logger.info('👥 Récupération utilisateur par ID - Début', {
        targetUserId: req.params.id,
        requestingUserId: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip
    });
    try {
        const userId = parseInt(req.params.id);

        // Vérification que l'utilisateur demande ses propres infos ou est admin
        if (req.user.id !== userId && req.user.role !== 'admin') {
            logger.warn('👥 Accès refusé - utilisateur non autorisé', {
                targetUserId: userId,
                requestingUserId: req.user?.id,
                userRole: req.user?.role,
                ip: req.ip
            });
            return res.status(403).json({
                success: false,
                error: 'Accès non autorisé'
            });
        }

        logger.debug('👥 Recherche utilisateur en BDD', {
            targetUserId: userId,
            requestingUserId: req.user?.id
        });
        const [rows] = await db.execute(
            'SELECT id, phone_number, full_name, role, created_at, updated_at FROM users WHERE id = ?',
            [userId]
        );

        if (rows.length === 0) {
            logger.warn('👥 Utilisateur non trouvé', {
                targetUserId: userId,
                requestingUserId: req.user?.id,
                ip: req.ip
            });
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }

        logger.info('👥 Utilisateur récupéré avec succès', {
            targetUserId: userId,
            requestingUserId: req.user?.id,
            ip: req.ip
        });

        return res.json({
            success: true,
            message: 'Utilisateur récupéré avec succès',
            data: rows[0]
        });
    } catch (error) {
        logger.error('👥 Erreur récupération utilisateur par ID', {
            error: {
                message: error.message,
                stack: error.stack
            },
            targetUserId: req.params.id,
            requestingUserId: req.user?.id,
            ip: req.ip
        });
        logger.error('Erreur lors de la récupération de l\'utilisateur:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération de l\'utilisateur'
        });
    }
};

/**
 * Crée un nouvel utilisateur
 * Accessible uniquement aux administrateurs
 * POST /api/users
 */
const createUser = async (req, res) => {
    const context = '[UserController] [createUser]';
    
    logger.info('👥 Création utilisateur - Début', {
        userData: { ...req.body, phone_number: '***' },
        createdBy: req.user?.id,
        ip: req.ip
    });
    
    try {
        // Validation des données d'entrée
        let validatedData;
        try {
            validatedData = await userValidator(req.body);
            logger.debug(`${context} Données de création validées avec succès`, { 
                validatedData: { ...validatedData, phone_number: '***' }
            });
        } catch (validationError) {
            if (validationError.isJoi) {
                logger.warn(`${context} Erreur de validation`, {
                    error: validationError.message,
                    details: validationError.details,
                    createdBy: req.user?.id,
                    ip: req.ip
                });
                
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: validationError.details
                });
            }
            
            logger.error(`${context} Erreur lors de la validation`, {
                error: validationError.message,
                stack: validationError.stack
            });
            
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la validation des données',
                details: process.env.NODE_ENV === 'development' ? validationError.message : undefined
            });
        }

        const { phone_number, full_name, role } = validatedData;

        // Vérification que le numéro de téléphone n'existe pas déjà
        logger.debug(`${context} Vérification de l'unicité du numéro de téléphone`);
        
        const [existingUsers] = await db.execute(
            'SELECT id FROM users WHERE phone_number = ?',
            [phone_number]
        );

        if (existingUsers.length > 0) {
            logger.warn(`${context} Tentative de création avec un numéro existant`, {
                existingUserId: existingUsers[0].id,
                createdBy: req.user?.id,
                ip: req.ip
            });
            
            return res.status(409).json({
                success: false,
                error: 'Ce numéro de téléphone est déjà utilisé',
                details: {
                    code: 'PHONE_NUMBER_EXISTS',
                    message: 'Un utilisateur avec ce numéro de téléphone existe déjà'
                }
            });
        }

        // CORRECTION: Retirer created_by car cette colonne n'existe pas
        logger.info(`${context} Création d'un nouvel utilisateur`, { 
            role,
            requestedBy: req.user ? req.user.id : 'system',
            createdBy: req.user?.id
        });
        
        const [result] = await db.execute(
            'INSERT INTO users (phone_number, full_name, role) VALUES (?, ?, ?)',
            [phone_number, full_name || null, role]
        );

        const newUserId = result.insertId;
        logger.info(`${context} Utilisateur créé avec succès`, { 
            userId: newUserId,
            role,
            createdBy: req.user?.id
        });

        // Récupération des données complètes de l'utilisateur créé
        const [newUser] = await db.execute(
            'SELECT id, phone_number, full_name, role, created_at, updated_at FROM users WHERE id = ?',
            [newUserId]
        );

        return res.status(201).json({
            success: true,
            message: 'Utilisateur créé avec succès',
            data: newUser[0]
        });

    } catch (error) {
        logger.error(`${context} Erreur lors de la création de l'utilisateur`, {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            userData: { ...req.body, phone_number: '***' },
            createdBy: req.user?.id,
            ip: req.ip
        });
        
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                error: 'Ce numéro de téléphone est déjà utilisé',
                details: {
                    code: 'DUPLICATE_ENTRY',
                    message: 'Une entrée avec cette valeur existe déjà dans la base de données'
                }
            });
        }
        
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la création de l\'utilisateur',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

/**
 * Met à jour un utilisateur
 * Accessible aux administrateurs et à l'utilisateur lui-même (pour certaines informations)
 */
const updateUser = async (req, res) => {
    const context = '[UserController] [updateUser]';
    
    logger.info('👥 Mise à jour utilisateur - Début', {
        targetUserId: req.params.id,
        updateData: req.body,
        updatedBy: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip
    });
    
    try {
        const userId = parseInt(req.params.id);

        // Vérification des permissions
        if (req.user.id !== userId && req.user.role !== 'admin') {
            logger.warn('👥 Accès refusé - mise à jour utilisateur non autorisé', {
                targetUserId: userId,
                requestingUserId: req.user?.id,
                userRole: req.user?.role,
                ip: req.ip
            });
            return res.status(403).json({
                success: false,
                error: 'Accès non autorisé',
                details: 'Vous ne pouvez pas modifier les informations de cet utilisateur'
            });
        }

        // Validation des données d'entrée
        logger.info(`${context} Validation des données de mise à jour pour l'utilisateur ${userId}`, {
            targetUserId: userId,
            updatedBy: req.user?.id
        });

        let validatedData;
        try {
            validatedData = await userUpdateValidator(req.body);
            logger.debug(`${context} Données validées avec succès`, { validatedData });
        } catch (validationError) {
            if (validationError.isJoi) {
                logger.warn(`${context} Erreur de validation Joi`, {
                    userId,
                    error: validationError.message,
                    details: validationError.details,
                    updatedBy: req.user?.id,
                    ip: req.ip
                });
                
                return res.status(400).json({
                    success: false,
                    error: 'Données invalides',
                    details: validationError.details
                });
            }
            
            logger.error(`${context} Erreur lors de la validation`, {
                userId,
                error: validationError.message,
                stack: validationError.stack,
                updatedBy: req.user?.id,
                ip: req.ip
            });
            
            return res.status(500).json({
                success: false,
                error: 'Erreur lors de la validation des données',
                details: process.env.NODE_ENV === 'development' ? validationError.message : undefined
            });
        }

        const { phone_number, full_name, role } = validatedData;

        logger.debug(`${context} Vérification des permissions de mise à jour`, {
            userId: req.user.id,
            userRole: req.user.role,
            requestedRoleChange: !!role
        });

        // Si l'utilisateur n'est pas admin, il ne peut pas changer son rôle
        if (req.user.role !== 'admin' && role && role !== req.user.role) {
            logger.warn(`${context} Tentative non autorisée de changement de rôle`, {
                userId: req.user.id,
                userRole: req.user.role,
                requestedRole: role,
                ip: req.ip
            });
            
            return res.status(403).json({
                success: false,
                error: 'Accès refusé',
                details: 'Vous ne pouvez pas modifier votre rôle'
            });
        }

        // Vérification que le nouveau numéro de téléphone n'existe pas déjà (si modifié)
        if (phone_number) {
            logger.debug(`${context} Vérification de la disponibilité du numéro de téléphone`);

            const [existingUsers] = await db.execute(
                'SELECT id, phone_number FROM users WHERE phone_number = ? AND id != ?',
                [phone_number, userId]
            );

            if (existingUsers.length > 0) {
                logger.warn(`${context} Numéro de téléphone déjà utilisé`, {
                    userId,
                    existingUser: existingUsers[0].id,
                    updatedBy: req.user?.id,
                    ip: req.ip
                });
                
                return res.status(409).json({
                    success: false,
                    error: 'Ce numéro de téléphone est déjà utilisé',
                    details: {
                        code: 'PHONE_NUMBER_EXISTS',
                        message: 'Ce numéro de téléphone est déjà associé à un autre compte'
                    }
                });
            }
        }

        // Construction de la requête de mise à jour
        let updateFields = [];
        let updateValues = [];

        if (phone_number) {
            updateFields.push('phone_number = ?');
            updateValues.push(phone_number);
        }

        if (full_name !== undefined) {
            updateFields.push('full_name = ?');
            updateValues.push(full_name || null);
        }

        if (role && req.user.role === 'admin') {
            updateFields.push('role = ?');
            updateValues.push(role);
        }

        if (updateFields.length === 0) {
            logger.warn(`${context} Aucune donnée à mettre à jour`, {
                targetUserId: userId,
                originalData: req.body,
                updatedBy: req.user?.id,
                ip: req.ip
            });
            return res.status(400).json({
                success: false,
                error: 'Aucune donnée à mettre à jour'
            });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        updateValues.push(userId);

        const [result] = await db.execute(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        if (result.affectedRows === 0) {
            logger.warn(`${context} Utilisateur non trouvé pour mise à jour`, {
                targetUserId: userId,
                updatedBy: req.user?.id,
                ip: req.ip
            });
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }

        logger.info(`${context} Utilisateur mis à jour avec succès`, {
            targetUserId: userId,
            updatedFields: updateFields,
            updatedBy: req.user?.id,
            ip: req.ip
        });

        // Récupérer les données mises à jour
        const [updatedUser] = await db.execute(
            'SELECT id, phone_number, full_name, role, created_at, updated_at FROM users WHERE id = ?',
            [userId]
        );

        return res.json({
            success: true,
            message: 'Utilisateur mis à jour avec succès',
            data: updatedUser[0]
        });

    } catch (error) {
        logger.error(`${context} Erreur lors de la mise à jour de l'utilisateur`, {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            targetUserId: req.params.id,
            updateData: req.body,
            updatedBy: req.user?.id,
            ip: req.ip
        });
        logger.error(`${context} Erreur lors de la mise à jour de l'utilisateur:`, error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la mise à jour de l\'utilisateur'
        });
    }
};

/**
 * Supprime un utilisateur
 * Accessible uniquement aux administrateurs
 */
const deleteUser = async (req, res, next) => {
    logger.info('👥 Suppression utilisateur - Début', {
        targetUserId: req.params.id,
        deletedBy: req.user?.id,
        userRole: req.user?.role,
        ip: req.ip
    });
    try {
        const userId = parseInt(req.params.id);
        const requestingUserId = req.user.id;
        
        logger.debug('👥 Vérification existence utilisateur pour suppression', {
            targetUserId: userId,
            deletedBy: requestingUserId
        });
        
        // Vérifier que l'utilisateur existe
        const user = await userService.findById(userId);
        if (!user) {
            logger.warn('👥 Utilisateur non trouvé pour suppression', {
                targetUserId: userId,
                deletedBy: requestingUserId,
                ip: req.ip
            });
            return res.status(404).json({
                success: false,
                error: 'Utilisateur non trouvé'
            });
        }
        
        // Supprimer l'utilisateur et ses données
        logger.debug('👥 Appel service suppression utilisateur', {
            targetUserId: userId,
            deletedBy: requestingUserId
        });
        await userService.deleteUser(userId);
        
        logger.info('👥 Utilisateur supprimé avec succès', {
            targetUserId: userId,
            deletedBy: requestingUserId,
            ip: req.ip
        });
        
        res.status(200).json({
            success: true,
            message: 'Utilisateur et données associées supprimés avec succès'
        });
        
    } catch (error) {
        logger.error('👥 Erreur suppression utilisateur', {
            error: {
                message: error.message,
                stack: error.stack,
                code: error.code
            },
            targetUserId: req.params.id,
            deletedBy: req.user?.id,
            ip: req.ip
        });
        logger.error('Erreur lors de la suppression utilisateur', {
            error: error.message,
            userId: req.params.id
        });
        next(error);
    }
};

/**
 * Récupère le profil de l'utilisateur connecté
 * Accessible à tous les utilisateurs authentifiés
 */
const getProfile = async (req, res) => {
    logger.info('👥 Récupération profil utilisateur - Début', {
        userId: req.user?.id,
        ip: req.ip
    });
    try {
        logger.info('👥 Profil utilisateur récupéré avec succès', {
            userId: req.user?.id,
            ip: req.ip
        });
        
        return res.json({
            success: true,
            message: 'Profil récupéré avec succès',
            data: {
                id: req.user.id,
                phone_number: req.user.phone_number,
                full_name: req.user.full_name || null,
                role: req.user.role,
                created_at: req.user.created_at,
                updated_at: req.user.updated_at
            }
        });
    } catch (error) {
        logger.error('👥 Erreur récupération profil utilisateur', {
            error: {
                message: error.message,
                stack: error.stack
            },
            userId: req.user?.id,
            ip: req.ip
        });
        logger.error('Erreur lors de la récupération du profil:', error);
        return res.status(500).json({
            success: false,
            error: 'Erreur serveur lors de la récupération du profil'
        });
    }
};

module.exports = {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getProfile
};
