import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './standalone/App';

const root = document.getElementById('root');
if (!root) throw new Error('Communication MFE root element is missing.');
createRoot(root).render(<StrictMode><App /></StrictMode>);
