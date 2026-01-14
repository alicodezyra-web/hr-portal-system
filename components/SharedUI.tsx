
import React from 'react';
import { LucideIcon, X } from 'lucide-react';

export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => (
  <div className={`bg-white rounded-[1.5rem] sm:rounded-[2.5rem] p-5 sm:p-8 shadow-sm border border-slate-100 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/40 ${className}`}>
    {children}
  </div>
);

export const Badge: React.FC<{ children: React.ReactNode; variant?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'slate' | 'black' }> = ({ children, variant = 'slate' }) => {
  const styles = {
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    slate: 'bg-slate-50 text-slate-500 border-slate-100',
    black: 'bg-black text-white border-black',
  };
  return (
    <span className={`px-2 sm:px-3 py-1 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${styles[variant]}`}>
      {children}
    </span>
  );
};

export const SectionHeader: React.FC<{ title: string; subtitle?: string; icon?: LucideIcon; iconColor?: string }> = ({ title, subtitle, icon: Icon, iconColor = "text-black" }) => (
  <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
    {Icon && (
      <div className={`w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center ${iconColor} border border-slate-200 shadow-sm flex-shrink-0`}>
        <Icon size={20} className="sm:w-[22px] sm:h-[22px]" />
      </div>
    )}
    <div className="min-w-0">
      <h3 className="text-lg sm:text-xl font-black text-black tracking-tight leading-none mb-1 truncate">{title}</h3>
      {subtitle && <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{subtitle}</p>}
    </div>
  </div>
);

export const PrimaryButton: React.FC<{ onClick?: () => void; children: React.ReactNode; icon?: LucideIcon; className?: string; disabled?: boolean; type?: "button" | "submit" | "reset" }> = ({ onClick, children, icon: Icon, className = "", disabled, type = "button" }) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled}
    className={`w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-black text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-slate-200 hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
  >
    {Icon && <Icon size={16} className="sm:w-[18px] sm:h-[18px]" />}
    {children}
  </button>
);

export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
      <div className="relative bg-white rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-4xl h-[85vh] sm:h-auto sm:max-h-[90vh] overflow-hidden shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-500">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <h3 className="text-xl sm:text-2xl font-black text-black tracking-tight uppercase leading-none">{title}</h3>
          <button onClick={onClose} className="p-2 sm:p-3 hover:bg-slate-100 rounded-xl sm:rounded-2xl transition-colors text-slate-400">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 sm:p-10 overflow-y-auto h-[calc(100%-80px)] sm:max-h-[calc(90vh-140px)] custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export const Input: React.FC<{ label: string; icon?: LucideIcon;[key: string]: any }> = ({ label, icon: Icon, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      {Icon && <Icon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-black transition-colors" size={18} />}
      <input
        {...props}
        className={`w-full ${Icon ? 'pl-14' : 'px-6'} pr-4 py-4 sm:py-5 bg-zinc-50 border border-transparent rounded-[1.5rem] sm:rounded-[2rem] focus:bg-white focus:border-black outline-none transition-all font-bold text-black text-[12px] sm:text-sm uppercase tracking-tight`}
      />
    </div>
  </div>
);

export const Select: React.FC<{ label: string; options: string[];[key: string]: any }> = ({ label, options, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <div className="relative group">
      <select
        {...props}
        className="w-full px-6 py-4 sm:py-5 bg-zinc-50 border border-transparent rounded-[1.5rem] sm:rounded-[2rem] focus:bg-white focus:border-black outline-none transition-all font-bold text-black text-[12px] sm:text-sm uppercase tracking-tight appearance-none cursor-pointer"
      >
        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within:text-black transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>
    </div>
  </div>
);
