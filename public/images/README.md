# Dossier Images

Placez vos images ici, notamment:

- **logo.png** - Logo de l'application (100x100px recommandé)
- **logo-white.png** - Logo blanc pour les fonds sombres
- **favicon.ico** - Favicon du site

## Accès

Les fichiers de ce dossier sont accessibles via:

```
http://localhost:3000/images/logo.png
```

En production:
```
https://app.kbine.com/images/logo.png
```

## Configuration

La configuration Express est dans `src/app.js`:

```javascript
app.use(express.static(path.join(__dirname, '../public'), {
  maxAge: '1d',
  etag: false,
  lastModified: false
}));
```
