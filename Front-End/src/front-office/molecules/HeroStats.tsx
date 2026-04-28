export function HeroStats() {
  return (
    <div className="mt-8 flex items-center gap-8">
      <div>
        <div className="text-2xl font-bold text-foreground">500+</div>
        <div className="text-sm text-muted-foreground">Entreprises</div>
      </div>
      <div className="h-12 w-px bg-slate-200" />
      <div>
        <div className="text-2xl font-bold text-foreground">99.9%</div>
        <div className="text-sm text-muted-foreground">Disponibilité</div>
      </div>
      <div className="h-12 w-px bg-slate-200" />
      <div>
        <div className="text-2xl font-bold text-foreground">24/7</div>
        <div className="text-sm text-muted-foreground">Support</div>
      </div>
    </div>
  );
}
