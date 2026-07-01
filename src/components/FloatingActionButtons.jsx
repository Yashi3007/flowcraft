import React, { useState } from 'react';
import {
  Layout,
  Settings,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Copy,
  Trash2,
  X,
  Menu,
} from 'lucide-react';
import '../styles/FloatingActionButtons.css';

const FloatingActionButtons = ({
  onPropertiesClick,
  onLayersClick,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  onResetZoom,
  onDuplicate,
  onDelete,
  onShapesClick,
  zoom = 100,
  canDelete = false,
  canDuplicate = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showZoom, setShowZoom] = useState(false);

  const handleMenuToggle = () => {
    setShowMenu(!showMenu);
  };

  const handleZoomToggle = () => {
    setShowZoom(!showZoom);
  };

  return (
    <div className="floating-action-buttons">
      {/* Shapes Button - Top Right */}
      <button
        className="fab-button fab-shapes"
        onClick={onShapesClick}
        title="Shapes Library"
        aria-label="Open shapes library"
      >
        <Layout size={24} />
      </button>

      {/* Zoom Controls - Bottom Right */}
      <div className="fab-group fab-zoom-group">
        {showZoom && (
          <>
            <button
              className="fab-button fab-zoom-action"
              onClick={onZoomIn}
              title="Zoom In"
              aria-label="Zoom in"
            >
              <ZoomIn size={20} />
            </button>
            <button
              className="fab-button fab-zoom-action"
              onClick={onZoomOut}
              title="Zoom Out"
              aria-label="Zoom out"
            >
              <ZoomOut size={20} />
            </button>
            <button
              className="fab-button fab-zoom-action"
              onClick={onFitScreen}
              title="Fit to Screen"
              aria-label="Fit to screen"
            >
              <Maximize2 size={20} />
            </button>
            <button
              className="fab-button fab-zoom-action"
              onClick={onResetZoom}
              title="Reset Zoom"
              aria-label="Reset zoom"
            >
              <RotateCcw size={20} />
            </button>
          </>
        )}
        <button
          className={`fab-button fab-zoom-toggle ${showZoom ? 'open' : ''}`}
          onClick={handleZoomToggle}
          title="Zoom Controls"
          aria-label="Toggle zoom controls"
        >
          {showZoom ? <X size={22} /> : <ZoomIn size={22} />}
        </button>
      </div>

      {/* Properties Button - Left Side (middle) */}
      <button
        className="fab-button fab-properties"
        onClick={onPropertiesClick}
        title="Properties"
        aria-label="Open properties panel"
      >
        <Settings size={24} />
      </button>

      {/* Layers Button - Left Side (bottom) */}
      <button
        className="fab-button fab-layers"
        onClick={onLayersClick}
        title="Layers"
        aria-label="Open layers panel"
      >
        <Layers size={24} />
      </button>

      {/* Edit Actions Menu - Left Side (top) */}
      <div className="fab-group fab-menu-group">
        {showMenu && (
          <>
            {canDuplicate && (
              <button
                className="fab-button fab-menu-action"
                onClick={() => {
                  onDuplicate();
                  setShowMenu(false);
                }}
                title="Duplicate"
                aria-label="Duplicate selected"
              >
                <Copy size={20} />
              </button>
            )}
            {canDelete && (
              <button
                className="fab-button fab-menu-action fab-danger"
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                title="Delete"
                aria-label="Delete selected"
              >
                <Trash2 size={20} />
              </button>
            )}
          </>
        )}
        <button
          className={`fab-button fab-menu-toggle ${showMenu ? 'open' : ''}`}
          onClick={handleMenuToggle}
          title="Edit Menu"
          aria-label="Toggle edit menu"
        >
          {showMenu ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </div>
  );
};

export default FloatingActionButtons;
