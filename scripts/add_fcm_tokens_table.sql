-- =========================================================
-- Migration Firebase Cloud Messaging - Tables FCM & Notifications
-- Compatible MySQL 8.x
-- =========================================================

USE kbine_db;

-- =========================================================
-- TABLE : fcm_tokens
-- Stocke les tokens FCM des appareils des utilisateurs
-- =========================================================
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    platform ENUM('android', 'ios') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_token (user_id, token),
    INDEX idx_user_id (user_id),
    INDEX idx_token (token(255)),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- TABLE : notifications
-- Historique des notifications envoyées
-- =========================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    type ENUM('new_order', 'order_completed', 'payment_success', 'general') NOT NULL,
    data JSON DEFAULT NULL,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_type (type),
    INDEX idx_is_sent (is_sent),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================
-- VÉRIFICATION
-- =========================================================
SELECT 'Tables FCM créées avec succès!' AS message;

-- Afficher la structure
SHOW TABLES LIKE '%fcm%';
SHOW TABLES LIKE '%notifications%';

-- Statistiques initiales
SELECT 
    'fcm_tokens' as table_name,
    COUNT(*) as row_count 
FROM fcm_tokens
UNION ALL
SELECT 
    'notifications' as table_name,
    COUNT(*) as row_count 
FROM notifications;