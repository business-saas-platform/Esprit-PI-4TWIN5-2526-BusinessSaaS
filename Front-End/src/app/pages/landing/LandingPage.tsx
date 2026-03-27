import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import {
  Building2,
  FileText,
  Receipt,
  Users,
  BarChart3,
  Shield,
  Sparkles,
  Check,
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Loader2,
  Brain,
  Lock,
  Globe,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

type FormData = {
  businessName: string;
  fullName: string;
  email: string;
  phone: string;
  businessType: string;
  teamSize: string;
  message: string;
};

const initialFormData: FormData = {
  businessName: "",
  fullName: "",
  email: "",
  phone: "",
  businessType: "",
  teamSize: "",
  message: "",
};

const features = [
  {
    icon: FileText,
    iconClass: "bg-blue-100 text-blue-600",
    title: "Facturation intelligente",
    description:
      "Créez, envoyez et suivez vos factures avec génération automatique de PDF, gestion des paiements et relances efficaces.",
  },
  {
    icon: Receipt,
    iconClass: "bg-green-100 text-green-600",
    title: "Gestion des dépenses",
    description:
      "Centralisez toutes vos dépenses avec pièces jointes, validation, suivi par catégorie et historique détaillé.",
  },
  {
    icon: Users,
    iconClass: "bg-purple-100 text-purple-600",
    title: "Gestion client CRM",
    description:
      "Suivez vos clients, leur historique, leurs factures et leur solde restant dans une base centralisée.",
  },
  {
    icon: BarChart3,
    iconClass: "bg-orange-100 text-orange-600",
    title: "Rapports & Analytics",
    description:
      "Obtenez une vision claire sur vos revenus, dépenses, marges et performances mensuelles avec tableaux de bord dynamiques.",
  },
  {
    icon: Shield,
    iconClass: "bg-indigo-100 text-indigo-600",
    title: "Sécurité & rôles",
    description:
      "Contrôle d’accès par rôles, architecture multitenant et séparation stricte des données par entreprise.",
  },
  {
    icon: Brain,
    iconClass: "bg-pink-100 text-pink-600",
    title: "Assistant IA intégré",
    description:
      "Recevez des insights et recommandations pour améliorer la trésorerie, réduire les retards de paiement et mieux piloter votre activité.",
  },
];

const trustItems = [
  {
    icon: Lock,
    title: "Sécurité des données",
    description: "Contrôle d’accès, architecture sécurisée et séparation multitenant.",
  },
  {
    icon: Globe,
    title: "Conformité tunisienne",
    description: "Pensé pour les entreprises tunisiennes et la souveraineté des données.",
  },
  {
    icon: CheckCircle2,
    title: "Déploiement simple",
    description: "Interface moderne, intuitive et rapide à prendre en main.",
  },
];

export function LandingPage() {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);

  const filledFields = useMemo(() => {
    return Object.values(formData).filter((v) => String(v).trim() !== "").length;
  }, [formData]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!formData.businessName.trim()) {
      toast.error("Le nom de l'entreprise est obligatoire");
      return false;
    }
    if (!formData.fullName.trim()) {
      toast.error("Le nom complet est obligatoire");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("L'email est obligatoire");
      return false;
    }
    if (!formData.phone.trim()) {
      toast.error("Le téléphone est obligatoire");
      return false;
    }
    if (!formData.businessType) {
      toast.error("Veuillez choisir le type d'entreprise");
      return false;
    }
    if (!formData.teamSize) {
      toast.error("Veuillez choisir la taille de l'équipe");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      toast.error("Veuillez saisir une adresse email valide");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setSubmitting(true);

      // TODO: brancher backend réel plus tard
      await new Promise((resolve) => setTimeout(resolve, 800));

      toast.success("Demande envoyée avec succès !", {
        description: "Notre équipe vous contactera sous 24 heures.",
      });

      setFormData(initialFormData);
    } catch {
      toast.error("Impossible d'envoyer la demande");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-semibold text-slate-900">BizManager Pro</span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-slate-600 transition-colors hover:text-slate-900">
              Fonctionnalités
            </a>
            <a href="#pricing" className="text-slate-600 transition-colors hover:text-slate-900">
              Tarifs
            </a>
            <a href="#contact" className="text-slate-600 transition-colors hover:text-slate-900">
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
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden py-20 lg:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="flex flex-col justify-center">
            <Badge className="mb-4 w-fit bg-blue-100 text-blue-700 hover:bg-blue-100">
              <Sparkles className="mr-1 h-3 w-3" />
              Plateforme SaaS Multitenant
            </Badge>

            <h1 className="mb-6 text-4xl font-bold leading-tight text-slate-900 lg:text-6xl">
              Gérez votre entreprise avec plus de clarté et d’efficacité
            </h1>

            <p className="mb-8 text-xl text-slate-600">
              Une plateforme complète pour la facturation, les dépenses, la gestion client,
              les rapports et la collaboration d’équipe. Conçue pour les entreprises
              tunisiennes avec une approche moderne, sécurisée et évolutive.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
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

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-slate-600">
              <div>
                <div className="text-2xl font-bold text-slate-900">500+</div>
                <div>Entreprises</div>
              </div>
              <div className="hidden h-12 w-px bg-slate-200 sm:block" />
              <div>
                <div className="text-2xl font-bold text-slate-900">99.9%</div>
                <div>Disponibilité</div>
              </div>
              <div className="hidden h-12 w-px bg-slate-200 sm:block" />
              <div>
                <div className="text-2xl font-bold text-slate-900">24/7</div>
                <div>Support</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-500 to-purple-500 opacity-20 blur-3xl" />
            <Card className="relative overflow-hidden border-0 shadow-xl">
              <CardHeader>
                <CardTitle>Tableau de bord en temps réel</CardTitle>
                <CardDescription>
                  Suivez instantanément vos métriques importantes
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-blue-50 p-4">
                    <div className="mb-1 text-sm text-blue-600">Revenus</div>
                    <div className="text-2xl font-bold text-blue-900">42,580 TND</div>
                  </div>

                  <div className="rounded-lg bg-green-50 p-4">
                    <div className="mb-1 text-sm text-green-600">Factures</div>
                    <div className="text-2xl font-bold text-green-900">128</div>
                  </div>
                </div>

                <div className="flex h-36 items-center justify-center rounded-lg bg-gradient-to-r from-blue-100 to-purple-100">
                  <BarChart3 className="h-16 w-16 text-blue-400" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-white p-3 text-center">
                    <div className="text-sm text-slate-500">Clients</div>
                    <div className="text-lg font-semibold text-slate-900">84</div>
                  </div>
                  <div className="rounded-lg border bg-white p-3 text-center">
                    <div className="text-sm text-slate-500">Dépenses</div>
                    <div className="text-lg font-semibold text-slate-900">12,350</div>
                  </div>
                  <div className="rounded-lg border bg-white p-3 text-center">
                    <div className="text-sm text-slate-500">Marge</div>
                    <div className="text-lg font-semibold text-slate-900">31%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="pb-10">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.title} className="border-slate-200">
                <CardContent className="flex gap-4 pt-6">
                  <div className="rounded-lg bg-slate-100 p-3">
                    <Icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <Badge className="mb-4">Fonctionnalités</Badge>
            <h2 className="mb-4 text-3xl font-bold text-slate-900 lg:text-5xl">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-slate-600">
              Une suite complète d’outils pour gérer les opérations clés de votre entreprise.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-2 transition-colors hover:border-blue-200">
                  <CardHeader>
                    <div
                      className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${feature.iconClass}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <Badge className="mb-4">Tarifs</Badge>
            <h2 className="mb-4 text-3xl font-bold text-slate-900 lg:text-5xl">
              Choisissez votre plan
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-slate-600">
              Des tarifs clairs, évolutifs et adaptés à la taille de votre entreprise.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Starter</CardTitle>
                <CardDescription>Pour les petites entreprises</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">49 TND</span>
                  <span className="text-slate-600">/mois</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Jusqu'à 5 utilisateurs",
                    "50 factures/mois",
                    "Gestion des dépenses",
                    "100 clients",
                    "Rapports de base",
                    "Support email",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <a href="#signup">
                  <Button className="mt-6 w-full" variant="outline">
                    Commencer
                  </Button>
                </a>
              </CardContent>
            </Card>

            <Card className="relative border-2 border-blue-500 shadow-lg">
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500">
                Populaire
              </Badge>
              <CardHeader>
                <CardTitle>Professional</CardTitle>
                <CardDescription>Pour les entreprises en croissance</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">99 TND</span>
                  <span className="text-slate-600">/mois</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Jusqu'à 20 utilisateurs",
                    "Factures illimitées",
                    "Gestion avancée des dépenses",
                    "Clients illimités",
                    "Rapports & Analytics complets",
                    "Assistant IA",
                    "Support prioritaire 24/7",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <a href="#signup">
                  <Button className="mt-6 w-full">Commencer</Button>
                </a>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>Pour les grandes organisations</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">Sur mesure</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {[
                    "Utilisateurs illimités",
                    "Factures illimitées",
                    "Toutes les fonctionnalités",
                    "Multi-entreprises",
                    "Personnalisation complète",
                    "Intégrations API",
                    "Manager de compte dédié",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <a href="#contact">
                  <Button className="mt-6 w-full" variant="outline">
                    Nous contacter
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Signup form */}
      <section id="signup" className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge className="mb-4">Commencer maintenant</Badge>
            <h2 className="mb-4 text-3xl font-bold text-slate-900 lg:text-5xl">
              Demandez une démo personnalisée
            </h2>
            <p className="text-xl text-slate-600">
              Remplissez ce formulaire et notre équipe vous contactera sous 24 heures.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informations de votre entreprise</CardTitle>
              <CardDescription>
                Dites-nous en plus sur votre activité pour personnaliser votre expérience.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Nom de l'entreprise *</Label>
                    <Input
                      id="businessName"
                      placeholder="Ex: SARL Innovation Tech"
                      value={formData.businessName}
                      onChange={(e) => handleChange("businessName", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nom complet *</Label>
                    <Input
                      id="fullName"
                      placeholder="Ex: Mohamed Ben Ali"
                      value={formData.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email professionnel *</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="contact@entreprise.tn"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+216 XX XXX XXX"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="businessType">Type d'entreprise *</Label>
                    <Select
                      value={formData.businessType}
                      onValueChange={(value) => handleChange("businessType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sarl">SARL</SelectItem>
                        <SelectItem value="suarl">SUARL</SelectItem>
                        <SelectItem value="sa">SA</SelectItem>
                        <SelectItem value="freelance">Freelance / Personne physique</SelectItem>
                        <SelectItem value="association">Association</SelectItem>
                        <SelectItem value="other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teamSize">Taille de l'équipe *</Label>
                    <Select
                      value={formData.teamSize}
                      onValueChange={(value) => handleChange("teamSize", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-5">1-5 employés</SelectItem>
                        <SelectItem value="6-20">6-20 employés</SelectItem>
                        <SelectItem value="21-50">21-50 employés</SelectItem>
                        <SelectItem value="51-100">51-100 employés</SelectItem>
                        <SelectItem value="100+">100+ employés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message (optionnel)</Label>
                  <Textarea
                    id="message"
                    placeholder="Parlez-nous de vos besoins spécifiques..."
                    rows={4}
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                  />
                </div>

                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="flex items-start gap-2">
                    <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    <div className="text-sm text-blue-900">
                      <div className="mb-1 font-medium">Conformité et sécurité</div>
                      <div className="text-blue-700">
                        Vos données sont hébergées en Tunisie et conformes aux exigences
                        de souveraineté des données. Nous ne partageons jamais vos
                        informations avec des tiers.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">
                  Progression du formulaire :{" "}
                  <span className="font-medium text-slate-900">{filledFields}/7 champs remplis</span>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronRight className="mr-2 h-4 w-4" />
                  )}
                  Envoyer ma demande
                </Button>

                <p className="text-center text-sm text-slate-600">
                  En soumettant ce formulaire, vous acceptez nos conditions d’utilisation
                  et notre politique de confidentialité.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-slate-900 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div>
            <h2 className="mb-6 text-3xl font-bold lg:text-4xl">
              Besoin d'aide ou de plus d'informations ?
            </h2>
            <p className="mb-8 text-lg text-slate-300">
              Notre équipe est là pour répondre à vos questions et vous accompagner
              dans la digitalisation de votre entreprise.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="mt-1 h-5 w-5 shrink-0 text-blue-400" />
                <div>
                  <div className="font-medium">Email</div>
                  <a
                    href="mailto:contact@bizmanager.tn"
                    className="text-slate-300 hover:text-white"
                  >
                    contact@bizmanager.tn
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="mt-1 h-5 w-5 shrink-0 text-blue-400" />
                <div>
                  <div className="font-medium">Téléphone</div>
                  <a href="tel:+21671234567" className="text-slate-300 hover:text-white">
                    +216 71 234 567
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="mt-1 h-5 w-5 shrink-0 text-blue-400" />
                <div>
                  <div className="font-medium">Adresse</div>
                  <div className="text-slate-300">
                    Centre Urbain Nord, 1082 Tunis
                    <br />
                    Tunisie
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-800 p-8">
            <h3 className="mb-4 text-xl font-semibold">Horaires d'ouverture</h3>
            <div className="space-y-3 text-slate-300">
              <div className="flex justify-between">
                <span>Lundi - Vendredi</span>
                <span className="text-white">8:00 - 18:00</span>
              </div>
              <div className="flex justify-between">
                <span>Samedi</span>
                <span className="text-white">9:00 - 13:00</span>
              </div>
              <div className="flex justify-between">
                <span>Dimanche</span>
                <span className="text-white">Fermé</span>
              </div>
            </div>

            <div className="mt-8 border-t border-slate-700 pt-8">
              <h3 className="mb-4 text-xl font-semibold">Support client</h3>
              <p className="mb-4 text-slate-300">
                Assistance technique disponible 24/7 pour les clients Professional
                et Enterprise.
              </p>
              <Badge className="bg-green-600 hover:bg-green-600">Support actif</Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-12 text-slate-400">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-6 w-6 text-blue-500" />
                <span className="font-semibold text-white">BizManager Pro</span>
              </div>
              <p className="text-sm">
                La plateforme SaaS complète pour gérer votre entreprise avec
                intelligence.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-medium text-white">Produit</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#features" className="hover:text-white">
                    Fonctionnalités
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white">
                    Tarifs
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Sécurité
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Mises à jour
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-medium text-white">Entreprise</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    À propos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Carrières
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-white">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-medium text-white">Légal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white">
                    Conditions d'utilisation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Politique de confidentialité
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Cookies
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white">
                    Mentions légales
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 text-center text-sm">
            <p>© 2026 BizManager Pro. Tous droits réservés. Hébergé en Tunisie 🇹🇳</p>
          </div>
        </div>
      </footer>
    </div>
  );
}