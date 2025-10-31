-- =========================================================
-- Migration pour corriger la table orders
-- =========================================================

USE kbine_db;

-- 1. Ajouter order_reference si elle n'existe pas
SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'kbine_db'
  AND TABLE_NAME = 'orders'
  AND COLUMN_NAME = 'order_reference'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN order_reference VARCHAR(20) UNIQUE AFTER id;',
  'SELECT "order_reference déjà existante";'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 2. Ajouter phone_number si elle n'existe pas
SET @col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'kbine_db'
  AND TABLE_NAME = 'orders'
  AND COLUMN_NAME = 'phone_number'
);

SET @sql := IF(@col_exists = 0,
  'ALTER TABLE orders ADD COLUMN phone_number VARCHAR(15) NOT NULL AFTER plan_id;',
  'SELECT "phone_number déjà existante";'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 3. Générer des order_reference manquants
UPDATE orders
SET order_reference = CONCAT('ORD', LPAD(id, 10, '0'))
WHERE order_reference IS NULL OR order_reference = '';


-- 4. Mettre à jour phone_number manquants depuis users
UPDATE orders o
INNER JOIN users u ON o.user_id = u.id
SET o.phone_number = u.phone_number
WHERE o.phone_number IS NULL OR o.phone_number = '';


-- 5. Ajouter les index manquants
SET @idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'kbine_db'
  AND TABLE_NAME = 'orders'
  AND INDEX_NAME = 'idx_order_reference'
);

SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_order_reference ON orders(order_reference);',
  'SELECT "idx_order_reference déjà existant";'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


SET @idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'kbine_db'
  AND TABLE_NAME = 'orders'
  AND INDEX_NAME = 'idx_phone_number'
);

SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_phone_number ON orders(phone_number);',
  'SELECT "idx_phone_number déjà existant";'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


SET @idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = 'kbine_db'
  AND TABLE_NAME = 'orders'
  AND INDEX_NAME = 'idx_created_at'
);

SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_created_at ON orders(created_at);',
  'SELECT "idx_created_at déjà existant";'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- 6. Vérifier les résultats
SELECT 
    COUNT(*) AS total_orders,
    COUNT(order_reference) AS with_reference,
    COUNT(phone_number) AS with_phone
FROM orders;

SELECT 'Migration terminée avec succès!' AS message;

