interface Tab {
  id: string;
  label: string;
  icon?: string;
  badge?: number;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function TabBar({ tabs, activeTab, onChange, className = "" }: TabBarProps) {
  return (
    <div className={`flex border-b border-stone-100 ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all relative ${
            activeTab === tab.id
              ? "text-amber-600 bg-stone-50"
              : "text-stone-400 hover:text-stone-700 hover:bg-stone-50/50"
          }`}
        >
          {tab.icon && <span>{tab.icon}</span>}
          <span>{tab.label}</span>
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {tab.badge > 9 ? "9+" : tab.badge}
            </span>
          )}
          {activeTab === tab.id && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500" />
          )}
        </button>
      ))}
    </div>
  );
}
