export interface Player {
  Nome: string;
  Ruolo: 'Portiere' | 'Difensore' | 'Centrocampista' | 'Attaccante';
  Squadra: string;
  Media: number;
  FantaMedia: number;
  PartiteMaggioriUguali6: number; // >=6
  MotM: number; // Man of the Match
  ConVoto: number; // Con voto
  SenzaVoto: number; // Senza voto
  Gialli: number; // G (Gialli)
  Rossi: number; // R (Rossi)
  Reti: number; // Reti
  Rigori: number; // Rigori segnati
  Assist: number; // Assist
  RigoriSbagliati: number; // Rigori sbagliati
  Autogoal: number; // Autogoal
  GoalSubiti: number; // Goal subiti (per portieri)
  RigoriParati: number; // Rigori parati (per portieri)
  Attivo: boolean; // Attivo
  isTaken?: boolean;
}

export type PlayerRole = 'Portiere' | 'Difensore' | 'Centrocampista' | 'Attaccante';
