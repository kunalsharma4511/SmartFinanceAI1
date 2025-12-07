
import React, { useRef, useState } from 'react';
import { Upload, FileText, X, AlertCircle, Lock, Unlock, Shield } from 'lucide-react';
import { analyzeBankStatement } from '../services/geminiService.jsx';
import { PDFDocument } from 'pdf-lib';

export const FileUpload = ({ onAnalysisComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Password handling
  const [password, setPassword] = useState('');
  const [needsPassword, setNeedsPassword] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      resetState(e.target.files[0]);
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
      resetState(e.dataTransfer.files[0]);
    }
  };

  const resetState = (newFile) => {
    setFile(newFile);
    setError(null);
    setNeedsPassword(false);
    setPassword('');
  };

  const removeFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setError(null);
    setNeedsPassword(false);
    setPassword('');
  };

  // Convert a Uint8Array to base64 using a Blob + FileReader to avoid
  // stack/argument-limit issues with String.fromCharCode.apply
  const convertUint8ArrayToBase64 = async (u8Arr) => {
    return await new Promise((resolve, reject) => {
      try {
        const blob = new Blob([u8Arr], { type: 'application/pdf' });
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result === 'string') {
            const base64Data = result.split(',')[1];
            resolve(base64Data);
          } else {
            reject(new Error('Failed to convert bytes to base64'));
          }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(blob);
      } catch (err) {
        reject(err);
      }
    });
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result;
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

  const processFile = async () => {
    if (!file) return null;

    // If it's not a PDF, return base64 directly
    if (file.type !== 'application/pdf') {
      const base64 = await convertFileToBase64(file);
      return base64;
    }

    // It is a PDF, try to load it to check encryption
    try {
      const arrayBuffer = await file.arrayBuffer();
      // QUICK DIAGNOSTIC: check for PDF file header
      try {
        const headerBytes = new Uint8Array(arrayBuffer.slice(0, 8));
        const headerText = new TextDecoder().decode(headerBytes);
        console.debug('PDF header:', headerText);
        if (!headerText.includes('%PDF')) {
          setError('Selected file does not appear to be a valid PDF (missing %PDF header).');
          console.error('Invalid PDF header', { headerText, fileName: file.name, fileType: file.type });
          return null;
        }
      } catch (hdrErr) {
        console.warn('Failed to read PDF header for diagnostics', hdrErr);
      }
      
      let pdfDoc;
      try {
        // Try loading without password first
        pdfDoc = await PDFDocument.load(arrayBuffer);
      } catch (e) {
        console.debug('PDFDocument.load failed (first try):', e?.message || e);
        // Only prompt for password when the error message indicates encryption/password
        const msg = (e && e.message) ? e.message.toLowerCase() : '';
        const looksEncrypted = msg.includes('password') || msg.includes('encrypted') || msg.includes('owner') || msg.includes('user');
        if (looksEncrypted && !password && !needsPassword) {
          setNeedsPassword(true);
          // Return to UI so user can enter password
          return null;
        }

        // If we have a password (second try), attempt load with it and provide clearer errors
        if (password) {
          try {
            pdfDoc = await PDFDocument.load(arrayBuffer, { password });
          } catch (passErr) {
            console.error('PDF load with password failed:', passErr);
            const pm = (passErr && passErr.message) ? passErr.message : '';
            if (pm.toLowerCase().includes('password')) {
              setError('Incorrect password. Please try again.');
              return null;
            }
            setError('Failed to open PDF with provided password (unsupported format or corrupt file).');
            return null;
          }
        } else {
          // Not encrypted and failed to parse -> corrupted or unsupported
          console.error('PDF load failed and does not appear encrypted:', e);
          setError('Failed to process PDF. It might be corrupted or in an unsupported format.');
          return null;
        }
      }

      // If we are here, we have a loaded pdfDoc.
      // Save it to a new buffer (this removes the password protection on the output)
      const savedBytes = await pdfDoc.save();
      return await convertUint8ArrayToBase64(savedBytes);

    } catch (e) {
      if (e.message === "PASSWORD_REQUIRED" || e.message === "WRONG_PASSWORD") {
        return null; // Handled by state updates
      }
      console.error("PDF Processing Error:", e);
      setError("Failed to process PDF. It might be corrupted or in an unsupported format.");
      return null;
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const base64 = await processFile();
      
      // If base64 is null, it means we stopped due to password requirement or error
      if (!base64) {
        setLoading(false);
        return;
      }

      // DIAGNOSTIC: verify base64 can be decoded and starts with %PDF when applicable
      const base64ToUint8Array = (b64) => {
        const binaryString = atob(b64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      };

      try {
        const decoded = base64ToUint8Array(base64);
        const header = new TextDecoder().decode(decoded.subarray(0, 8));
        console.debug('Decoded upload header:', header);
        console.debug('Original file size (bytes):', file.size, 'Decoded bytes length:', decoded.length);
        if (file.type === 'application/pdf' && !header.includes('%PDF')) {
          console.error('Decoded bytes do not contain %PDF signature. Upload aborted.', { header });
          setError('Decoded PDF does not contain a valid %PDF signature.');
          setLoading(false);
          return;
        }
      } catch (decErr) {
        console.warn('Base64 decode check failed (diagnostic):', decErr);
      }

      const mimeType = file.type; // We send as application/pdf (decrypted) or image
      const result = await analyzeBankStatement(base64, mimeType);
      onAnalysisComplete(result);
    } catch (err) {
      console.error(err);
      setError("Failed to analyze document. Please ensure it is a valid bank statement and try again.");
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
              <Upload className="w-8 h-8 text-indigo-500" />
            </div>
            <div>
              <p className="text-lg font-medium text-slate-700">Drop your bank statement here</p>
              <p className="text-sm text-slate-500 mt-1">Supports PDF, PNG, JPG</p>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Browse Files
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${needsPassword ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                {needsPassword ? (
                   <Lock className="w-6 h-6 text-amber-600" />
                ) : (
                   <FileText className="w-6 h-6 text-indigo-600" />
                )}
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

      {/* Manual Toggle for Password in case detection fails */}
      {file && file.type === 'application/pdf' && !needsPassword && !loading && (
        <div className="mt-2 flex justify-end">
          <button 
            onClick={() => { setNeedsPassword(true); setError(null); }}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <Shield className="w-3 h-3" />
            My file is password protected
          </button>
        </div>
      )}

      {/* Password Prompt */}
      {needsPassword && (
        <div className="mt-4 bg-amber-50 border border-amber-100 p-6 rounded-xl animate-fade-in">
          <h3 className="text-amber-800 font-medium mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Password Protected PDF
          </h3>
          <p className="text-amber-700 text-sm mb-4">
            This file appears to be encrypted. Please enter the password to unlock it.
            The password is only used locally to unlock the file.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter PDF Password"
              className="flex-1 px-4 py-2 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <button
              onClick={handleAnalyze}
              disabled={!password || loading}
              className="px-6 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Unlock className="w-4 h-4" />}
              Unlock
            </button>
          </div>
        </div>
      )}

      {/* Main Action Button - Hide if we need password, unless we are not loading */}
      {file && !needsPassword && (
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className={`w-full mt-6 py-3 rounded-xl font-medium text-white transition-all flex items-center justify-center gap-2 ${
            loading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200'
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
      
      {loading && !needsPassword && (
        <p className="text-center text-xs text-slate-400 mt-3 animate-pulse">
          Gemini is extracting transactions and categorizing expenses...
        </p>
      )}
    </div>
  );
};
