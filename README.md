# 🏧 ATM Frontend

Interfaccia utente per il simulatore ATM, sviluppata con **React 18** e **Vite**.

## 🛠️ Tecnologie

- **React 18** - UI Library
- **Vite 5** - Build tool
- **CSS3** - Styling (no framework)
- **Fetch API** - HTTP client

## 📋 Prerequisiti

- Node.js 18+
- npm o yarn

## ⚙️ Configurazione

### 1. Installa dipendenze

```bash
npm install
```

### 2. File .env (opzionale per sviluppo)

In sviluppo locale, Vite usa il proxy per le API. Per produzione, crea `.env.production`:

```env
# URL Backend Java
VITE_API_BASE=https://tuo-backend.render.com/api

# URL Backend Chat
VITE_CHAT_API=https://tuo-chat.render.com/api/chat
```

I file `.env.development` e `.env.production` sono già configurati nel progetto.

## 🚀 Avvio

### Sviluppo locale

```bash
npm run dev
```

L'applicazione sarà disponibile su: `http://localhost:5173`

> ℹ️ In sviluppo, Vite proxy inoltra automaticamente:
> - `/api/chat` → `http://localhost:8081` (BE.CHAT)
> - `/api/*` → `http://localhost:8080` (BE Java)

### Build produzione

```bash
npm run build
```

I file statici saranno in `dist/`.

### Preview build

```bash
npm run preview
```

## 🎨 Funzionalità

### Flusso ATM

1. **Inserimento Carta** - Validazione numero carta (16 cifre)
2. **Inserimento PIN** - Login con protezione brute force
3. **Operazioni** - Visualizza saldo, deposito, prelievo
4. **Espelli Carta** - Logout sicuro

### Assistente Chat

- 💬 Widget chat sempre disponibile
- 🤖 Powered by Google Gemini AI
- 🔓 Può sbloccare carte bloccate

### Sicurezza UI

- ✅ Validazione input lato client
- ✅ Messaggi errore user-friendly
- ✅ Tentativi PIN rimanenti visualizzati
- ✅ Card masking (es. `1234 •••• •••• 5678`)

## 📁 Struttura Progetto

```
FE/
├── src/
│   ├── App.jsx          # Componente principale ATM
│   ├── ChatWidget.jsx   # Widget chat assistente
│   ├── main.jsx         # Entry point
│   └── styles.css       # Stili globali
├── public/
├── index.html
├── vite.config.js       # Config Vite + proxy
├── package.json
├── .env.development     # Env sviluppo
├── .env.production      # Env produzione
├── .env.example         # Template
└── .gitignore
```

## 🎭 Dati Demo

Per testare l'applicazione:

| Campo | Valore |
|-------|--------|
| **Numero Carta** | `1111222233334444` |
| **PIN** | `1234` |

## 🌐 Deploy su GitHub Pages

### 1. Configura base URL

In `vite.config.js`, aggiungi il base path:

```javascript
export default defineConfig({
  base: '/nome-repo/',  // es: /atm-frontend/
  // ...
})
```

### 2. Configura .env.production

```env
VITE_API_BASE=https://tuo-backend.render.com/api
VITE_CHAT_API=https://tuo-chat.render.com/api/chat
```

### 3. Build e deploy

```bash
# Build
npm run build

# Deploy con gh-pages
npm install -D gh-pages
npx gh-pages -d dist
```

Oppure usa GitHub Actions per deploy automatico.

### 4. GitHub Actions (opzionale)

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install and Build
        run: |
          npm ci
          npm run build
        env:
          VITE_API_BASE: ${{ secrets.VITE_API_BASE }}
          VITE_CHAT_API: ${{ secrets.VITE_CHAT_API }}
          
      - name: Deploy
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

## 🖼️ Screenshot

```
┌─────────────────────────────────────┐
│           🏦 ATM SIMULATOR          │
├─────────────────────────────────────┤
│                                     │
│    ┌─────────────────────────┐      │
│    │  Inserisci la carta     │      │
│    │  [________________]     │      │
│    │                         │      │
│    │     [ INSERISCI ]       │      │
│    └─────────────────────────┘      │
│                                     │
│                           💬 Chat   │
└─────────────────────────────────────┘
```

## 📱 Responsive

L'interfaccia è ottimizzata per:
- 🖥️ Desktop
- 📱 Mobile
- 📟 Tablet

## 📄 Licenza

MIT License

## 👤 Autore

Sviluppato come progetto portfolio - Simulatore ATM Full Stack
