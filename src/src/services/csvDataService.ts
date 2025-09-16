// Servizio per parsare i dati CSV del fantacalcio
import { getPlayerLastYearData } from './fantacalcioApi';

export interface TierData {
  squadra: string;
  tier: number;
}

export interface InfortunioData {
  nome: string;
  squadra: string;
  tipoInfortunio: string;
  rientroMesi: number;
}

export interface TitolareData {
  squadra: string;
  nomeGiocatore: string;
}

export interface IncrocioData {
  squadra: string;
  incroci: Record<string, number>;
}

export interface PlayerEnhancedData {
  tier?: number;
  infortunio?: InfortunioData;
  isTitolare: boolean;
  topIncroci: Array<{ squadra: string; valore: number }>;
  lastYearData?: {
    average: number;
    fantaAverage: number;
    withVote: number;
    isEnough: number;
    goal: number;
    assist: number;
    yellowCard: number;
    redCard: number;
    // Per i portieri
    sufferedGoal: number;
    stoppedPenalty: number;
    role: number; // Per sapere se è portiere
  } | null;
}

class CSVDataService {
  private tiersData: TierData[] = [];
  private infortuniData: InfortunioData[] = [];
  private titolariData: TitolareData[] = [];
  private incrociData: IncrocioData[] = [];
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await Promise.all([
        this.loadTiers(),
        this.loadInfortuni(),
        this.loadTitolari(),
        this.loadIncroci()
      ]);
      this.isInitialized = true;
      console.log('CSV Data Service initialized successfully');
    } catch (error) {
      console.error('Error initializing CSV Data Service:', error);
      throw error;
    }
  }

  private async loadTiers() {
    try {
      const response = await fetch('/tiers.csv');
      const text = await response.text();
      const lines = text.trim().split('\n');
      
      this.tiersData = lines.slice(1).map(line => {
        const [squadra, tierStr] = line.split(',');
        return {
          squadra: squadra.trim(),
          tier: parseInt(tierStr.trim())
        };
      });
      
      console.log('Tiers data loaded:', this.tiersData.length, 'entries');
    } catch (error) {
      console.error('Error loading tiers:', error);
    }
  }

  private async loadInfortuni() {
    try {
      const response = await fetch('/infortuni.csv');
      const text = await response.text();
      const lines = text.trim().split('\n');
      
      this.infortuniData = lines.slice(1).map(line => {
        const [nome, squadra, tipoInfortunio, rientroMesiStr] = line.split(',');
        return {
          nome: nome.trim(),
          squadra: squadra.trim(),
          tipoInfortunio: tipoInfortunio.trim(),
          rientroMesi: parseInt(rientroMesiStr.trim())
        };
      });
      
      console.log('Infortuni data loaded:', this.infortuniData.length, 'entries');
    } catch (error) {
      console.error('Error loading infortuni:', error);
    }
  }

  private async loadTitolari() {
    try {
      const response = await fetch('/titolari_standard.csv');
      const text = await response.text();
      const lines = text.trim().split('\n');
      
      this.titolariData = lines.slice(1).map(line => {
        const [squadra, nomeGiocatore] = line.split(',');
        return {
          squadra: squadra.trim(),
          nomeGiocatore: nomeGiocatore.trim()
        };
      });
      
      console.log('Titolari data loaded:', this.titolariData.length, 'entries');
    } catch (error) {
      console.error('Error loading titolari:', error);
    }
  }

  private async loadIncroci() {
    try {
      const response = await fetch('/incroci.csv');
      const text = await response.text();
      const lines = text.trim().split('\n');
      const header = lines[0].split(',');
      const squadre = header.slice(1); // Rimuovi "Nome" dalla prima colonna
      
      this.incrociData = lines.slice(1).map(line => {
        const values = line.split(',');
        const squadra = values[0].trim();
        const incroci: Record<string, number> = {};
        
        for (let i = 1; i < values.length; i++) {
          const valore = values[i].trim();
          if (valore && !isNaN(parseInt(valore))) {
            incroci[squadre[i - 1].trim()] = parseInt(valore);
          }
        }
        
        return {
          squadra,
          incroci
        };
      });
      
      console.log('Incroci data loaded:', this.incrociData.length, 'entries');
    } catch (error) {
      console.error('Error loading incroci:', error);
    }
  }

  async getPlayerEnhancedData(playerName: string, teamName: string): Promise<PlayerEnhancedData> {
    if (!this.isInitialized) {
      console.warn('CSV Data Service not initialized');
      return {
        isTitolare: false,
        topIncroci: [],
        lastYearData: null
      };
    }

    // Trova tier della squadra
    const tierInfo = this.tiersData.find(t => 
      t.squadra.toLowerCase() === teamName.toLowerCase()
    );

    // Trova infortunio del giocatore
    const infortunio = this.infortuniData.find(i => 
      i.nome.toLowerCase() === playerName.toLowerCase() ||
      i.nome.toLowerCase().includes(playerName.toLowerCase()) ||
      playerName.toLowerCase().includes(i.nome.toLowerCase())
    );

    // Verifica se è titolare
    const isTitolare = this.titolariData.some(t => 
      t.squadra.toLowerCase() === teamName.toLowerCase() &&
      (t.nomeGiocatore.toLowerCase() === playerName.toLowerCase() ||
       t.nomeGiocatore.toLowerCase().includes(playerName.toLowerCase()) ||
       playerName.toLowerCase().includes(t.nomeGiocatore.toLowerCase()))
    );

    // Trova i 3 incroci migliori (valori più bassi, inclusi gli 0)
    const squadraIncroci = this.incrociData.find(s => 
      s.squadra.toLowerCase() === teamName.toLowerCase()
    );
    
    let topIncroci: Array<{ squadra: string; valore: number }> = [];
    if (squadraIncroci) {
      topIncroci = Object.entries(squadraIncroci.incroci)
        .map(([squadra, valore]) => ({ squadra, valore }))
        .filter(item => item.valore >= 0) // Includi valori 0 - sono molto importanti!
        .sort((a, b) => a.valore - b.valore) // Ordine crescente (migliori incroci, 0 è il migliore)
        .slice(0, 3); // Primi 3
    }

    // Carica i dati dell'anno precedente
    let lastYearData: PlayerEnhancedData['lastYearData'] = null;
    try {
      const lastYearPlayer = await getPlayerLastYearData(playerName, teamName);
      
      if (lastYearPlayer) {
        lastYearData = {
          average: lastYearPlayer.average,
          fantaAverage: lastYearPlayer.fantaAverage,
          withVote: lastYearPlayer.withVote,
          isEnough: lastYearPlayer.isEnough,
          goal: lastYearPlayer.goal,
          assist: lastYearPlayer.assist,
          yellowCard: lastYearPlayer.yellowCard,
          redCard: lastYearPlayer.redCard,
          sufferedGoal: lastYearPlayer.sufferedGoal,
          stoppedPenalty: lastYearPlayer.stoppedPenalty,
          role: lastYearPlayer.role,
        };
      } else {
        console.log('No last year data found for player');
      }
    } catch (error) {
      console.warn('Error loading last year data for player:', playerName, error);
    }

    return {
      tier: tierInfo?.tier,
      infortunio,
      isTitolare,
      topIncroci,
      lastYearData
    };
  }

  // Metodi di utilità per controlli diretti
  isPlayerInjured(playerName: string): boolean {
    return this.infortuniData.some(i => 
      i.nome.toLowerCase() === playerName.toLowerCase() ||
      i.nome.toLowerCase().includes(playerName.toLowerCase()) ||
      playerName.toLowerCase().includes(i.nome.toLowerCase())
    );
  }

  getTeamTier(teamName: string): number | undefined {
    const tierInfo = this.tiersData.find(t => 
      t.squadra.toLowerCase() === teamName.toLowerCase()
    );
    return tierInfo?.tier;
  }

  isPlayerStarter(playerName: string, teamName: string): boolean {
    return this.titolariData.some(t => 
      t.squadra.toLowerCase() === teamName.toLowerCase() &&
      (t.nomeGiocatore.toLowerCase() === playerName.toLowerCase() ||
       t.nomeGiocatore.toLowerCase().includes(playerName.toLowerCase()) ||
       playerName.toLowerCase().includes(t.nomeGiocatore.toLowerCase()))
    );
  }
}

// Istanza singleton del servizio
export const csvDataService = new CSVDataService();
