import React, { useState, useRef } from 'react';

interface CompareSliderProps {
  original: string;
  processed: string;
}

export const CompareSlider: React.FC<CompareSliderProps> = ({ original, processed }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    
    // Calculate position relative to the image container
    const position = ((x - rect.left) / rect.width) * 100;
    setSliderPosition(Math.min(100, Math.max(0, position)));
  };

  // Prevent default drag behavior
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="flex justify-center w-full">
      <div 
        ref={containerRef}
        className="relative inline-block overflow-hidden select-none cursor-ew-resize group rounded-xl shadow-lg border border-slate-200"
        onMouseMove={(e) => e.buttons === 1 && handleMouseMove(e)}
        onTouchMove={handleMouseMove}
        onClick={handleMouseMove}
      >
        {/* Background (Processed) - Drives dimensions */}
        {/* Using max-h-[70vh] and w-auto ensures the container shrinks to fit the image, 
            preventing the 'zoom' effect caused by overflow clipping */}
        <img 
          src={processed} 
          alt="After" 
          className="block max-w-full max-h-[70vh] w-auto h-auto object-contain select-none"
          onDragStart={handleDragStart}
        />

        {/* Foreground (Original) - Clipped */}
        <div 
          className="absolute top-0 left-0 h-full w-full overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img 
            src={original} 
            alt="Before" 
            className="w-full h-full object-contain block select-none"
            onDragStart={handleDragStart}
          />
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 bg-black/60 text-white px-2 py-1 rounded text-xs pointer-events-none z-10">原图</div>
        <div className="absolute top-4 right-4 bg-primary/80 text-white px-2 py-1 rounded text-xs pointer-events-none z-10">去水印后</div>

        {/* Slider Handle */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};