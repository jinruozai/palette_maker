import React, { useRef, useState } from 'react';
import { ColorStop } from '../types';
import { generateUUID } from '../utils/colorUtils';
import { Trash2 } from 'lucide-react';

interface GradientEditorProps {
  stops: ColorStop[];
  onChange: (stops: ColorStop[]) => void;
}

const GradientEditor: React.FC<GradientEditorProps> = ({ stops, onChange }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(stops[0]?.id || null);

  const handleBarClick = (e: React.MouseEvent) => {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const offset = Math.max(0, Math.min(1, x / rect.width));

    const newStop: ColorStop = {
      id: generateUUID(),
      offset,
      color: '#ffffff',
    };
    
    // Insert and sort
    const newStops = [...stops, newStop].sort((a, b) => a.offset - b.offset);
    onChange(newStops);
    setSelectedStopId(newStop.id);
  };

  const updateStopColor = (id: string, color: string) => {
    const newStops = stops.map((s) => (s.id === id ? { ...s, color } : s));
    onChange(newStops);
  };

  const updateStopOffset = (id: string, offset: number) => {
    const newStops = stops.map((s) => (s.id === id ? { ...s, offset } : s));
    onChange(newStops.sort((a, b) => a.offset - b.offset));
  };

  const deleteStop = (id: string) => {
    if (stops.length <= 1) return; // Prevent deleting last stop
    const newStops = stops.filter((s) => s.id !== id);
    onChange(newStops);
    if (selectedStopId === id) {
      setSelectedStopId(newStops[0].id);
    }
  };

  const getGradientCss = () => {
    const sorted = [...stops].sort((a, b) => a.offset - b.offset);
    const cssString = sorted.map((s) => `${s.color} ${s.offset * 100}%`).join(', ');
    return `linear-gradient(to right, ${cssString})`;
  };

  // Dragging logic
  const handleDragStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedStopId(id);
    
    const startX = e.clientX;
    const stopToMove = stops.find(s => s.id === id);
    if (!stopToMove || !barRef.current) return;
    
    const startOffset = stopToMove.offset;
    const rect = barRef.current.getBoundingClientRect();

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaOffset = deltaX / rect.width;
      let newOffset = Math.max(0, Math.min(1, startOffset + deltaOffset));
      updateStopOffset(id, newOffset);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const selectedStop = stops.find((s) => s.id === selectedStopId);

  return (
    <div className="flex flex-col gap-4 p-2 bg-gray-800 rounded-lg select-none relative">
      
      <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
        <span>Gradient Editor</span>
      </div>

      {/* The Gradient Bar Area */}
      <div 
        className="relative h-12 w-full cursor-crosshair group"
        onMouseDown={handleBarClick}
        ref={barRef}
      >
        {/* Background Checkerboard for transparency (aesthetic) */}
        <div className="absolute inset-0 rounded-md bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAAIklEQVQIW2NkQAKrVq36zwjjgzjwqoAoQAfBCkGGgAgiDABnWgoXg9yglgAAAABJRU5ErkJggg==')] opacity-20"></div>
        
        {/* Gradient Preview */}
        <div 
          className="absolute inset-0 rounded-md border-2 border-gray-600 group-hover:border-gray-500 transition-colors"
          style={{ background: getGradientCss() }}
        />

        {/* Handles */}
        {stops.map((stop) => (
          <div
            key={stop.id}
            onMouseDown={(e) => handleDragStart(e, stop.id)}
            className={`absolute top-0 w-4 h-full -ml-2 cursor-ew-resize group/handle z-10 hover:z-20`}
            style={{ left: `${stop.offset * 100}%` }}
          >
            {/* The handle indicator line */}
            <div className={`w-0.5 h-full mx-auto bg-white shadow-[0_0_2px_rgba(0,0,0,0.5)] ${selectedStopId === stop.id ? 'bg-blue-400' : ''}`} />
            
            {/* The clickable triangle/thumb at bottom */}
            <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-2 shadow-sm ${selectedStopId === stop.id ? 'border-blue-400 bg-white scale-125' : 'border-white bg-gray-200'}`} />
          </div>
        ))}
      </div>

      {/* Controls for Selected Stop */}
      {selectedStop ? (
        <div className="flex items-center gap-3 mt-2 bg-gray-700 p-2 rounded">
          <input
            type="color"
            value={selectedStop.color}
            onChange={(e) => updateStopColor(selectedStop.id, e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-none bg-transparent"
          />
          <div className="flex flex-col flex-1">
            <label className="text-xs text-gray-400">Offset: {(selectedStop.offset * 100).toFixed(0)}%</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedStop.offset}
              onChange={(e) => updateStopOffset(selectedStop.id, parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => deleteStop(selectedStop.id)}
            disabled={stops.length <= 1}
            className="p-1.5 text-red-400 hover:bg-gray-600 rounded disabled:opacity-30 disabled:cursor-not-allowed"
            title="Remove Stop"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : (
        <div className="text-xs text-gray-500 text-center py-3">Select a stop to edit</div>
      )}
    </div>
  );
};

export default GradientEditor;
