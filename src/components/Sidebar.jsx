import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  GraduationCap,
  BarChart3,
  FlaskConical,
  Settings,
  Camera,
  ChevronLeft,
  ChevronRight,
  Hand,
  ShieldCheck,
  User,
} from 'lucide-react';
import { cn } from '../utils/helpers';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Calibration', path: '/calibration', icon: Sparkles, badge: 'Required' },
  { name: 'Classroom', path: '/classroom', icon: GraduationCap, badge: 'Live' },
  { name: 'Analytics', path: '/analytics', icon: BarChart3 },
  { name: 'Testing', path: '/testing', icon: FlaskConical },
  { name: 'Settings', path: '/settings', icon: Settings },
];

export default function Sidebar({ webcamConnected = true }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'relative bg-navy-900 border-r border-slate-800/80 transition-all duration-300 flex flex-col z-40',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Brand Header */}
      <div className="h-18 px-5 py-4 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-glow-indigo/50 flex-shrink-0">
            <Hand className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="truncate">
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                HANDS-FREE
              </h1>
              <p className="text-[10px] tracking-wider text-indigo-400 font-semibold uppercase">
                Classroom Controls
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Camera Status Banner */}
      <div className="px-3 py-3 border-b border-slate-800/50">
        <div
          className={cn(
            'flex items-center gap-2.5 p-2 rounded-xl text-xs font-medium transition-colors',
            webcamConnected
              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
              : 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
          )}
        >
          <Camera className={cn('w-4 h-4 flex-shrink-0', webcamConnected ? 'text-emerald-400' : 'text-amber-400')} />
          {!collapsed && (
            <div className="flex-1 truncate">
              <div className="flex items-center justify-between">
                <span>{webcamConnected ? 'Camera Active' : 'Camera Standby'}</span>
                <span
                  className={cn(
                    'w-2 h-2 rounded-full',
                    webcamConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  )}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative',
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/30 to-violet-600/10 text-white border border-indigo-500/40 shadow-glow-indigo/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      'w-5 h-5 flex-shrink-0 transition-colors',
                      isActive ? 'text-indigo-400' : 'text-slate-400 group-hover:text-slate-200'
                    )}
                  />
                  {!collapsed && (
                    <div className="flex-1 flex items-center justify-between truncate">
                      <span>{item.name}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            'text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full',
                            item.badge === 'Live'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Active Indicator Bar */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-indigo-500 rounded-r-md" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Sidebar Footer / Student Profile */}
      <div className="p-3 border-t border-slate-800/80 bg-navy-950/60">
        <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-900/80 border border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 flex-shrink-0">
            <User className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="truncate flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">Alex Sterling</p>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Calibrated (94%)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
