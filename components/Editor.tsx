import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Point, Rect } from '../types';

interface EditorProps {
  imageBase64: string;
  onProcess: (maskBase64: string | null) => void;
  isProcessing: boolean;
}

export const Editor: React.FC<EditorProps> = ({ imageBase64, onProcess, isProcessing }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(new Image());
  
  // State for manual selection
  const [selection, setSelection] = useState<Rect | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');

  // Load image onto canvas
  useEffect(() => {
    const img = imageRef.current;
    img.src = imageBase64;
    img.onload = () => {
      setImageLoaded(true);
      draw();
    };
  }, [imageBase64]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => requestAnimationFrame(draw);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selection, imageLoaded, mode]);

  // Drawing Logic
  const draw = useCallback(() => {
    if (!canvasRef.current || !containerRef.current || !imageLoaded) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    if (!ctx) return;

    // Calculate aspect ratio fit
    const containerWidth = containerRef.current.clientWidth;
    // Limit height to avoid scrolling issues on mobile
    const maxHeight = window.innerHeight * 0.6; 
    
    const scale = Math.min(containerWidth / img.width, maxHeight / img.height);
    const renderWidth = img.width * scale;
    const renderHeight = img.height * scale;

    // Set canvas display size (CSS pixels)
    canvas.style.width = `${renderWidth}px`;
    canvas.style.height = `${renderHeight}px`;

    // Set canvas internal size (Actual resolution) - matches image resolution for quality
    canvas.width = img.width;
    canvas.height = img.height;

    // Clear and draw image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    // Draw overlay for Manual Mode
    if (mode === 'manual') {
      // Darken the whole image slightly to make selection pop
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (selection) {
        // Clear the selected area (so it looks bright)
        ctx.clearRect(selection.x, selection.y, selection.width, selection.height);
        ctx.drawImage(img, selection.x, selection.y, selection.width, selection.height, selection.x, selection.y, selection.width, selection.height);

        // Draw border
        ctx.strokeStyle = '#ef4444'; // Red-500
        ctx.lineWidth = 4 / scale; // Keep line width consistent regardless of zoom
        ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
      }
    }
  }, [imageLoaded, selection, mode]);

  // Coordinate Conversion
  const getCanvasCoordinates = (clientX: number, clientY: number): Point | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Mouse/Touch Handlers
  const handleStart = (clientX: number, clientY: number) => {
    if (mode !== 'manual' || isProcessing) return;
    const point = getCanvasCoordinates(clientX, clientY);
    if (point) {
      setIsDrawing(true);
      setStartPoint(point);
      setSelection({ x: point.x, y: point.y, width: 0, height: 0 });
    }
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDrawing || !startPoint || mode !== 'manual') return;
    const current = getCanvasCoordinates(clientX, clientY);
    if (current) {
      const x = Math.min(startPoint.x, current.x);
      const y = Math.min(startPoint.y, current.y);
      const width = Math.abs(current.x - startPoint.x);
      const height = Math.abs(current.y - startPoint.y);
      setSelection({ x, y, width, height });
    }
  };

  const handleEnd = () => {
    setIsDrawing(false);
    setStartPoint(null);
  };

  // Generate Mask and Trigger Process
  const handleProcessClick = () => {
    if (mode === 'auto') {
      onProcess(null); // No mask for auto mode
    } else {
      if (!selection || selection.width === 0 || selection.height === 0) {
        alert("请先框选需要去除的水印区域");
        return;
      }

      // Create a mask canvas
      const maskCanvas = document.createElement('canvas');
      maskCanvas.width = imageRef.current.width;
      maskCanvas.height = imageRef.current.height;
      const mCtx = maskCanvas.getContext('2d');
      if (mCtx) {
        // Black background
        mCtx.fillStyle = 'black';
        mCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        
        // White selection
        mCtx.fillStyle = 'white';
        mCtx.fillRect(selection.x, selection.y, selection.width, selection.height);

        const maskBase64 = maskCanvas.toDataURL('image/png');
        onProcess(maskBase64);
      }
    }
  };

  // Helper for touch events
  const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX, e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);

  // Helper for mouse events
  const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX, e.clientY);
  const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);

  // Redraw when selection changes (handled by useEffect, but ensured here)
  useEffect(() => {
    draw();
  }, [selection, draw]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Toolbar */}
      <div className="flex bg-white rounded-full p-1.5 shadow-sm border border-slate-200 mb-4 space-x-2">
        <button
          onClick={() => { setMode('auto'); setSelection(null); }}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            mode === 'auto' 
              ? 'bg-primary text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          ✨ 自动检测
        </button>
        <button
          onClick={() => setMode('manual')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            mode === 'manual' 
              ? 'bg-primary text-white shadow-md' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          🖐 手动框选
        </button>
      </div>

      {/* Editor Area */}
      <div 
        ref={containerRef} 
        className="relative w-full flex justify-center bg-slate-100 rounded-xl overflow-hidden border border-slate-200 select-none touch-none"
        style={{ minHeight: '300px' }}
      >
        {!imageLoaded && <div className="absolute inset-0 flex items-center justify-center text-slate-400">Loading Image...</div>}
        <canvas
          ref={canvasRef}
          className={`max-w-full ${mode === 'manual' ? 'cursor-crosshair' : 'cursor-default'}`}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={handleEnd}
        />
        
        {mode === 'manual' && !selection && !isDrawing && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-xs px-3 py-1 rounded-full pointer-events-none">
            请在图片上框选水印区域
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-6 flex space-x-4 w-full sm:w-auto">
        <button
          onClick={handleProcessClick}
          disabled={isProcessing}
          className={`flex-1 sm:flex-none sm:min-w-[200px] flex items-center justify-center space-x-2 py-3 px-6 rounded-xl font-semibold text-white transition-all transform active:scale-95 shadow-lg shadow-primary/20
            ${isProcessing ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-primary to-secondary hover:brightness-110'}`}
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>AI 处理中...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
              </svg>
              <span>开始去水印</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};