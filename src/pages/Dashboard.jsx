import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFolderStore } from '../store/useFolderStore';
import { useDiagramStore } from '../store/useDiagramStore';
import { useUIStore } from '../store/useUIStore';
import {
  FolderPlus, FilePlus, Search, Star, Trash2,
  Folder, Database, HardDrive, MoreVertical,
  FolderOpen, Move, Copy, RotateCcw, ChevronRight, ChevronDown, Check, Home, Edit3, Trash, LogOut
} from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  
  // Stores
  const { folders, currentFolderId, setCurrentFolderId, fetchFolders, createFolder, renameFolder, deleteFolder, toggleFavoriteFolder } = useFolderStore();
  const { diagrams, fetchDiagrams, createDiagram, starDiagram, archiveDiagram, deleteDiagram, duplicateDiagram, moveDiagram, saveDiagram } = useDiagramStore();
  const { theme, addNotification } = useUIStore();

  // Local UI state
  const [activeTab, setActiveTab] = useState('recent'); // recent, starred, shared, archive
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCardMenuId, setActiveCardMenuId] = useState(null);
  
  // Folder open/closed states for tree
  const [openFolders, setOpenFolders] = useState({});
  // Drag over states
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  // Modals / Dialog state
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedDiagramToMove, setSelectedDiagramToMove] = useState(null);

  // Fetch initial data
  useEffect(() => {
    fetchFolders();
    fetchDiagrams();
  }, []);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (activeCardMenuId && !event.target.closest('.diagram-card-menu-container')) {
        setActiveCardMenuId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeCardMenuId]);

  // Toggle folder open state in tree
  const toggleFolderOpen = (folderId, e) => {
    e.stopPropagation();
    setOpenFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Actions
  const handleCreateFolder = async () => {
    const name = prompt('Enter new folder name:');
    if (!name || !name.trim()) return;
    try {
      await createFolder(name.trim(), currentFolderId);
      addNotification('Folder created successfully', 'success');
    } catch (err) {
      addNotification('Failed to create folder', 'error');
    }
  };

  const handleCreateDiagram = async () => {
    const name = prompt('Enter diagram name:');
    if (!name || !name.trim()) return;
    try {
      const newDiagram = await createDiagram(name.trim(), currentFolderId);
      addNotification('Diagram created successfully', 'success');
      navigate(`/editor/${newDiagram.id}`);
    } catch (err) {
      addNotification('Failed to create diagram', 'error');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('canvascraft_demo_logged_in');
    localStorage.removeItem('canvascraft_demo_user');
    navigate('/login', { replace: true });
  };

  const handleRenameFolder = async (folderId, oldName, e) => {
    e.stopPropagation();
    const newName = prompt('Rename folder:', oldName);
    if (!newName || !newName.trim() || newName.trim() === oldName) return;
    try {
      await renameFolder(folderId, newName.trim());
      addNotification('Folder renamed', 'success');
    } catch (err) {
      addNotification('Rename failed', 'error');
    }
  };

  const handleDeleteFolder = async (folderId, name, e) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${name}"? All subfolders will be deleted, and diagrams inside will move to the root.`)) return;
    try {
      await deleteFolder(folderId);
      addNotification('Folder deleted', 'success');
    } catch (err) {
      addNotification('Failed to delete folder', 'error');
    }
  };

  const handleRenameDiagram = async (diag, e) => {
    e.stopPropagation();
    setActiveCardMenuId(null);
    const newName = prompt('Rename diagram:', diag.name);
    if (!newName || !newName.trim() || newName.trim() === diag.name) return;
    try {
      await saveDiagram(diag.id, { name: newName.trim() });
      addNotification('Diagram renamed', 'success');
    } catch (err) {
      addNotification('Failed to rename diagram', 'error');
    }
  };

  const handleDuplicateDiagram = async (diagId, e) => {
    e.stopPropagation();
    setActiveCardMenuId(null);
    try {
      await duplicateDiagram(diagId);
      addNotification('Diagram duplicated', 'success');
    } catch (err) {
      addNotification('Failed to duplicate diagram', 'error');
    }
  };

  const handleArchiveDiagram = async (diagId, isArchive, e) => {
    e.stopPropagation();
    setActiveCardMenuId(null);
    try {
      await archiveDiagram(diagId, isArchive);
      addNotification(isArchive ? 'Diagram moved to archive' : 'Diagram restored', 'success');
    } catch (err) {
      addNotification('Operation failed', 'error');
    }
  };

  const handleDeleteDiagram = async (diagId, name, e) => {
    e.stopPropagation();
    setActiveCardMenuId(null);
    if (!confirm(`Are you permanently deleting "${name}"? This cannot be undone.`)) return;
    try {
      await deleteDiagram(diagId);
      addNotification('Diagram permanently deleted', 'success');
    } catch (err) {
      addNotification('Failed to delete diagram', 'error');
    }
  };

  // Drag and Drop Diagram into Folder Row
  const handleDragStart = (e, diagramId) => {
    e.dataTransfer.setData('text/plain', diagramId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    if (dragOverFolderId !== folderId) {
      setDragOverFolderId(folderId);
    }
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault();
    setDragOverFolderId(null);
    const diagramId = e.dataTransfer.getData('text/plain');
    if (!diagramId) return;

    try {
      await moveDiagram(diagramId, targetFolderId);
      addNotification('Diagram relocated successfully', 'success');
    } catch (err) {
      addNotification('Failed to move diagram', 'error');
    }
  };

  // Breadcrumbs Generator
  const getBreadcrumbs = () => {
    if (!currentFolderId) return [{ id: null, name: 'Root Space' }];
    
    const crumbs = [];
    let activeFolder = folders.find(f => f.id === currentFolderId);
    
    while (activeFolder) {
      crumbs.unshift(activeFolder);
      activeFolder = folders.find(f => f.id === activeFolder.parentId);
    }
    
    crumbs.unshift({ id: null, name: 'Root Space' });
    return crumbs;
  };

  // Recursive Sidebar Folder Renderer
  const renderFolderTree = (parentId = null) => {
    const currentLevelFolders = folders.filter(f => f.parentId === parentId);
    if (currentLevelFolders.length === 0) return null;

    return (
      <div className="folder-child-container">
        {currentLevelFolders.map(folder => {
          const hasChildren = folders.some(f => f.parentId === folder.id);
          const isOpen = !!openFolders[folder.id];
          const isActive = currentFolderId === folder.id;
          const isDragOver = dragOverFolderId === folder.id;

          return (
            <div key={folder.id}>
              <div 
                className={`folder-row ${isActive ? 'active' : ''} ${isDragOver ? 'drag-over' : ''}`}
                onClick={() => setCurrentFolderId(folder.id)}
                onDragOver={(e) => handleDragOver(e, folder.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, folder.id)}
              >
                <div className="folder-info">
                  {hasChildren ? (
                    <button 
                      className="toast-close" 
                      onClick={(e) => toggleFolderOpen(folder.id, e)}
                      style={{ padding: 2, marginRight: 2 }}
                    >
                      {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  ) : (
                    <span style={{ width: 18 }} />
                  )}
                  {folder.icon === 'database' ? (
                    <Database size={16} style={{ color: 'var(--accent-purple)' }} />
                  ) : (
                    <Folder size={16} style={{ color: 'var(--accent-blue)' }} />
                  )}
                  <span className="folder-name">{folder.name}</span>
                </div>

                <div className="folder-actions-trigger" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={(e) => handleRenameFolder(folder.id, folder.name, e)} 
                    className="toast-close" 
                    title="Rename"
                    style={{ padding: 2 }}
                  >
                    <Edit3 size={12} />
                  </button>
                  <button 
                    onClick={(e) => handleDeleteFolder(folder.id, folder.name, e)} 
                    className="toast-close" 
                    title="Delete"
                    style={{ padding: 2, color: '#ef4444' }}
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>
              {isOpen && renderFolderTree(folder.id)}
            </div>
          );
        })}
      </div>
    );
  };

  // Filter and Search Logic
  const filteredDiagrams = diagrams.filter(diag => {
    // 1. Tab filtering
    if (activeTab === 'starred' && !diag.favorite) return false;
    if (activeTab === 'shared' && !diag.shared) return false;
    if (activeTab === 'archive') {
      if (!diag.archived) return false;
    } else {
      if (diag.archived) return false;
      // 2. Folder filtering (ignore folder constraints in Starred/Shared tabs for quick global search)
      if (activeTab !== 'starred' && activeTab !== 'shared') {
        if (diag.folderId !== currentFolderId) return false;
      }
    }

    // 3. Search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchesName = diag.name.toLowerCase().includes(q);
      const matchesTag = diag.tags.some(t => t.toLowerCase().includes(q));
      return matchesName || matchesTag;
    }

    return true;
  });

  // Storage Used Stats
  const activeDiagramsCount = diagrams.filter(d => !d.archived).length;
  const storagePercentage = Math.min((activeDiagramsCount / 20) * 100, 100);

  return (
    <div className="dash-container">
      {/* SIDEBAR NAVIGATION */}
      <aside className="dash-sidebar">
        <div className="dash-sidebar-header">
          <div className="dash-sidebar-logo">
            <svg className="auth-logo-icon" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <span className="dash-sidebar-title">FlowCraft</span>
          </div>
        </div>

        <div className="dash-sidebar-scroll">
          {/* Quick Add buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button onClick={handleCreateDiagram} className="btn btn-primary" style={{ justifyContent: 'flex-start' }}>
              <FilePlus size={18} /> New Diagram
            </button>
            <button onClick={handleCreateFolder} className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
              <FolderPlus size={18} /> New Folder
            </button>
          </div>

          {/* Folder Hierarchy Tree */}
          <div>
            <div className="folder-tree-title">
              <span>Folders</span>
              <FolderPlus 
                size={14} 
                style={{ cursor: 'pointer' }} 
                onClick={handleCreateFolder} 
                title="Create folder at current level" 
              />
            </div>
            
            {/* Root Folder Row */}
            <div 
              className={`folder-row ${currentFolderId === null ? 'active' : ''}`}
              onClick={() => setCurrentFolderId(null)}
              onDragOver={(e) => handleDragOver(e, null)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, null)}
            >
              <div className="folder-info">
                <Home size={16} />
                <span>Root Space</span>
              </div>
            </div>

            {renderFolderTree(null)}
          </div>

          {/* Disk Space Stats */}
          <div className="storage-card">
            <h4 className="storage-title">
              <HardDrive size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Workspace Storage
            </h4>
            <div className="storage-bar-outer">
              <div className="storage-bar-inner" style={{ width: `${storagePercentage}%` }}></div>
            </div>
            <div className="storage-text">
              <span>{activeDiagramsCount} of 20 files</span>
              <span>{Math.round(storagePercentage)}%</span>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN LAYOUT AREA */}
      <main className="dash-main">
        {/* Topbar Search */}
        <header className="dash-topbar">
          <div className="dash-search-container">
            <Search size={18} className="auth-input-icon" style={{ left: 16 }} />
            <input 
              type="text" 
              className="dash-search-input" 
              placeholder="Search diagram name or tags..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="dash-session-actions">
            <div className="dash-local-badge">Demo workspace</div>
            <button className="dash-logout-btn" onClick={handleLogout} title="Sign out">
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        {/* Dashboard Pages Scroll */}
        <div className="dash-content">
          {/* Greeting Title */}
          <div className="dash-welcome animate-fade">
            <div className="dash-welcome-text">
              <h1>FlowCraft Workspace</h1>
              <p>Create elegant designs and architecture blueprints.</p>
            </div>
          </div>

          {/* Breadcrumbs Navigation */}
          {currentFolderId && (
            <div className="dash-tabs" style={{ border: 'none', padding: '0 0 10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              {getBreadcrumbs().map((crumb, idx) => (
                <React.Fragment key={crumb.id || 'root'}>
                  {idx > 0 && <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
                  <span 
                    style={{ 
                      cursor: 'pointer', 
                      fontWeight: idx === getBreadcrumbs().length - 1 ? '600' : 'normal',
                      color: idx === getBreadcrumbs().length - 1 ? 'var(--accent-purple)' : 'var(--text-muted)'
                    }}
                    onClick={() => setCurrentFolderId(crumb.id)}
                  >
                    {crumb.name}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Tab Filter bar */}
          <div className="dash-tabs animate-fade">
            <button 
              className={`dash-tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => { setActiveTab('recent'); }}
            >
              Files
            </button>
            <button 
              className={`dash-tab-btn ${activeTab === 'starred' ? 'active' : ''}`}
              onClick={() => { setActiveTab('starred'); }}
            >
              Starred
            </button>
            <button 
              className={`dash-tab-btn ${activeTab === 'shared' ? 'active' : ''}`}
              onClick={() => { setActiveTab('shared'); }}
            >
              Shared
            </button>
            <button 
              className={`dash-tab-btn ${activeTab === 'archive' ? 'active' : ''}`}
              onClick={() => { setActiveTab('archive'); }}
            >
              Archive/Trash
            </button>
          </div>

          {/* Diagram Cards Grid */}
          {filteredDiagrams.length > 0 ? (
            <div className="diagram-grid">
              {filteredDiagrams.map((diag) => {
                const isStarred = diag.favorite;
                const isMenuOpen = activeCardMenuId === diag.id;

                // Miniature SVG Canvas Thumbnail Generator
                const renderThumbnailMini = () => {
                  const nodes = diag.diagramJson?.nodes || [];
                  const edges = diag.diagramJson?.edges || [];
                  
                  if (nodes.length === 0) {
                    return <div className="diagram-card-canvas-mock">Empty File</div>;
                  }

                  // Find bounding box to fit the mini svg
                  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                  nodes.forEach(n => {
                    if (n.x < minX) minX = n.x;
                    if (n.y < minY) minY = n.y;
                    if (n.x + n.width > maxX) maxX = n.x + n.width;
                    if (n.y + n.height > maxY) maxY = n.y + n.height;
                  });

                  const padding = 30;
                  minX -= padding;
                  minY -= padding;
                  maxX += padding;
                  maxY += padding;

                  const width = maxX - minX;
                  const height = maxY - minY;

                  return (
                    <svg 
                      width="100%" 
                      height="100%" 
                      viewBox={`${minX} ${minY} ${width} ${height}`} 
                      style={{ padding: '10px' }}
                    >
                      {/* Render edges first */}
                      {edges.map((e, idx) => {
                        const sNode = nodes.find(n => n.id === e.sourceNodeId);
                        const tNode = nodes.find(n => n.id === e.targetNodeId);
                        if (!sNode || !tNode) return null;

                        const getPortCoord = (node, port) => {
                          switch (port) {
                            case 'top': return { x: node.x + node.width / 2, y: node.y };
                            case 'right': return { x: node.x + node.width, y: node.y + node.height / 2 };
                            case 'bottom': return { x: node.x + node.width / 2, y: node.y + node.height };
                            case 'left': return { x: node.x, y: node.y + node.height / 2 };
                            default: return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
                          }
                        };

                        const p1 = getPortCoord(sNode, e.sourcePort);
                        const p2 = getPortCoord(tNode, e.targetPort);

                        return (
                          <line 
                            key={idx} 
                            x1={p1.x} 
                            y1={p1.y} 
                            x2={p2.x} 
                            y2={p2.y} 
                            stroke={e.stroke || '#8c76f0'} 
                            strokeWidth={2} 
                          />
                        );
                      })}

                      {/* Render nodes */}
                      {nodes.map(n => {
                        if (n.type === 'circle') {
                          return (
                            <ellipse 
                              key={n.id} 
                              cx={n.x + n.width / 2} 
                              cy={n.y + n.height / 2} 
                              rx={n.width / 2} 
                              ry={n.height / 2} 
                              fill={n.fill} 
                              stroke={n.stroke} 
                              strokeWidth={1.5} 
                            />
                          );
                        }
                        if (n.type === 'diamond') {
                          const pts = `${n.x + n.width / 2},${n.y} ${n.x + n.width},${n.y + n.height / 2} ${n.x + n.width / 2},${n.y + n.height} ${n.x},${n.y + n.height / 2}`;
                          return <polygon key={n.id} points={pts} fill={n.fill} stroke={n.stroke} strokeWidth={1.5} />;
                        }
                        return (
                          <rect 
                            key={n.id} 
                            x={n.x} 
                            y={n.y} 
                            width={n.width} 
                            height={n.height} 
                            rx={n.type === 'rectangle' ? 6 : 0} 
                            fill={n.fill} 
                            stroke={n.stroke} 
                            strokeWidth={1.5} 
                          />
                        );
                      })}
                    </svg>
                  );
                };

                return (
                  <div 
                    key={diag.id} 
                    className="diagram-card glass-panel animate-fade"
                    draggable={activeTab !== 'archive'}
                    onDragStart={(e) => handleDragStart(e, diag.id)}
                    onClick={() => {
                      if (activeTab !== 'archive') {
                        navigate(`/editor/${diag.id}`);
                      }
                    }}
                  >
                    {/* SVG preview */}
                    <div className="diagram-card-preview">
                      {renderThumbnailMini()}

                      {/* Favorite Button */}
                      {activeTab !== 'archive' && (
                        <button 
                          className={`diagram-star-btn ${isStarred ? 'starred' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            starDiagram(diag.id);
                          }}
                        >
                          <Star size={16} />
                        </button>
                      )}
                    </div>

                    {/* Meta info */}
                    <div className="diagram-card-details">
                      <div className="diagram-card-top-row">
                        <span className="diagram-card-name" title={diag.name}>{diag.name}</span>
                        
                        {/* More Action Trigger */}
                        <div className="diagram-card-menu-container" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className="diagram-card-menu-btn"
                            onClick={() => setActiveCardMenuId(isMenuOpen ? null : diag.id)}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Options dropdown */}
                          {isMenuOpen && (
                            <div className="diagram-card-dropdown animate-pop">
                              {diag.archived ? (
                                <>
                                  <button onClick={(e) => handleArchiveDiagram(diag.id, false, e)} className="dropdown-item">
                                    <RotateCcw size={14} /> Restore File
                                  </button>
                                  <button onClick={(e) => handleDeleteDiagram(diag.id, diag.name, e)} className="dropdown-item" style={{ color: '#ef4444' }}>
                                    <Trash2 size={14} /> Delete Permanently
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button onClick={(e) => handleRenameDiagram(diag, e)} className="dropdown-item">
                                    <Edit3 size={14} /> Rename Diagram
                                  </button>
                                  <button onClick={(e) => handleDuplicateDiagram(diag.id, e)} className="dropdown-item">
                                    <Copy size={14} /> Duplicate File
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDiagramToMove(diag);
                                      setShowMoveModal(true);
                                      setActiveCardMenuId(null);
                                    }} 
                                    className="dropdown-item"
                                  >
                                    <Move size={14} /> Move to Folder
                                  </button>
                                  <button onClick={(e) => handleArchiveDiagram(diag.id, true, e)} className="dropdown-item" style={{ color: '#ef4444' }}>
                                    <Trash2 size={14} /> Send to Archive
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="diagram-card-meta">
                        <span className="diagram-tags">
                          {diag.tags.map((t, idx) => (
                            <span key={idx} className="diagram-tag">{t}</span>
                          ))}
                        </span>
                        <span>
                          {new Date(diag.updatedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State */
            <div className="empty-state glass-panel animate-fade">
              <FolderOpen size={48} className="empty-state-icon" />
              <h3>No Diagrams Found</h3>
              <p>Create a diagram template, add a directory folder, or refine your search query details.</p>
              {activeTab !== 'archive' && (
                <button onClick={handleCreateDiagram} className="btn btn-primary">
                  <FilePlus size={16} /> Create Diagram
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MOVE TO FOLDER MODAL OVERLAY */}
      {showMoveModal && selectedDiagramToMove && (
        <div className="modal-overlay">
          <div className="modal-card glass-panel animate-pop">
            <h3 className="modal-title">
              <Move size={20} style={{ color: 'var(--accent-purple)' }} /> Move "{selectedDiagramToMove.name}" to:
            </h3>
            <p className="modal-desc">Choose a destination directory from the workspace folders:</p>
            
            <div 
              style={{ 
                maxHeight: '260px', 
                overflowY: 'auto', 
                border: '1px solid var(--border-light)', 
                borderRadius: '10px',
                padding: '8px',
                marginBottom: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}
            >
              {/* Root row choice */}
              <div 
                className={`folder-row ${selectedDiagramToMove.folderId === null ? 'active' : ''}`}
                style={{ padding: '10px' }}
                onClick={() => {
                  moveDiagram(selectedDiagramToMove.id, null);
                  addNotification('Moved to Root Space', 'success');
                  setShowMoveModal(false);
                  setSelectedDiagramToMove(null);
                }}
              >
                <div className="folder-info">
                  <Home size={16} />
                  <span>Root Space (Uncategorized)</span>
                </div>
                {selectedDiagramToMove.folderId === null && <Check size={16} style={{ color: 'var(--accent-purple)' }} />}
              </div>

              {/* Loop folders */}
              {folders.map(f => (
                <div 
                  key={f.id}
                  className={`folder-row ${selectedDiagramToMove.folderId === f.id ? 'active' : ''}`}
                  style={{ padding: '10px' }}
                  onClick={() => {
                    moveDiagram(selectedDiagramToMove.id, f.id);
                    addNotification(`Moved to folder "${f.name}"`, 'success');
                    setShowMoveModal(false);
                    setSelectedDiagramToMove(null);
                  }}
                >
                  <div className="folder-info">
                    <Folder size={16} style={{ color: 'var(--accent-blue)' }} />
                    <span>{f.name}</span>
                  </div>
                  {selectedDiagramToMove.folderId === f.id && <Check size={16} style={{ color: 'var(--accent-purple)' }} />}
                </div>
              ))}
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                onClick={() => { setShowMoveModal(false); setSelectedDiagramToMove(null); }} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
