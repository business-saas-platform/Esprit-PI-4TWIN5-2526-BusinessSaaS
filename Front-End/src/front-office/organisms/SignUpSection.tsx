import { useState } from "react";
import { ChevronRight, Shield } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui";
import { toast } from "sonner";

export function SignUpSection() {
  const [formData, setFormData] = useState({
    businessName: "",
    fullName: "",
    email: "",
    phone: "",
    businessType: "",
    teamSize: "",
    message: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Demande envoyée avec succès!", {
      description: "Notre équipe vous contactera sous 24 heures."
    });
    setFormData({
      businessName: "",
      fullName: "",
      email: "",
      phone: "",
      businessType: "",
      teamSize: "",
      message: ""
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <section id="signup" className="py-20 bg-card">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <Badge className="mb-4">Commencer maintenant</Badge>
          <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-4">
            Demandez une démo personnalisée
          </h2>
          <p className="text-xl text-muted-foreground">
            Remplissez le formulaire ci-dessous et notre équipe vous contactera sous 24 heures
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Informations de votre entreprise</CardTitle>
            <CardDescription>
              Dites-nous en plus sur votre entreprise pour personnaliser votre expérience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
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

              <div className="grid md:grid-cols-2 gap-6">
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

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="businessType">Type d'entreprise *</Label>
                  <Select value={formData.businessType} onValueChange={(value) => handleChange("businessType", value)}>
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
                  <Select value={formData.teamSize} onValueChange={(value) => handleChange("teamSize", value)}>
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

              <div className="flex items-start gap-2 p-4 bg-blue-50 rounded-lg">
                <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <div className="font-medium mb-1">Conformité et sécurité</div>
                  <div className="text-blue-700">
                    Vos données sont hébergées en Tunisie et sont conformes aux lois tunisiennes de souveraineté des données. 
                    Nous ne partagerons jamais vos informations avec des tiers.
                  </div>
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full">
                Envoyer ma demande
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-sm text-center text-muted-foreground">
                En soumettant ce formulaire, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}