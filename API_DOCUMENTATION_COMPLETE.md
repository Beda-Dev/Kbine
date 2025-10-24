# Documentation Complète de l'API Kbine Backend

## Table des Matières

1. [Informations Générales](#informations-générales)
2. [Authentification](#authentification)
3. [Utilisateurs](#utilisateurs)
4. [Opérateurs](#opérateurs)
5. [Plans / Forfaits](#plans--forfaits)
6. [Commandes](#commandes)
7. [Paiements](#paiements)
8. [Versions d'Application](#9-versions-dapplication)
9. [Codes d'Erreur](#10-codes-derreur)
10. [Exemples d'Utilisation](#11-exemples-dutilisation)
11. [Bonnes Pratiques](#12-bonnes-pratiques)

---

## Informations Générales

### URL de Base

**Développement:** `http://localhost:3000/api`

**Production:** `https://votre-domaine.com/api`

### Format des Réponses

Toutes les réponses sont au format JSON avec encodage UTF-8.

### Headers Standards

```
Content-Type: application/json
Authorization: Bearer <token_jwt> (pour les routes protégées)
```

### Niveaux d'Accès

- **Public** : Accessible sans authentification
- **Client** : Authentification requise
- **Staff** : Rôle staff ou admin requis
- **Admin** : Rôle admin uniquement

---

## Authentification

### 1. Connexion / Inscription

**Endpoint:** `POST /api/auth/login`

**Description:** Authentifie un utilisateur par son numéro de téléphone. Crée automatiquement un compte client si l'utilisateur n'existe pas.

**Niveau d'accès:** Public

#### Données à Envoyer (JSON)

```json
{
  "phoneNumber": "0701020304"
}
```

#### Règles de Validation

- **phoneNumber** (string, requis):
  - Format: 10 chiffres commençant par un préfixe valide
  - Préfixes valides: Récupérés dynamiquement depuis la base de données
  - Exemples: `0701020304`, `0501020304`, `0101020304`

#### Réponse en Cas de Succès (200)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "phone_number": "0701020304",
    "role": "client",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

#### Réponses d'Erreur

**400 - Données Invalides**
```json
{
  "error": "Donnees invalides",
  "details": "Le numéro doit commencer par l'un des préfixes valides (07, 05, 01) et contenir 10 chiffres au total"
}
```

**500 - Erreur Serveur**
```json
{
  "error": "Erreur serveur lors de la connexion",
  "details": "Description détaillée (en mode développement uniquement)"
}
```

---

### 2. Rafraîchir le Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Génère un nouveau token d'accès à partir d'un refresh token.

**Niveau d'accès:** Public (avec refresh token)

#### Données à Envoyer (JSON)

```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Réponse en Cas de Succès (200)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "phone_number": "0701020304",
    "role": "client",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### 3. Déconnexion

**Endpoint:** `POST /api/auth/logout`

**Description:** Déconnecte l'utilisateur et invalide ses sessions.

**Niveau d'accès:** Public

#### Headers Requis

```
Authorization: Bearer <token>
```

#### Réponse en Cas de Succès (200)

```json
{
  "message": "Déconnexion réussie"
}
```

---

## Utilisateurs

### 1. Obtenir le Profil de l'Utilisateur Connecté

**Endpoint:** `GET /api/users/profile`

**Description:** Récupère les informations du profil de l'utilisateur authentifié.

**Niveau d'accès:** Client

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Profil récupéré avec succès",
  "data": {
    "id": 1,
    "phone_number": "0701020304",
    "role": "client",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### 2. Liste de Tous les Utilisateurs

**Endpoint:** `GET /api/users`

**Description:** Récupère la liste de tous les utilisateurs (réservé aux administrateurs).

**Niveau d'accès:** Admin

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Liste des utilisateurs récupérée avec succès",
  "data": [
    {
      "id": 1,
      "phone_number": "0701020304",
      "role": "client",
      "created_at": "2025-01-15T10:30:00.000Z",
      "updated_at": "2025-01-15T10:30:00.000Z"
    }
  ],
  "count": 2
}
```

---

### 3. Obtenir un Utilisateur par ID

**Endpoint:** `GET /api/users/:id`

**Description:** Récupère les détails d'un utilisateur spécifique.

**Niveau d'accès:** Client (pour son propre profil) / Admin (pour tous)

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Utilisateur récupéré avec succès",
  "data": {
    "id": 1,
    "phone_number": "0701020304",
    "role": "client",
    "created_at": "2025-01-15T10:30:00.000Z",
    "updated_at": "2025-01-15T10:30:00.000Z"
  }
}
```

---

### 4. Créer un Nouvel Utilisateur

**Endpoint:** `POST /api/users`

**Description:** Crée un nouvel utilisateur (réservé aux administrateurs).

**Niveau d'accès:** Admin

#### Données à Envoyer (JSON)

```json
{
  "phone_number": "0701020304",
  "role": "client"
}
```

#### Réponse en Cas de Succès (201)

```json
{
  "success": true,
  "message": "Utilisateur créé avec succès",
  "data": {
    "id": 5,
    "phone_number": "0701020304",
    "role": "client",
    "created_at": "2025-01-15T16:00:00.000Z",
    "updated_at": "2025-01-15T16:00:00.000Z"
  }
}
```

---

### 5. Mettre à Jour un Utilisateur

**Endpoint:** `PUT /api/users/:id`

**Description:** Met à jour les informations d'un utilisateur.

**Niveau d'accès:** Client (pour son propre profil) / Admin (pour tous)

#### Données à Envoyer (JSON)

```json
{
  "phone_number": "0701020305",
  "role": "staff"
}
```

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Utilisateur mis à jour avec succès",
  "data": {
    "id": 5,
    "phone_number": "0701020305",
    "role": "staff",
    "created_at": "2025-01-15T16:00:00.000Z",
    "updated_at": "2025-01-15T16:30:00.000Z"
  }
}
```

---

### 6. Supprimer un Utilisateur

**Endpoint:** `DELETE /api/users/:id`

**Description:** Supprime un utilisateur et toutes ses données associées (commandes, paiements, sessions).

**Niveau d'accès:** Admin

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Utilisateur et données associées supprimés avec succès"
}
```

---

## Opérateurs

### 1. Liste de Tous les Opérateurs

**Endpoint:** `GET /api/operators`

**Description:** Récupère la liste de tous les opérateurs téléphoniques disponibles.

**Niveau d'accès:** Public

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "name": "Orange CI",
      "code": "ORANGE",
      "prefixes": ["07"],
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. Détails d'un Opérateur

**Endpoint:** `GET /api/operators/:id`

**Description:** Récupère les détails d'un opérateur spécifique.

**Niveau d'accès:** Public

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Orange CI",
    "code": "ORANGE",
    "prefixes": ["07"],
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

---

### 3. Créer un Opérateur

**Endpoint:** `POST /api/operators`

**Description:** Crée un nouvel opérateur téléphonique.

**Niveau d'accès:** Admin / Staff

#### Données à Envoyer (JSON)

```json
{
  "name": "Telecel",
  "code": "TELECEL",
  "prefixes": ["09", "19"]
}
```

#### Réponse en Cas de Succès (201)

```json
{
  "success": true,
  "message": "Opérateur créé avec succès",
  "data": {
    "id": 4,
    "name": "Telecel",
    "code": "TELECEL",
    "prefixes": ["09", "19"],
    "created_at": "2025-01-15T15:30:00.000Z"
  }
}
```

---

## Plans / Forfaits

### 1. Liste de Tous les Plans

**Endpoint:** `GET /api/plans`

**Description:** Récupère la liste de tous les forfaits.

**Niveau d'accès:** Admin

#### Paramètres de Requête

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `includeInactive` | boolean | false | Inclure les plans inactifs |

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "count": 10,
  "data": [
    {
      "id": 1,
      "operator_id": 1,
      "name": "Recharge 1000 FCFA",
      "description": "Crédit de communication de 1000 FCFA",
      "price": 1000.00,
      "type": "credit",
      "validity_days": null,
      "active": true,
      "operator": {
        "id": 1,
        "name": "Orange CI",
        "code": "ORANGE"
      }
    }
  ]
}
```

---

### 2. Plans par Opérateur

**Endpoint:** `GET /api/plans/operator/:operatorId`

**Description:** Récupère les plans d'un opérateur spécifique (uniquement les plans actifs).

**Niveau d'accès:** Public

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "operator_id": 1,
      "name": "Recharge 1000 FCFA",
      "description": "Crédit de communication de 1000 FCFA",
      "price": 1000.00,
      "type": "credit",
      "validity_days": null,
      "active": true
    }
  ]
}
```

---

### 3. Plans par Numéro de Téléphone

**Endpoint:** `GET /api/plans/phone/:phoneNumber`

**Description:** Détecte automatiquement l'opérateur via le préfixe du numéro et retourne les plans correspondants triés par ID croissant.

**Niveau d'accès:** Public

#### Exemple

`GET /api/plans/phone/0701020304`

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "operator": {
    "id": 1,
    "name": "Orange CI",
    "code": "ORANGE"
  },
  "plans": [
    {
      "id": 1,
      "name": "Recharge 1000 FCFA",
      "description": "Crédit de communication de 1000 FCFA",
      "price": 1000.00,
      "type": "credit",
      "validity_days": null
    }
  ]
}
```

---

### 4. Créer un Plan

**Endpoint:** `POST /api/plans`

**Description:** Crée un nouveau forfait.

**Niveau d'accès:** Admin

#### Données à Envoyer (JSON)

```json
{
  "operator_id": 1,
  "name": "Recharge 5000 FCFA",
  "description": "Crédit de communication de 5000 FCFA",
  "price": 5000.00,
  "type": "credit",
  "validity_days": null,
  "active": true
}
```

#### Types de Plans Valides

- `credit` - Crédit de communication
- `minutes` - Minutes d'appel
- `internet` - Forfait internet
- `mixte` - Forfait combiné

#### Réponse en Cas de Succès (201)

```json
{
  "success": true,
  "message": "Plan créé avec succès",
  "data": {
    "id": 15,
    "operator_id": 1,
    "name": "Recharge 5000 FCFA",
    "description": "Crédit de communication de 5000 FCFA",
    "price": 5000.00,
    "type": "credit",
    "validity_days": null,
    "active": true
  }
}
```

---

## Commandes

### 1. Créer une Commande

**Endpoint:** `POST /api/orders`

**Description:** Crée une nouvelle commande de crédit ou forfait.

**Niveau d'accès:** Client

#### Données à Envoyer (JSON)

```json
{
  "plan_id": 1,
  "amount": 1000.00
}
```

**Note:** Le champ `plan_id` est optionnel (peut être `null` pour les recharges personnalisées).

#### Réponse en Cas de Succès (201)

```json
{
  "success": true,
  "message": "Commande créée avec succès",
  "data": {
    "id": 125,
    "order_reference": "ORD-20250124-ABC12",
    "user_id": 1,
    "plan_id": 1,
    "amount": 1000.00,
    "status": "pending",
    "created_at": "2025-01-15T16:30:00.000Z",
    "plan": {
      "id": 1,
      "name": "Recharge 1000 FCFA",
      "price": 1000.00
    }
  }
}
```

---

### 2. Liste des Commandes

**Endpoint:** `GET /api/orders`

**Description:** Récupère la liste des commandes avec pagination et filtres.

**Niveau d'accès:** Client (ses propres commandes) / Staff/Admin (toutes les commandes)

#### Paramètres de Requête

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | integer | 1 | Numéro de page |
| `limit` | integer | 10 | Éléments par page (max: 100) |
| `status` | string | - | Filtrer par statut |
| `user_id` | integer | - | Filtrer par utilisateur (admin/staff uniquement) |

#### Statuts Possibles

- `pending` - En attente de paiement
- `assigned` - Assignée à un staff
- `processing` - En cours de traitement
- `completed` - Terminée
- `cancelled` - Annulée

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 125,
      "order_reference": "ORD-20250124-ABC12",
      "user_id": 1,
      "plan_id": 1,
      "amount": 1000.00,
      "status": "completed",
      "assigned_to": 5,
      "created_at": "2025-01-15T16:30:00.000Z",
      "plan": {
        "id": 1,
        "name": "Recharge 1000 FCFA",
        "operator_name": "Orange CI"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "totalPages": 5
  }
}
```

---

### 3. Détails d'une Commande

**Endpoint:** `GET /api/orders/:id`

**Description:** Récupère les détails d'une commande spécifique.

**Niveau d'accès:** Client (propriétaire) / Admin / Staff

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": {
    "id": 125,
    "order_reference": "ORD-20250124-ABC12",
    "user_id": 1,
    "plan_id": 1,
    "amount": 1000.00,
    "status": "completed",
    "assigned_to": 5,
    "created_at": "2025-01-15T16:30:00.000Z",
    "updated_at": "2025-01-15T16:35:00.000Z",
    "user": {
      "id": 1,
      "phone_number": "0701020304",
      "role": "client"
    },
    "plan": {
      "id": 1,
      "name": "Recharge 1000 FCFA",
      "price": 1000.00,
      "operator_name": "Orange CI"
    }
  }
}
```

---

### 4. Vérifier le Statut de Paiement d'une Commande

**Endpoint:** `GET /api/orders/payment-status/:id`

**Description:** Récupère le statut de paiement d'une commande spécifique.

**Niveau d'accès:** Client

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": {
    "order_reference": "ORD-20250124-ABC12",
    "order_status": "completed",
    "order_amount": 1000.00,
    "order_created_at": "2025-01-15T16:30:00.000Z",
    "plan": {
      "id": 1,
      "name": "Recharge 1000 FCFA"
    },
    "payment": {
      "status": "success",
      "method": "wave",
      "reference": "PAY-123456",
      "amount": 1000.00,
      "created_at": "2025-01-15T16:31:00.000Z",
      "updated_at": "2025-01-15T16:32:00.000Z"
    },
    "is_paid": true,
    "is_pending": false
  }
}
```

---

### 5. Mettre à Jour le Statut d'une Commande

**Endpoint:** `PATCH /api/orders/:id/status`

**Description:** Met à jour uniquement le statut d'une commande.

**Niveau d'accès:** Staff / Admin

#### Données à Envoyer (JSON)

```json
{
  "status": "processing"
}
```

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Statut de commande mis à jour avec succès",
  "data": {
    "id": 125,
    "status": "processing",
    "updated_at": "2025-01-15T16:33:00.000Z"
  }
}
```

---

### 6. Assigner une Commande

**Endpoint:** `POST /api/orders/:id/assign`

**Description:** Assigne une commande à un membre du staff.

**Niveau d'accès:** Staff / Admin

#### Données à Envoyer (JSON)

```json
{
  "staff_id": 5
}
```

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Commande assignée avec succès",
  "data": {
    "id": 125,
    "assigned_to": 5,
    "status": "assigned",
    "updated_at": "2025-01-15T16:31:00.000Z"
  }
}
```

---

## Paiements

### 1. Méthodes de Paiement Disponibles

**Endpoint:** `GET /api/payments/methods`

**Description:** Récupère la liste des méthodes de paiement disponibles.

**Niveau d'accès:** Public

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": ["wave", "orange_money", "mtn_money", "moov_money"]
}
```

---

### 2. Statuts de Paiement Disponibles

**Endpoint:** `GET /api/payments/statuses`

**Description:** Récupère la liste des statuts de paiement possibles.

**Niveau d'accès:** Authentifié

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": ["pending", "success", "failed", "refunded"]
}
```

---

### 3. Initialiser un Paiement

**Endpoint:** `POST /api/payments/initialize`

**Description:** Initialise un paiement via Wave ou TouchPoint (MTN, Orange Money, Moov).

**Niveau d'accès:** Public

#### Données à Envoyer (JSON)

```json
{
  "order_reference": "ORD-20250124-ABC12",
  "amount": 1000.00,
  "payment_phone": "0701020304",
  "payment_method": "wave",
  "otp": "123456"
}
```

**Champs:**
- `order_reference` (string, requis) - Référence de la commande
- `amount` (number, requis) - Montant à payer
- `payment_phone` (string, requis) - Numéro de téléphone pour le paiement
- `payment_method` (string, requis) - Méthode de paiement
- `otp` (string, optionnel) - Code OTP (requis pour Orange Money)

#### Réponse en Cas de Succès - Wave (200)

```json
{
  "success": true,
  "payment_id": 45,
  "transaction_id": "20250124123456ORD-20250124-ABC12",
  "payment_method": "wave",
  "checkout_url": "https://checkout.wave.com/...",
  "message": "Veuillez compléter le paiement via Wave"
}
```

#### Réponse en Cas de Succès - TouchPoint (200)

```json
{
  "success": true,
  "payment_id": 45,
  "transaction_id": "20250124123456ORD-20250124-ABC12",
  "payment_method": "orange_money",
  "status": "INITIATED",
  "message": "Transaction initiée"
}
```

---

### 4. Vérifier le Statut d'un Paiement

**Endpoint:** `GET /api/payments/status/:order_reference`

**Description:** Vérifie le statut d'un paiement par référence de commande.

**Niveau d'accès:** Public

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": {
    "payment_id": 45,
    "order_reference": "ORD-20250124-ABC12",
    "amount": 1000.00,
    "payment_method": "wave",
    "status": "success",
    "order_status": "completed",
    "created_at": "2025-01-24T16:30:00.000Z",
    "updated_at": "2025-01-24T16:32:00.000Z"
  }
}
```

---

### 5. Créer un Paiement

**Endpoint:** `POST /api/payments`

**Description:** Crée un nouveau paiement pour une commande.

**Niveau d'accès:** Client

#### Données à Envoyer (JSON)

```json
{
  "order_id": 123,
  "amount": 5000.00,
  "payment_method": "wave",
  "payment_phone": "0789062079",
  "payment_reference": "PAY-20250124-ABC123",
  "external_reference": "WAVE-TXN-456789",
  "status": "pending"
}
```

#### Réponse en Cas de Succès (201)

```json
{
  "success": true,
  "message": "Paiement créé avec succès",
  "data": {
    "id": 45,
    "order_id": 123,
    "amount": 5000.00,
    "payment_method": "wave",
    "payment_phone": "0789062079",
    "payment_reference": "PAY-20250124-ABC123",
    "external_reference": "WAVE-TXN-456789",
    "status": "pending",
    "created_at": "2025-01-24T10:30:00.000Z"
  }
}
```

---

### 6. Liste des Paiements avec Filtres

**Endpoint:** `GET /api/payments`

**Description:** Récupère la liste de tous les paiements avec pagination et filtres.

**Niveau d'accès:** Staff / Admin

#### Paramètres de Requête

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | integer | 1 | Numéro de page |
| `limit` | integer | 10 | Éléments par page |
| `status` | string | - | Filtrer par statut |
| `payment_method` | string | - | Filtrer par méthode de paiement |
| `start_date` | date | - | Date de début (ISO 8601) |
| `end_date` | date | - | Date de fin (ISO 8601) |
| `order_id` | integer | - | Filtrer par commande |
| `user_id` | integer | - | Filtrer par utilisateur |

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 45,
      "order_id": 123,
      "amount": 5000.00,
      "payment_method": "wave",
      "payment_phone": "0789062079",
      "payment_reference": "PAY-20250124-ABC123",
      "status": "success",
      "created_at": "2025-01-24T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 156,
    "total_pages": 16,
    "current_page": 1,
    "per_page": 10,
    "has_next_page": true,
    "has_previous_page": false
  }
}
```

---

### 7. Mettre à Jour un Paiement

**Endpoint:** `PUT /api/payments/:id`

**Description:** Met à jour les informations d'un paiement.

**Niveau d'accès:** Admin

#### Données à Envoyer (JSON)

```json
{
  "amount": 5500.00,
  "payment_phone": "0789062080",
  "status": "success"
}
```

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Paiement mis à jour avec succès",
  "data": {
    "id": 45,
    "order_id": 123,
    "amount": 5500.00,
    "payment_phone": "0789062080",
    "status": "success",
    "updated_at": "2025-01-24T11:00:00.000Z"
  }
}
```

---

### 8. Mettre à Jour le Statut d'un Paiement

### 8.1 Mettre à Jour le Statut d'un Paiement
**Endpoint:** `PATCH /api/payments/:id/status`

**Description:** Met à jour uniquement le statut d'un paiement existant.

**Niveau d'accès:** Staff / Admin

#### Données à Envoyer (JSON)
```json
{
  "status": "success",
  "notes": "Paiement confirmé manuellement"
}
```

#### Réponse en Cas de Succès (200)
```json
{
  "success": true,
  "message": "Statut du paiement mis à jour avec succès",
  "data": {
    "id": 45,
    "order_id": 123,
    "amount": 5000.00,
    "payment_method": "wave",
    "status": "success",
    "updated_at": "2025-01-24T11:30:00.000Z"
  }
}
```

---

### 8.2 Rembourser un Paiement
**Endpoint:** `POST /api/payments/:id/refund`

**Description:** Effectue le remboursement d'un paiement réussi.

**Niveau d'accès:** Admin

#### Données à Envoyer (JSON)
```json
{
  "reason": "Commande annulée par le client"
}
```

#### Réponse en Cas de Succès (200)
```json
{
  "success": true,
  "message": "Paiement remboursé avec succès",
  "data": {
    "id": 45,
    "status": "refunded",
    "callback_data": {
      "refund_reason": "Commande annulée par le client",
      "refunded_at": "2025-01-24T12:00:00.000Z"
    }
  }
}
```

---

## 9. Versions d'Application

### 9.1 Obtenir la Version par Plateforme
**Endpoint:** `GET /api/app/version?platform={platform}`

**Description:** Récupère les informations de version pour une plateforme donnée (iOS ou Android).

**Niveau d'accès:** Public

#### Paramètres de Requête
| Paramètre | Type | Valeurs | Description |
|-----------|------|---------|-------------|
| `platform` | string | `ios`, `android` | Plateforme cible |

#### Réponse en Cas de Succès (200)
```json
{
  "success": true,
  "data": {
    "version": "1.1.1",
    "build_number": 8,
    "force_update": false
  },
  "timestamp": "2025-01-24T10:00:00.000Z"
}
```

---

### 9.2 Mettre à Jour les Versions
**Endpoint:** `PUT /api/app/version`

**Description:** Met à jour les versions de l'application pour toutes les plateformes.

**Niveau d'accès:** Admin

#### Données à Envoyer (JSON)
```json
{
  "ios_version": "1.2.0",
  "ios_build_number": 10,
  "android_version": "1.2.0",
  "android_build_number": 10,
  "force_update": true
}
```

#### Réponse en Cas de Succès (200)
```json
{
  "success": true,
  "message": "Versions mises à jour avec succès",
  "data": {
    "ios_version": "1.2.0",
    "ios_build_number": 10,
    "android_version": "1.2.0",
    "android_build_number": 10,
    "force_update": true
  }
}
```

---

### 9.3 Obtenir la Configuration Complète
**Endpoint:** `GET /api/app/version/config`

**Description:** Récupère la configuration complète des versions (toutes plateformes).

**Niveau d'accès:** Admin

#### Réponse en Cas de Succès (200)
```json
{
  "success": true,
  "data": {
    "ios_version": "1.1.1",
    "ios_build_number": 8,
    "android_version": "1.1.1",
    "android_build_number": 8,
    "force_update": false,
    "updated_at": "2025-01-20T10:00:00.000Z",
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## 10. codes-d'erreur

### Codes HTTP Utilisés

| Code | Description | Usage |
|------|-------------|-------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée avec succès |
| 204 | No Content | Suppression réussie (pas de contenu) |
| 400 | Bad Request | Données invalides ou manquantes |
| 401 | Unauthorized | Authentification requise ou token invalide |
| 403 | Forbidden | Accès refusé (permissions insuffisantes) |
| 404 | Not Found | Ressource non trouvée |
| 409 | Conflict | Conflit (ex: doublon) |
| 429 | Too Many Requests | Limite de taux dépassée |
| 500 | Internal Server Error | Erreur serveur |
| 503 | Service Unavailable | Service temporairement indisponible |

### Formats d'Erreur

#### Erreur Simple
```json
{
  "success": false,
  "error": "Message d'erreur principal"
}
```

#### Erreur avec Détails
```json
{
  "success": false,
  "error": "Message d'erreur principal",
  "details": "Description détaillée de l'erreur"
}
```

#### Erreur de Validation (400)
```json
{
  "success": false,
  "error": "Données invalides",
  "details": [
    {
      "field": "phone_number",
      "message": "Le numéro de téléphone est requis"
    }
  ]
}
```

---

## 11. Exemples d'Utilisation

### 11.1 Workflow Complet: Commande et Paiement

#### Étape 1: Authentification
```bash
POST /api/auth/login
Content-Type: application/json

{
  "phoneNumber": "0701020304"
}
```

**Réponse:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "phone_number": "0701020304",
    "role": "client"
  }
}
```

#### Étape 2: Récupérer les Plans Disponibles
```bash
GET /api/plans/phone/0701020304
```

**Réponse:**
```json
{
  "success": true,
  "operator": {
    "id": 1,
    "name": "Orange CI",
    "code": "ORANGE"
  },
  "plans": [
    {
      "id": 1,
      "name": "Recharge 1000 FCFA",
      "price": 1000.00,
      "type": "credit"
    }
  ]
}
```

#### Étape 3: Créer une Commande
```bash
POST /api/orders
Authorization: Bearer {token}
Content-Type: application/json

{
  "plan_id": 1,
  "amount": 1000.00
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "id": 125,
    "order_reference": "ORD-20250124-ABC12",
    "amount": 1000.00,
    "status": "pending"
  }
}
```

#### Étape 4: Initialiser le Paiement
```bash
POST /api/payments/initialize
Content-Type: application/json

{
  "order_reference": "ORD-20250124-ABC12",
  "amount": 1000.00,
  "payment_phone": "0701020304",
  "payment_method": "wave"
}
```

**Réponse:**
```json
{
  "success": true,
  "payment_id": 45,
  "transaction_id": "20250124123456ORD-20250124-ABC12",
  "checkout_url": "https://checkout.wave.com/...",
  "message": "Veuillez compléter le paiement via Wave"
}
```

#### Étape 5: Vérifier le Statut du Paiement
```bash
GET /api/payments/status/ORD-20250124-ABC12
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "order_reference": "ORD-20250124-ABC12",
    "payment_status": "success",
    "order_status": "completed"
  }
}
```

---

## 12. Bonnes Pratiques

### 12.1 Sécurité

1. **Toujours utiliser HTTPS** en production
2. **Stocker les tokens JWT de manière sécurisée** (jamais en localStorage pour les données sensibles)
3. **Implémenter le refresh token** pour éviter de demander trop souvent les identifiants
4. **Valider toutes les entrées** côté client ET serveur
5. **Ne jamais exposer les clés secrètes** dans le code client

### 12.2 Gestion des Erreurs

1. **Toujours vérifier le code de statut HTTP**
2. **Afficher des messages d'erreur clairs** à l'utilisateur
3. **Logger les erreurs** pour le debugging
4. **Implémenter des retry** pour les erreurs temporaires (503, timeout)

### 12.3 Performance

1. **Mettre en cache les données statiques** (opérateurs, plans)
2. **Utiliser la pagination** pour les listes longues
3. **Limiter le nombre de requêtes** simultanées
4. **Implémenter un indicateur de chargement** pour les requêtes longues

---

## 13. Webhooks

### 13.1 Webhook Wave
**Endpoint:** `POST /api/payments/webhook/wave`

**Description:** Reçoit les notifications de paiement de Wave.

**Headers requis:**
- `wave-signature`: Signature HMAC pour vérifier l'authenticité

**Format des données:**
```json
{
  "type": "payment.successful",
  "data": {
    "transaction_id": "20250124123456ORD-20250124-ABC12",
    "payment_status": "succeeded",
    "amount": 1000.00,
    "currency": "XOF",
    "when_completed": "2025-01-24T12:00:00.000Z"
  }
}
```

---

### 13.2 Webhook TouchPoint
**Endpoint:** `POST /api/payments/webhook/touchpoint`

**Description:** Reçoit les notifications de paiement de TouchPoint (MTN, Orange Money, Moov).

**Format des données:**
```json
{
  "partner_transaction_id": "20250124123456ORD-20250124-ABC12",
  "status": "SUCCESSFUL",
  "amount": 1000.00,
  "customer_number": "0701020304"
}
```

---

## 14. Variables d'Environnement

### Configuration Requise

```env
# Base de données
DB_HOST=kbine-mysql
DB_PORT=3306
DB_USER=kbine_user
DB_PASSWORD=kbine_secure_password
DB_NAME=kbine_db

# JWT
JWT_SECRET=votre_secret_jwt_tres_securise
JWT_REFRESH_SECRET=votre_secret_refresh_jwt
JWT_ACCESS_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Serveur
PORT=3000
NODE_ENV=production

# Wave
WAVE_API_URL=https://api.wave.com
WAVE_API_TOKEN=votre_token_wave
WAVE_WEBHOOK_SECRET=votre_secret_webhook_wave

# TouchPoint
TOUCHPOINT_API_URL=https://api.touchpoint.com
TOUCHPOINT_USERNAME=votre_username
TOUCHPOINT_PASSWORD=votre_password
TOUCHPOINT_AGENCY_CODE=votre_code_agence
TOUCHPOINT_LOGIN_AGENT=votre_login_agent
TOUCHPOINT_PASSWORD_AGENT=votre_password_agent

# Application
APP_URL=https://votre-domaine.com
LOG_LEVEL=info
```

---

## 15. Tests

### Exemple de Test avec cURL

#### Test de Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "0701020304"}'
```

#### Test de Récupération des Plans
```bash
curl -X GET http://localhost:3000/api/plans/phone/0701020304
```

#### Test de Création de Commande
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {votre_token}" \
  -d '{"plan_id": 1, "amount": 1000.00}'
```

---

## 16. Support et Contact

### Ressources Disponibles

- **Documentation API:** Consulter ce document
- **Logs:** Vérifier les fichiers `logs/error.log` et `logs/combined.log`
- **Base de données:** Utiliser les requêtes SQL directement si nécessaire

### Résolution de Problèmes Courants

| Problème | Cause Possible | Solution |
|----------|----------------|----------|
| Token invalide (401) | Token expiré ou malformé | Réauthentifier l'utilisateur |
| Opérateur non trouvé | Préfixe invalide | Vérifier les préfixes en base |
| Paiement échoué | Problème avec le provider | Vérifier les logs et les credentials |
| Commande non créée | Données manquantes | Valider les champs requis |

---

## 17. Changelog

### Version 1.1.1 (Actuelle)
- ✅ Ajout de la gestion des paiements Wave et TouchPoint
- ✅ Implémentation des webhooks
- ✅ Amélioration de la gestion des erreurs
- ✅ Ajout de la gestion des versions d'application

### Version 1.0.0
- 🎉 Version initiale
- ✅ Authentification JWT
- ✅ Gestion des utilisateurs
- ✅ Gestion des opérateurs et plans
- ✅ Système de commandes

---

## 18. Licence et Mentions Légales

**Kbine Backend API - Version 1.1.1**

© 2025 Kbine. Tous droits réservés.

Cette documentation est fournie à titre informatif. Les endpoints et formats peuvent évoluer.