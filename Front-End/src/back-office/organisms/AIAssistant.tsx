import { useState } from "react";
import {
  Sparkles,
  X,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  ChevronRight,
} from "lucide-react";
import { Button, Card, Badge, ScrollArea } from "@/shared/ui";
import { mockAIInsights, type AIInsight } from "@/shared/lib/mockData";

const insightIcons = {
  prediction: TrendingUp,
  warning: AlertTriangle,
  recommendation: Lightbulb,
  opportunity: Target,
};

const insightColors = {
  prediction: "text-blue-600 bg-blue-50",
  warning: "text-orange-600 bg-orange-50",
  recommendation: "text-purple-600 bg-purple-50",
  opportunity: "text-green-600 bg-green-50",
};

export function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [insights] = useState<AIInsight[]>(mockAIInsights);

  return (
    <>
      {/* Floating AI Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 z-40"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* AI Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-card rounded-lg shadow-2xl border border-border z-40 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-white" />
              <h3 className="font-semibold text-white">AI Business Assistant</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-card/20"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">AI-Powered Insights:</span> I've analyzed your business
                  data and found <span className="font-semibold text-indigo-600">{insights.length} insights</span> to
                  help optimize your operations.
                </p>
              </div>

              {/* Insights List */}
              {insights.map((insight) => {
                const Icon = insightIcons[insight.type];
                const colorClass = insightColors[insight.type];
                
                return (
                  <Card key={insight.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${colorClass}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-foreground text-sm">
                            {insight.title}
                          </h4>
                          <Badge variant="secondary" className="text-xs ml-2">
                            {insight.confidence}% confident
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {insight.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs capitalize">
                            {insight.category.replace("_", " ")}
                          </Badge>
                          {insight.actionable && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-indigo-600 hover:text-indigo-700 text-xs h-7"
                            >
                              {insight.action}
                              <ChevronRight className="h-3 w-3 ml-1" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {/* Footer Info */}
              <div className="text-center text-xs text-muted-foreground pt-2">
                AI insights are updated every 6 hours based on your business data
              </div>
            </div>
          </ScrollArea>
        </div>
      )}
    </>
  );
}
