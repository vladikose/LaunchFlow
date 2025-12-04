import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import type { Company } from "@shared/schema";

export default function AdminCompany() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");

  const { data: company, isLoading } = useQuery<Company>({
    queryKey: ["/api/company"],
  });

  useEffect(() => {
    if (company) {
      setCompanyName(company.name);
    }
  }, [company]);

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      return apiRequest("PATCH", "/api/company", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      toast({ title: t("admin.company.saved") });
    },
    onError: () => {
      toast({ title: t("admin.company.saveFailed"), variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (companyName.trim()) {
      updateCompanyMutation.mutate({ name: companyName.trim() });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("admin.company.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("admin.company.description")}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t("admin.company.info")}
          </CardTitle>
          <CardDescription>
            {t("admin.company.infoDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">{t("admin.company.name")}</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t("admin.company.namePlaceholder")}
                  data-testid="input-company-name"
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={updateCompanyMutation.isPending || !companyName.trim()}
                data-testid="button-save-company"
              >
                {updateCompanyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {t("common.save")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
