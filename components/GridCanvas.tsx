import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import { GridConfig, SelectionBounds, PaletteItem } from '../types';

interface GridCanvasProps {
  config: GridConfig;
  showGrid: boolean;
  onSelectionChange: (bounds: SelectionBounds | null) => void;
}

export interface GridCanvasHandle {
  applyPaletteItem: (item: PaletteItem) => void;
  exportImage: () => void;
  importImage: (file: File) => void;
  reset: () => void;
}

const GridCanvas = forwardRef<GridCanvasHandle, GridCanvasProps>(({ config, showGrid, onSelectionChange }, ref) => {
  const textureCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [selection, setSelection] = useState<SelectionBounds | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);

  // Helper to get contexts
  const getTextureCtx = () => textureCanvasRef.current?.getContext('2d', { willReadFrequently: true });
  const getOverlayCtx = () => overlayCanvasRef.current?.getContext('2d');

  const numCols = Math.ceil(config.width / config.cellSize);
  const numRows = Math.ceil(config.height / config.cellSize);

  // Initialize/Reset Logic
  useEffect(() => {
    // When config changes, we might want to preserve data or clear.
    // For this tool, resizing usually implies a new workspace, so we clear to avoid stretching artifacts or data loss.
    // However, we fill with white initially.
    const ctx = getTextureCtx();
    if (ctx && textureCanvasRef.current) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, config.width, config.height);
    }
    setSelection(null);
    onSelectionChange(null);
  }, [config.width, config.height]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    applyPaletteItem: (item: PaletteItem) => {
      if (!selection) return;

      const ctx = getTextureCtx();
      if (!ctx) return;

      const minX = Math.min(selection.x1, selection.x2);
      const minY = Math.min(selection.y1, selection.y2);
      const maxX = Math.max(selection.x1, selection.x2);
      const maxY = Math.max(selection.y1, selection.y2);

      const x = minX * config.cellSize;
      const y = minY * config.cellSize;
      const width = (maxX - minX + 1) * config.cellSize;
      const height = (maxY - minY + 1) * config.cellSize;

      if (item.type === 'solid') {
        ctx.fillStyle = item.solidColor;
        ctx.fillRect(x, y, width, height);
      } else {
        // Gradient Logic
        let gradient: CanvasGradient;
        
        if (item.type === 'linear-horizontal') {
          gradient = ctx.createLinearGradient(x, y, x + width, y);
        } else {
          gradient = ctx.createLinearGradient(x, y, x, y + height);
        }

        // Add stops
        // Sort stops first
        const sortedStops = [...item.gradientStops].sort((a, b) => a.offset - b.offset);
        sortedStops.forEach(stop => {
          gradient.addColorStop(stop.offset, stop.color);
        });

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, height);
      }
    },
    exportImage: () => {
      if (!textureCanvasRef.current) return;
      const link = document.createElement('a');
      link.download = `palette_${config.width}x${config.height}.png`;
      link.href = textureCanvasRef.current.toDataURL('image/png');
      link.click();
    },
    importImage: (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const ctx = getTextureCtx();
          if (!ctx) return;
          // Draw image stretched to fit entire texture config
          ctx.drawImage(img, 0, 0, config.width, config.height);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    },
    reset: () => {
      const ctx = getTextureCtx();
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, config.width, config.height);
      }
      setSelection(null);
      onSelectionChange(null);
    }
  }));

  // Render Overlay (Grid + Selection)
  // This is separated from texture rendering to avoid redrawing the expensive image data on every mouse move
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = getOverlayCtx();
    if (!ctx) return;

    // Clear Overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Grid Lines (Only if showGrid is true)
    if (showGrid) {
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; // Slightly darker lines for visibility over colors
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      // Vertical lines
      for (let x = 0; x <= numCols; x++) {
        ctx.moveTo(x * config.cellSize, 0);
        ctx.lineTo(x * config.cellSize, config.height);
      }
      // Horizontal lines
      for (let y = 0; y <= numRows; y++) {
        ctx.moveTo(0, y * config.cellSize);
        ctx.lineTo(config.width, y * config.cellSize);
      }
      ctx.stroke();
    }

    // 2. Draw Selection Highlight
    if (selection) {
      const minX = Math.min(selection.x1, selection.x2);
      const maxX = Math.max(selection.x1, selection.x2);
      const minY = Math.min(selection.y1, selection.y2);
      const maxY = Math.max(selection.y1, selection.y2);

      const selX = minX * config.cellSize;
      const selY = minY * config.cellSize;
      const selW = (maxX - minX + 1) * config.cellSize;
      const selH = (maxY - minY + 1) * config.cellSize;

      // Draw high-contrast alternating dashed line (Blue & White)
      // Drawn strictly INSIDE the bounds to ensure visibility at canvas edges.
      
      const lineWidth = 2;
      // Inset calculation:
      // To draw a 2px stroke strictly inside [0, W]:
      // The path should be at 1px. Stroke extends 0px to 2px.
      // So rect needs to be x+1, y+1, w-2, h-2.
      
      const drawX = selX + 1;
      const drawY = selY + 1;
      const drawW = selW - 2;
      const drawH = selH - 2;

      ctx.lineWidth = lineWidth;
      
      // Pass 1: White Dashes
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(drawX, drawY, drawW, drawH);

      // Pass 2: Blue Dashes (filling the gaps)
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.lineDashOffset = 5; // Offset by dash length to fill gaps
      ctx.strokeStyle = '#3b82f6'; // Tailwind blue-500
      ctx.strokeRect(drawX, drawY, drawW, drawH);
      
      // Reset dash for next render cycles
      ctx.setLineDash([]);
    }

  }, [config, numCols, numRows, selection, showGrid]); // Re-render when showGrid changes

  // Mouse Interaction
  const getGridCoordinates = (e: React.MouseEvent) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scale factor between display size and internal resolution
    const scaleX = config.width / rect.width;
    const scaleY = config.height / rect.height;

    const x = Math.floor(((e.clientX - rect.left) * scaleX) / config.cellSize);
    const y = Math.floor(((e.clientY - rect.top) * scaleY) / config.cellSize);

    return { 
      x: Math.max(0, Math.min(numCols - 1, x)), 
      y: Math.max(0, Math.min(numRows - 1, y)) 
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const coords = getGridCoordinates(e);
    setDragStart(coords);
    setSelection({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
    setIsDragging(true);
    onSelectionChange({ x1: coords.x, y1: coords.y, x2: coords.x, y2: coords.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragStart) return;
    const coords = getGridCoordinates(e);
    
    // Optional: Add a check to only update if coordinates changed to reduce renders
    if (coords.x === selection?.x2 && coords.y === selection?.y2) return;

    const newSelection = {
      x1: dragStart.x,
      y1: dragStart.y,
      x2: coords.x,
      y2: coords.y
    };
    setSelection(newSelection);
    onSelectionChange(newSelection);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex items-center justify-center bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700 select-none"
    >
      {/* Wrapper to constrain aspect ratio */}
      <div 
         className="relative shadow-2xl"
         style={{
           aspectRatio: `${config.width} / ${config.height}`,
           height: '100%',
           maxHeight: '100%',
           maxWidth: '100%'
         }}
      >
        {/* Layer 1: Texture (Pixel Data) */}
        <canvas
          ref={textureCanvasRef}
          width={config.width}
          height={config.height}
          className="absolute inset-0 w-full h-full bg-white"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* Layer 2: Grid & Overlay (UI) */}
        <canvas
          ref={overlayCanvasRef}
          width={config.width}
          height={config.height}
          className="absolute inset-0 w-full h-full cursor-crosshair z-10"
          style={{ imageRendering: 'pixelated' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>
    </div>
  );
});

export default GridCanvas;