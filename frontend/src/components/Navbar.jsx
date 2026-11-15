import { Microscope } from 'lucide-react'

const TABS = [
  { id: 'home',      label: 'Home',     icon: 'Home' },
  { id: 'screening', label: 'Screening', icon: 'ScanLine' },
  { id: 'history',   label: 'History',  icon: 'ClipboardList' },
  { id: 'about',     label: 'About',    icon: 'Info' },
]

import {
  Home as HomeIcon,
  ScanLine,
  ClipboardList,
  Info,
  LogOut,
} from 'lucide-react'

const ICON_MAP = {
  Home: HomeIcon,
  ScanLine,
  ClipboardList,
  Info,
}

export default function Navbar({ activeTab, onTabChange, user, onLogout }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-navy-300/95 backdrop-blur-md border-t border-white/10 safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2">
        {TABS.map((tab) => {
          const Icon = ICON_MAP[tab.icon]
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-150 min-w-[56px] ${
                active
                  ? 'text-teal-medical'
                  : 'text-white/40 hover:text-white/70'
              }`}
              aria-label={tab.label}
            >
              <span className={`relative ${active ? 'scale-110' : ''} transition-transform duration-150`}>
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={active ? 'drop-shadow-[0_0_6px_rgba(18,201,193,0.8)]' : ''}
                />
                {active && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-medical" />
                )}
              </span>
              <span className={`text-[10px] font-medium ${active ? 'text-teal-medical' : 'text-white/40'}`}>
                {tab.label}
              </span>
            </button>
          )
        })}

        {user && (
          <button
            onClick={onLogout}
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-white/40 hover:text-red-400 transition-all duration-150 min-w-[56px]"
            aria-label="Log out"
          >
            <LogOut size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        )}
      </div>
    </nav>
  )
}
