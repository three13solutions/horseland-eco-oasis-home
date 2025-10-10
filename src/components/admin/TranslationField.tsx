import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Languages, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TranslationFieldProps {
  label: string;
  translationKey: string;
  slug: string;
  languageCode: string;
  englishValue: string;
  currentValue: string;
  onValueChange: (value: string) => void;
  isTextarea?: boolean;
  rows?: number;
}

export function TranslationField({
  label,
  translationKey,
  slug,
  languageCode,
  englishValue,
  currentValue,
  onValueChange,
  isTextarea = false,
  rows = 3,
}: TranslationFieldProps) {
  const [isTranslating, setIsTranslating] = useState(false);

  const handleAutoTranslate = async () => {
    if (!englishValue) {
      toast.error("No English content to translate");
      return;
    }

    setIsTranslating(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-translate", {
        body: {
          text: englishValue,
          targetLanguage: languageCode,
          sourceLanguage: "en",
        },
      });

      if (error) throw error;

      onValueChange(data.translatedText);
      toast.success("Auto-translated successfully");
    } catch (error: any) {
      toast.error("Failed to auto-translate: " + error.message);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyFromEnglish = () => {
    onValueChange(englishValue);
    toast.success("Copied from English");
  };

  const isTranslated = currentValue && currentValue !== englishValue;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {label}
          {isTranslated && (
            <Badge variant="secondary" className="text-xs">
              Translated
            </Badge>
          )}
        </Label>
        <div className="flex gap-2">
          {languageCode !== "en" && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyFromEnglish}
                disabled={isTranslating}
              >
                <Copy className="w-3 h-3 mr-1" />
                Copy EN
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleAutoTranslate}
                disabled={isTranslating}
              >
                {isTranslating ? (
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                ) : (
                  <Languages className="w-3 h-3 mr-1" />
                )}
                Auto-translate
              </Button>
            </>
          )}
        </div>
      </div>

      {languageCode !== "en" && englishValue && (
        <div className="p-3 bg-muted/50 rounded-md border">
          <p className="text-xs text-muted-foreground mb-1">English (Reference):</p>
          <p className="text-sm">{englishValue}</p>
        </div>
      )}

      {isTextarea ? (
        <Textarea
          value={currentValue}
          onChange={(e) => onValueChange(e.target.value)}
          rows={rows}
          placeholder={languageCode === "en" ? "Enter content..." : "Enter translation..."}
          disabled={languageCode === "en"}
        />
      ) : (
        <Textarea
          value={currentValue}
          onChange={(e) => onValueChange(e.target.value)}
          rows={rows}
          placeholder={languageCode === "en" ? "Enter content..." : "Enter translation..."}
          disabled={languageCode === "en"}
        />
      )}
    </div>
  );
}
