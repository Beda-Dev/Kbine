const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Crée un nouvel opérateur
 * @param {Object} operatorData - Données de l'opérateur à créer
 * @returns {Promise<Object>} L'opérateur créé
 */
const create = async (operatorData) => {
    const context = '[operatorsService] [create]';
    console.log(`${context} Début de création d'opérateur`, { operatorData: { ...operatorData, prefixes: '[...]' } });
    logger.info(`${context} Tentative de création d'opérateur`, { 
        name: operatorData.name,
        code: operatorData.code,
        prefixesCount: Array.isArray(operatorData.prefixes) ? operatorData.prefixes.length : 0
    });
    try {
        // S'assurer que les préfixes sont stockés sous forme de tableau JSON
        const prefixes = Array.isArray(operatorData.prefixes) 
            ? JSON.stringify(operatorData.prefixes)
            : operatorData.prefixes;
            
        console.log(`${context} Préfixes formatés:`, { prefixes: prefixes ? '[...]' : 'null' });

        console.log(`${context} Exécution de la requête d'insertion`);
        const [result] = await db.execute(
            'INSERT INTO operators (name, code, prefixes) VALUES (?, ?, ?)',
            [operatorData.name, operatorData.code, prefixes]
        );
        
        console.log(`${context} Opérateur créé avec succès`, { insertId: result.insertId });
        logger.info(`${context} Opérateur créé avec succès`, { 
            id: result.insertId,
            name: operatorData.name,
            code: operatorData.code
        });
        
        return await findById(result.insertId);
    } catch (error) {
        console.error(`${context} Erreur lors de la création de l'opérateur:`, error);
        logger.error(`${context} Échec de la création de l'opérateur`, {
            error: error.message,
            code: error.code,
            stack: error.stack,
            operatorData: { ...operatorData, prefixes: '[...]' }
        });
        
        if (error.code === 'ER_DUP_ENTRY') {
            const errorMsg = `Un opérateur avec le code '${operatorData.code}' existe déjà`;
            console.error(`${context} ${errorMsg}`);
            throw new Error(errorMsg);
        }
        
        throw new Error(`Échec de la création de l'opérateur: ${error.message}`);
    }
};

/**
 * Trouve un opérateur par son ID
 * @param {number} operatorId - ID de l'opérateur
 * @returns {Promise<Object|null>} L'opérateur trouvé ou null si non trouvé
 */
const findById = async (operatorId) => {
    const context = '[operatorsService] [findById]';
    console.log(`${context} Recherche de l'opérateur par ID:`, operatorId);
    
    if (!operatorId || isNaN(parseInt(operatorId, 10))) {
        const errorMsg = `ID d'opérateur invalide: ${operatorId}`;
        console.error(`${context} ${errorMsg}`);
        logger.error(`${context} ${errorMsg}`);
        throw new Error(errorMsg);
    }
    
    try {
        console.log(`${context} Exécution de la requête de recherche`);
        const [rows] = await db.execute(
            'SELECT id, name, code, prefixes, created_at FROM operators WHERE id = ?',
            [operatorId]
        );

        if (rows.length === 0) {
            console.log(`${context} Aucun opérateur trouvé avec l'ID:`, operatorId);
            logger.debug(`${context} Aucun opérateur trouvé`, { operatorId });
            return null;
        }

        // Convertir les préfixes en tableau si nécessaire
        const operator = rows[0];
        console.log(`${context} Opérateur trouvé:`, { 
            id: operator.id, 
            name: operator.name,
            hasPrefixes: !!operator.prefixes 
        });
        
        if (operator.prefixes && typeof operator.prefixes === 'string') {
            try {
                operator.prefixes = JSON.parse(operator.prefixes);
                console.log(`${context} Préfixes parsés avec succès`, { 
                    prefixesCount: operator.prefixes.length 
                });
            } catch (e) {
                const errorMsg = `Erreur lors du parsing des préfixes: ${e.message}`;
                console.error(`${context} ${errorMsg}`, { 
                    prefixes: operator.prefixes.substring(0, 100) + '...' 
                });
                logger.error(`${context} ${errorMsg}`, { 
                    error: e.message,
                    operatorId: operator.id
                });
                operator.prefixes = [];
            }
        } else if (operator.prefixes) {
            console.log(`${context} Préfixes déjà au bon format`, { 
                type: typeof operator.prefixes,
                isArray: Array.isArray(operator.prefixes)
            });
        }

        logger.debug(`${context} Opérateur récupéré avec succès`, { 
            operatorId: operator.id,
            name: operator.name
        });
        
        return operator;
    } catch (error) {
        const errorMsg = `Erreur lors de la recherche de l'opérateur ${operatorId}: ${error.message}`;
        console.error(`${context} ${errorMsg}`, error);
        logger.error(`${context} Erreur lors de la récupération de l'opérateur`, {
            error: error.message,
            stack: error.stack,
            operatorId
        });
        throw new Error('Erreur lors de la récupération de l\'opérateur');
    }
};

/**
 * Trouve un opérateur par son code
 * @param {string} code - Code de l'opérateur
 * @returns {Promise<Object|null>} L'opérateur trouvé ou null si non trouvé
 */
const findByCode = async (code) => {
    const context = '[operatorsService] [findByCode]';
    console.log(`${context} Recherche de l'opérateur par code:`, code);
    
    if (!code || typeof code !== 'string') {
        const errorMsg = 'Code opérateur invalide';
        console.error(`${context} ${errorMsg}`, { code });
        logger.error(`${context} ${errorMsg}`, { code });
        throw new Error(errorMsg);
    }
    
    try {
        console.log(`${context} Exécution de la requête de recherche par code`);
        const [rows] = await db.execute(
            'SELECT id, name, code, prefixes, created_at FROM operators WHERE code = ?', 
            [code]
        );
        
        if (rows.length === 0) {
            console.log(`${context} Aucun opérateur trouvé avec le code:`, code);
            logger.debug(`${context} Aucun opérateur trouvé`, { code });
            return null;
        }
        
        // Convertir les préfixes en tableau si nécessaire
        const operator = rows[0];
        console.log(`${context} Opérateur trouvé par code:`, { 
            id: operator.id, 
            name: operator.name,
            code: operator.code,
            hasPrefixes: !!operator.prefixes
        });
        
        if (operator.prefixes && typeof operator.prefixes === 'string') {
            try {
                operator.prefixes = JSON.parse(operator.prefixes);
                console.log(`${context} Préfixes parsés avec succès`, { 
                    prefixesCount: operator.prefixes.length 
                });
            } catch (e) {
                const errorMsg = `Erreur lors du parsing des préfixes: ${e.message}`;
                console.error(`${context} ${errorMsg}`, { 
                    prefixes: operator.prefixes ? operator.prefixes.substring(0, 100) + '...' : 'null'
                });
                logger.error(`${context} ${errorMsg}`, { 
                    error: e.message,
                    operatorCode: code
                });
                operator.prefixes = [];
            }
        }
        
        logger.debug(`${context} Opérateur récupéré avec succès par code`, { 
            operatorId: operator.id,
            code: operator.code
        });
        
        return operator;
    } catch (error) {
        const errorMsg = `Erreur lors de la recherche de l'opérateur par code '${code}': ${error.message}`;
        console.error(`${context} ${errorMsg}`, error);
        logger.error(`${context} Erreur lors de la recherche par code`, {
            error: error.message,
            stack: error.stack,
            code
        });
        throw new Error('Erreur lors de la recherche de l\'opérateur par code');
    }
};

/**
 * Récupère tous les opérateurs
 * @returns {Promise<Array>} Liste des opérateurs
 */
const findAll = async () => {
    const context = '[operatorsService] [findAll]';
    console.log(`${context} Récupération de tous les opérateurs`);
    
    try {
        console.log(`${context} Exécution de la requête de sélection`);
        const [rows] = await db.execute(
            'SELECT id, name, code, prefixes, created_at FROM operators ORDER BY name'
        );
        
        console.log(`${context} ${rows.length} opérateurs trouvés`);
        
        // Convertir les préfixes en tableau pour chaque opérateur
        const operators = rows.map((operator, index) => {
            if (operator.prefixes && typeof operator.prefixes === 'string') {
                try {
                    operator.prefixes = JSON.parse(operator.prefixes);
                    if (index < 5) { // Log uniquement les 5 premiers pour éviter la surcharge
                        console.log(`${context} Préfixes parsés pour ${operator.name}`, {
                            operatorId: operator.id,
                            prefixesCount: operator.prefixes.length
                        });
                    }
                } catch (e) {
                    const errorMsg = `Erreur lors du parsing des préfixes pour l'opérateur ${operator.id}`;
                    console.error(`${context} ${errorMsg}`, e);
                    logger.error(`${context} ${errorMsg}`, {
                        error: e.message,
                        operatorId: operator.id,
                        prefixes: operator.prefixes ? operator.prefixes.substring(0, 50) + '...' : 'null'
                    });
                    operator.prefixes = [];
                }
            }
            return operator;
        });
        
        logger.info(`${context} Liste des opérateurs récupérée avec succès`, {
            count: operators.length
        });
        
        return operators;
    } catch (error) {
        const errorMsg = `Erreur lors de la récupération des opérateurs: ${error.message}`;
        console.error(`${context} ${errorMsg}`, error);
        logger.error(`${context} Erreur lors de la récupération de la liste des opérateurs`, {
            error: error.message,
            stack: error.stack
        });
        throw new Error('Erreur lors de la récupération de la liste des opérateurs');
    }
};

/**
 * Met à jour un opérateur existant
 * @param {number} operatorId - L'ID de l'opérateur à mettre à jour
 * @param {Object} operatorData - Les données à mettre à jour
 * @returns {Promise<Object>} L'opérateur mis à jour
 */
const update = async (operatorId, operatorData) => {
    const context = '[operatorsService] [update]';
    console.log(`${context} Mise à jour de l'opérateur:`, { 
        operatorId,
        updateFields: Object.keys(operatorData).filter(k => k !== 'prefixes')
    });
    
    if (!operatorId || isNaN(parseInt(operatorId, 10))) {
        const errorMsg = `ID d'opérateur invalide: ${operatorId}`;
        console.error(`${context} ${errorMsg}`);
        logger.error(`${context} ${errorMsg}`);
        throw new Error(errorMsg);
    }
    
    try {
        // S'assurer que les préfixes sont stockés sous forme de tableau JSON
        const prefixes = operatorData.prefixes !== undefined
            ? (Array.isArray(operatorData.prefixes) 
                ? JSON.stringify(operatorData.prefixes)
                : operatorData.prefixes)
            : undefined;
        
        // Construire dynamiquement la requête en fonction des champs fournis
        const updates = [];
        const params = [];
        
        if (operatorData.name !== undefined) {
            console.log(`${context} Mise à jour du nom`);
            updates.push('name = ?');
            params.push(operatorData.name);
        }
        
        if (operatorData.code !== undefined) {
            console.log(`${context} Mise à jour du code:`, operatorData.code);
            updates.push('code = ?');
            params.push(operatorData.code);
        }
        
        if (prefixes !== undefined) {
            console.log(`${context} Mise à jour des préfixes`, { 
                prefixes: prefixes ? '[...]' : 'null' 
            });
            updates.push('prefixes = ?');
            params.push(prefixes);
        }
        
        if (updates.length === 0) {
            console.log(`${context} Aucune mise à jour nécessaire`);
            return await findById(operatorId);
        }
        
        // Ajouter la date de mise à jour
        updates.push('updated_at = NOW()');
        
        // Ajouter l'ID de l'opérateur aux paramètres pour la clause WHERE
        params.push(operatorId);
        
        const query = `UPDATE operators SET ${updates.join(', ')} WHERE id = ?`;
        console.log(`${context} Exécution de la requête de mise à jour`, { 
            query: query.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim(),
            params: params.map(p => (p && p.length > 20) ? p.substring(0, 20) + '...' : p)
        });
        
        const [result] = await db.execute(query, params);
        
        if (result.affectedRows === 0) {
            const errorMsg = `Aucun opérateur trouvé avec l'ID: ${operatorId}`;
            console.error(`${context} ${errorMsg}`);
            logger.warn(`${context} ${errorMsg}`);
            throw new Error(errorMsg);
        }
        
        console.log(`${context} Opérateur mis à jour avec succès`, { 
            operatorId,
            affectedRows: result.affectedRows 
        });
        
        const updatedOperator = await findById(operatorId);
        
        logger.info(`${context} Opérateur mis à jour avec succès`, {
            operatorId: updatedOperator.id,
            name: updatedOperator.name,
            code: updatedOperator.code,
            prefixesCount: updatedOperator.prefixes ? updatedOperator.prefixes.length : 0
        });
        
        return updatedOperator;
    } catch (error) {
        console.error(`${context} Erreur lors de la mise à jour de l'opérateur ${operatorId}:`, error);
        
        if (error.code === 'ER_DUP_ENTRY') {
            const errorMsg = `Un opérateur avec le code '${operatorData.code}' existe déjà`;
            console.error(`${context} ${errorMsg}`);
            logger.error(`${context} ${errorMsg}`, {
                operatorId,
                code: operatorData.code
            });
            throw new Error(errorMsg);
        }
        
        logger.error(`${context} Échec de la mise à jour de l'opérateur`, {
            error: error.message,
            stack: error.stack,
            operatorId,
            updateFields: Object.keys(operatorData)
        });
        
        throw new Error(`Échec de la mise à jour de l'opérateur: ${error.message}`);
    }
};

/**
 * Supprime un opérateur par son ID
 * @param {number} operatorId - ID de l'opérateur à supprimer
 * @returns {Promise<boolean>} True si la suppression a réussi
 */
const deleteById = async (operatorId) => {
    const context = '[operatorsService] [deleteById]';
    console.log(`${context} Suppression de l'opérateur:`, { operatorId });
    
    if (!operatorId || isNaN(parseInt(operatorId, 10))) {
        const errorMsg = `ID d'opérateur invalide: ${operatorId}`;
        console.error(`${context} ${errorMsg}`);
        logger.error(`${context} ${errorMsg}`);
        throw new Error(errorMsg);
    }
    
    try {
        // Vérifier d'abord si l'opérateur existe
        const operator = await findById(operatorId);
        if (!operator) {
            const errorMsg = `Aucun opérateur trouvé avec l'ID: ${operatorId}`;
            console.error(`${context} ${errorMsg}`);
            logger.warn(`${context} ${errorMsg}`);
            throw new Error(errorMsg);
        }
        
        console.log(`${context} Tentative de suppression de l'opérateur`, {
            id: operator.id,
            name: operator.name,
            code: operator.code
        });
        
        const [result] = await db.execute('DELETE FROM operators WHERE id = ?', [operatorId]);
        
        if (result.affectedRows === 0) {
            const errorMsg = `Échec de la suppression - Aucune ligne affectée pour l'ID: ${operatorId}`;
            console.error(`${context} ${errorMsg}`);
            logger.error(`${context} ${errorMsg}`);
            throw new Error('Échec de la suppression de l\'opérateur');
        }
        
        console.log(`${context} Opérateur supprimé avec succès`, {
            operatorId,
            affectedRows: result.affectedRows
        });
        
        logger.info(`${context} Opérateur supprimé avec succès`, {
            operatorId: operator.id,
            name: operator.name,
            code: operator.code
        });
        
        return true;
    } catch (error) {
        console.error(`${context} Erreur lors de la suppression de l'opérateur ${operatorId}:`, error);
        
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            const errorMsg = `Impossible de supprimer l'opérateur ${operatorId} car il est utilisé dans des plans ou des commandes`;
            console.error(`${context} ${errorMsg}`);
            logger.error(`${context} ${errorMsg}`, {
                operatorId,
                error: error.message
            });
            throw new Error('Impossible de supprimer cet opérateur car il est utilisé dans des plans ou des commandes');
        }
        
        logger.error(`${context} Échec de la suppression de l'opérateur`, {
            error: error.message,
            stack: error.stack,
            operatorId
        });
        
        throw new Error(`Échec de la suppression de l'opérateur: ${error.message}`);
    }
};

module.exports = {
    create,
    findById,
    findByCode,
    findAll,
    update,
    deleteById
};

