// const BASE = 'https://apifc.azurewebsites.net/Auction';
const BASE = 'https://localhost:7223/Auction';

// Default parameters used across the app; can be exported and overridden later
export const CONFIG = {
  GROUP: '151b462a-d7e6-4449-95e4-94b542f00c81',
  LEAGUE: '07ef9475-ba67-4e33-98b3-af4e764a5fc8',
  BASKET: '4f1d66f3-2564-478a-b07c-e0cf976c2962',
  YEAR: '14',
};

export async function getNextPlayer(role: number, isRandom = true) {
  const url = `${BASE}/GetNextPlayer?group=${CONFIG.GROUP}&league=${CONFIG.LEAGUE}&year=${CONFIG.YEAR}&isRandom=${isRandom}&role=${role}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GetNextPlayer API error ${res.status}`);
  const json = await res.json();
  return json;
}

export async function getTeamName(email: string): Promise<string | null> {
  if (!email) return null;
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

// add to default export
export default Object.assign({}, {
  CONFIG,
  getNextPlayer,
  getTeamName,
  setPlayer,
  getTeams,
});

