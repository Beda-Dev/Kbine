/**
 * Configuration de la connexion à la base de données MySQL
 */

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Configuration du pool
const config = {
  host: process.env.DB_HOST || 'kbine-mysql',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'kbine_user',
  password: process.env.DB_PASSWORD || 'kbine_secure_password',
  database: process.env.DB_NAME || 'kbine_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,
};

console.log('Configuration de la base de données:', {
  host: config.host,
  port: config.port,
  user: config.user,
  database: config.database
});

console.log('Création du pool de connexions MySQL...');
const pool = mysql.createPool(config);

// Test de connexion
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('Connexion à la base de données MySQL établie');
    console.log('Connexion à la base de données MySQL établie');
    connection.release();
  } catch (error) {
    logger.error('Erreur de connexion à la base de données:', error);
    console.log('Erreur de connexion à la base de données:', error);
    console.log('Arrêt forcé de l\'application...');
    process.exit(1);
  }
};

console.log('Exécution du test de connexion...');
testConnection();

// Export du pool avec méthodes corrigées
module.exports = {
    execute: async (sql, params) => {
        console.log('=== DÉBUT DE LA REQUÊTE ===');
        console.log('Requête SQL:', sql);
        console.log('Paramètres:', params);
        const connection = await pool.getConnection();
        console.log('=== CONNEXION Établie ===');
        try {
            const result = await connection.execute(sql, params);
            console.log('=== REQUÊTE EXÉCUTÉE ===');
            return result;
        } finally {
            connection.release();
            console.log('=== CONNEXION LIBÉRÉE ===');
        }
    },
    
    query: async (sql, params) => {
        console.log('=== DÉBUT DE LA REQUÊTE (QUERY) ===');
        console.log('Requête SQL:', sql);
        console.log('Paramètres:', params);
        const connection = await pool.getConnection();
        console.log('=== CONNEXION Établie ===');
        try {
            const result = await connection.query(sql, params);
            console.log('=== REQUÊTE EXÉCUTÉE ===');
            return result;
        } finally {
            connection.release();
            console.log('=== CONNEXION LIBÉRÉE ===');
        }
    },
    
    getConnection: async () => {
        console.log('=== DEMANDE DE CONNEXION ===');
        return await pool.getConnection();
    }
};