import { Building2 } from "lucide-react";

export function FooterSection() {
  return (
    <footer className="bg-slate-900 text-muted-foreground py-8 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-400" />
            <span className="text-white font-semibold">BizManager Pro</span>
          </div>
          <div className="text-sm text-center md:text-left">
            © 2026 BizManager Pro. Tous droits réservés. Hébergé en Tunisie, conforme aux lois tunisiennes.
          </div>
        </div>
      </div>
    </footer>
  );
}
