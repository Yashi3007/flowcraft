import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Toast from './components/Toast';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Login from './pages/Login';

const isDemoLoggedIn = () => localStorage.getItem('canvascraft_demo_logged_in') === 'true';

const ProtectedRoute = ({ children }) => {
  return isDemoLoggedIn() ? children : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/editor/:id" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={isDemoLoggedIn() ? '/dashboard' : '/login'} replace />} />
      </Routes>

      <Toast />
    </BrowserRouter>
  );
}
