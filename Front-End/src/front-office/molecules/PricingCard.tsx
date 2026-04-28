import { Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Button, Badge } from "@/shared/ui";

interface PricingFeature {
  text: string;
}

interface PricingCardProps {
  title: string;
  description: string;
  price: string;
  priceLabel?: string;
  features: PricingFeature[];
  buttonText: string;
  buttonVariant?: "default" | "outline";
  buttonLink: string;
  isPopular?: boolean;
}

export function PricingCard({
  title,
  description,
  price,
  priceLabel = "/mois",
  features,
  buttonText,
  buttonVariant = "outline",
  buttonLink,
  isPopular = false
}: PricingCardProps) {
  return (
    <Card className={`border-2 relative ${isPopular ? 'border-blue-500' : ''}`}>
      {isPopular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500">
          Populaire
        </Badge>
      )}
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-4">
          <span className="text-4xl font-bold">{price}</span>
          {priceLabel && <span className="text-muted-foreground">{priceLabel}</span>}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <span>{feature.text}</span>
            </li>
          ))}
        </ul>
        <a href={buttonLink}>
          <Button className="w-full mt-6" variant={buttonVariant}>
            {buttonText}
          </Button>
        </a>
      </CardContent>
    </Card>
  );
}