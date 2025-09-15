import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "./firebase";
import { doc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Snackbar,
} from "@mui/material";
import { 
  SportsEsports, 
  Person, 
  Euro, 
  Home,
  Lock,
  LockOpen,
  Refresh,
  Group,
  Gavel,
  Logout,
  Share,
  WhatsApp,
  ContentCopy,
} from "@mui/icons-material";
import PlayerSearch from "./components/PlayerSearch";
import msalInstance, { loginRequest } from './msal';
import fantacalcioApi from './services/fantacalcioApi';
import type { TeamInfo, StatPlayer } from './services/fantacalcioApi';
import { alpha } from '@mui/material/styles';
import type { Player } from "./types/Player";

interface Participant {
  name: string;
  joinedAt: string;
  email?: string;
}

interface AuctionData {
  id: string;
  auctionName: string;
  currentBid: number;
  currentBidder: string | null;
  currentPlayer: string | null;
  isActive: boolean;
  isLocked: boolean;
  createdAt: string;
  participants: Participant[];
  takenPlayers?: string[];
  // Optional history of completed sales to show prices for taken players
  salesHistory?: { playerName: string; price: number; buyer?: string; buyerEmail?: string | null }[];
}

const AuctionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useState(new URLSearchParams(window.location.search));
  const isBanditore = searchParams.get('banditore') === 'true';
  const isDisplayView = searchParams.get('view') === 'display';
  
  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerEmail, setPlayerEmail] = useState("");
  const [hasJoined, setHasJoined] = useState(isBanditore);
  const [customBid, setCustomBid] = useState("");
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [currentPlayerName, setCurrentPlayerName] = useState("");
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);
  const [currentPlayerData, setCurrentPlayerData] = useState<Player | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showTakenDialog, setShowTakenDialog] = useState(false);
  const [currentRoleView, setCurrentRoleView] = useState<'Portiere' | 'Difensore' | 'Centrocampista' | 'Attaccante'>('Portiere');
  const [searchResetCounter, setSearchResetCounter] = useState(0);
  const [fetchNextLoading, setFetchNextLoading] = useState(false);
  const [buyerNameCache, setBuyerNameCache] = useState<Record<string, string>>({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'error' | 'success'>('error');
  // Teams panel state
  const [teams, setTeams] = useState<TeamInfo[] | null>(null);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [teamsInitialLoad, setTeamsInitialLoad] = useState(true);
  const [teamsRefreshing, setTeamsRefreshing] = useState(false);

  const DEFAULT_TEAM_BUDGET = 1000; // assumiamo budget iniziale se non fornito

  // Limiti ruoli per squadra
  const ROLE_LIMITS = {
    'Portiere': 3,
    'Difensore': 8,
    'Centrocampista': 8,
    'Attaccante': 6
  } as const;

  // Funzione per convertire StatPlayer a Player
  const convertStatPlayerToPlayer = (statPlayer: StatPlayer): Player => {
    // Conversione ruolo da numero a stringa
    const getRoleString = (role: number): 'Portiere' | 'Difensore' | 'Centrocampista' | 'Attaccante' => {
      switch (role) {
        case 0: return 'Portiere';
        case 1: return 'Difensore';
        case 2: return 'Centrocampista';
        case 3: return 'Attaccante';
        default: return 'Attaccante';
      }
    };

    return {
      Nome: statPlayer.name,
      Ruolo: getRoleString(statPlayer.role),
      Squadra: statPlayer.teamName,
      Media: statPlayer.average,
      FantaMedia: statPlayer.fantaAverage,
      PartiteMaggioriUguali6: statPlayer.isEnough,
      MotM: statPlayer.manOfTheMatch,
      ConVoto: statPlayer.withVote,
      SenzaVoto: statPlayer.withoutVote,
      Gialli: statPlayer.yellowCard,
      Rossi: statPlayer.redCard,
      Reti: statPlayer.goal,
      Rigori: statPlayer.penalty,
      Assist: statPlayer.assist,
      RigoriSbagliati: statPlayer.wrongedPenalty,
      Autogoal: statPlayer.ownGoal,
      GoalSubiti: statPlayer.sufferedGoal,
      RigoriParati: statPlayer.stoppedPenalty,
      Attivo: statPlayer.isActive,
      isTaken: false, // Da determinare in base a takenPlayers
    };
  };

  // Funzione per ottenere il team dell'utente corrente
  const getCurrentUserTeam = () => {
    if (!teams || !playerEmail) return null;
    return teams.find(team => team.owner === playerEmail);
  };

  // Funzione per controllare se un utente può prendere un giocatore di un determinato ruolo
  const canUserTakePlayerRole = (userEmail: string, playerRole: 'Portiere' | 'Difensore' | 'Centrocampista' | 'Attaccante') => {
    if (!teams) return true; // Se non abbiamo i dati dei team, permettiamo l'offerta
    
    const userTeam = teams.find(team => team.owner === userEmail);
    if (!userTeam) return true; // Se non troviamo il team, permettiamo l'offerta
    
    // Conta i giocatori per ruolo nel team
    const roleCount = (userTeam.players || []).filter(player => {
      switch (player.role) {
        case 0: return playerRole === 'Portiere';
        case 1: return playerRole === 'Difensore';
        case 2: return playerRole === 'Centrocampista';
        case 3: return playerRole === 'Attaccante';
        default: return false;
      }
    }).length;
    
    return roleCount < ROLE_LIMITS[playerRole];
  };

  // Funzione per controllare se l'utente può fare offerte per il giocatore corrente
  const canUserBidOnCurrentPlayer = () => {
    if (!currentPlayerData || !playerEmail || !teams) return true; // Fallback: permetti l'offerta
    
    return canUserTakePlayerRole(playerEmail, currentPlayerData.Ruolo);
  };

  const refreshTeams = async () => {
    // Se è il primo caricamento, mostra il loading normale
    if (teamsInitialLoad) {
      setTeamsLoading(true);
    } else {
      // Per i refresh successivi, usa l'effetto lampeggio
      setTeamsRefreshing(true);
    }
    
    setTeamsError(null);
    try {
      const t = await fantacalcioApi.getTeams();
      setTeams(t);
      
      // Se era il primo caricamento, marca come completato
      if (teamsInitialLoad) {
        setTeamsInitialLoad(false);
      }
    } catch (err: any) {
      console.error('Errore getTeams', err);
      setTeamsError(String(err?.message || err));
    } finally {
      setTeamsLoading(false);
      
      // Per l'effetto lampeggio, aspetta un po' prima di rimuoverlo
      if (!teamsInitialLoad) {
        setTimeout(() => setTeamsRefreshing(false), 300);
      }
    }
  };

  const fetchTeamNameForEmail = async (email: string) => {
    if (!email) return null;
    if (buyerNameCache[email]) return buyerNameCache[email];
    try {
      const teamName = await fantacalcioApi.getTeamName(email);
      if (teamName) {
        setBuyerNameCache(prev => ({ ...prev, [email]: teamName }));
        return teamName;
      }
    } catch (err) {
      console.error('Errore fetching team name for email', err);
    }
    return null;
  };

  const resolveBuyerDisplay = (label?: string | null) => {
    if (!label) return 'Base';
    // Prefer participant record
    const pList = auction?.participants || [];
    const byName = pList.find(p => p.name === label);
    if (byName) return byName.name;
    const byEmail = pList.find(p => p.email === label);
    if (byEmail) return byEmail.name;
    // If it's an email try cached team name or fetch in background
    if (/@/.test(label)) {
      const cached = buyerNameCache[label];
      if (cached) return cached;
      // kick off background fetch to populate cache
      fetchTeamNameForEmail(label).catch(() => {});
      // temporary fallback to a neutral placeholder while we resolve
      return 'Caricamento...';
    }
    return label;
  };

  // Recupera i dati salvati al caricamento
  useEffect(() => {
    if (!isBanditore && id) {
      const savedPlayerName = localStorage.getItem(`auction_${id}_playerName`);
      const savedHasJoined = localStorage.getItem(`auction_${id}_hasJoined`);
      const savedPlayerEmail = localStorage.getItem(`auction_${id}_playerEmail`);
      
      if (savedPlayerName && savedHasJoined === 'true') {
        setPlayerName(savedPlayerName);
        if (savedPlayerEmail) setPlayerEmail(savedPlayerEmail);
        setHasJoined(true);
        setShowWelcomeBack(true);
        // Nascondi il messaggio dopo 3 secondi
        setTimeout(() => setShowWelcomeBack(false), 3000);
      }
    }
  }, [id, isBanditore]);

  useEffect(() => {
    if (!id) {
      setError("ID asta non valido");
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "aste", id),
      (doc) => {
        if (doc.exists()) {
          const auctionData = doc.data() as AuctionData;
          setAuction(auctionData);
          
          // Verifica se il giocatore è già registrato nell'asta
          if (!isBanditore && playerName) {
            const isAlreadyParticipant = auctionData.participants?.some(
              p => p.name === playerName
            );
            if (isAlreadyParticipant && !hasJoined) {
              setHasJoined(true);
            }
          }
          
          setError(null);
        } else {
          setError("Asta non trovata");
        }
        setLoading(false);
      },
      (error) => {
        setError("Errore nel caricamento dell'asta");
        setLoading(false);
        console.error(error);
      }
    );

    return () => unsubscribe();
  }, [id, isBanditore, playerName, hasJoined]);

  // Carica i dati dei giocatori all'avvio usando l'API
  useEffect(() => {
    const initializePlayers = async () => {
      try {
        const statPlayers = await fantacalcioApi.getAllPlayers();
        const convertedPlayers = statPlayers.map(convertStatPlayerToPlayer);
        setAllPlayers(convertedPlayers);
      } catch (error) {
        console.error('Errore nel caricamento giocatori dalla API:', error);
      }
    };

    initializePlayers();
  }, []);

  // Microsoft login using MSAL popup + Graph to retrieve email
  const signInWithMicrosoft = async () => {
    try {
      // MSAL requires initialization in some environments — ensure it's initialized before use
      if (typeof (msalInstance as any).initialize === 'function') {
        try {
          await (msalInstance as any).initialize();
        } catch (initErr) {
          // Initialization may fail or be unnecessary; log and continue
          console.warn('MSAL initialize warning', initErr);
        }
      }

      const loginResponse = await msalInstance.loginPopup(loginRequest as any);
      const account = loginResponse.account;

      // Try to acquire token silently, fallback to popup
      let tokenResponse: any = null;
      try {
        tokenResponse = await msalInstance.acquireTokenSilent({ ...loginRequest, account } as any);
      } catch (silentErr) {
        try {
          tokenResponse = await msalInstance.acquireTokenPopup({ ...loginRequest, account } as any);
        } catch (popupErr) {
          console.error('Token acquisition failed', popupErr);
        }
      }

      // Prefer Graph call to get the definitive email
      let email = account?.username || '';
      if (tokenResponse?.accessToken) {
        try {
          const g = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
              Authorization: `Bearer ${tokenResponse.accessToken}`,
            },
          });
          if (g.ok) {
            const gjson = await g.json();
            // Graph returns mail or userPrincipalName
            email = gjson.mail || gjson.userPrincipalName || email;
          }
        } catch (graphErr) {
          console.error('Graph fetch failed', graphErr);
        }
      }

      if (!email) {
        alert("Impossibile ottenere l'email dall'account Microsoft");
        return;
      }

      setPlayerEmail(email);

      // Try to retrieve team name from your API using the logged email via service
      let teamName: string | null = null;
      try {
        teamName = await fantacalcioApi.getTeamName(email);
      } catch (teamErr) {
        console.error('Team API error', teamErr);
      }

      // If we got a team name, use it as the display name; otherwise fallback to email
      if (teamName) {
        setPlayerName(teamName);
        if (id) localStorage.setItem(`auction_${id}_playerName`, teamName);
      } else {
        setPlayerName(email);
        if (id) localStorage.setItem(`auction_${id}_playerName`, email);
      }

      // persist email
      if (id) localStorage.setItem(`auction_${id}_playerEmail`, email);

      // join auction
      setTimeout(() => handleJoinAsPlayer(), 100);
    } catch (err) {
      console.error('MSAL login error', err);
      alert('Login Microsoft fallito');
    }
  };

  // Aggiorna i dati del giocatore corrente quando cambia
  useEffect(() => {
    if (auction?.currentPlayer && allPlayers.length > 0) {
      const playerData = allPlayers.find(p => p.Nome === auction.currentPlayer);
      setCurrentPlayerData(playerData || null);
    } else {
      setCurrentPlayerData(null);
    }
  }, [auction?.currentPlayer, allPlayers]);

  // Load teams for the teams panel
  useEffect(() => {
    refreshTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Refresh teams when salesHistory changes (real-time updates for all participants)
  useEffect(() => {
    if (auction?.salesHistory) {
      refreshTeams();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auction?.salesHistory?.length]);

  const handleJoinAsPlayer = async () => {
    if (!playerName.trim() || !auction) return;
    
    // Verifica se il giocatore è già nei partecipanti
    const isAlreadyParticipant = auction.participants?.some(
      p => p.name === playerName.trim()
    );
    
    if (isAlreadyParticipant) {
      // Se è già partecipante, aggiorna solo lo stato locale
      localStorage.setItem(`auction_${id}_playerName`, playerName.trim());
      if (playerEmail) localStorage.setItem(`auction_${id}_playerEmail`, playerEmail);
      localStorage.setItem(`auction_${id}_hasJoined`, 'true');
      setHasJoined(true);
      return;
    }
    
    try {
      await updateDoc(doc(db, "aste", id!), {
        participants: arrayUnion({
          name: playerName.trim(),
          joinedAt: new Date().toISOString(),
          email: playerEmail || undefined,
        }),
      });
      
      // Salva nel localStorage
  localStorage.setItem(`auction_${id}_playerName`, playerName.trim());
  if (playerEmail) localStorage.setItem(`auction_${id}_playerEmail`, playerEmail);
      localStorage.setItem(`auction_${id}_hasJoined`, 'true');
      
      setHasJoined(true);
    } catch (error) {
      console.error("Errore nell'unirsi all'asta:", error);
    }
  };

  const handleBid = async (amount: number) => {
  // Do not allow bids if auction missing, user not joined, auction locked or no player is currently in auction
  // Also prevent bidding when in display view or when the current user is the banditore
  if (!auction || !hasJoined || auction.isLocked || !auction.currentPlayer || isDisplayView || isBanditore) return;
    
    // Controllo limite ruoli - verifica se l'utente può prendere questo giocatore
    if (playerEmail && currentPlayerData) {
      const canTake = canUserTakePlayerRole(playerEmail, currentPlayerData.Ruolo);
      if (!canTake) {
        const currentCount = getCurrentUserTeam()?.players?.filter(p => {
          switch (p.role) {
            case 0: return currentPlayerData.Ruolo === 'Portiere';
            case 1: return currentPlayerData.Ruolo === 'Difensore';
            case 2: return currentPlayerData.Ruolo === 'Centrocampista';
            case 3: return currentPlayerData.Ruolo === 'Attaccante';
            default: return false;
          }
        }).length || 0;
        
        const limit = ROLE_LIMITS[currentPlayerData.Ruolo];
        alert(`Non puoi prendere altri ${currentPlayerData.Ruolo.toLowerCase()}! Hai già ${currentCount}/${limit} giocatori per questo ruolo.`);
        return;
      }
    }

    const newBid = auction.currentBid + amount;
    const bidderName = isBanditore ? "Banditore" : playerName.trim();
    
    try {
      await updateDoc(doc(db, "aste", id!), {
        currentBid: newBid,
        currentBidder: bidderName,
        isActive: true,
      });
    } catch (error) {
      console.error("Errore nel fare l'offerta:", error);
    }
  };

  const handleCustomBid = async () => {
  // Prevent custom bids when there's no player in auction or auction is locked / user not joined
  // Also prevent custom bids in display view or by the banditore
  if (!auction || auction.isLocked || !hasJoined || !auction.currentPlayer || isDisplayView || isBanditore) {
      alert("Non ci sono giocatori in asta o non puoi fare offerte");
      return;
    }

    // Controllo limite ruoli - stesso controllo di handleBid
    if (playerEmail && currentPlayerData) {
      const canTake = canUserTakePlayerRole(playerEmail, currentPlayerData.Ruolo);
      if (!canTake) {
        const currentCount = getCurrentUserTeam()?.players?.filter(p => {
          switch (p.role) {
            case 0: return currentPlayerData.Ruolo === 'Portiere';
            case 1: return currentPlayerData.Ruolo === 'Difensore';
            case 2: return currentPlayerData.Ruolo === 'Centrocampista';
            case 3: return currentPlayerData.Ruolo === 'Attaccante';
            default: return false;
          }
        }).length || 0;
        
        const limit = ROLE_LIMITS[currentPlayerData.Ruolo];
        alert(`Non puoi prendere altri ${currentPlayerData.Ruolo.toLowerCase()}! Hai già ${currentCount}/${limit} giocatori per questo ruolo.`);
        return;
      }
    }

    const amount = parseInt(customBid);
    if (isNaN(amount) || amount <= 0) return;

    if (amount <= auction.currentBid) {
      alert("L'offerta deve essere maggiore di quella corrente");
      return;
    }

    const bidderName = isBanditore ? "Banditore" : playerName.trim();

    try {
      await updateDoc(doc(db, "aste", id!), {
        currentBid: amount,
        currentBidder: bidderName,
        isActive: true,
      });
      setShowCustomDialog(false);
      setCustomBid("");
    } catch (error) {
      console.error("Errore nel fare l'offerta:", error);
    }
  };

  const handleSetPlayer = async () => {
    if (!currentPlayerName.trim() || !auction) return;
    
    try {
      await updateDoc(doc(db, "aste", id!), {
        currentPlayer: currentPlayerName.trim(),
        currentBid: 0,
        currentBidder: null,
        isActive: true,
      });
      setShowPlayerDialog(false);
  setCurrentPlayerName("");
  // trigger PlayerSearch to reset its input and exclude the current player from results
  setSearchResetCounter(c => c + 1);
    } catch (error) {
      console.error("Errore nell'impostare il giocatore:", error);
    }
  };

  // Map role string to API numeric role
  const roleToNumber = (role: 'Portiere' | 'Difensore' | 'Centrocampista' | 'Attaccante') => {
    switch (role) {
      case 'Portiere': return 0;
      case 'Difensore': return 1;
      case 'Centrocampista': return 2;
      case 'Attaccante': return 3;
      default: return 0;
    }
  };

  // Fetch next player from external API and set as currentPlayer if found in loaded players data
  const handleFetchNextPlayer = async (role: 'Portiere' | 'Difensore' | 'Centrocampista' | 'Attaccante') => {
    if (!auction || !isBanditore) return;
    if (auction.isLocked) {
      alert('Asta bloccata, non è possibile impostare giocatori.');
      return;
    }

    const roleNum = roleToNumber(role);

    try {
      setFetchNextLoading(true);
      const data = await fantacalcioApi.getNextPlayer(roleNum, true);
      const apiName = data?.n;
      if (!apiName) {
        alert('Risposta API non valida');
        return;
      }

      // Find the player in the loaded players data
      const matched = allPlayers.find(p => p.Nome.trim().toLowerCase() === String(apiName).trim().toLowerCase());
      if (!matched) {
        alert(`Giocatore restituito dall'API non trovato nei dati: ${apiName}`);
        return;
      }

      // Set the player directly in Firestore
      await updateDoc(doc(db, 'aste', id!), {
        currentPlayer: matched.Nome,
        currentBid: 0,
        currentBidder: null,
        isActive: true,
      });

      // local UI updates
      setSearchResetCounter(c => c + 1);
      setCurrentPlayerName('');
      setShowPlayerDialog(false);
    } catch (error) {
      console.error('Errore fetch next player:', error);
      alert('Errore nel recuperare il prossimo giocatore');
    } finally {
      setFetchNextLoading(false);
    }
  };

  const handlePlayerSelect = (player: Player) => {
    setCurrentPlayerName(player.Nome);
    setShowPlayerDialog(true);
  };

  const handleMarkPlayerTaken = async (playerName: string) => {
    if (!auction || !isBanditore) return;
    
    try {
      const currentTakenPlayers = auction.takenPlayers || [];
      if (!currentTakenPlayers.includes(playerName)) {
        await updateDoc(doc(db, "aste", id!), {
          takenPlayers: arrayUnion(playerName),
          salesHistory: arrayUnion({ playerName, price: 0, buyer: 'Banditore', buyerEmail: null })
        });
      }
    } catch (error) {
      console.error("Errore nel segnare il giocatore come preso:", error);
    }
  };

  const handlePlayerSold = async () => {
    if (!auction?.currentPlayer || !isBanditore) return;

    // Resolve buyer email by matching currentBidder with participants
    let buyerEmail: string | null = null;
    const bidderLabel = auction.currentBidder || 'Base';
    if (bidderLabel && bidderLabel !== 'Banditore' && bidderLabel !== 'Base') {
      const matchedParticipant = auction.participants?.find(p => p.name === bidderLabel);
      if (matchedParticipant && (matchedParticipant as any).email) {
        buyerEmail = (matchedParticipant as any).email;
      } else {
        if (/@/.test(bidderLabel)) buyerEmail = bidderLabel;
      }
    }

    if (!buyerEmail) {
      setSnackbarSeverity('error');
      setSnackbarMsg("Impossibile determinare l'email del compratore; operazione annullata.");
      setSnackbarOpen(true);
      return;
    }

    // Call external API to assign player to team by email FIRST via service; if it fails, abort and show error
    try {
      const ok = await fantacalcioApi.setPlayer(buyerEmail, auction.currentPlayer || '', auction.currentBid || 0, false);
      if (!ok) {
        setSnackbarSeverity('error');
        setSnackbarMsg('SetPlayer API returned false; operazione annullata.');
        setSnackbarOpen(true);
        return;
      }

      // If API succeeded, update Firestore
      try {
        await updateDoc(doc(db, "aste", id!), {
          takenPlayers: arrayUnion(auction.currentPlayer),
          currentPlayer: null,
          currentBid: 0,
          currentBidder: null,
          isActive: false,
          salesHistory: arrayUnion({ playerName: auction.currentPlayer, price: auction.currentBid, buyer: bidderLabel, buyerEmail: buyerEmail || null })
        });

        setSnackbarSeverity('success');
        setSnackbarMsg('Giocatore assegnato correttamente');
        setSnackbarOpen(true);

        // Aggiorna lo stato delle squadre per riflettere i nuovi budget
        await refreshTeams();
      } catch (error) {
        console.error("Errore nel completare la vendita su Firestore:", error);
        setSnackbarSeverity('error');
        setSnackbarMsg('Errore nel salvare la vendita localmente.');
        setSnackbarOpen(true);
      }
    } catch (err: any) {
      console.error('Errore calling SetPlayer API', err);
      setSnackbarSeverity('error');
      setSnackbarMsg(`SetPlayer API error ${err?.message.split(' at Fantasoccer.Application.')?.[0].split('System.Exception')[1] || String(err)}`);
      setSnackbarOpen(true);
      return;
    }
  };

  // Funzioni per la condivisione
  const getAuctionLink = () => {
  if (!id) return '';
  // Forza il link per i partecipanti in modo che sia sempre attivo
  return `${window.location.origin}/asta/${id}?participant=true`;
  };

  const getDisplayLink = () => {
    return `${window.location.origin}/asta/${id}?view=display`;
  };

  const getWhatsappLink = (url: string, message: string) => {
    const text = encodeURIComponent(`${message}: ${url}`);
    return `https://wa.me/?text=${text}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Qui potresti aggiungere una notifica di successo
    } catch (error) {
      console.error("Errore nella copia:", error);
    }
  };

  const handleLogout = async () => {
    if (!id || !auction || !playerName.trim()) return;
    
    try {
      // Rimuovi il giocatore dalla lista dei partecipanti
      const updatedParticipants = auction.participants?.filter(
        p => p.name !== playerName.trim()
      ) || [];
      
      await updateDoc(doc(db, "aste", id), {
        participants: updatedParticipants,
      });
      
      // Pulisci localStorage e stato locale
      localStorage.removeItem(`auction_${id}_playerName`);
      localStorage.removeItem(`auction_${id}_hasJoined`);
      setPlayerName("");
      setHasJoined(false);
    } catch (error) {
      console.error("Errore nell'uscire dall'asta:", error);
    }
  };

  const handleToggleLock = async () => {
    if (!auction || !isBanditore) return;
    
    try {
      await updateDoc(doc(db, "aste", id!), {
        isLocked: !auction.isLocked,
      });
    } catch (error) {
      console.error("Errore nel bloccare/sbloccare l'asta:", error);
    }
  };

  const handleReset = async () => {
    if (!auction || !isBanditore) return;
    
    try {
      await updateDoc(doc(db, "aste", id!), {
        currentBid: 0,
        currentBidder: null,
        isActive: false,
      });
    } catch (error) {
      console.error("Errore nel reset dell'asta:", error);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={60} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%', textAlign: 'center' }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Button 
            variant="contained" 
            onClick={() => {
              if (id) {
                localStorage.removeItem(`auction_${id}_playerName`);
                localStorage.removeItem(`auction_${id}_hasJoined`);
              }
              navigate('/');
            }} 
            startIcon={<Home />}
          >
            Torna alla Home
          </Button>
        </Paper>
      </Container>
    );
  }

  // Se non è banditore e non sta vedendo come display=view e non ha ancora fatto il join
  if (!(isBanditore || isDisplayView) && !hasJoined) {
    return (
      <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box textAlign="center" mb={3}>
            <SportsEsports color="primary" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom color="primary">
              {auction?.auctionName}
            </Typography>
          </Box>

          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            onClick={signInWithMicrosoft}
            sx={{ py: 2, mb: 2 }}
          >
            Accedi con Microsoft
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 2 }}>
      {/* Header */}
      <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
          <Typography variant="h5" component="h1" color="primary">
            🏆 {auction?.auctionName}
          </Typography>
          <Box display="flex" gap={1} alignItems="center">
            <Chip 
              icon={isBanditore ? <Gavel /> : <Person />} 
              label={isBanditore ? "Banditore" : playerName} 
              color={isBanditore ? "secondary" : "primary"} 
              variant="outlined" 
            />
            {auction?.isLocked ? (
              <Chip icon={<Lock />} label="Bloccata" color="error" />
            ) : (
              <Chip icon={<LockOpen />} label="Attiva" color="success" />
            )}
            {!isBanditore && hasJoined && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<Logout />}
                onClick={() => setShowLogoutDialog(true)}
                sx={{ ml: 1 }}
              >
                Esci
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Welcome Back Message */}
      {showWelcomeBack && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Bentornato, {playerName}! Sei di nuovo nell'asta.
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: { xs: 1, md: 2 }, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Pannello principale asta */}
        <Box sx={{ flex: isBanditore ? 2 : 1 }}>
          {/* Combined Player & Bid Display - Compact Layout */}
          {auction?.currentPlayer ? (
            <Paper elevation={2} sx={{ mb: 2 }}>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, 
                gap: 0,
                minHeight: '120px'
              }}>
                {/* Left Side - Current Player Info */}
                <Box sx={{ 
                  p: 2, 
                  borderRight: { sm: '1px solid', xs: 'none' }, 
                  borderBottom: { xs: '1px solid', sm: 'none' },
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center'
                }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Giocatore in Asta
                  </Typography>
                  <Typography variant="h5" component="div" color="primary" fontWeight="bold" sx={{ mb: 1 }}>
                    {auction.currentPlayer}
                  </Typography>
                  {currentPlayerData && (
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip label={currentPlayerData.Ruolo} color="primary" size="small" />
                      <Chip label={currentPlayerData.Squadra} variant="outlined" size="small" />
                      <Chip label={`FM: ${currentPlayerData.FantaMedia.toFixed(1)}`} color="secondary" size="small" />
                    </Box>
                  )}
                </Box>

                {/* Right Side - Current Bid */}
                <Box sx={{ 
                  p: 2, 
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  textAlign: { xs: 'left', sm: 'center' }
                }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Offerta Corrente
                  </Typography>
                  <Typography variant="h4" component="div" color="primary" fontWeight="bold">
                    €{auction.currentBid || 0}
                  </Typography>
                  {auction.currentBidder && (
                    <Typography variant="body2" color="text.secondary">
                      {resolveBuyerDisplay(auction.currentBidder)}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Player Stats Compact - Only show key stats */}
              {currentPlayerData && (
                <Box sx={{ 
                  p: 2, 
                  pt: 0,
                  borderTop: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'grey.50'
                }}>
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' }, 
                    gap: 1,
                    textAlign: 'center'
                  }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Media</Typography>
                      <Typography variant="body2" fontWeight="bold">{currentPlayerData.Media.toFixed(1)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Voti</Typography>
                      <Typography variant="body2" fontWeight="bold">{currentPlayerData.ConVoto}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">≥6</Typography>
                      <Typography variant="body2" fontWeight="bold" color="success.main">{currentPlayerData.PartiteMaggioriUguali6}</Typography>
                    </Box>
                    {currentPlayerData.Ruolo === 'Portiere' ? (
                      <>
                        <Box>
                          <Typography variant="caption" color="text.secondary">GS</Typography>
                          <Typography variant="body2" fontWeight="bold" color="error.main">{currentPlayerData.GoalSubiti}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">RP</Typography>
                          <Typography variant="body2" fontWeight="bold" color="success.main">{currentPlayerData.RigoriParati}</Typography>
                        </Box>
                      </>
                    ) : (
                      <>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Goal</Typography>
                          <Typography variant="body2" fontWeight="bold" color="success.main">{currentPlayerData.Reti}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Assist</Typography>
                          <Typography variant="body2" fontWeight="bold" color="info.main">{currentPlayerData.Assist}</Typography>
                        </Box>
                      </>
                    )}
                    <Box>
                      <Typography variant="caption" color="text.secondary">G/R</Typography>
                      <Typography variant="body2" fontWeight="bold" color="warning.main">{currentPlayerData.Gialli}/{currentPlayerData.Rossi}</Typography>
                    </Box>
                  </Box>
                </Box>
              )}
            </Paper>
          ) : (
            <Paper elevation={2} sx={{ p: 3, mb: 2, textAlign: 'center', backgroundColor: 'grey.50' }}>
              <Typography variant="h6" color="text.secondary">
                Nessun giocatore in asta
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Il banditore deve selezionare un giocatore per iniziare
              </Typography>
            </Paper>
          )}

          {/* Bid Buttons - hidden in display view and for banditore */}
          {!isDisplayView && !isBanditore && (
            <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Fai la tua offerta:
            </Typography>
            
            {/* Messaggio quando non si può fare offerta per limite ruolo */}
            {currentPlayerData && !canUserBidOnCurrentPlayer() && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Non puoi fare offerte per questo {currentPlayerData.Ruolo.toLowerCase()} - hai già raggiunto il limite di ruolo!
              </Alert>
            )}
            
           <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(2, 1fr)' }, gap: 1, mb: 2 }}>
              {[1, 3].map((amount) => (
                <Button
                  key={amount}
                  variant="contained"
                  size="medium"
                  onClick={() => handleBid(amount)}
                  disabled={auction?.isLocked || !hasJoined || !auction?.currentPlayer || !canUserBidOnCurrentPlayer()}
                  sx={{ 
                    py: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '1.8rem', sm: '1.9rem' },
                    minHeight: { xs: '80px', sm: '88px' }
                  }}
                >
                  +€{amount}
                </Button>
              ))}
            </Box>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(4, 1fr)', sm: 'repeat(6, 1fr)' }, gap: 1, mb: 2 }}>
              {[2, 4, 5, 6, 7, 8, 10, 15, 20, 25, 50, 100].map((amount) => (
                <Button
                  key={amount}
                  variant="contained"
                  size="medium"
                  onClick={() => handleBid(amount)}
                  disabled={auction?.isLocked || !hasJoined || !auction?.currentPlayer || !canUserBidOnCurrentPlayer()}
                  sx={{ 
                    py: { xs: 1.5, sm: 2 },
                    fontSize: { xs: '0.8rem', sm: '0.9rem' },
                    minHeight: { xs: '40px', sm: '48px' }
                  }}
                >
                  +€{amount}
                </Button>
              ))}
            </Box>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              startIcon={<Euro />}
              onClick={() => setShowCustomDialog(true)}
              disabled={auction?.isLocked || !hasJoined || !auction?.currentPlayer || !canUserBidOnCurrentPlayer()}
              sx={{ py: { xs: 1.5, sm: 2 } }}
            >
              Offerta Personalizzata
            </Button>
            </Paper>
          )}

          {/* Teams Panel */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" gutterBottom>Stato Squadre</Typography>
              {teamsLoading ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={2}><CircularProgress size={24} /></Box>
              ) : teamsError ? (
                <Alert severity="error">Errore caricamento squadre: {teamsError}</Alert>
              ) : teams && teams.length > 0 ? (
                <Box 
                  sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { xs: 'repeat(1,1fr)', sm: 'repeat(2,1fr)', md: 'repeat(3,1fr)', lg: 'repeat(5,1fr)' }, 
                    gap: 2,
                    opacity: teamsRefreshing ? 0.6 : 1,
                    transition: 'opacity 0.3s ease-in-out',
                    transform: teamsRefreshing ? 'scale(0.98)' : 'scale(1)',
                  }}
                >
                  {(
                    [...teams].map(t => ({
                      team: t,
                      spent: typeof t.cost === 'number' ? t.cost : 0,
                    }))
                    .map(x => ({ ...x, remaining: DEFAULT_TEAM_BUDGET - x.spent }))
                    .sort((a, b) => (b.remaining - a.remaining))
                  ).map((entry, idx) => {
                    const t = entry.team;
                    const remaining = entry.remaining;
                    const roleCounts = (t.players || []).reduce((acc, p) => {
                      const r = p.role || 0;
                      if (r === 0) acc.gk++;
                      else if (r === 1) acc.def++;
                      else if (r === 2) acc.mid++;
                      else if (r === 3) acc.att++;
                      return acc;
                    }, { gk: 0, def: 0, mid: 0, att: 0 });

                    // Controlla se questo è il team dell'utente corrente
                    const isCurrentUserTeam = playerEmail && t.owner === playerEmail;

                    return (
                      <Paper 
                        key={t.owner || t.name || idx} 
                        elevation={isCurrentUserTeam ? 3 : 1} 
                        sx={{ 
                          p: 2,
                          backgroundColor: teamsRefreshing ? 'primary.light' : 'background.paper',
                          transition: 'background-color 0.3s ease-in-out, transform 0.3s ease-in-out',
                          border: isCurrentUserTeam ? '2px solid' : 'none',
                          borderColor: isCurrentUserTeam ? 'primary.main' : 'transparent',
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight="bold">
                          {t.name} {isCurrentUserTeam && '(Tu)'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{t.owner || '—'}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                          <Typography variant="h6">€{remaining}</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                          <Chip 
                            label={`P: ${roleCounts.gk}/${ROLE_LIMITS.Portiere}`} 
                            size="small" 
                            color="warning" 
                            variant={roleCounts.gk >= ROLE_LIMITS.Portiere ? "filled" : "outlined"}
                          />
                          <Chip 
                            label={`D: ${roleCounts.def}/${ROLE_LIMITS.Difensore}`} 
                            size="small" 
                            color="primary" 
                            variant={roleCounts.def >= ROLE_LIMITS.Difensore ? "filled" : "outlined"}
                          />
                          <Chip 
                            label={`C: ${roleCounts.mid}/${ROLE_LIMITS.Centrocampista}`} 
                            size="small" 
                            color="success" 
                            variant={roleCounts.mid >= ROLE_LIMITS.Centrocampista ? "filled" : "outlined"}
                          />
                          <Chip 
                            label={`A: ${roleCounts.att}/${ROLE_LIMITS.Attaccante}`} 
                            size="small" 
                            color="error" 
                            variant={roleCounts.att >= ROLE_LIMITS.Attaccante ? "filled" : "outlined"}
                          />
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">Nessuna informazione sulle squadre disponibile.</Typography>
              )}
            </Box>
        </Box>

  {/* Pannello Banditore (hidden in display view) */}
  {isBanditore && !isDisplayView && (
          <Box sx={{ flex: 1, minWidth: { xs: '100%', md: '300px' } }}>
            {/* Ricerca Giocatori */}
            <PlayerSearch
              players={allPlayers}
              onPlayerSelect={handlePlayerSelect}
              takenPlayers={auction?.takenPlayers || []}
              onMarkPlayerTaken={handleMarkPlayerTaken}
              onShowTakenDialog={(role) => { setCurrentRoleView(role); setShowTakenDialog(true); }}
              resetTrigger={searchResetCounter}
              excludedNames={[...(auction?.takenPlayers || []), auction?.currentPlayer || ''].filter(Boolean)}
            />
            
            {/* Controlli Banditore */}
            <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
                🔨 Controlli Banditore
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 1.5, sm: 2 } }}>
                <Button
                  variant="outlined"
                  startIcon={<Share />}
                  onClick={() => setShowShareDialog(true)}
                  color="primary"
                  sx={{ mb: 1 }}
                >
                  Condividi Link Asta
                </Button>
                
                <Button
                  variant="contained"
                  startIcon={<SportsEsports />}
                  onClick={() => handleFetchNextPlayer(currentRoleView)}
                  disabled={auction?.isLocked}
                >
                  {fetchNextLoading ? 'Caricamento...' : 'Dammi il prossimo giocatore'}
                </Button>

                {auction?.currentPlayer && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<Gavel />}
                    onClick={handlePlayerSold}
                    disabled={auction?.isLocked}
                  >
                    Aggiudica a {resolveBuyerDisplay(auction.currentBidder) || 'Base'} - €{auction.currentBid}
                  </Button>
                )}
                
                <Button
                  variant="outlined"
                  startIcon={auction?.isLocked ? <LockOpen /> : <Lock />}
                  onClick={handleToggleLock}
                  color={auction?.isLocked ? "success" : "error"}
                >
                  {auction?.isLocked ? "Sblocca" : "Blocca"} Asta
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={handleReset}
                  color="warning"
                >
                  Reset Offerte
                </Button>
              </Box>
            </Paper>

            {/* Lista Partecipanti */}
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                <Group sx={{ mr: 1 }} />
                Partecipanti ({auction?.participants?.length || 0})
              </Typography>
              
              {auction?.participants && auction.participants.length > 0 ? (
                <List dense>
                  {auction.participants.map((participant, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Person color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={participant.name}
                        secondary={`Entrato: ${new Date(participant.joinedAt).toLocaleTimeString()}`}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                  Nessun partecipante ancora
                </Typography>
              )}
            </Paper>

            
          </Box>
        )}
      </Box>

      {/* Navigation */}
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Button 
          variant="text" 
          onClick={() => {
            if (id) {
              localStorage.removeItem(`auction_${id}_playerName`);
              localStorage.removeItem(`auction_${id}_hasJoined`);
            }
            navigate('/');
          }} 
          startIcon={<Home />}
        >
          Torna alla Home
        </Button>
      </Box>

      {/* Custom Bid Dialog */}
      <Dialog open={showCustomDialog} onClose={() => setShowCustomDialog(false)}>
        <DialogTitle>Inserisci la tua offerta</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Importo (€)"
            type="number"
            fullWidth
            variant="outlined"
            value={customBid}
            onChange={(e) => setCustomBid(e.target.value)}
            inputProps={{ min: (auction?.currentBid || 0) + 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCustomDialog(false)}>Annulla</Button>
          <Button 
            onClick={handleCustomBid} 
            variant="contained"
            disabled={!auction?.currentPlayer || !customBid || parseInt(customBid) <= (auction?.currentBid || 0)}
          >
            Conferma Offerta
          </Button>
        </DialogActions>
      </Dialog>

      {/* Set Player Dialog */}
      <Dialog open={showPlayerDialog} onClose={() => setShowPlayerDialog(false)}>
        <DialogTitle>Imposta Giocatore in Asta</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nome Giocatore"
            fullWidth
            variant="outlined"
            value={currentPlayerName}
            onChange={(e) => setCurrentPlayerName(e.target.value)}
            placeholder="Es: Cristiano Ronaldo"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPlayerDialog(false)}>Annulla</Button>
          <Button 
            onClick={handleSetPlayer} 
            variant="contained"
            disabled={!currentPlayerName.trim()}
          >
            Imposta Giocatore
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog per la condivisione link */}
      <Dialog open={showShareDialog} onClose={() => setShowShareDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Share />
            Condividi Link Asta
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            
            {/* Link per partecipanti */}
            <Paper elevation={1} sx={{ p: 2, backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.06) }}>
              <Box sx={{ backgroundColor: 'background.paper', p: 2, borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  👥 Link per Partecipanti
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Per chi vuole partecipare all'asta
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                  <Button
                    variant="outlined"
                    startIcon={<ContentCopy />}
                    onClick={() => copyToClipboard(getAuctionLink())}
                    size="small"
                    fullWidth
                  >
                    Copia Link
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<WhatsApp />}
                    onClick={() => window.open(getWhatsappLink(getAuctionLink(), "Partecipa all'asta fantacalcio"), '_blank')}
                    color="success"
                    size="small"
                    fullWidth
                  >
                    Invia su WhatsApp
                  </Button>
                </Box>
              </Box>
            </Paper>

            {/* Link per display */}
            <Paper elevation={1} sx={{ p: 2, backgroundColor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📺 Link Vista Display
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Per chi vuole solo guardare (proiezione/TV)
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopy />}
                  onClick={() => copyToClipboard(getDisplayLink())}
                  size="small"
                  fullWidth
                >
                  Copia Link
                </Button>
                <Button
                  variant="contained"
                  startIcon={<WhatsApp />}
                  onClick={() => window.open(getWhatsappLink(getDisplayLink(), "Guarda l'asta fantacalcio"), '_blank')}
                  color="success"
                  size="small"
                  fullWidth
                >
                  Invia su WhatsApp
                </Button>
              </Box>
            </Paper>

          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowShareDialog(false)}>Chiudi</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog per mostrare i giocatori presi filtrati per ruolo */}
      <Dialog open={showTakenDialog} onClose={() => setShowTakenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            ⛔ Giocatori Aggiudicati - {currentRoleView}
          </Box>
        </DialogTitle>
        <DialogContent>
          {(() => {
            const taken = auction?.takenPlayers || [];
            const detailed = taken
              .map(name => allPlayers.find(p => p.Nome === name))
              .filter(Boolean) as Player[];

            const filtered = detailed.filter(p => p.Ruolo === currentRoleView);

            if (filtered.length === 0) {
              return <Typography color="text.secondary">Nessun giocatore trovato per questo ruolo.</Typography>;
            }

            return (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Nome</TableCell>
                      <TableCell>Ruolo</TableCell>
                      <TableCell>Squadra</TableCell>
                      <TableCell>Prezzo</TableCell>
                      <TableCell>Comprato da</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map(p => {
                      const matching = auction?.salesHistory?.find(s => s.playerName === p.Nome);
                      return (
                        <TableRow key={p.Nome}>
                          <TableCell>{p.Nome}</TableCell>
                          <TableCell>{p.Ruolo}</TableCell>
                          <TableCell>{p.Squadra}</TableCell>
                          <TableCell>{matching ? `€${matching.price}` : '—'}</TableCell>
                          <TableCell>{matching ? (matching.buyerEmail ? (buyerNameCache[matching.buyerEmail] || matching.buyer) : (matching.buyer || '—')) : '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            );
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTakenDialog(false)}>Chiudi</Button>
        </DialogActions>
      </Dialog>

      {/* Logout Confirmation Dialog */}
      <Dialog open={showLogoutDialog} onClose={() => setShowLogoutDialog(false)}>
        <DialogTitle>Conferma Uscita</DialogTitle>
        <DialogContent>
          <Typography>
            Sei sicuro di voler uscire dall'asta? Il banditore verrà notificato della tua uscita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogoutDialog(false)}>Annulla</Button>
          <Button 
            onClick={() => {
              handleLogout();
              setShowLogoutDialog(false);
            }} 
            variant="contained"
            color="error"
          >
            Esci dall'Asta
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default AuctionPage;

