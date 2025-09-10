# Pulsantiera Fantacalcio – React + TypeScript

Questo progetto è un'app web per gestire le puntate di un'asta del fantacalcio.

🎯 Obiettivo:
- Ogni utente entra in una stanza con un nickname.
- Tutti vedono in tempo reale l’offerta corrente e l’ultimo offerente.
- I partecipanti possono fare rilanci premendo pulsanti (+1, +5, +10, ecc.) o inserendo un importo personalizzato.
- Un utente speciale (“banditore”) può impostare la base d’asta, resettare e bloccare/sbloccare i rilanci.

🛠️ Stack tecnico:
- **React + TypeScript**
- **TailwindCSS** per lo stile
- **Firebase Firestore** per il realtime
- **Vite** o **Next.js** come tool di sviluppo

🚀 Requisiti principali:
- Interfaccia responsive, semplice e usabile anche da smartphone
- Aggiornamenti istantanei con Firestore (onSnapshot / runTransaction)
- Componenti chiari: Login/Join room, Display offerta, Pulsantiera, Controlli banditore

