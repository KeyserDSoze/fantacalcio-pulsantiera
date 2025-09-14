import type { Player } from '../types/Player';

let playersData: Player[] = [];

export const loadPlayersData = async (): Promise<Player[]> => {
  if (playersData.length > 0) {
    return playersData;
  }

  try {
    const response = await fetch('/players_Tutti.csv');
    const csvText = await response.text();
    
    const lines = csvText.split('\n');
    
    playersData = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',');
        return {
          Nome: values[0]?.trim() || '',
          Ruolo: values[1]?.trim() as Player['Ruolo'],
          Squadra: values[2]?.trim() || '',
          Media: parseFloat(values[3]) || 0,
          FantaMedia: parseFloat(values[4]) || 0,
          PartiteMaggioriUguali6: parseInt(values[5]) || 0, // >=6
          MotM: parseInt(values[6]) || 0, // MotM
          ConVoto: parseInt(values[7]) || 0, // Con voto
          SenzaVoto: parseInt(values[8]) || 0, // Senza voto
          Gialli: parseInt(values[9]) || 0, // G
          Rossi: parseInt(values[10]) || 0, // R
          Reti: parseInt(values[11]) || 0, // Reti
          Rigori: parseInt(values[12]) || 0, // Rigori
          Assist: parseInt(values[13]) || 0, // Assist
          RigoriSbagliati: parseInt(values[14]) || 0, // Rigori sbagliati
          Autogoal: parseInt(values[15]) || 0, // Autogoal
          GoalSubiti: parseInt(values[16]) || 0, // Goal subiti
          RigoriParati: parseInt(values[17]) || 0, // Rigori parati
          Attivo: values[18]?.trim() === 'True', // Attivo
          isTaken: false
        };
      })
      .filter(player => player.Nome && player.Ruolo && ['Portiere', 'Centrocampista', 'Attaccante'].includes(player.Ruolo));

    return playersData;
  } catch (error) {
    console.error('Errore nel caricamento dei dati giocatori:', error);
    return [];
  }
};

export const searchPlayers = (
  players: Player[], 
  searchTerm: string, 
  selectedRole: string,
  takenPlayers: string[] = []
): Player[] => {
  return players
    .filter(player => {
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
