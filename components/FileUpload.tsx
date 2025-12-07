
import React, { useRef, useState } from 'react';
import { Upload, FileText, X, AlertCircle } from 'lucide-react';
import { analyzeBankStatement } from '../services/geminiService';

export const FileUpload = ({ onAnalysisComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setError(null);
    }
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError(null);
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result;
        // Strip the data:application/pdf;base64, part
        if (typeof result === 'string') {
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const base64 = await convertFileToBase64(file);
      const mimeType = file.type;
      
      const result = await analyzeBankStatement(base64, mimeType);
      onAnalysisComplete(result);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze document. Please ensure it is a valid bank statement (PDF or Image) and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div 
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange} 
          className="hidden" 
          accept="application/pdf,image/png,image/jpeg,image/jpg"
        />

        {!file ? (
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 bg-white rounded-full shadow-sm">
              <Upload className="w-8 h-8 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-700">Drop your bank statement here</p>
              <p className="text-sm text-slate-500 mt-1">Supports PDF, PNG, JPG</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Browse Files
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-700 truncate max-w-[200px]">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            </div>
            <button 
              onClick={removeFile}
              className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-rose-50 text-rose-700 rounded-xl flex items-center gap-2 border border-rose-100">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {file && (
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className={`w-full mt-6 py-3 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${
            loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200'
          }`}
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing Statement...
            </>
          ) : (
            'Analyze Statement'
          )}
        </button>
      )}
      
      {loading && (
        <p className="text-center text-xs text-slate-400 mt-3 animate-pulse">
          Gemini is extracting transactions and categorizing expenses...
        </p>
      )}
    </div>
  );
};
