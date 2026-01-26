-- =========================================================
-- Script d'initialisation de la base de donnees kbine (v3)
-- Compatible MySQL 8.x
-- =========================================================

CREATE DATABASE IF NOT EXISTS kbine_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE kbine_db;

-- =========================================================
-- TABLE : users
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    role ENUM('client', 'staff', 'admin') DEFAULT 'client',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- =========================================================
-- TABLE : operators
-- =========================================================
CREATE TABLE IF NOT EXISTS operators (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    prefixes JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- TABLE : plans
-- =========================================================
CREATE TABLE IF NOT EXISTS plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operator_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    type ENUM('credit', 'minutes', 'internet', 'mixte') NOT NULL,
    validity_days INT DEFAULT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (operator_id) REFERENCES operators(id)
);

-- =========================================================
-- TABLE : orders
-- =========================================================
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_reference VARCHAR(20) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    plan_id INT DEFAULT NULL,
    phone_number VARCHAR(15) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'assigned', 'processing', 'completed', 'cancelled', 'network_error') DEFAULT 'pending',
    assigned_to INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_order_reference (order_reference),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);

-- =========================================================
-- TABLE : sessions
-- =========================================================
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    refresh_token VARCHAR(500) DEFAULT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================================================
-- TABLE : payments
-- =========================================================
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('wave', 'orange_money', 'mtn_money', 'moov_money') NOT NULL,
    payment_phone VARCHAR(15) DEFAULT NULL,
    payment_reference VARCHAR(100) NOT NULL,
    external_reference VARCHAR(100) DEFAULT NULL,
    status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending',
    callback_data JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);


-- =========================================================
-- TABLE : app_version
-- =========================================================
CREATE TABLE IF NOT EXISTS app_version (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    
    -- Versions iOS
    ios_version VARCHAR(20) NOT NULL,
    ios_build_number INT NOT NULL,
    
    -- Versions Android  
    android_version VARCHAR(20) NOT NULL,
    android_build_number INT NOT NULL,
    
    -- Contrôle global
    force_update BOOLEAN DEFAULT FALSE,
    
    -- Métadonnées
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- =========================================================
-- DONNEES INITIALES
-- =========================================================
INSERT IGNORE INTO operators (name, code, prefixes) VALUES
('Orange CI', 'ORANGE', '["07"]'),
('MTN', 'MTN', '["05"]'),
('Moov', 'MOOV', '["01"]');

INSERT IGNORE INTO users (phone_number, role) VALUES
('0789062079', 'admin'),
('0566955943', 'admin');

INSERT IGNORE INTO app_version (
    ios_version, ios_build_number,
    android_version, android_build_number,
    force_update
) VALUES (
    '1.1.1', 8,
    '1.1.1', 8,
    FALSE
);

-- =========================================================
-- MESSAGE DE SUCCÈS
-- =========================================================
SELECT 'Base de donnees kbine v3 initialisee avec succes!' AS message