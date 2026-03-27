import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  Users,
  UsersRound,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
  Sparkles,
  ChevronRight,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

import { Button, Avatar, AvatarFallback } from "@/shared/ui";
import { BusinessSwitcher } from "../molecules/BusinessSwitcher";
import { AIAssistant } from "../organisms/AIAssistant";
import { useBusinessContext } from "@/shared/contexts/BusinessContext";
import { useAuth } from "@/shared/contexts/AuthContext";

type NavItem = {
  name: string;
  href: string;
  icon: any;
  perm?: string;
  badge?: string;
};

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "AI Insights", href: "/dashboard/ai-insights", icon: Sparkles, perm: "ai.read", badge: "AI" },
  { name: "Invoices", href: "/dashboard/invoices", icon: FileText, perm: "invoices.read" },
  { name: "Expenses", href: "/dashboard/expenses", icon: Receipt, perm: "expenses.read" },
  { name: "Clients", href: "/dashboard/clients", icon: Users, perm: "clients.read" },
  { name: "Team", href: "/dashboard/team", icon: UsersRound, perm: "team.read" },
  { name: "Reports", href: "/dashboard/reports", icon: BarChart3, perm: "reports.read" },
  { name: "Settings", href: "/dashboard/settings", icon: Settings, perm: "settings.read" },
];

function initials(name?: string) {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  const a = parts[0]?.[0] ?? "U";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function getPageTitle(pathname: string) {
  const match = navigation.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
  return match?.name || "Dashboard";
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const { currentBusiness, setCurrentBusiness, businesses, isReady } = useBusinessContext();
  const { user, logout, isReady: authReady, hasPermission } = useAuth();

  const isOnSetupPage = location.pathname.startsWith("/dashboard/company/setup");

  const brandTitle = useMemo(() => {
    return (currentBusiness as any)?.name || "BizManager";
  }, [currentBusiness]);

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  const filteredNavigation = useMemo(() => {
    if (!user) return [];
    if (user.role === "platform_admin" || user.role === "business_owner") return navigation;
    return navigation.filter((item) => !item.perm || hasPermission(item.perm));
  }, [user, hasPermission]);

  const handleLogout = () => {
    logout();
    navigate("/auth/login", { replace: true });
  };

  const handleBusinessChange = (business: (typeof businesses)[0]) => {
    setCurrentBusiness(business);
    if ((business as any)?.id) {
      localStorage.setItem("current_business_id", String((business as any).id));
      window.dispatchEvent(new Event("business-changed"));
    }
  };

  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    if (!authReady || !isReady) return;

    const isOwner = user?.role === "business_owner";

    if (!currentBusiness && businesses.length > 0) {
      handleBusinessChange(businesses[0]);
      return;
    }

    const incomplete = (currentBusiness as any)?.isProfileComplete === false;

    if (isOwner && incomplete && !isOnSetupPage) {
      navigate("/dashboard/company/setup", { replace: true });
      return;
    }

    if (isOwner && !incomplete && isOnSetupPage) {
      navigate("/dashboard", { replace: true });
    }
  }, [
    authReady,
    isReady,
    user?.role,
    currentBusiness,
    businesses,
    isOnSetupPage,
    navigate,
  ]);

  useEffect(() => {
    if (!authReady || !user) return;
    if (user.role === "platform_admin" || user.role === "business_owner") return;

    const currentNav = navigation.find(
      (n) => location.pathname === n.href || location.pathname.startsWith(n.href + "/")
    );

    if (currentNav?.perm && !hasPermission(currentNav.perm)) {
      navigate("/dashboard", { replace: true });
    }
  }, [authReady, user, location.pathname, hasPermission, navigate]);

  const desktopSidebarWidth = sidebarCollapsed ? "lg:pl-24" : "lg:pl-72";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-[88%] max-w-[320px] overflow-y-auto border-r border-slate-200 bg-white shadow-2xl">
            <div className="flex h-20 items-center justify-between border-b border-slate-200 px-5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-900">{brandTitle}</p>
                  <p className="text-xs text-slate-500">Business Workspace</p>
                </div>
              </div>

              <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)} className="rounded-xl">
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="border-b border-slate-100 px-4 py-4">
              <BusinessSwitcher
                businesses={businesses}
                currentBusiness={currentBusiness}
                onBusinessChange={handleBusinessChange}
              />
            </div>

            <nav className="space-y-2 px-3 py-4">
              {filteredNavigation.map((item) => {
                const isActive =
                  location.pathname === item.href ||
                  location.pathname.startsWith(item.href + "/");

                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.href);
                      setSidebarOpen(false);
                    }}
                    className={[
                      "group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all",
                      isActive
                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    ].join(" ")}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span className="flex-1 font-medium">{item.name}</span>
                    {item.badge && (
                      <span
                        className={[
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          isActive ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700",
                        ].join(" ")}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="border-t border-slate-100 p-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={[
          "hidden lg:fixed lg:inset-y-0 lg:flex lg:flex-col border-r border-slate-200 bg-white/95 backdrop-blur-sm transition-all duration-300",
          sidebarCollapsed ? "lg:w-24" : "lg:w-72",
        ].join(" ")}
      >
        <div className="flex h-20 items-center justify-between border-b border-slate-200 px-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg">
              <Building2 className="h-5 w-5" />
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-slate-900">{brandTitle}</p>
                <p className="text-xs text-slate-500">Business Workspace</p>
              </div>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarCollapsed((v) => !v)}
            className="rounded-xl"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>
        </div>

        {!sidebarCollapsed && (
          <div className="border-b border-slate-100 px-4 py-4">
            <BusinessSwitcher
              businesses={businesses}
              currentBusiness={currentBusiness}
              onBusinessChange={handleBusinessChange}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-2">
            {filteredNavigation.map((item) => {
              const isActive =
                location.pathname === item.href ||
                location.pathname.startsWith(item.href + "/");

              return (
                <button
                  key={item.name}
                  onClick={() => navigate(item.href)}
                  className={[
                    "group flex w-full items-center rounded-2xl transition-all duration-200",
                    sidebarCollapsed
                      ? "justify-center px-2 py-3"
                      : "gap-3 px-4 py-3",
                    isActive
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  ].join(" ")}
                  title={item.name}
                >
                  <item.icon className="h-5 w-5 shrink-0" />

                  {!sidebarCollapsed && (
                    <>
                      <span className="flex-1 text-left font-medium">{item.name}</span>
                      {item.badge ? (
                        <span
                          className={[
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            isActive ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700",
                          ].join(" ")}
                        >
                          {item.badge}
                        </span>
                      ) : (
                        <ChevronRight
                          className={[
                            "h-4 w-4 transition-transform",
                            isActive ? "text-white/80" : "text-slate-400 group-hover:translate-x-0.5",
                          ].join(" ")}
                        />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-slate-100 p-3">
          <button
            onClick={handleLogout}
            className={[
              "flex w-full items-center rounded-2xl text-red-600 transition hover:bg-red-50",
              sidebarCollapsed ? "justify-center px-2 py-3" : "gap-3 px-4 py-3",
            ].join(" ")}
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
            {!sidebarCollapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className={desktopSidebarWidth}>
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur-md">
          <div className="flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="rounded-xl lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-6 w-6" />
              </Button>

              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {pageTitle}
                </h1>
                <p className="text-sm text-slate-500">
                  Welcome back{user?.name ? `, ${user.name}` : ""}
                </p>
              </div>
            </div>

            <div ref={userMenuRef} className="relative flex items-center">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <Avatar className="h-10 w-10 ring-2 ring-slate-100">
                  <AvatarFallback className="bg-gradient-to-br from-slate-800 to-slate-600 text-white">
                    {initials(user?.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="hidden md:flex flex-col items-start leading-tight">
                  <span className="max-w-[160px] truncate text-sm font-semibold text-slate-900">
                    {user?.name ?? "User"}
                  </span>
                  <span className="max-w-[160px] truncate text-xs text-slate-500">
                    {user?.email ?? ""}
                  </span>
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-3 z-50 w-72 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                  <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-5 text-white">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-white/30">
                        <AvatarFallback className="bg-white/20 text-white">
                          {initials(user?.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold">{user?.name ?? "User"}</div>
                        <div className="truncate text-xs text-white/80">{user?.email ?? ""}</div>
                        <div className="mt-1 inline-flex rounded-full bg-white/15 px-2 py-1 text-[11px] font-medium">
                          {user?.role ?? "-"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        navigate("/dashboard/settings");
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="min-h-[calc(100vh-5rem)] bg-slate-50">
          <div className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="min-h-[calc(100vh-9rem)] rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      <AIAssistant />
    </div>
  );
}