import React, { useRef, useState, useEffect, useCallback } from 'react';
import { hexToHsv, hsvToHex } from '../utils/colorUtils';

interface ColorPickerProps {
  color: string;
  onChange: (hex: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange }) => {
  // We keep local HSV state for smooth dragging (prevents loss of hue when saturation is 0)
  const [hsv, setHsv] = useState(() => hexToHsv(color));
  const [isDraggingSB, setIsDraggingSB] = useState(false); // Saturation/Brightness
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  
  const sbRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);

  // Sync with external prop only if not dragging (prevents jitter)
  useEffect(() => {
    if (!isDraggingSB && !isDraggingHue) {
      const newHsv = hexToHsv(color);
      // Only update if significantly different to preserve Hue when S/V is 0
      // This is a simple check, could be more robust
      const currentColor = hsvToHex(hsv.h, hsv.s, hsv.v);
      if (currentColor.toLowerCase() !== color.toLowerCase()) {
         setHsv(newHsv);
      }
    }
  }, [color]);

  const handleSBChange = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!sbRef.current) return;
    const rect = sbRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    
    // x is Saturation, y is (1 - Value)
    const newS = x;
    const newV = 1 - y;
    
    const newHsv = { ...hsv, s: newS, v: newV };
    setHsv(newHsv);
    onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  }, [hsv, onChange]);

  const handleHueChange = useCallback((e: MouseEvent | React.MouseEvent) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    
    const newH = x * 360;
    const newHsv = { ...hsv, h: newH };
    setHsv(newHsv);
    onChange(hsvToHex(newHsv.h, newHsv.s, newHsv.v));
  }, [hsv, onChange]);

  // Global mouse listeners for dragging
  useEffect(() => {
    const handleUp = () => {
      setIsDraggingSB(false);
      setIsDraggingHue(false);
    };
    
    const handleMove = (e: MouseEvent) => {
      if (isDraggingSB) handleSBChange(e);
      if (isDraggingHue) handleHueChange(e);
    };

    if (isDraggingSB || isDraggingHue) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingSB, isDraggingHue, handleSBChange, handleHueChange]);

  return (
    <div className="flex flex-col gap-3 select-none w-full">
      
      {/* Saturation / Brightness Area */}
      <div 
        ref={sbRef}
        className="w-full h-32 rounded-lg relative cursor-crosshair overflow-hidden shadow-inner border border-gray-600"
        style={{
          backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
        }}
        onMouseDown={(e) => {
          setIsDraggingSB(true);
          handleSBChange(e);
        }}
      >
        {/* White Gradient (Horizontal) */}
        <div 
           className="absolute inset-0" 
           style={{ background: 'linear-gradient(to right, #fff, transparent)' }} 
        />
        {/* Black Gradient (Vertical) */}
        <div 
           className="absolute inset-0" 
           style={{ background: 'linear-gradient(to bottom, transparent, #000)' }} 
        />
        
        {/* Handle */}
        <div 
           className="absolute w-3 h-3 rounded-full border-2 border-white shadow-sm -translate-x-1.5 -translate-y-1.5 pointer-events-none"
           style={{
             left: `${hsv.s * 100}%`,
             top: `${(1 - hsv.v) * 100}%`,
             backgroundColor: color
           }}
        />
      </div>

      {/* Hue Slider */}
      <div className="space-y-1">
        <div 
          ref={hueRef}
          className="w-full h-3 rounded-full relative cursor-pointer shadow-inner border border-gray-600"
          style={{
            background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)'
          }}
          onMouseDown={(e) => {
            setIsDraggingHue(true);
            handleHueChange(e);
          }}
        >
          {/* Hue Handle */}
          <div 
            className="absolute w-3 h-3 rounded-full border-2 border-white shadow-sm top-0 -translate-x-1.5 -ml-[1px] bg-white pointer-events-none"
            style={{
              left: `${(hsv.h / 360) * 100}%`
            }}
          />
        </div>
      </div>

    </div>
  );
};

export default ColorPicker;
