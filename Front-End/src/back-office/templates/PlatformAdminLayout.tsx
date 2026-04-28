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
  MessageCircle, // Ajout pour le support
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

  // Récupération de l'utilisateur admin
  const storedUser = localStorage.getItem("auth_user");
  const authUser = storedUser ? JSON.parse(storedUser) : null;
  const adminName = authUser?.name || "Mariem Ferjani";
  const adminEmail = authUser?.email || "mariem.ferjani@esprit.tn";

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
        name: "Support Tickets", // NOUVEL ONGLET POUR MARIEM
        href: "/admin/support",
        icon: MessageCircle,
        description: "Respond to customer claims",
        badge: "New", 
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
    if (parts.length === 1 && parts[0] === "admin") return ["Admin", "Overview"];
    return parts.map((part) =>
      part.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
    );
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.clear(); // Plus sûr pour un logout complet
    window.dispatchEvent(new Event("auth-changed"));
    navigate("/auth/login", { replace: true });
  };

  const go = (href: string) => {
    navigate(href);
    setSidebarOpen(false);
  };

  const SideNav = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <div className={`flex items-center gap-3 ${sidebarCollapsed && !mobile ? "justify-center w-full" : ""}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-sm shrink-0">
            <Shield className="h-5 w-5" />
          </div>
          {(!sidebarCollapsed || mobile) && (
            <div className="leading-tight">
              <h1 className="text-sm font-semibold text-foreground">Admin Panel</h1>
              <p className="text-xs text-muted-foreground font-medium">BizManager Pro</p>
            </div>
          )}
        </div>

        {mobile ? (
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}><X className="h-5 w-5" /></Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex"
          >
            {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <div className="border-b border-border px-4 py-4">
        <Badge variant="destructive" className="w-full justify-center h-7 rounded-xl text-[10px] uppercase tracking-wider font-bold">
          {sidebarCollapsed && !mobile ? "ADM" : "System Administrator"}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <button
              key={item.name}
              onClick={() => go(item.href)}
              className={`group flex w-full items-center rounded-2xl px-3 py-2.5 transition-all duration-200 ${
                active ? "bg-red-50 text-red-700 shadow-sm ring-1 ring-red-100" : "text-muted-foreground hover:bg-background"
              }`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${active ? "bg-red-100 text-red-700" : "bg-background text-muted-foreground group-hover:bg-muted"}`}>
                <Icon className="h-4 w-4" />
              </div>
              {(!sidebarCollapsed || mobile) && (
                <div className="ml-3 flex-1 text-left">
                  <div className="text-sm font-bold">{item.name}</div>
                  <div className="text-[10px] text-muted-foreground leading-none">{item.description}</div>
                </div>
              )}
              {item.badge && (!sidebarCollapsed || mobile) && (
                <Badge className="bg-red-500 text-white text-[9px] px-1.5 py-0 h-4 border-none">{item.badge}</Badge>
              )}
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          {(!sidebarCollapsed || mobile) && <span className="text-sm font-bold">Déconnexion</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background/50">
      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] bg-card shadow-2xl animate-in slide-in-from-left duration-300">
            <SideNav mobile />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 hidden lg:flex flex-col border-r border-border bg-card transition-all duration-300 ${sidebarCollapsed ? "w-24" : "w-80"}`}>
        <SideNav />
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? "lg:pl-24" : "lg:pl-80"}`}>
        <header className="sticky top-0 z-20 h-16 border-b border-border bg-card/80 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden sm:block">
               <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {breadcrumbs.join(" / ")}
               </div>
               <h2 className="text-sm font-black text-foreground">{currentPage.name}</h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-2xl border border-border bg-background/50 shadow-inner">
               <Avatar className="h-8 w-8 ring-2 ring-white">
                  <AvatarFallback className="bg-red-600 text-white text-[10px] font-black">
                    {adminName[0]}
                  </AvatarFallback>
               </Avatar>
               <div className="hidden md:block">
                  <p className="text-xs font-black text-foreground leading-none">{adminName}</p>
                  <p className="text-[10px] text-muted-foreground mt-1 font-medium italic">{adminEmail}</p>
               </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full bg-card border border-border relative">
               <Bell className="h-4 w-4" />
               <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full border-2 border-white" />
            </Button>
          </div>
        </header>

        <main className="p-4 sm:p-8">
           <div className="max-w-7xl mx-auto">
              <Outlet />
           </div>
        </main>
      </div>
    </div>
  );
}