import React from 'react';
import { Clock, History, Compass, Smartphone } from 'lucide-react';

export type NavTab = 'timer' | 'history' | 'gps';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  hasActiveTimer: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  hasActiveTimer,
}) => {
  const tabs = [
    {
      id: 'timer' as NavTab,
      label: 'Cronómetro',
      icon: Clock,
      showPulse: hasActiveTimer,
    },
    {
      id: 'history' as NavTab,
      label: 'Historial',
      icon: History,
    },
    {
      id: 'gps' as NavTab,
      label: 'GPS & Logs',
      icon: Compass,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800/80 safe-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto py-2 px-3">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all cursor-pointer ${
                isActive ? 'text-emerald-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {tab.showPulse && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
