import React, { useState } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { Editor } from './components/Editor';
import { CompareSlider } from './components/CompareSlider';
import { removeWatermark } from './services/geminiService';
import { ProcessingStatus, ProcessMode } from './types';

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleImageSelected = (base64: string) => {
    setOriginalImage(base64);
    setProcessedImage(null);
    setStatus(ProcessingStatus.IDLE);
    setErrorMsg(null);
  };

  const handleProcess = async (maskBase64: string | null, mode: ProcessMode) => {
    if (!originalImage) return;

    setStatus(ProcessingStatus.PROCESSING);
    setErrorMsg(null);

    try {
      const resultBase64 = await removeWatermark(originalImage, maskBase64, mode);
      setProcessedImage(resultBase64);
      setStatus(ProcessingStatus.SUCCESS);
    } catch (err: any) {
      setStatus(ProcessingStatus.ERROR);
      setErrorMsg("处理图片时出错，请稍后重试。");
      console.error(err);
    }
  };

  const downloadImage = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = `clean_canvas_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center text-white font-bold">
              C
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600">
              CleanCanvas
            </span>
          </div>
          <div className="text-sm text-slate-500 hidden sm:block">AI 图片无损去水印</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container max-w-5xl mx-auto px-4 py-8">
        
        {/* Error Message */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            {errorMsg}
          </div>
        )}

        {/* View Switching */}
        {!originalImage ? (
          <div className="max-w-xl mx-auto mt-12">
            <div className="text-center mb-10">
              <h1 className="text-4xl font-extrabold text-slate-900 mb-4">一键去除图片水印</h1>
              <p className="text-lg text-slate-600">支持自动识别和手动框选，AI 智能填补背景，保持图片无损高清。</p>
            </div>
            <ImageUploader onImageSelected={handleImageSelected} />
            
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
              <FeatureCard 
                icon="⚡" 
                title="快速处理" 
                desc="秒级响应，无需等待" 
              />
              <FeatureCard 
                icon="🎯" 
                title="手动多选" 
                desc="支持多个区域同时框选" 
              />
              <FeatureCard 
                icon="🌫️" 
                title="满屏水印" 
                desc="专攻重复平铺的文字水印" 
              />
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Navigation back */}
            <button 
              onClick={() => { setOriginalImage(null); setProcessedImage(null); }}
              className="text-slate-500 hover:text-primary flex items-center text-sm font-medium transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              返回上传
            </button>

            {/* Editor or Result */}
            {!processedImage ? (
              <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
                <Editor 
                  imageBase64={originalImage} 
                  onProcess={handleProcess} 
                  isProcessing={status === ProcessingStatus.PROCESSING}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-100">
                   <h3 className="text-lg font-semibold text-slate-800 mb-4 text-center">效果对比</h3>
                   <div className="flex justify-center">
                      <CompareSlider original={originalImage} processed={processedImage} />
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={() => { setProcessedImage(null); }}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                  >
                    重新编辑
                  </button>
                  <button
                    onClick={downloadImage}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 mr-2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 12.75l-3.32-3.32M12 12.75l3.32-3.32M12 12.75V3" />
                    </svg>
                    下载图片
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 py-6 mt-auto">
        <div className="text-center text-slate-400 text-sm">
          &copy; {new Date().getFullYear()} CleanCanvas. Powered by Google Gemini AI.
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: string, title: string, desc: string }) => (
  <div className="p-4 rounded-xl bg-white border border-slate-100 shadow-sm">
    <div className="text-3xl mb-2">{icon}</div>
    <h3 className="font-semibold text-slate-800 mb-1">{title}</h3>
    <p className="text-xs text-slate-500">{desc}</p>
  </div>
);

export default App;