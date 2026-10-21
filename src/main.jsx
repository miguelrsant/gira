// entrada do app: monta a interface em React e liga o motor do jogo
import './styles/game.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { boot } from './game/main.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
boot();
