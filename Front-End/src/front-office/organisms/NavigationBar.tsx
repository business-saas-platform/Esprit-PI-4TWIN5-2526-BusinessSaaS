import { Link } from "react-router";
import { Building2 } from "lucide-react";
import { Button } from "@/shared/ui";

export function NavigationBar() {
  return (
    <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-semibold">BizManager Pro</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Fonctionnalités
            </a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Tarifs
            </a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">
              Contact
            </a>
            <Link to="/auth/login">
              <Button variant="ghost">Se connecter</Button>
            </Link>
            <a href="#signup">
              <Button>Commencer</Button>
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}