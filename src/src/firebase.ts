// Firebase config e inizializzazione
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "INSERISCI_API_KEY",
  authDomain: "INSERISCI_AUTH_DOMAIN",
  projectId: "INSERISCI_PROJECT_ID",
  storageBucket: "INSERISCI_STORAGE_BUCKET",
  messagingSenderId: "INSERISCI_MESSAGING_SENDER_ID",
  appId: "INSERISCI_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
