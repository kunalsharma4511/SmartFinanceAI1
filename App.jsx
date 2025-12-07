
import React, { useState } from 'react';
import { AppView } from './types.js';
import { Dashboard } from './components/Dashboard.tsx';
import { FileUpload } from './components/FileUpload.tsx';
import { TransactionList } from './components/TransactionList.tsx';
import { ChatBot } from './components/ChatBot.tsx';
import { LayoutDashboard, Upload, List, MessageSquareText, Wallet, Menu, X } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState(AppView.UPLOAD);
  const [analysisData, setAnalysisData] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleAnalysisComplete = (result) => {
    setAnalysisData(result);
    setCurrentView(AppView.DASHBOARD);
  };

  const navItems = [
    { id: AppView.UPLOAD, label: 'Upload', icon: Upload },
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: AppView.TRANSACTIONS, label: 'Transactions', icon: List },
    { id: AppView.CHAT, label: 'Assistant', icon: MessageSquareText },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Wallet className="w-6 h-6 text-indigo-600" />
          <h1 className="font-bold text-slate-800">SmartFinance</h1>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 h-screen w-64 bg-white border-r border-slate-200 z-40 transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">SmartFinance</h1>
          </div>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setIsMobileMenuOpen(false);
                }}
                disabled={item.id !== AppView.UPLOAD && !analysisData}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  currentView === item.id
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50'
                } ${item.id !== AppView.UPLOAD && !analysisData ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {analysisData && (
           <div className="absolute bottom-0 w-full p-6 border-t border-slate-100 bg-slate-50/50">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                 ${analysisData.summary.netSavings > 0 ? '+' : ''}
               </div>
               <div>
                 <p className="text-xs text-slate-500 font-medium uppercase">Net Savings</p>
                 <p className="text-sm font-bold text-slate-800">${analysisData.summary.netSavings.toFixed(2)}</p>
               </div>
             </div>
           </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto h-[calc(100vh-64px)] md:h-screen">
        <header className="mb-8">
          <h2 className="text-2xl font-bold text-slate-800">
            {navItems.find(i => i.id === currentView)?.label}
          </h2>
          <p className="text-slate-500">
            {currentView === AppView.UPLOAD && "Start by analyzing your bank statement"}
            {currentView === AppView.DASHBOARD && "Overview of your financial health"}
            {currentView === AppView.TRANSACTIONS && "Detailed list of your spending"}
            {currentView === AppView.CHAT && "Ask Gemini about your money"}
          </p>
        </header>

        <div className="max-w-6xl mx-auto">
          {currentView === AppView.UPLOAD && (
            <FileUpload onAnalysisComplete={handleAnalysisComplete} />
          )}

          {currentView === AppView.DASHBOARD && (
            <Dashboard data={analysisData} />
          )}

          {currentView === AppView.TRANSACTIONS && analysisData && (
            <TransactionList transactions={analysisData.transactions} />
          )}

          {currentView === AppView.CHAT && analysisData && (
            <ChatBot transactions={analysisData.transactions} />
          )}
        </div>
      </main>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
}
