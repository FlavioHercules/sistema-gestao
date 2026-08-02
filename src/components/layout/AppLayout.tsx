import { NavLink, useNavigate } from "react-router-dom";
import { LogOut, Menu, X, GraduationCap } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "../../context/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

interface AppLayoutProps {
  navItems: NavItem[];
  brandLabel: string;
  brandSub: string;
  children: ReactNode;
}

export function AppLayout({ navItems, brandLabel, brandSub, children }: AppLayoutProps) {
  const { usuario, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  const navContent = (
    <nav className="flex flex-col gap-1 px-3">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/secretaria" || item.to === "/professor" || item.to === "/aluno" || item.to === "/coordenacao"}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
              isActive
                ? "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`
          }
        >
          {item.icon}
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Sidebar - desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-800 bg-slate-900/70 backdrop-blur-md lg:flex">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20">
            <GraduationCap size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-tight">{brandLabel}</p>
            <p className="text-xs text-slate-500">{brandSub}</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-4">{navContent}</div>
        <div className="border-t border-slate-800 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-slate-200">
              {usuario?.nome?.charAt(0).toUpperCase() ?? "?"}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{usuario?.nome}</p>
              <p className="truncate text-xs text-slate-500">{usuario?.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300"
          >
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20">
            <GraduationCap size={18} />
          </div>
          <span className="text-sm font-semibold text-white">{brandLabel}</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-800"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[80%] flex-col border-r border-slate-800 bg-slate-900 shadow-2xl animate-[slideIn_200ms_ease-out]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">{brandLabel}</p>
                  <p className="text-xs text-slate-500">{brandSub}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">{navContent}</div>
            <div className="border-t border-slate-800 p-3">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-rose-500/10 hover:text-rose-300"
              >
                <LogOut size={18} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
