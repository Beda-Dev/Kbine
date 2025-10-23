/**
 * Service utilisateur - STUB pour developpeur junior
 * 
 * Ce fichier contient des implementations minimales pour les operations utilisateur.
 * Le developpeur junior devra implementer la vraie logique avec la base de donnees.
 * 
 * TODO pour le developpeur junior:
 * - Connecter a la vraie base de donnees MySQL
 * - Implementer les requetes SQL
 * - Gerer les erreurs de base de donnees
 * - Ajouter la logique de creation automatique des comptes
 * - Implementer la gestion des roles (client, staff, admin)
 */
// Format attendu : 
// - 07 12 34 56 78 (10 chiffres commençant par 0)
// - +225 07 12 34 56 78 (12 chiffres avec l'indicatif)
const PHONE_NUMBER_REGEX = /^(\+225[0-9]{8}|0[0-9]{9})$/;
const db = require('../config/database');

/**
 * Rechercher un utilisateur par ID
 */
const findById = async (userId, includeOrders = false) => {
  console.log(`[userService] Recherche de l'utilisateur avec l'ID: ${userId}`);
  
  if (!userId || isNaN(parseInt(userId, 10))) {
    console.error('[userService] ID utilisateur invalide:', userId);
    throw new Error('ID utilisateur invalide');
  }

  try {
    const db = require('../config/database');
    console.log(`[userService] Exécution de la requête pour l'ID: ${userId}`);
    
    const [rows] = await db.execute(
      'SELECT id, phone_number as phone_number, role, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?',
      [userId]
    );
    
    console.log(`[userService] Résultat de la recherche pour l'ID ${userId}:`, rows.length > 0 ? 'trouvé' : 'non trouvé');
    
    if (rows.length === 0) {
      return null;
    }
    
    const user = rows[0];
    
    // Si on doit inclure les commandes
    if (includeOrders) {
      const [orders] = await db.execute(
        `SELECT o.*, 
                p.name as plan_name, p.description as plan_description, p.price as plan_price, 
                p.type as plan_type, p.validity_days as plan_validity_days,
                op.name as operator_name, op.code as operator_code
         FROM orders o
         LEFT JOIN plans p ON o.plan_id = p.id
         LEFT JOIN operators op ON p.operator_id = op.id
         WHERE o.user_id = ?
         ORDER BY o.created_at DESC`,
        [userId]
      );
      
      // Formater les commandes
      user.orders = orders.map(order => ({
        id: order.id,
        plan_id: order.plan_id,
        phone_number: order.phone_number,
        amount: order.amount,
        status: order.status,
        payment_method: order.payment_method,
        payment_reference: order.payment_reference,
        created_at: order.created_at,
        updated_at: order.updated_at,
        plan: order.plan_id ? {
          id: order.plan_id,
          name: order.plan_name,
          description: order.plan_description,
          price: order.plan_price,
          type: order.plan_type,
          validity_days: order.plan_validity_days,
          operator_name: order.operator_name,
          operator_code: order.operator_code
        } : null
      }));
    }
    
    return user;
  } catch (error) {
    console.error('[userService] Erreur lors de la recherche par ID:', {
      error: error.message,
      stack: error.stack,
      userId: userId
    });
    throw new Error('Erreur lors de la recherche de l\'utilisateur');
  }
};

/**
 * Rechercher un utilisateur par numéro de téléphone
 */
const findByPhoneNumber = async (phoneNumber, includeOrders = false) => {
  console.log(`[userService] Recherche par numéro: ${phoneNumber}`);
  
  if (!phoneNumber || !PHONE_NUMBER_REGEX.test(phoneNumber)) {
    console.error('[userService] Numéro de téléphone invalide:', phoneNumber);
    throw new Error('Numéro de téléphone invalide');
  }

  try {
    const db = require('../config/database');
    console.log(`[userService] Exécution de la requête pour le numéro: ${phoneNumber}`);
    
    const [rows] = await db.execute(
      'SELECT id, phone_number as phone_number, role, created_at as createdAt, updated_at as updatedAt FROM users WHERE phone_number = ?',
      [phoneNumber]
    );
    
    console.log(`[userService] Résultat de la recherche pour ${phoneNumber}:`, rows.length > 0 ? 'trouvé' : 'non trouvé');
    
    if (rows.length === 0) {
      return null;
    }
    
    const user = rows[0];
    
    // Si on doit inclure les commandes
    if (includeOrders) {
      const [orders] = await db.execute(
        `SELECT o.*, 
                p.name as plan_name, p.description as plan_description, p.price as plan_price, 
                p.type as plan_type, p.validity_days as plan_validity_days,
                op.name as operator_name, op.code as operator_code
         FROM orders o
         LEFT JOIN plans p ON o.plan_id = p.id
         LEFT JOIN operators op ON p.operator_id = op.id
         WHERE o.user_id = ?
         ORDER BY o.created_at DESC`,
        [user.id]
      );
      
      // Formater les commandes
      user.orders = orders.map(order => ({
        id: order.id,
        plan_id: order.plan_id,
        phone_number: order.phone_number,
        amount: order.amount,
        status: order.status,
        payment_method: order.payment_method,
        payment_reference: order.payment_reference,
        created_at: order.created_at,
        updated_at: order.updated_at,
        plan: order.plan_id ? {
          id: order.plan_id,
          name: order.plan_name,
          description: order.plan_description,
          price: order.plan_price,
          type: order.plan_type,
          validity_days: order.plan_validity_days,
          operator_name: order.operator_name,
          operator_code: order.operator_code
        } : null
      }));
    }
    
    return user;
  } catch (error) {
    console.error('[userService] Erreur lors de la recherche par numéro:', {
      error: error.message,
      stack: error.stack,
      phoneNumber: phoneNumber
    });
    throw new Error('Erreur lors de la recherche par numéro de téléphone');
  }
};

/**
 * Créer un nouvel utilisateur
 */
const create = async (userData) => {
  console.log('[userService] Tentative de création d\'utilisateur avec les données:', userData);
  
  const { phoneNumber, role = 'client' } = userData || {};

  if (!phoneNumber || !PHONE_NUMBER_REGEX.test(phoneNumber)) {
    console.error('[userService] Numéro de téléphone invalide pour la création:', phoneNumber);
    throw new Error('Numéro de téléphone invalide');
  }

  if (!['client', 'staff', 'admin'].includes(role)) {
    console.error('[userService] Rôle utilisateur invalide:', role);
    throw new Error('Rôle utilisateur invalide');
  }

  const db = require('../config/database');
  const connection = await db.getConnection();

  try {
    console.log('[userService] Début de la transaction pour la création');
    await connection.beginTransaction();

    // Vérifier l'existence de l'utilisateur dans la même transaction
    console.log(`[userService] Vérification de l'existence du numéro: ${phoneNumber}`);
    const [existingUser] = await connection.execute(
      'SELECT id FROM users WHERE phone_number = ? FOR UPDATE',
      [phoneNumber]
    );

    if (existingUser.length > 0) {
      console.log(`[userService] Utilisateur existant trouvé avec l'ID: ${existingUser[0].id}`);
      return findById(existingUser[0].id);
    }

    // Création de l'utilisateur
    console.log('[userService] Création du nouvel utilisateur avec le rôle:', role);
    const [result] = await connection.execute(
      'INSERT INTO users (phone_number, role) VALUES (?, ?)',
      [phoneNumber, role]
    );

    if (!result || !result.insertId) {
      console.error('[userService] Échec de la création - Aucun ID inséré');
      throw new Error('Échec de la création de l\'utilisateur');
    }

    console.log(`[userService] Utilisateur créé avec succès, ID: ${result.insertId}`);
    await connection.commit();
    console.log('[userService] Transaction validée avec succès');
    
    const newUser = await findById(result.insertId);
    console.log('[userService] Détails du nouvel utilisateur:', newUser);
    return newUser;

  } catch (error) {
    console.error('[userService] Erreur lors de la création de l\'utilisateur:', {
      error: error.message,
      code: error.code,
      stack: error.stack,
      phoneNumber: phoneNumber,
      role: role
    });
    
    if (connection) {
      console.log('[userService] Tentative de rollback de la transaction');
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('[userService] Erreur lors du rollback:', rollbackError);
      }
    }
    
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('[userService] Conflit d\'unicité détecté, recherche de l\'utilisateur existant');
      // Si une autre requête a créé l'utilisateur entre-temps
      return findByPhoneNumber(phoneNumber);
    }
    
    throw new Error(`Erreur lors de la création de l'utilisateur: ${error.message}`);
  } finally {
    if (connection) {
      console.log('[userService] Libération de la connexion');
      connection.release();
    }
  }
};

/**
 * Supprime un utilisateur et toutes ses données associées
 */
const deleteUser = async (userId) => {
  console.log('[userService] Début de suppression utilisateur', { userId });
  
  if (!userId || isNaN(parseInt(userId, 10))) {
    throw new Error('ID utilisateur invalide');
  }

  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    console.log('[userService] Transaction démarrée');
    
    // 1. Récupérer les IDs des commandes de l'utilisateur
    const [orders] = await connection.execute(
      'SELECT id FROM orders WHERE user_id = ?',
      [userId]
    );
    
    const orderIds = orders.map(o => o.id);
    console.log('[userService] Commandes trouvées:', orderIds.length);
    
    // 2. Supprimer les paiements liés aux commandes
    if (orderIds.length > 0) {
      const placeholders = orderIds.map(() => '?').join(',');
      await connection.execute(
        `DELETE FROM payments WHERE order_id IN (${placeholders})`,
        orderIds
      );
      console.log('[userService] Paiements supprimés');
    }
    
    // 3. Supprimer les commandes
    await connection.execute(
      'DELETE FROM orders WHERE user_id = ?',
      [userId]
    );
    console.log('[userService] Commandes supprimées');
    
    // 4. Supprimer les sessions
    await connection.execute(
      'DELETE FROM sessions WHERE user_id = ?',
      [userId]
    );
    console.log('[userService] Sessions supprimées');
    
    // 5. Supprimer l'utilisateur
    const [result] = await connection.execute(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );
    console.log('[userService] Utilisateur supprimé');
    
    if (result.affectedRows === 0) {
      throw new Error('Utilisateur non trouvé');
    }
    
    await connection.commit();
    console.log('[userService] Transaction validée');
    
    return true;
    
  } catch (error) {
    await connection.rollback();
    console.error('[userService] Erreur suppression, rollback effectué:', error);
    throw new Error(`Erreur lors de la suppression de l'utilisateur: ${error.message}`);
  } finally {
    connection.release();
  }
};


module.exports = {
  findById,
  findByPhoneNumber,
  create,
  deleteUser
};