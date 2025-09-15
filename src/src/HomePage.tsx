import React, { useState } from "react";
import { db } from "./firebase";
import { doc, setDoc } from "firebase/firestore";
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import { ContentCopy, WhatsApp, SportsEsports } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

function generateGUID() {
  // Versione compatibile con TypeScript
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] % 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const HomePage: React.FC = () => {
  const [auctionName, setAuctionName] = useState("");
  const [auctionId, setAuctionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleCreateAuction = async () => {
    if (!auctionName.trim()) {
      setError("Inserisci il nome dell'asta");
      return;
    }
    setError(null);
    setLoading(true);
    const id = generateGUID();
    try {
      await setDoc(doc(db, "aste", id), {
        id,
        auctionName: auctionName.trim(),
        createdAt: new Date().toISOString(),
        currentBid: 0,
        currentBidder: null,
        currentPlayer: null,
        isActive: false,
        isLocked: false,
        participants: [],
        createdBy: "banditore", // Chi crea è sempre il banditore
      });
      setAuctionId(id);
    } catch (e) {
      setError("Errore nella creazione dell'asta");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getAuctionLink = () => `${window.location.origin}/asta/${auctionId}`;
  const getWhatsappLink = () => `https://wa.me/?text=${encodeURIComponent("Partecipa all'asta Fantacalcio: " + getAuctionLink())}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getAuctionLink());
  };

  const goToAuction = () => {
    if (auctionId) {
      navigate(`/asta/${auctionId}?banditore=true`);
    }
  };

  const getDisplayLink = () => {
    return `${window.location.origin}/asta/${auctionId}?view=display`;
  };

  const copyDisplayToClipboard = () => {
    navigator.clipboard.writeText(getDisplayLink());
    alert('Link vista display copiato negli appunti!');
  };

  const getDisplayWhatsappLink = () => {
    const message = `🖥️ Vista Display per l'asta "${auctionName}" - Perfetto per proiettare su schermo!\n\n${getDisplayLink()}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  };

  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
        <Box textAlign="center" mb={3}>
          <SportsEsports color="primary" sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h4" component="h1" gutterBottom color="primary">
            Pulsantiera Fantacalcio
          </Typography>
        </Box>

        {!auctionId ? (
          <Box>
            <TextField
              fullWidth
              label="Nome dell'asta"
              variant="outlined"
              value={auctionName}
              onChange={(e) => setAuctionName(e.target.value)}
              disabled={loading}
              sx={{ mb: 2 }}
              placeholder="Es: Asta Fantacalcio 2025"
              onKeyPress={(e) => e.key === 'Enter' && handleCreateAuction()}
            />
            
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            
            <Button
              fullWidth
              variant="contained"
              size="large"
              onClick={handleCreateAuction}
              disabled={loading || !auctionName.trim()}
              sx={{ py: 2 }}
            >
              {loading ? (
                <>
                  <CircularProgress size={20} sx={{ mr: 1 }} />
                  Creazione in corso...
                </>
              ) : (
                "Crea l'Asta"
              )}
            </Button>
          </Box>
        ) : (
          <Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              🎉 Asta creata con successo!
            </Alert>
            
            {/* Sezione Partecipanti */}
            <Box sx={{ mb: 3, p: 3, backgroundColor: 'primary.light', borderRadius: 2, border: '1px solid', borderColor: 'primary.main' }}>
              <Box sx={{ backgroundColor: 'background.paper', p: 3, borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  👥 Link per Partecipanti
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                  Condividi questo link con i giocatori che parteciperanno all'asta.
                </Typography>
              
              <TextField
                fullWidth
                value={getAuctionLink()}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        onClick={copyToClipboard}
                        startIcon={<ContentCopy />}
                        size="small"
                      >
                        Copia
                      </Button>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  startIcon={<WhatsApp />}
                  onClick={() => window.open(getWhatsappLink(), '_blank')}
                  sx={{ py: 2 }}
                >
                  Condividi su WhatsApp
                </Button>
                
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={goToAuction}
                  sx={{ py: 2 }}
                >
                  Inizia come Banditore
                </Button>
              </Box>
            </Box>
          </Box>

            {/* Vista Display per Proiezione */}
            <Box sx={{ mt: 3, p: 3, backgroundColor: 'grey.50', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🖥️ Vista Display per Proiezione
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                Perfetto per proiettare l'asta su TV o schermo. Mostra giocatore, offerte e statistiche in tempo reale.
              </Typography>
              
              <TextField
                fullWidth
                value={getDisplayLink()}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Button
                        onClick={copyDisplayToClipboard}
                        startIcon={<ContentCopy />}
                        size="small"
                      >
                        Copia
                      </Button>
                    </InputAdornment>
                  ),
                }}
                variant="outlined"
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<WhatsApp />}
                  onClick={() => window.open(getDisplayWhatsappLink(), '_blank')}
                  sx={{ py: 1.5 }}
                >
                  Condividi Vista
                </Button>
                
                <Button
                  fullWidth
                  variant="text"
                  onClick={() => window.open(getDisplayLink(), '_blank')}
                  sx={{ py: 1.5 }}
                >
                  Apri Vista Display
                </Button>
              </Box>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default HomePage;
