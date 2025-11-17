/**
 * Test TouchPoint avec IPv4 forcé
 */

require('dotenv').config();
const https = require('https');
const dns = require('dns');

const TOUCHPOINT_URL = process.env.TOUCHPOINT_API_URL || 'https://apidist.gutouch.net/apidist/sec/touchpayapi';
const urlObj = new URL(TOUCHPOINT_URL);

console.log('========================================');
console.log('🔍 TEST TOUCHPOINT - IPv4 FORCÉ');
console.log('========================================\n');

// Forcer IPv4
dns.setDefaultResultOrder('ipv4first');

console.log('1️⃣  Résolution DNS (IPv4 seulement)...');
dns.resolve4(urlObj.hostname, (err, addresses) => {
    if (err) {
        console.error(`   ❌ Erreur: ${err.message}`);
        console.log('\n💡 Essayons avec getaddrinfo...\n');
        
        // Fallback
        dns.lookup(urlObj.hostname, { family: 4 }, (err2, address) => {
            if (err2) {
                console.error(`   ❌ Impossible de résoudre en IPv4: ${err2.message}`);
                process.exit(1);
            }
            testConnection(address);
        });
        return;
    }
    
    console.log(`   ✅ IPv4: ${addresses[0]}\n`);
    testConnection(addresses[0]);
});

function testConnection(ipAddress) {
    console.log('2️⃣  Test connexion HTTPS...');
    console.log(`   IP cible: ${ipAddress}:443\n`);
    
    const req = https.request({
        host: ipAddress,
        port: 443,
        path: urlObj.pathname,
        method: 'GET',
        timeout: 15000,
        headers: {
            'Host': urlObj.hostname,
            'User-Agent': 'Kbine-Test/1.0'
        }
    }, (res) => {
        console.log(`   ✅ Connexion établie!`);
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Headers:`, JSON.stringify(res.headers, null, 2));
        
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('\n3️⃣  Réponse:');
            console.log(data.substring(0, 500));
            console.log('\n========================================');
            console.log('✅ TEST RÉUSSI!');
            console.log('========================================');
        });
    });
    
    req.on('error', (error) => {
        console.error(`   ❌ Erreur: ${error.message}`);
        console.error(`   Code: ${error.code}`);
        console.error(`   Syscall: ${error.syscall}`);
        
        console.log('\n========================================');
        console.log('❌ ÉCHEC - DIAGNOSTICS:');
        console.log('========================================\n');
        
        if (error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
            console.log('🔴 Timeout de connexion\n');
            console.log('Causes possibles:');
            console.log('1. 🔥 Firewall Windows bloque les connexions sortantes HTTPS');
            console.log('2. 🏢 Proxy d\'entreprise requis');
            console.log('3. 🌐 Fournisseur d\'accès Internet bloque le port 443');
            console.log('4. 🛡️  Antivirus bloque la connexion');
            console.log('\nSolutions à essayer:');
            console.log('• Désactiver temporairement Windows Firewall');
            console.log('• Vérifier les paramètres proxy (IE/Edge)');
            console.log('• Essayer depuis un autre réseau (partage de connexion mobile)');
            console.log('• Contacter votre service IT si en entreprise');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('🔴 Connexion refusée par le serveur');
        } else if (error.code === 'ENOTFOUND') {
            console.log('🔴 Impossible de résoudre le nom de domaine');
        }
        
        console.log('\n========================================');
        process.exit(1);
    });
    
    req.on('timeout', () => {
        console.error('   ❌ Timeout après 15 secondes');
        console.log('\n💡 Le serveur ne répond pas. Vérifiez:');
        console.log('   1. Firewall Windows');
        console.log('   2. Antivirus');
        console.log('   3. Paramètres proxy');
        req.destroy();
        process.exit(1);
    });
    
    req.end();
}