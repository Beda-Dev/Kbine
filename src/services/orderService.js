const db = require("../config/database");
const logger = require("../utils/logger");
const { generateOrderReference } = require("../utils/orderReferenceGenerator");
const notificationService = require("./notificationService");

const createOrder = async (orderData) => {
  console.log("[OrderService] [createOrder] Début de création de commande", {
    orderData,
  });
  logger.info("[OrderService] Création d'une nouvelle commande", {
    userId: orderData.user_id,
    planId: orderData.plan_id,
    amount: orderData.amount,
    phoneNumber: orderData.phone_number,
  });

  try {
    // Générer une référence unique pour la commande
    let orderReference = generateOrderReference();
    let maxAttempts = 5;
    let attempt = 0;

    // Vérifier l'unicité de la référence (avec retry en cas de collision)
    while (attempt < maxAttempts) {
      try {
        const [existing] = await db.execute(
          "SELECT id FROM orders WHERE order_reference = ?",
          [orderReference]
        );

        if (existing.length === 0) {
          break; // Référence unique trouvée
        }

        // Générer une nouvelle référence
        orderReference = generateOrderReference();
        attempt++;
      } catch (error) {
        // Si la colonne n'existe pas, on sort de la boucle
        if (error.code === "ER_BAD_FIELD_ERROR") {
          console.log(
            "[OrderService] Colonne order_reference non trouvée, utilisation de la référence générée"
          );
          break;
        }
        throw error;
      }
    }

    if (attempt >= maxAttempts) {
      throw new Error("Impossible de générer une référence de commande unique");
    }

    console.log("[OrderService] [createOrder] Référence générée", {
      orderReference,
    });

    // Récupérer le phone_number de l'utilisateur si non fourni
    let phoneNumber = orderData.phone_number;
    if (!phoneNumber) {
      const [userRows] = await db.execute(
        "SELECT phone_number FROM users WHERE id = ?",
        [orderData.user_id]
      );

      if (userRows.length === 0) {
        throw new Error("Utilisateur non trouvé");
      }

      phoneNumber = userRows[0].phone_number;
    }

    // Définir le statut par défaut si non fourni
    const status = orderData.status || "pending";
    console.log("[OrderService] [createOrder] Statut défini", { status });

    console.log("[OrderService] [createOrder] Exécution requête INSERT");

    const query = `
            INSERT INTO orders 
            (order_reference, user_id, plan_id, phone_number, amount, status, assigned_to, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;

    const params = [
      orderReference,
      orderData.user_id,
      orderData.plan_id || null,
      phoneNumber,
      orderData.amount,
      status,
      orderData.assigned_to || null,
    ];

    console.log(
      "[OrderService] [createOrder] Exécution requête INSERT avec params",
      { query, params }
    );
    const result = await db.execute(query, params);

    console.log(
      "[OrderService] [createOrder] Résultat complet de la requête INSERT",
      {
        resultType: typeof result,
        resultArray: Array.isArray(result),
        resultLength: result.length,
        firstElement: result[0],
        secondElement: result[1],
      }
    );

    const resultHeader = result[0];
    const insertId = resultHeader.insertId;

    console.log("[OrderService] [createOrder] ID généré récupéré", {
      insertId,
      orderReference,
      affectedRows: resultHeader.affectedRows,
    });

    if (!insertId) {
      throw new Error("Échec de la récupération de l'ID de la commande créée");
    }

    logger.debug("[OrderService] Commande créée avec succès", {
      orderId: insertId,
      orderReference,
    });

    console.log(
      "[OrderService] [createOrder] Récupération des détails de la commande créée"
    );
    const createdOrder = await findById(insertId);

    if (!createdOrder) {
      throw new Error("La commande a été créée mais n'a pas pu être récupérée");
    }

    logger.info("[OrderService] Détails de la commande créée", {
      order: createdOrder,
    });

    console.log("[OrderService] [createOrder] Retour de la commande créée");
    return createdOrder;
  } catch (error) {
    console.log("[OrderService] [createOrder] Erreur attrapée", {
      error: error.message,
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      stack: error.stack,
      orderData,
    });
    logger.error("[OrderService] Échec de la création de la commande", {
      error: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
      orderData: {
        user_id: orderData.user_id,
        plan_id: orderData.plan_id,
        amount: orderData.amount,
        phone_number: orderData.phone_number,
      },
    });
    throw new Error(`Échec de la création de la commande: ${error.message}`);
  }
};

const findById = async (orderId) => {
  console.log("[OrderService] [findById] Début de recherche", { orderId });
  logger.debug(`[OrderService] Recherche de la commande par ID: ${orderId}`);

  try {
    console.log("[OrderService] [findById] Exécution requête SELECT");

    const [rows] = await db.execute(
      `SELECT o.*,
                u.phone_number as user_phone, u.role as user_role,
                u.created_at as user_created_at, u.updated_at as user_updated_at,
                p.id as plan_id_data, p.operator_id as plan_operator_id,
                p.name as plan_name, p.description as plan_description,
                p.price as plan_price, p.type as plan_type,
                p.validity_days as plan_validity_days, p.active as plan_active,
                p.created_at as plan_created_at,
                pay.id as payment_id, pay.amount as payment_amount,
                pay.payment_method, pay.payment_phone, pay.payment_reference,
                pay.external_reference, pay.status as payment_status, 
                pay.callback_data, pay.created_at as payment_created_at,
                pay.updated_at as payment_updated_at,
                staff.id as staff_id, staff.phone_number as staff_phone,
                staff.role as staff_role, staff.created_at as staff_created_at,
                staff.updated_at as staff_updated_at
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN plans p ON o.plan_id = p.id
            LEFT JOIN payments pay ON pay.order_id = o.id
            LEFT JOIN users staff ON o.assigned_to = staff.id
            WHERE o.id = ?`,
      [orderId]
    );

    console.log("[OrderService] [findById] Résultats obtenus", {
      rowCount: rows.length,
    });

    if (rows.length === 0) {
      console.log("[OrderService] [findById] Commande non trouvée", {
        orderId,
      });
      logger.warn(`[OrderService] Commande non trouvée: ${orderId}`);
      return null;
    }

    const order = rows[0];
    console.log("[OrderService] [findById] Commande trouvée", {
      orderId,
      orderReference: order.order_reference,
      status: order.status,
      phoneNumber: order.phone_number,
      hasPayment: !!order.payment_id,
      assignedStaffId: order.staff_id,
    });

    const result = {
      id: order.id,
      order_reference:
        order.order_reference || `ORD${String(order.id).padStart(10, "0")}`,
      user_id: order.user_id,
      plan_id: order.plan_id,
      phone_number: order.phone_number,
      amount: parseFloat(order.amount),
      status: order.status,
      assigned_to: order.assigned_to,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };

    // Ajouter l'utilisateur associé
    if (order.user_id) {
      result.user = {
        id: order.user_id,
        phone_number: order.user_phone,
        role: order.user_role,
        created_at: order.user_created_at,
        updated_at: order.user_updated_at,
      };
    }

    // ✅ CORRIGÉ: Ajouter le paiement seulement s'il existe
    if (order.payment_id) {
      result.payment = {
        id: order.payment_id,
        amount: parseFloat(order.payment_amount),
        payment_method: order.payment_method,
        payment_phone: order.payment_phone,
        payment_reference: order.payment_reference,
        external_reference: order.external_reference,
        status: order.payment_status,
        callback_data: order.callback_data
          ? typeof order.callback_data === "string"
            ? JSON.parse(order.callback_data)
            : order.callback_data
          : null,
        created_at: order.payment_created_at,
        updated_at: order.payment_updated_at,
      };
    } else {
      result.payment = null;
    }

    // Ajouter TOUTES les données du plan si présent
    if (order.plan_id) {
      result.plan = {
        id: order.plan_id_data || order.plan_id,
        operator_id: order.plan_operator_id,
        name: order.plan_name,
        description: order.plan_description,
        price: parseFloat(order.plan_price),
        type: order.plan_type,
        validity_days: order.plan_validity_days,
        active: order.plan_active,
        created_at: order.plan_created_at,
      };
    } else {
      result.plan = null;
    }

    // ✅ AJOUTER - Ajouter le staff assigné avec toutes ses données
    if (order.staff_id) {
      result.assigned_staff = {
        id: order.staff_id,
        phone_number: order.staff_phone,
        role: order.staff_role,
        created_at: order.staff_created_at,
        updated_at: order.staff_updated_at,
      };
    } else {
      result.assigned_staff = null;
    }

    logger.debug(
      `[OrderService] Commande trouvée avec les relations: ${orderId}`,
      { order: result }
    );
    return result;
  } catch (error) {
    console.log("[OrderService] [findById] Erreur attrapée", {
      error: error.message,
      stack: error.stack,
      orderId,
    });
    logger.error(
      `[OrderService] Erreur lors de la recherche de la commande ${orderId}`,
      {
        error: error.message,
        stack: error.stack,
      }
    );
    throw new Error(
      `Erreur lors de la récupération de la commande: ${error.message}`
    );
  }
};

const findByReference = async (orderReference) => {
  console.log("[OrderService] [findByReference] Début de recherche", {
    orderReference,
  });
  logger.debug(
    `[OrderService] Recherche de la commande par référence: ${orderReference}`
  );

  try {
    console.log("[OrderService] [findByReference] Exécution requête SELECT");

    const [rows] = await db.execute(
      `SELECT o.*,
                u.phone_number as user_phone, u.role as user_role,
                u.created_at as user_created_at, u.updated_at as user_updated_at,
                p.id as plan_id_data, p.operator_id as plan_operator_id,
                p.name as plan_name, p.description as plan_description,
                p.price as plan_price, p.type as plan_type,
                p.validity_days as plan_validity_days, p.active as plan_active,
                p.created_at as plan_created_at,
                pay.id as payment_id, pay.amount as payment_amount,
                pay.payment_method, pay.payment_phone, pay.payment_reference,
                pay.external_reference, pay.status as payment_status, 
                pay.callback_data, pay.created_at as payment_created_at,
                pay.updated_at as payment_updated_at,
                staff.id as staff_id, staff.phone_number as staff_phone,
                staff.role as staff_role, staff.created_at as staff_created_at,
                staff.updated_at as staff_updated_at
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN plans p ON o.plan_id = p.id
            LEFT JOIN payments pay ON pay.order_id = o.id
            LEFT JOIN users staff ON o.assigned_to = staff.id
            WHERE o.order_reference = ?`,
      [orderReference]
    );

    console.log("[OrderService] [findByReference] Résultats obtenus", {
      rowCount: rows.length,
    });

    if (rows.length === 0) {
      console.log("[OrderService] [findByReference] Commande non trouvée", {
        orderReference,
      });
      logger.warn(`[OrderService] Commande non trouvée: ${orderReference}`);
      return null;
    }

    const order = rows[0];
    console.log("[OrderService] [findByReference] Commande trouvée", {
      orderReference,
      status: order.status,
    });

    const result = {
      id: order.id,
      order_reference:
        order.order_reference || `ORD${String(order.id).padStart(10, "0")}`,
      user_id: order.user_id,
      plan_id: order.plan_id,
      phone_number: order.phone_number,
      amount: parseFloat(order.amount),
      status: order.status,
      assigned_to: order.assigned_to,
      created_at: order.created_at,
      updated_at: order.updated_at,
    };

    // Ajouter l'utilisateur associé
    if (order.user_id) {
      result.user = {
        id: order.user_id,
        phone_number: order.user_phone,
        role: order.user_role,
        created_at: order.user_created_at,
        updated_at: order.user_updated_at,
      };
    }

    // ✅ RETOURNER SEULEMENT SI PAIEMENT RÉUSSI (pour la route publique)
    if (!order.payment_id || order.payment_status !== "success") {
      console.log(
        "[OrderService] [findByReference] Paiement absent ou statut non autorisé",
        { orderReference, payment_status: order.payment_status }
      );
      return null;
    }

    // Ajouter le paiement (présent et réussi)
    result.payment = {
      id: order.payment_id,
      amount: parseFloat(order.payment_amount),
      payment_method: order.payment_method,
      payment_phone: order.payment_phone,
      payment_reference: order.payment_reference,
      external_reference: order.external_reference,
      status: order.payment_status,
      callback_data: order.callback_data
        ? typeof order.callback_data === "string"
          ? JSON.parse(order.callback_data)
          : order.callback_data
        : null,
      created_at: order.payment_created_at,
      updated_at: order.payment_updated_at,
    };

    // Ajouter TOUTES les données du plan si présent
    if (order.plan_id) {
      result.plan = {
        id: order.plan_id_data || order.plan_id,
        operator_id: order.plan_operator_id,
        name: order.plan_name,
        description: order.plan_description,
        price: parseFloat(order.plan_price),
        type: order.plan_type,
        validity_days: order.plan_validity_days,
        active: order.plan_active,
        created_at: order.plan_created_at,
      };
    } else {
      result.plan = null;
    }

    // ✅ AJOUTER - Ajouter le staff assigné avec toutes ses données
    if (order.staff_id) {
      result.assigned_staff = {
        id: order.staff_id,
        phone_number: order.staff_phone,
        role: order.staff_role,
        created_at: order.staff_created_at,
        updated_at: order.staff_updated_at,
      };
    } else {
      result.assigned_staff = null;
    }

    logger.debug(
      `[OrderService] Commande trouvée par référence: ${orderReference}`,
      { order: result }
    );
    return result;
  } catch (error) {
    console.log("[OrderService] [findByReference] Erreur attrapée", {
      error: error.message,
      stack: error.stack,
      orderReference,
    });
    logger.error(
      `[OrderService] Erreur lors de la recherche de la commande ${orderReference}`,
      {
        error: error.message,
        stack: error.stack,
      }
    );
    throw new Error(
      `Erreur lors de la récupération de la commande: ${error.message}`
    );
  }
};

const findAll = async (filters = {}) => {
  console.log("[OrderService] [findAll] Début de récupération liste", {
    filters,
  });
  logger.debug("[OrderService] Récupération de toutes les commandes", {
    filters,
  });

  try {
    let query = `SELECT o.*,
                    u.phone_number as user_phone, u.role as user_role,
                    u.created_at as user_created_at, u.updated_at as user_updated_at,
                    p.id as plan_id_data, p.operator_id as plan_operator_id,
                    p.name as plan_name, p.description as plan_description,
                    p.price as plan_price, p.type as plan_type,
                    p.validity_days as plan_validity_days, p.active as plan_active,
                    p.created_at as plan_created_at,
                    pay.id as payment_id, pay.amount as payment_amount,
                    pay.payment_method, pay.payment_phone, pay.payment_reference,
                    pay.external_reference, pay.status as payment_status,
                    pay.callback_data as payment_callback_data, pay.created_at as payment_created_at,
                    pay.updated_at as payment_updated_at,
                    staff.id as staff_id, staff.phone_number as staff_phone,
                    staff.role as staff_role, staff.created_at as staff_created_at,
                    staff.updated_at as staff_updated_at
             FROM orders o
             LEFT JOIN users u ON o.user_id = u.id
             LEFT JOIN plans p ON o.plan_id = p.id
             INNER JOIN payments pay ON o.id = pay.order_id
             LEFT JOIN users staff ON o.assigned_to = staff.id
             WHERE pay.status IN ('success')`;

    const params = [];
    const conditions = [];

    if (filters.userId) {
      conditions.push("o.user_id = ?");
      params.push(filters.userId);
    }
    if (filters.status) {
      conditions.push("o.status = ?");
      params.push(filters.status);
    }
    if (filters.date) {
      conditions.push("DATE(o.created_at) = DATE(?)");
      params.push(filters.date);
    }

    if (conditions.length > 0) {
      query += " AND " + conditions.join(" AND ");
    }

    query += " ORDER BY o.created_at DESC";

    console.log("[OrderService] [findAll] Requête construite", {
      query,
      params,
    });
    const [rows] = await db.execute(query, params);
    console.log("[OrderService] [findAll] Résultats obtenus", {
      rowCount: rows.length,
    });

    const orders = rows.map((order) => {
      const result = {
        id: order.id,
        order_reference:
          order.order_reference || `ORD${String(order.id).padStart(10, "0")}`,
        user_id: order.user_id,
        plan_id: order.plan_id,
        phone_number: order.phone_number,
        amount: parseFloat(order.amount),
        status: order.status,
        assigned_to: order.assigned_to,
        created_at: order.created_at,
        updated_at: order.updated_at,
      };

      if (order.user_id) {
        result.user = {
          id: order.user_id,
          phone_number: order.user_phone,
          role: order.user_role,
          created_at: order.user_created_at,
          updated_at: order.user_updated_at,
        };
      }

      // Ajouter le paiement si présent (champ unique grâce à l'INNER JOIN)
      if (order.payment_id) {
        result.payment = {
          id: order.payment_id,
          amount: parseFloat(order.payment_amount),
          payment_method: order.payment_method,
          payment_phone: order.payment_phone,
          payment_reference: order.payment_reference,
          external_reference: order.external_reference,
          status: order.payment_status,
          callback_data: order.payment_callback_data
            ? typeof order.payment_callback_data === "string"
              ? JSON.parse(order.payment_callback_data)
              : order.payment_callback_data
            : null,
          created_at: order.payment_created_at,
          updated_at: order.payment_updated_at,
        };
      } else {
        result.payment = null;
      }

      // Ajouter TOUTES les données du plan si présent
      if (order.plan_id) {
        result.plan = {
          id: order.plan_id_data || order.plan_id,
          operator_id: order.plan_operator_id,
          name: order.plan_name,
          description: order.plan_description,
          price: parseFloat(order.plan_price),
          type: order.plan_type,
          validity_days: order.plan_validity_days,
          active: order.plan_active,
          created_at: order.plan_created_at,
        };
      } else {
        result.plan = null;
      }

      // ✅ AJOUTER - Ajouter le staff assigné avec toutes ses données
      if (order.staff_id) {
        result.assigned_staff = {
          id: order.staff_id,
          phone_number: order.staff_phone,
          role: order.staff_role,
          created_at: order.staff_created_at,
          updated_at: order.staff_updated_at,
        };
      } else {
        result.assigned_staff = null;
      }

      return result;
    });

    console.log("[OrderService] [findAll] Transformation terminée", {
      orderCount: orders.length,
    });
    return orders;
  } catch (error) {
    console.log("[OrderService] [findAll] Erreur attrapée", {
      error: error.message,
      stack: error.stack,
      filters,
    });
    logger.error(
      "[OrderService] Erreur lors de la récupération des commandes",
      {
        error: error.message,
        stack: error.stack,
        filters,
      }
    );
    throw new Error(
      `Erreur lors de la récupération de la liste des commandes: ${error.message}`
    );
  }
};

const updateOrder = async (orderId, orderData) => {
  console.log("[OrderService] [updateOrder] Début de mise à jour", {
    orderId,
    orderData,
  });

  try {
    const fields = [];
    const params = [];

    if (orderData.user_id !== undefined) {
      fields.push(`user_id = ?`);
      params.push(orderData.user_id);
    }
    if (orderData.plan_id !== undefined) {
      fields.push(`plan_id = ?`);
      params.push(orderData.plan_id);
    }
    if (orderData.phone_number !== undefined) {
      fields.push(`phone_number = ?`);
      params.push(orderData.phone_number);
    }
    if (orderData.amount !== undefined) {
      fields.push(`amount = ?`);
      params.push(orderData.amount);
    }
    if (orderData.status !== undefined) {
      fields.push(`status = ?`);
      params.push(orderData.status);
    }
    if (orderData.assigned_to !== undefined) {
      fields.push(`assigned_to = ?`);
      params.push(orderData.assigned_to);
    }

    if (fields.length === 0) {
      throw new Error("Aucun champ à mettre à jour");
    }

    fields.push(`updated_at = NOW()`);
    params.push(orderId);

    const query = `UPDATE orders SET ${fields.join(", ")} WHERE id = ?`;
    console.log("[OrderService] [updateOrder] Requête UPDATE construite", {
      query,
      params,
    });

    const [result] = await db.execute(query, params);

    if (result.affectedRows === 0) {
      throw new Error(`Commande non trouvée: ${orderId}`);
    }

    const updatedOrder = await findById(orderId);
    logger.info("[OrderService] Commande mise à jour avec succès", {
      order: updatedOrder,
    });

// ✅ AJOUTER - Avant le return updatedOrder
if (orderData.status === 'completed') {
    console.log('[OrderService] Commande terminée - envoi notification client');
    
    try {
        // La commande est déjà récupérée dans updatedOrder
        await notificationService.notifyOrderCompleted(updatedOrder);
        
        logger.info('[OrderService] Notification client envoyée', {
            orderId: updatedOrder.id,
            userId: updatedOrder.user_id
        });
    } catch (notifError) {
        // Ne pas bloquer la mise à jour si la notification échoue
        logger.error('[OrderService] Erreur envoi notification client', {
            error: notifError.message,
            orderId: updatedOrder.id
        });
        console.log('[OrderService] Erreur envoi notification client', {
            message: notifError.message,
            orderId: updatedOrder.id
        });
    }
}

logger.info('[OrderService] Commande mise à jour avec succès', { order: updatedOrder });
return updatedOrder;

    return updatedOrder;
  } catch (error) {
    console.log("[OrderService] [updateOrder] Erreur attrapée", {
      error: error.message,
      stack: error.stack,
      orderId,
      orderData,
    });
    logger.error(
      `[OrderService] Échec de la mise à jour de la commande ${orderId}`,
      {
        error: error.message,
        stack: error.stack,
        orderData,
      }
    );
    throw new Error(`Échec de la mise à jour de la commande: ${error.message}`);
  }
};

const deleteOrder = async (orderId) => {
  console.log("[OrderService] [deleteOrder] Début de suppression", { orderId });
  logger.info(`[OrderService] Suppression de la commande ${orderId}`);

  try {
    const order = await findById(orderId);
    if (!order) {
      throw new Error(`Commande non trouvée: ${orderId}`);
    }

    const [result] = await db.execute("DELETE FROM orders WHERE id = ?", [
      orderId,
    ]);

    if (result.affectedRows === 0) {
      throw new Error(`Aucune commande supprimée (ID: ${orderId})`);
    }

    logger.info("[OrderService] Commande supprimée avec succès", {
      orderId,
      affectedRows: result.affectedRows,
    });

    return true;
  } catch (error) {
    console.log("[OrderService] [deleteOrder] Erreur attrapée", {
      error: error.message,
      code: error.code,
      stack: error.stack,
      orderId,
    });
    logger.error(
      `[OrderService] Échec de la suppression de la commande ${orderId}`,
      {
        error: error.message,
        code: error.code,
        stack: error.stack,
      }
    );

    if (error.code === "ER_ROW_IS_REFERENCED_2") {
      throw new Error(
        `Impossible de supprimer la commande ${orderId} car elle est liée à des paiements`
      );
    }

    throw new Error(`Échec de la suppression de la commande: ${error.message}`);
  }
};

/**
 * Récupère le statut de paiement d'une commande avec TOUS les détails
 */
const getOrderPaymentStatus = async (orderId) => {
  console.log("[OrderService] [getOrderPaymentStatus] Début", { orderId });
  logger.debug(`[OrderService] Récupération du statut de paiement: ${orderId}`);

  try {
    const [rows] = await db.execute(
      `SELECT 
                o.id,
                o.order_reference,
                o.phone_number,
                o.amount as order_amount,
                o.status as order_status,
                o.created_at as order_created_at,
                o.updated_at as order_updated_at,
                o.assigned_to,
                p.id as plan_id,
                p.name as plan_name,
                p.price as plan_price,
                p.operator_id as plan_operator_id,
                pay.id as payment_id,
                pay.status as payment_status,
                pay.payment_method,
                pay.payment_phone,
                pay.payment_reference,
                pay.external_reference,
                pay.amount as payment_amount,
                pay.callback_data,
                pay.created_at as payment_created_at,
                pay.updated_at as payment_updated_at,
                staff.id as staff_id, staff.phone_number as staff_phone,
                staff.role as staff_role, staff.created_at as staff_created_at,
                staff.updated_at as staff_updated_at
            FROM orders o
            LEFT JOIN plans p ON o.plan_id = p.id
            LEFT JOIN payments pay ON pay.order_id = o.id
            LEFT JOIN users staff ON o.assigned_to = staff.id
            WHERE o.id = ?`,
      [orderId]
    );

    if (rows.length === 0) {
      console.log(
        "[OrderService] [getOrderPaymentStatus] Commande non trouvée",
        { orderId }
      );
      return null;
    }

    const order = rows[0];

    // Déterminer les statuts
    const paymentStatus = order.payment_status || "no_payment";
    const isPaid = paymentStatus === "success";
    const isFailed = paymentStatus === "failed";
    const isPending = paymentStatus === "pending" || !order.payment_id;
    const isRefunded = paymentStatus === "refunded";

    const result = {
      // Informations de la commande
      order: {
        id: order.id,
        reference:
          order.order_reference || `ORD${String(order.id).padStart(10, "0")}`,
        phone_number: order.phone_number,
        amount: parseFloat(order.order_amount),
        status: order.order_status,
        assigned_to: order.assigned_to,
        created_at: order.order_created_at,
        updated_at: order.order_updated_at,
      },

      // Informations du plan
      plan: order.plan_id
        ? {
            id: order.plan_id,
            name: order.plan_name,
            price: parseFloat(order.plan_price),
            operator_id: order.plan_operator_id,
          }
        : null,

      // Informations complètes du paiement
      payment: order.payment_id
        ? {
            id: order.payment_id,
            method: order.payment_method,
            phone: order.payment_phone,
            reference: order.payment_reference,
            external_reference: order.external_reference,
            amount: parseFloat(order.payment_amount),
            status: paymentStatus,
            callback_data: order.callback_data
              ? typeof order.callback_data === "string"
                ? JSON.parse(order.callback_data)
                : order.callback_data
              : null,
            created_at: order.payment_created_at,
            updated_at: order.payment_updated_at,
          }
        : null,

      // ✅ AJOUTER - Ajouter le staff assigné avec toutes ses données
      assigned_staff: order.staff_id
        ? {
            id: order.staff_id,
            phone_number: order.staff_phone,
            role: order.staff_role,
            created_at: order.staff_created_at,
            updated_at: order.staff_updated_at,
          }
        : null,

      // Statuts booléens pour faciliter le traitement
      status_flags: {
        is_paid: isPaid,
        is_pending: isPending,
        is_failed: isFailed,
        is_refunded: isRefunded,
        has_payment: !!order.payment_id,
      },

      // Résumé pour affichage rapide
      summary: {
        status: isPaid
          ? "PAYÉ"
          : isFailed
          ? "ÉCHOUÉ"
          : isPending
          ? "EN ATTENTE"
          : isRefunded
          ? "REMBOURSÉ"
          : "AUCUN PAIEMENT",
        payment_method: order.payment_method || "N/A",
        amount: parseFloat(order.order_amount),
        payment_amount: order.payment_amount
          ? parseFloat(order.payment_amount)
          : null,
      },
    };

    console.log("[OrderService] [getOrderPaymentStatus] Statut récupéré", {
      orderId,
      isPaid: result.status_flags.is_paid,
      status: result.summary.status,
    });

    return result;
  } catch (error) {
    console.log("[OrderService] [getOrderPaymentStatus] Erreur attrapée", {
      error: error.message,
      stack: error.stack,
      orderId,
    });
    logger.error(
      `[OrderService] Erreur lors de la récupération du statut de paiement`,
      {
        error: error.message,
        orderId,
      }
    );
    throw new Error(
      `Erreur lors de la récupération du statut de paiement: ${error.message}`
    );
  }
};

/**
 * Récupère toutes les commandes d'un utilisateur spécifique
 */
const findByUserId = async (userId) => {
  console.log("[OrderService] [findByUserId] Début de recherche", { userId });
  logger.debug(
    `[OrderService] Recherche des commandes pour l'utilisateur: ${userId}`
  );

  try {
    return await findAll({ userId });
  } catch (error) {
    console.log("[OrderService] [findByUserId] Erreur attrapée", {
      error: error.message,
      stack: error.stack,
      userId,
    });
    logger.error(
      `[OrderService] Erreur lors de la recherche des commandes de l'utilisateur ${userId}`,
      {
        error: error.message,
        stack: error.stack,
      }
    );
    throw new Error(
      `Erreur lors de la récupération des commandes de l'utilisateur: ${error.message}`
    );
  }
};

module.exports = {
  createOrder,
  findById,
  findByReference,
  findByUserId,
  findAll,
  updateOrder,
  deleteOrder,
  getOrderPaymentStatus,
};
