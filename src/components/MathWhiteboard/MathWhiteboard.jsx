import React, { useRef, useState, useEffect, useCallback } from 'react';
import { FiSave, FiTrash, FiDownload, FiUpload, FiGrid, FiLayers, FiZoomIn, FiZoomOut } from 'react-icons/fi';
import { VscSymbolOperator } from 'react-icons/vsc';
import { motion } from 'framer-motion';
import { useTheme } from '../../context/ThemeContext';
import './MathWhiteboard.css';
import { debounce } from 'lodash'; // Import debounce

// Constants for keyboard shortcuts
const KEYBOARD_SHORTCUTS = {
    UNDO: ['z', 'ctrlKey'],
    REDO: ['y', 'ctrlKey'],
    CLEAR: ['Escape', ''],
    PEN: ['p', ''],
    ERASER: ['e', ''],
    MATH_SYMBOLS: ['m', '']
};

// Helper function to load image data URL onto canvas
const loadImage = (ctx, dataURL, callback) => {
    const img = new Image();
    img.src = dataURL;
    img.onload = () => {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.drawImage(img, 0, 0);
        if (callback) callback();
    };
};


const MathWhiteboard = ({ onSubmitDrawing, studentId, subject }) => {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#000000');
    const [brushSize, setBrushSize] = useState(5);
    const [tool, setTool] = useState('pen');
    const [showMathSymbols, setShowMathSymbols] = useState(false);
    const [history, setHistory] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [showGrid, setShowGrid] = useState(false);
    const [gridSize, setGridSize] = useState(20);
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [layers, setLayers] = useState([{ id: 1, name: 'Layer 1', visible: true, locked: false }]);
    const [activeLayer, setActiveLayer] = useState(1);
    const [customSymbols, setCustomSymbols] = useState([]);
    const { darkMode, theme } = useTheme();
    const [draggedSymbol, setDraggedSymbol] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dropPosition, setDropPosition] = useState({ x: 0, y: 0 });

useEffect(() => {
  const resizeCanvas = () => {
    const container = canvasRef.current.parentElement;
    canvasRef.current.width = container.clientWidth;
    canvasRef.current.height = container.clientHeight;
  };

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  return () => window.removeEventListener('resize', resizeCanvas);
}, []);

    // Common math symbols
    const defaultMathSymbols = [
        '÷', '×', '−', '+', '=', '≠', '<', '>', '≤', '≥',
        '√', '∛', 'π', 'e', '∞', '∑', '∏', '∫', '∂', 'Δ',
        '°', '⊥', '∠', '∥', '≅', '≈', '∝', '±', '∓', '%'
    ];

    const mathSymbols = [...defaultMathSymbols, ...customSymbols];

    const loadImageFromDataURL = useCallback((dataURL, callback) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        loadImage(ctx, dataURL, callback); // Use the helper function
    }, []);

    const drawGrid = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Get current image before drawing grid
        const currentImage = canvas.toDataURL();

        // Calculate grid spacing based on zoom and grid size
        const spacing = gridSize * zoom;

        // Clear canvas and redraw current state
        loadImageFromDataURL(currentImage, () => {
            // Draw grid lines
            ctx.beginPath();
            ctx.strokeStyle = darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)';
            ctx.lineWidth = 1;

            // Adjust for panning
            const offsetX = pan.x % spacing;
            const offsetY = pan.y % spacing;

            // Draw vertical lines
            for (let x = offsetX; x < canvas.width; x += spacing) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, canvas.height);
            }

            // Draw horizontal lines
            for (let y = offsetY; y < canvas.height; y += spacing) {
                ctx.moveTo(0, y);
                ctx.lineTo(canvas.width, y);
            }

            ctx.stroke();
        });
    }, [darkMode, gridSize, zoom, pan, loadImageFromDataURL]);

    // Initialize canvas
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Initialize with white background (or dark in dark mode)
        ctx.fillStyle = darkMode
            ? (theme?.colors?.background?.dark || '#333')
            : (theme?.colors?.background?.light || '#fff');
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Save initial state to history
        saveToHistory();
    }, [darkMode, theme]);

    // Draw grid if enabled
    useEffect(() => {
        if (showGrid) {
            drawGrid();
        } else {
            // Redraw from last history state without grid
            if (history.length > 0) {
                loadImageFromDataURL(history[history.length - 1]);
            }
        }
    }, [showGrid, gridSize, zoom, pan, history, drawGrid, loadImageFromDataURL]);


const startDrawing = (e) => {
        const currentLayer = layers.find(layer => layer.id === activeLayer);
        if (currentLayer && currentLayer.locked) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (e.button === 1 || (e.touches && e.touches.length === 2)) {
            setIsPanning(true);
            return;
        }

        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = ((e.clientX || e.touches[0].clientX) - rect.left) * scaleX;
        const y = ((e.clientY || e.touches[0].clientY) - rect.top) * scaleY;

        const adjustedX = (x - pan.x * zoom) / zoom;
        const adjustedY = (y - pan.y * zoom) / zoom;

        ctx.strokeStyle = color;
        ctx.lineWidth = brushSize;

        if (tool === 'eraser') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.beginPath();
        ctx.moveTo(adjustedX, adjustedY);
        setIsDrawing(true);
    };

    const draw = useCallback(debounce((e) => {
        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = ((e.clientX || e.touches[0].clientX) - rect.left) * scaleX;
        const y = ((e.clientY || e.touches[0].clientY) - rect.top) * scaleY;

        const adjustedX = (x - pan.x * zoom) / zoom;
        const adjustedY = (y - pan.y * zoom) / zoom;

        ctx.lineTo(adjustedX, adjustedY);
        ctx.stroke();
    }, 5), [isDrawing, zoom, pan, brushSize, tool]);

 

    const handleMouseMove = (e) => {
        draw(e); // Call debounced draw function
    };


    const handlePan = (e) => {
        const movementX = e.movementX || 0;
        const movementY = e.movementY || 0;

        setPan(prevPan => ({
            x: prevPan.x + movementX / zoom,
            y: prevPan.y + movementY / zoom
        }));
    };

    const finishDrawing = () => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (!isDrawing) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.closePath();
        setIsDrawing(false);
        saveToHistory();
    };

    const saveToHistory = () => {
        const canvas = canvasRef.current;
        // Save current state to history
        setHistory(prevHistory => [...prevHistory, canvas.toDataURL()]);
        // Clear redo stack
        setRedoStack([]);
    };

    const undo = useCallback(() => {
        if (history.length <= 1) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Move current state to redo stack
        const currentState = history[history.length - 1];
        setRedoStack(prevRedoStack => [...prevRedoStack, currentState]);

        // Pop the last state and get the previous one
        const newHistory = [...history];
        newHistory.pop();
        setHistory(newHistory);

        // Load the previous state
        loadImageFromDataURL(newHistory[newHistory.length - 1], () => {
            // Redraw grid if enabled
            if (showGrid) drawGrid();
        });
    }, [history, redoStack, showGrid, drawGrid, loadImageFromDataURL]);

    const redo = useCallback(() => {
        if (redoStack.length === 0) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Get the state to redo
        const statesToRedo = [...redoStack];
        const stateToRedo = statesToRedo.pop();
        setRedoStack(statesToRedo);

        // Add it back to history
        setHistory(prevHistory => [...prevHistory, stateToRedo]);

        // Load the state
        loadImageFromDataURL(stateToRedo, () => {
            // Redraw grid if enabled
            if (showGrid) drawGrid();
        });
    }, [history, redoStack, showGrid, drawGrid, loadImageFromDataURL]);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        // Save current state before clearing
        saveToHistory();

        // Clear canvas with background color (using a safe fallback color)
        ctx.fillStyle = darkMode
            ? (theme?.colors?.background?.dark || '#333') :
            (theme?.colors?.background?.light || '#fff');
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Redraw grid if enabled
        if (showGrid) drawGrid();

    };

const addSymbol = (symbol, position) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        ctx.font = `${48 / zoom}px serif`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(symbol, position.x, position.y);
        
        saveToHistory();
    };

    const handleCanvasDrop = (e) => {
        e.preventDefault();
        if (!draggedSymbol) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const adjustedX = (x - pan.x * zoom) / zoom;
        const adjustedY = (y - pan.y * zoom) / zoom;

        addSymbol(draggedSymbol, { x: adjustedX, y: adjustedY });
        setDraggedSymbol(null);
        setIsDragging(false);
    };

    const handleZoom = (direction) => {
        setZoom(prevZoom => {
            const newZoom = direction === 'in'
                ? Math.min(prevZoom * 1.2, 5)  // Max zoom: 5x
                : Math.max(prevZoom / 1.2, 0.5);  // Min zoom: 0.5x

            return newZoom;
        });
    };

    const downloadCanvas = () => {
        const canvas = canvasRef.current;
        const link = document.createElement('a');
        link.download = `chikoro-math-${Date.now()}.png`;

        // If grid is shown, temporarily hide it for the download
        if (showGrid) {
            const tempGrid = showGrid;
            setShowGrid(false);
            setTimeout(() => {
                link.href = canvas.toDataURL();
                link.click();
                setShowGrid(tempGrid);
            }, 100);
        } else {
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    const exportAsPDF = () => {
        // Implement PDF export logic here
        // Use libraries like jsPDF to convert canvas to PDF
        alert('PDF export feature coming soon!');
    };

    const uploadImage = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');

                // Save current state
                saveToHistory();

                // Draw the image, scaling to fit if needed
                const ratio = Math.min(
                    canvas.width / img.width,
                    canvas.height / img.height
                );
                const centerX = (canvas.width - img.width * ratio) / 2;
                const centerY = (canvas.height - img.height * ratio) / 2;

                ctx.drawImage(
                    img,
                    0, 0, img.width, img.height,
                    centerX, centerY, img.width * ratio, img.height * ratio
                );

                // Redraw grid if enabled
                if (showGrid) drawGrid();

                saveToHistory();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    const handleSubmit = () => {
        if (typeof onSubmitDrawing === 'function') {
            const canvas = canvasRef.current;
            // If grid is shown, temporarily hide it for the submission
            if (showGrid) {
                const tempGrid = showGrid;
                setShowGrid(false);
                setTimeout(() => {
                    const imageData = canvas.toDataURL('image/png');
                    onSubmitDrawing(imageData, studentId, subject);
                    setShowGrid(tempGrid);
                }, 100);
            } else {
                const imageData = canvas.toDataURL('image/png');
                onSubmitDrawing(imageData, studentId, subject);
            }
        }
    };

    // Layer management
    const addLayer = () => {
        const newLayer = {
            id: Date.now(),
            name: `Layer ${layers.length + 1}`,
            visible: true,
            locked: false
        };

        setLayers([...layers, newLayer]);
        setActiveLayer(newLayer.id);
    };

    const toggleLayerVisibility = (layerId) => {
        setLayers(layers.map(layer =>
            layer.id === layerId
                ? { ...layer, visible: !layer.visible }
                : layer
        ));
    };

    const toggleLayerLock = (layerId) => {
        setLayers(layers.map(layer =>
            layer.id === layerId
                ? { ...layer, locked: !layer.locked }
                : layer
        ));
    };

    const deleteLayer = (layerId) => {
        // Don't delete if it's the only layer
        if (layers.length <= 1) return;

        const newLayers = layers.filter(layer => layer.id !== layerId);
        setLayers(newLayers);

        // If active layer was deleted, select the last layer
        if (activeLayer === layerId) {
            setActiveLayer(newLayers[newLayers.length - 1].id);
        }
    };

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Undo: Ctrl+Z
            if (e.key.toLowerCase() === KEYBOARD_SHORTCUTS.UNDO[0] && e[KEYBOARD_SHORTCUTS.UNDO[1]]) {
                e.preventDefault();
                undo();
            }
            // Redo: Ctrl+Y
            else if (e.key.toLowerCase() === KEYBOARD_SHORTCUTS.REDO[0] && e[KEYBOARD_SHORTCUTS.REDO[1]]) {
                e.preventDefault();
                redo();
            }
            // Clear: Escape
            else if (e.key === KEYBOARD_SHORTCUTS.CLEAR[0]) {
                e.preventDefault();
                clearCanvas();
            }
            // Pen tool: P
            else if (e.key.toLowerCase() === KEYBOARD_SHORTCUTS.PEN[0]) {
                setTool('pen');
            }
            // Eraser tool: E
            else if (e.key.toLowerCase() === KEYBOARD_SHORTCUTS.ERASER[0]) {
                setTool('eraser');
            }
            // Toggle math symbols: M
            else if (e.key.toLowerCase() === KEYBOARD_SHORTCUTS.MATH_SYMBOLS[0]) {
                setShowMathSymbols(!showMathSymbols);
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [undo, redo, showMathSymbols, clearCanvas]);

    // Custom symbol management
    const addCustomSymbol = (symbol) => {
        if (symbol && !customSymbols.includes(symbol)) {
            setCustomSymbols([...customSymbols, symbol]);
        }
    };

    // Handle touch events for mobile
    useEffect(() => {
        const canvas = canvasRef.current;

        const touchStart = (e) => {
            e.preventDefault();

            // Handle multi-touch (panning)
            if (e.touches.length === 2) {
                setIsPanning(true);
                return;
            }

            startDrawing(e);
        };

        const touchMove = (e) => {
            e.preventDefault();

            // Handle pinch-to-zoom
            if (e.touches.length === 2) {
                const touch1 = e.touches[0];
                const touch2 = e.touches[1];

                // Calculate distance between touches
                const distance = Math.hypot(
                    touch2.clientX - touch1.clientX,
                    touch2.clientY - touch1.clientY
                );

                // TODO: Implement zoom logic based on touch distance change
                return;
            }

            handleMouseMove(e); // Use handleMouseMove for debounced draw
        };

        const touchEnd = () => {
            finishDrawing();
        };

        canvas.addEventListener('touchstart', touchStart);
        canvas.addEventListener('touchmove', touchMove);
        canvas.addEventListener('touchend', touchEnd);

        return () => {
            canvas.removeEventListener('touchstart', touchStart);
            canvas.removeEventListener('touchmove', touchMove);
            canvas.removeEventListener('touchend', touchEnd);
        };
    }, [isDrawing, isPanning, handleMouseMove, startDrawing, finishDrawing]); // Include handleMouseMove and other dependencies


    const handleSymbolDragStart = (e, symbol) => {
        setDraggedSymbol(symbol);
        setIsDragging(true);
        // Set a ghost drag image (optional)
        const ghostElement = document.createElement('div');
        ghostElement.innerText = symbol;
        ghostElement.style.fontSize = '24px';
        ghostElement.style.position = 'absolute';
        ghostElement.style.top = '-1000px';
        document.body.appendChild(ghostElement);
        e.dataTransfer.setDragImage(ghostElement, 15, 15);

        // Clean up the ghost element after drag starts
        setTimeout(() => {
            document.body.removeChild(ghostElement);
        }, 0);
    };

    const handleCanvasDragOver = (e) => {
        e.preventDefault();
        if (!draggedSymbol) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Calculate position adjusted for zoom and pan
        const x = (e.clientX - rect.left) / zoom - pan.x;
        const y = (e.clientY - rect.top) / zoom - pan.y;

        setDropPosition({ x, y });
    };

    

    const handleSymbolDragEnd = () => {
        setDraggedSymbol(null);
        setIsDragging(false);
    };

    // Touch drag simulation for mobile
    const handleSymbolTouchStart = (e, symbol) => {
        e.preventDefault();
        setDraggedSymbol(symbol);
        setIsDragging(true);

        // Get the initial touch position
        const touch = e.touches[0];
        setDropPosition({
            x: touch.clientX,
            y: touch.clientY
        });
    };

    const handleCanvasTouchMove = (e) => {
        if (!draggedSymbol) return;
        e.preventDefault();

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];

        // Calculate position adjusted for zoom and pan
        const x = (touch.clientX - rect.left) / zoom - pan.x;
        const y = (touch.clientY - rect.top) / zoom - pan.y;

        setDropPosition({ x, y });
    };

    const handleCanvasTouchEnd = (e) => {
        if (!draggedSymbol) return;
        e.preventDefault();

        // Add the symbol at the last known position
        addSymbol(draggedSymbol, dropPosition);

        // Reset drag state
        setDraggedSymbol(null);
        setIsDragging(false);
    };

    return (
        <div
            className={`math-whiteboard-container ${darkMode ? 'dark' : ''}`}
            aria-label="Math Whiteboard Application"
            role="application"
        >
            <div className="whiteboard-header">
                <h2>Math Whiteboard</h2>
                <div className="whiteboard-toolbar">
                    <div className="tool-controls" role="toolbar" aria-label="Drawing Tools">
                        <button
                            className={`tool-btn ${tool === 'pen' ? 'active' : ''}`}
                            onClick={() => setTool('pen')}
                            aria-label="Pen tool"
                            aria-pressed={tool === 'pen'}
                            title="Pen (P)"
                        >
                            Pen
                        </button>
                        <button
                            className={`tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                            onClick={() => setTool('eraser')}
                            aria-label="Eraser tool"
                            aria-pressed={tool === 'eraser'}
                            title="Eraser (E)"
                        >
                            Eraser
                        </button>
                        <button
                            className="tool-btn"
                            onClick={() => setShowMathSymbols(!showMathSymbols)}
                            aria-label="Toggle math symbols panel"
                            aria-pressed={showMathSymbols}
                            title="Math Symbols (M)"
                        >
                            <VscSymbolOperator />
                        </button>

                        <div className="color-picker-container" title="Choose color">
                            <label htmlFor="color-picker" className="sr-only">Select color</label>
                            <input
                                id="color-picker"
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                disabled={tool === 'eraser'}
                                aria-label="Color picker"
                            />
                        </div>

                        <div className="brush-size-container" title="Adjust brush size">
                            <label htmlFor="brush-size" className="sr-only">Adjust brush size</label>
                            <input
                                id="brush-size"
                                type="range"
                                min="1"
                                max="20"
                                value={brushSize}
                                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                aria-label="Brush size"
                            />
                            <span className="brush-size-value">{brushSize}px</span>
                        </div>
                    </div>

                    <div className="view-controls" role="toolbar" aria-label="View Controls">
                        <button
                            className={`tool-btn ${showGrid ? 'active' : ''}`}
                            onClick={() => setShowGrid(!showGrid)}
                            aria-label="Toggle grid"
                            aria-pressed={showGrid}
                            title="Toggle Grid"
                        >
                            <FiGrid />
                        </button>
                        {showGrid && (
                            <div className="grid-size-container">
                                <label htmlFor="grid-size" className="sr-only">Adjust grid size</label>
                                <input
                                    id="grid-size"
                                    type="range"
                                    min="10"
                                    max="50"
                                    step="5"
                                    value={gridSize}
                                    onChange={(e) => setGridSize(parseInt(e.target.value))}
                                    aria-label="Grid size"
                                />
                                <span className="grid-size-value">{gridSize}px</span>
                            </div>
                        )}
                        <button
                            className="tool-btn"
                            onClick={() => handleZoom('in')}
                            aria-label="Zoom in"
                            title="Zoom In"
                        >
                            <FiZoomIn />
                        </button>
                        <button
                            className="tool-btn"
                            onClick={() => handleZoom('out')}
                            aria-label="Zoom out"
                            title="Zoom Out"
                        >
                            <FiZoomOut />
                        </button>
                        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
                    </div>
                </div>
            </div>

            {showMathSymbols && (
                <div
                    className="math-symbols-panel"
                    role="region"
                    aria-label="Math Symbols"
                >
                    <div className="symbols-container">
                        {mathSymbols.map((symbol, index) => (
                            <button
                                key={index}
                                className="symbol-btn"
                                onDragStart={(e) => handleSymbolDragStart(e, symbol)}
                                onTouchStart={(e) => handleSymbolTouchStart(e, symbol)}
                                draggable="true"
                                aria-label={`Insert ${symbol} symbol`}
                            >
                                {symbol}
                            </button>
                        ))}
                    </div>
                    <div className="custom-symbol-input">
                        <label htmlFor="custom-symbol" className="sr-only">Add custom symbol</label>
                        <input
                            id="custom-symbol"
                            type="text"
                            placeholder="Add custom symbol..."
                            maxLength="3"
                            onKeyPress={e => e.key === 'Enter' && addCustomSymbol(e.target.value)}
                            aria-label="Add custom symbol"
                        />
                        <button
                            onClick={() => addCustomSymbol(document.getElementById('custom-symbol').value)}
                            aria-label="Add symbol"
                        >
                            Add
                        </button>
                    </div>
                </div>
            )}

            <div className="main-workspace">
                <div className="layers-panel" aria-label="Layers Panel" role="region">
                    <h3>Layers</h3>
                    <ul className="layers-list">
                        {layers.map(layer => (
                            <li key={layer.id} className={`layer-item ${activeLayer === layer.id ? 'active' : ''}`}>
                                <button
                                    className="layer-select-btn"
                                    onClick={() => setActiveLayer(layer.id)}
                                    aria-label={`Select ${layer.name}`}
                                    aria-pressed={activeLayer === layer.id}
                                >
                                    {layer.name}
                                </button>
                                <button
                                    className={`layer-visibility-btn ${!layer.visible ? 'hidden' : ''}`}
                                    onClick={() => toggleLayerVisibility(layer.id)}
                                    aria-label={`${layer.visible ? 'Hide' : 'Show'} ${layer.name}`}
                                    title={`${layer.visible ? 'Hide' : 'Show'} layer`}
                                >
                                    <span className="sr-only">{layer.visible ? 'Hide' : 'Show'}</span>
                                    👁️
                                </button>
                                <button
                                    className={`layer-lock-btn ${layer.locked ? 'locked' : ''}`}
                                    onClick={() => toggleLayerLock(layer.id)}
                                    aria-label={`${layer.locked ? 'Unlock' : 'Lock'} ${layer.name}`}
                                    title={`${layer.locked ? 'Unlock' : 'Lock'} layer`}
                                >
                                    <span className="sr-only">{layer.locked ? 'Unlock' : 'Lock'}</span>
                                    {layer.locked ? '🔒' : '🔓'}
                                </button>
                                <button
                                    className="layer-delete-btn"
                                    onClick={() => deleteLayer(layer.id)}
                                    aria-label={`Delete ${layer.name}`}
                                    title="Delete layer"
                                    disabled={layers.length <= 1}
                                >
                                    <span className="sr-only">Delete</span>
                                    ❌
                                </button>
                            </li>
                        ))}
                    </ul>
                    <button
                        className="add-layer-btn"
                        onClick={addLayer}
                        aria-label="Add new layer"
                    >
                        + Add Layer
                    </button>
                </div>

                <div className="canvas-container"
                    onDragOver={handleCanvasDragOver}
                    onDrop={handleCanvasDrop}
                    onTouchMove={isDragging ? handleCanvasTouchMove : null}
                    onTouchEnd={isDragging ? handleCanvasTouchEnd : null}
                >
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={600}
                        onMouseDown={startDrawing}
                        onMouseMove={isDrawing ? handleMouseMove : null} // Use handleMouseMove for debounced draw
                        onMouseUp={finishDrawing}
                        onMouseLeave={finishDrawing}
                        style={{
                            cursor: tool === 'eraser' ? 'crosshair' : 'default',
                            transform: `scale(${zoom})`,
                            transformOrigin: '0 0'
                        }}
                        aria-label="Math drawing canvas"
                        role="img"
                    />
                    {isDragging && draggedSymbol && (
                        <div
                            className="dragging-symbol-indicator"
                            style={{
                                position: 'absolute',
                                left: dropPosition.x * zoom,
                                top: dropPosition.y * zoom,
                                fontSize: `${48}px`,
                                opacity: 0.7,
                                pointerEvents: 'none',
                                color: color
                            }}
                        >
                            {draggedSymbol}
                        </div>
                    )}
                </div>
            </div>
            <div
                className="whiteboard-controls"
                role="toolbar"
                aria-label="Whiteboard Controls"
            >
                <motion.button
                    className="control-btn"
                    onClick={undo}
                    disabled={history.length <= 1}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Undo"
                    title="Undo (Ctrl+Z)"
                >
                    Undo
                </motion.button>

                <motion.button
                    className="control-btn"
                    onClick={redo}
                    disabled={redoStack.length === 0}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Redo"
                    title="Redo (Ctrl+Y)"
                >
                    Redo
                </motion.button>

                <motion.button
                    className="control-btn danger"
                    onClick={clearCanvas}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Clear canvas"
                    title="Clear (Escape)"
                >
                    <FiTrash /> Clear
                </motion.button>

                <div className="export-dropdown">
                    <motion.button
                        className="control-btn"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        aria-label="Export options"
                        aria-haspopup="true"
                        title="Export Options"
                    >
                        <FiDownload /> Export
                    </motion.button>
                    <div className="export-options">
                        <button onClick={downloadCanvas} aria-label="Save as PNG">PNG</button>
                        <button onClick={exportAsPDF} aria-label="Save as PDF">PDF</button>
                    </div>
                </div>

                <label className="control-btn upload">
                    <FiUpload /> Upload
                    <input
                        type="file"
                        accept="image/*"
                        onChange={uploadImage}
                        hidden
                        aria-label="Upload image"
                    />
                </label>

                <motion.button
                    className="control-btn submit"
                    onClick={handleSubmit}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Submit drawing"
                >
                    <FiSave /> Submit
                </motion.button>
            </div>

            {/* Keyboard shortcuts help dialog (toggled with a "?" button) */}
            <button
                className="help-btn"
                onClick={() => alert(`Keyboard shortcuts:
- Undo: Ctrl + ${KEYBOARD_SHORTCUTS.UNDO[0].toUpperCase()}
- Redo: Ctrl + ${KEYBOARD_SHORTCUTS.REDO[0].toUpperCase()}
- Clear Canvas: ${KEYBOARD_SHORTCUTS.CLEAR[0]}
- Pen Tool: ${KEYBOARD_SHORTCUTS.PEN[0].toUpperCase()}
- Eraser Tool: ${KEYBOARD_SHORTCUTS.ERASER[0].toUpperCase()}
- Toggle Math Symbols: ${KEYBOARD_SHORTCUTS.MATH_SYMBOLS[0].toUpperCase()}
        `)}
                aria-label="Show keyboard shortcuts"
                title="Keyboard Shortcuts"
            >
                ?
            </button>
        </div>
    );
};

export default MathWhiteboard;
