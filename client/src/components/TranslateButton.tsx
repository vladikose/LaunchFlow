import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Languages, Loader2, ChevronDown, ChevronUp } from "lucide-react";

interface TranslateButtonProps {
  text: string;
  className?: string;
}

export function TranslateButton({ text, className }: TranslateButtonProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const getTargetLang = (): string => {
    const lang = i18n.language;
    if (lang.startsWith("ru")) return "RU";
    if (lang.startsWith("zh")) return "ZH";
    return "EN";
  };

  const translateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/translate", {
        text,
        targetLang: getTargetLang(),
      });
      return response.json();
    },
    onSuccess: (data: { translatedText: string; detectedSourceLang: string }) => {
      setTranslatedText(data.translatedText);
      setIsExpanded(true);
    },
    onError: () => {
      toast({
        title: t("translate.translationError"),
        variant: "destructive",
      });
    },
  });

  const handleTranslate = () => {
    if (translatedText) {
      setIsExpanded(!isExpanded);
    } else {
      translateMutation.mutate();
    }
  };

  return (
    <div className={className}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleTranslate}
        disabled={translateMutation.isPending}
        className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
        data-testid="button-translate"
      >
        {translateMutation.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Languages className="h-3 w-3" />
        )}
        <span>{translatedText && isExpanded ? t("translate.showOriginal") : t("translate.translate")}</span>
        {translatedText && (
          isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        )}
      </Button>
      
      {isExpanded && translatedText && (
        <div className="mt-2 p-2 bg-primary/5 rounded-md border border-primary/10">
          <p className="text-sm text-foreground">{translatedText}</p>
        </div>
      )}
    </div>
  );
}
