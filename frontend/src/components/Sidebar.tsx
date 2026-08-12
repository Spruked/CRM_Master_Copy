import { Activity, Bot, Calendar, Home, KanbanSquare, Mail, Settings, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const coreNavItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Users, label: 'People & Dossiers', path: '/contacts' },
  { icon: Mail, label: 'Communications', path: '/email' },
  { icon: Activity, label: 'Activity', path: '/activities' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: Bot, label: 'ORB Assistant', path: '/orb' },
]

const featureNavItems = [
  { icon: KanbanSquare, label: 'Sales Pipeline', path: '/pipeline' },
]

function NavigationLink({ icon: Icon, label, path }: { icon: typeof Home; label: string; path: string }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        cn(
          'group flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-medium transition-all',
          isActive
            ? 'bg-[#1d4ed8]/35 text-white shadow-inner shadow-[#1d4ed8]/40'
            : 'text-cyan-100/70 hover:bg-[#0f1b3d] hover:text-cyan-100',
        )
      }
    >
      <Icon className="size-5 transition-transform group-hover:scale-110" />
      <span>{label}</span>
    </NavLink>
  )
}

export function Sidebar({ onTokenClick }: { onTokenClick: () => void }) {
  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-blue-900/70 bg-[#0b0f2a]">
      <div className="border-b border-blue-900/70 p-6">
        <div className="mb-3 flex items-center gap-3">
          <img src="/CalilogoCRM.png" alt="CALI" className="size-11 rounded-md object-cover drop-shadow-[0_0_18px_rgb(0,194,255)]" />
          <div>
            <h1 className="text-3xl font-bold tracking-[-2px] text-white">CALI</h1>
            <p className="-mt-1 text-[10px] tracking-[3px] text-cyan-300">RELATIONSHIPS</p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-tight text-cyan-100/70">
          PEOPLE. CONTEXT. CONNECTIONS.
        </p>
        <p className="mt-1 text-[10px] text-[#7c3aed]/90">
          Relationship and communications intelligence
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-6">
        {coreNavItems.map((item) => <NavigationLink key={item.path} {...item} />)}

        <div className="mb-1 mt-5 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-100/35">
          Optional features
        </div>
        {featureNavItems.map((item) => <NavigationLink key={item.path} {...item} />)}
      </nav>

      <div className="mt-auto border-t border-blue-900/70 p-4">
        <button
          type="button"
          onClick={onTokenClick}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-medium text-cyan-100/60 transition hover:bg-[#0f1b3d] hover:text-cyan-100"
        >
          <Settings className="size-4" />
          Update Admin Token
        </button>
        <p className="mt-4 text-center text-[10px] text-cyan-100/45">2026 Spruked · CALI</p>
      </div>
    </aside>
  )
}
