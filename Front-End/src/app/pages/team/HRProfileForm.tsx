import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Badge } from '@/app/components/ui/badge';
import { Brain, X, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  employee: { id: string; name: string; role: string };
  onClose: () => void;
  onSaved: () => void;
}

const SATISFACTION_OPTIONS = [
  { label: '😞 Très insatisfait', value: 0.1 },
  { label: '😕 Insatisfait',      value: 0.3 },
  { label: '😐 Neutre',           value: 0.5 },
  { label: '😊 Satisfait',        value: 0.7 },
  { label: '😄 Très satisfait',   value: 0.9 },
];

export function HRProfileForm({ employee, onClose, onSaved }: Props) {
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({
    satisfactionLevel:   0.6,
    lastEvaluation:      0.7,
    numberOfProjects:    3,
    averageMonthlyHours: 180,
    workAccident:        0,
    promotionLast5years: 0,
  });

  const set = (key: string, value: number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(
        `http://localhost:3000/api/team-members/${employee.id}/hr-profile`,
        {
          method:  'PATCH',
          headers: {
            'Content-Type':  'application/json',
            Authorization:   `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );
      if (!res.ok) throw new Error('Save failed');
      toast.success(`Profil HR de ${employee.name} sauvegardé`);
      onSaved();
      onClose();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            Évaluation HR — {employee.name}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">

          {/* Satisfaction */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">
              😊 Niveau de satisfaction
            </label>
            <div className="flex flex-wrap gap-2">
              {SATISFACTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set('satisfactionLevel', opt.value)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
                    form.satisfactionLevel === opt.value
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Last evaluation */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              ⭐ Dernière évaluation de performance
              <Badge variant="outline" className="ml-2 text-xs">
                {Math.round(form.lastEvaluation * 100)}%
              </Badge>
            </label>
            <input
              type="range" min="0" max="1" step="0.05"
              value={form.lastEvaluation}
              onChange={(e) => set('lastEvaluation', parseFloat(e.target.value))}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>Mauvais (0%)</span><span>Excellent (100%)</span>
            </div>
          </div>

          {/* Number of projects */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              📁 Nombre de projets actifs
              <Badge variant="outline" className="ml-2 text-xs">
                {form.numberOfProjects} projets
              </Badge>
            </label>
            <input
              type="range" min="1" max="10" step="1"
              value={form.numberOfProjects}
              onChange={(e) => set('numberOfProjects', parseInt(e.target.value))}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>1 projet</span><span>10 projets</span>
            </div>
          </div>

          {/* Monthly hours */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              ⏰ Heures travaillées ce mois
              <Badge variant="outline" className="ml-2 text-xs">
                {form.averageMonthlyHours}h
              </Badge>
            </label>
            <input
              type="range" min="80" max="350" step="5"
              value={form.averageMonthlyHours}
              onChange={(e) => set('averageMonthlyHours', parseInt(e.target.value))}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>80h (sous-chargé)</span><span>350h (épuisé)</span>
            </div>
          </div>

          {/* Promotion & accident */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                🏆 Promu ces 5 ans ?
              </label>
              <div className="flex gap-2">
                {[{ label: 'Non', value: 0 }, { label: 'Oui', value: 1 }].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => set('promotionLast5years', opt.value)}
                    className={`flex-1 py-1.5 rounded-lg text-sm border transition-all ${
                      form.promotionLast5years === opt.value
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                🚑 Accident de travail ?
              </label>
              <div className="flex gap-2">
                {[{ label: 'Non', value: 0 }, { label: 'Oui', value: 1 }].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => set('workAccident', opt.value)}
                    className={`flex-1 py-1.5 rounded-lg text-sm border transition-all ${
                      form.workAccident === opt.value
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Annuler
            </Button>
            <Button
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyse...</>
                : <><Save className="w-4 h-4 mr-2" /> Analyser le risque</>
              }
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
