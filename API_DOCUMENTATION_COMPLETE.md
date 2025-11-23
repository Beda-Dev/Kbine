# Documentation Complète de l'API Kbine Backend

## ✅ Mise à Jour Importante - Version TouchPoint Améliorée

**Date:** Novembre 2025

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
8. [Notifications Push Firebase](#notifications-push-firebase)
9. [Versions d'Application](#10-versions-dapplication)
10. [Codes d'Erreur](#11-codes-derreur)
11. [Exemples d'Utilisation](#12-exemples-dutilisation)
12. [Bonnes Pratiques](#13-bonnes-pratiques)
13. [Structure du callback_data](#15-structure-du-callback_data)
14. [Variables d'Environnement](#14-variables-denvironnement)

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
- `payment_phone` (string, requis) - Numéro de téléphone pour le paiement (format ivoirien: 0XXXXXXXXX)
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

#### Exemples de Réponse Réelles

**Exemple 1: Paiement Wave (avec URL de paiement)**

Wave retourne une URL de paiement que l'utilisateur doit utiliser pour compléter la transaction.

```json
{
  "success": true,
  "message": "Paiement initialisé avec succès",
  "data": {
    "success": true,
    "payment_id": 21,
    "transaction_id": "20251119134055ORD-20251119-77058",
    "payment_method": "wave",
    "amount": 10,
    "status": "INITIATED",
    "touchpoint_transaction_id": "1763559655779",
    "message": "Transaction initiée avec succès",
    "raw_response": {
      "idFromClient": "20251119134055ORD-20251119-77058",
      "idFromGU": "1763559655779",
      "amount": 10,
      "fees": 0.2,
      "serviceCode": "CI_PAIEMENTWAVE_TP",
      "recipientNumber": "0566955943",
      "dateTime": 1763559655779,
      "status": "INITIATED",
      "numTransaction": "1763559655779",
      "payment_url": "https://pay.wave.com/c/cos-218m2pg9r22mc?a=10&c=XOF&m=BAPE%27S%20SERVICES%20%2A%20Touc"
    },
    "return_url": "https://www.kbine-mobile.com/payments/return/ORD-20251119-77058/successful",
    "cancel_url": "https://www.kbine-mobile.com/payments/return/ORD-20251119-77058/failed",
    "fees": 0.2
  }
}
```

**Points clés pour Wave:**
- `payment_url`: URL à rediriger l'utilisateur pour effectuer le paiement
- `return_url`: URL vers laquelle l'utilisateur sera redirigé après paiement réussi
- `cancel_url`: URL vers laquelle l'utilisateur sera redirigé en cas d'annulation
- `fees`: Frais de transaction (0.2 XOF dans cet exemple)
- `touchpoint_transaction_id`: ID unique de la transaction chez TouchPoint

**Exemple 2: Paiement MTN Money (pas d'URL de paiement)**

MTN Money utilise des notifications USSD, donc il n'y a pas d'URL de paiement à retourner.

```json
{
  "success": true,
  "message": "Paiement initialisé avec succès",
  "data": {
    "success": true,
    "payment_id": 19,
    "transaction_id": "20251119133801ORD-20251119-77058",
    "payment_method": "mtn_money",
    "amount": 10,
    "status": "INITIATED",
    "touchpoint_transaction_id": "1763559482509",
    "message": "Transaction initiée avec succès",
    "raw_response": {
      "idFromClient": "20251119133801ORD-20251119-77058",
      "idFromGU": "1763559482509",
      "amount": 10,
      "fees": 0.2,
      "serviceCode": "PAIEMENTMARCHAND_MTN_CI",
      "recipientNumber": "0566955943",
      "dateTime": 1763559482509,
      "status": "INITIATED",
      "numTransaction": "1763559482509"
    },
    "fees": 0.2
  }
}
```

**Points clés pour MTN Money (et autres non-Wave):**
- Pas de `payment_url` - l'utilisateur recevra une notification USSD sur son téléphone
- Pas de `return_url` ou `cancel_url` - la redirection se fait via webhook uniquement
- `fees`: Frais de transaction
- `touchpoint_transaction_id`: ID unique de la transaction chez TouchPoint

**Exemple 3: Orange Money et Moov Money (structure identique à MTN)**

Orange Money et Moov Money suivent le même pattern que MTN Money, sans URL de paiement.

```json
{
  "success": true,
  "message": "Paiement initialisé avec succès",
  "data": {
    "success": true,
    "payment_id": 22,
    "transaction_id": "20251119134500ORD-20251119-77059",
    "payment_method": "orange_money",
    "amount": 5000,
    "status": "INITIATED",
    "touchpoint_transaction_id": "1763559800000",
    "message": "Transaction initiée avec succès",
    "raw_response": {
      "idFromClient": "20251119134500ORD-20251119-77059",
      "idFromGU": "1763559800000",
      "amount": 5000,
      "fees": 10,
      "serviceCode": "PAIEMENTMARCHAND_ORANGE_CI",
      "recipientNumber": "0789062079",
      "dateTime": 1763559800000,
      "status": "INITIATED",
      "numTransaction": "1763559800000"
    },
    "fees": 10
  }
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
   - `callback_data` (object) - **Données complètes du webhook et de TouchPoint** (voir Guide du callback_data)
   - `created_at` (datetime) - Date de création
   - `updated_at` (datetime) - Date de mise à jour


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
      "id": 21,
      "order_id": 50,
      "amount": "10.00",
      "payment_method": "wave",
      "payment_phone": "0566955943",
      "payment_reference": "PAY-20251119134055ORD-20251119-77058",
      "external_reference": "20251119134055ORD-20251119-77058",
      "status": "pending",
      "callback_data": {
        "fees": 0.2,
        "status": "INITIATED",
        "message": "Transaction initiée avec succès",
        "success": true,
        "initiated_at": "2025-11-19T13:40:56.743Z",
        "raw_response": {
          "fees": 0.2,
          "amount": 10,
          "status": "INITIATED",
          "dateTime": 1763559655779,
          "idFromGU": "1763559655779",
          "payment_url": "https://pay.wave.com/c/cos-218m2pg9r22mc?a=10&c=XOF&m=BAPE%27S%20SERVICES%20%2A%20Touc",
          "serviceCode": "CI_PAIEMENTWAVE_TP",
          "idFromClient": "20251119134055ORD-20251119-77058",
          "numTransaction": "1763559655779",
          "recipientNumber": "0566955943"
        },
        "return_url": "https://www.kbine-mobile.com/payments/return/ORD-20251119-77058/successful",
        "cancel_url": "https://www.kbine-mobile.com/payments/return/ORD-20251119-77058/failed",
        "payment_method": "wave",
        "transaction_id": "20251119134055ORD-20251119-77058",
        "touchpoint_status": "INITIATED",
        "touchpoint_response": {
          "fees": 0.2,
          "amount": 10,
          "status": "INITIATED",
          "dateTime": 1763559655779,
          "idFromGU": "1763559655779",
          "serviceCode": "CI_PAIEMENTWAVE_TP",
          "idFromClient": "20251119134055ORD-20251119-77058",
          "numTransaction": "1763559655779",
          "recipientNumber": "0566955943"
        },
        "touchpoint_transaction_id": "1763559655779"
      },
      "created_at": "2025-11-19T13:40:55.000Z",
      "updated_at": "2025-11-19T13:40:56.000Z",
      "order_status": "pending",
      "user_id": 2,
      "order_reference": "ORD-20251119-66785",
      "user_phone": "0566955943"
    },
    {
      "id": 20,
      "order_id": 50,
      "amount": "10.00",
      "payment_method": "orange_money",
      "payment_phone": "0749793994",
      "payment_reference": "PAY-20251119133929ORD-20251119-77058",
      "external_reference": "20251119133929ORD-20251119-77058",
      "status": "pending",
      "callback_data": {
        "error_url": null,
        "cancel_url": null,
        "return_url": null,
        "initiated_at": "2025-11-19T13:39:29.770Z"
      },
      "created_at": "2025-11-19T13:39:29.000Z",
      "updated_at": "2025-11-19T13:39:29.000Z",
      "order_status": "pending",
      "user_id": 2,
      "order_reference": "ORD-20251119-66785",
      "user_phone": "0566955943"
    },
    {
      "id": 19,
      "order_id": 50,
      "amount": "10.00",
      "payment_method": "mtn_money",
      "payment_phone": "0566955943",
      "payment_reference": "PAY-20251119133801ORD-20251119-77058",
      "external_reference": "20251119133801ORD-20251119-77058",
      "status": "failed",
      "callback_data": {
        "fees": 0.2,
        "status": "INITIATED",
        "message": "Transaction initiée avec succès",
        "success": true,
        "initiated_at": "2025-11-19T13:38:04.242Z",
        "raw_response": {
          "fees": 0.2,
          "amount": 10,
          "status": "INITIATED",
          "dateTime": 1763559482509,
          "idFromGU": "1763559482509",
          "serviceCode": "PAIEMENTMARCHAND_MTN_CI",
          "idFromClient": "20251119133801ORD-20251119-77058",
          "numTransaction": "1763559482509",
          "recipientNumber": "0566955943"
        },
        "webhook_data": {
          "status": "FAILED",
          "message": "FAILED",
          "commission": 0,
          "service_id": "PAIEMENTMARCHAND_MTN_CI",
          "call_back_url": "https://www.kbine-mobile.com/api/payments/webhook/touchpoint",
          "gu_transaction_id": "1763559482509",
          "partner_transaction_id": "20251119133801ORD-20251119-77058"
        },
        "payment_method": "mtn_money",
        "transaction_id": "20251119133801ORD-20251119-77058",
        "touchpoint_status": "FAILED",
        "touchpoint_response": {
          "fees": 0.2,
          "amount": 10,
          "status": "INITIATED",
          "dateTime": 1763559482509,
          "idFromGU": "1763559482509",
          "serviceCode": "PAIEMENTMARCHAND_MTN_CI",
          "idFromClient": "20251119133801ORD-20251119-77058",
          "numTransaction": "1763559482509",
          "recipientNumber": "0566955943"
        },
        "webhook_received_at": "2025-11-19T13:42:21.879Z",
        "touchpoint_transaction_id": "1763559482509"
      },
      "created_at": "2025-11-19T13:38:01.000Z",
      "updated_at": "2025-11-19T13:42:21.000Z",
      "order_status": "pending",
      "user_id": 2,
      "order_reference": "ORD-20251119-66785",
      "user_phone": "0566955943"
    },
    {
      "id": 18,
      "order_id": 51,
      "amount": "10.00",
      "payment_method": "wave",
      "payment_phone": "0566955943",
      "payment_reference": "PAY-20251119133511ORD-20251119-94344",
      "external_reference": "20251119133511ORD-20251119-94344",
      "status": "success",
      "callback_data": {
        "fees": 0.2,
        "status": "INITIATED",
        "message": "Transaction initiée avec succès",
        "success": true,
        "initiated_at": "2025-11-19T13:35:12.726Z",
        "raw_response": {
          "fees": 0.2,
          "amount": 10,
          "status": "INITIATED",
          "dateTime": 1763559311654,
          "idFromGU": "1763559311654",
          "payment_url": "https://pay.wave.com/c/cos-218m02hag2ppa?a=10&c=XOF&m=BAPE%27S%20SERVICES%20%2A%20Touc",
          "serviceCode": "CI_PAIEMENTWAVE_TP",
          "idFromClient": "20251119133511ORD-20251119-94344",
          "numTransaction": "1763559311654",
          "recipientNumber": "0566955943"
        },
        "webhook_data": {
          "status": "SUCCESSFUL",
          "service_id": "CI_PAIEMENTWAVE_TP",
          "call_back_url": "https://www.kbine-mobile.com/api/payments/webhook/touchpoint",
          "gu_transaction_id": "1763559311654",
          "partner_transaction_id": "20251119133511ORD-20251119-94344"
        },
        "payment_method": "wave",
        "transaction_id": "20251119133511ORD-20251119-94344",
        "touchpoint_status": "SUCCESSFUL",
        "touchpoint_response": {
          "fees": 0.2,
          "amount": 10,
          "status": "INITIATED",
          "dateTime": 1763559311654,
          "idFromGU": "1763559311654",
          "payment_url": "https://pay.wave.com/c/cos-218m02hag2ppa?a=10&c=XOF&m=BAPE%27S%20SERVICES%20%2A%20Touc",
          "serviceCode": "CI_PAIEMENTWAVE_TP",
          "idFromClient": "20251119133511ORD-20251119-94344",
          "numTransaction": "1763559311654",
          "recipientNumber": "0566955943"
        },
        "webhook_received_at": "2025-11-19T13:36:03.357Z",
        "touchpoint_transaction_id": "1763559311654"
      },
      "created_at": "2025-11-19T13:35:11.000Z",
      "updated_at": "2025-11-19T13:36:03.000Z",
      "order_status": "completed",
      "user_id": 2,
      "order_reference": "ORD-20251119-94344",
      "user_phone": "0566955943"
    }
  ],
  "pagination": {
    "total": 21,
    "total_pages": 3,
    "current_page": 1,
    "limit": 10,
    "has_next_page": true,
    "has_previous_page": false
  }
}
```

**Champs de réponse:**
- `id` (integer) - ID unique du paiement
- `order_id` (integer) - ID de la commande associée
- `order_reference` (string) - Référence de la commande (ORD-YYYYMMDD-XXXXX)
- `amount` (string) - Montant du paiement
- `payment_method` (string) - Méthode utilisée (wave, orange_money, mtn_money, moov_money)
- `payment_phone` (string) - Numéro de téléphone utilisé
- `payment_reference` (string) - Référence interne du paiement (PAY-*)
- `external_reference` (string) - ID unique TouchPoint
- `status` (string) - Statut du paiement (pending, success, failed, refunded)
- `callback_data` (object) - Données complètes du paiement (voir Guide du callback_data)
- `created_at` (datetime) - Date de création du paiement
- `updated_at` (datetime) - Date de dernière mise à jour
- `user_id` (integer) - ID de l'utilisateur
- `user_phone` (string) - Téléphone de l'utilisateur
- `order_status` (string) - Statut de la commande associée

**Interpretation des Statuts:**

| Statut | Meaning | Webhook | Action |
|--------|---------|---------|--------|
| `pending` | ⏳ En attente | Pas encore reçu | Attendre le webhook |
| `success` | ✅ Réussi | Reçu SUCCESSFUL | Commande complétée |
| `failed` | ❌ Échoué | Reçu FAILED | Permettre nouvelle tentative |
| `refunded` | 🔄 Remboursé | N/A | Remboursement effectué |

**Important:** Le `callback_data` contient l'intégralité des données de la transaction pour audit et debugging. Voir le [Guide du callback_data](./CALLBACK_DATA_GUIDE.md) pour une documentation détaillée.

---

### 8. Récupérer les Paiements d'un Utilisateur avec Filtres Avancés

**Endpoint:** `GET /api/payments/user/:user_id`

**Description:** Récupère TOUS les paiements d'un utilisateur avec filtres avancés (date, statut, méthode) et détails complets du plan et de la commande.

**Niveau d'accès:** Authentifié

#### Paramètres de Requête

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | integer | 1 | Numéro de page |
| `limit` | integer | 10 | Éléments par page (max: 100) |
| `status` | string | - | Filtrer par statut paiement (pending, success, failed, refunded) |
| `payment_method` | string | - | Filtrer par méthode (wave, orange_money, mtn_money, moov_money) |
| `date` | string (YYYY-MM-DD) | - | Paiements d'une date spécifique (ex: 2025-11-20) |
| `start_date` | string (YYYY-MM-DD) | - | Début de plage de dates |
| `end_date` | string (YYYY-MM-DD) | - | Fin de plage de dates |
| `sort_by` | string | p.created_at | Champ de tri (p.created_at, p.updated_at, p.amount, p.status, p.payment_method) |
| `sort_order` | string | DESC | Ordre de tri (ASC ou DESC) |

#### Exemples de Requêtes

**1️⃣ Tous les paiements de l'utilisateur (pagination)**
```bash
GET /api/payments/user/31?page=1&limit=20
Authorization: Bearer <token>
```

**2️⃣ Paiements pour une date spécifique**
```bash
GET /api/payments/user/31?date=2025-11-20
Authorization: Bearer <token>
```

**3️⃣ Paiements réussis pour une date**
```bash
GET /api/payments/user/31?date=2025-11-20&status=success
Authorization: Bearer <token>
```

**4️⃣ Paiements Wave pour une date**
```bash
GET /api/payments/user/31?date=2025-11-20&payment_method=wave
Authorization: Bearer <token>
```

**5️⃣ Tous les paiements réussis (triés par montant DESC)**
```bash
GET /api/payments/user/31?status=success&sort_by=p.amount&sort_order=DESC
Authorization: Bearer <token>
```

**6️⃣ Paiements par plage de dates**
```bash
GET /api/payments/user/31?start_date=2025-11-01&end_date=2025-11-30
Authorization: Bearer <token>
```

**7️⃣ Combinaison complète de filtres**
```bash
GET /api/payments/user/31?date=2025-11-20&status=success&payment_method=wave&sort_by=p.created_at&sort_order=DESC&page=1&limit=10
Authorization: Bearer <token>
```

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 30,
      "order_id": 66,
      "amount": 315.00,
      "payment_method": "wave",
      "payment_phone": "0789062079",
      "payment_reference": "PAY-20251119163551ORD-20251119-66785",
      "external_reference": "20251119163551ORD-20251119-66785",
      "status": "failed",
      "callback_data": {
        "fees": 6.3,
        "status": "FAILED",
        "message": "FAILED",
        "touchpoint_status": "FAILED",
        "initiated_at": "2025-11-19T16:35:51.068Z",
        "webhook_received_at": "2025-11-19T16:55:01.437Z"
      },
      "created_at": "2025-11-19T16:35:51.000Z",
      "updated_at": "2025-11-19T16:55:01.000Z",
      "order": {
        "id": 66,
        "reference": "ORD-20251119-66785",
        "status": "pending",
        "amount": 315.00,
        "phone_number": "0789062079",
        "assigned_to": null,
        "created_at": "2025-11-19T16:35:49.000Z",
        "updated_at": "2025-11-19T16:35:49.000Z",
        "plan_id": 55
      },
      "plan": {
        "id": 55,
        "operator_id": 1,
        "name": "Plan Orange 315 XOF",
        "description": "Crédit de communication 315 XOF",
        "price": 315.00,
        "type": "credit",
        "validity_days": null,
        "active": true,
        "created_at": "2025-11-15T10:30:00.000Z",
        "operator": {
          "id": 1,
          "name": "Orange CI",
          "code": "ORANGE",
          "prefixes": ["07"],
          "created_at": "2025-01-01T00:00:00.000Z"
        }
      }
    },
    {
      "id": 29,
      "order_id": 65,
      "amount": 210.00,
      "payment_method": "wave",
      "payment_phone": "0789062079",
      "payment_reference": "PAY-20251119163204ORD-20251119-30516",
      "external_reference": "20251119163204ORD-20251119-30516",
      "status": "success",
      "callback_data": {
        "fees": 4.2,
        "status": "SUCCESSFUL",
        "message": "Transaction successful",
        "touchpoint_status": "SUCCESSFUL",
        "initiated_at": "2025-11-19T16:32:05.734Z",
        "webhook_data": {
          "status": "SUCCESSFUL",
          "service_id": "CI_PAIEMENTWAVE_TP"
        },
        "webhook_received_at": "2025-11-19T16:32:08.180Z"
      },
      "created_at": "2025-11-19T16:32:04.000Z",
      "updated_at": "2025-11-19T16:32:08.000Z",
      "order": {
        "id": 65,
        "reference": "ORD-20251119-30516",
        "status": "completed",
        "amount": 210.00,
        "phone_number": "0789062079",
        "assigned_to": 5,
        "created_at": "2025-11-19T16:32:02.000Z",
        "updated_at": "2025-11-19T16:32:08.000Z",
        "plan_id": 54
      },
      "plan": {
        "id": 54,
        "operator_id": 1,
        "name": "Plan Orange 210 XOF",
        "description": "Crédit de communication 210 XOF",
        "price": 210.00,
        "type": "credit",
        "validity_days": null,
        "active": true,
        "created_at": "2025-11-15T10:30:00.000Z",
        "operator": {
          "id": 1,
          "name": "Orange CI",
          "code": "ORANGE",
          "prefixes": ["07"],
          "created_at": "2025-01-01T00:00:00.000Z"
        }
      }
    }
  ],
  "pagination": {
    "total": 25,
    "total_pages": 3,
    "current_page": 1,
    "limit": 10,
    "has_next_page": true,
    "has_previous_page": false
  }
}
```

#### Structure Complète de la Réponse

**Champs du paiement:**
- `id` (integer) - ID unique du paiement
- `order_id` (integer) - ID de la commande associée
- `order_reference` (string) - Référence de la commande (ORD-YYYYMMDD-XXXXX)
- `amount` (string) - Montant du paiement
- `payment_method` (string) - Méthode utilisée (wave, orange_money, mtn_money, moov_money)
- `payment_phone` (string) - Numéro de téléphone utilisé
- `payment_reference` (string) - Référence interne du paiement (PAY-*)
- `external_reference` (string) - ID unique TouchPoint
- `status` (string) - Statut du paiement (pending, success, failed, refunded)
- `callback_data` (object) - Données complètes du paiement (voir Guide du callback_data)
- `created_at` (datetime) - Date de création du paiement
- `updated_at` (datetime) - Date de dernière mise à jour
- `user_id` (integer) - ID de l'utilisateur
- `user_phone` (string) - Téléphone de l'utilisateur
- `order_status` (string) - Statut de la commande associée

**Champs de la commande (object order):**
- `id` (integer) - ID de la commande
- `reference` (string) - Référence de la commande (ORD-YYYYMMDD-XXXXX)
- `status` (string) - Statut de la commande (pending, assigned, processing, completed, cancelled)
- `amount` (number) - Montant total de la commande
- `phone_number` (string) - Numéro de téléphone pour la commande
- `assigned_to` (integer ou null) - ID du staff assigné
- `created_at` (datetime) - Date de création
- `updated_at` (datetime) - Date de mise à jour
- `plan_id` (integer) - ID du plan (null si commande personnalisée)

**Champs du plan (object plan):**
- `id` (integer) - ID du plan
- `operator_id` (integer) - ID de l'opérateur
- `name` (string) - Nom du plan (ex: "Plan Orange 315 XOF")
- `description` (string) - Description du plan
- `price` (number) - Prix du plan
- `type` (string) - Type de plan (credit, minutes, internet, mixte)
- `validity_days` (integer ou null) - Jours de validité
- `active` (boolean) - Si le plan est actif
- `created_at` (datetime) - Date de création du plan

**Champs de l'opérateur (object plan.operator):**
- `id` (integer) - ID de l'opérateur
- `name` (string) - Nom complet (ex: "Orange CI")
- `code` (string) - Code court (ex: "ORANGE")
- `prefixes` (array) - Préfixes de numéros supportés (ex: ["07"])
- `created_at` (datetime) - Date de création

**Champs de pagination:**
- `total` (integer) - Nombre total de résultats
- `total_pages` (integer) - Nombre de pages
- `current_page` (integer) - Page actuelle
- `limit` (integer) - Résultats par page
- `has_next_page` (boolean) - Y a-t-il une page suivante
- `has_previous_page` (boolean) - Y a-t-il une page précédente

**Champs de filtres (appliqués):**
- `status` (string ou null) - Filtre de statut utilisé
- `payment_method` (string ou null) - Filtre de méthode utilisé
- `date` (string ou null) - Filtre de date spécifique utilisé
- `start_date` (string ou null) - Filtre de date de début utilisé
- `end_date` (string ou null) - Filtre de date de fin utilisé

#### Réponses d'Erreur

**401 - Non Authentifié**
```json
{
  "success": false,
  "error": "Token invalide ou expiré"
}
```

**404 - Utilisateur Non Trouvé**
```json
{
  "success": false,
  "error": "Utilisateur non trouvé"
}
```

**400 - Paramètres Invalides**
```json
{
  "success": false,
  "error": "ID utilisateur invalide"
}
```

**500 - Erreur Serveur**
```json
{
  "success": false,
  "error": "Erreur lors de la récupération des paiements",
  "details": "Description détaillée de l'erreur"
}
```

#### Cas d'Utilisation

**1️⃣ Afficher l'historique de paiement complet d'un utilisateur**
```javascript
const response = await fetch('/api/payments/user/31');
const { data } = await response.json();

data.forEach(payment => {
  console.log(`
    ${payment.order.reference}:
    Montant: ${payment.amount} XOF
    Statut: ${payment.status}
    Méthode: ${payment.payment_method}
    Plan: ${payment.plan?.name || 'N/A'}
  `);
});
```

**2️⃣ Filtrer les paiements réussis et calculer le total**
```javascript
const response = await fetch('/api/payments/user/31?status=success');
const { data } = await response.json();

const totalSpent = data.reduce((sum, p) => sum + p.amount, 0);
console.log(`Total dépensé: ${totalSpent} XOF`);
```

**3️⃣ Afficher les détails complets du plan**
```javascript
const payment = data[0];
const plan = payment.plan;
const operator = plan.operator;

console.log(`
  Plan: ${plan.name}
  Opérateur: ${operator.name} (${operator.code})
  Prix: ${plan.price} XOF
  Type: ${plan.type}
  Actif: ${plan.active}
`);
```

**4️⃣ Analyser les paiements par méthode sur une période**
```javascript
const response = await fetch('/api/payments/user/31?start_date=2025-11-01&end_date=2025-11-30');
const { data } = await response.json();

const byMethod = {};
data.forEach(p => {
  byMethod[p.payment_method] = (byMethod[p.payment_method] || 0) + p.amount;
});

console.log('Paiements par méthode:', byMethod);
```

#### Points Importants

✅ **Données Enrichies** - Inclut TOUTES les informations du plan et de la commande  
✅ **Filtrage Flexible** - Filtres par date, statut, méthode, avec tri personnalisé  
✅ **Pagination** - Gestion efficace des grandes listes  
✅ **Détails complets** - Plan + Opérateur + Commande + Paiement en une seule requête  
✅ **Audit trail** - `callback_data` contient l'intégralité de l'historique du paiement

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

#### Étape 4: Initialiser le Paiement
```bash
POST /api/payments/initialize
Content-Type: application/json

{
  "order_reference": "ORD-20250124-ABC12",
  "amount": 1000.00,
  "payment_phone": "0701020304",
  "payment_method": "wave",
  "return_url": "https://app.example.com/payment/success",
  "cancel_url": "https://app.example.com/payment/cancel",
  "error_url": "https://app.example.com/payment/error"
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

## Notifications Push Firebase

### Vue d'Ensemble

**Notifications Push Firebase Cloud Messaging (FCM)** permet d'envoyer des notifications en temps réel à vos utilisateurs sur iOS et Android.

**Fonctionnalités:**
- ✅ Notifications en temps réel via Firebase Cloud Messaging
- ✅ Support Android et iOS
- ✅ Gestion automatique des tokens invalides
- ✅ Historique des notifications
- ✅ Notifications métier (paiements, commandes, etc.)
- ✅ Notifications de test pour le debugging

### Configuration Requise

#### 1. Fichier Service Account Firebase

Obtenir le fichier `firebase-service-account.json` depuis Firebase Console:

1. Aller à **Project Settings > Service Accounts**
2. Cliquer sur **Generate New Private Key**
3. Sauvegarder le fichier JSON téléchargé

**Placement du fichier:**
- **Production (Docker):** À la racine du projet (`/app/firebase-service-account.json`)
- **Développement:** À la racine du projet (`./firebase-service-account.json`)

#### 2. Variable d'Environnement Alternative

Si le fichier n'est pas disponible, définir:

```env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"kbine-...","...":...}
```

#### 3. Configuration FCM Client (Application Mobile)

**Android (`strings.xml`):**
```xml
<string name="default_notification_channel_id">kbine_channel</string>
```

**iOS (`Info.plist`):**
```xml
<key>UIUserNotificationSettings</key>
<dict>
  <key>UIUserNotificationTypes</key>
  <integer>7</integer>
</dict>
```

---

### 1. Enregistrer un Token FCM

**Endpoint:** `POST /api/notifications/register-token`

**Description:** Enregistre un token Firebase Cloud Messaging pour recevoir des notifications push. À appeler lors du démarrage de l'application et à chaque nouveau token généré.

**Niveau d'accès:** Authentifié

#### Données à Envoyer (JSON)

```json
{
  "token": "fPgF5K8g0J2mR9sL1w3x5z7b9d1e3f5h7j9k1m3n5p7q9r1t3v5w7y9z1a3c5e7g9i1",
  "platform": "android"
}
```

**Champs:**
- `token` (string, requis) - Token FCM générés par Firebase SDK
- `platform` (string, requis) - Plateforme: `android` ou `ios`

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Token enregistré avec succès"
}
```

#### Réponses d'Erreur

**400 - Token Manquant**
```json
{
  "success": false,
  "error": "Le token FCM est requis"
}
```

**400 - Plateforme Invalide**
```json
{
  "success": false,
  "error": "La plateforme doit être \"android\" ou \"ios\""
}
```

#### Exemple d'Utilisation (React Native)

```javascript
import messaging from '@react-native-firebase/messaging';

// Enregistrer le token au démarrage
const registerFCMToken = async (authToken) => {
  try {
    const token = await messaging().getToken();
    
    await fetch('https://api.kbine.com/api/notifications/register-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        token,
        platform: Platform.OS // 'android' ou 'ios'
      })
    });
    
    console.log('✅ Token FCM enregistré');
  } catch (error) {
    console.error('❌ Erreur enregistrement token:', error);
  }
};

// À appeler au démarrage de l'app
useEffect(() => {
  registerFCMToken(userAuthToken);
}, []);

// Écouter les nouveaux tokens
messaging().onTokenRefresh(token => {
  registerFCMToken(userAuthToken);
});
```

---

### 2. Supprimer un Token FCM

**Endpoint:** `POST /api/notifications/remove-token`

**Description:** Supprime un token FCM (à appeler lors de la déconnexion).

**Niveau d'accès:** Authentifié

#### Données à Envoyer (JSON)

```json
{
  "token": "fPgF5K8g0J2mR9sL1w3x5z7b9d1e3f5h7j9k1m3n5p7q9r1t3v5w7y9z1a3c5e7g9i1"
}
```

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Token supprimé avec succès"
}
```

#### Exemple d'Utilisation

```javascript
// À l'appel de déconnexion
const logout = async (authToken) => {
  try {
    const token = await messaging().getToken();
    
    await fetch('https://api.kbine.com/api/notifications/remove-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({ token })
    });
    
    // Puis effectuer la déconnexion
    await logout();
  } catch (error) {
    console.error('❌ Erreur suppression token:', error);
  }
};
```

---

### 3. Récupérer l'Historique des Notifications

**Endpoint:** `GET /api/notifications/history`

**Description:** Récupère l'historique de toutes les notifications reçues par l'utilisateur connecté avec pagination.

**Niveau d'accès:** Authentifié

#### Paramètres de Requête

| Paramètre | Type | Défaut | Description |
|-----------|------|--------|-------------|
| `page` | integer | 1 | Numéro de page |
| `limit` | integer | 20 | Notifications par page (max: 100) |

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "data": [
    {
      "id": 145,
      "title": "💰 Paiement reçu",
      "body": "Paiement de 1000F reçu - Commande #ORD-20250124-ABC12",
      "type": "payment_success",
      "data": {
        "orderId": "45",
        "orderReference": "ORD-20250124-ABC12",
        "amount": "1000",
        "paymentMethod": "wave",
        "customerPhone": "0701020304",
        "timestamp": "1737723000000"
      },
      "sent_at": "2025-01-24T16:30:00.000Z",
      "created_at": "2025-01-24T16:30:00.000Z"
    },
    {
      "id": 144,
      "title": "✅ Commande terminée",
      "body": "Votre commande #ORD-20250124-ABC11 a été traitée avec succès",
      "type": "order_completed",
      "data": {
        "orderId": "44",
        "orderReference": "ORD-20250124-ABC11",
        "status": "completed",
        "amount": "500",
        "timestamp": "1737722000000"
      },
      "sent_at": "2025-01-24T16:25:00.000Z",
      "created_at": "2025-01-24T16:25:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "hasMore": true
  }
}
```

**Champs de réponse:**
- `id` (integer) - ID unique de la notification
- `title` (string) - Titre de la notification
- `body` (string) - Corps/contenu de la notification
- `type` (string) - Type de notification (payment_success, order_completed, etc.)
- `data` (object) - Données additionnelles structurées
- `sent_at` (datetime) - Quand la notification a été envoyée
- `created_at` (datetime) - Quand l'entrée a été créée en base

**Champs de pagination:**
- `page` (integer) - Page actuelle
- `limit` (integer) - Notifications par page
- `total` (integer) - Nombre total de notifications
- `hasMore` (boolean) - Y a-t-il d'autres pages

#### Types de Notifications

| Type | Titre | Déclencheur |
|------|-------|------------|
| `payment_success` | 💰 Paiement reçu | Paiement réussi |
| `order_completed` | ✅ Commande terminée | Commande marquée complétée |
| `payment_failed` | ❌ Paiement échoué | Paiement échoué |
| `order_assigned` | 📋 Commande assignée | Commande assignée au staff |
| `test` | 🧪 Test | Notification de test |

#### Exemple d'Utilisation

```javascript
// Récupérer l'historique avec pagination
const fetchNotificationHistory = async (authToken, page = 1) => {
  const response = await fetch(
    `https://api.kbine.com/api/notifications/history?page=${page}&limit=20`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }
  );
  
  const { data, pagination } = await response.json();
  
  // Afficher les notifications
  data.forEach(notif => {
    console.log(`${notif.title}: ${notif.body}`);
  });
  
  // Vérifier s'il y a d'autres pages
  if (pagination.hasMore) {
    fetchNotificationHistory(authToken, page + 1);
  }
};
```

---

### 4. Envoyer une Notification de Test

**Endpoint:** `POST /api/notifications/test`

**Description:** Envoie une notification de test pour vérifier que le système fonctionne correctement. Utile pour le debugging et les tests.

**Niveau d'accès:** Admin

#### Données à Envoyer (JSON)

```json
{
  "title": "Test Notification",
  "body": "Ceci est une notification de test",
  "userId": 1
}
```

**Champs:**
- `title` (string, requis) - Titre de la notification
- `body` (string, requis) - Corps de la notification
- `userId` (integer, optionnel) - ID de l'utilisateur cible (si omis: envoyer à tout le staff)

#### Réponse en Cas de Succès (200)

```json
{
  "success": true,
  "message": "Notification de test envoyée",
  "successCount": 2,
  "failureCount": 0
}
```

**Champs de réponse:**
- `successCount` (integer) - Nombre de tokens ayant reçu la notification
- `failureCount` (integer) - Nombre de tokens ayant échoué

#### Réponses d'Erreur

**400 - Données Manquantes**
```json
{
  "success": false,
  "error": "Le titre et le corps sont requis"
}
```

**404 - Utilisateur Non Trouvé**
```json
{
  "success": false,
  "error": "Aucun token trouvé pour cet utilisateur"
}
```

#### Exemple de Test cURL

```bash
# Tester l'envoi de notification au staff
curl -X POST https://api.kbine.com/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Test du Système",
    "body": "Ceci est une notification de test du système Kbine"
  }'

# Tester l'envoi à un utilisateur spécifique
curl -X POST https://api.kbine.com/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Test Personnel",
    "body": "Notification de test pour l'\''utilisateur 1",
    "userId": 1
  }'
```

---

### Notifications Automatiques

Le système envoie automatiquement des notifications dans les cas suivants:

#### 1. Paiement Réussi
**Déclencheur:** Webhook TouchPoint reçu avec statut `SUCCESSFUL`

**Destinataires:** 👥 Tout le staff (admin + staff)

**Contenu:**
```
Titre: 💰 Paiement reçu
Corps: Paiement de {amount}F reçu - Commande #{orderReference}

Données:
- type: payment_success
- orderId: {orderId}
- orderReference: {orderReference}
- amount: {amount}
- paymentMethod: {paymentMethod}
- customerPhone: {customerPhone}
```

#### 2. Commande Terminée
**Déclencheur:** Commande marquée avec statut `completed`

**Destinataires:** 👤 Le client ayant créé la commande

**Contenu:**
```
Titre: ✅ Commande terminée
Corps: Votre commande #ORD-20250124-ABC11 a été traitée avec succès

Données:
- type: order_completed
- orderId: {orderId}
- orderReference: {orderReference}
- status: completed
- amount: {amount}
```

#### 3. Paiement Échoué
**Déclencheur:** Webhook TouchPoint reçu avec statut `FAILED`

**Destinataires:** 👤 Le client + 👥 Staff

**Contenu:**
```
Titre: ❌ Paiement échoué
Corps: Le paiement de votre commande #{orderReference} a échoué

Données:
- type: payment_failed
- orderId: {orderId}
- orderReference: {orderReference}
- amount: {amount}
- errorMessage: {errorMessage}
```

#### 4. Commande Assignée
**Déclencheur:** Commande assignée à un membre du staff

**Destinataires:** 👤 Le staff assigné

**Contenu:**
```
Titre: 📋 Nouvelle commande
Corps: Nouvelle commande assignée: #{orderReference} - {amount}F

Données:
- type: order_assigned
- orderId: {orderId}
- orderReference: {orderReference}
- amount: {amount}
- assignedBy: {adminName}
```

---

### Intégration dans l'Application Mobile

#### React Native (Gestion Complète)

```javascript
import messaging from '@react-native-firebase/messaging';
import { useEffect, useState } from 'react';

export const NotificationManager = ({ authToken, userId }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // 1️⃣ Enregistrer le token au démarrage
    registerInitialToken();

    // 2️⃣ Écouter les notifications en avant-plan
    const unsubscribeForeground = messaging().onMessage(async (remoteMessage) => {
      handleForegroundNotification(remoteMessage);
    });

    // 3️⃣ Écouter les notifications reçues quand l'app était fermée
    messaging().getInitialNotification().then((message) => {
      if (message) {
        handleBackgroundNotification(message);
      }
    });

    // 4️⃣ Écouter les clics sur les notifications
    const unsubscribeBackground = messaging().onNotificationOpenedApp(
      (message) => {
        handleNotificationClick(message);
      }
    );

    // 5️⃣ Écouter les nouveaux tokens
    const unsubscribeTokenRefresh = messaging().onTokenRefresh((token) => {
      updateToken(token);
    });

    return () => {
      unsubscribeForeground();
      unsubscribeBackground();
      unsubscribeTokenRefresh();
    };
  }, [authToken, userId]);

  const registerInitialToken = async () => {
    try {
      // Demander la permission (iOS)
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        const token = await messaging().getToken();
        await registerFCMToken(token);
      }
    } catch (error) {
      console.error('❌ Erreur enregistrement initial:', error);
    }
  };

  const registerFCMToken = async (token) => {
    try {
      const response = await fetch('https://api.kbine.com/api/notifications/register-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS // 'android' ou 'ios'
        })
      });

      if (!response.ok) throw new Error('Erreur enregistrement');
      console.log('✅ Token FCM enregistré');
    } catch (error) {
      console.error('❌ Erreur:', error);
    }
  };

  const handleForegroundNotification = (remoteMessage) => {
    console.log('📬 Notification reçue en avant-plan:', remoteMessage);

    const { notification, data } = remoteMessage;
    
    // Afficher une notification locale
    showNotification({
      title: notification?.title,
      body: notification?.body,
      data
    });
  };

  const handleBackgroundNotification = (message) => {
    console.log('📬 Notification reçue en arrière-plan:', message);
    // Navigation automatique si nécessaire
    handleNotificationClick(message);
  };

  const handleNotificationClick = (message) => {
    const { data } = message;

    // Redirection basée sur le type
    if (data?.type === 'payment_success') {
      // Naviguer vers les détails de la commande
      navigation.navigate('OrderDetails', { orderId: data.orderId });
    } else if (data?.type === 'order_completed') {
      // Naviguer vers la commande
      navigation.navigate('OrderDetails', { orderId: data.orderId });
    }
  };

  return null; // Ce composant ne rend rien
};
```

#### Affichage des Notifications Locales

```javascript
import notifee from '@react-native-notifee/react-native';

const showNotification = async ({ title, body, data }) => {
  try {
    // Créer un canal (Android)
    await notifee.createChannel({
      id: 'kbine_channel',
      name: 'Kbine Notifications',
      sound: 'default',
      importance: 4 // High
    });

    // Afficher la notification
    await notifee.displayNotification({
      title,
      body,
      data,
      android: {
        channelId: 'kbine_channel',
        smallIcon: 'ic_launcher', // Icône personnalisée
        pressAction: {
          id: 'default'
        }
      },
      ios: {
        sound: 'default'
      }
    });
  } catch (error) {
    console.error('❌ Erreur affichage notification:', error);
  }
};
```

---

### Débogage et Troubleshooting

#### ✅ Vérifier que Firebase est Initialisé

```bash
# Voir les logs au démarrage
docker logs kbine-backend | grep Firebase

# Résultat attendu:
# [Firebase] ✅ Firebase Admin SDK initialisé
# [Firebase] Project ID: kbine-xxxxx
# [Firebase] Firebase Cloud Messaging disponible
```

#### ⚠️ Firebase Non Initialisé

**Cause:** Fichier credentials manquant ou variable d'environnement non définie

**Solution:**
1. Vérifier que `firebase-service-account.json` est à la racine du projet
2. OU définir `FIREBASE_SERVICE_ACCOUNT` en env var
3. Redémarrer le serveur

#### 📋 Tester l'Enregistrement du Token

```bash
curl -X POST https://api.kbine.com/api/notifications/register-token \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "token": "test_token_12345",
    "platform": "android"
  }'

# Réponse attendue:
# { "success": true, "message": "Token enregistré avec succès" }
```

#### 🧪 Envoyer une Notification de Test

```bash
curl -X POST https://api.kbine.com/api/notifications/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "title": "Test",
    "body": "Test de notification"
  }'
```

#### 🔍 Consulter la Base de Données

```sql
-- Voir les tokens enregistrés
SELECT * FROM fcm_tokens WHERE user_id = 1;

-- Voir l'historique des notifications
SELECT * FROM notifications WHERE user_id = 1 ORDER BY created_at DESC;

-- Voir les tokens actifs
SELECT COUNT(*) as active_tokens FROM fcm_tokens WHERE is_active = TRUE;
```

#### ⚡ Problèmes Courants

| Problème | Cause | Solution |
|----------|-------|----------|
| Notifications non reçues | Firebase non initialisé | Vérifier les credentials Firebase |
| Tokens perdus après redémarrage | Base de données non connectée | Vérifier la connexion MySQL |
| Erreur "Invalid token" | Token expiré | Réenregistrer le token |
| Service unavailable | Firebase service down | Attendre ou essayer plus tard |

---

### Bonnes Pratiques

1. **Enregistrer le token au démarrage de l'app** ✅
2. **Réenregistrer quand le token change** ✅
3. **Nettoyer les tokens à la déconnexion** ✅
4. **Gérer les erreurs de notifications gracieusement** ✅
5. **Tester avec des notifications de test** ✅
6. **Monitorer les logs Firebase** ✅
7. **Vérifier les permissions utilisateur (iOS)** ✅

---