import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDiagramStore } from '../store/useDiagramStore';
import { useUIStore } from '../store/useUIStore';
import { 
  ArrowLeft, Undo, Redo, Save, FileDown, Plus, Minus, Maximize, 
  Trash2, Copy, Layers, AlignCenter, AlignLeft, Bold, Square, 
  Circle as CircleIcon, HelpCircle, Activity, Sparkles, Check, Database as DBIcon, Cloud as CloudIcon, Type
} from 'lucide-react';
import confetti from 'canvas-confetti';
import './Editor.css';

// Preset HSL Pastel Color Palettes for premium shape styling
const PASTEL_PALETTE = [
  { name: 'Lavender', fill: '#d6cbfb', stroke: '#8c76f0' },
  { name: 'Sky Blue', fill: '#cbe3fc', stroke: '#5496eb' },
  { name: 'Rose', fill: '#fcd5e8', stroke: '#ec4899' },
  { name: 'Mint', fill: '#cbf3f0', stroke: '#0d9488' },
  { name: 'Amber', fill: '#fef0cd', stroke: '#854d0e' },
  { name: 'Peach', fill: '#fddcc3', stroke: '#ea580c' },
  { name: 'Teal', fill: '#d1f4ff', stroke: '#0284c7' },
  { name: 'White', fill: '#ffffff', stroke: '#94a3b8' }
];

export default function Editor() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Stores
  const { 
    activeDiagram, openDiagram, closeActiveDiagram, updateCanvasJson, 
    undo, redo, undoStack, redoStack, saveDiagram, loading 
  } = useDiagramStore();
  const { settings, addNotification } = useUIStore();

  // Local View States
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);

  // Connection Tool State
  const [drawingEdge, setDrawingEdge] = useState(null); // { sourceNodeId, sourcePort, currentX, currentY }
  const [hoveredPort, setHoveredPort] = useState(null); // { nodeId, port }

  // Dragging / Resizing Node State
  const [draggingNode, setDraggingNode] = useState(null); // { nodeId, offset: { x, y } }
  const [resizingNode, setResizingNode] = useState(null); // { nodeId, handle: 'NW'|'NE'|'SE'|'SW', startWidth, startHeight, startX, startY, clientStart: { x, y } }
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Inline Text Editor State
  const [editingTextNodeId, setEditingTextNodeId] = useState(null);
  const [editingTextVal, setEditingTextVal] = useState('');

  // Auto-save feedback state
  const [saveStatus, setSaveStatus] = useState('saved'); // saved | saving

  const canvasRef = useRef(null);
  const textEditorRef = useRef(null);

  // Fetch Diagram on Load
  useEffect(() => {
    if (id) {
      openDiagram(id).catch(() => {
        addNotification('Diagram not found', 'error');
        navigate('/dashboard');
      });
    }
    return () => closeActiveDiagram();
  }, [id]);

  // Debounced auto-save to localStorage/mock DB
  useEffect(() => {
    if (!activeDiagram) return;
    
    // Skip if autosave is disabled in preferences
    if (!settings.autosave) return;

    setSaveStatus('saving');
    const timer = setTimeout(async () => {
      try {
        await saveDiagram(activeDiagram.id, {
          diagramJson: activeDiagram.diagramJson
        });
        setSaveStatus('saved');
      } catch (err) {
        setSaveStatus('saved');
        console.error('Autosave failed:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeDiagram?.diagramJson]);

  // Keyboard Event Listeners for Undo, Redo, Delete
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInputActive = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName);
      if (isInputActive) return;

      // 1. Delete element
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeId) {
          deleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          deleteEdge(selectedEdgeId);
        }
      }

      // 2. Undo (Ctrl + Z)
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        addNotification('Undone', 'info');
      }

      // 3. Redo (Ctrl + Y)
      if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        addNotification('Redone', 'info');
      }

      // 4. Duplicate (Ctrl + D)
      if (e.ctrlKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        if (selectedNodeId) {
          duplicateNode(selectedNodeId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, selectedEdgeId, activeDiagram]);

  // Close text editor on click outside
  useEffect(() => {
    const handleTextEditorClickOutside = (e) => {
      if (editingTextNodeId && textEditorRef.current && !textEditorRef.current.contains(e.target)) {
        saveTextEdit();
      }
    };
    document.addEventListener('mousedown', handleTextEditorClickOutside);
    return () => document.removeEventListener('mousedown', handleTextEditorClickOutside);
  }, [editingTextNodeId, editingTextVal]);

  if (!activeDiagram) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyItems: 'center', width: '100%' }}>
        <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Activity className="saving" size={32} style={{ animation: 'spin 2s linear infinite' }} />
          <p style={{ marginTop: '10px' }}>Loading workspace blueprints...</p>
        </div>
      </div>
    );
  }

  const { nodes = [], edges = [] } = activeDiagram.diagramJson || {};

  // HELPERS: Coordinate Transformations
  const getCanvasMouseCoords = (e) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom
    };
  };

  // HELPERS: Port locations relative to node geometry
  const getPortCoord = (node, port) => {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    switch (port) {
      case 'top': return { x: cx, y: node.y };
      case 'right': return { x: node.x + node.width, y: cy };
      case 'bottom': return { x: cx, y: node.y + node.height };
      case 'left': return { x: node.x, y: cy };
      default: return { x: cx, y: cy };
    }
  };

  // HELPERS: Curved Bezier Path Drawer
  const getBezierCurve = (p1, p2, sPort, tPort) => {
    const dx = Math.abs(p2.x - p1.x) * 0.45;
    const dy = Math.abs(p2.y - p1.y) * 0.45;
    
    let cp1x = p1.x;
    let cp1y = p1.y;
    let cp2x = p2.x;
    let cp2y = p2.y;

    if (sPort === 'right') cp1x += dx;
    else if (sPort === 'left') cp1x -= dx;
    else if (sPort === 'bottom') cp1y += dy;
    else if (sPort === 'top') cp1y -= dy;

    if (tPort === 'right') cp2x += dx;
    else if (tPort === 'left') cp2x -= dx;
    else if (tPort === 'bottom') cp2y += dy;
    else if (tPort === 'top') cp2y -= dy;

    return `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  };

  // HELPERS: Cylinder (Database) SVG Path
  const getDatabasePath = (n) => {
    const rx = n.width / 2;
    const ry = Math.min(15, n.height / 4);
    return `M ${n.x} ${n.y + ry} 
            L ${n.x} ${n.y + n.height - ry} 
            A ${rx} ${ry} 0 0 0 ${n.x + n.width} ${n.y + n.height - ry} 
            L ${n.x + n.width} ${n.y + ry} 
            A ${rx} ${ry} 0 1 0 ${n.x} ${n.y + ry}
            M ${n.x} ${n.y + ry}
            A ${rx} ${ry} 0 0 0 ${n.x + n.width} ${n.y + ry}`;
  };

  // HELPERS: Cloud SVG Path
  const getCloudPath = (n) => {
    const w = n.width;
    const h = n.height;
    const x = n.x;
    const y = n.y;
    return `M ${x + w * 0.25} ${y + h * 0.8}
            A ${w * 0.16} ${h * 0.16} 0 0 1 ${x + w * 0.1} ${y + h * 0.5}
            A ${w * 0.18} ${h * 0.18} 0 0 1 ${x + w * 0.4} ${y + h * 0.2}
            A ${w * 0.22} ${h * 0.22} 0 0 1 ${x + w * 0.78} ${y + h * 0.3}
            A ${w * 0.18} ${h * 0.18} 0 0 1 ${x + w * 0.85} ${y + h * 0.75}
            A ${w * 0.15} ${h * 0.15} 0 0 1 ${x + w * 0.25} ${y + h * 0.8} Z`;
  };

  // HELPERS: Document SVG Path
  const getDocumentPath = (n) => {
    const w = n.width;
    const h = n.height;
    const x = n.x;
    const y = n.y;
    const ry = 8;
    return `M ${x} ${y} 
            L ${x + w} ${y} 
            L ${x + w} ${y + h - ry} 
            Q ${x + w * 0.75} ${y + h - ry * 2} ${x + w * 0.5} ${y + h - ry} 
            T ${x} ${y + h - ry} 
            Z`;
  };

  // CRUD: Nodes
  const addNode = (type) => {
    // Generate new node centered on canvas viewport
    const cx = (canvasRef.current?.clientWidth / 2 - pan.x) / zoom - 60;
    const cy = (canvasRef.current?.clientHeight / 2 - pan.y) / zoom - 30;

    let initialWidth = 120;
    let initialHeight = 60;
    let initialText = 'New Node';

    switch (type) {
      case 'start_end':
        initialWidth = 120;
        initialHeight = 50;
        initialText = 'Start / End';
        break;
      case 'process':
        initialWidth = 120;
        initialHeight = 60;
        initialText = 'Process';
        break;
      case 'decision':
        initialWidth = 90;
        initialHeight = 90;
        initialText = 'Decision';
        break;
      case 'io':
        initialWidth = 125;
        initialHeight = 55;
        initialText = 'Input / Output';
        break;
      case 'database':
        initialWidth = 90;
        initialHeight = 85;
        initialText = 'Database';
        break;
      case 'cloud':
        initialWidth = 120;
        initialHeight = 75;
        initialText = 'Cloud Server';
        break;
      case 'document':
        initialWidth = 100;
        initialHeight = 80;
        initialText = 'Document';
        break;
      case 'text':
        initialWidth = 120;
        initialHeight = 40;
        initialText = 'Double-click to write';
        break;
      default:
        initialWidth = 120;
        initialHeight = 60;
        initialText = 'Node';
    }

    const newNode = {
      id: `node-${Math.random().toString(36).substring(2, 9)}`,
      x: Math.max(20, cx),
      y: Math.max(20, cy),
      width: initialWidth,
      height: initialHeight,
      type,
      text: initialText,
      fill: type === 'text' ? 'transparent' : '#ffffff',
      stroke: type === 'text' ? 'transparent' : '#8c76f0',
      strokeWidth: type === 'text' ? 0 : 2,
      strokeDasharray: 'none',
      color: '#2b2c3d',
      fontSize: 14,
      fontWeight: 'normal',
      align: 'center'
    };

    updateCanvasJson({
      nodes: [...nodes, newNode],
      edges
    });
    setSelectedNodeId(newNode.id);
    setSelectedEdgeId(null);
  };

  const deleteNode = (nodeId) => {
    const nextNodes = nodes.filter(n => n.id !== nodeId);
    // Automatically delete associated edges
    const nextEdges = edges.filter(e => e.sourceNodeId !== nodeId && e.targetNodeId !== nodeId);
    updateCanvasJson({ nodes: nextNodes, edges: nextEdges });
    setSelectedNodeId(null);
  };

  const duplicateNode = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const copy = {
      ...node,
      id: `node-${Math.random().toString(36).substring(2, 9)}`,
      x: node.x + 30,
      y: node.y + 30
    };
    updateCanvasJson({
      nodes: [...nodes, copy],
      edges
    });
    setSelectedNodeId(copy.id);
  };

  // CRUD: Edges
  const deleteEdge = (edgeId) => {
    const nextEdges = edges.filter(e => e.id !== edgeId);
    updateCanvasJson({ nodes, edges: nextEdges });
    setSelectedEdgeId(null);
  };

  // INLINE TEXT EDITOR METHODS
  const handleNodeDoubleClick = (node, e) => {
    e.stopPropagation();
    setEditingTextNodeId(node.id);
    setEditingTextVal(node.text);
  };

  const saveTextEdit = () => {
    if (!editingTextNodeId) return;
    const nextNodes = nodes.map(n => 
      n.id === editingTextNodeId ? { ...n, text: editingTextVal } : n
    );
    updateCanvasJson({ nodes: nextNodes, edges });
    setEditingTextNodeId(null);
  };

  // UPDATE STYLE ATTRIBUTES
  const updateSelectedNodeStyle = (updates) => {
    if (!selectedNodeId) return;
    const nextNodes = nodes.map(n => 
      n.id === selectedNodeId ? { ...n, ...updates } : n
    );
    updateCanvasJson({ nodes: nextNodes, edges });
  };

  const updateSelectedEdgeStyle = (updates) => {
    if (!selectedEdgeId) return;
    const nextEdges = edges.map(e => 
      e.id === selectedEdgeId ? { ...e, ...updates } : e
    );
    updateCanvasJson({ nodes, edges: nextEdges });
  };

  // LAYER ARRANGE
  const bringToFront = () => {
    if (!selectedNodeId) return;
    const item = nodes.find(n => n.id === selectedNodeId);
    const filtered = nodes.filter(n => n.id !== selectedNodeId);
    updateCanvasJson({
      nodes: [...filtered, item],
      edges
    });
  };

  const sendToBack = () => {
    if (!selectedNodeId) return;
    const item = nodes.find(n => n.id === selectedNodeId);
    const filtered = nodes.filter(n => n.id !== selectedNodeId);
    updateCanvasJson({
      nodes: [item, ...filtered],
      edges
    });
  };

  // INTERACTIVE MOUSE EVENTS (CANVAS ACTIONS)
  const handleCanvasMouseDown = (e) => {
    // Space or Middle mouse triggers Panning
    if (e.button === 1 || e.button === 2 || e.code === 'Space' || e.target === canvasRef.current || e.target.tagName === 'svg') {
      setIsPanning(true);
      setPanStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y
      });
      // Clear selections
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    const mousePos = getCanvasMouseCoords(e);

    // 1. Dragging Node
    if (draggingNode) {
      let nextX = mousePos.x - draggingNode.offset.x;
      let nextY = mousePos.y - draggingNode.offset.y;

      // Snapping to grid coordinate options
      if (settings.gridSnapping) {
        nextX = Math.round(nextX / settings.gridSize) * settings.gridSize;
        nextY = Math.round(nextY / settings.gridSize) * settings.gridSize;
      }

      const nextNodes = nodes.map(n => 
        n.id === draggingNode.nodeId ? { ...n, x: nextX, y: nextY } : n
      );
      // Keep store updated without polluting undo stack repeatedly (just update state directly)
      updateCanvasJson({ nodes: nextNodes, edges }, true);
      return;
    }

    // 2. Resizing Node
    if (resizingNode) {
      const node = nodes.find(n => n.id === resizingNode.nodeId);
      if (!node) return;

      let newWidth = node.width;
      let newHeight = node.height;
      let newX = node.x;
      let newY = node.y;

      const deltaX = (e.clientX - resizingNode.clientStart.x) / zoom;
      const deltaY = (e.clientY - resizingNode.clientStart.y) / zoom;

      if (resizingNode.handle.includes('E')) {
        newWidth = Math.max(40, resizingNode.startWidth + deltaX);
      }
      if (resizingNode.handle.includes('S')) {
        newHeight = Math.max(40, resizingNode.startHeight + deltaY);
      }
      if (resizingNode.handle.includes('W')) {
        const potentialWidth = resizingNode.startWidth - deltaX;
        if (potentialWidth >= 40) {
          newWidth = potentialWidth;
          newX = resizingNode.startX + deltaX;
        }
      }
      if (resizingNode.handle.includes('N')) {
        const potentialHeight = resizingNode.startHeight - deltaY;
        if (potentialHeight >= 40) {
          newHeight = potentialHeight;
          newY = resizingNode.startY + deltaY;
        }
      }

      // Snap resizing sizing
      if (settings.gridSnapping) {
        newWidth = Math.round(newWidth / settings.gridSize) * settings.gridSize;
        newHeight = Math.round(newHeight / settings.gridSize) * settings.gridSize;
        newX = Math.round(newX / settings.gridSize) * settings.gridSize;
        newY = Math.round(newY / settings.gridSize) * settings.gridSize;
      }

      const nextNodes = nodes.map(n => 
        n.id === node.id ? { ...n, x: newX, y: newY, width: newWidth, height: newHeight } : n
      );
      updateCanvasJson({ nodes: nextNodes, edges }, true);
      return;
    }

    // 3. Drawing connecting line
    if (drawingEdge) {
      setDrawingEdge({
        ...drawingEdge,
        currentX: mousePos.x,
        currentY: mousePos.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    // If we finished dragging/resizing, finalize the canvas state (this saves the current state to the undo stack)
    if (draggingNode || resizingNode) {
      updateCanvasJson({ nodes, edges }); // push once to undo stack on mouse release
    }

    // Finalize edge connections
    if (drawingEdge) {
      if (hoveredPort && hoveredPort.nodeId !== drawingEdge.sourceNodeId) {
        const newEdge = {
          id: `edge-${Math.random().toString(36).substring(2, 9)}`,
          sourceNodeId: drawingEdge.sourceNodeId,
          sourcePort: drawingEdge.sourcePort,
          targetNodeId: hoveredPort.nodeId,
          targetPort: hoveredPort.port,
          stroke: '#8c76f0',
          strokeWidth: 2,
          strokeDasharray: 'none'
        };
        updateCanvasJson({
          nodes,
          edges: [...edges, newEdge]
        });
        addNotification('Nodes connected!', 'success');
      }
    }

    setDraggingNode(null);
    setResizingNode(null);
    setDrawingEdge(null);
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const scale = 0.08;
    let nextZoom = zoom + (e.deltaY < 0 ? scale : -scale);
    nextZoom = Math.min(2.5, Math.max(0.25, nextZoom));
    setZoom(parseFloat(nextZoom.toFixed(2)));
  };

  // EXPORT UTILITIES
  const getExportSvgSource = () => {
    const svgEl = document.getElementById('canvas-svg-element');
    if (!svgEl || !canvasRef.current) return null;

    const rect = canvasRef.current.getBoundingClientRect();
    const width = Math.max(1, Math.ceil(rect.width));
    const height = Math.max(1, Math.ceil(rect.height));
    const clone = svgEl.cloneNode(true);
    const rootStyles = getComputedStyle(document.documentElement);

    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
    clone.removeAttribute('class');
    clone.removeAttribute('style');

    clone.querySelectorAll('*').forEach((element) => {
      ['fill', 'stroke', 'style'].forEach((attr) => {
        const value = element.getAttribute(attr);
        if (!value || !value.includes('var(')) return;
        element.setAttribute(
          attr,
          value.replace(/var\((--[^)]+)\)/g, (_, variableName) => (
            rootStyles.getPropertyValue(variableName).trim() || '#000000'
          ))
        );
      });
    });

    const background = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    background.setAttribute('width', '100%');
    background.setAttribute('height', '100%');
    background.setAttribute('fill', rootStyles.getPropertyValue('--canvas-bg').trim() || '#ffffff');

    const viewportGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    viewportGroup.setAttribute('transform', `translate(${pan.x} ${pan.y}) scale(${zoom})`);

    Array.from(clone.childNodes).forEach((child) => {
      if (child.nodeName.toLowerCase() === 'defs') return;
      viewportGroup.appendChild(child);
    });

    const defs = Array.from(clone.childNodes).filter((child) => child.nodeName.toLowerCase() === 'defs');
    clone.replaceChildren(background, ...defs, viewportGroup);

    return {
      source: new XMLSerializer().serializeToString(clone),
      width,
      height
    };
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeDiagram));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeDiagram.name}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    confetti({ particleCount: 80, spread: 60, colors: ['#c0b3f5', '#a3c9f8', '#fcb8d2'] });
    addNotification('Blueprint configuration downloaded!', 'success');
  };

  const handleExportSVG = () => {
    const exportSvg = getExportSvgSource();
    if (!exportSvg) return;

    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(exportSvg.source);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `${activeDiagram.name}.svg`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    confetti({ particleCount: 80, spread: 60, colors: ['#c0b3f5', '#a3c9f8', '#fcb8d2'] });
    addNotification('Vector blueprint exported successfully!', 'success');
  };

  const handleExportPNG = () => {
    const exportSvg = getExportSvgSource();
    if (!exportSvg) return;

    const svgBlob = new Blob([exportSvg.source], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = exportSvg.width * 2;
      canvas.height = exportSvg.height * 2;

      const ctx = canvas.getContext('2d');
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim() || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(svgUrl);

      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = canvas.toDataURL('image/png');
      downloadAnchor.download = `${activeDiagram.name}.png`;
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      confetti({ particleCount: 80, spread: 60, colors: ['#c0b3f5', '#a3c9f8', '#fcb8d2'] });
      addNotification('PNG blueprint exported successfully!', 'success');
    };

    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      addNotification('PNG export failed', 'error');
    };

    image.src = svgUrl;
  };

  const handleManualSave = async () => {
    try {
      await saveDiagram(activeDiagram.id, {
        diagramJson: activeDiagram.diagramJson
      });
      addNotification('Diagram saved successfully!', 'success');
      confetti({ particleCount: 40, spread: 30, colors: ['#c0b3f5', '#a3c9f8'] });
    } catch (e) {
      addNotification('Save failed', 'error');
    }
  };

  // Selected Elements references
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedEdge = edges.find(e => e.id === selectedEdgeId);

  return (
    <div className="editor-container">
      {/* HEADER TOOLBAR */}
      <header className="editor-header">
        <div className="editor-header-left">
          <Link to="/dashboard" className="zoom-btn" title="Back to Dashboard">
            <ArrowLeft size={18} />
          </Link>
          <input 
            type="text" 
            className="editor-title-input" 
            value={activeDiagram.name}
            onChange={(e) => saveDiagram(activeDiagram.id, { name: e.target.value })}
            placeholder="Untitled Blueprint"
          />
          {saveStatus === 'saved' ? (
            <div className="save-status-badge">
              <div className="save-status-dot"></div>
              <span>Saved</span>
            </div>
          ) : (
            <div className="save-status-badge">
              <div className="save-status-dot saving"></div>
              <span>Saving...</span>
            </div>
          )}
        </div>

        {/* History action controls */}
        <div className="editor-header-center">
          <button 
            className="zoom-btn" 
            onClick={undo} 
            disabled={undoStack.length === 0} 
            title="Undo (Ctrl+Z)"
            style={{ opacity: undoStack.length === 0 ? 0.4 : 1 }}
          >
            <Undo size={16} />
          </button>
          <button 
            className="zoom-btn" 
            onClick={redo} 
            disabled={redoStack.length === 0} 
            title="Redo (Ctrl+Y)"
            style={{ opacity: redoStack.length === 0 ? 0.4 : 1 }}
          >
            <Redo size={16} />
          </button>
        </div>

        <div className="editor-header-right">
          {/* Mock Realtime Collaboration Active Avatars */}
          <div className="collab-avatars" title="Active collaborators online">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&h=80&q=80" alt="Collab 1" className="collab-avatar" />
            <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=80&h=80&q=80" alt="Collab 2" className="collab-avatar" />
            <div className="collab-avatar" style={{ background: 'var(--accent-purple)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>+1</div>
          </div>

          <button onClick={handleManualSave} className="btn btn-secondary" style={{ padding: '8px 14px', borderRadius: '10px' }}>
            <Save size={16} /> Save
          </button>
          
          {/* Export Dropdown options */}
          <button onClick={handleExportSVG} className="btn btn-primary" style={{ padding: '8px 14px', borderRadius: '10px' }}>
            <FileDown size={16} /> Export SVG
          </button>
          <button onClick={handleExportPNG} className="btn btn-secondary" style={{ padding: '8px 14px', borderRadius: '10px' }}>
            PNG
          </button>
          <button onClick={handleExportJSON} className="btn btn-secondary" style={{ padding: '8px 14px', borderRadius: '10px' }} title="Download Schema file">
            JSON
          </button>
        </div>
      </header>

      {/* WORKSPACE AREA */}
      <div className="editor-workspace">
        {/* Left Side: Shapes Panel */}
        <aside className="shape-library">
          <div>
            <h4 className="shape-section-title">Shapes catalog</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '15px' }}>Click to place on board:</p>
            
            <div className="shape-grid">
              <button className="shape-item" onClick={() => addNode('start_end')}>
                <svg className="shape-icon-preview" viewBox="0 0 24 24">
                  <rect x="2" y="7" width="20" height="10" rx="5" ry="5" strokeWidth="2" fill="none" />
                </svg>
                <span>Start / End</span>
              </button>

              <button className="shape-item" onClick={() => addNode('process')}>
                <svg className="shape-icon-preview" viewBox="0 0 24 24">
                  <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="2" fill="none" />
                </svg>
                <span>Process</span>
              </button>

              <button className="shape-item" onClick={() => addNode('decision')}>
                <svg className="shape-icon-preview" viewBox="0 0 24 24">
                  <polygon points="12,2 22,12 12,22 2,12" strokeWidth="2" fill="none" />
                </svg>
                <span>Decision</span>
              </button>

              <button className="shape-item" onClick={() => addNode('io')}>
                <svg className="shape-icon-preview" viewBox="0 0 24 24">
                  <polygon points="6,5 22,5 18,19 2,19" strokeWidth="2" fill="none" />
                </svg>
                <span>Input / Output</span>
              </button>

              <button className="shape-item" onClick={() => addNode('database')}>
                <svg className="shape-icon-preview" viewBox="0 0 24 24">
                  <path d="M12 2C6.5 2 2 3.8 2 6v12c0 2.2 4.5 4 10 4s10-1.8 10-4V6c0-2.2-4.5-4-10-4z M12 6c-4.4 0-8-1.3-8-3s3.6-3 8-3 8 1.3 8 3-3.6 3-8 3z" strokeWidth="2" fill="none" transform="scale(0.8) translate(3,3)" />
                </svg>
                <span>Database</span>
              </button>

              <button className="shape-item" onClick={() => addNode('cloud')}>
                <svg className="shape-icon-preview" viewBox="0 0 24 24">
                  <path d="M17.5 19A4.5 4.5 0 0 1 13 14.5c0-.8.2-1.5.5-2.2A6 6 0 0 1 12 4a8 8 0 0 1 7.5 5.5A4.5 4.5 0 0 1 17.5 19z" strokeWidth="2" fill="none" transform="scale(0.75) translate(3,3)" />
                </svg>
                <span>Cloud</span>
              </button>

              <button className="shape-item" onClick={() => addNode('document')}>
                <svg className="shape-icon-preview" viewBox="0 0 24 24">
                  <path d="M4 3 H20 V17 Q16 19 12 17 T4 17 Z" strokeWidth="2" fill="none" />
                </svg>
                <span>Document</span>
              </button>

              <button className="shape-item" onClick={() => addNode('text')}>
                <Type size={18} style={{ color: 'var(--accent-purple)' }} />
                <span>Text Box</span>
              </button>
            </div>
          </div>

          <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-light)', paddingTop: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <HelpCircle size={14} />
              <span>Double-click shape to write text. Hold Space to pan canvas.</span>
            </div>
          </div>
        </aside>

        {/* Center: Drawing Board Canvas */}
        <main 
          ref={canvasRef}
          className="canvas-area canvas-grid"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onWheel={handleWheel}
        >
          {/* Main SVG Render Frame */}
          <svg 
            id="canvas-svg-element"
            className="canvas-svg"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            }}
          >
            {/* 1. Render Edges (Paths) */}
            {edges.map((edge) => {
              const sNode = nodes.find(n => n.id === edge.sourceNodeId);
              const tNode = nodes.find(n => n.id === edge.targetNodeId);
              if (!sNode || !tNode) return null;

              const p1 = getPortCoord(sNode, edge.sourcePort);
              const p2 = getPortCoord(tNode, edge.targetPort);

              const pathStr = getBezierCurve(p1, p2, edge.sourcePort, edge.targetPort);
              const isSelected = selectedEdgeId === edge.id;

              return (
                <g key={edge.id} onClick={(e) => {
                  e.stopPropagation();
                  setSelectedEdgeId(edge.id);
                  setSelectedNodeId(null);
                }}>
                  {/* Glowing background target for easier clicking */}
                  <path 
                    d={pathStr} 
                    stroke="transparent" 
                    strokeWidth={10} 
                    fill="none" 
                    style={{ cursor: 'pointer' }}
                  />
                  <path 
                    d={pathStr} 
                    stroke={isSelected ? 'var(--accent-purple)' : edge.stroke} 
                    strokeWidth={isSelected ? edge.strokeWidth + 1.5 : edge.strokeWidth} 
                    strokeDasharray={edge.strokeDasharray}
                    fill="none"
                    markerEnd="url(#arrowhead)"
                    style={{ cursor: 'pointer', transition: 'stroke 0.2s' }}
                  />
                </g>
              );
            })}

            {/* Edge arrowhead definition */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#8c76f0" />
              </marker>
            </defs>

            {/* 2. Render Temporary connection line during drag */}
            {drawingEdge && (
              <line 
                x1={getPortCoord(nodes.find(n => n.id === drawingEdge.sourceNodeId), drawingEdge.sourcePort).x}
                y1={getPortCoord(nodes.find(n => n.id === drawingEdge.sourceNodeId), drawingEdge.sourcePort).y}
                x2={drawingEdge.currentX}
                y2={drawingEdge.currentY}
                stroke="var(--accent-blue)"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            )}

            {/* 3. Render Nodes */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isEditingText = editingTextNodeId === node.id;

              const handleNodeMouseDown = (e) => {
                e.stopPropagation();
                setSelectedNodeId(node.id);
                setSelectedEdgeId(null);
                
                const clientMouse = getCanvasMouseCoords(e);
                setDraggingNode({
                  nodeId: node.id,
                  offset: {
                    x: clientMouse.x - node.x,
                    y: clientMouse.y - node.y
                  }
                });
              };

              // Resize handlers actions
              const handleResizeMouseDown = (handle, e) => {
                e.stopPropagation();
                setResizingNode({
                  nodeId: node.id,
                  handle,
                  startX: node.x,
                  startY: node.y,
                  startWidth: node.width,
                  startHeight: node.height,
                  clientStart: { x: e.clientX, y: e.clientY }
                });
              };

              // Start drawing edge connection path
              const handlePortMouseDown = (port, e) => {
                e.stopPropagation();
                const portCoord = getPortCoord(node, port);
                setDrawingEdge({
                  sourceNodeId: node.id,
                  sourcePort: port,
                  currentX: portCoord.x,
                  currentY: portCoord.y
                });
              };

              // Render inner shapes matching type
              const renderNodeShape = () => {
                const shapeProps = {
                  fill: node.fill,
                  stroke: isSelected ? 'var(--accent-purple)' : node.stroke,
                  strokeWidth: isSelected ? node.strokeWidth + 1 : node.strokeWidth,
                  strokeDasharray: node.strokeDasharray,
                  style: { transition: 'fill 0.2s, stroke 0.2s' }
                };

                switch (node.type) {
                  case 'start_end': // capsule
                    return <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={node.height / 2} ry={node.height / 2} {...shapeProps} />;
                  case 'process': // rectangle
                    return <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={6} {...shapeProps} />;
                  case 'decision': // diamond
                    const dPts = `${node.x + node.width / 2},${node.y} ${node.x + node.width},${node.y + node.height / 2} ${node.x + node.width / 2},${node.y + node.height} ${node.x},${node.y + node.height / 2}`;
                    return <polygon points={dPts} {...shapeProps} />;
                  case 'io': // parallelogram
                    const ioOffset = 15;
                    const ioPts = `${node.x + ioOffset},${node.y} ${node.x + node.width},${node.y} ${node.x + node.width - ioOffset},${node.y + node.height} ${node.x},${node.y + node.height}`;
                    return <polygon points={ioPts} {...shapeProps} />;
                  case 'database': // cylinder
                    return <path d={getDatabasePath(node)} {...shapeProps} />;
                  case 'cloud':
                    return <path d={getCloudPath(node)} {...shapeProps} />;
                  case 'document': // wavy bottom document
                    return <path d={getDocumentPath(node)} {...shapeProps} />;
                  case 'text':
                    return <rect x={node.x} y={node.y} width={node.width} height={node.height} fill="transparent" stroke="transparent" />;
                  default:
                    return <rect x={node.x} y={node.y} width={node.width} height={node.height} rx={6} {...shapeProps} />;
                }
              };

              return (
                <g 
                  key={node.id} 
                  className="node-group"
                  onDoubleClick={(e) => handleNodeDoubleClick(node, e)}
                  style={{ cursor: 'move' }}
                >
                  {/* Shape render */}
                  <g onMouseDown={handleNodeMouseDown}>
                    {renderNodeShape()}
                  </g>

                  {/* Multi-line Text render inside shape */}
                  {!isEditingText && (
                    <text 
                      x={node.x + node.width / 2} 
                      y={node.type === 'database' ? node.y + node.height / 2 + 6 : node.y + node.height / 2}
                      textAnchor={node.align === 'left' ? 'start' : 'middle'}
                      alignmentBaseline="central"
                      fill={node.color}
                      fontSize={node.fontSize}
                      fontWeight={node.fontWeight}
                      style={{ pointerEvents: 'none', fontStyle: 'normal' }}
                    >
                      {/* Split text by newline to render tspan multi lines */}
                      {node.text.split('\n').map((line, lineIdx, linesArr) => {
                        const offset = (lineIdx - (linesArr.length - 1) / 2) * (node.fontSize + 4);
                        return (
                          <tspan 
                            key={lineIdx} 
                            x={node.align === 'left' ? node.x + 12 : node.x + node.width / 2} 
                            dy={lineIdx === 0 ? offset : node.fontSize + 4}
                          >
                            {line}
                          </tspan>
                        );
                      })}
                    </text>
                  )}

                  {/* Selected bounding border resize handles */}
                  {isSelected && (
                    <g>
                      <rect 
                        x={node.x - 3} 
                        y={node.y - 3} 
                        width={node.width + 6} 
                        height={node.height + 6} 
                        fill="none" 
                        stroke="var(--accent-purple)" 
                        strokeWidth="1" 
                        strokeDasharray="2 2" 
                      />
                      {/* Corner Handles */}
                      <rect className="resize-handle" x={node.x - 4} y={node.y - 4} onMouseDown={(e) => handleResizeMouseDown('NW', e)} />
                      <rect className="resize-handle" x={node.x + node.width - 4} y={node.y - 4} onMouseDown={(e) => handleResizeMouseDown('NE', e)} />
                      <rect className="resize-handle" x={node.x + node.width - 4} y={node.y + node.height - 4} onMouseDown={(e) => handleResizeMouseDown('SE', e)} />
                      <rect className="resize-handle" x={node.x - 4} y={node.y + node.height - 4} onMouseDown={(e) => handleResizeMouseDown('SW', e)} />
                    </g>
                  )}

                  {/* Connection Ports handles on hover */}
                  {!isEditingText && ['top', 'right', 'bottom', 'left'].map((port) => {
                    const coord = getPortCoord(node, port);
                    return (
                      <circle 
                        key={port}
                        className="conn-port"
                        cx={coord.x}
                        cy={coord.y}
                        r={5}
                        onMouseDown={(e) => handlePortMouseDown(port, e)}
                        onMouseEnter={() => setHoveredPort({ nodeId: node.id, port })}
                        onMouseLeave={() => setHoveredPort(null)}
                      />
                    );
                  })}
                </g>
              );
            })}
          </svg>

          {/* Inline Text Editor DOM Element Overlay */}
          {editingTextNodeId && (
            <textarea
              ref={textEditorRef}
              className="text-editor-overlay"
              style={{
                left: (nodes.find(n => n.id === editingTextNodeId)?.x || 0) * zoom + pan.x,
                top: (nodes.find(n => n.id === editingTextNodeId)?.y || 0) * zoom + pan.y,
                width: (nodes.find(n => n.id === editingTextNodeId)?.width || 120) * zoom,
                height: (nodes.find(n => n.id === editingTextNodeId)?.height || 60) * zoom,
                fontSize: `${(nodes.find(n => n.id === editingTextNodeId)?.fontSize || 14) * zoom}px`,
                fontWeight: nodes.find(n => n.id === editingTextNodeId)?.fontWeight
              }}
              value={editingTextVal}
              onChange={(e) => setEditingTextVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveTextEdit();
                }
              }}
              autoFocus
            />
          )}

          {/* Zoom Toolbar overlay widget */}
          <div className="zoom-toolbar animate-pop">
            <button className="zoom-btn" onClick={() => setZoom(z => Math.max(0.25, z - 0.1))} title="Zoom Out"><Minus size={16} /></button>
            <span className="zoom-text">{Math.round(zoom * 100)}%</span>
            <button className="zoom-btn" onClick={() => setZoom(z => Math.min(2.5, z + 0.1))} title="Zoom In"><Plus size={16} /></button>
            <button className="zoom-btn" onClick={() => { setZoom(1.0); setPan({ x: 0, y: 0 }); }} title="Fit Viewport"><Maximize size={16} /></button>
          </div>
        </main>

        {/* Right Side: Properties & Styles Sidebar */}
        <aside className="properties-panel">
          {/* Selected Shape controls */}
          {selectedNode ? (
            <>
              <h3 className="shape-section-title">Modify Shape</h3>

              {/* 1. Presets fill/stroke selection */}
              {selectedNode.type !== 'text' && (
                <div className="prop-section">
                  <label className="prop-label">Color Presets</label>
                  <div className="color-picker-grid">
                    {PASTEL_PALETTE.map((preset) => (
                      <button 
                        key={preset.name}
                        className={`color-picker-btn ${selectedNode.fill === preset.fill ? 'active' : ''}`}
                        style={{ background: preset.fill, borderColor: preset.stroke }}
                        onClick={() => updateSelectedNodeStyle({ fill: preset.fill, stroke: preset.stroke })}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 2. Stroke styles (dashed/solid) */}
              {selectedNode.type !== 'text' && (
                <div className="prop-section">
                  <label className="prop-label">Border Stroke Outline</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className={`stroke-style-btn ${selectedNode.strokeDasharray === 'none' ? 'active' : ''}`}
                      onClick={() => updateSelectedNodeStyle({ strokeDasharray: 'none' })}
                    >
                      Solid
                    </button>
                    <button 
                      className={`stroke-style-btn ${selectedNode.strokeDasharray === '5 5' ? 'active' : ''}`}
                      onClick={() => updateSelectedNodeStyle({ strokeDasharray: '5 5' })}
                    >
                      Dashed
                    </button>
                    <button 
                      className={`stroke-style-btn ${selectedNode.strokeDasharray === '2 4' ? 'active' : ''}`}
                      onClick={() => updateSelectedNodeStyle({ strokeDasharray: '2 4' })}
                    >
                      Dotted
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Width:</span>
                    <input 
                      type="range" 
                      min="0" 
                      max="8" 
                      style={{ flex: 1 }}
                      value={selectedNode.strokeWidth} 
                      onChange={(e) => updateSelectedNodeStyle({ strokeWidth: parseInt(e.target.value) })}
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{selectedNode.strokeWidth}px</span>
                  </div>
                </div>
              )}

              {/* 3. Text Formatting styles */}
              <div className="prop-section">
                <label className="prop-label">Text Formatting</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className={`stroke-style-btn ${selectedNode.fontWeight === 'bold' ? 'active' : ''}`}
                    onClick={() => updateSelectedNodeStyle({ fontWeight: selectedNode.fontWeight === 'bold' ? 'normal' : 'bold' })}
                    title="Bold"
                  >
                    <Bold size={14} />
                  </button>
                  <button 
                    className={`stroke-style-btn ${selectedNode.align === 'left' ? 'active' : ''}`}
                    onClick={() => updateSelectedNodeStyle({ align: selectedNode.align === 'left' ? 'center' : 'left' })}
                    title="Text Alignment"
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button 
                    className="stroke-style-btn"
                    onClick={() => setEditingTextNodeId(selectedNode.id)}
                    title="Edit Text Content"
                  >
                    Text
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Size:</span>
                  <input 
                    type="range" 
                    min="10" 
                    max="28" 
                    style={{ flex: 1 }}
                    value={selectedNode.fontSize} 
                    onChange={(e) => updateSelectedNodeStyle({ fontSize: parseInt(e.target.value) })}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{selectedNode.fontSize}px</span>
                </div>
              </div>

              {/* 4. Layering Actions */}
              <div className="prop-section">
                <label className="prop-label">Arrange Layers</label>
                <div className="action-grid">
                  <button onClick={bringToFront} className="btn btn-secondary" style={{ padding: '8px 10px', fontSize: '0.8rem' }}>
                    Bring Front
                  </button>
                  <button onClick={sendToBack} className="btn btn-secondary" style={{ padding: '8px 10px', fontSize: '0.8rem' }}>
                    Send Back
                  </button>
                </div>
              </div>

              {/* 5. Delete actions */}
              <div className="prop-section" style={{ marginTop: '10px' }}>
                <button 
                  onClick={() => deleteNode(selectedNode.id)} 
                  className="btn btn-danger" 
                  style={{ width: '100%', padding: '10px', borderRadius: '10px' }}
                >
                  <Trash2 size={16} /> Delete Element
                </button>
              </div>
            </>
          ) : selectedEdge ? (
            /* Edge styling panel */
            <>
              <h3 className="shape-section-title">Modify Edge</h3>
              
              <div className="prop-section">
                <label className="prop-label">Connection Stroke Line</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className={`stroke-style-btn ${selectedEdge.strokeDasharray === 'none' ? 'active' : ''}`}
                    onClick={() => updateSelectedEdgeStyle({ strokeDasharray: 'none' })}
                  >
                    Solid
                  </button>
                  <button 
                    className={`stroke-style-btn ${selectedEdge.strokeDasharray === '4 4' ? 'active' : ''}`}
                    onClick={() => updateSelectedEdgeStyle({ strokeDasharray: '4 4' })}
                  >
                    Dashed
                  </button>
                  <button 
                    className={`stroke-style-btn ${selectedEdge.strokeDasharray === '2 4' ? 'active' : ''}`}
                    onClick={() => updateSelectedEdgeStyle({ strokeDasharray: '2 4' })}
                  >
                    Dotted
                  </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Width:</span>
                  <input 
                    type="range" 
                    min="1" 
                    max="6" 
                    style={{ flex: 1 }}
                    value={selectedEdge.strokeWidth} 
                    onChange={(e) => updateSelectedEdgeStyle({ strokeWidth: parseInt(e.target.value) })}
                  />
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{selectedEdge.strokeWidth}px</span>
                </div>
              </div>

              <div className="prop-section">
                <label className="prop-label">Edge Color</label>
                <div className="color-picker-grid">
                  {['#8c76f0', '#5496eb', '#ea580c', '#166534', '#94a3b8', '#1e293b'].map((color) => (
                    <button 
                      key={color}
                      className={`color-picker-btn ${selectedEdge.stroke === color ? 'active' : ''}`}
                      style={{ background: color }}
                      onClick={() => updateSelectedEdgeStyle({ stroke: color })}
                    />
                  ))}
                </div>
              </div>

              <div className="prop-section" style={{ marginTop: '10px' }}>
                <button 
                  onClick={() => deleteEdge(selectedEdge.id)} 
                  className="btn btn-danger" 
                  style={{ width: '100%', padding: '10px', borderRadius: '10px' }}
                >
                  <Trash2 size={16} /> Delete Line
                </button>
              </div>
            </>
          ) : (
            /* Empty attributes sidebar placeholder */
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <Layers size={36} style={{ margin: 'auto', opacity: 0.3, marginBottom: '10px' }} />
                <p style={{ fontSize: '0.85rem' }}>Select an element on canvas to customize styling details.</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
