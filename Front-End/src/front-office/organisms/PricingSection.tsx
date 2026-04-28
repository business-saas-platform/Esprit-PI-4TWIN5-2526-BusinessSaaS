import { Badge } from "@/shared/ui";
import { PricingCard } from "../molecules/PricingCard";

export function PricingSection() {
  const plans = [
    {
      title: "Starter",
      description: "Pour les petites entreprises",
      price: "49 TND",
      priceLabel: "/mois",
      features: [
        { text: "Jusqu'à 5 utilisateurs" },
        { text: "50 factures/mois" },
        { text: "Gestion des dépenses" },
        { text: "100 clients" },
        { text: "Rapports de base" },
        { text: "Support email" }
      ],
      buttonText: "Commencer",
      buttonVariant: "outline" as const,
      buttonLink: "#signup"
    },
    {
      title: "Professional",
      description: "Pour les entreprises en croissance",
      price: "99 TND",
      priceLabel: "/mois",
      features: [
        { text: "Jusqu'à 20 utilisateurs" },
        { text: "Factures illimitées" },
        { text: "Gestion avancée des dépenses" },
        { text: "Clients illimités" },
        { text: "Rapports & Analytics complets" },
        { text: "Assistant IA" },
        { text: "Support prioritaire 24/7" }
      ],
      buttonText: "Commencer",
      buttonVariant: "default" as const,
      buttonLink: "#signup",
      isPopular: true
    },
    {
      title: "Enterprise",
      description: "Pour les grandes organisations",
      price: "Sur mesure",
      priceLabel: "",
      features: [
        { text: "Utilisateurs illimités" },
        { text: "Factures illimitées" },
        { text: "Toutes les fonctionnalités" },
        { text: "Multi-entreprises" },
        { text: "Personnalisation complète" },
        { text: "Intégrations API" },
        { text: "Manager de compte dédié" }
      ],
      buttonText: "Nous contacter",
      buttonVariant: "outline" as const,
      buttonLink: "#contact"
    }
  ];

  return (
    <section id="pricing" className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge className="mb-4">Tarifs</Badge>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-4">
            Choisissez votre plan
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Des tarifs transparents et adaptés à la taille de votre entreprise
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <PricingCard key={index} {...plan} />
          ))}
        </div>
      </div>
    </section>
  );
}