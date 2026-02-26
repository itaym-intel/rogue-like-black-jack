import React from 'react';
import ReactDOM from 'react-dom/client';
import { EditorApp } from './components/EditorApp.js';
import './styles/editor.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <EditorApp />
  </React.StrictMode>,
);
