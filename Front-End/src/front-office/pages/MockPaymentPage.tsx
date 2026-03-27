import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";

import {
  RegistrationRequest,
  RegistrationRequestsApi,
} from "@/shared/lib/services/registrationRequests";

function getErrorMessage(err: any): string {
  const message = err?.response?.data?.message || err?.message;

  if (Array.isArray(message)) return message.join(", ");
  if (typeof message === "string") return message;

  return "Une erreur est survenue";
}

export function MockPaymentPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [request, setRequest] = useState<RegistrationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<
    "success" | "fail" | null
  >(null);

  useEffect(() => {
    const loadRequest = async () => {
      if (!id) {
        toast.error("Identifiant de demande invalide");
        navigate("/", { replace: true });
        return;
      }

      try {
        setLoading(true);
        const data = await RegistrationRequestsApi.findOne(id);
        setRequest(data);
      } catch (err: any) {
        toast.error("Impossible de charger la demande", {
          description: getErrorMessage(err),
        });
      } finally {
        setLoading(false);
      }
    };

    loadRequest();
  }, [id, navigate]);

  const handleSuccess = async () => {
    if (!id) return;

    try {
      setProcessingAction("success");

      const updated = await RegistrationRequestsApi.mockPaymentSuccess(id);
      setRequest(updated);

      toast.success("Paiement test réussi", {
        description: "Le statut de paiement a été mis à jour avec succès.",
      });

      setTimeout(() => {
        navigate("/auth/login");
      }, 1200);
    } catch (err: any) {
      toast.error("Échec de la simulation", {
        description: getErrorMessage(err),
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleFail = async () => {
    if (!id) return;

    try {
      setProcessingAction("fail");

      const updated = await RegistrationRequestsApi.mockPaymentFail(id);
      setRequest(updated);

      toast.error("Paiement test échoué", {
        description: "Le statut de paiement a été marqué comme échoué.",
      });
    } catch (err: any) {
      toast.error("Impossible de simuler l'échec", {
        description: getErrorMessage(err),
      });
    } finally {
      setProcessingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex items-center gap-3 rounded-2xl border bg-white px-6 py-4 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-sm font-medium text-slate-700">
            Chargement du paiement test...
          </span>
        </div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-lg rounded-3xl">
          <CardHeader>
            <CardTitle>Demande introuvable</CardTitle>
            <CardDescription>
              La demande de paiement test n’a pas pu être chargée.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link to="/">
              <Button className="w-full">Retour à l’accueil</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = request.paymentStatus === "paid";
  const isFailed = request.paymentStatus === "failed";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à l’accueil
          </Link>
        </div>

        <Card className="overflow-hidden rounded-3xl border border-slate-200 shadow-xl">
          <CardHeader className="border-b bg-white">
            <div className="mb-4 flex items-center justify-between gap-3">
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                Test Mode
              </Badge>

              {request.paymentStatus && (
                <Badge
                  className={
                    request.paymentStatus === "paid"
                      ? "bg-green-100 text-green-700 hover:bg-green-100"
                      : request.paymentStatus === "failed"
                      ? "bg-red-100 text-red-700 hover:bg-red-100"
                      : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                  }
                >
                  {request.paymentStatus}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 p-3">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>

              <div>
                <CardTitle className="text-2xl text-slate-900">
                  Paiement test
                </CardTitle>
                <CardDescription className="mt-1">
                  Cette page simule un paiement sans argent réel.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 bg-white p-6">
            <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Entreprise
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {request.companyName}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Propriétaire
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {request.ownerName}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Email
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {request.ownerEmail}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Plan
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {request.selectedPlan || "Non défini"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Méthode
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {request.paymentMethod || "mock_online"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Référence
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {request.paymentReference || "—"}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-semibold text-blue-900">
                    Simulation uniquement
                  </p>
                  <p className="mt-1 text-sm text-blue-700">
                    Aucun vrai montant n’est débité. Cette page sert uniquement à
                    tester le parcours de paiement de ton application.
                  </p>
                </div>
              </div>
            </div>

            {!isPaid && (
              <div className="grid gap-3 md:grid-cols-2">
                <Button
                  type="button"
                  className="h-12 w-full"
                  onClick={handleSuccess}
                  disabled={processingAction !== null}
                >
                  {processingAction === "success" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Simuler succès
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={handleFail}
                  disabled={processingAction !== null}
                >
                  {processingAction === "fail" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Traitement...
                    </>
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" />
                      Simuler échec
                    </>
                  )}
                </Button>
              </div>
            )}

            {isPaid && (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-semibold text-green-900">
                      Paiement validé
                    </p>
                    <p className="mt-1 text-sm text-green-700">
                      Le paiement test a été marqué comme payé. L’admin peut
                      maintenant approuver la demande.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isFailed && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="mt-0.5 h-5 w-5 text-red-600" />
                  <div>
                    <p className="text-sm font-semibold text-red-900">
                      Paiement échoué
                    </p>
                    <p className="mt-1 text-sm text-red-700">
                      Le paiement test est marqué comme échoué. Tu peux refaire
                      une simulation de succès si tu veux continuer le test.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/" className="flex-1">
                <Button variant="outline" className="h-12 w-full">
                  Retour accueil
                </Button>
              </Link>

              <Link to="/auth/login" className="flex-1">
                <Button className="h-12 w-full">Aller au login</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}