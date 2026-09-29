import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { initials } from "../lib/format";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/companies", label: "Companies" },
  { to: "/contacts", label: "Contacts" },
  { to: "/leads", label: "Leads" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/activities", label: "Activities" },
  { to: "/tasks", label: "Tasks" },
  { to: "/settings", label: "Settings" },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);

  const navClasses = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  const handleLogout = () => {
    logout();
    toast.push("info", "Signed out");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-slate-900">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
            CF
          </span>
          ClientFlow
        </Link>
        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setMenuOpen((open) => !open)}
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          ☰
        </button>
      </header>

      <div className="flex">
        <aside
          className={`${
            menuOpen ? "block" : "hidden"
          } fixed inset-x-0 top-14 z-30 border-b border-slate-800 bg-slate-900 p-3 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-56 lg:shrink-0 lg:border-b-0`}
        >
          <Link
            to="/dashboard"
            className="mb-6 hidden items-center gap-2 px-2 pt-4 font-semibold text-white lg:flex"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold">
              CF
            </span>
            ClientFlow CRM
          </Link>
          <nav className="space-y-1" aria-label="Main navigation">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={navClasses} onClick={() => setMenuOpen(false)}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div />
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium text-slate-800">{user?.full_name}</p>
                  <p className="text-xs text-slate-500">
                    {user?.email} · {user?.role}
                  </p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                  {user ? initials(user.full_name) : "?"}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Sign out
                </button>
              </div>
            </div>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
