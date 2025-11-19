# Documentation Complète de l'API Kbine Backend

## ✅ Mise à Jour Importante - Version TouchPoint Améliorée

**Date:** Janvier 2025

**Changement Principal:** Tous les paiements passent maintenant par **TouchPoint** (Wave, MTN Money, Orange Money, Moov Money) avec support complet des URLs de callback pour Wave.

### Résumé des Changements

- ✅ **Wave** passe maintenant par TouchPoint (plus de webhook Wave direct)
- ✅ **Support des URLs de callback** pour Wave: `return_url`, `cancel_url`, `error_url`
- ✅ **MTN Money**, **Orange Money**, **Moov Money** via TouchPoint
- ✅ **Webhook unifié** pour tous les paiements: `POST /api/payments/webhook/touchpoint`
- ✅ **Initialisation simplifiée** via `POST /api/payments/initialize`
- ✅ **Flux complet de paiement** documenté avec diagramme
- ✅ **callback_data enrichi** avec toutes les données TouchPoint et webhook
- ✅ **Validations Joi** complètes pour tous les paramètres
- ✅ **Gestion d'erreurs** détaillée et cohérente
- ✅ **Idempotence** du webhook (pas de doublon en cas de renvoi)

### Améliorations Techniques

#### 1. **Enrichissement du callback_data**
Le champ `callback_data` inclut maintenant:
- Toutes les données de `paymentResult` via spread operator
- Réponse complète de TouchPoint
- Données du webhook
- URLs de callback (Wave)
- Timestamps d'initialisation et de réception du webhook

#### 2. **Validation Robuste**
- Validation Joi pour tous les champs
- Validation conditionnelle (OTP obligatoire pour Orange Money)
- Validation URI pour les URLs de callback
- Validation du format de la référence de commande

#### 3. **Gestion des Erreurs Améliorée**
- Messages d'erreur détaillés et localisés
- Codes d'erreur HTTP appropriés
- Gestion des erreurs TouchPoint avec contexte
- Logging complet pour le débogage

#### 4. **Sécurité et Idempotence**
- Vérification que la commande n'est pas déjà payée
- Vérification que le montant correspond
- Idempotence du webhook (pas de modification si déjà `success`)
- Préservation des données existantes lors des mises à jour

### Endpoints Clés

- `POST /api/payments/initialize` - Initialiser un paiement (tous les types)
- `POST /api/payments/webhook/touchpoint` - Webhook pour toutes les notifications
- `GET /api/payments/status/:order_reference` - Vérifier le statut

---

## Table des Matières

1. [Informations Générales](#informations-générales)
2. [Authentification](#authentification)
3. [Utilisateurs](#utilisateurs)
4. [Opérateurs](#opérateurs)
5. [Plans / Forfaits](#plans--forfaits)
6. [Commandes](#commandes)
   - 6.1 [Vérifier le Statut de Paiement](#7-vérifier-le-statut-de-paiement-dune-commande)
7. [Paiements](#paiements)
8. [Versions d'Application](#10-versions-dapplication)
9. [Codes d'Erreur](#11-codes-derreur)
10. [Exemples d'Utilisation](#12-exemples-dutilisation)
11. [Bonnes Pratiques](#13-bonnes-pratiques)
12. [Structure du callback_data](#15-structure-du-callback_data)
13. [Variables d'Environnement](#14-variables-denvironnement)

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

### 7. Vérifier le Statut de Paiement d'une Commande

**Endpoint:** `GET /api/orders/:id/payment-status`

**Description:** Récupère le statut de paiement complet d'une commande avec TOUS les détails du paiement, du plan et les statuts booléens.

**Niveau d'accès:** Public

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": {
    "order": {
      "id": 45,
      "reference": "ORD-20250124-ABC12",
      "phone_number": "0701020304",
      "amount": 1000.00,
      "status": "completed",
      "created_at": "2025-01-24T16:30:00.000Z",
      "updated_at": "2025-01-24T16:32:00.000Z"
    },
    "plan": {
      "id": 5,
      "name": "Plan Orange 1000 FCFA",
      "price": 1000.00,
      "operator_id": 1
    },
    "payment": {
      "id": 45,
      "method": "wave",
      "phone": "0701020304",
      "reference": "PAY-20250124-ABC12",
      "external_reference": "20250124123456ORD-20250124-ABC12",
      "amount": 1000.00,
      "status": "success",
      "callback_data": {
        "initiated_at": "2025-01-24T16:30:00.000Z",
        "touchpoint_status": "SUCCESSFUL",
        "touchpoint_response": {
          "fees": 2,
          "amount": 1000,
          "status": "SUCCESSFUL",
          "numTransaction": "WAVE250124.1630.ABC12"
        },
        "webhook_data": {
          "status": "SUCCESSFUL",
          "service_id": "CI_PAIEMENTWAVE_TP"
        },
        "webhook_received_at": "2025-01-24T16:30:02.000Z",
        "touchpoint_transaction_id": "20250124123456ORD-20250124-ABC12"
      },
      "created_at": "2025-01-24T16:30:00.000Z",
      "updated_at": "2025-01-24T16:30:02.000Z"
    },
    "status_flags": {
      "is_paid": true,
      "is_pending": false,
      "is_failed": false,
      "is_refunded": false,
      "has_payment": true
    },
    "summary": {
      "status": "PAYÉ",
      "payment_method": "wave",
      "amount": 1000.00,
      "payment_amount": 1000.00
    }
  }
}
```

**Champs de réponse:**

**order:**
- `id` (integer) - ID de la commande
- `reference` (string) - Référence de la commande
- `phone_number` (string) - Numéro de téléphone
- `amount` (number) - Montant de la commande
- `status` (string) - Statut de la commande
- `created_at` (datetime) - Date de création
- `updated_at` (datetime) - Date de mise à jour

**plan:** (null si pas de plan)
- `id` (integer) - ID du plan
- `name` (string) - Nom du plan
- `price` (number) - Prix du plan
- `operator_id` (integer) - ID de l'opérateur

**payment:** (null si pas de paiement)
- `id` (integer) - ID du paiement
- `method` (string) - Méthode de paiement
- `phone` (string) - Numéro de téléphone utilisé
- `reference` (string) - Référence du paiement
- `external_reference` (string) - Référence externe TouchPoint
- `amount` (number) - Montant du paiement
- `status` (string) - Statut du paiement
- `callback_data` (object) - **Données complètes du webhook et TouchPoint**
- `created_at` (datetime) - Date de création
- `updated_at` (datetime) - Date de mise à jour

**status_flags:** (Booléens pour faciliter le traitement)
- `is_paid` (boolean) - Paiement réussi
- `is_pending` (boolean) - Paiement en attente
- `is_failed` (boolean) - Paiement échoué
- `is_refunded` (boolean) - Paiement remboursé
- `has_payment` (boolean) - Paiement existe

**summary:** (Résumé lisible)
- `status` (string) - Statut lisible: "PAYÉ", "ÉCHOUÉ", "EN ATTENTE", "REMBOURSÉ", "AUCUN PAIEMENT"
- `payment_method` (string) - Méthode de paiement
- `amount` (number) - Montant de la commande
- `payment_amount` (number) - Montant du paiement (null si pas de paiement)

#### Réponses d'Erreur

**404 - Commande Non Trouvée**
```json
{
  "success": false,
  "error": "Commande non trouvée"
}
```

**500 - Erreur Serveur**
```json
{
  "success": false,
  "error": "Erreur lors de la récupération du statut de paiement: [message]"
}
```

#### Cas d'Utilisation

**1. Vérifier si une commande est payée**
```javascript
const response = await fetch('/api/orders/45/payment-status');
const data = await response.json();

if (data.data.status_flags.is_paid) {
    console.log('Paiement réussi!');
    console.log(`Montant: ${data.data.payment.amount}`);
}
```

**2. Afficher le statut lisible**
```javascript
const status = data.data.summary.status; // "PAYÉ", "EN ATTENTE", etc.
const method = data.data.summary.payment_method; // "wave", "orange_money", etc.
console.log(`Statut: ${status} via ${method}`);
```

**3. Accéder aux données du webhook**
```javascript
const callbackData = data.data.payment.callback_data;
console.log(`Transaction TouchPoint: ${callbackData.touchpoint_transaction_id}`);
console.log(`Statut TouchPoint: ${callbackData.touchpoint_status}`);
console.log(`Frais: ${callbackData.touchpoint_response.fees}`);
```

---

## Paiements

### 1. Méthodes de Paiement Disponibles

**Endpoint:** `GET /api/payments/methods`

**Description:** Récupère la liste des méthodes de paiement disponibles. ✅ **TOUS LES PAIEMENTS PASSENT PAR TOUCHPOINT**

**Niveau d'accès:** Public

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": ["wave", "orange_money", "mtn_money", "moov_money"],
  "message": "Tous les paiements passent par TouchPoint"
}
```

**Méthodes supportées:**
- `wave` - Wave Money (via TouchPoint)
- `orange_money` - Orange Money (via TouchPoint)
- `mtn_money` - MTN Money (via TouchPoint)
- `moov_money` - Moov Money (via TouchPoint)

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

**Description:** Initialise un paiement via TouchPoint pour tous les paiements (Wave, MTN Money, Orange Money, Moov Money). ✅ **TOUS LES PAIEMENTS PASSENT PAR TOUCHPOINT**

**Niveau d'accès:** Public

#### Données à Envoyer (JSON)

```json
{
  "order_reference": "ORD-20250124-ABC12",
  "amount": 1000.00,
  "payment_phone": "0701020304",
  "payment_method": "wave",
  "otp": "1234",
  "return_url": "https://app.example.com/payment/success",
  "cancel_url": "https://app.example.com/payment/cancel",
  "error_url": "https://app.example.com/payment/error"
}
```

**Champs:**
- `order_reference` (string, requis) - Référence de la commande (format: ORD-YYYYMMDD-XXXXX)
- `amount` (number, requis) - Montant à payer (positif, max 2 décimales)
- `payment_phone` (string, requis) - Numéro de téléphone pour le paiement (format ivoirien: 10 chiffres commençant par 0)
- `payment_method` (string, requis) - Méthode de paiement: `wave`, `orange_money`, `mtn_money`, `moov_money`
- `otp` (string, optionnel) - Code OTP à 4 chiffres (obligatoire pour `orange_money`, optionnel pour les autres)
- `return_url` (string, optionnel) - URL de retour après paiement réussi (Wave uniquement)
- `cancel_url` (string, optionnel) - URL en cas d'annulation (Wave uniquement)
- `error_url` (string, optionnel) - URL en cas d'erreur (Wave uniquement)

#### Validations

- **order_reference**: Doit correspondre à une commande existante et non payée
- **amount**: Doit correspondre exactement au montant de la commande
- **payment_phone**: Format ivoirien valide (0XXXXXXXXX)
- **payment_method**: Doit être l'une des 4 méthodes supportées
- **otp**: Requis pour Orange Money, ignoré pour les autres méthodes
- **URLs**: Doivent être des URLs valides (format URI)

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "payment_id": 45,
  "transaction_id": "20250124123456ORD-20250124-ABC12",
  "payment_method": "wave",
  "status": "INITIATED",
  "message": "Transaction initiée avec succès",
  "return_url": "https://app.example.com/payment/success",
  "cancel_url": "https://app.example.com/payment/cancel",
  "fees": 2
}
```

**Champs de réponse:**
- `payment_id` (integer) - ID du paiement créé en base de données
- `transaction_id` (string) - ID unique de la transaction (timestamp + order_reference)
- `payment_method` (string) - Méthode de paiement utilisée
- `status` (string) - Statut initial de la transaction (généralement "INITIATED" ou "PENDING")
- `message` (string) - Message descriptif
- `return_url` (string, optionnel) - URL de retour pour Wave
- `cancel_url` (string, optionnel) - URL d'annulation pour Wave
- `fees` (number, optionnel) - Frais de transaction (si applicables)

**Note:** Pour Wave via TouchPoint, l'utilisateur reçoit une notification USSD. Les URLs de callback sont stockées pour redirection après paiement.

#### Réponses d'Erreur

**400 - Données Invalides**
```json
{
  "success": false,
  "error": "Données de paiement invalides",
  "details": [
    "La référence de commande doit être au format ORD-YYYYMMDD-XXXXX",
    "Le numéro de téléphone doit être un numéro ivoirien valide (10 chiffres commençant par 0)"
  ]
}
```

**404 - Commande Non Trouvée**
```json
{
  "success": false,
  "error": "Commande non trouvée"
}
```

**409 - Commande Déjà Payée**
```json
{
  "success": false,
  "error": "Cette commande a déjà été payée"
}
```

**400 - Montant Incorrect**
```json
{
  "success": false,
  "error": "Le montant ne correspond pas à la commande"
}
```

**400 - OTP Manquant (Orange Money)**
```json
{
  "success": false,
  "error": "L'OTP est obligatoire pour les paiements Orange Money"
}
```

**500 - Erreur TouchPoint**
```json
{
  "success": false,
  "error": "Erreur lors de l'initialisation du paiement",
  "details": "Erreur TouchPoint: [message d'erreur détaillé]"
}
```

---

### 4. Webhook TouchPoint - Notification de Paiement

**Endpoint:** `POST /api/payments/webhook/touchpoint`

**Description:** Webhook public pour recevoir les notifications de paiement de TouchPoint. Traite les paiements pour Wave, MTN Money, Orange Money et Moov Money.

**Niveau d'accès:** Public (Webhook)

**Authentification:** Aucune (endpoint public pour les webhooks)

#### Données Reçues du Webhook (JSON)

```json
{
  "partner_transaction_id": "20250124123456ORD-20250124-ABC12",
  "idFromClient": "20250124123456ORD-20250124-ABC12",
  "status": "SUCCESSFUL",
  "amount": 1000.00,
  "recipientNumber": "0701020304",
  "serviceCode": "WAVE",
  "timestamp": "2025-01-24T16:32:00.000Z"
}
```

**Champs du webhook:**
- `partner_transaction_id` ou `idFromClient` (string) - ID unique de la transaction (généré lors de l'initialisation)
- `status` (string) - Statut de la transaction: `SUCCESSFUL`, `INITIATED`, `PENDING`, `FAILED`, `TIMEOUT`, `CANCELLED`, `REFUSED`
- `amount` (number) - Montant de la transaction
- `recipientNumber` (string) - Numéro de téléphone du destinataire
- `serviceCode` (string) - Code du service: `WAVE`, `ORANGE_MONEY`, `MTN_MONEY`, `MOOV_MONEY`

#### Traitement du Webhook

Le webhook effectue les actions suivantes:

1. **Récupère le paiement** via `external_reference` (transaction_id)
2. **Mappe le statut** TouchPoint vers le statut interne:
   - `SUCCESSFUL` → `success`
   - `INITIATED`, `PENDING` → `pending`
   - `FAILED`, `TIMEOUT`, `CANCELLED`, `REFUSED` → `failed`
3. **Met à jour le paiement** en base de données avec le nouveau statut
4. **Met à jour la commande** associée:
   - Si statut = `success`: met à jour la commande à `completed`
5. **Stocke les données** du webhook dans `callback_data` pour audit

#### Réponse Attendue (200)

```json
{
  "success": true,
  "message": "Webhook traité avec succès"
}
```

#### Cas d'Erreur

**400 - Données Manquantes**
```json
{
  "success": false,
  "error": "ID de transaction manquant dans le webhook"
}
```

**404 - Paiement Non Trouvé**
```json
{
  "success": false,
  "error": "Paiement non trouvé"
}
```

#### Flux Complet de Paiement

```
1. Client appelle POST /api/payments/initialize
   ↓
2. Paiement créé en base (status: pending)
   ↓
3. Requête envoyée à TouchPoint
   ↓
4. TouchPoint retourne INITIATED
   ↓
5. Utilisateur complète le paiement (USSD, app, etc.)
   ↓
6. TouchPoint envoie webhook avec statut final
   ↓
7. Webhook met à jour paiement et commande
   ↓
8. Client peut vérifier le statut via GET /api/payments/status/:order_reference
```

---

### 5. Vérifier le Statut d'un Paiement

**Endpoint:** `GET /api/payments/status/:order_reference`

**Description:** Vérifie le statut d'un paiement par référence de commande.

**Niveau d'accès:** Public

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": {
    "status": "success",
    "payments": [
      {
        "id": 45,
        "amount": 1000.00,
        "payment_method": "wave",
        "payment_phone": "0701020304",
        "payment_reference": "PAY-20250124-ABC12",
        "external_reference": "20250124123456ORD-20250124-ABC12",
        "status": "success",
        "callback_data": {
          "initiated_at": "2025-01-24T16:30:00.000Z",
          "touchpoint_status": "SUCCESSFUL",
          "touchpoint_response": {
            "fees": 2,
            "amount": 1000,
            "status": "SUCCESSFUL",
            "dateTime": 1737723000000,
            "idFromGU": "1737723000000",
            "serviceCode": "CI_PAIEMENTWAVE_TP",
            "idFromClient": "20250124123456ORD-20250124-ABC12",
            "numTransaction": "WAVE250124.1630.ABC12",
            "recipientNumber": "0701020304"
          },
          "webhook_data": {
            "status": "SUCCESSFUL",
            "service_id": "CI_PAIEMENTWAVE_TP",
            "call_back_url": "https://www.kbine-mobile.com/api/payments/webhook/touchpoint",
            "gu_transaction_id": "1737723000000",
            "partner_transaction_id": "20250124123456ORD-20250124-ABC12"
          },
          "webhook_received_at": "2025-01-24T16:30:02.000Z",
          "touchpoint_transaction_id": "20250124123456ORD-20250124-ABC12"
        },
        "created_at": "2025-01-24T16:30:00.000Z",
        "updated_at": "2025-01-24T16:30:02.000Z"
      }
    ]
  }
}
```

**Champs de réponse:**
 - `status` (string) - Statut du paiement: `pending`, `success`, `failed`, `refunded`
 - `payments` (array) - Tableau contenant TOUS les détails du paiement:
   - `id` (integer) - ID du paiement
   - `amount` (number) - Montant du paiement
   - `payment_method` (string) - Méthode utilisée
   - `payment_phone` (string) - Numéro de téléphone
   - `payment_reference` (string) - Référence du paiement
   - `external_reference` (string) - Référence externe TouchPoint
   - `status` (string) - Statut du paiement
   - `callback_data` (object) - **Données complètes du webhook et de TouchPoint** (voir section "Structure du callback_data")
   - `created_at` (datetime) - Date de création
   - `updated_at` (datetime) - Date de dernière mise à jour


#### Réponses d'Erreur

**404 - Aucun Paiement Trouvé**
```json
{
  "success": false,
  "error": "Aucun paiement trouvé pour cette commande"
}
```

---

### 6. Créer un Paiement

**Endpoint:** `POST /api/payments`

**Description:** Crée un nouveau paiement pour une commande (route protégée pour les clients).

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

**Champs:**
- `order_id` (integer, requis) - ID de la commande
- `amount` (number, requis) - Montant du paiement
- `payment_method` (string, requis) - Méthode de paiement
- `payment_phone` (string, optionnel) - Numéro de téléphone
- `payment_reference` (string, requis) - Référence unique du paiement
- `external_reference` (string, optionnel) - Référence externe (ex: ID TouchPoint)
- `status` (string, optionnel) - Statut initial (défaut: `pending`)

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

### 7. Liste des Paiements avec Filtres

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

### 8. Mettre à Jour un Paiement

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

### 9. Mettre à Jour le Statut d'un Paiement

### 9.1 Mettre à Jour le Statut d'un Paiement
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

### 9.2 Rembourser un Paiement
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

## 10. Versions d'Application

### 10.1 Obtenir la Version par Plateforme
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

### 10.2 Mettre à Jour les Versions
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

### 10.3 Obtenir la Configuration Complète
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

## 11. Codes d'Erreur

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

## 12. Exemples d'Utilisation

### 12.1 Workflow Complet: Commande et Paiement

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

## 13. Bonnes Pratiques

### 13.1 Sécurité

1. **Toujours utiliser HTTPS** en production
2. **Stocker les tokens JWT de manière sécurisée** (jamais en localStorage pour les données sensibles)
3. **Implémenter le refresh token** pour éviter de demander trop souvent les identifiants
4. **Valider toutes les entrées** côté client ET serveur
5. **Ne jamais exposer les clés secrètes** dans le code client

### 13.2 Gestion des Erreurs

1. **Toujours vérifier le code de statut HTTP**
2. **Afficher des messages d'erreur clairs** à l'utilisateur
3. **Logger les erreurs** pour le debugging
4. **Implémenter des retry** pour les erreurs temporaires (503, timeout)

### 13.3 Performance

1. **Mettre en cache les données statiques** (opérateurs, plans)
2. **Utiliser la pagination** pour les listes longues
3. **Limiter le nombre de requêtes** simultanées
4. **Implémenter un indicateur de chargement** pour les requêtes longues

---

## 15. Structure du callback_data

### Vue d'Ensemble

Le champ `callback_data` est un objet JSON qui stocke toutes les informations détaillées du paiement, notamment les réponses de TouchPoint et les données des webhooks. Il permet un audit complet et le debugging des transactions.

### Structure Générale

```json
{
  "initiated_at": "2025-11-18T14:38:39.741Z",
  "touchpoint_status": "SUCCESSFUL",
  "touchpoint_response": { /* Réponse complète de TouchPoint */ },
  "touchpoint_transaction_id": "20251118143839ORD-20251117-70954",
  "webhook_data": { /* Données du webhook reçu */ },
  "webhook_received_at": "2025-11-18T14:38:41.827Z"
}
```

### Champs Principaux

#### 1. **initiated_at** (datetime)
- **Type:** ISO 8601 datetime string
- **Description:** Date et heure exactes de l'initialisation du paiement
- **Exemple:** `"2025-11-18T14:38:39.741Z"`
- **Utilité:** Tracer le moment du démarrage de la transaction

#### 2. **touchpoint_status** (string)
- **Type:** String (enum)
- **Valeurs possibles:** `INITIATED`, `SUCCESSFUL`, `FAILED`, `PENDING`, `TIMEOUT`, `CANCELLED`, `REFUSED`
- **Description:** Statut retourné par TouchPoint lors de l'initialisation
- **Exemple:** `"SUCCESSFUL"` ou `"INITIATED"`
- **Utilité:** Connaître le statut initial avant le webhook

#### 3. **touchpoint_response** (object)
- **Type:** Object
- **Description:** Réponse complète retournée par l'API TouchPoint lors de l'initialisation
- **Contient:**
  - `status` - Statut de la transaction
  - `amount` - Montant de la transaction
  - `fees` - Frais appliqués
  - `serviceCode` - Code du service (PAIEMENTMARCHANDOMPAYCIDIRECT, PAIEMENTMARCHAND_MTN_CI, etc.)
  - `idFromClient` - ID envoyé par le client (transaction_id)
  - `idFromGU` - ID généré par TouchPoint
  - `numTransaction` - Numéro de transaction formaté
  - `recipientNumber` - Numéro de téléphone du destinataire
  - `dateTime` - Timestamp de la transaction

**Exemple complet:**
```json
{
  "fees": 2,
  "amount": 100,
  "status": "SUCCESSFUL",
  "dateTime": 1763386115698,
  "idFromGU": "1763386115698",
  "serviceCode": "PAIEMENTMARCHANDOMPAYCIDIRECT",
  "idFromClient": "20251117132835ORD-20251113-77283",
  "numTransaction": "MP251117.1328.A58986",
  "recipientNumber": "0749793994"
}
```

#### 4. **touchpoint_transaction_id** (string)
- **Type:** String
- **Description:** ID unique de la transaction dans TouchPoint (généralement identique à `external_reference`)
- **Exemple:** `"20251117132835ORD-20251113-77283"`
- **Utilité:** Référencer la transaction dans TouchPoint

#### 5. **webhook_data** (object)
- **Type:** Object
- **Description:** Données complètes reçues du webhook TouchPoint
- **Contient:**
  - `status` - Statut final de la transaction
  - `message` - Message descriptif (erreur ou succès)
  - `service_id` - ID du service
  - `call_back_url` - URL de callback utilisée
  - `gu_transaction_id` - ID de transaction TouchPoint
  - `partner_transaction_id` - ID du partenaire (notre transaction_id)

**Exemple pour paiement réussi:**
```json
{
  "status": "SUCCESSFUL",
  "service_id": "PAIEMENTMARCHANDOMPAYCIDIRECT",
  "call_back_url": "https://www.kbine-mobile.com/api/payments/webhook/touchpoint",
  "gu_transaction_id": "1763386115698",
  "partner_transaction_id": "20251117132835ORD-20251113-77283"
}
```

**Exemple pour paiement échoué:**
```json
{
  "status": "FAILED",
  "message": "[22] Invalid transaction. Please try again.",
  "commission": 0,
  "service_id": "CI_PAIEMENTWAVE_TP",
  "call_back_url": "https://www.kbine-mobile.com/api/payments/webhook/touchpoint",
  "gu_transaction_id": "1763476720407",
  "partner_transaction_id": "20251118143839ORD-20251117-70954"
}
```

#### 6. **webhook_received_at** (datetime)
- **Type:** ISO 8601 datetime string
- **Description:** Date et heure de réception du webhook
- **Exemple:** `"2025-11-18T14:38:41.827Z"`
- **Utilité:** Tracer le délai entre initialisation et notification

#### 7. **deleted** (boolean) - *Optionnel*
- **Type:** Boolean
- **Description:** Indique si le paiement a été supprimé (soft delete)
- **Valeur:** `true` si supprimé
- **Utilité:** Identifier les paiements annulés

#### 8. **deleted_at** (datetime) - *Optionnel*
- **Type:** ISO 8601 datetime string
- **Description:** Date et heure de la suppression
- **Exemple:** `"2025-11-17T13:42:06.456Z"`
- **Utilité:** Tracer quand le paiement a été annulé

#### 9. **notes** (string) - *Optionnel*
- **Type:** String
- **Description:** Notes ajoutées lors de la suppression ou mise à jour
- **Exemple:** `"Paiement annulé/supprimé le 2025-11-17T13:42:06.456Z"`
- **Utilité:** Audit et traçabilité

### Cas d'Utilisation Réels

#### Cas 1: Paiement Réussi avec Webhook
```json
{
  "initiated_at": "2025-11-17T13:28:37.854Z",
  "webhook_data": {
    "status": "SUCCESSFUL",
    "service_id": "PAIEMENTMARCHANDOMPAYCIDIRECT",
    "call_back_url": "https://www.kbine-mobile.com/api/payments/webhook/touchpoint",
    "gu_transaction_id": "1763386115698",
    "partner_transaction_id": "20251117132835ORD-20251113-77283"
  },
  "touchpoint_status": "SUCCESSFUL",
  "touchpoint_response": {
    "fees": 2,
    "amount": 100,
    "status": "SUCCESSFUL",
    "dateTime": 1763386115698,
    "idFromGU": "1763386115698",
    "serviceCode": "PAIEMENTMARCHANDOMPAYCIDIRECT",
    "idFromClient": "20251117132835ORD-20251113-77283",
    "numTransaction": "MP251117.1328.A58986",
    "recipientNumber": "0749793994"
  },
  "webhook_received_at": "2025-11-17T13:28:38.222Z",
  "touchpoint_transaction_id": "20251117132835ORD-20251113-77283"
}
```

**Interprétation:**
- ✅ Paiement initialisé à 13:28:37
- ✅ TouchPoint a retourné SUCCESSFUL
- ✅ Webhook reçu à 13:28:38 (1 seconde plus tard)
- ✅ Montant: 100 FCFA avec 2 FCFA de frais
- ✅ Numéro de transaction: MP251117.1328.A58986

#### Cas 2: Paiement Échoué
```json
{
  "initiated_at": "2025-11-18T14:38:39.741Z",
  "webhook_data": {
    "status": "FAILED",
    "message": "[22] Invalid transaction. Please try again.",
    "commission": 0,
    "service_id": "CI_PAIEMENTWAVE_TP",
    "call_back_url": "https://www.kbine-mobile.com/api/payments/webhook/touchpoint",
    "gu_transaction_id": "1763476720407",
    "partner_transaction_id": "20251118143839ORD-20251117-70954"
  },
  "touchpoint_status": "FAILED",
  "webhook_received_at": "2025-11-18T14:38:41.827Z"
}
```

**Interprétation:**
- ❌ Paiement échoué
- ❌ Erreur: "[22] Invalid transaction. Please try again."
- ❌ Aucuns frais appliqués (commission: 0)
- ⏱️ Webhook reçu 2 secondes après initialisation

#### Cas 3: Paiement En Attente (Pas de Webhook)
```json
{
  "initiated_at": "2025-11-17T12:49:08.292Z",
  "touchpoint_status": "INITIATED",
  "touchpoint_response": {
    "fees": 2,
    "amount": 100,
    "status": "INITIATED",
    "dateTime": 1763383746775,
    "idFromGU": "1763383746775",
    "serviceCode": "PAIEMENTMARCHAND_MTN_CI",
    "idFromClient": "20251117124906ORD-20251113-77283",
    "numTransaction": "1763383746775",
    "recipientNumber": "0566955943"
  },
  "touchpoint_transaction_id": "20251117124906ORD-20251113-77283"
}
```

**Interprétation:**
- ⏳ Paiement en attente (INITIATED)
- ⏳ Aucun webhook reçu encore
- 📱 Utilisateur doit compléter le paiement via USSD/App
- 🔄 Statut peut changer quand le webhook arrive

#### Cas 4: Paiement Supprimé (Soft Delete)
```json
{
  "notes": "\nPaiement annulé/supprimé le 2025-11-17T13:42:06.456Z",
  "deleted": true,
  "deleted_at": "2025-11-17T13:42:06.456Z",
  "initiated_at": "2025-11-17T12:00:35.837Z",
  "touchpoint_status": "SUCCESSFUL",
  "touchpoint_response": {
    "fees": 2,
    "amount": 100,
    "status": "SUCCESSFUL",
    "dateTime": 1763380833411,
    "idFromGU": "1763380833411",
    "serviceCode": "PAIEMENTMARCHANDOMPAYCIDIRECT",
    "idFromClient": "20251117120032ORD-20251113-77283",
    "numTransaction": "MP251117.1200.D16237",
    "recipientNumber": "0749793994"
  },
  "touchpoint_transaction_id": "20251117120032ORD-20251113-77283"
}
```

**Interprétation:**
- 🗑️ Paiement supprimé (soft delete)
- 📝 Raison: "Paiement annulé/supprimé le 2025-11-17T13:42:06.456Z"
- ⚠️ Statut du paiement: `failed` (marqué comme échoué)
- 📊 Les données originales sont conservées pour audit

### Codes d'Erreur TouchPoint

| Code | Message | Cause |
|------|---------|-------|
| [22] | Invalid transaction. Please try again. | Transaction invalide ou numéro incorrect |
| [1] | Insufficient funds | Solde insuffisant |
| [2] | Transaction timeout | Timeout de la transaction |
| [3] | Invalid phone number | Numéro de téléphone invalide |
| [4] | Service not available | Service indisponible |

### Utilisation du callback_data

#### Pour le Debugging
```javascript
// Vérifier le message d'erreur exact
const errorMessage = payment.callback_data.webhook_data?.message;
console.log('Erreur:', errorMessage);
```

#### Pour l'Audit
```javascript
// Tracer le flux complet
const timeline = {
  initiated: payment.callback_data.initiated_at,
  webhook_received: payment.callback_data.webhook_received_at,
  duration_ms: new Date(payment.callback_data.webhook_received_at) - 
               new Date(payment.callback_data.initiated_at)
};
```

#### Pour la Réconciliation
```javascript
// Vérifier les montants et frais
const amount = payment.callback_data.touchpoint_response?.amount;
const fees = payment.callback_data.touchpoint_response?.fees;
const total = amount + fees;
```

#### Pour le Suivi Client
```javascript
// Obtenir le numéro de transaction formaté
const transactionNumber = payment.callback_data.touchpoint_response?.numTransaction;
// Exemple: "MP251117.1328.A58986"
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

## 15. Structure du callback_data et Détails d'Implémentation

### 15.1 Structure Complète du callback_data

Le champ `callback_data` stocke toutes les informations relatives à la transaction TouchPoint. Voici sa structure complète:

```json
{
  "initiated_at": "2025-01-24T16:30:00.000Z",
  "touchpoint_transaction_id": "20250124123456ORD-20250124-ABC12",
  "touchpoint_status": "SUCCESSFUL",
  "touchpoint_response": {
    "fees": 2,
    "amount": 1000,
    "status": "SUCCESSFUL",
    "dateTime": 1737723000000,
    "idFromGU": "1737723000000",
    "serviceCode": "CI_PAIEMENTWAVE_TP",
    "idFromClient": "20250124123456ORD-20250124-ABC12",
    "numTransaction": "WAVE250124.1630.ABC12",
    "recipientNumber": "0701020304"
  },
  "webhook_data": {
    "status": "SUCCESSFUL",
    "service_id": "CI_PAIEMENTWAVE_TP",
    "call_back_url": "https://www.kbine-mobile.com/api/payments/webhook/touchpoint",
    "gu_transaction_id": "1737723000000",
    "partner_transaction_id": "20250124123456ORD-20250124-ABC12"
  },
  "webhook_received_at": "2025-01-24T16:30:02.000Z",
  "return_url": "https://app.example.com/payment/success",
  "cancel_url": "https://app.example.com/payment/cancel",
  "error_url": "https://app.example.com/payment/error",
  "notes": "Paiement confirmé",
  "last_update": "2025-01-24T16:30:02.000Z"
}
```

**Champs principaux:**
- `initiated_at` (ISO 8601) - Timestamp d'initialisation du paiement
- `touchpoint_transaction_id` (string) - ID unique de la transaction TouchPoint
- `touchpoint_status` (string) - Statut TouchPoint actuel
- `touchpoint_response` (object) - Réponse complète de TouchPoint lors de l'initialisation
- `webhook_data` (object) - Données reçues du webhook TouchPoint
- `webhook_received_at` (ISO 8601) - Timestamp de réception du webhook
- `return_url`, `cancel_url`, `error_url` (strings) - URLs de callback (Wave)
- `notes` (string) - Notes additionnelles
- `last_update` (ISO 8601) - Timestamp de la dernière mise à jour

### 15.2 Flux de Données - Initialisation du Paiement

**Étapes dans `paymentService.initializePayment()`:**

1. **Validation de la commande**
   - Vérifier que la commande existe
   - Vérifier qu'elle n'est pas déjà payée
   - Vérifier que le montant correspond

2. **Création du paiement en base**
   - Générer `transaction_id` (format: timestamp + order_reference)
   - Générer `payment_reference` (format: PAY-{transaction_id})
   - Insérer en base avec statut `pending`
   - Stocker les URLs initiales dans `callback_data`

3. **Appel à TouchPoint**
   - Construire les paramètres selon la méthode de paiement
   - Pour Wave: ajouter `return_url`, `cancel_url`, `error_url`, `partner_name`
   - Pour Orange Money: ajouter `otp`
   - Envoyer la requête à TouchPoint

4. **Mise à jour avec réponse TouchPoint**
   - Enrichir `callback_data` avec:
     - `touchpoint_transaction_id` (du numTransaction de TouchPoint)
     - `touchpoint_status` (du status de TouchPoint)
     - `touchpoint_response` (réponse complète)
   - Inclure toutes les données de `paymentResult` via spread operator

5. **Retour au client**
   - Inclure `payment_id`, `transaction_id`, `status`
   - Pour Wave: inclure `return_url`, `cancel_url`, `fees`

### 15.3 Flux de Données - Webhook TouchPoint

**Étapes dans `paymentService.processTouchPointWebhook()`:**

1. **Réception du webhook**
   - Récupérer `partner_transaction_id` ou `idFromClient`
   - Valider que l'ID n'est pas vide

2. **Recherche du paiement**
   - Chercher via `external_reference` (qui contient le transaction_id)
   - Vérifier que le paiement existe

3. **Vérification du statut**
   - Si déjà `success`, retourner sans modification (idempotence)

4. **Mappage du statut**
   - `SUCCESSFUL` → `success`
   - `INITIATED`, `PENDING` → `pending`
   - `FAILED`, `TIMEOUT`, `CANCELLED`, `REFUSED` → `failed`

5. **Mise à jour du paiement**
   - Mettre à jour le statut
   - Enrichir `callback_data` avec:
     - `touchpoint_status` (du webhook)
     - `webhook_data` (données complètes du webhook)
     - `webhook_received_at` (timestamp actuel)
   - Préserver les données existantes via spread operator

6. **Mise à jour de la commande**
   - Si statut = `success`: mettre à jour la commande à `completed`

### 15.4 Validations Implémentées

**Dans `paymentValidator.initializePaymentValidation()`:**

```javascript
{
  order_reference: Joi.string()
    .pattern(/^ORD-\d{8}-[A-Z0-9]{5}$/)  // Format strict
    .required(),
  
  amount: Joi.number()
    .positive()
    .precision(2)  // Max 2 décimales
    .required(),
  
  payment_phone: Joi.string()
    .pattern(/^0[0-9]{9}$/)  // Format ivoirien
    .required(),
  
  payment_method: Joi.string()
    .valid('wave', 'orange_money', 'mtn_money', 'moov_money')
    .required(),
  
  otp: Joi.string()
    .pattern(/^[0-9]{4}$/)  // 4 chiffres
    .when('payment_method', {
      is: 'orange_money',
      then: Joi.required(),  // Obligatoire pour Orange Money
      otherwise: Joi.optional()
    }),
  
  return_url: Joi.string()
    .uri()  // Validation URI
    .optional(),
  
  cancel_url: Joi.string()
    .uri()
    .optional(),
  
  error_url: Joi.string()
    .uri()
    .optional()
}
```

### 15.5 Gestion des Erreurs TouchPoint

**Dans `touchpointService.createTransaction()`:**

```javascript
try {
  // Validation OTP
  if (payment_method === "orange_money" && !otp) {
    throw new Error("L'OTP est obligatoire pour les paiements Orange Money")
  }
  
  // Formatage du numéro
  const formattedPhone = this.formatPhoneNumber(payment_phone)
  
  // Construction de la transaction
  const transactionData = {
    idFromClient: transaction_id,
    amount: parseFloat(amount),
    callback: `${this.appUrl}/api/payments/webhook/touchpoint`,
    recipientNumber: formattedPhone,
    serviceCode: serviceCode,
    additionnalInfos: { /* ... */ }
  }
  
  // Configuration spécifique par méthode
  if (payment_method === "wave") {
    transactionData.additionnalInfos.partner_name = this.partnerName
    transactionData.additionnalInfos.return_url = callbackUrls.return_url
    transactionData.additionnalInfos.cancel_url = callbackUrls.cancel_url
  }
  
  // Appel API
  const response = await axios.put(url, transactionData, { /* auth */ })
  
  // Retour enrichi
  return {
    success: true,
    status: response.data.status,
    transaction_id,
    touchpoint_transaction_id: response.data.numTransaction,
    message: response.data.message,
    payment_method,
    raw_response: response.data,
    return_url: (Wave) ? callbackUrls.return_url : undefined,
    cancel_url: (Wave) ? callbackUrls.cancel_url : undefined,
    fees: response.data.fees
  }
} catch (error) {
  // Gestion d'erreur détaillée
  const errorMessage = error.response?.data?.message || error.message
  throw new Error(`Erreur TouchPoint (${payment_method}): ${errorMessage}`)
}
```

### 15.6 Routes et Middlewares

**Ordre critique des routes (dans `paymentRoutes.js`):**

1. **Routes publiques (sans auth)**
   - `POST /webhook/touchpoint` - Webhook public
   - `POST /initialize` - Initialisation publique
   - `GET /status/:order_reference` - Vérification publique
   - `GET /methods` - Méthodes disponibles

2. **Middleware d'authentification**
   - `router.use(authenticateToken)`

3. **Routes protégées statiques**
   - `GET /statuses` - Statuts disponibles
   - `GET /` - Liste avec pagination

4. **Routes avec paramètres dynamiques**
   - `GET /:id` - Détails d'un paiement
   - `PUT /:id` - Mise à jour
   - `DELETE /:id` - Suppression
   - `PATCH /:id/status` - Mise à jour du statut
   - `POST /:id/refund` - Remboursement

---

## 16. Tests

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

#### Test d'Initialisation de Paiement (Wave)
```bash
curl -X POST http://localhost:3000/api/payments/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "order_reference": "ORD-20250124-ABC12",
    "amount": 1000.00,
    "payment_phone": "0701020304",
    "payment_method": "wave",
    "return_url": "https://app.example.com/payment/success",
    "cancel_url": "https://app.example.com/payment/cancel"
  }'
```

#### Test d'Initialisation de Paiement (Orange Money)
```bash
curl -X POST http://localhost:3000/api/payments/initialize \
  -H "Content-Type: application/json" \
  -d '{
    "order_reference": "ORD-20250124-ABC12",
    "amount": 1000.00,
    "payment_phone": "0701020304",
    "payment_method": "orange_money",
    "otp": "1234"
  }'
```

#### Test de Vérification du Statut
```bash
curl -X GET http://localhost:3000/api/payments/status/ORD-20250124-ABC12
```

#### Test de Webhook TouchPoint (Simulation)
```bash
curl -X POST http://localhost:3000/api/payments/webhook/touchpoint \
  -H "Content-Type: application/json" \
  -d '{
    "partner_transaction_id": "20250124123456ORD-20250124-ABC12",
    "idFromClient": "20250124123456ORD-20250124-ABC12",
    "status": "SUCCESSFUL",
    "amount": 1000.00,
    "recipientNumber": "0701020304",
    "serviceCode": "WAVE",
    "timestamp": "2025-01-24T16:32:00.000Z"
  }'
```

#### Test de Récupération des Méthodes de Paiement
```bash
curl -X GET http://localhost:3000/api/payments/methods
```

#### Test de Récupération des Statuts (Authentifié)
```bash
curl -X GET http://localhost:3000/api/payments/statuses \
  -H "Authorization: Bearer {votre_token}"
```

#### Test de Récupération des Paiements avec Filtres
```bash
curl -X GET "http://localhost:3000/api/payments?page=1&limit=10&status=success&payment_method=wave" \
  -H "Authorization: Bearer {votre_token}"
```

#### Test de Mise à Jour du Statut d'un Paiement
```bash
curl -X PATCH http://localhost:3000/api/payments/45/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {votre_token}" \
  -d '{
    "status": "success",
    "notes": "Paiement confirmé manuellement"
  }'
```

#### Test de Remboursement
```bash
curl -X POST http://localhost:3000/api/payments/45/refund \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {votre_token}" \
  -d '{
    "reason": "Commande annulée par le client"
  }'
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

### Version 1.2.0 (Actuelle - Janvier 2025)
- ✅ **Support complet des URLs de callback pour Wave** (`return_url`, `cancel_url`, `error_url`)
- ✅ **Enrichissement du callback_data** avec toutes les données TouchPoint et webhook
- ✅ **Validation Joi complète** pour tous les paramètres de paiement
- ✅ **Gestion d'erreurs améliorée** avec messages détaillés et contexte
- ✅ **Idempotence du webhook** pour éviter les doublons
- ✅ **Documentation complète** des flux de paiement et implémentation
- ✅ **Tests cURL** pour tous les endpoints de paiement
- ✅ **Spread operator** pour inclure toutes les données de paymentResult

### Version 1.1.1
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