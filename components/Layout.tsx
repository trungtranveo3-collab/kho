import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  ArrowLeftRight, 
  BarChart3, 
  Moon, 
  Sun,
  UserCircle,
  RefreshCw
} from 'lucide-react';
import { Role } from '../types.ts';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  userRole: Role;
  isSyncing?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  isDarkMode, 
  setIsDarkMode,
  userRole,
  isSyncing
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'inventory', label: 'Kho hàng', icon: Package },
    { id: 'transaction', label: 'Giao dịch', icon: ArrowLeftRight },
    { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
  ];

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      <header className={`sticky top-0 z-50 p-4 flex items-center justify-between border-b ${isDarkMode ? 'bg-slate-900/80 border-slate-700' : 'bg-white/80 border-slate-200'} backdrop-blur-md`}>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Package className="text-white w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold tracking-tight leading-none">SmartWare <span className="text-blue-600">Pro</span></h1>
            {isSyncing && (
              <span className="text-[10px] text-blue-500 font-bold flex items-center gap-1 animate-pulse">
                <RefreshCw size={10} className="animate-spin" /> Đang đồng bộ...
              </span>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-full ${isDarkMode ? 'bg-slate-800 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <div className="flex items-center gap-2 text-sm font-medium opacity-80">
            <UserCircle size={20} />
            <span className="hidden sm:inline">{userRole === Role.ADMIN ? 'Quản trị viên' : 'Nhân viên'}</span>
          </div>
        </div>
      </header>

      <div className="one-thumb-area">
        {children}
      </div>

      <nav className={`fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 safe-bottom ${isDarkMode ? 'bg-slate-900/90 border-t border-slate-700' : 'bg-white/90 border-t border-slate-200'} backdrop-blur-lg`}>
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 p-2 transition-all duration-200 ${
                  isActive 
                    ? 'text-blue-600 scale-110 font-semibold' 
                    : isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon size={isActive ? 28 : 24} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] uppercase tracking-wider">{item.label}</span>
                {isActive && (
                  <div className="w-1 h-1 bg-blue-600 rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};