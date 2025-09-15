import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import HomePage from "./HomePage";
import AuctionPage from "./AuctionPage";
import TeamsPage from "./TeamsPage";

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/asta/:id" element={<AuctionPage />} />
          <Route path="/teams" element={<TeamsPage />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
