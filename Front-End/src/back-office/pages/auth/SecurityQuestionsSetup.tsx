import { useMemo, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { toast } from "sonner";
import {
  ShieldCheck,
  HelpCircle,
  CheckCircle2,
  LockKeyhole,
  AlertCircle,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const PRESET_QUESTIONS = [
  "Quel était le nom de votre premier animal de compagnie ?",
  "Dans quelle ville êtes-vous né(e) ?",
  "Quel est le nom de jeune fille de votre mère ?",
  "Quel était le nom de votre école primaire ?",
  "Quelle était la marque de votre première voiture ?",
  "Quel est le deuxième prénom de votre frère ou sœur aîné(e) ?",
  "Dans quelle rue avez-vous grandi ?",
  "Quel était votre surnom d’enfance ?",
];

interface Props {
  token?: string;
  onComplete: () => void;
}

function QuestionCard({
  index,
  selectedValue,
  answerValue,
  questions,
  onQuestionChange,
  onAnswerChange,
}: {
  index: number;
  selectedValue: string;
  answerValue: string;
  questions: string[];
  onQuestionChange: (value: string) => void;
  onAnswerChange: (value: string) => void;
}) {
  const isReady = !!selectedValue && !!answerValue.trim();

  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <HelpCircle className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Question {index + 1}
            </p>
            <p className="text-xs text-slate-500">
              Sélectionnez une question puis saisissez votre réponse
            </p>
          </div>
        </div>

        {isReady ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Prête
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
            Incomplète
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">
            Question de sécurité
          </Label>
          <Select value={selectedValue} onValueChange={onQuestionChange}>
            <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-200">
              <SelectValue placeholder="Choisir une question..." />
            </SelectTrigger>
            <SelectContent>
              {questions.map((q) => (
                <SelectItem key={q} value={q}>
                  {q}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-slate-700">
            Votre réponse
          </Label>
          <Input
            type="text"
            placeholder="Saisissez votre réponse"
            value={answerValue}
            onChange={(e) => onAnswerChange(e.target.value)}
            disabled={!selectedValue}
            required
            className="h-12 rounded-2xl border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-indigo-200 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </div>
      </div>
    </div>
  );
}

export function SecurityQuestionsSetup({ token, onComplete }: Props) {
  const [selected, setSelected] = useState(["", "", ""]);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [loading, setLoading] = useState(false);

  const authToken =
    token?.trim() ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("accessToken") ||
    "";

  function availableFor(index: number) {
    return PRESET_QUESTIONS.filter(
      (q) => q === selected[index] || !selected.includes(q)
    );
  }

  const progress = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 3; i++) {
      if (selected[i] && answers[i].trim()) count++;
    }
    return count;
  }, [selected, answers]);

  const isComplete =
    selected.every((q) => !!q) &&
    answers.every((a) => !!a.trim()) &&
    new Set(selected).size === 3;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!authToken) {
      toast.error("Session expirée", {
        description: "Veuillez vous reconnecter avant de continuer.",
      });
      return;
    }

    if (selected.some((q) => !q)) {
      toast.error("Veuillez sélectionner les 3 questions.");
      return;
    }

    if (answers.some((a) => !a.trim())) {
      toast.error("Veuillez répondre aux 3 questions.");
      return;
    }

    if (new Set(selected).size < 3) {
      toast.error("Veuillez choisir 3 questions différentes.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/security-questions/setup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          questions: selected.map((q, i) => ({
            question: q,
            answer: answers[i].trim(),
          })),
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.status === 401) {
        throw new Error("Votre session n’est pas valide ou a expiré.");
      }

      if (!res.ok) {
        throw new Error(data?.message || "Impossible d’enregistrer les questions.");
      }

      toast.success("Questions de sécurité enregistrées avec succès.");
      onComplete();
    } catch (err: any) {
      toast.error("Échec de l’enregistrement", {
        description: err?.message || "Une erreur est survenue.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-0">
      <Card className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-6 py-6 sm:px-8">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <ShieldCheck className="h-6 w-6" />
          </div>

          <CardTitle className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Configurer les questions de sécurité
          </CardTitle>

          <CardDescription className="max-w-2xl text-sm leading-6 text-slate-500">
            Choisissez 3 questions de sécurité et renseignez vos réponses.
            Elles vous permettront de récupérer l’accès à votre compte si nécessaire.
          </CardDescription>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
              <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Cette étape est essentielle : ces questions vous aideront à
                récupérer votre compte en cas d’oubli de mot de passe.
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
              Progression :{" "}
              <span className="font-semibold text-slate-900">{progress}/3</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-6 py-6 sm:px-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {[0, 1, 2].map((i) => (
              <QuestionCard
                key={i}
                index={i}
                selectedValue={selected[i]}
                answerValue={answers[i]}
                questions={availableFor(i)}
                onQuestionChange={(val) => {
                  const updated = [...selected];
                  updated[i] = val;
                  setSelected(updated);
                }}
                onAnswerChange={(val) => {
                  const updated = [...answers];
                  updated[i] = val;
                  setAnswers(updated);
                }}
              />
            ))}

            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Choisissez des réponses faciles à retenir pour vous, mais
                  difficiles à deviner pour les autres.
                </p>
              </div>
            </div>

            <Button
              type="submit"
              className="h-12 w-full rounded-2xl bg-slate-900 text-base font-medium text-white shadow-lg shadow-slate-900/10 transition hover:bg-slate-800"
              disabled={loading || !isComplete}
              aria-busy={loading}
            >
              {loading ? "Enregistrement..." : "Enregistrer les questions de sécurité"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}