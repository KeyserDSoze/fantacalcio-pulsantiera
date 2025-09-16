const BASE = 'https://apifc.azurewebsites.net/Auction';
// const BASE = 'https://localhost:7223/Auction';

// Default parameters used across the app; will be set dynamically from group configuration
export let CONFIG = {
  GROUP: '',
  LEAGUE: '',
  BASKET: '',
  YEAR: '',
};

// Funzione per aggiornare la configurazione dinamicamente
export function updateConfig(newConfig: Partial<typeof CONFIG>) {
  CONFIG = { ...CONFIG, ...newConfig };
}

// Funzione per validare che il CONFIG sia stato configurato
function validateConfig(): void {
  if (!CONFIG.GROUP || !CONFIG.LEAGUE || !CONFIG.BASKET || !CONFIG.YEAR) {
    throw new Error('CONFIG non configurato. Assicurati di aver selezionato un gruppo valido nell\'asta.');
  }
}

// Types for Group API response
export interface VoteLeagueSetting {
  g: number; // Goal
  p: number; // Penalty
  s: number; // SufferedGoal
  d: number; // StoppedPenalty
  w: number; // WrongedPenalty
  o: number; // OwnGoal
  a: number; // Assist
  y: number; // YellowCard
  r: number; // RedCard
  j: number; // Injury
  m: number; // ManOfTheMatch
}

export interface LeagueSetting {
  v: Record<string, VoteLeagueSetting>; // Votes by Role
  s: number; // StartingMoney
  d: number; // DelayedDay
  c: number; // CancelledDay
  g: number; // PointForFirstGoal
  t: number; // PointForNextGoal
  o: number; // PointForOwnGoal
  f: number; // DifferencePointForOwnGoal
  p: number; // PointInHome
  a: number; // PointForVictory
  b: number; // PointForDefeat
  h: number; // PointForDraw
  "3": number; // PointForStrongDefense
  "4": number; // PointForStrongDefense4
  "5": number; // PointForStrongDefense5
  gp: number; // PointForGoodPeople
  l: number; // PointForCleanSheet
  m: number; // MoneyForGoal
  n: number; // MoneyForSufferedGoal
  q: boolean; // RandomAuction
  vp: boolean; // RankWithValuePoints
  mk: number; // Market
}

export interface AnnualLeague {
  y: number; // Year
  t: number; // Type
  s: LeagueSetting; // Settings
}

export interface League {
  i: string; // Id
  n: string; // Name
  m: boolean; // IsMain
  t: number; // Type
  y: AnnualLeague[]; // Years
  b: string[]; // BasketsId
}

export interface AnnualTeam {
  n: string; // Name
  o: string; // Owner
  a: string[] | null; // AdditionalOwners
}

export interface YearlyBasket {
  y: number; // Year
  t: AnnualTeam[]; // Teams
}

export interface Basket {
  i: string; // Id
  n: string; // Name
  y: YearlyBasket[]; // Years
}

export interface UserOfAGroup {
  u: string; // Username
  e: string; // Email
  r: number; // Role
}

export interface Group {
  i: string; // Id
  n: string; // Name
  l: League[]; // Leagues
  u: UserOfAGroup[]; // Users
  b: Basket[]; // Baskets
}

// Funzione per ottenere i dettagli del gruppo
export async function getGroup(groupId: string): Promise<Group | null> {
  if (!groupId) throw new Error('GroupId è richiesto');
  
  const url = `${BASE}/GetGroup?groupId=${encodeURIComponent(groupId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) return null; // Gruppo non trovato
    throw new Error(`GetGroup API error ${res.status}`);
  }
  
  const group: Group = await res.json();
  return group;
}

export async function getNextPlayer(role: number, isRandom = true) {
  validateConfig();
  const url = `${BASE}/GetNextPlayer?group=${CONFIG.GROUP}&league=${CONFIG.LEAGUE}&year=${CONFIG.YEAR}&isRandom=${isRandom}&role=${role}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GetNextPlayer API error ${res.status}`);
  const json = await res.json();
  return json;
}

export async function getTeamName(email: string): Promise<string | null> {
  if (!email) return null;
  validateConfig();
  const url = `${BASE}/GetTeamName?group=${CONFIG.GROUP}&basket=${CONFIG.BASKET}&year=${CONFIG.YEAR}&email=${encodeURIComponent(email)}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('GetTeamName returned non-ok', res.status);
    return null;
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const body = await res.json();
      return body.teamName || body.name || (typeof body === 'string' ? body : null);
    } catch (e) {
      return null;
    }
  }

  const txt = await res.text();
  return txt && txt.trim() ? txt.trim() : null;
}

export async function setPlayer(email: string, playerName: string, price: number, isRandom = false): Promise<boolean> {
  if (!email) throw new Error('Missing email');
  validateConfig();
  const url = `${BASE}/SetPlayer?email=${encodeURIComponent(email)}&group=${CONFIG.GROUP}&league=${CONFIG.LEAGUE}&basket=${CONFIG.BASKET}&year=${CONFIG.YEAR}&playerName=${encodeURIComponent(playerName)}&price=${price}&isRandom=${isRandom}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText || 'API error');
    throw new Error(text || `SetPlayer API error ${res.status}`);
  }

  // Try to interpret boolean-like responses
  try {
    const t = await res.text();
    const trimmed = t.trim();
    if (trimmed.length === 0) return true;
    if (trimmed === 'false' || trimmed === 'False' || trimmed === '0') return false;
    if (trimmed === 'true' || trimmed === 'True' || trimmed === '1') return true;
    // otherwise assume success
    return true;
  } catch (e) {
    return true;
  }
}

// (default export consolidated at end of file)

// --- GetAllPlayers API and types --------------------------------------------
export interface ApiStatPlayerGame {
  d: number; // day
  v: number; // vote
  p: number; // points
}

export interface ApiRealTeam {
  n: string; // name
  a: string; // abbreviation
}

export interface ApiStatPlayer {
  // StatPlayer properties
  z: number; // Summatory
  f: number; // FantaSummatory
  v: number; // WithVote
  q: number; // WithoutVote
  s: number; // WithSpecial
  g: number; // Goal
  p: number; // Penalty
  u: number; // Assist
  j: number; // StoppedPenalty
  m: number; // SufferedGoal
  w: number; // WrongedPenalty
  o: number; // OwnGoal
  y: number; // YellowCard
  d: number; // RedCard
  e: number; // IsEnough
  c: number; // ManOfTheMatch
  ij: number; // Injured
  lg?: ApiStatPlayerGame[]; // AllGames
  
  // RealPlayer properties
  n: string; // Name
  t: ApiRealTeam; // RealTeam
  r: number; // Role (0=GK,1=DEF,2=MID,3=ATT)
  a: boolean; // IsActive
  vh: boolean; // Visible
}

export interface StatPlayer {
  // Computed properties
  average: number;
  fantaAverage: number;
  
  // Raw stats
  summatory: number;
  fantaSummatory: number;
  withVote: number;
  withoutVote: number;
  withSpecial: number;
  goal: number;
  penalty: number;
  assist: number;
  stoppedPenalty: number;
  sufferedGoal: number;
  wrongedPenalty: number;
  ownGoal: number;
  yellowCard: number;
  redCard: number;
  isEnough: number;
  manOfTheMatch: number;
  injured: number;
  allGames?: { day: number; vote: number; points: number }[];
  
  // Player info
  name: string;
  teamName: string;
  teamAbbr: string;
  role: number;
  isActive: boolean;
  visible: boolean;
}

// --- GetTeams API and types -------------------------------------------------
export interface ApiTeamPlayer {
  p: number; // price
  s?: number;
  k?: number;
  n: string; // player name
  t?: { n?: string; a?: string }; // team info
  r?: number; //the role (0=GK,1=DEF,2=MID,3=ATT)
  a?: boolean; // is active
  vh?: boolean;
  [key: string]: any;
}

export interface ApiTeamInfo {
  name: string; 
  owner: string;
  cost: number;
  players: ApiTeamPlayer[];
}

export interface TeamInfo {
  name: string; 
  owner: string;
  cost: number;
  players: TeamPlayer[];
}

export interface TeamPlayer {
  name: string;
  price: number;
  squadName?: string;
  squadAbbr?: string;
  isActive?: boolean;
  role: number;
}

export async function getTeams(): Promise<TeamInfo[]> {
  validateConfig();
  const url = `${BASE}/GetTeams?group=${CONFIG.GROUP}&basket=${CONFIG.BASKET}&year=${CONFIG.YEAR}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GetTeams API error ${res.status}`);
  const json = await res.json() as ApiTeamInfo[];

  return (json || []).map(item => {
    const players: TeamPlayer[] = (item.players || []).map(pp => ({
      name: pp.n,
      price: typeof pp.p === 'number' ? pp.p : parseInt(String(pp.p || '0')) || 0,
      squadName: pp.t?.n,
      squadAbbr: pp.t?.a,
      isActive: !!pp.a,
      role: pp.r || 0,
    }));

    return {
      name: item.name,
      owner: item.owner,
      cost: item.cost,
      players,
    } as TeamInfo;
  });
}

export async function getAllPlayers(customYear?: string): Promise<StatPlayer[]> {
  validateConfig();
  const year = customYear || CONFIG.YEAR;
  const url = `${BASE}/GetAllPlayers?year=${year}`;
  console.log('Calling getAllPlayers API:', url);
  
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GetAllPlayers API error ${res.status}`);
  const json = await res.json() as ApiStatPlayer[];
  
  console.log('getAllPlayers response for year', year, ':', json?.length || 0, 'players');

  return (json || []).map(player => {
    const average = player.v > 0 ? player.z / player.v : 0;
    const fantaAverage = player.v > 0 ? player.f / player.v : 0;
    
    return {
      // Computed properties
      average,
      fantaAverage,
      
      // Raw stats
      summatory: player.z,
      fantaSummatory: player.f,
      withVote: player.v,
      withoutVote: player.q,
      withSpecial: player.s,
      goal: player.g,
      penalty: player.p,
      assist: player.u,
      stoppedPenalty: player.j,
      sufferedGoal: player.m,
      wrongedPenalty: player.w,
      ownGoal: player.o,
      yellowCard: player.y,
      redCard: player.d,
      isEnough: player.e,
      manOfTheMatch: player.c,
      injured: player.ij,
      allGames: player.lg?.map(game => ({
        day: game.d,
        vote: game.v,
        points: game.p
      })),
      
      // Player info
      name: player.n,
      teamName: player.t.n,
      teamAbbr: player.t.a,
      role: player.r,
      isActive: player.a,
      visible: player.vh,
    } as StatPlayer;
  });
}

// Funzione helper per ottenere i giocatori dell'anno precedente
export async function getAllPlayersLastYear(): Promise<StatPlayer[]> {
  validateConfig();
  const currentYear = parseInt(CONFIG.YEAR);
  const lastYear = (currentYear - 1).toString();
  console.log('Fetching players for last year:', lastYear, '(current year:', CONFIG.YEAR, ')');
  
  const players = await getAllPlayers(lastYear);
  console.log('Last year players fetched:', players.length);
  
  return players;
}

// Funzione helper per ottenere i dati di un giocatore dall'anno precedente
export async function getPlayerLastYearData(playerName: string, teamName: string): Promise<StatPlayer | null> {
  try {
    console.log('Getting last year data for:', playerName, 'from team:', teamName);
    console.log('Current CONFIG.YEAR:', CONFIG.YEAR);
    
    const lastYearPlayers = await getAllPlayersLastYear();
    console.log('Total last year players found:', lastYearPlayers.length);
    
    // Debug: mostra alcuni giocatori per verificare la struttura
    if (lastYearPlayers.length > 0) {
      console.log('Sample last year player:', lastYearPlayers[0]);
    }
    
    const player = lastYearPlayers.find(p => 
      p.name.toLowerCase() === playerName.toLowerCase() &&
      p.teamName.toLowerCase() === teamName.toLowerCase()
    );
    
    console.log('Found player match:', player ? 'YES' : 'NO');
    if (player) {
      console.log('Player data:', player);
    } else {
      // Debug: cerca giocatori con nome simile
      const similarPlayers = lastYearPlayers.filter(p => 
        p.name.toLowerCase().includes(playerName.toLowerCase()) ||
        playerName.toLowerCase().includes(p.name.toLowerCase())
      );
      console.log('Similar players found:', similarPlayers.length, similarPlayers.map(p => ({ name: p.name, team: p.teamName })));
    }
    
    return player || null;
  } catch (error) {
    console.warn('Error fetching last year data:', error);
    return null;
  }
}

// add to default export
export default Object.assign({}, {
  CONFIG,
  updateConfig,
  getGroup,
  getNextPlayer,
  getTeamName,
  setPlayer,
  getTeams,
  getAllPlayers,
  getAllPlayersLastYear,
  getPlayerLastYearData,
});

