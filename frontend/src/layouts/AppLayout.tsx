import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { Icon, type IconName } from "../components/Icon";
import { initials } from "../lib/format";
import { useI18n } from "../i18n";

const NAV_ITEMS: { to: string; label: string; icon: IconName }[] = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { to: "/companies", label: "Companies", icon: "building" },
  { to: "/contacts", label: "Contacts", icon: "contact" },
  { to: "/leads", label: "Leads", icon: "target" },
  { to: "/pipeline", label: "Pipeline", icon: "kanban" },
  { to: "/activities", label: "Activities", icon: "activity" },
  { to: "/tasks", label: "Tasks", icon: "task" },
  { to: "/settings", label: "Settings", icon: "settings" },
];

function LanguageToggle() {
  const { lang, setLang, t } = useI18n();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === "en" ? "zh" : "en")}
      title={t("Switch language")}
      aria-label={t("Switch language")}
      className="flex items-center gap-1.5 rounded-lg border border-[#e2e6f0] bg-white px-2.5 py-1.5 text-[12px] font-semibold text-[#59637c] shadow-sm transition-colors hover:border-indigo-300 hover:text-indigo-600"
    >
      <Icon name="globe" className="h-3.5 w-3.5" />
      {lang === "en" ? "EN" : "中"}
    </button>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  return (
    <span className="flex items-center gap-2.5">
      <span className="cf-logo-mark h-9 w-9 text-[13px]">CF</span>
      {!compact && (
        <span className="text-[15px] font-bold tracking-tight text-white">
          {t("ClientFlow")} <span className="font-medium text-indigo-300">CRM</span>
        </span>
      )}
    </span>
  );
}

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.push("info", t("Signed out"));
    navigate("/login");
  };

  return (
    <div className="cf-app-bg min-h-screen">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#10162b] px-4 lg:hidden">
        <Link to="/dashboard" onClick={() => setMenuOpen(false)}>
          <Brand />
        </Link>
        <button
          type="button"
          aria-label={t("Toggle navigation")}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-indigo-200 hover:bg-white/10"
        >
          <Icon name={menuOpen ? "x" : "menu"} className="h-5 w-5" />
        </button>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`${
            menuOpen ? "block" : "hidden"
          } cf-sidebar fixed inset-x-0 top-14 z-30 overflow-hidden lg:sticky lg:top-0 lg:block lg:h-screen lg:w-[236px] lg:shrink-0`}
        >
          <div className="relative flex h-full flex-col px-3 pb-4 pt-5">
            <Link to="/dashboard" className="mb-7 hidden px-2 lg:block" onClick={() => setMenuOpen(false)}>
              <Brand />
            </Link>

            <p className="cf-eyebrow mb-2 hidden px-3 !text-[#5c678a] lg:block">{t("Workspace")}</p>
            <nav className="space-y-1" aria-label={t("Main navigation")}>
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `cf-nav-link ${isActive ? "cf-nav-link-active" : ""}`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon name={item.icon} className={`h-[17px] w-[17px] ${isActive ? "text-indigo-200" : ""}`} />
                      <span>{t(item.label)}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto hidden lg:block">
              <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.05] p-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-[11px] font-bold text-white">
                    {user ? initials(user.full_name) : "?"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold text-white">{user?.full_name}</p>
                    <p className="truncate text-[11px] capitalize text-[#8b96b8]">{user?.role}</p>
                  </div>
                </div>
              </div>
              <p className="px-2 text-[10.5px] text-[#4d5878]">ClientFlow CRM · v1.0</p>
            </div>
          </div>
        </aside>

        {/* Main column */}
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 hidden h-[62px] items-center justify-end gap-3 border-b border-[#e8ebf4] bg-white/80 px-6 backdrop-blur-xl lg:flex">
            <div className="mr-auto flex items-center gap-2 text-[12.5px] text-[#8a94ac]">
              <Icon name="layers" className="h-4 w-4 text-indigo-400" />
              <span>{t("ClientFlow CRM")}</span>
              <Icon name="chevronRight" className="h-3.5 w-3.5 text-[#c3cade]" />
              <span className="font-medium text-[#59637c]">{t("Workspace")}</span>
            </div>
            <LanguageToggle />
            <div className="h-6 w-px bg-[#e5e9f2]" />
            <div className="hidden text-right sm:block">
              <p className="text-[12.5px] font-semibold text-[#27314a]">{user?.full_name}</p>
              <p className="text-[11px] text-[#98a1b8]">{user?.email}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-200 text-[12px] font-bold text-indigo-700 ring-2 ring-white">
              {user ? initials(user.full_name) : "?"}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="cf-btn cf-btn-secondary !px-2.5 !py-2 !text-[12px]"
            >
              <Icon name="logout" className="h-3.5 w-3.5" />
              {t("Sign out")}
            </button>
          </header>

          {/* Mobile language + logout row */}
          <div className="flex items-center justify-end gap-2 border-b border-[#e8ebf4] bg-white/80 px-4 py-2 lg:hidden">
            <LanguageToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="cf-btn cf-btn-secondary !px-2.5 !py-1.5 !text-[12px]"
            >
              <Icon name="logout" className="h-3.5 w-3.5" />
              {t("Sign out")}
            </button>
          </div>

          <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto max-w-[1280px] cf-fade">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
