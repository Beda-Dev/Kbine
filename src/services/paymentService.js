/**
 * Service de gestion des paiements
 * ✅ VERSION AMÉLIORÉE - Support complet Wave avec return_url, cancel_url, partner_name
 */

const db = require("../config/database");
const logger = require("../utils/logger");
const touchpointService = require("./touchpointService");
const notificationService = require("./notificationService");

// Types de paiement valides
const PAYMENT_METHODS = ["wave", "orange_money", "mtn_money", "moov_money"];

// Statuts de paiement valides
const PAYMENT_STATUS = ["pending", "success", "failed", "refunded"];

/**
 * Valide les données de paiement
 */
const validatePaymentData = (paymentData) => {
  console.log("[PaymentService] validatePaymentData - Début de validation", {
    order_id: paymentData.order_id,
    amount: paymentData.amount,
    payment_method: paymentData.payment_method,
    payment_phone: paymentData.payment_phone,
    payment_reference: paymentData.payment_reference,
  });

  if (!paymentData.order_id || !Number.isInteger(paymentData.order_id)) {
    throw new Error("ID de commande invalide");
  }

  if (
    !paymentData.amount ||
    isNaN(parseFloat(paymentData.amount)) ||
    paymentData.amount <= 0
  ) {
    throw new Error("Montant invalide");
  }

  if (
    !paymentData.payment_method ||
    !PAYMENT_METHODS.includes(paymentData.payment_method)
  ) {
    throw new Error(
      `Méthode de paiement invalide. Doit être l'un des suivants: ${PAYMENT_METHODS.join(
        ", "
      )}`
    );
  }

  if (!paymentData.payment_reference) {
    throw new Error("Référence de paiement requise");
  }

  // Validation du numéro de téléphone
  if (paymentData.payment_phone) {
    const phoneRegex = /^0[0-9]{9}$/;
    if (!phoneRegex.test(paymentData.payment_phone.replace(/[\s\-\+]/g, ""))) {
      throw new Error("Numéro de téléphone de paiement invalide");
    }
  }

  console.log("[PaymentService] validatePaymentData - Validation réussie");
};

/**
 * Crée un nouveau paiement
 */
const createPayment = async (paymentData) => {
  console.log(
    "[PaymentService] createPayment - Début",
    JSON.stringify(paymentData, null, 2)
  );

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    console.log("[PaymentService] createPayment - Transaction démarrée");

    // Validation des données
    validatePaymentData(paymentData);

    // Vérifier si un paiement avec cette référence existe déjà
    const [existingPayment] = await connection.query(
      "SELECT id FROM payments WHERE payment_reference = ?",
      [paymentData.payment_reference]
    );
    console.log(
      "[PaymentService] createPayment - Paiement existant (count)",
      existingPayment?.length || 0
    );

    if (existingPayment.length > 0) {
      throw new Error("Une transaction avec cette référence existe déjà");
    }

    // Vérifier si la commande existe
    const [orderResults] = await connection.query(
      "SELECT id, status FROM orders WHERE id = ?",
      [paymentData.order_id]
    );
    console.log(
      "[PaymentService] createPayment - Commande trouvée (count)",
      orderResults?.length || 0
    );

    if (!orderResults || orderResults.length === 0) {
      throw new Error("Commande non trouvée");
    }

    // Création du paiement
    const payment = {
      order_id: paymentData.order_id,
      amount: paymentData.amount,
      payment_method: paymentData.payment_method,
      payment_phone: paymentData.payment_phone || null,
      payment_reference: paymentData.payment_reference,
      external_reference:
        paymentData.external_reference || Date.now().toString(),
      status: "pending",
      callback_data: paymentData.callback_data
        ? JSON.stringify(paymentData.callback_data)
        : null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    console.log(
      "[PaymentService] createPayment - Données du paiement préparées",
      payment
    );

    const [result] = await connection.query("INSERT INTO payments SET ?", [
      payment,
    ]);
    console.log("[PaymentService] createPayment - Résultat insertion", result);

    await connection.commit();
    console.log("[PaymentService] createPayment - Transaction commit");

    logger.info(`Paiement créé avec succès - ID: ${result.insertId}`, {
      order_id: payment.order_id,
      payment_method: payment.payment_method,
      payment_phone: payment.payment_phone,
    });

    return {
      id: result.insertId,
      ...payment,
      callback_data: payment.callback_data
        ? JSON.parse(payment.callback_data)
        : null,
    };
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    logger.error("Erreur lors de la création du paiement", {
      error: error.message,
    });
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Met à jour un paiement existant
 */
const updatePayment = async (id, updateData) => {
  console.log("[PaymentService] updatePayment - Début", { paymentId: id });
  console.log(
    "[PaymentService] updatePayment - Données de mise à jour",
    JSON.stringify(updateData, null, 2)
  );

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Vérifier que le paiement existe
    const [payments] = await connection.query(
      "SELECT * FROM payments WHERE id = ?",
      [id]
    );
    console.log("[PaymentService] updatePayment - Paiements trouvés", {
      count: payments?.length || 0,
    });

    if (!payments || payments.length === 0) {
      throw new Error("Paiement non trouvé");
    }

    const payment = payments[0];
    console.log("[PaymentService] updatePayment - Paiement courant", {
      id: payment.id,
      status: payment.status,
    });

    // Valider le statut si fourni
    if (updateData.status && !PAYMENT_STATUS.includes(updateData.status)) {
      throw new Error(`Statut invalide: ${updateData.status}`);
    }

    // Valider payment_phone si fourni
    if (updateData.payment_phone) {
      const phoneRegex = /^0[0-9]{9}$/;
      if (
        !updateData.payment_phone.replace(/[\s\-\+]/g, "").match(phoneRegex)
      ) {
        throw new Error("Numéro de téléphone de paiement invalide");
      }
    }

    // Préparer les données de mise à jour
    const fieldsToUpdate = {
      ...updateData,
      updated_at: new Date(),
    };
    console.log(
      "[PaymentService] updatePayment - Champs à mettre à jour",
      JSON.stringify(fieldsToUpdate, null, 2)
    );

    // Gérer callback_data
    if (
      fieldsToUpdate.callback_data &&
      typeof fieldsToUpdate.callback_data === "object"
    ) {
      fieldsToUpdate.callback_data = JSON.stringify(
        fieldsToUpdate.callback_data
      );
    }

    // Gérer status_notes (stocker dans callback_data)
    if (fieldsToUpdate.status_notes) {
      const notes = fieldsToUpdate.status_notes;
      delete fieldsToUpdate.status_notes;

      let callbackData = {};
      if (payment.callback_data) {
        try {
          callbackData = JSON.parse(payment.callback_data);
        } catch (e) {
          callbackData = {};
        }
      }
      callbackData.notes = notes;
      callbackData.last_update = new Date().toISOString();
      fieldsToUpdate.callback_data = JSON.stringify(callbackData);
    }

    // Construire la requête UPDATE
    const updateFields = Object.keys(fieldsToUpdate)
      .map((key) => `${key} = ?`)
      .join(", ");
    const updateValues = Object.values(fieldsToUpdate);

    console.log("[PaymentService] updatePayment - Exécution UPDATE");
    await connection.query(`UPDATE payments SET ${updateFields} WHERE id = ?`, [
      ...updateValues,
      id,
    ]);

    // Récupérer le paiement mis à jour
    const [updatedPayments] = await connection.query(
      "SELECT * FROM payments WHERE id = ?",
      [id]
    );
    console.log(
      "[PaymentService] updatePayment - Paiement mis à jour récupéré"
    );

    await connection.commit();

    const updatedPayment = updatedPayments[0];

    // Parser callback_data
    if (updatedPayment.callback_data) {
      try {
        updatedPayment.callback_data = JSON.parse(updatedPayment.callback_data);
      } catch (e) {
        // Garder comme string si le parsing échoue
      }
    }

    logger.info(`Paiement mis à jour - ID: ${id}`);
    console.log("[PaymentService] updatePayment - Succès", { id });
    return updatedPayment;
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    logger.error("Erreur lors de la mise à jour du paiement", {
      error: error.message,
      paymentId: id,
    });
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Supprime un paiement (soft delete)
 */
const deletePayment = async (id) => {
  const paymentId = parseInt(id);
  if (!paymentId || isNaN(paymentId)) {
    throw new Error("ID de paiement invalide");
  }

  console.log("[PaymentService] deletePayment - Début", { paymentId });

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [payments] = await connection.query(
      "SELECT * FROM payments WHERE id = ?",
      [paymentId]
    );
    console.log(
      "[PaymentService] deletePayment - Paiement trouvé (count)",
      payments?.length || 0
    );

    if (!payments || payments.length === 0) {
      throw new Error("Paiement non trouvé");
    }

    const payment = payments[0];

    if (payment.status === "success") {
      throw new Error(
        "Impossible de supprimer un paiement réussi. Veuillez effectuer un remboursement."
      );
    }

    let callbackData = {};
    if (payment.callback_data) {
      try {
        callbackData =
          typeof payment.callback_data === "string"
            ? JSON.parse(payment.callback_data)
            : { ...payment.callback_data };
      } catch (e) {
        callbackData = {};
      }
    }

    const now = new Date();
    callbackData = {
      ...callbackData,
      deleted: true,
      deleted_at: now.toISOString(),
      notes:
        (callbackData.notes || "") +
        "\nPaiement annulé/supprimé le " +
        now.toISOString(),
    };

    console.log(
      "[PaymentService] deletePayment - Exécution UPDATE statut=failed"
    );
    const [result] = await connection.query(
      "UPDATE payments SET status = ?, callback_data = ?, updated_at = ? WHERE id = ?",
      ["failed", JSON.stringify(callbackData), now, paymentId]
    );
    console.log("[PaymentService] deletePayment - Résultat UPDATE", {
      affectedRows: result?.affectedRows,
    });

    if (result.affectedRows === 0) {
      throw new Error("Échec de la suppression du paiement");
    }

    await connection.commit();

    logger.info(`Paiement supprimé (soft delete) - ID: ${paymentId}`);
    return true;
  } catch (error) {
    console.log("[PaymentService] deletePayment - Erreur", {
      message: error.message,
    });
    if (connection) {
      await connection.rollback();
    }
    logger.error("Erreur lors de la suppression du paiement", {
      error: error.message,
      paymentId,
    });
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Récupère un paiement par son ID avec les relations
 */
const getPaymentById = async (id) => {
  console.log("[PaymentService] getPaymentById - Début", { paymentId: id });

  try {
    const [payments] = await db.query(
      `SELECT p.*,
                    o.id as order_id_full, o.user_id, o.plan_id, o.order_reference,
                    o.amount as order_amount, o.status as order_status,
                    o.created_at as order_created_at, o.updated_at as order_updated_at,
                    pl.name as plan_name, pl.price as plan_price,
                    pl.description as plan_description, pl.type as plan_type,
                    op.name as operator_name, op.code as operator_code,
                    u.phone_number as user_phone, u.full_name as user_full_name, u.role as user_role,
                    u.created_at as user_created_at, u.updated_at as user_updated_at
             FROM payments p
             LEFT JOIN orders o ON p.order_id = o.id
             LEFT JOIN plans pl ON o.plan_id = pl.id
             LEFT JOIN operators op ON pl.operator_id = op.id
             LEFT JOIN users u ON o.user_id = u.id
             WHERE p.id = ?`,
      [id]
    );
    console.log(
      "[PaymentService] getPaymentById - Résultats (count)",
      payments?.length || 0
    );

    if (!payments || payments.length === 0) {
      throw new Error("Paiement non trouvé");
    }

    const payment = { ...payments[0] };

    // Parser callback_data
    if (payment.callback_data) {
      try {
        payment.callback_data = JSON.parse(payment.callback_data);
      } catch (e) {
        // Garder comme string
      }
    }

    // Ajouter les informations de la commande
    if (payment.order_id) {
      payment.order = {
        id: payment.order_id,
        order_reference: payment.order_reference,
        user_id: payment.user_id,
        plan_id: payment.plan_id,
        amount: payment.order_amount,
        status: payment.order_status,
        created_at: payment.order_created_at,
        updated_at: payment.order_updated_at,
      };
    }

    // Ajouter les informations du plan
    if (payment.plan_id) {
      payment.plan = {
        id: payment.plan_id,
        name: payment.plan_name,
        description: payment.plan_description,
        price: payment.plan_price,
        type: payment.plan_type,
        operator_name: payment.operator_name,
        operator_code: payment.operator_code,
      };
    }

    // Ajouter les informations de l'utilisateur
    if (payment.user_id) {
      payment.user = {
        id: payment.user_id,
        phone_number: payment.user_phone,
        full_name: payment.user_full_name || null,
        role: payment.user_role,
        created_at: payment.user_created_at,
        updated_at: payment.user_updated_at,
      };
    }

    // Supprimer les champs redondants
    [
      "order_id_full",
      "user_id",
      "plan_id",
      "order_reference",
      "order_amount",
      "order_status",
      "order_created_at",
      "order_updated_at",
      "plan_name",
      "plan_price",
      "plan_description",
      "plan_type",
      "operator_name",
      "operator_code",
      "user_phone",
      "user_full_name",
      "user_role",
      "user_created_at",
      "user_updated_at",
    ].forEach((field) => delete payment[field]);

    return payment;
  } catch (error) {
    logger.error("Erreur lors de la récupération du paiement", {
      error: error.message,
      paymentId: id,
    });
    throw error;
  }
};

/**
 * Récupère la liste des paiements avec pagination
 */
const getPayments = async ({
  page = 1,
  limit = 10,
  status,
  payment_method,
  start_date,
  end_date,
  order_id,
  user_id,
  plan_id,
} = {}) => {
  try {
    console.log("[PaymentService] getPayments - Paramètres", {
      page,
      limit,
      status,
      payment_method,
      start_date,
      end_date,
      order_id,
      user_id,
      plan_id,
    });
    const offset = (page - 1) * limit;
    const whereClauses = [];
    const params = [];

    if (status) {
      whereClauses.push("p.status = ?");
      params.push(status);
    }
    if (payment_method) {
      whereClauses.push("p.payment_method = ?");
      params.push(payment_method);
    }
    if (start_date) {
      whereClauses.push("p.created_at >= ?");
      params.push(new Date(start_date));
    }
    if (end_date) {
      whereClauses.push("p.created_at <= ?");
      params.push(new Date(end_date));
    }
    if (order_id) {
      whereClauses.push("p.order_id = ?");
      params.push(order_id);
    }
    if (user_id) {
      whereClauses.push("o.user_id = ?");
      params.push(user_id);
    }
    if (plan_id) {
      whereClauses.push("o.plan_id = ?");
      params.push(plan_id);
    }

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const [payments] = await db.query(
      `SELECT p.*, o.status as order_status, o.user_id, o.order_reference,
                    u.phone_number as user_phone
             FROM payments p
             LEFT JOIN orders o ON p.order_id = o.id
             LEFT JOIN users u ON o.user_id = u.id
             ${whereClause}
             ORDER BY p.created_at DESC
             LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [countResult] = await db.query(
      `SELECT COUNT(p.id) as total 
             FROM payments p
             LEFT JOIN orders o ON p.order_id = o.id
             ${whereClause}`,
      params
    );

    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    return {
      data: payments.map((p) => {
        if (p.callback_data) {
          try {
            p.callback_data = JSON.parse(p.callback_data);
          } catch (e) {}
        }
        return p;
      }),
      pagination: {
        total,
        total_pages: totalPages,
        current_page: page,
        limit: limit,
        has_next_page: page < totalPages,
        has_previous_page: page > 1,
      },
    };
  } catch (error) {
    logger.error("Erreur lors de la récupération des paiements", {
      error: error.message,
    });
    throw error;
  }
};

/**
 * Met à jour le statut d'un paiement
 */
const updatePaymentStatus = async (id, status, notes = "") => {
  console.log("[PaymentService] updatePaymentStatus - Début", {
    id,
    status,
    notes,
  });
  if (!PAYMENT_STATUS.includes(status)) {
    throw new Error(
      `Statut invalide. Doit être l'un des suivants: ${PAYMENT_STATUS.join(
        ", "
      )}`
    );
  }

  const updateData = { status };
  if (notes) {
    updateData.status_notes = notes;
  }

  return updatePayment(id, updateData);
};

/**
 * Rembourse un paiement
 */
const refundPayment = async (id, reason) => {
  console.log("[PaymentService] refundPayment - Début", { id, reason });
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [payments] = await connection.query(
      "SELECT * FROM payments WHERE id = ?",
      [id]
    );

    if (!payments || payments.length === 0) {
      throw new Error("Paiement non trouvé");
    }

    const payment = payments[0];

    if (payment.status !== "success") {
      throw new Error("Seuls les paiements réussis peuvent être remboursés");
    }

    if (payment.status === "refunded") {
      throw new Error("Ce paiement a déjà été remboursé");
    }

    let callbackData = {};
    if (payment.callback_data) {
      try {
        callbackData = JSON.parse(payment.callback_data);
      } catch (e) {
        callbackData = {};
      }
    }

    callbackData.refund_reason = reason;
    callbackData.refunded_at = new Date().toISOString();
    callbackData.notes = `Remboursement effectué. Raison: ${reason}`;

    await connection.query(
      "UPDATE payments SET status = ?, callback_data = ?, updated_at = ? WHERE id = ?",
      ["refunded", JSON.stringify(callbackData), new Date(), id]
    );

    await connection.commit();

    logger.info(`Paiement remboursé - ID: ${id}`, { reason });

    return await getPaymentById(id);
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    logger.error("Erreur lors du remboursement", {
      error: error.message,
      paymentId: id,
    });
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Vérifie si un paiement est valide et complet
 */
const isPaymentComplete = async (orderId) => {
  try {
    const [payments] = await db.query(
      "SELECT status FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1",
      [orderId]
    );
    return payments.length > 0 && payments[0].status === "success";
  } catch (error) {
    logger.error("Erreur lors de la vérification du statut de paiement", {
      error: error.message,
      orderId,
    });
    throw error;
  }
};

/**
 * Générer un ID de transaction unique
 */
const generateTransactionId = (orderReference) => {
  console.log("[PaymentService] generateTransactionId - Début", {
    orderReference,
  });
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:T.Z]/g, "")
    .slice(0, 14);
  const id = `${timestamp}${orderReference}`;
  console.log("[PaymentService] generateTransactionId - ID généré", {
    transaction_id: id,
  });
  return id;
};

/**
 * ✅ AMÉLIORÉ: Initialiser un paiement avec support complet Wave (return_url, cancel_url, partner_name)
 */
const initializePayment = async (paymentData) => {
  const {
    order_reference,
    amount,
    payment_phone,
    payment_method,
    otp,
    return_url,
    cancel_url,
    error_url,
  } = paymentData;

  console.log(
    "[PaymentService] initializePayment - Début",
    JSON.stringify(paymentData, null, 2)
  );

  try {
    logger.info("[PaymentService] Initialisation paiement", {
      order_reference,
      amount,
      payment_method,
      has_return_url: !!return_url,
      has_cancel_url: !!cancel_url,
    });

    // 1. Vérifier que la commande existe
    const [orders] = await db.execute(
      "SELECT * FROM orders WHERE order_reference = ?",
      [order_reference]
    );
    console.log(
      "[PaymentService] initializePayment - Commandes trouvées",
      orders?.length || 0
    );

    if (orders.length === 0) {
      throw new Error("Commande non trouvée");
    }

    const order = orders[0];

    // 2. Vérifier que la commande n'est pas déjà payée
    if (order.status === "completed") {
      throw new Error("Cette commande a déjà été payée");
    }

    // // 3. Vérifier que le montant correspond
    // if (parseFloat(amount) !== parseFloat(order.amount)) {
    //     throw new Error("Le montant ne correspond pas à la commande");
    // }

    // 4. Générer un ID de transaction unique
    const transaction_id = generateTransactionId(order_reference);
    console.log("[PaymentService] initializePayment - transaction_id", {
      transaction_id,
    });
    const payment_reference = `PAY-${transaction_id}`;

    // 5. Créer l'enregistrement de paiement avec statut 'pending'
    const [result] = await db.execute(
      `INSERT INTO payments (
                order_id, amount, payment_method, payment_phone, 
                payment_reference, external_reference, status, callback_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        amount,
        payment_method,
        payment_phone,
        payment_reference,
        transaction_id,
        "pending",
        JSON.stringify({
          initiated_at: new Date().toISOString(),
          return_url: return_url || null,
          cancel_url: cancel_url || null,
          error_url: error_url || null,
        }),
      ]
    );
    console.log(
      "[PaymentService] initializePayment - Insertion paiement ID",
      result?.insertId
    );

    const paymentId = result.insertId;

    logger.info("[PaymentService] Paiement créé en base", {
      paymentId,
      transaction_id,
    });

    // 6. Appeler TouchPoint avec les paramètres appropriés selon la méthode
    console.log("[PaymentService] initializePayment - Appel TouchPoint pour", {
      payment_method,
    });

    const touchpointParams = {
      amount,
      payment_phone,
      payment_method,
      transaction_id,
      order_reference,
      otp, // OTP requis uniquement pour Orange Money
    };

    // ✅ Pour Wave, ajouter les URLs de callback (comme dans PHP)
    if (payment_method === "wave") {
      touchpointParams.return_url = return_url;
      touchpointParams.cancel_url = cancel_url;
      touchpointParams.error_url = error_url || cancel_url;

      console.log(
        "[PaymentService] initializePayment - Wave avec URLs de callback",
        {
          return_url: touchpointParams.return_url,
          cancel_url: touchpointParams.cancel_url,
        }
      );
    }

    const paymentResult = await touchpointService.createTransaction(
      touchpointParams
    );

    console.log(
      "[PaymentService] initializePayment - Résultat TouchPoint",
      JSON.stringify(paymentResult, null, 2)
    );

    // 7. Mettre à jour avec les données TouchPoint
    const callbackData = {
      ...paymentResult,
      initiated_at: new Date().toISOString(),
      touchpoint_transaction_id: paymentResult.touchpoint_transaction_id,
      touchpoint_status: paymentResult.status,
      touchpoint_response: paymentResult.raw_response,
    };

    // ✅ Conserver les URLs pour Wave
    if (payment_method === "wave") {
      callbackData.return_url = return_url;
      callbackData.cancel_url = cancel_url;
      callbackData.error_url = error_url;
    }

    await db.execute(`UPDATE payments SET callback_data = ? WHERE id = ?`, [
      JSON.stringify(callbackData),
      paymentId,
    ]);
    console.log(
      "[PaymentService] initializePayment - Update callback TouchPoint OK"
    );

    // 8. Retourner la réponse enrichie avec TOUTES les données de paymentResult
    const response = {
      success: true,
      payment_id: paymentId,
      transaction_id,
      payment_method,
      amount,
      ...paymentResult, // ✅ Inclure TOUTES les données de paymentResult
    };

    // ✅ Pour Wave, ajouter les URLs de retour si pas déjà présentes
    if (payment_method === "wave") {
      response.return_url = response.return_url || return_url;
      response.cancel_url = response.cancel_url || cancel_url;
      response.error_url = response.error_url || error_url || cancel_url;
    }

    return response;
  } catch (error) {
    logger.error("[PaymentService] Erreur initialisation paiement", {
      error: error.message,
      order_reference,
    });
    console.log("[PaymentService] initializePayment - Erreur", {
      message: error.message,
    });
    throw error;
  }
};

/**
 * Traiter le webhook TouchPoint - VERSION CORRIGÉE AVEC MÀJ DES STATUTS
 */
const processTouchPointWebhook = async (webhookData) => {
  try {
    logger.info("[PaymentService] Traitement webhook TouchPoint", {
      data: webhookData,
    });
    console.log(
      "[PaymentService] processTouchPointWebhook - Début",
      JSON.stringify(webhookData, null, 2)
    );

    const { partner_transaction_id, status, idFromClient, message } =
      webhookData;

    // TouchPoint peut envoyer soit partner_transaction_id soit idFromClient
    const transactionId = partner_transaction_id || idFromClient;

    if (!transactionId) {
      throw new Error("ID de transaction manquant dans le webhook");
    }

    // Récupérer le paiement
    const [payments] = await db.execute(
      "SELECT * FROM payments WHERE external_reference = ?",
      [transactionId]
    );
    console.log(
      "[PaymentService] processTouchPointWebhook - Paiements trouvés",
      payments?.length || 0
    );

    if (payments.length === 0) {
      throw new Error("Paiement non trouvé");
    }

    const payment = payments[0];

    // Vérifier si déjà traité
    if (payment.status === "success") {
      logger.info("[PaymentService] Paiement déjà traité", {
        transaction_id: transactionId,
      });
      return { success: true, message: "Paiement déjà traité" };
    }

    // Mapper le statut
    const newStatus = touchpointService.mapStatus(status);
    console.log("[PaymentService] processTouchPointWebhook - Nouveau statut", {
      newStatus,
    });

    // ✅ CORRECTION: Gérer callback_data correctement
    let currentCallbackData = {};

    if (payment.callback_data) {
      // Si c'est déjà un objet, l'utiliser directement
      if (typeof payment.callback_data === "object") {
        currentCallbackData = payment.callback_data;
      }
      // Si c'est une chaîne, la parser
      else if (typeof payment.callback_data === "string") {
        try {
          currentCallbackData = JSON.parse(payment.callback_data);
        } catch (e) {
          console.log(
            "[PaymentService] Erreur parsing callback_data, utilisation objet vide",
            e.message
          );
          currentCallbackData = {};
        }
      }
    }

    // ✅ CORRECTION: Mettre à jour TOUS les statuts et messages à jour avec les données du webhook
    const updatedCallbackData = {
      ...currentCallbackData,
      // ✅ Mettre à jour les statuts au niveau racine
      status: status, // Mettre à jour le statut final
      message:
        message ||
        webhookData.message ||
        currentCallbackData.message ||
        "Paiement traité",

      // ✅ Mettre à jour touchpoint_status avec le statut final du webhook
      touchpoint_status: status,

      // ✅ Ajouter les données du webhook
      webhook_data: {
        status: webhookData.status,
        message: webhookData.message,
        service_id: webhookData.service_id,
        call_back_url: webhookData.call_back_url,
        gu_transaction_id: webhookData.gu_transaction_id,
        partner_transaction_id:
          webhookData.partner_transaction_id || transactionId,
        commission: webhookData.commission,
      },
      webhook_received_at: new Date().toISOString(),
    };

    // ✅ Si touchpoint_response existe, mettre à jour son statut aussi
    if (updatedCallbackData.touchpoint_response) {
      updatedCallbackData.touchpoint_response = {
        ...updatedCallbackData.touchpoint_response,
        status: status, // Mettre à jour le statut dans la réponse TouchPoint
      };
    }

    console.log(
      "[PaymentService] processTouchPointWebhook - callback_data à sauvegarder",
      JSON.stringify(updatedCallbackData, null, 2)
    );

    // Mettre à jour le paiement
    await db.execute(
      `UPDATE payments 
             SET status = ?, callback_data = ?, updated_at = NOW()
             WHERE id = ?`,
      [newStatus, JSON.stringify(updatedCallbackData), payment.id]
    );
    console.log(
      "[PaymentService] processTouchPointWebhook - Update paiement OK"
    );

    logger.info("[PaymentService] Paiement mis à jour", {
      paymentId: payment.id,
      oldStatus: payment.status,
      newStatus: newStatus,
      webhookStatus: status,
    });
    console.log("[PaymentService] processTouchPointWebhook - ✅ Succès", {
      paymentId: payment.id,
      newStatus: newStatus,
      webhookStatus: status,
    });

    // Dans processTouchPointWebhook(), après le UPDATE réussi
// ✅ AJOUTER - Après le UPDATE du paiement
if (newStatus === 'success') {
    console.log('[PaymentService] Paiement réussi - envoi notification staff');
    
    try {
        // Récupérer les détails de la commande
        const [orders] = await db.execute(
            `SELECT o.*, p.name as plan_name 
             FROM orders o
             LEFT JOIN plans p ON o.plan_id = p.id
             WHERE o.id = ?`,
            [payment.order_id]
        );
        
        if (orders.length > 0) {
            const order = orders[0];
            
            // Créer l'objet payment enrichi
            const enrichedPayment = {
                id: payment.id,
                amount: parseFloat(payment.amount),
                payment_method: payment.payment_method,
                payment_reference: payment.payment_reference
            };
            
            // Notifier le staff
            await notificationService.notifyPaymentSuccess(enrichedPayment, order);
            
            logger.info('[PaymentService] Notification staff envoyée', {
                orderId: order.id,
                paymentId: payment.id
            });
            console.log('[PaymentService] Notification staff envoyée', {
                orderId: order.id,
                paymentId: payment.id
            });
        }
    } catch (notifError) {
        // Ne pas bloquer le webhook si la notification échoue
        logger.error('[PaymentService] Erreur envoi notification staff', {
            error: notifError.message,
            paymentId: payment.id
        });
        console.log('[PaymentService] Erreur envoi notification staff', {
            message: notifError.message,
            paymentId: payment.id
        });
    }
}

    return {
      success: true,
      status: newStatus,
      message: "Webhook traité avec succès",
      paymentId: payment.id,
      payment_status: newStatus,
    };
  } catch (error) {
    logger.error("[PaymentService] Erreur traitement webhook TouchPoint", {
      error: error.message,
      stack: error.stack,
      webhookData: webhookData,
    });
    console.log("[PaymentService] processTouchPointWebhook - ❌ Erreur", {
      message: error.message,
    });
    throw error;
  }
};

/**
 * Vérifier le statut d'un paiement
 */
const checkPaymentStatus = async (orderReference) => {
  try {
    console.log("[PaymentService] checkPaymentStatus - Début", {
      orderReference,
    });
    const [results] = await db.execute(
      `SELECT p.*, o.order_reference, o.status as order_status
             FROM payments p
             JOIN orders o ON p.order_id = o.id
             WHERE o.order_reference = ?
             ORDER BY p.created_at DESC
             LIMIT 1`,
      [orderReference]
    );
    console.log(
      "[PaymentService] checkPaymentStatus - Résultats (count)",
      results?.length || 0
    );

    if (results.length === 0) {
      throw new Error("Aucun paiement trouvé pour cette commande");
    }

    const payment = results[0];
    console.log(
      "[PaymentService] checkPaymentStatus - Paiement",
      JSON.stringify(payment, null, 2)
    );

    const response = {
      status: payment.status,
    };
    console.log(
      "[PaymentService] checkPaymentStatus - Réponse",
      JSON.stringify(response, null, 2)
    );
    return response;
  } catch (error) {
    logger.error("[PaymentService] Erreur vérification statut", {
      error: error.message,
      orderReference,
    });
    console.log("[PaymentService] checkPaymentStatus - Erreur", {
      message: error.message,
    });
    throw error;
  }
};

/**
 * Récupère tous les paiements d'un utilisateur avec filtres avancés
 */
/**
 * Récupère tous les paiements d'un utilisateur avec filtres avancés
 * ✅ CORRECTION: Gestion correcte des paramètres undefined
 */
const getUserPayments = async ({
  user_id,
  page = 1,
  limit = 10,
  status,
  payment_method,
  date,
  start_date,
  end_date,
  sort_by = "created_at",
  sort_order = "DESC",
} = {}) => {
  try {
    console.log("[PaymentService] getUserPayments - Début", {
      user_id,
      filters: { status, payment_method, date, start_date, end_date },
      pagination: { page, limit },
      sort: { sort_by, sort_order },
    });

    // Vérifier que l'utilisateur existe
    const [users] = await db.execute("SELECT id FROM users WHERE id = ?", [
      user_id,
    ]);

    if (users.length === 0) {
      throw new Error("Utilisateur non trouvé");
    }

    console.log("[PaymentService] getUserPayments - Utilisateur trouvé");

    // Construire la requête
    const offset = (page - 1) * limit;
    const whereClauses = [];
    const params = [];

    // Filtre utilisateur (obligatoire)
    whereClauses.push("o.user_id = ?");
    params.push(user_id);

    // ✅ CORRECTION: N'ajouter les filtres que s'ils sont définis
    if (status !== undefined && status !== null && status !== "") {
      whereClauses.push("p.status = ?");
      params.push(status);
    }

    if (
      payment_method !== undefined &&
      payment_method !== null &&
      payment_method !== ""
    ) {
      whereClauses.push("p.payment_method = ?");
      params.push(payment_method);
    }

    if (date !== undefined && date !== null && date !== "") {
      console.log("[PaymentService] getUserPayments - Filtre date", { date });
      whereClauses.push("DATE(p.created_at) = DATE(?)");
      params.push(date);
    }

    if (
      start_date !== undefined &&
      start_date !== null &&
      start_date !== "" &&
      !date
    ) {
      whereClauses.push("p.created_at >= ?");
      params.push(new Date(start_date));
    }

    if (
      end_date !== undefined &&
      end_date !== null &&
      end_date !== "" &&
      !date
    ) {
      whereClauses.push("p.created_at <= ?");
      params.push(new Date(end_date));
    }

    // Valider sort_by (prévention SQL injection)
    const allowedSortFields = [
      "created_at",
      "updated_at",
      "amount",
      "status",
      "payment_method",
    ];
    const sortField = allowedSortFields.includes(sort_by)
      ? sort_by
      : "created_at";
    const sortDirection = sort_order.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const whereClause =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const query = `
            SELECT 
                p.id as payment_id,
                p.order_id,
                p.amount,
                p.payment_method,
                p.payment_phone,
                p.payment_reference,
                p.external_reference,
                p.status,
                p.callback_data,
                p.created_at as payment_created_at,
                p.updated_at as payment_updated_at,
                o.id as order_id_full,
                o.order_reference,
                o.status as order_status,
                o.amount as order_amount,
                o.phone_number as order_phone_number,
                o.assigned_to,
                o.created_at as order_created_at,
                o.updated_at as order_updated_at,
                o.plan_id,
                pl.id as plan_id_full,
                pl.operator_id,
                pl.name as plan_name,
                pl.description as plan_description,
                pl.price as plan_price,
                pl.type as plan_type,
                pl.validity_days as plan_validity_days,
                pl.active as plan_active,
                pl.created_at as plan_created_at,
                op.id as operator_id_full,
                op.name as operator_name,
                op.code as operator_code,
                op.prefixes as operator_prefixes,
                op.created_at as operator_created_at
            FROM payments p
            LEFT JOIN orders o ON p.order_id = o.id
            LEFT JOIN plans pl ON o.plan_id = pl.id
            LEFT JOIN operators op ON pl.operator_id = op.id
            ${whereClause}
            ORDER BY p.${sortField} ${sortDirection}
            LIMIT ? OFFSET ?
        `;

    console.log("[PaymentService] getUserPayments - Exécution requête SELECT");
    console.log("[PaymentService] getUserPayments - Query:", query);
    console.log("[PaymentService] getUserPayments - Params:", [
      ...params,
      limit,
      offset,
    ]);

    // ✅ CORRECTION: Ajouter limit et offset à la fin des paramètres
    const [payments] = await db.query(query, [...params, limit, offset]);
    console.log(
      "[PaymentService] getUserPayments - Résultats (count)",
      payments?.length || 0
    );

    // Requête count
    const countQuery = `
            SELECT COUNT(p.id) as total
            FROM payments p
            LEFT JOIN orders o ON p.order_id = o.id
            ${whereClause}
        `;

    console.log("[PaymentService] getUserPayments - Exécution requête COUNT");
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    console.log("[PaymentService] getUserPayments - Total:", {
      total,
      totalPages,
      currentPage: page,
    });

    // Transformer les données
    const formattedPayments = payments.map((payment) => {
      const result = {
        id: payment.payment_id,
        order_id: payment.order_id,
        amount: parseFloat(payment.amount),
        payment_method: payment.payment_method,
        payment_phone: payment.payment_phone,
        payment_reference: payment.payment_reference,
        external_reference: payment.external_reference,
        status: payment.status,
        callback_data: payment.callback_data
          ? typeof payment.callback_data === "string"
            ? JSON.parse(payment.callback_data)
            : payment.callback_data
          : null,
        created_at: payment.payment_created_at,
        updated_at: payment.payment_updated_at,
      };

      // Ajouter les détails de la commande
      if (payment.order_id) {
        result.order = {
          id: payment.order_id_full,
          reference: payment.order_reference,
          status: payment.order_status,
          amount: parseFloat(payment.order_amount),
          phone_number: payment.order_phone_number,
          assigned_to: payment.assigned_to,
          created_at: payment.order_created_at,
          updated_at: payment.order_updated_at,
          plan_id: payment.plan_id,
        };
      }

      // Ajouter les détails du plan
      if (payment.plan_id) {
        result.plan = {
          id: payment.plan_id_full,
          operator_id: payment.operator_id,
          name: payment.plan_name,
          description: payment.plan_description,
          price: parseFloat(payment.plan_price),
          type: payment.plan_type,
          validity_days: payment.plan_validity_days,
          active: payment.plan_active === 1,
          created_at: payment.plan_created_at,
          operator: {
            id: payment.operator_id_full,
            name: payment.operator_name,
            code: payment.operator_code,
            prefixes: payment.operator_prefixes
              ? typeof payment.operator_prefixes === "string"
                ? JSON.parse(payment.operator_prefixes)
                : payment.operator_prefixes
              : [],
            created_at: payment.operator_created_at,
          },
        };
      }

      return result;
    });

    console.log("[PaymentService] getUserPayments - Transformation terminée");

    return {
      data: formattedPayments,
      pagination: {
        total,
        total_pages: totalPages,
        current_page: page,
        limit,
        has_next_page: page < totalPages,
        has_previous_page: page > 1,
      },
    };
  } catch (error) {
    console.log("[PaymentService] getUserPayments - Erreur", {
      message: error.message,
      userId: user_id,
    });

    logger.error("Erreur récupération paiements utilisateur", {
      error: error.message,
      userId: user_id,
      filters: { status, payment_method, date },
    });

    throw error;
  }
};

module.exports = {
  // Gestion basique des paiements
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentById,
  getPayments,
  updatePaymentStatus,
  refundPayment,
  isPaymentComplete,

  // Gestion des transactions TouchPoint
  generateTransactionId,
  initializePayment,
  processTouchPointWebhook,
  checkPaymentStatus,

  // Constantes
  PAYMENT_METHODS,
  PAYMENT_STATUS,

  // Nouveaux endpoints
  getUserPayments,
};