import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { setupMobileZoomPrevention } from './utils/preventZoom';

setupMobileZoomPrevention();

createRoot(document.getElementById('root')!).render(<App />);

