// a interface por cima do canvas do jogo
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useUI } from './store.js';
import { TitleScreen } from './ui/TitleScreen.jsx';
import { Hud } from './ui/Hud.jsx';
import { Panels } from './ui/Panels.jsx';
import { DialogCard } from './ui/DialogCard.jsx';
import { TouchControls } from './ui/TouchControls.jsx';
import { FadeCard } from './ui/FadeCard.jsx';

// o CSS esconde e mostra partes da tela pelas classes do <body> (ex.: body.talking .side.bottom)
function useBodyClasses() {
  const flags = useUI(useShallow((s) => ({ touch: s.touch, playing: s.playing, talking: s.talking, portrait: s.portrait })));
  useEffect(() => {
    for (const [name, on] of Object.entries(flags)) document.body.classList.toggle(name, on);
  }, [flags]);
}

export default function App() {
  useBodyClasses();
  return (
    <>
      <TitleScreen />
      <Hud />
      <Panels />
      <DialogCard />
      <TouchControls />
      <FadeCard />
    </>
  );
}
