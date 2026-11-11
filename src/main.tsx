import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import GrandPiano from './homeworks/GrandPiano88/App';

export default function App() {
  return <GrandPiano />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
