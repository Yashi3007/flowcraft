import React from 'react';
import { ChevronLeft } from 'lucide-react';
import '../styles/MobilePanel.css';

const MobilePanel = ({ title, children, onClose, isOpen }) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="mobile-panel-overlay" onClick={onClose} aria-hidden="true" />
      <div className="mobile-panel-drawer">
        <div className="mobile-panel-header">
          <button
            className="mobile-panel-close-btn"
            onClick={onClose}
            aria-label={`Close ${title} panel`}
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="mobile-panel-title">{title}</h2>
          <div className="mobile-panel-spacer" />
        </div>
        <div className="mobile-panel-content">{children}</div>
      </div>
    </>
  );
};

export default MobilePanel;
