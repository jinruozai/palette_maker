import React, { useRef, useState } from 'react';
import { ColorStop, GradientType } from '../types';
import { generateUUID } from '../utils/colorUtils';
import { Trash2, ArrowRight, ArrowDown, RotateCw } from 'lucide-react';

interface GradientEditorProps {
  stops: ColorStop[];
  onChange: (stops: ColorStop[]) => void;
  gradientType: GradientType;
  onTypeChange: (type: GradientType) => void;
}

const GradientEditor: React.FC<GradientEditorProps> = ({ stops, onChange, gradientType, onTypeChange }) => {
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

  const toggleDirection = () => {
    onTypeChange(gradientType === 'linear-horizontal' ? 'linear-vertical' : 'linear-horizontal');
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
    <div className="flex flex-col gap-3 select-none relative pt-2">
      
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
            <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45 border-2 shadow-sm transition-transform ${selectedStopId === stop.id ? 'border-blue-400 bg-white scale-125 z-30' : 'border-white bg-gray-200 z-20'}`} />
          </div>
        ))}
      </div>

      {/* Controls for Selected Stop */}
      {selectedStop ? (
        <div className="flex items-center gap-3 mt-4 bg-gray-700/30 p-2 rounded-lg border border-gray-700/50 justify-between">
          
          {/* 1. Direction Toggle */}
          <button 
             onClick={toggleDirection}
             className="w-8 h-8 rounded border border-gray-600 hover:border-white transition-all shadow-sm relative group overflow-hidden"
             title={gradientType === 'linear-horizontal' ? 'Horizontal (Click to Vertical)' : 'Vertical (Click to Horizontal)'}
          >
             <div 
               className="absolute inset-0" 
               style={{ 
                 background: gradientType === 'linear-horizontal' 
                   ? getGradientCss().replace('linear-gradient(to right,', 'linear-gradient(to right,') // Keep as is
                   : getGradientCss().replace('linear-gradient(to right,', 'linear-gradient(to bottom,') // Change direction
               }} 
             />
             {/* Hover overlay hint */}
             <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
          </button>

          {/* 2. Color Picker */}
          <div className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-500 shadow-inner group cursor-pointer">
               <input
                type="color"
                value={selectedStop.color}
                onChange={(e) => updateStopColor(selectedStop.id, e.target.value)}
                className="absolute inset-0 w-[150%] h-[150%] -top-[25%] -left-[25%] cursor-pointer p-0 border-0"
              />
            </div>
            <span className="text-xs font-mono text-gray-400 uppercase">{selectedStop.color}</span>
          </div>
          
          {/* 3. Delete Button */}
          <button
            onClick={() => deleteStop(selectedStop.id)}
            disabled={stops.length <= 1}
            className="p-1.5 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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