import React, { useEffect, useState } from 'react';
import { Box, CircularProgress, Alert, Table, TableBody, TableCell, TableHead, TableRow, Typography, Paper } from '@mui/material';
import fantacalcioApi from './services/fantacalcioApi';
import type { TeamInfo } from './services/fantacalcioApi';

const TeamsPage: React.FC = () => {
  const [teams, setTeams] = useState<TeamInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fantacalcioApi.getTeams()
      .then((res) => {
        if (!mounted) return;
        setTeams(res);
      })
      .catch((err) => {
        console.error('getTeams error', err);
        if (!mounted) return;
        setError(String(err?.message || err));
      });
    return () => { mounted = false; };
  }, []);

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>
        Squadre
      </Typography>

      {error && <Alert severity="error">Errore nel caricare le squadre: {error}</Alert>}

      {!teams && !error && (
        <Box display="flex" justifyContent="center" alignItems="center" mt={4}>
          <CircularProgress />
        </Box>
      )}

      {teams && (
        <Paper elevation={2} style={{ marginTop: 16, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Squadra</TableCell>
                <TableCell>Proprietario (email)</TableCell>
                <TableCell>Giocatori (nome — prezzo)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {teams.map((t) => (
                <TableRow key={t.owner || t.name}>
                  <TableCell>{t.name}</TableCell>
                  <TableCell>{t.owner || '—'}</TableCell>
                  <TableCell>{t.cost || '—'}</TableCell>
                  <TableCell>
                    {t.players && t.players.length > 0 ? (
                      t.players.map((p, i) => (
                        <div key={i}>{p.name} — {p.price ?? '—'}</div>
                      ))
                    ) : (
                      <span>—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
};

export default TeamsPage;
