import React from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { App } from './App.jsx';
import './styles.css';

const initial = JSON.parse(document.querySelector('#msd-page-data')?.textContent || '{}');
const root = document.querySelector('#root');

if (root.hasChildNodes()) hydrateRoot(root, <App initial={initial} />);
else createRoot(root).render(<App initial={initial} />);
