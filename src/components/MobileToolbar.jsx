import React, { useState, useRef } from 'react';
import {
  Plus,
  Square,
  Circle,
  Diamond,
  Triangle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import '../styles/MobileToolbar.css';

const MobileToolbar = ({ onShapeSelect }) => {
  const [showMoreShapes, setShowMoreShapes] = useState(false);
  const scrollRef = useRef(null);

  const basicShapes = [
    { id: 'start_end', label: 'Start / End', icon: Square, color: '#8c76f0' },
    { id: 'process', label: 'Process', icon: Square, color: '#5496eb' },
    { id: 'decision', label: 'Decision', icon: Diamond, color: '#ec4899' },
    { id: 'io', label: 'Input / Output', icon: Triangle, color: '#f59e0b' },
    { id: 'text', label: 'Text', icon: MessageSquare, color: '#10b981' },
  ];

  const moreShapes = [
    { id: 'database', label: 'Database', icon: '🗄️', color: '#06b6d4' },
    { id: 'cloud', label: 'Cloud', icon: '☁️', color: '#a855f7' },
    { id: 'document', label: 'Document', icon: '📄', color: '#f87171' },
  ];

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="mobile-toolbar-container">
      <div className="mobile-toolbar-scroll-wrapper">
        <button
          className="mobile-toolbar-scroll-btn scroll-left"
          onClick={() => handleScroll('left')}
          aria-label="Scroll shapes left"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="mobile-toolbar" ref={scrollRef}>
          {basicShapes.map((shape) => {
            const IconComponent = shape.icon;
            return (
              <button
                key={shape.id}
                className="mobile-toolbar-btn"
                onClick={() => onShapeSelect(shape.id)}
                title={shape.label}
                aria-label={`Add ${shape.label}`}
              >
                <IconComponent size={20} color={shape.color} />
                <span className="mobile-toolbar-label">{shape.label}</span>
              </button>
            );
          })}
          <button
            className="mobile-toolbar-btn more-shapes-btn"
            onClick={() => setShowMoreShapes(!showMoreShapes)}
            title="More shapes"
            aria-label="More shapes"
          >
            <Plus size={20} />
            <span className="mobile-toolbar-label">More</span>
          </button>
        </div>
        <button
          className="mobile-toolbar-scroll-btn scroll-right"
          onClick={() => handleScroll('right')}
          aria-label="Scroll shapes right"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {showMoreShapes && (
        <div className="mobile-more-shapes-panel">
          <div className="mobile-more-shapes-grid">
            {moreShapes.map((shape) => (
              <button
                key={shape.id}
                className="mobile-more-shape-btn"
                onClick={() => {
                  onShapeSelect(shape.id);
                  setShowMoreShapes(false);
                }}
                title={shape.label}
                aria-label={`Add ${shape.label}`}
              >
                <span className="mobile-more-shape-icon">{shape.icon}</span>
                <span className="mobile-more-shape-label">{shape.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileToolbar;
