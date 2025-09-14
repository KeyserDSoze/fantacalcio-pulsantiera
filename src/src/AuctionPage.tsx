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
} from "@mui/material";
import { 
  SportsEsports, 
  Person, 
  Euro, 
  Home,
  Lock,
  LockOpen,
  PlayArrow,
  Refresh,
  Group,
  Gavel,
  Logout,
  Share,
  WhatsApp,
  ContentCopy,
} from "@mui/icons-material";
import PlayerSearch from "./components/PlayerSearch";
import { alpha } from '@mui/material/styles';
import type { Player } from "./types/Player";
import { loadPlayersData } from "./services/playersService";

interface Participant {
  name: string;
  joinedAt: string;
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

  // Recupera i dati salvati al caricamento
  useEffect(() => {
    if (!isBanditore && id) {
      const savedPlayerName = localStorage.getItem(`auction_${id}_playerName`);
      const savedHasJoined = localStorage.getItem(`auction_${id}_hasJoined`);
      
      if (savedPlayerName && savedHasJoined === 'true') {
        setPlayerName(savedPlayerName);
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

  // Carica i dati dei giocatori all'avvio
  useEffect(() => {
    const initializePlayers = async () => {
      try {
        const playersData = await loadPlayersData();
        setAllPlayers(playersData);
      } catch (error) {
        console.error('Errore nel caricamento giocatori:', error);
      }
    };

    initializePlayers();
  }, []);

  // Aggiorna i dati del giocatore corrente quando cambia
  useEffect(() => {
    if (auction?.currentPlayer && allPlayers.length > 0) {
      const playerData = allPlayers.find(p => p.Nome === auction.currentPlayer);
      setCurrentPlayerData(playerData || null);
    } else {
      setCurrentPlayerData(null);
    }
  }, [auction?.currentPlayer, allPlayers]);

  const handleJoinAsPlayer = async () => {
    if (!playerName.trim() || !auction) return;
    
    // Verifica se il giocatore è già nei partecipanti
    const isAlreadyParticipant = auction.participants?.some(
      p => p.name === playerName.trim()
    );
    
    if (isAlreadyParticipant) {
      // Se è già partecipante, aggiorna solo lo stato locale
      localStorage.setItem(`auction_${id}_playerName`, playerName.trim());
      localStorage.setItem(`auction_${id}_hasJoined`, 'true');
      setHasJoined(true);
      return;
    }
    
    try {
      await updateDoc(doc(db, "aste", id!), {
        participants: arrayUnion({
          name: playerName.trim(),
          joinedAt: new Date().toISOString(),
        }),
      });
      
      // Salva nel localStorage
      localStorage.setItem(`auction_${id}_playerName`, playerName.trim());
      localStorage.setItem(`auction_${id}_hasJoined`, 'true');
      
      setHasJoined(true);
    } catch (error) {
      console.error("Errore nell'unirsi all'asta:", error);
    }
  };

  const handleBid = async (amount: number) => {
    if (!auction || !hasJoined || auction.isLocked) return;
    
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
    const amount = parseInt(customBid);
    if (isNaN(amount) || amount <= 0) return;
    
    if (!auction || amount <= auction.currentBid) {
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
    } catch (error) {
      console.error("Errore nell'impostare il giocatore:", error);
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
          takenPlayers: arrayUnion(playerName)
        });
      }
    } catch (error) {
      console.error("Errore nel segnare il giocatore come preso:", error);
    }
  };

  const handlePlayerSold = async () => {
    if (!auction?.currentPlayer || !isBanditore) return;
    
    try {
      await updateDoc(doc(db, "aste", id!), {
        takenPlayers: arrayUnion(auction.currentPlayer),
        currentPlayer: null,
        currentBid: 0,
        currentBidder: null,
        isActive: false,
      });
    } catch (error) {
      console.error("Errore nel completare la vendita:", error);
    }
  };

  // Funzioni per la condivisione
  const getAuctionLink = () => {
  if (!id) return '';
  // Forza il link per i partecipanti in modo che sia sempre attivo
  return `${window.location.origin}/auction/${id}?participant=true`;
  };

  const getDisplayLink = () => {
    return `${window.location.origin}/auction/${id}?view=display`;
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

  // Vista Display per proiezione su schermo
  if (isDisplayView) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        backgroundColor: 'background.default',
        p: { xs: 2, sm: 4 },
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header Display */}
        <Paper elevation={3} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
          <Typography variant="h3" component="h1" color="primary" fontWeight="bold" gutterBottom>
            🏆 {auction?.auctionName}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
            {auction?.isLocked ? (
              <Chip icon={<Lock />} label="ASTA BLOCCATA" color="error" size="medium" sx={{ fontSize: '1.1rem', px: 1 }} />
            ) : (
              <Chip icon={<LockOpen />} label="ASTA ATTIVA" color="success" size="medium" sx={{ fontSize: '1.1rem', px: 1 }} />
            )}
            <Chip 
              icon={<Group />} 
              label={`${auction?.participants?.length || 0} Partecipanti`} 
              color="primary" 
              size="medium"
              sx={{ fontSize: '1.1rem', px: 1 }}
            />
          </Box>
        </Paper>

        {/* Main Display Content */}
        <Box sx={{ flex: 1, display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
          {/* Player & Bid Section */}
          <Box sx={{ flex: 2 }}>
            {auction?.currentPlayer ? (
              <Paper elevation={3} sx={{ height: 'fit-content' }}>
                {/* Player Info */}
                <Box sx={{ p: 4, textAlign: 'center', borderBottom: '2px solid', borderColor: 'divider' }}>
                  <Typography variant="h4" color="text.secondary" gutterBottom>
                    GIOCATORE IN ASTA
                  </Typography>
                  <Typography variant="h2" component="div" color="primary" fontWeight="bold" sx={{ mb: 2 }}>
                    {auction.currentPlayer}
                  </Typography>
                  {currentPlayerData && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                      <Chip label={currentPlayerData.Ruolo} color="primary" size="medium" sx={{ fontSize: '1rem', px: 1 }} />
                      <Chip label={currentPlayerData.Squadra} variant="outlined" size="medium" sx={{ fontSize: '1rem', px: 1 }} />
                      <Chip label={`FantaMedia: ${currentPlayerData.FantaMedia.toFixed(1)}`} color="secondary" size="medium" sx={{ fontSize: '1rem', px: 1 }} />
                    </Box>
                  )}
                </Box>

                {/* Bid Info */}
                <Box sx={{ p: 4, textAlign: 'center', backgroundColor: 'primary.main', color: 'primary.contrastText' }}>
                  <Typography variant="h4" gutterBottom sx={{ opacity: 0.9 }}>
                    OFFERTA CORRENTE
                  </Typography>
                  <Typography variant="h1" component="div" fontWeight="bold" sx={{ fontSize: { xs: '3rem', sm: '4rem', md: '5rem' } }}>
                    €{auction.currentBid || 0}
                  </Typography>
                  {auction.currentBidder && (
                    <Typography variant="h5" sx={{ mt: 2, opacity: 0.9 }}>
                      di {auction.currentBidder}
                    </Typography>
                  )}
                </Box>

                {/* Player Stats Display */}
                {currentPlayerData && (
                  <Box sx={{ p: 3, backgroundColor: 'grey.50' }}>
                    <Box sx={{ 
                      display: 'grid', 
                      gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' }, 
                      gap: 2,
                      textAlign: 'center'
                    }}>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">{currentPlayerData.Media.toFixed(1)}</Typography>
                        <Typography variant="body2" color="text.secondary">Media</Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">{currentPlayerData.ConVoto}</Typography>
                        <Typography variant="body2" color="text.secondary">Presenze</Typography>
                      </Box>
                      <Box>
                        <Typography variant="h6" fontWeight="bold" color="success.main">{currentPlayerData.PartiteMaggioriUguali6}</Typography>
                        <Typography variant="body2" color="text.secondary">Voti ≥6</Typography>
                      </Box>
                      {currentPlayerData.Ruolo === 'Portiere' ? (
                        <>
                          <Box>
                            <Typography variant="h6" fontWeight="bold" color="error.main">{currentPlayerData.GoalSubiti}</Typography>
                            <Typography variant="body2" color="text.secondary">Goal Subiti</Typography>
                          </Box>
                          <Box>
                            <Typography variant="h6" fontWeight="bold" color="success.main">{currentPlayerData.RigoriParati}</Typography>
                            <Typography variant="body2" color="text.secondary">Rigori Parati</Typography>
                          </Box>
                        </>
                      ) : (
                        <>
                          <Box>
                            <Typography variant="h6" fontWeight="bold" color="success.main">{currentPlayerData.Reti}</Typography>
                            <Typography variant="body2" color="text.secondary">Goal</Typography>
                          </Box>
                          <Box>
                            <Typography variant="h6" fontWeight="bold" color="info.main">{currentPlayerData.Assist}</Typography>
                            <Typography variant="body2" color="text.secondary">Assist</Typography>
                          </Box>
                        </>
                      )}
                      <Box>
                        <Typography variant="h6" fontWeight="bold" color="warning.main">{currentPlayerData.Gialli}/{currentPlayerData.Rossi}</Typography>
                        <Typography variant="body2" color="text.secondary">Cartellini</Typography>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Paper>
            ) : (
              <Paper elevation={3} sx={{ p: 6, textAlign: 'center', backgroundColor: 'grey.100' }}>
                <Typography variant="h3" color="text.secondary" gutterBottom>
                  Nessun giocatore in asta
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  In attesa che il banditore selezioni un giocatore
                </Typography>
              </Paper>
            )}
          </Box>

          {/* Participants List */}
          <Box sx={{ flex: 1, minWidth: { xs: '100%', lg: '300px' } }}>
            <Paper elevation={3} sx={{ p: 3, height: 'fit-content' }}>
              <Typography variant="h5" gutterBottom textAlign="center" color="primary">
                🎯 Partecipanti ({auction?.participants?.length || 0})
              </Typography>
              {auction?.participants && auction.participants.length > 0 ? (
                <List dense>
                  {auction.participants.map((participant, index) => (
                    <ListItem 
                      key={index}
                      sx={{ 
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1,
                        backgroundColor: 'background.paper'
                      }}
                    >
                      <ListItemIcon>
                        <Person color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={participant.name}
                        primaryTypographyProps={{ fontWeight: 'bold' }}
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography color="text.secondary" textAlign="center" sx={{ py: 3 }}>
                  Nessun partecipante ancora
                </Typography>
              )}
            </Paper>

            {/* Taken Players Display */}
            {auction?.takenPlayers && auction.takenPlayers.length > 0 && (
              <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6" gutterBottom textAlign="center" color="error">
                  ⛔ Giocatori Acquistati ({auction.takenPlayers.length})
                </Typography>
                <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {auction.takenPlayers.map((player, index) => (
                      <Chip
                        key={index}
                        label={player}
                        size="small"
                        color="error"
                        variant="filled"
                      />
                    ))}
                  </Box>
                </Box>
              </Paper>
            )}
          </Box>
        </Box>

        {/* Footer Info */}
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Vista Display - Aggiornamento in tempo reale
          </Typography>
        </Box>
      </Box>
    );
  }

  // Se non è banditore e non ha ancora fatto il join
  if (!isBanditore && !hasJoined) {
    return (
      <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box textAlign="center" mb={3}>
            <SportsEsports color="primary" sx={{ fontSize: 48, mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom color="primary">
              {auction?.auctionName}
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Il tuo nome giocatore"
            variant="outlined"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="Es: Mario Rossi"
            onKeyPress={(e) => e.key === 'Enter' && handleJoinAsPlayer()}
          />
          
          <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleJoinAsPlayer}
            disabled={!playerName.trim()}
            sx={{ py: 2 }}
          >
            Unisciti all'Asta
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
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
                      di {auction.currentBidder}
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

          {/* Bid Buttons - Always visible */}
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
              Fai la tua offerta:
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(6, 1fr)' }, gap: 1, mb: 2 }}>
              {[1, 2, 3, 4, 5, 8, 10, 20, 50, 100].map((amount) => (
                <Button
                  key={amount}
                  variant="contained"
                  size="medium"
                  onClick={() => handleBid(amount)}
                  disabled={auction?.isLocked || !hasJoined}
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
              disabled={auction?.isLocked || !hasJoined}
              sx={{ py: { xs: 1.5, sm: 2 } }}
            >
              Offerta Personalizzata
            </Button>
          </Paper>
        </Box>

        {/* Pannello Banditore */}
        {isBanditore && (
          <Box sx={{ flex: 1, minWidth: { xs: '100%', md: '300px' } }}>
            {/* Ricerca Giocatori */}
            <PlayerSearch
              onPlayerSelect={handlePlayerSelect}
              takenPlayers={auction?.takenPlayers || []}
              onMarkPlayerTaken={handleMarkPlayerTaken}
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
                  variant="outlined"
                  startIcon={<PlayArrow />}
                  onClick={() => setShowPlayerDialog(true)}
                  disabled={auction?.isLocked}
                >
                  Imposta Giocatore
                </Button>

                {auction?.currentPlayer && (
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<Gavel />}
                    onClick={handlePlayerSold}
                    disabled={auction?.isLocked}
                  >
                    Aggiudica a {auction.currentBidder || 'Base'} - €{auction.currentBid}
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
            disabled={!customBid || parseInt(customBid) <= (auction?.currentBid || 0)}
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
    </Container>
  );
};

export default AuctionPage;
