import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  Chip,
  Typography,
  Button,
  Paper,
  Autocomplete
} from '@mui/material';
import type { Player, PlayerRole } from '../types/Player';

interface PlayerSearchProps {
  players?: Player[]; // Ora i players possono essere passati come prop
  onPlayerSelect: (player: Player) => void;
  takenPlayers: string[];
  onMarkPlayerTaken?: (playerName: string) => void;
  onShowTakenDialog?: (role: PlayerRole) => void;
  resetTrigger?: number;
  excludedNames?: string[];
}

const PlayerSearch: React.FC<PlayerSearchProps> = ({
  players: playersProp,
  onPlayerSelect,
  takenPlayers,
  onMarkPlayerTaken,
  onShowTakenDialog,
  resetTrigger,
  excludedNames
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<PlayerRole>('Portiere');
  const [loading, setLoading] = useState(true);

  // Funzione di ricerca locale (estratta da playersService)
  const searchPlayers = (
    playersArray: Player[],
    searchTerm: string,
    selectedRole: PlayerRole | 'Tutti',
    takenPlayers: string[]
  ): Player[] => {
    const excludeSet = new Set(excludedNames || []);
    
    return playersArray
      .filter(player => {
        // Escludi giocatori nella lista di esclusione
        if (excludeSet.has(player.Nome)) {
          return false;
        }
        
        // Filtra per ruolo se non è "Tutti"
        if (selectedRole !== 'Tutti' && player.Ruolo !== selectedRole) {
          return false;
        }
        
        // Filtra per nome se c'è un termine di ricerca
        if (searchTerm && !player.Nome.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        
        return true;
      })
      .map(player => ({
        ...player,
        isTaken: takenPlayers.includes(player.Nome)
      }))
      .sort((a, b) => {
        // Prima i giocatori non presi, poi per media fantasy
        if (a.isTaken !== b.isTaken) {
          return a.isTaken ? 1 : -1;
        }
        return b.FantaMedia - a.FantaMedia;
      });
  };

  useEffect(() => {
    if (playersProp && playersProp.length > 0) {
      // Usa i players passati come prop
      setPlayers(playersProp);
      setLoading(false);
    } else {
      // Fallback: se non vengono passati players, mostra loading
      setLoading(true);
    }
  }, [playersProp]);

  useEffect(() => {
    if (players.length > 0) {
      const filtered = searchPlayers(players, searchTerm, selectedRole, takenPlayers);
      setFilteredPlayers(filtered.slice(0, 50)); // Limite a 50 risultati per performance
    }
  }, [players, searchTerm, selectedRole, takenPlayers, excludedNames]);

  // When parent signals reset, clear the search term
  useEffect(() => {
    if (typeof resetTrigger !== 'undefined') {
      setSearchTerm('');
    }
  }, [resetTrigger]);

  const handlePlayerSelect = (player: Player) => {
    onPlayerSelect(player);
    setSearchTerm(''); // Reset search dopo selezione
  };

  const handleMarkTaken = (playerName: string) => {
    if (onMarkPlayerTaken) {
      onMarkPlayerTaken(playerName);
    }
  };

  if (loading) {
    return <Typography>Caricamento giocatori...</Typography>;
  }

  const availablePlayerNames = filteredPlayers
  .filter(p => !p.isTaken && !(excludedNames || []).includes(p.Nome))
    .map(p => p.Nome);

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Ricerca Giocatori
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Ruolo</InputLabel>
          <Select
            value={selectedRole}
            label="Ruolo"
            onChange={(e) => setSelectedRole(e.target.value as PlayerRole)}
          >
            <MenuItem value="Portiere">Portiere</MenuItem>
            <MenuItem value="Difensore">Difensore</MenuItem>
            <MenuItem value="Centrocampista">Centrocampista</MenuItem>
            <MenuItem value="Attaccante">Attaccante</MenuItem>
          </Select>
        </FormControl>

        <Autocomplete
          size="small"
          sx={{ flex: 1, minWidth: 250 }}
          options={availablePlayerNames}
          inputValue={searchTerm}
          onInputChange={(_, newValue) => setSearchTerm(newValue)}
          onChange={(_, newValue) => {
            if (newValue) {
              const player = filteredPlayers.find(p => p.Nome === newValue);
              if (player) {
                handlePlayerSelect(player);
              }
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Cerca giocatore"
              placeholder="Inizia a digitare il nome..."
            />
          )}
          freeSolo
          clearOnEscape
        />
      </Box>

      {searchTerm && filteredPlayers.length > 0 && (
        <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom>
            Risultati ricerca ({filteredPlayers.length}):
          </Typography>
          <List dense>
            {filteredPlayers.slice(0, 20).map((player) => (
              <ListItem
                key={player.Nome}
                sx={{
                  border: '1px solid #e0e0e0',
                  borderRadius: 1,
                  mb: 1,
                  backgroundColor: player.isTaken ? '#ffebee' : 'white',
                  opacity: player.isTaken ? 0.7 : 1
                }}
              >
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body1" fontWeight="bold">
                        {player.Nome}
                      </Typography>
                      <Chip 
                        label={player.Ruolo} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                      {player.isTaken && (
                        <Chip 
                          label="PRESO" 
                          size="small" 
                          color="error"
                        />
                      )}
                    </Box>
                  }
                  secondary={
                    <Typography variant="body2" color="text.secondary">
                      {player.Squadra} - Media: {player.Media} - FantaMedia: {player.FantaMedia}
                    </Typography>
                  }
                />
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={() => handlePlayerSelect(player)}
                    disabled={player.isTaken}
                  >
                    Seleziona
                  </Button>
                  {!player.isTaken && onMarkPlayerTaken && (
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => handleMarkTaken(player.Nome)}
                    >
                      Segna come preso
                    </Button>
                  )}
                </Box>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {takenPlayers.length > 0 && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ flex: 1 }}>
            Giocatori già presi: {takenPlayers.length}
          </Typography>
          {onShowTakenDialog && (
            <Button size="small" variant="outlined" onClick={() => onShowTakenDialog(selectedRole)}>
              Mostra presi
            </Button>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default PlayerSearch;
