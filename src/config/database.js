/**
 * Configuration de la connexion a la base de donnees MySQL
 */

const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

// Configuration du pool
const config = {
  host: process.env.DB_HOST || 'Kbine-mysql',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'Kbine_user',
  password: process.env.DB_PASSWORD || 'Kbine_password',
  database: process.env.DB_NAME || 'Kbine_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 60000,
};

console.log('Configuration de la base de donnees:', {
  host: config.host,
  port: config.port,
  user: config.user,
  database: config.database
});

console.log('Creation du pool de connexions MySQL...');
const pool = mysql.createPool(config);

// Test de connexion
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    logger.info('Connexion a la base de donnees MySQL etablie');
    console.log('Connexion a la base de donnees MySQL etablie');
    connection.release();
  } catch (error) {
    logger.error('Erreur de connexion a la base de donnees:', error);
    console.log('Erreur de connexion a la base de donnees:', error);
    console.log('Arret force de l\'application...');
    process.exit(1);
  }
};

console.log('Execution du test de connexion...');
testConnection();

// Export du pool avec méthodes corrigées
module.exports = {
    execute: async (sql, params) => {
        console.log('=== DEBUT DE LA REQUETE ===');
        console.log('Requete SQL:', sql);
        console.log('Parametres:', params);
        const connection = await pool.getConnection();
        console.log('=== CONNEXION Etablie ===');
        try {
            const result = await connection.execute(sql, params);
            console.log('=== REQUETE EXECUTEE ===');
            // console.log('Résultat brut:', JSON.stringify(result, null, 2));
            return result;
        } finally {
            connection.release();
            console.log('=== CONNEXION LIBEREE ===');
        }
    },
    
    query: async (sql, params) => {
        console.log('=== DEBUT DE LA REQUETE (QUERY) ===');
        console.log('Requete SQL:', sql);
        console.log('Parametres:', params);
        const connection = await pool.getConnection();
        console.log('=== CONNEXION Etablie ===');
        try {
            const result = await connection.query(sql, params);
            console.log('=== REQUETE EXECUTEE ===');
            return result;
        } finally {
            connection.release();
            console.log('=== CONNEXION LIBEREE ===');
        }
    },
    
    // ✅ CORRECTION: Suppression des logs erronés
    getConnection: async () => {
        console.log('=== DEMANDE DE CONNEXION ===');
        return await pool.getConnection();
    }
};