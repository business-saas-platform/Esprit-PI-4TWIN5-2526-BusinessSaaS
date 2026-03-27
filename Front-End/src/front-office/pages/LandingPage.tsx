import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
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
  CreditCard,
  Wallet,
  Landmark,
} from "lucide-react";
import { toast } from "sonner";

import { RegistrationRequestsApi } from "@/shared/lib/services/registrationRequests";

type FormData = {
  businessName: string;
  fullName: string;
  email: string;
  phone: string;
  businessType: string;
  teamSize: string;
  message: string;
};

type SelectedPlan = "starter" | "professional" | "enterprise" | "";
type PaymentMethod = "mock_online" | "cash" | "bank_transfer" | "manual" | "";

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
    description:
      "Contrôle d’accès, architecture sécurisée et séparation multitenant.",
  },
  {
    icon: Globe,
    title: "Conformité tunisienne",
    description:
      "Pensé pour les entreprises tunisiennes et la souveraineté des données.",
  },
  {
    icon: CheckCircle2,
    title: "Déploiement simple",
    description: "Interface moderne, intuitive et rapide à prendre en main.",
  },
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getErrorMessage(err: any): string {
  const message = err?.response?.data?.message || err?.message;

  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string") return message;

  return "Impossible d'envoyer la demande";
}

export function LandingPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mock_online");

  const [touched, setTouched] = useState({
    businessName: false,
    fullName: false,
    email: false,
    phone: false,
    businessType: false,
    teamSize: false,
    paymentMethod: false,
  });

  const cleanData = useMemo(
    () => ({
      businessName: formData.businessName.trim(),
      fullName: formData.fullName.trim(),
      email: formData.email.trim().toLowerCase(),
      phone: formData.phone.trim(),
      businessType: formData.businessType.trim(),
      teamSize: formData.teamSize.trim(),
      message: formData.message.trim(),
    }),
    [formData]
  );

  const filledFields = useMemo(() => {
    const baseCount = Object.values(formData).filter(
      (v) => String(v).trim() !== ""
    ).length;

    return selectedPlan ? baseCount + 1 : baseCount;
  }, [formData, selectedPlan]);

  const errors = useMemo(() => {
    return {
      businessName:
        touched.businessName && !cleanData.businessName
          ? "Veuillez saisir le nom de l'entreprise."
          : cleanData.businessName &&
            cleanData.businessName.length < 2 &&
            touched.businessName
          ? "Le nom de l'entreprise doit contenir au moins 2 caractères."
          : "",
      fullName:
        touched.fullName && !cleanData.fullName
          ? "Veuillez saisir votre nom complet."
          : cleanData.fullName &&
            cleanData.fullName.length < 3 &&
            touched.fullName
          ? "Le nom complet doit contenir au moins 3 caractères."
          : "",
      email:
        touched.email && !cleanData.email
          ? "Veuillez saisir votre email."
          : touched.email && !isValidEmail(cleanData.email)
          ? "Veuillez saisir une adresse email valide."
          : "",
      phone:
        touched.phone && !cleanData.phone
          ? "Veuillez saisir votre numéro de téléphone."
          : "",
      businessType:
        touched.businessType && !cleanData.businessType
          ? "Veuillez choisir le type d'entreprise."
          : "",
      teamSize:
        touched.teamSize && !cleanData.teamSize
          ? "Veuillez choisir la taille de l'équipe."
          : "",
      paymentMethod:
        touched.paymentMethod && !paymentMethod
          ? "Veuillez choisir un mode de paiement."
          : "",
    };
  }, [cleanData, touched, paymentMethod]);

  const planLabel = useMemo(() => {
    switch (selectedPlan) {
      case "starter":
        return "Starter - 49 TND/mois";
      case "professional":
        return "Professional - 99 TND/mois";
      case "enterprise":
        return "Enterprise - Sur mesure";
      default:
        return "";
    }
  }, [selectedPlan]);

  const paymentMethodLabel = useMemo(() => {
    switch (paymentMethod) {
      case "mock_online":
        return "Paiement test en ligne";
      case "cash":
        return "Paiement cash";
      case "bank_transfer":
        return "Virement bancaire";
      case "manual":
        return "Paiement manuel";
      default:
        return "";
    }
  }, [paymentMethod]);

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formError) setFormError("");
  };

  const markAllTouched = () => {
    setTouched({
      businessName: true,
      fullName: true,
      email: true,
      phone: true,
      businessType: true,
      teamSize: true,
      paymentMethod: true,
    });
  };

  const validate = () => {
    if (!selectedPlan) {
      return "Veuillez choisir un plan avant d'envoyer la demande.";
    }
    if (!cleanData.businessName) {
      return "Le nom de l'entreprise est obligatoire.";
    }
    if (!cleanData.fullName) {
      return "Le nom complet est obligatoire.";
    }
    if (!cleanData.email) {
      return "L'email est obligatoire.";
    }
    if (!cleanData.phone) {
      return "Le téléphone est obligatoire.";
    }
    if (!cleanData.businessType) {
      return "Veuillez choisir le type d'entreprise.";
    }
    if (!cleanData.teamSize) {
      return "Veuillez choisir la taille de l'équipe.";
    }
    if (!paymentMethod) {
      return "Veuillez choisir un mode de paiement.";
    }
    if (!isValidEmail(cleanData.email)) {
      return "Veuillez saisir une adresse email valide.";
    }
    if (cleanData.fullName.length < 3) {
      return "Le nom complet doit contenir au moins 3 caractères.";
    }
    if (cleanData.businessName.length < 2) {
      return "Le nom de l'entreprise doit contenir au moins 2 caractères.";
    }

    return "";
  };

  const scrollToSignup = () => {
    const section = document.getElementById("signup");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handlePlanSelect = (plan: SelectedPlan) => {
    setSelectedPlan(plan);
    scrollToSignup();

    toast.success("Plan sélectionné", {
      description:
        plan === "starter"
          ? "Vous avez choisi le plan Starter."
          : plan === "professional"
          ? "Vous avez choisi le plan Professional."
          : "Vous avez choisi le plan Enterprise.",
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    markAllTouched();
    setFormError("");

    const validationError = validate();
    if (validationError) {
      setFormError(validationError);
      toast.error("Erreur de validation", {
        description: validationError,
      });
      return;
    }

    try {
      setSubmitting(true);

      const createdRequest = await RegistrationRequestsApi.create({
        ownerName: cleanData.fullName,
        ownerEmail: cleanData.email,
        companyName: cleanData.businessName,
        companyCategory: cleanData.businessType,
        companyPhone: cleanData.phone,
        teamSize: cleanData.teamSize,
        message: cleanData.message || undefined,
        selectedPlan,
        paymentMethod,
      });

      if (paymentMethod === "mock_online") {
        toast.success("Demande créée avec succès", {
          description:
            "Votre demande a été enregistrée. Redirection vers le paiement test...",
        });

        const paymentPage =
          createdRequest?.paymentUrl || `/mock-payment/${createdRequest?.id}`;

        navigate(paymentPage);
        return;
      }

      toast.success("Demande envoyée avec succès", {
        description:
          paymentMethod === "cash"
            ? "Votre demande a été enregistrée avec paiement cash en attente de confirmation admin."
            : paymentMethod === "bank_transfer"
            ? "Votre demande a été enregistrée avec virement en attente de confirmation admin."
            : selectedPlan
            ? `Votre demande pour le plan ${planLabel} a bien été envoyée.`
            : "Votre demande a bien été envoyée. Nous vous contacterons bientôt.",
      });

      setFormData(initialFormData);
      setSelectedPlan("");
      setPaymentMethod("mock_online");
      setFormError("");
      setTouched({
        businessName: false,
        fullName: false,
        email: false,
        phone: false,
        businessType: false,
        teamSize: false,
        paymentMethod: false,
      });
    } catch (err: any) {
      const msg = getErrorMessage(err);

      toast.error("Échec de l'envoi", {
        description: msg,
      });

      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-semibold text-slate-900">
              BizManager Pro
            </span>
          </div>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-slate-600 transition-colors hover:text-slate-900"
            >
              Fonctionnalités
            </a>
            <a
              href="#pricing"
              className="text-slate-600 transition-colors hover:text-slate-900"
            >
              Tarifs
            </a>
            <a
              href="#contact"
              className="text-slate-600 transition-colors hover:text-slate-900"
            >
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
              Une plateforme complète pour la facturation, les dépenses, la
              gestion client, les rapports et la collaboration d’équipe. Conçue
              pour les entreprises tunisiennes avec une approche moderne,
              sécurisée et évolutive.
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
                    <div className="text-2xl font-bold text-blue-900">
                      42,580 TND
                    </div>
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
                    <div className="text-lg font-semibold text-slate-900">
                      12,350
                    </div>
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
                    <p className="mt-1 text-sm text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <Badge className="mb-4">Fonctionnalités</Badge>
            <h2 className="mb-4 text-3xl font-bold text-slate-900 lg:text-5xl">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-slate-600">
              Une suite complète d’outils pour gérer les opérations clés de votre
              entreprise.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="border-2 transition-colors hover:border-blue-200"
                >
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

      <section id="pricing" className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <Badge className="mb-4">Tarifs</Badge>
            <h2 className="mb-4 text-3xl font-bold text-slate-900 lg:text-5xl">
              Choisissez votre plan
            </h2>
            <p className="mx-auto max-w-2xl text-xl text-slate-600">
              Des tarifs clairs, évolutifs et adaptés à la taille de votre
              entreprise.
            </p>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
            <Card
              className={`border-2 ${
                selectedPlan === "starter"
                  ? "border-blue-500 shadow-lg"
                  : "border-slate-200"
              }`}
            >
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

                <Button
                  type="button"
                  className="mt-6 w-full"
                  variant={selectedPlan === "starter" ? "default" : "outline"}
                  onClick={() => handlePlanSelect("starter")}
                >
                  Commencer
                </Button>
              </CardContent>
            </Card>

            <Card
              className={`relative border-2 ${
                selectedPlan === "professional"
                  ? "border-blue-500 shadow-lg"
                  : "border-blue-300"
              }`}
            >
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500">
                Populaire
              </Badge>
              <CardHeader>
                <CardTitle>Professional</CardTitle>
                <CardDescription>
                  Pour les entreprises en croissance
                </CardDescription>
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

                <Button
                  type="button"
                  className="mt-6 w-full"
                  onClick={() => handlePlanSelect("professional")}
                >
                  Commencer
                </Button>
              </CardContent>
            </Card>

            <Card
              className={`border-2 ${
                selectedPlan === "enterprise"
                  ? "border-blue-500 shadow-lg"
                  : "border-slate-200"
              }`}
            >
              <CardHeader>
                <CardTitle>Enterprise</CardTitle>
                <CardDescription>
                  Pour les grandes organisations
                </CardDescription>
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

                <Button
                  type="button"
                  className="mt-6 w-full"
                  variant={selectedPlan === "enterprise" ? "default" : "outline"}
                  onClick={() => handlePlanSelect("enterprise")}
                >
                  Nous contacter
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section id="signup" className="bg-white py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <Badge className="mb-4">Commencer maintenant</Badge>
            <h2 className="mb-4 text-3xl font-bold text-slate-900 lg:text-5xl">
              Demandez une démo personnalisée
            </h2>
            <p className="text-xl text-slate-600">
              Remplissez ce formulaire et notre équipe vous contactera sous 24
              heures.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informations de votre entreprise</CardTitle>
              <CardDescription>
                Dites-nous en plus sur votre activité pour personnaliser votre
                expérience.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6" noValidate>
                {selectedPlan && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    <span className="font-semibold">Plan sélectionné :</span>{" "}
                    {planLabel}
                  </div>
                )}

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Nom de l'entreprise *</Label>
                    <Input
                      id="businessName"
                      placeholder="Ex: SARL Innovation Tech"
                      value={formData.businessName}
                      onChange={(e) =>
                        handleChange("businessName", e.target.value)
                      }
                      onBlur={() =>
                        setTouched((prev) => ({ ...prev, businessName: true }))
                      }
                      disabled={submitting}
                      required
                    />
                    {errors.businessName && (
                      <p className="text-xs font-medium text-red-500">
                        {errors.businessName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nom complet *</Label>
                    <Input
                      id="fullName"
                      placeholder="Ex: Mohamed Ben Ali"
                      value={formData.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      onBlur={() =>
                        setTouched((prev) => ({ ...prev, fullName: true }))
                      }
                      disabled={submitting}
                      required
                    />
                    {errors.fullName && (
                      <p className="text-xs font-medium text-red-500">
                        {errors.fullName}
                      </p>
                    )}
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
                      onBlur={() =>
                        setTouched((prev) => ({ ...prev, email: true }))
                      }
                      disabled={submitting}
                      required
                    />
                    {errors.email && (
                      <p className="text-xs font-medium text-red-500">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+216 XX XXX XXX"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      onBlur={() =>
                        setTouched((prev) => ({ ...prev, phone: true }))
                      }
                      disabled={submitting}
                      required
                    />
                    {errors.phone && (
                      <p className="text-xs font-medium text-red-500">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="businessType">Type d'entreprise *</Label>
                    <Select
                      value={formData.businessType}
                      onValueChange={(value) =>
                        handleChange("businessType", value)
                      }
                      disabled={submitting}
                    >
                      <SelectTrigger
                        onBlur={() =>
                          setTouched((prev) => ({
                            ...prev,
                            businessType: true,
                          }))
                        }
                      >
                        <SelectValue placeholder="Sélectionnez..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Retail">SARL</SelectItem>
                        <SelectItem value="Technology">SUARL</SelectItem>
                        <SelectItem value="Finance">SA</SelectItem>
                        <SelectItem value="Consulting">
                          Freelance / Personne physique
                        </SelectItem>
                        <SelectItem value="Education">Association</SelectItem>
                        <SelectItem value="Other">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.businessType && (
                      <p className="text-xs font-medium text-red-500">
                        {errors.businessType}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="teamSize">Taille de l'équipe *</Label>
                    <Select
                      value={formData.teamSize}
                      onValueChange={(value) => handleChange("teamSize", value)}
                      disabled={submitting}
                    >
                      <SelectTrigger
                        onBlur={() =>
                          setTouched((prev) => ({ ...prev, teamSize: true }))
                        }
                      >
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
                    {errors.teamSize && (
                      <p className="text-xs font-medium text-red-500">
                        {errors.teamSize}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Mode de paiement *</Label>
                  <div className="grid gap-3 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("mock_online")}
                      className={`rounded-xl border p-4 text-left transition ${
                        paymentMethod === "mock_online"
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-slate-900">
                            Paiement test en ligne
                          </p>
                          <p className="text-sm text-slate-500">
                            Simulation sans argent réel
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cash")}
                      className={`rounded-xl border p-4 text-left transition ${
                        paymentMethod === "cash"
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-slate-900">Cash</p>
                          <p className="text-sm text-slate-500">
                            Confirmation manuelle par admin
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("bank_transfer")}
                      className={`rounded-xl border p-4 text-left transition ${
                        paymentMethod === "bank_transfer"
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Landmark className="h-5 w-5 text-violet-600" />
                        <div>
                          <p className="font-medium text-slate-900">
                            Virement bancaire
                          </p>
                          <p className="text-sm text-slate-500">
                            Vérification manuelle
                          </p>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("manual")}
                      className={`rounded-xl border p-4 text-left transition ${
                        paymentMethod === "manual"
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="h-5 w-5 text-slate-700" />
                        <div>
                          <p className="font-medium text-slate-900">
                            Paiement manuel
                          </p>
                          <p className="text-sm text-slate-500">
                            Décision et suivi par admin
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {errors.paymentMethod && (
                    <p className="text-xs font-medium text-red-500">
                      {errors.paymentMethod}
                    </p>
                  )}

                  {paymentMethod && (
                    <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Mode sélectionné :{" "}
                      <span className="font-medium text-slate-900">
                        {paymentMethodLabel}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message (optionnel)</Label>
                  <Textarea
                    id="message"
                    placeholder="Parlez-nous de vos besoins spécifiques..."
                    rows={4}
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="flex items-start gap-2">
                    <Shield className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    <div className="text-sm text-blue-900">
                      <div className="mb-1 font-medium">
                        Conformité et sécurité
                      </div>
                      <div className="text-blue-700">
                        Vos données sont hébergées en Tunisie et conformes aux
                        exigences de souveraineté des données. Nous ne partageons
                        jamais vos informations avec des tiers.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-600">
                  Progression du formulaire :{" "}
                  <span className="font-medium text-slate-900">
                    {filledFields}/8 champs remplis
                  </span>
                </div>

                {formError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {formError}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <ChevronRight className="mr-2 h-4 w-4" />
                      {paymentMethod === "mock_online"
                        ? "Continuer vers le paiement test"
                        : "Envoyer ma demande"}
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-slate-600">
                  En soumettant ce formulaire, vous acceptez nos conditions
                  d’utilisation et notre politique de confidentialité.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="contact" className="bg-slate-900 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <div>
            <h2 className="mb-6 text-3xl font-bold lg:text-4xl">
              Besoin d'aide ou de plus d'informations ?
            </h2>
            <p className="mb-8 text-lg text-slate-300">
              Notre équipe est là pour répondre à vos questions et vous
              accompagner dans la digitalisation de votre entreprise.
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
                  <a
                    href="tel:+21671234567"
                    className="text-slate-300 hover:text-white"
                  >
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
                Assistance technique disponible 24/7 pour les clients
                Professional et Enterprise.
              </p>
              <Badge className="bg-green-600 hover:bg-green-600">
                Support actif
              </Badge>
            </div>
          </div>
        </div>
      </section>

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
            <p>
              © 2026 BizManager Pro. Tous droits réservés. Hébergé en Tunisie 🇹🇳
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}