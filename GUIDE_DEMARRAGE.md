# 🚀 Guide de Démarrage - Backend Kbine

## Table des Matières
- [Serveur Fonctionnel](#-serveur-fonctionnel-)
- [Tests Effectués](#-tests-effectués)
  - [Installation Réussie](#-installation-réussie)
  - [Serveur Démarré](#-serveur-démarré)
  - [Endpoints Testés](#-endpoints-testés)
- [Structure Implémentée](#-structure-implémentée)
  - [Fichiers Documentés et Fonctionnels](#-fichiers-documentés-et-fonctionnels)
  - [Stubs Créés pour le Développeur](#-stubs-créés-pour-le-développeur)
- [Prochaines Étapes pour le Développeur Junior](#-prochaines-étapes-pour-le-développeur-junior)
  - [Configuration Base de Données](#1-configuration-base-de-données)
  - [Docker Setup](#2-docker-setup)
  - [Implémentation Progressive](#3-implémentation-progressive)
- [Commandes Utiles](#-commandes-utiles)
  - [Développement](#développement)
  - [Docker](#docker)
- [Status](#-status--prêt-pour-le-développement)

## ✅ Serveur Fonctionnel !

Le backend Kbine est maintenant opérationnel avec une base de code documentée et testée.

## 📋 Tests Effectués

### 🔧 Installation Réussie
```bash
pnpm install  # ✅ 501 packages installés en 8.3s
```

### 🌐 Serveur Démarré
```bash
pnpm run dev  # ✅ Serveur sur port 3000
```

### 🧪 Endpoints Testés

#### 1. Health Check ✅
```bash
GET http://localhost:3000/health
```
**Réponse :**
```json
{
  "status": "OK",
  "timestamp": "2025-10-02T11:31:09.031Z",
  "service": "Kbine-backend"
}
```

#### 2. Authentification ✅
```bash
POST http://localhost:3000/api/auth/login
Content-Type: application/json
{
  "phoneNumber": "0701234567"
}
```
**Réponse :**
```json
{
  "message": "Login endpoint fonctionnel - A implementer",
  "phoneNumber": "0701234567",
  "note": "Le developpeur junior doit implementer la logique complete"
}
```

#### 3. Validation ✅
```bash
POST http://localhost:3000/api/auth/login
{
  "phoneNumber": "invalid"
}
```
**Réponse :**
```json
{
  "error": "Donnees invalides",
  "details": "Le numero doit contenir au moins 8 chiffres"
}
```

## 🏗️ Structure Implémentée

### ✅ Fichiers Documentés et Fonctionnels
- **src/app.js** - Application Express avec Socket.IO
- **src/routes/authRoutes.js** - Routes d'authentification
- **src/middlewares/auth.js** - Sécurité JWT
- **src/middlewares/errorHandler.js** - Gestion d'erreurs
- **src/middlewares/rateLimiter.js** - Protection anti-abus
- **src/config/database.js** - Configuration MySQL
- **src/utils/logger.js** - Système de logs

### 🔄 Stubs Créés pour le Développeur
- **src/controllers/authController.js** - Logique métier auth
- **src/validators/authValidator.js** - Validation Joi
- **src/services/userService.js** - Service utilisateur

## 🎯 Prochaines Étapes pour le Développeur Junior

### 1. Configuration Base de Données
```bash
# Réactiver la connexion DB dans src/config/database.js
# Ligne 104: Décommenter testConnection();
```

### 2. Docker Setup
```bash
cd backend
docker-compose -p Kbine up -d
```

### 3. Implémentation Progressive

#### Controllers à Compléter
- [ ] `authController.js` - Logique login/logout réelle
- [ ] `userController.js` - CRUD utilisateurs
- [ ] `operatorController.js` - Gestion opérateurs
- [ ] `planController.js` - Gestion forfaits
- [ ] `orderController.js` - Gestion commandes
- [ ] `paymentController.js` - Gestion paiements

#### Services à Créer
- [ ] Requêtes SQL dans `userService.js`
- [ ] `operatorService.js` - Détection opérateur
- [ ] `planService.js` - Catalogue forfaits
- [ ] `orderService.js` - Workflow commandes
- [ ] `paymentService.js` - APIs paiement

#### Routes à Ajouter
```javascript
// Dans app.js, décommenter:
app.use('/api/users', userRoutes);
app.use('/api/operators', operatorRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
```

## 🔧 Commandes Utiles

### Développement
```bash
# Développement
pnpm run dev        # Serveur avec nodemon
pnpm start          # Serveur production
pnpm test           # Tests (à configurer)
pnpm run lint       # Linting (à configurer)
```

### Docker
```bash
# Docker
docker-compose -p kbine up -d      # Démarrer tous services
docker-compose -p kbine up -d --build # Démarrer tous services avec build
docker-compose -p kbine down       # Arrêter tous services
docker-compose -p kbine logs -f    # Voir tous les logs
docker-compose -p kbine ps         # Voir les services en cours
docker-compose -p kbine down --volumes # Arrêter et supprimer les volumes
docker-compose -p kbine down --rmi all # Arrêter et supprimer les images
docker-compose -p kbine down --remove-orphans # Arrêter et supprimer les orphelins
docker-compose -p kbine down --remove-orphans --volumes --rmi all # Arrêter et supprimer tous
docker-compose -p kbine down --remove-orphans --volumes --rmi all --build # Arrêter et supprimer tous avec build
```

# Arrêter les conteneurs
docker-compose -p kbine down


# Supprimer l'image existante
docker rmi kbine-kbine

# Reconstruire et relancer les conteneurs
docker-compose -p kbine up -d --build


# lancer les logs
docker-compose -p kbine logs -f

# initialiser la base de données
docker exec -i kbine-mysql mysql -u kbine_user -p'kbine_secure_password' kbine_db < scripts/init.sql

# migration la base de données
mysql -u kbine_user -p'kbine_secure_password' kbine_db < scripts/migration1.sql



# syntaxe a effectuer sur le serveur 

# mettre a ajour
git pull origin main 
docker compose up -d --build

# voir les log en temps reel
docker logs -f kbine-app

docker volume inspect kbine-logs

# voir les logs dans le dossier logs/

# Voir les logs en temps réel
docker exec -it kbine-app tail -f /app/logs/combined-$(date +%Y-%m-%d).log

# Voir tous les fichiers de logs
docker exec -it kbine-app ls -lah /app/logs

# Lire un fichier de log spécifique
docker exec -it kbine-app cat /app/logs/error-2026-01-07.log

# Ouvrir un shell dans le conteneur pour explorer
docker exec -it kbine-app sh
cd /app/logs
ls -lah

# Copier tous les logs dans le dossier actuel
docker cp kbine-app:/app/logs ./logs-backup

# Copier un fichier spécifique
docker cp kbine-app:/app/logs/error-2026-01-07.log ./error.log

## 🏆 Status : PRÊT POUR LE DÉVELOPPEMENT

