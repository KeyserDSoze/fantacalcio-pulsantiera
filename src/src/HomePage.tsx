import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";
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
      await addDoc(collection(db, "aste"), {
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
            
            <Typography variant="h6" gutterBottom>
              Condividi questo link per far partecipare i giocatori:
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
        )}
      </Paper>
    </Container>
  );
};

export default HomePage;
