import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Users, ArrowLeft, Loader2, Link as LinkIcon } from "lucide-react";

type OnboardingStep = "choice" | "create" | "join";

export default function Onboarding() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<OnboardingStep>("choice");
  const [companyName, setCompanyName] = useState("");
  const [inviteToken, setInviteToken] = useState("");

  const createCompanyMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/companies", { name });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("onboarding.companyCreated"),
        description: t("onboarding.companyCreatedDesc"),
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: t("onboarding.createFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const joinCompanyMutation = useMutation({
    mutationFn: async (token: string) => {
      const response = await apiRequest("POST", `/api/invites/${token}/accept`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: t("invite.accepted"),
        description: t("invite.acceptedDesc"),
      });
      setLocation("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: t("invite.acceptFailed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (companyName.trim()) {
      createCompanyMutation.mutate(companyName.trim());
    }
  };

  const handleJoinCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const token = extractToken(inviteToken.trim());
    if (token) {
      joinCompanyMutation.mutate(token);
    }
  };

  const extractToken = (input: string): string => {
    if (input.includes("/invite/")) {
      const parts = input.split("/invite/");
      return parts[parts.length - 1].split("?")[0].split("#")[0];
    }
    return input;
  };

  if (step === "create") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              className="w-fit mb-2"
              onClick={() => setStep("choice")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {t("onboarding.createCompany")}
            </CardTitle>
            <CardDescription>
              {t("onboarding.createCompanyDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCompany} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">{t("onboarding.companyName")}</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t("onboarding.companyNamePlaceholder")}
                  required
                  data-testid="input-company-name"
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={createCompanyMutation.isPending || !companyName.trim()}
                data-testid="button-create-company"
              >
                {createCompanyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Building2 className="h-4 w-4 mr-2" />
                )}
                {t("onboarding.createCompanyButton")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === "join") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Button
              variant="ghost"
              size="sm"
              className="w-fit mb-2"
              onClick={() => setStep("choice")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t("onboarding.joinCompany")}
            </CardTitle>
            <CardDescription>
              {t("onboarding.joinCompanyDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinCompany} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteToken">{t("onboarding.inviteLink")}</Label>
                <Input
                  id="inviteToken"
                  value={inviteToken}
                  onChange={(e) => setInviteToken(e.target.value)}
                  placeholder={t("onboarding.inviteLinkPlaceholder")}
                  required
                  data-testid="input-invite-token"
                />
                <p className="text-xs text-muted-foreground">
                  {t("onboarding.inviteLinkHint")}
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={joinCompanyMutation.isPending || !inviteToken.trim()}
                data-testid="button-join-company"
              >
                {joinCompanyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Users className="h-4 w-4 mr-2" />
                )}
                {t("onboarding.joinCompanyButton")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">{t("onboarding.welcome")}</h1>
          <p className="text-muted-foreground">{t("onboarding.chooseOption")}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer transition-all hover-elevate"
            onClick={() => setStep("create")}
            data-testid="card-create-company"
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t("onboarding.createCompany")}</CardTitle>
              <CardDescription>
                {t("onboarding.createCompanyOption")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" data-testid="button-select-create">
                {t("onboarding.createCompanyButton")}
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer transition-all hover-elevate"
            onClick={() => setStep("join")}
            data-testid="card-join-company"
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>{t("onboarding.joinCompany")}</CardTitle>
              <CardDescription>
                {t("onboarding.joinCompanyOption")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" data-testid="button-select-join">
                {t("onboarding.joinCompanyButton")}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => window.location.href = "/api/logout"}
            data-testid="button-logout"
          >
            {t("onboarding.differentAccount")}
          </Button>
        </div>
      </div>
    </div>
  );
}
