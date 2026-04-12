import { Outlet } from "react-router-dom";
import {
  Building2,
  ShieldCheck,
  BarChart3,
  Users,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left side - Branding / Showcase */}
        <div className="relative hidden overflow-hidden lg:flex">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-900" />

          {/* Decorative blobs */}
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
          <div className="absolute right-0 top-1/3 h-80 w-80 rounded-full bg-indigo-400/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />

          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />

          <div className="relative z-10 flex w-full flex-col justify-between p-10 xl:p-14 text-white">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-lg">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">BizManager Pro</h1>
                <p className="text-sm text-blue-100/80">
                  Business Management SaaS Platform
                </p>
              </div>
            </div>

            {/* Main content */}
            <div className="max-w-xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-blue-50 backdrop-blur-md">
                <Sparkles className="h-4 w-4" />
                Solution moderne pour entreprises et équipes
              </div>

              <h2 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
                Gérez votre entreprise
                <span className="block bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  avec une expérience plus intelligente
                </span>
              </h2>

              <p className="mt-6 text-base xl:text-lg leading-8 text-blue-100/85">
                Centralisez la facturation, les dépenses, les clients, les équipes
                et les analyses dans une seule plateforme professionnelle, rapide
                et sécurisée.
              </p>

              {/* Feature list */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
                    <BarChart3 className="h-5 w-5 text-blue-100" />
                  </div>
                  <h3 className="font-semibold text-white">Pilotage en temps réel</h3>
                  <p className="mt-1 text-sm leading-6 text-blue-100/75">
                    Suivez vos performances, revenus et activités en un coup d’œil.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">
                    <Users className="h-5 w-5 text-blue-100" />
                  </div>
                  <h3 className="font-semibold text-white">Collaboration d’équipe</h3>
                  <p className="mt-1 text-sm leading-6 text-blue-100/75">
                    Gérez les rôles, les accès et le travail collaboratif facilement.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20">
                    <ShieldCheck className="h-5 w-5 text-blue-100" />
                  </div>
                  <h3 className="font-semibold text-white">Sécurité avancée</h3>
                  <p className="mt-1 text-sm leading-6 text-blue-100/75">
                    Authentification protégée, contrôle d’accès et architecture multitenant.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5 text-blue-100" />
                  </div>
                  <h3 className="font-semibold text-white">Prêt pour la production</h3>
                  <p className="mt-1 text-sm leading-6 text-blue-100/75">
                    Une interface moderne pensée pour les besoins réels des entreprises.
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-10 grid grid-cols-3 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-md">
                  <div className="text-2xl xl:text-3xl font-bold">500+</div>
                  <div className="mt-1 text-xs xl:text-sm text-blue-100/75">
                    Entreprises
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-md">
                  <div className="text-2xl xl:text-3xl font-bold">99.9%</div>
                  <div className="mt-1 text-xs xl:text-sm text-blue-100/75">
                    Disponibilité
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center backdrop-blur-md">
                  <div className="text-2xl xl:text-3xl font-bold">24/7</div>
                  <div className="mt-1 text-xs xl:text-sm text-blue-100/75">
                    Support
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-blue-100/70">
              <span>© 2026 BizManager Pro</span>
              <span>Hébergé en Tunisie • Sécurisé • Multitenant</span>
            </div>
          </div>
        </div>

        {/* Right side - Auth forms */}
        <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-white via-slate-50 to-blue-50 px-6 py-10 sm:px-8 lg:px-12">
          {/* Decorative shapes */}
          <div className="absolute left-10 top-10 h-40 w-40 rounded-full bg-blue-100 blur-3xl opacity-70" />
          <div className="absolute bottom-10 right-10 h-48 w-48 rounded-full bg-indigo-100 blur-3xl opacity-70" />

          <div className="relative z-10 w-full max-w-md">
            {/* Mobile branding */}
            <div className="mb-8 flex items-center justify-center gap-3 lg:hidden">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">BizManager Pro</h1>
                <p className="text-sm text-slate-500">Business Management SaaS</p>
              </div>
            </div>

            {/* Form container */}
            <div className="rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8">
              <Outlet />
            </div>

            {/* Bottom small text */}
            <p className="mt-6 text-center text-sm leading-6 text-slate-500">
              Connexion sécurisée à votre espace professionnel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}