import { Activity, Bot, Calendar, Home, KanbanSquare, Mail, Settings, Users } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: Home, label: 'Dashboard', path: '/' },
  { icon: Users, label: 'Contacts', path: '/contacts' },
  { icon: KanbanSquare, label: 'Pipeline', path: '/pipeline' },
  { icon: Mail, label: 'Email', path: '/email' },
  { icon: Activity, label: 'Activities', path: '/activities' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: Bot, label: 'ORB Assistant', path: '/orb' },
]

export function Sidebar({ onTokenClick }: { onTokenClick: () => void }) {
  return (
    <aside className="flex h-screen w-72 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 p-6">
        <div className="mb-3 flex items-center gap-3">
          <img src="/logo.svg" alt="Cali CRM" className="size-11 drop-shadow-[0_0_18px_rgb(168,85,247)]" />
          <div>
            <h1 className="text-3xl font-bold tracking-[-2px] text-white">CALI</h1>
            <p className="-mt-1 text-[10px] tracking-[3px] text-violet-400">CRM</p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-tight text-zinc-500">
          PIPELINE INTELLIGENCE.
          <br />
          ORBIT FASTER.
        </p>
        <p className="mt-1 text-[10px] text-violet-500/70">
          Your AI-powered revenue command center
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-6">
        {navItems.map(({ icon: Icon, label, path }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              cn(
                'group flex h-11 items-center gap-3 rounded-2xl px-4 text-sm font-medium transition-all',
                isActive
                  ? 'bg-violet-950 text-white shadow-inner shadow-violet-900/50'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
              )
            }
          >
            <Icon className="size-5 transition-transform group-hover:scale-110" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-zinc-800 p-4">
        <button
          type="button"
          onClick={onTokenClick}
          className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-xs font-medium text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300"
        >
          <Settings className="size-4" />
          Update Admin Token
        </button>
        <p className="mt-4 text-center text-[10px] text-zinc-600">2026 Spruked - Cali CRM</p>
      </div>
    </aside>
  )
}
