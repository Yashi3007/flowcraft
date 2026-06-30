import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/global.css';

// One-time reset to clear previous mock data for a clean project start
if (!localStorage.getItem('canvascraft_db_cleaned_v2')) {
  localStorage.removeItem('canvascraft_folders');
  localStorage.removeItem('canvascraft_diagrams');
  localStorage.setItem('canvascraft_db_cleaned_v2', 'true');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
