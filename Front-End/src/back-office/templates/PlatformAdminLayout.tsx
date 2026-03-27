import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Settings as SettingsIcon,
  Menu,
  X,
  LogOut,
  Shield,
  ClipboardList,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Bell,
} from "lucide-react";

import {
  Button,
  Avatar,
  AvatarFallback,
  Badge,
} from "@/shared/ui";

type NavItem = {
  name: string;
  href: string;
  icon: any;
  badge?: string | number;
  description?: string;
};

export function PlatformAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const storedUser = localStorage.getItem("auth_user");
  const authUser = storedUser ? JSON.parse(storedUser) : null;
  const adminName = authUser?.name || "Platform Admin";
  const adminEmail = authUser?.email || "admin@platform.com";

  const navigation: NavItem[] = useMemo(
    () => [
      {
        name: "Overview",
        href: "/admin",
        icon: LayoutDashboard,
        description: "Global platform summary",
      },
      {
        name: "Businesses",
        href: "/admin/businesses",
        icon: Building2,
        description: "Manage all businesses",
      },
      {
        name: "Business Owners",
        href: "/admin/owners",
        icon: Users,
        description: "Manage owners accounts",
      },
      {
        name: "Registration Requests",
        href: "/admin/registration-requests",
        icon: ClipboardList,
        description: "Review pending requests",
      },
      {
        name: "Analytics",
        href: "/admin/analytics",
        icon: BarChart3,
        description: "View platform metrics",
      },
      {
        name: "Settings",
        href: "/admin/settings",
        icon: SettingsIcon,
        description: "Platform configuration",
      },
    ],
    []
  );

  const isActive = (href: string) => {
    if (href === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(href);
  };

  const currentPage = useMemo(() => {
    const matched = [...navigation]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) =>
        item.href === "/admin"
          ? location.pathname === "/admin"
          : location.pathname.startsWith(item.href)
      );

    return matched ?? navigation[0];
  }, [location.pathname, navigation]);

  const breadcrumbs = useMemo(() => {
    const parts = location.pathname.split("/").filter(Boolean);

    if (parts.length === 1 && parts[0] === "admin") {
      return ["Admin", "Overview"];
    }

    return parts.map((part) =>
      part
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase())
    );
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("auth_user");
    localStorage.removeItem("current_business_id");

    window.dispatchEvent(new Event("auth-changed"));
    navigate("/auth/login", { replace: true });
  };

  const go = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  const SideNav = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col bg-white">
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        <div
          className={`flex items-center gap-3 ${
            sidebarCollapsed && !mobile ? "justify-center w-full" : ""
          }`}
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm">
            <Shield className="h-5 w-5" />
          </div>

          {(!sidebarCollapsed || mobile) && (
            <div className="leading-tight">
              <h1 className="text-sm font-semibold text-gray-900">
                Admin Panel
              </h1>
              <p className="text-xs text-gray-500">Platform Administration</p>
            </div>
          )}
        </div>

        {mobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="hidden lg:inline-flex shrink-0"
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <div className="border-b border-gray-100 px-4 py-4">
        <Badge
          variant="destructive"
          className={`h-8 ${
            sidebarCollapsed && !mobile
              ? "w-10 justify-center px-0"
              : "w-full justify-center"
          }`}
        >
          {sidebarCollapsed && !mobile ? "PA" : "Platform Administrator"}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-3 px-2">
          {(!sidebarCollapsed || mobile) && (
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Navigation
            </p>
          )}
        </div>

        <nav className="space-y-1.5">
          {navigation.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <button
                key={item.name}
                type="button"
                onClick={() => go(item.href)}
                className={`group flex w-full items-center rounded-2xl px-3 py-3 text-sm transition-all duration-200 ${
                  active
                    ? "bg-red-50 text-red-700 shadow-sm ring-1 ring-red-100"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
                title={sidebarCollapsed && !mobile ? item.name : undefined}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    active
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {(!sidebarCollapsed || mobile) && (
                  <>
                    <div className="ml-3 flex-1 text-left">
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-xs text-gray-500">
                          {item.description}
                        </div>
                      )}
                    </div>

                    {item.badge ? (
                      <Badge variant="secondary" className="ml-2">
                        {item.badge}
                      </Badge>
                    ) : (
                      <ChevronRight
                        className={`ml-2 h-4 w-4 transition-transform ${
                          active ? "translate-x-0.5 text-red-500" : "text-gray-400"
                        }`}
                      />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-gray-200 px-4 py-4">
        <div
          className={`rounded-2xl bg-gray-50 p-3 ${
            sidebarCollapsed && !mobile ? "text-center" : ""
          }`}
        >
          {sidebarCollapsed && !mobile ? (
            <div className="text-xs font-semibold text-gray-600">BM</div>
          ) : (
            <>
              <div className="text-sm font-semibold text-gray-800">
                BizManager
              </div>
              <div className="text-xs text-gray-500">Version 1.0.0</div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[290px] bg-white shadow-2xl">
            <SideNav mobile />
          </div>
        </div>
      )}

      <aside
        className={`hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:flex-col border-r border-gray-200 bg-white transition-all duration-300 ${
          sidebarCollapsed ? "lg:w-24" : "lg:w-80"
        }`}
      >
        <SideNav />
      </aside>

      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? "lg:pl-24" : "lg:pl-80"
        }`}
      >
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
          <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {breadcrumbs.map((item, index) => (
                    <div
                      key={`${item}-${index}`}
                      className="flex items-center gap-2"
                    >
                      {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>

                <h2 className="truncate text-lg font-semibold text-gray-900">
                  {currentPage.name}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="hidden sm:inline-flex rounded-2xl border border-gray-200 bg-white hover:bg-gray-50"
              >
                <Bell className="h-4 w-4 text-gray-600" />
              </Button>

              <div className="hidden xl:flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                <Avatar className="h-10 w-10 ring-1 ring-red-100">
                  <AvatarFallback className="bg-red-100 text-red-700 font-semibold">
                    PA
                  </AvatarFallback>
                </Avatar>

                <div className="leading-tight">
                  <div className="text-sm font-semibold text-gray-900">
                    {adminName}
                  </div>
                  <div className="text-xs text-gray-500">{adminEmail}</div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => navigate("/admin/settings")}
                className="rounded-2xl"
              >
                <SettingsIcon className="mr-2 h-4 w-4" />
                Settings
              </Button>

              <Button
                onClick={handleLogout}
                className="rounded-2xl bg-red-600 text-white hover:bg-red-700"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </header>

        <main className="min-h-[calc(100vh-64px)]">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-6 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {currentPage.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {currentPage.description ||
                      "Manage and monitor your SaaS administration area."}
                  </p>
                </div>

                <Badge
                  variant="secondary"
                  className="w-fit rounded-full px-3 py-1 text-xs"
                >
                  Secure admin area
                </Badge>
              </div>
            </div>

            <div className="rounded-3xl">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}