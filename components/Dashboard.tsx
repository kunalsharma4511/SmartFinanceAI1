
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet, IndianRupee } from 'lucide-react';

const COLORS = ['#10B981', '#0d6efd', '#F59E0B', '#EF4444', '#0d6efd', '#EC4899'];

export const Dashboard = ({ data }) => {
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400">
        <Wallet className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-xl font-medium">No financial data available</p>
        <p className="text-sm">Upload a bank statement to see analytics.</p>
      </div>
    );
  }

  const { summary } = data;

  // Prepare chart data
  const pieData = summary.topSpendingCategories.map((item) => ({
    name: item.category,
    value: item.amount,
  }));

  const flowData = [
    { name: 'Income', amount: summary.totalIncome },
    { name: 'Expenses', amount: summary.totalExpense },
    { name: 'Savings', amount: summary.netSavings },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-500 text-sm font-medium">Total Income</h3>
            <div className="p-2 bg-emerald-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">₹{summary.totalIncome.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-500 text-sm font-medium">Total Expenses</h3>
            <div className="p-2 bg-rose-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-800">₹{summary.totalExpense.toFixed(2)}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-slate-500 text-sm font-medium">Net Savings</h3>
            <div className="p-2 bg-blue-100 rounded-lg">
              <IndianRupee className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${summary.netSavings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            ₹{summary.netSavings.toFixed(2)}
          </p>
        </div>
      </div>

      {/* AI Advice */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-50 p-6 rounded-xl border border-blue-100">
        <h3 className="text-blue-900 font-semibold mb-2 flex items-center gap-2">
          ✨ Gemini Insight
        </h3>
        <p className="text-blue-800 leading-relaxed text-sm md:text-base">
          {summary.advice}
        </p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending Category Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Spending by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `₹${(value as number).toFixed(2)}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash Flow Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6">Cash Flow Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(value) => `₹${(value as number).toFixed(2)}`} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {flowData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.name === 'Income' ? '#10B981' : entry.name === 'Expenses' ? '#EF4444' : '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
