import { Sparkles, ArrowRight, BarChart3 } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui";
import { HeroStats } from "../molecules/HeroStats";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden py-20 lg:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-100">
              <Sparkles className="h-3 w-3 mr-1" />
              Plateforme SaaS Multitenant
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              Gérez votre entreprise avec intelligence
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Une plateforme complète pour la facturation, la gestion des dépenses, le suivi client et la collaboration d'équipe. 
              Optimisée pour les entreprises tunisiennes avec conformité aux lois de souveraineté des données.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Commencer gratuitement
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
              <a href="#features">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Découvrir les fonctionnalités
                </Button>
              </a>
            </div>
            <HeroStats />
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-3xl blur-3xl opacity-20" />
            <Card className="relative">
              <CardHeader>
                <CardTitle>Tableau de bord en temps réel</CardTitle>
                <CardDescription>Visualisez vos métriques importantes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="text-sm text-blue-600 mb-1">Revenus</div>
                    <div className="text-2xl font-bold text-blue-900">42,580 TND</div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="text-sm text-green-600 mb-1">Factures</div>
                    <div className="text-2xl font-bold text-green-900">128</div>
                  </div>
                </div>
                <div className="h-32 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-16 w-16 text-blue-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}