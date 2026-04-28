import { FileText, Receipt, Users, BarChart3, Shield, Sparkles } from "lucide-react";
import { Badge } from "@/shared/ui";
import { FeatureCard } from "../molecules/FeatureCard";

export function FeaturesSection() {
  const features = [
    {
      icon: FileText,
      title: "Facturation intelligente",
      description: "Créez, envoyez et suivez vos factures avec génération automatique de PDF. Gestion des paiements et relances automatiques.",
      colorClass: "border-blue-200"
    },
    {
      icon: Receipt,
      title: "Gestion des dépenses",
      description: "Suivez toutes vos dépenses avec téléchargement de reçus, catégorisation automatique et rapports détaillés.",
      colorClass: "border-green-200"
    },
    {
      icon: Users,
      title: "Gestion client CRM",
      description: "Base de données clients complète avec historique des transactions, notes et communications centralisées.",
      colorClass: "border-purple-200"
    },
    {
      icon: BarChart3,
      title: "Rapports & Analytics",
      description: "Tableaux de bord interactifs, rapports financiers détaillés et analyses prédictives pour optimiser votre croissance.",
      colorClass: "border-orange-200"
    },
    {
      icon: Shield,
      title: "Sécurité & Conformité",
      description: "Contrôle d'accès basé sur les rôles, chiffrement des données et conformité totale aux lois tunisiennes de souveraineté des données.",
      colorClass: "border-indigo-200"
    },
    {
      icon: Sparkles,
      title: "Assistant IA intégré",
      description: "Insights et recommandations intelligentes en temps réel pour optimiser vos décisions business et améliorer la performance.",
      colorClass: "border-pink-200"
    }
  ];

  return (
    <section id="features" className="py-20 bg-card">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4">Fonctionnalités</Badge>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Une suite complète d'outils pour gérer tous les aspects de votre entreprise
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}