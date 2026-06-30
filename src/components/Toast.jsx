import React from 'react';
import { useUIStore } from '../store/useUIStore';
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import './Toast.css';

export default function Toast() {
  const { notifications, removeNotification } = useUIStore();

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="toast-icon success" size={20} />;
      case 'warning':
        return <AlertTriangle className="toast-icon warning" size={20} />;
      case 'error':
        return <AlertCircle className="toast-icon error" size={20} />;
      default:
        return <Info className="toast-icon info" size={20} />;
    }
  };

  return (
    <div className="toast-container">
      {notifications.map((n) => (
        <div key={n.id} className={`toast-card animate-pop ${n.type}`}>
          {getIcon(n.type)}
          <span className="toast-message">{n.message}</span>
          <button className="toast-close" onClick={() => removeNotification(n.id)}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
