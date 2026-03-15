# 🎬 CYBERFLIX Backend API

Backend Express complet pour l'application CYBERFLIX - Plateforme de streaming de films.

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Structure du projet](#-structure-du-projet)
- [Endpoints API](#-endpoints-api)
- [Utilisation](#-utilisation)
- [Exemples](#-exemples)

## ✨ Fonctionnalités

- ✅ Films populaires TMDB
- ✅ Recherche de films
- ✅ Détails complets (vidéos, crédits, similaires)
- ✅ Filtrage par genre
- ✅ Films tendances (jour/semaine)
- ✅ Mieux notés & À venir
- ✅ Système de favoris
- ✅ Gestion d'erreurs complète
- ✅ Réponses en arabe (ar-SA)
- ✅ CORS activé

## 🚀 Installation

```bash
# Cloner ou créer le dossier
mkdir cyberflix-backend
cd cyberflix-backend

# Installer les dépendances
npm install

# Ou installer manuellement
npm install express cors dotenv axios
npm install -D nodemon
```

## ⚙️ Configuration

### 1. Créer le fichier `.env`

```env
# TMDB API
TMDB_API_KEY=votre_clé_tmdb_ici
TMDB_BASE_URL=https://api.themoviedb.org/3

# Server
PORT=3001
NODE_ENV=development
```

### 2. Obtenir une clé TMDB

1. Créer un compte sur [themoviedb.org](https://www.themoviedb.org/)
2. Aller dans **Settings → API**
3. Copier votre **API Key (v3 auth)**
4. Coller dans `.env`

## 📁 Structure du projet

```
cyberflix-backend/
├── server.js                 # Point d'entrée
├── .env                      # Variables d'environnement
├── package.json             # Dépendances
├── controllers/
│   ├── tmdbController.js    # Logique TMDB
│   └── movieController.js   # Logique favoris
├── routes/
│   ├── tmdbRoutes.js        # Routes TMDB
│   └── movieRoutes.js       # Routes favoris
├── middleware/
│   └── errorHandler.js      # Gestion erreurs
└── utils/
    └── (futurs helpers)
```

## 🔌 Endpoints API

### 🎥 TMDB Routes (`/api/tmdb`)

| Méthode | Endpoint | Description | Params |
|---------|----------|-------------|--------|
| GET | `/popular` | Films populaires | `?page=1` |
| GET | `/search` | Rechercher films | `?query=batman&page=1` |
| GET | `/movie/:id` | Détails d'un film | `:id` |
| GET | `/genre/:genreId` | Films par genre | `:genreId`, `?page=1` |
| GET | `/genres` | Liste des genres | - |
| GET | `/trending/:timeWindow` | Tendances | `:timeWindow` (day/week) |
| GET | `/top-rated` | Mieux notés | `?page=1` |
| GET | `/upcoming` | À venir | `?page=1` |

### ⭐ Movies Routes (`/api/movies`)

| Méthode | Endpoint | Description | Body |
|---------|----------|-------------|------|
| POST | `/favorites` | Ajouter aux favoris | `{movieId, title, poster, rating}` |
| GET | `/favorites` | Obtenir favoris | - |
| DELETE | `/favorites/:movieId` | Supprimer favori | `:movieId` |

## 💻 Utilisation

### Démarrage

```bash
# Mode développement (avec nodemon)
npm run dev

# Mode production
npm start
```

### Vérifier le serveur

```bash
curl http://localhost:3001
```

Réponse:
```json
{
  "status": "✅ CYBERFLIX API Running",
  "version": "1.0.0",
  "endpoints": {
    "tmdb": "/api/tmdb",
    "movies": "/api/movies"
  }
}
```

## 📝 Exemples

### 1. Films populaires

```bash
curl http://localhost:3001/api/tmdb/popular
```

```javascript
// Dans React
const fetchPopular = async () => {
  const res = await fetch('http://localhost:3001/api/tmdb/popular');
  const data = await res.json();
  console.log(data.results); // Tableau de films
};
```

### 2. Rechercher un film

```bash
curl "http://localhost:3001/api/tmdb/search?query=batman"
```

```javascript
const searchMovies = async (query) => {
  const res = await fetch(`http://localhost:3001/api/tmdb/search?query=${query}`);
  const data = await res.json();
  return data.results;
};
```

### 3. Détails d'un film

```bash
curl http://localhost:3001/api/tmdb/movie/550
```

```javascript
const getMovieDetails = async (movieId) => {
  const res = await fetch(`http://localhost:3001/api/tmdb/movie/${movieId}`);
  const data = await res.json();
  console.log(data.videos); // Bandes annonces
  console.log(data.credits); // Acteurs
  console.log(data.similar); // Films similaires
};
```

### 4. Films par genre

```bash
# Genre 28 = Action
curl "http://localhost:3001/api/tmdb/genre/28?page=1"
```

### 5. Genres disponibles

```bash
curl http://localhost:3001/api/tmdb/genres
```

### 6. Trending (tendances)

```bash
# Tendances de la semaine
curl http://localhost:3001/api/tmdb/trending/week

# Tendances du jour
curl http://localhost:3001/api/tmdb/trending/day
```

### 7. Ajouter aux favoris

```bash
curl -X POST http://localhost:3001/api/movies/favorites \
  -H "Content-Type: application/json" \
  -d '{"movieId": 550, "title": "Fight Club", "poster": "/path.jpg", "rating": 8.4}'
```

```javascript
const addToFavorites = async (movie) => {
  const res = await fetch('http://localhost:3001/api/movies/favorites', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      movieId: movie.id,
      title: movie.title,
      poster: movie.poster_path,
      rating: movie.vote_average
    })
  });
  return res.json();
};
```

## 🔧 Intégration avec React

### Mise à jour de App.js

```javascript
// Exemple de recherche intégrée
const handleSearch = async (query) => {
  if (!query) {
    // Recharger les populaires
    const res = await fetch('http://localhost:3001/api/tmdb/popular');
    const data = await res.json();
    setMovies(data.results);
  } else {
    // Rechercher
    const res = await fetch(`http://localhost:3001/api/tmdb/search?query=${query}`);
    const data = await res.json();
    setMovies(data.results);
  }
};

// Utiliser dans useEffect
useEffect(() => {
  handleSearch(searchQuery);
}, [searchQuery]);
```

### Exemple de service API

```javascript
// services/api.js
const API_BASE = 'http://localhost:3001/api';

export const tmdbAPI = {
  popular: (page = 1) => 
    fetch(`${API_BASE}/tmdb/popular?page=${page}`).then(r => r.json()),
  
  search: (query, page = 1) => 
    fetch(`${API_BASE}/tmdb/search?query=${query}&page=${page}`).then(r => r.json()),
  
  details: (id) => 
    fetch(`${API_BASE}/tmdb/movie/${id}`).then(r => r.json()),
  
  byGenre: (genreId, page = 1) => 
    fetch(`${API_BASE}/tmdb/genre/${genreId}?page=${page}`).then(r => r.json()),
  
  genres: () => 
    fetch(`${API_BASE}/tmdb/genres`).then(r => r.json()),
};

export const moviesAPI = {
  getFavorites: () => 
    fetch(`${API_BASE}/movies/favorites`).then(r => r.json()),
  
  addFavorite: (movie) => 
    fetch(`${API_BASE}/movies/favorites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(movie)
    }).then(r => r.json()),
  
  removeFavorite: (movieId) => 
    fetch(`${API_BASE}/movies/favorites/${movieId}`, {
      method: 'DELETE'
    }).then(r => r.json()),
};
```

## 🐛 Debug

### Problème: Erreur 401

```bash
# Vérifier que la clé TMDB est bien chargée
node -e "require('dotenv').config(); console.log(process.env.TMDB_API_KEY)"
```

### Problème: CORS

Si tu as des erreurs CORS, vérifie que `cors()` est bien activé dans `server.js`.

### Logs détaillés

Tous les endpoints loggent les erreurs avec des emojis pour faciliter le debug :
- ❌ = Erreur
- 🚀 = Serveur démarré
- 📡 = Config TMDB

## 📦 Dépendances

```json
{
  "express": "^4.18.2",      // Framework web
  "cors": "^2.8.5",          // Cross-origin
  "dotenv": "^16.3.1",       // Variables env
  "axios": "^1.6.2"          // HTTP client
}
```

## 🚧 Prochaines fonctionnalités

- [ ] Authentification JWT
- [ ] Base de données (MongoDB/PostgreSQL)
- [ ] Cache Redis
- [ ] Rate limiting
- [ ] Watchlist persistante
- [ ] Commentaires & ratings
- [ ] Upload de fichiers

## 📄 License

ISC

---

**Créé pour CYBERFLIX** 🎬
