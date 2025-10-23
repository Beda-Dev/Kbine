Gestion des Versions d'Application
Récupérer la Version par Plateforme
Endpoint: GET /app/version

Accès: Public

Paramètres Query:

json
{
  "platform": "ios|android"
}
Réponse Success:

json
{
  "success": true,
  "data": {
    "version": "1.1.1",
    "build_number": 8,
    "force_update": false,
    "platform": "ios"
  }
}
Récupérer la Configuration Complète
Endpoint: GET /app/version/config

Accès: Admin uniquement

Réponse Success:

json
{
  "success": true,
  "data": {
    "ios_version": "1.1.1",
    "ios_build_number": 8,
    "android_version": "1.1.1",
    "android_build_number": 8,
    "force_update": false
  }
}
Mettre à Jour les Versions
Endpoint: PUT /app/version

Accès: Admin uniquement

Body:

json
{
  "ios_version": "1.1.2",
  "ios_build_number": 9,
  "android_version": "1.1.2",
  "android_build_number": 9,
  "force_update": true
}