/**
 * Excel Draw Canvas Component
 * Provides an Excel-like grid-based drawing canvas
 * with cell selection, editing, and real-time collaboration
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Undo, Redo, Download, Users, MousePointer2 } from 'lucide-react';

/**
 * Cell data structure for a single cell
 */
export interface Cell {
    row: number;
    col: number;
    value: string | number;
    formula?: string;
    style?: CellStyle;
}

/**
 * Styling options for cells
 */
export interface CellStyle {
    bold?: boolean;
    italic?: boolean;
    backgroundColor?: string;
    color?: string;
    fontSize?: number;
    textAlign?: 'left' | 'center' | 'right';
}

/**
 * Cursor position for real-time collaboration
 */
export interface Cursor {
    userId: number;
    userEmail: string;
    row: number;
    col: number;
    color: string;
}

/**
 * Props for the Canvas component
 */
interface CanvasProps {
    roomId: string;
    userId: number;
    userEmail: string;
    // Canvas state from WebSocket hook
    canvasCells: Map<string, Cell>;
    remoteCursors: Cursor[];
    savedDrawings: { x: number; y: number; color: string; size: number; userId: number }[];
    // WebSocket actions
    sendCanvasUpdate: (roomId: string, cell: Cell, userId: number) => void;
    sendCursorMove: (roomId: string, cursor: Omit<Cursor, 'color'>) => void;
    sendDraw: (roomId: string, point: { x: number; y: number; color: string; size: number }, userId: number) => void;
    sendCellStyleUpdate: (roomId: string, cell: Cell, userId: number) => void;
    sendCanvasClear: (roomId: string, userId: number) => void;
    updateCanvasCell: (cell: Cell) => void;
    clearCanvasData: () => void;
}

export function Canvas({
    roomId,
    userId,
    userEmail,
    canvasCells,
    remoteCursors,
    savedDrawings,
    sendCanvasUpdate,
    sendCursorMove,
    sendDraw,
    sendCellStyleUpdate,
    sendCanvasClear,
    updateCanvasCell,
    clearCanvasData,
}: CanvasProps) {
    // Canvas state
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Grid configuration
    const [config, setConfig] = useState({
        cellWidth: 100,
        cellHeight: 30,
        rows: 50,
        cols: 26, // A-Z columns
        rowHeaders: true,
        colHeaders: true,
    });

    // Cell data storage from WebSocket prop
    const cells = canvasCells;

    // Local drawing mode state
    const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');

    // Drawing mode
    const [drawMode, setDrawMode] = useState(false);
    const [brushColor, setBrushColor] = useState('#3b82f6');
    const [brushSize, setBrushSize] = useState(2);
    const [isDrawing, setIsDrawing] = useState(false);

    // History for undo/redo (local only)
    const [history, setHistory] = useState<Cell[][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    /**
     * Initialize canvas
     */
    useEffect(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        // Set canvas size
        const { rows, cols, cellWidth, cellHeight } = config;
        canvas.width = cols * cellWidth;
        canvas.height = rows * cellHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Initial draw
        drawGrid(ctx, canvas, config);

        // Draw cells
        drawCells(ctx, canvas, cells, config);

        // Draw cursors
        drawCursors(ctx, canvas, config, [...remoteCursors]);
    }, [canvasCells, remoteCursors, config]);

    /**
     * Render saved drawings from database
     */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || savedDrawings.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Draw all saved points
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        savedDrawings.forEach(point => {
            ctx.strokeStyle = point.color;
            ctx.lineWidth = point.size;
            ctx.fillStyle = point.color;

            // Draw a small circle for each point
            ctx.beginPath();
            ctx.arc(point.x, point.y, point.size / 2, 0, Math.PI * 2);
            ctx.fill();
        });

        console.log(`Rendered ${savedDrawings.length} saved drawings`);
    }, [savedDrawings]);

    /**
     * Draw the Excel-like grid
     */
    const drawGrid = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, gridConfig: typeof config) => {
        const { rows, cols, cellWidth, cellHeight, rowHeaders, colHeaders } = gridConfig;
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Draw column headers (A, B, C...)
        if (colHeaders) {
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(0, 0, width, cellHeight);
            ctx.strokeStyle = '#e2e8f0';
            ctx.strokeRect(0, 0, width, cellHeight);

            ctx.fillStyle = '#64748b';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            for (let col = 0; col < cols; col++) {
                const x = col * cellWidth;
                ctx.fillText(String.fromCharCode(65 + col), x + cellWidth / 2, cellHeight / 2);
                ctx.strokeRect(x, 0, cellWidth, cellHeight);
            }
        }

        // Draw row headers (1, 2, 3...)
        if (rowHeaders) {
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(0, 0, cellWidth, height);
            ctx.strokeStyle = '#e2e8f0';
            ctx.strokeRect(0, 0, cellWidth, height);

            ctx.fillStyle = '#64748b';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            for (let row = 0; row < rows; row++) {
                const y = row * cellHeight + (colHeaders ? cellHeight : 0);
                ctx.fillText(String(row + 1), cellWidth / 2, y + cellHeight / 2);
                ctx.strokeRect(0, y, cellWidth, cellHeight);
            }
        }

        // Draw grid lines
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;

        // Vertical lines
        for (let col = 0; col <= cols; col++) {
            const x = col * cellWidth + (rowHeaders ? cellWidth : 0);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        // Horizontal lines
        for (let row = 0; row <= rows; row++) {
            const y = row * cellHeight + (colHeaders ? cellHeight : 0);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
    }, []);

    /**
     * Draw all cells with their values and styles
     */
    const drawCells = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, cellData: Map<string, Cell>, gridConfig: typeof config) => {
        const { cellWidth, cellHeight, colHeaders, rowHeaders } = gridConfig;
        const offsetX = colHeaders ? cellWidth : 0;
        const offsetY = colHeaders ? cellHeight : 0;

        // Draw each cell
        cellData.forEach((cell) => {
            const x = cell.col * cellWidth + offsetX;
            const y = cell.row * cellHeight + offsetY;

            // Apply cell style background
            if (cell.style?.backgroundColor) {
                ctx.fillStyle = cell.style.backgroundColor;
                ctx.fillRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
            }

            // Draw cell value
            if (cell.value !== '') {
                ctx.save();

                // Apply text styles
                if (cell.style?.color) ctx.fillStyle = cell.style.color;
                if (cell.style?.bold) ctx.font = 'bold 14px Inter, sans-serif';
                else if (cell.style?.italic) ctx.font = 'italic 14px Inter, sans-serif';
                else ctx.font = '14px Inter, sans-serif';

                if (cell.style?.fontSize) ctx.font = `${cell.style.fontSize}px Inter, sans-serif`;

                // Text alignment
                if (cell.style?.textAlign === 'center') {
                    ctx.textAlign = 'center';
                } else if (cell.style?.textAlign === 'right') {
                    ctx.textAlign = 'right';
                } else {
                    ctx.textAlign = 'left';
                }

                ctx.textBaseline = 'middle';
                const padding = 4;
                ctx.fillText(String(cell.value), x + padding, y + cellHeight / 2);
                ctx.restore();
            }

            // Draw selection
            if (selectedCell?.row === cell.row && selectedCell?.col === cell.col && !isEditing) {
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.strokeRect(x + 1, y + 1, cellWidth - 2, cellHeight - 2);
            }
        });
    }, [canvasCells, selectedCell, isEditing, config]);

    /**
     * Draw remote users' cursors
     */
    const drawCursors = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, gridConfig: typeof config, cursors: Cursor[]) => {
        const { cellWidth, cellHeight, colHeaders, rowHeaders } = gridConfig;
        const offsetX = colHeaders ? cellWidth : 0;
        const offsetY = rowHeaders ? cellHeight : 0;

        cursors.forEach(cursor => {
            const x = cursor.col * cellWidth + offsetX;
            const y = cursor.row * cellHeight + offsetY;

            // Draw cursor rectangle
            ctx.strokeStyle = cursor.color;
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);

            // Draw semi-transparent fill
            ctx.fillStyle = cursor.color + '33';
            ctx.fillRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4);

            // Draw user name tag
            ctx.fillStyle = cursor.color;
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(cursor.userEmail.split('@')[0], x + cellWidth / 2, y - 8);
        });
    }, [remoteCursors, config]);

    /**
     * Handle cell selection
     */
    const handleCellClick = (row: number, col: number) => {
        if (selectedCell?.row === row && selectedCell?.col === col) {
            // Double click - enter edit mode
            setIsEditing(true);
            const cell = cells.get(`${row},${col}`);
            setEditValue(String(cell?.value || ''));
        } else {
            // Single click - select cell
            setSelectedCell({ row, col });
        }
    };

    /**
     * Handle cell value update
     */
    const handleCellValueChange = (value: string) => {
        if (!selectedCell) return;

        const key = `${selectedCell.row},${selectedCell.col}`;
        const existingCell = cells.get(key);

        const updatedCell: Cell = {
            ...existingCell,
            row: selectedCell.row,
            col: selectedCell.col,
            value: value,
        };

        // Update local state via WebSocket hook
        updateCanvasCell(updatedCell);

        // Save to history
        setHistory([...history, Array.from(cells.values())]);
        setHistoryIndex(history.length);

        // Send via WebSocket
        sendCanvasUpdate(roomId, updatedCell, userId);
    };

    /**
     * Handle keyboard shortcuts
     */
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isEditing) return;

        if (e.key === 'Enter') {
            handleCellValueChange(editValue);
            setIsEditing(false);
            setSelectedCell(null);
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };

    /**
     * Handle canvas mouse events
     */
    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const { cellWidth, cellHeight, colHeaders, rowHeaders } = config;
        const offsetX = colHeaders ? cellWidth : 0;
        const offsetY = rowHeaders ? cellHeight : 0;

        const col = Math.floor((x - offsetX) / cellWidth);
        const row = Math.floor((y - offsetY) / cellHeight);

        // Update cursor position via WebSocket
        if (col >= 0 && col < config.cols && row >= 0 && row < config.rows) {
            sendCursorMove(roomId, {
                userId,
                userEmail,
                row,
                col,
            });
        }

        // Drawing mode
        if (isDrawing && drawMode) {
            // Draw on canvas
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext('2d');
            if (!ctx) return;

            ctx.strokeStyle = brushColor;
            ctx.lineWidth = brushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.lineTo(x, y);
            ctx.stroke();

            // Begin new path for next segment
            ctx.beginPath();
            ctx.moveTo(x, y);

            // Send drawing via WebSocket
            sendDraw(roomId, {
                x,
                y,
                color: brushColor,
                size: brushSize,
            }, userId);
        }
    };

    const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!ctx) return;

        if (drawMode) {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            ctx.beginPath();
            ctx.moveTo(x, y);
            setIsDrawing(true);
        }
    };

    /**
     * Apply style to selected cell
     */
    const applyCellStyle = (style: Partial<CellStyle>) => {
        if (!selectedCell) return;

        const key = `${selectedCell.row},${selectedCell.col}`;
        const existingCell = cells.get(key);

        const updatedCell: Cell = {
            ...existingCell,
            row: selectedCell.row,
            col: selectedCell.col,
            value: existingCell?.value || '',
            style: {
                ...existingCell?.style,
                ...style,
            },
        };

        // Update local state
        updateCanvasCell(updatedCell);

        // Send via WebSocket
        sendCellStyleUpdate(roomId, updatedCell, userId);
    };

    /**
     * Clear all cells
     */
    const clearCanvas = () => {
        // Clear local state immediately
        clearCanvasData();
        // Send clear command to other users via WebSocket
        sendCanvasClear(roomId, userId);
    };

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-800">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-slate-900">
                {/* Cell info */}
                <div className="flex items-center gap-4">
                    {selectedCell ? (
                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-semibold">
                                {String.fromCharCode(65 + selectedCell.col)}{selectedCell.row + 1}
                            </span>
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    autoFocus
                                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-slate-800 dark:text-white w-32"
                                />
                            ) : cells.get(`${selectedCell.row},${selectedCell.col}`)?.value || (
                                <span className="text-gray-400">empty</span>
                            )}
                        </div>
                    ) : (
                        <span className="text-sm text-gray-400">Select a cell</span>
                    )}
                </div>

                {/* Drawing tools */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setDrawMode(!drawMode)}
                        className={`p-2 rounded-lg transition ${drawMode ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                        title={drawMode ? 'Exit draw mode' : 'Enter draw mode'}
                    >
                        <MousePointer2 size={18} />
                    </button>

                    {drawMode && (
                        <>
                            <input
                                type="color"
                                value={brushColor}
                                onChange={(e) => setBrushColor(e.target.value)}
                                className="w-8 h-8 rounded cursor-pointer"
                                title="Brush color"
                            />
                            <select
                                value={brushSize}
                                onChange={(e) => setBrushSize(Number(e.target.value))}
                                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:bg-slate-800"
                            >
                                <option value={1}>1px</option>
                                <option value={2}>2px</option>
                                <option value={3}>3px</option>
                                <option value={5}>5px</option>
                            </select>
                        </>
                    )}

                    <button
                        onClick={clearCanvas}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition text-red-500"
                        title="Clear canvas"
                    >
                        <Trash2 size={18} />
                    </button>

                    <button
                        onClick={() => {
                            if (historyIndex > 0) {
                                setHistoryIndex(historyIndex - 1);
                                const prevCells = history[historyIndex - 1];
                                setCells(new Map(prevCells.map(c => [`${c.row},${c.col}`, c])));
                            }
                        }}
                        disabled={historyIndex <= 0}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
                        title="Undo"
                    >
                        <Undo size={18} />
                    </button>

                    <button
                        onClick={() => {
                            if (historyIndex < history.length - 1) {
                                setHistoryIndex(historyIndex + 1);
                                const nextCells = history[historyIndex + 1];
                                setCells(new Map(nextCells.map(c => [`${c.row},${c.col}`, c])));
                            }
                        }}
                        disabled={historyIndex >= history.length - 1}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
                        title="Redo"
                    >
                        <Redo size={18} />
                    </button>
                </div>

                {/* Style toolbar */}
                {selectedCell && !isEditing && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => applyCellStyle({ bold: !cells.get(`${selectedCell.row},${selectedCell.col}`)?.style?.bold })}
                            className={`p-2 rounded-lg transition ${cells.get(`${selectedCell.row},${selectedCell.col}`)?.style?.bold ? 'bg-gray-200' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                            title="Bold"
                        >
                            <span className="font-bold">B</span>
                        </button>
                        <button
                            onClick={() => applyCellStyle({ italic: !cells.get(`${selectedCell.row},${selectedCell.col}`)?.style?.italic })}
                            className={`p-2 rounded-lg transition ${cells.get(`${selectedCell.row},${selectedCell.col}`)?.style?.italic ? 'bg-gray-200' : 'hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                            title="Italic"
                        >
                            <span className="italic">I</span>
                        </button>
                        <button
                            onClick={() => applyCellStyle({ textAlign: 'center' })}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition"
                            title="Center align"
                        >
                            <span className="text-xs">≡</span>
                        </button>
                        <input
                            type="color"
                                onChange={(e) => applyCellStyle({ backgroundColor: e.target.value })}
                                className="w-8 h-8 rounded cursor-pointer"
                            title="Background color"
                        />
                        <input
                            type="color"
                            onChange={(e) => applyCellStyle({ color: e.target.value })}
                            defaultValue="#000000"
                            className="w-8 h-8 rounded cursor-pointer"
                            title="Text color"
                        />
                    </div>
                )}

                {/* Connected users */}
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users size={16} />
                    <span>{remoteCursors.length + 1} online</span>
                </div>
            </div>

            {/* Canvas container */}
            <div
                ref={containerRef}
                className="flex-1 overflow-auto cursor-crosshair"
            >
                <canvas
                    ref={canvasRef}
                    onClick={(e) => {
                        const canvas = canvasRef.current;
                        if (!canvas || !containerRef.current) return;

                        const rect = canvas.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;

                        const { cellWidth, cellHeight, colHeaders, rowHeaders } = config;
                        const offsetX = colHeaders ? cellWidth : 0;
                        const offsetY = rowHeaders ? cellHeight : 0;

                        const col = Math.floor((x - offsetX) / cellWidth);
                        const row = Math.floor((y - offsetY) / cellHeight);

                        if (col >= 0 && col < config.cols && row >= 0 && row < config.rows) {
                            handleCellClick(row, col);
                        }
                    }}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseUp={() => {
                        const canvas = canvasRef.current;
                        if (!canvas) return;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) return;
                        ctx.closePath();
                        setIsDrawing(false);
                    }}
                    onMouseLeave={() => {
                        setIsDrawing(false);
                    }}
                    className="block"
                />
            </div>
        </div>
    );
}

// Export additional types
export type { Cell, CellStyle, Cursor };
