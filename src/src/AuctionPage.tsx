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
} from "@mui/icons-material";

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
}

const AuctionPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useState(new URLSearchParams(window.location.search));
  const isBanditore = searchParams.get('banditore') === 'true';
  
  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [hasJoined, setHasJoined] = useState(isBanditore);
  const [customBid, setCustomBid] = useState("");
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [currentPlayerName, setCurrentPlayerName] = useState("");
  const [showPlayerDialog, setShowPlayerDialog] = useState(false);

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
          setAuction(doc.data() as AuctionData);
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
  }, [id]);

  const handleJoinAsPlayer = async () => {
    if (!playerName.trim() || !auction) return;
    
    try {
      await updateDoc(doc(db, "aste", id!), {
        participants: arrayUnion({
          name: playerName.trim(),
          joinedAt: new Date().toISOString(),
        }),
      });
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
          <Button variant="contained" onClick={() => navigate('/')} startIcon={<Home />}>
            Torna alla Home
          </Button>
        </Paper>
      </Container>
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
          </Box>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        {/* Pannello principale asta */}
        <Box sx={{ flex: isBanditore ? 2 : 1 }}>
          {/* Current Player */}
          {auction?.currentPlayer && (
            <Paper elevation={2} sx={{ p: 3, mb: 2, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Giocatore in Asta
              </Typography>
              <Typography variant="h4" component="div" color="primary" fontWeight="bold">
                {auction.currentPlayer}
              </Typography>
            </Paper>
          )}

          {/* Current Bid Display */}
          <Paper elevation={3} sx={{ p: 4, mb: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              Offerta Corrente
            </Typography>
            <Typography variant="h2" component="div" color="primary" fontWeight="bold">
              €{auction?.currentBid || 0}
            </Typography>
            {auction?.currentBidder && (
              <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
                di {auction.currentBidder}
              </Typography>
            )}
          </Paper>

          {/* Bid Buttons */}
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Fai la tua offerta:
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              {[1, 5, 10, 20, 50].map((amount) => (
                <Button
                  key={amount}
                  variant="contained"
                  size="large"
                  onClick={() => handleBid(amount)}
                  disabled={auction?.isLocked}
                  sx={{ py: 2, flex: { xs: '1 1 45%', sm: '1 1 30%', md: '1 1 18%' } }}
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
              disabled={auction?.isLocked}
              sx={{ py: 2 }}
            >
              Offerta Personalizzata
            </Button>
          </Paper>
        </Box>

        {/* Pannello Banditore */}
        {isBanditore && (
          <Box sx={{ flex: 1 }}>
            {/* Controlli Banditore */}
            <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                🔨 Controlli Banditore
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<PlayArrow />}
                  onClick={() => setShowPlayerDialog(true)}
                  disabled={auction?.isLocked}
                >
                  Imposta Giocatore
                </Button>
                
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
        <Button variant="text" onClick={() => navigate('/')} startIcon={<Home />}>
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
    </Container>
  );
};

export default AuctionPage;
