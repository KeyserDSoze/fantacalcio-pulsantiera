# Configurazione Dominio Personalizzato per GitHub Pages

## Setup per fantacalcio.team

### 1. File CNAME
Il file `src/public/CNAME` contiene il dominio personalizzato:
```
fantacalcio.team
```

### 2. Routing e Link
L'applicazione gestisce automaticamente i domini:
- **Development**: `http://localhost:5173`
- **Production**: `https://fantacalcio.team`

#### Link di condivisione generati automaticamente:
- 👥 **Partecipanti**: `{domain}/asta/{id}?participant=true`
- 📺 **Display**: `{domain}/asta/{id}?view=display`  
- 🔨 **Banditore**: `{domain}/asta/{id}?banditore=true`

### 3. File di supporto GitHub Pages:
- `src/public/404.html` - Gestisce il routing SPA
- `src/index.html` - Script per ripristinare i path da 404
- `src/utils/linkUtils.ts` - Utility centralizzata per link

### 4. Configurazione DNS
Per far funzionare il dominio personalizzato, devi configurare i record DNS presso il tuo provider:

#### Record A per GitHub Pages:
```
Type: A
Name: @
Value: 185.199.108.153
```
```
Type: A  
Name: @
Value: 185.199.109.153
```
```
Type: A
Name: @  
Value: 185.199.110.153
```
```
Type: A
Name: @
Value: 185.199.111.153
```

#### Record CNAME per www (opzionale):
```
Type: CNAME
Name: www
Value: keyserdsoza.github.io
```

### 3. Configurazione Repository GitHub
1. Vai su GitHub → Settings → Pages
2. Source: "Deploy from a branch" 
3. Branch: `gh-pages` (creato automaticamente dal workflow)
4. Folder: `/ (root)`
5. Custom domain: `fantacalcio.team`
6. ✅ Enforce HTTPS

### 4. Verifica
Dopo il deploy e la configurazione DNS (può richiedere 24-48h), il sito sarà accessibile su:
- https://fantacalcio.team
- https://www.fantacalcio.team (se configurato)

### 5. Note
- Il file CNAME viene automaticamente copiato nella build da Vite
- Il workflow GitHub Actions gestisce automaticamente il deploy
- SSL/HTTPS viene fornito automaticamente da GitHub Pages
