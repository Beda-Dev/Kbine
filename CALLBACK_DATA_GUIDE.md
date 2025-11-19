# Guide Complet du callback_data

## 📋 Table des Matières

1. [Vue d'Ensemble](#vue-densemble)
2. [Structure de callback_data au Stockage](#structure-de-callback_data-au-stockage)
3. [Structure d'Initialisation par Méthode](#structure-dinitialisation-par-méthode)
4. [Champs Détaillés](#champs-détaillés)
5. [Cas d'Utilisation](#cas-dutilisation)
6. [Codes d'Erreur](#codes-derreur)
7. [Exemples Pratiques](#exemples-pratiques)

---

## Vue d'Ensemble

Le `callback_data` est un champ JSON stocké dans chaque enregistrement de paiement qui contient:

- **Données d'initialisation** - Quand et comment le paiement a été créé
- **Réponse TouchPoint** - Détails complets de la réponse de l'API
- **Données du webhook** - Informations reçues du webhook TouchPoint
- **Métadonnées** - Timestamps, IDs, statuts intermédiaires
- **Audit trail** - Historique complet pour le debugging

### Pourquoi c'est Important?

✅ **Debugging** - Identifier exactement où une transaction a échoué  
✅ **Audit** - Tracer chaque étape du processus de paiement  
✅ **Réconciliation** - Vérifier les montants et frais  
✅ **Support Client** - Fournir des détails précis aux clients  
✅ **Conformité** - Conserver un historique complet des transactions  

---

## Structure de callback_data au Stockage

### Format Minimal (Paiement Juste Créé)
```json
{
  "initiated_at": "2025-11-17T12:27:41.741Z"
}
```

### Format Complet (Paiement avec Webhook)
```json
{
  "initiated_at": "2025-11-18T14:38:39.741Z",
  "touchpoint_status": "SUCCESSFUL",
  "touchpoint_response": { /* ... */ },
  "touchpoint_transaction_id": "20251118143839ORD-20251117-70954",
  "webhook_data": { /* ... */ },
  "webhook_received_at": "2025-11-18T14:38:41.827Z"
}
```

---

## Structure d'Initialisation par Méthode

### Wave - Réponse Complète d'Initialisation

Lors de l'initialisation, Wave retourne une réponse enrichie incluant l'URL de paiement.

**Response API (endpoint `/api/payments/initialize`):**
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

**Stocké dans callback_data:**
```json
{
  "initiated_at": "2025-11-19T13:40:55.779Z",
  "touchpoint_transaction_id": "1763559655779",
  "touchpoint_status": "INITIATED",
  "touchpoint_response": {
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
  "error_url": null
}
```

**Points clés pour Wave:**
- 🔗 `payment_url`: URL pour rediriger l'utilisateur vers la page de paiement Wave
- 📱 `recipientNumber`: Numéro du destinataire (merchant Wave)
- 💰 `fees`: Frais de transaction (0.2 XOF)
- 🔄 `return_url` / `cancel_url`: URLs de redirection après paiement
- ⏳ `status`: "INITIATED" jusqu'à confirmation du webhook

**Actions requises:**
1. Rediriger l'utilisateur vers `payment_url`
2. Attendre le webhook de confirmation
3. Après paiement réussi, rediriger vers `return_url`

---

### MTN Money - Réponse d'Initialisation

MTN Money n'expose pas d'URL de paiement. L'utilisateur reçoit une notification USSD.

**Response API (endpoint `/api/payments/initialize`):**
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

**Stocké dans callback_data:**
```json
{
  "initiated_at": "2025-11-19T13:38:01.509Z",
  "touchpoint_transaction_id": "1763559482509",
  "touchpoint_status": "INITIATED",
  "touchpoint_response": {
    "idFromClient": "20251119133801ORD-20251119-77058",
    "idFromGU": "1763559482509",
    "amount": 10,
    "fees": 0.2,
    "serviceCode": "PAIEMENTMARCHAND_MTN_CI",
    "recipientNumber": "0566955943",
    "dateTime": 1763559482509,
    "status": "INITIATED",
    "numTransaction": "1763559482509"
  }
}
```

**Points clés pour MTN Money:**
- ❌ Pas de `payment_url` - l'utilisateur attend une notification USSD
- 📱 Numéro de téléphone fourni reçoit automatiquement une notification
- 💰 `fees`: Frais de transaction (0.2 XOF)
- ⏳ `status`: "INITIATED" jusqu'à confirmation du webhook
- 📞 Le client doit confirmer sur son téléphone via l'interface MTN

**Actions requises:**
1. Afficher un message à l'utilisateur: "Vous allez recevoir une notification sur votre téléphone"
2. Attendre le webhook de confirmation
3. Afficher le statut en temps réel ou permettre au client de vérifier

---

### Orange Money et Moov Money - Structure Similaire

Orange Money et Moov Money suivent le même pattern que MTN Money. Voici un exemple pour Orange Money:

**Response API (endpoint `/api/payments/initialize`):**
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

**Stocké dans callback_data:**
```json
{
  "initiated_at": "2025-11-19T13:45:00.000Z",
  "touchpoint_transaction_id": "1763559800000",
  "touchpoint_status": "INITIATED",
  "touchpoint_response": {
    "idFromClient": "20251119134500ORD-20251119-77059",
    "idFromGU": "1763559800000",
    "amount": 5000,
    "fees": 10,
    "serviceCode": "PAIEMENTMARCHAND_ORANGE_CI",
    "recipientNumber": "0789062079",
    "dateTime": 1763559800000,
    "status": "INITIATED",
    "numTransaction": "1763559800000"
  }
}
```

**Comparaison des méthodes:**

| Aspect | Wave | MTN Money | Orange Money | Moov Money |
|--------|------|-----------|--------------|-----------|
| **payment_url** | ✅ Fourni | ❌ Non | ❌ Non | ❌ Non |
| **Notification** | USSD + Push | USSD | USSD | USSD |
| **return_url** | ✅ Utilisé | ❌ Non | ❌ Non | ❌ Non |
| **Webhook** | ✅ Oui | ✅ Oui | ✅ Oui | ✅ Oui |
| **Frais** | Faibles | Faibles | Plus élevés | Faibles |
| **Délai** | Rapide | Variable | Variable | Variable |

---

### Format avec Soft Delete (Paiement Supprimé)

Quand un paiement est supprimé (soft delete), le `callback_data` inclut des informations de suppression.

```json
{
  "initiated_at": "2025-11-17T12:00:35.837Z",
  "deleted": true,
  "deleted_at": "2025-11-17T13:42:06.456Z",
  "notes": "Paiement annulé/supprimé le 2025-11-17T13:42:06.456Z",
  "touchpoint_status": "SUCCESSFUL",
  "touchpoint_response": {
    "idFromClient": "20251117120032ORD-20251113-77283",
    "idFromGU": "1763380833411",
    "amount": 100,
    "fees": 2,
    "serviceCode": "PAIEMENTMARCHANDOMPAYCIDIRECT",
    "numTransaction": "MP251117.1200.D16237",
    "recipientNumber": "0749793994"
  },
  "touchpoint_transaction_id": "20251117120032ORD-20251113-77283"
}
```

---

## Champs Détaillés

### 1. initiated_at
```
Type: ISO 8601 datetime string
Requis: ✅ Toujours présent
Exemple: "2025-11-18T14:38:39.741Z"
```

**Description:** Timestamp exact de l'initialisation du paiement

**Utilité:**
- Tracer le moment du démarrage
- Calculer la durée totale du paiement
- Vérifier les délais

**Exemple d'utilisation:**
```javascript
const initiatedTime = new Date(payment.callback_data.initiated_at);
console.log('Paiement créé à:', initiatedTime.toLocaleString());
```

---

### 2. touchpoint_status
```
Type: String (enum)
Requis: ✅ Si touchpoint_response existe
Valeurs: INITIATED, SUCCESSFUL, FAILED, PENDING, TIMEOUT, CANCELLED, REFUSED
Exemple: "SUCCESSFUL"
```

**Description:** Statut retourné par TouchPoint lors de l'initialisation

**Mapping vers statut interne:**
| touchpoint_status | Statut Interne | Signification |
|-------------------|----------------|---------------|
| SUCCESSFUL | success | ✅ Paiement réussi |
| INITIATED | pending | ⏳ En attente de confirmation |
| PENDING | pending | ⏳ En attente |
| FAILED | failed | ❌ Paiement échoué |
| TIMEOUT | failed | ⏱️ Timeout |
| CANCELLED | failed | 🚫 Annulé |
| REFUSED | failed | 🚫 Refusé |

**Utilité:**
- Connaître le statut initial
- Comparer avec le statut du webhook
- Identifier les changements de statut

---

### 3. touchpoint_response
```
Type: Object
Requis: ✅ Si paiement initialisé avec succès
Contient: Réponse complète de l'API TouchPoint
```

**Sous-champs:**

#### a) status
```
Type: String
Exemple: "SUCCESSFUL"
Description: Statut de la transaction
```

#### b) amount
```
Type: Number
Exemple: 100
Description: Montant de la transaction (sans frais)
```

#### c) fees
```
Type: Number
Exemple: 2
Description: Frais appliqués par TouchPoint
Calcul: Montant total = amount + fees
```

#### d) serviceCode
```
Type: String
Exemples:
- "PAIEMENTMARCHANDOMPAYCIDIRECT" (Orange Money)
- "PAIEMENTMARCHAND_MTN_CI" (MTN Money)
- "CI_PAIEMENTWAVE_TP" (Wave)
- "PAIEMENTMARCHAND_MOOV_CI" (Moov Money)
Description: Code du service TouchPoint
```

#### e) idFromClient
```
Type: String
Exemple: "20251117132835ORD-20251113-77283"
Description: ID envoyé par le client (notre transaction_id)
Utilité: Réconciliation avec nos enregistrements
```

#### f) idFromGU
```
Type: String (timestamp)
Exemple: "1763386115698"
Description: ID généré par TouchPoint (GU = Gateway Unit)
Utilité: Référence unique TouchPoint
```

#### g) numTransaction
```
Type: String
Exemple: "MP251117.1328.A58986"
Description: Numéro de transaction formaté (lisible)
Utilité: Afficher au client, support
```

#### h) recipientNumber
```
Type: String
Exemple: "0749793994"
Description: Numéro de téléphone du destinataire
```

#### i) dateTime
```
Type: Number (timestamp)
Exemple: 1763386115698
Description: Timestamp Unix de la transaction
Conversion: new Date(1763386115698)
```

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

---

### 4. touchpoint_transaction_id
```
Type: String
Requis: ✅ Si paiement initialisé
Exemple: "20251117132835ORD-20251113-77283"
```

**Description:** ID unique de la transaction dans TouchPoint

**Relation avec external_reference:**
- `touchpoint_transaction_id` = `external_reference` (généralement identique)
- Utilisé pour réconcilier avec TouchPoint

---

### 5. webhook_data
```
Type: Object
Requis: ❌ Optionnel (présent si webhook reçu)
Contient: Données complètes du webhook TouchPoint
```

**Sous-champs:**

#### a) status
```
Type: String
Exemple: "SUCCESSFUL" ou "FAILED"
Description: Statut final de la transaction
```

#### b) message
```
Type: String
Exemple: "[22] Invalid transaction. Please try again."
Description: Message descriptif (surtout pour erreurs)
```

#### c) service_id
```
Type: String
Exemple: "PAIEMENTMARCHANDOMPAYCIDIRECT"
Description: ID du service
```

#### d) call_back_url
```
Type: String
Exemple: "https://www.kbine-mobile.com/api/payments/webhook/touchpoint"
Description: URL de callback utilisée
```

#### e) gu_transaction_id
```
Type: String
Exemple: "1763386115698"
Description: ID de transaction TouchPoint
```

#### f) partner_transaction_id
```
Type: String
Exemple: "20251117132835ORD-20251113-77283"
Description: Notre ID de transaction
```

#### g) commission (optionnel)
```
Type: Number
Exemple: 0
Description: Commission appliquée (généralement 0)
```

**Exemple pour succès:**
```json
{
  "status": "SUCCESSFUL",
  "service_id": "PAIEMENTMARCHANDOMPAYCIDIRECT",
  "call_back_url": "https://www.kbine-mobile.com/api/payments/webhook/touchpoint",
  "gu_transaction_id": "1763386115698",
  "partner_transaction_id": "20251117132835ORD-20251113-77283"
}
```

**Exemple pour erreur:**
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

---

### 6. webhook_received_at
```
Type: ISO 8601 datetime string
Requis: ❌ Optionnel (présent si webhook reçu)
Exemple: "2025-11-18T14:38:41.827Z"
```

**Description:** Timestamp de réception du webhook

**Utilité:**
- Calculer le délai entre initialisation et notification
- Identifier les webhooks tardifs
- Audit des performances

**Calcul du délai:**
```javascript
const initiated = new Date(payment.callback_data.initiated_at);
const received = new Date(payment.callback_data.webhook_received_at);
const delayMs = received - initiated;
console.log(`Délai: ${delayMs}ms`);
```

---

### 7. deleted (optionnel)
```
Type: Boolean
Requis: ❌ Optionnel (présent si supprimé)
Valeur: true
```

**Description:** Indique que le paiement a été supprimé (soft delete)

**Signification:**
- Le paiement est marqué comme `failed`
- Les données originales sont conservées
- Utilisé pour annuler des paiements

---

### 8. deleted_at (optionnel)
```
Type: ISO 8601 datetime string
Requis: ❌ Optionnel (présent si supprimé)
Exemple: "2025-11-17T13:42:06.456Z"
```

**Description:** Timestamp de la suppression

---

### 9. notes (optionnel)
```
Type: String
Requis: ❌ Optionnel
Exemple: "Paiement annulé/supprimé le 2025-11-17T13:42:06.456Z"
```

**Description:** Notes ajoutées lors de la suppression ou mise à jour

---

## Cas d'Utilisation

### Cas 1: Paiement Réussi Immédiatement
```json
{
  "initiated_at": "2025-11-17T13:28:37.854Z",
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
  "webhook_data": {
    "status": "SUCCESSFUL",
    "service_id": "PAIEMENTMARCHANDOMPAYCIDIRECT",
    "call_back_url": "https://www.kbine-mobile.com/api/payments/webhook/touchpoint",
    "gu_transaction_id": "1763386115698",
    "partner_transaction_id": "20251117132835ORD-20251113-77283"
  },
  "webhook_received_at": "2025-11-17T13:28:38.222Z",
  "touchpoint_transaction_id": "20251117132835ORD-20251113-77283"
}
```

**Interprétation:**
- ✅ Paiement réussi
- ⏱️ Délai: 1 seconde entre initialisation et webhook
- 💰 Montant: 100 FCFA + 2 FCFA de frais = 102 FCFA
- 📱 Numéro: MP251117.1328.A58986

---

### Cas 2: Paiement Échoué
```json
{
  "initiated_at": "2025-11-18T14:38:39.741Z",
  "touchpoint_status": "FAILED",
  "webhook_data": {
    "status": "FAILED",
    "message": "[22] Invalid transaction. Please try again.",
    "commission": 0,
    "service_id": "CI_PAIEMENTWAVE_TP",
    "call_back_url": "https://www.kbine-mobile.com/api/payments/webhook/touchpoint",
    "gu_transaction_id": "1763476720407",
    "partner_transaction_id": "20251118143839ORD-20251117-70954"
  },
  "webhook_received_at": "2025-11-18T14:38:41.827Z"
}
```

**Interprétation:**
- ❌ Paiement échoué
- 🔴 Erreur: "[22] Invalid transaction"
- 📱 Méthode: Wave (CI_PAIEMENTWAVE_TP)
- ⏱️ Délai: 2 secondes

**Actions:**
- Afficher le message d'erreur au client
- Permettre une nouvelle tentative
- Logger l'erreur pour support

---

### Cas 3: Paiement En Attente
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
- ⏳ Paiement en attente
- 📱 Méthode: MTN Money
- ❌ Aucun webhook reçu (pas de webhook_data)
- 🔄 Statut peut changer

**Actions:**
- Afficher "En attente de confirmation"
- Permettre au client de vérifier le statut
- Implémenter un polling ou WebSocket

---

### Cas 4: Paiement Supprimé
```json
{
  "initiated_at": "2025-11-17T12:00:35.837Z",
  "deleted": true,
  "deleted_at": "2025-11-17T13:42:06.456Z",
  "notes": "Paiement annulé/supprimé le 2025-11-17T13:42:06.456Z",
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
- 📝 Raison: "Paiement annulé/supprimé le..."
- ⚠️ Statut du paiement: `failed`
- 📊 Données conservées pour audit

---

## Codes d'Erreur

| Code | Message | Cause | Solution |
|------|---------|-------|----------|
| [22] | Invalid transaction. Please try again. | Transaction invalide ou numéro incorrect | Vérifier le numéro de téléphone |
| [1] | Insufficient funds | Solde insuffisant | Demander au client de recharger |
| [2] | Transaction timeout | Timeout de la transaction | Réessayer |
| [3] | Invalid phone number | Numéro de téléphone invalide | Vérifier le format |
| [4] | Service not available | Service indisponible | Réessayer plus tard |

---

## Exemples Pratiques

### 1. Extraire le Numéro de Transaction
```javascript
const transactionNumber = payment.callback_data.touchpoint_response?.numTransaction;
// Résultat: "MP251117.1328.A58986"
```

### 2. Calculer le Délai Total
```javascript
const initiated = new Date(payment.callback_data.initiated_at);
const received = new Date(payment.callback_data.webhook_received_at);
const delaySeconds = (received - initiated) / 1000;
console.log(`Délai: ${delaySeconds}s`);
```

### 3. Vérifier les Frais
```javascript
const amount = payment.callback_data.touchpoint_response?.amount;
const fees = payment.callback_data.touchpoint_response?.fees;
const total = amount + fees;
console.log(`Montant: ${amount}, Frais: ${fees}, Total: ${total}`);
```

### 4. Obtenir le Message d'Erreur
```javascript
const errorMessage = payment.callback_data.webhook_data?.message;
if (errorMessage) {
  console.log('Erreur:', errorMessage);
}
```

### 5. Vérifier si Supprimé
```javascript
if (payment.callback_data.deleted) {
  console.log('Paiement supprimé le:', payment.callback_data.deleted_at);
  console.log('Raison:', payment.callback_data.notes);
}
```

### 6. Obtenir le Service Code
```javascript
const serviceCode = payment.callback_data.touchpoint_response?.serviceCode;
const serviceMap = {
  'PAIEMENTMARCHANDOMPAYCIDIRECT': 'Orange Money',
  'PAIEMENTMARCHAND_MTN_CI': 'MTN Money',
  'CI_PAIEMENTWAVE_TP': 'Wave',
  'PAIEMENTMARCHAND_MOOV_CI': 'Moov Money'
};
console.log('Service:', serviceMap[serviceCode]);
```

---

## Résumé

Le `callback_data` est essentiel pour:

✅ **Debugging** - Identifier les problèmes exactement  
✅ **Audit** - Tracer chaque étape  
✅ **Support** - Fournir des détails au client  
✅ **Réconciliation** - Vérifier les montants  
✅ **Conformité** - Conserver l'historique  

Toujours consulter le `callback_data` pour comprendre l'état exact d'une transaction!
