import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Loader2, CheckCircle, XCircle, LogIn, UserPlus } from "lucide-react";

interface InviteInfo {
  valid: boolean;
  companyName: string;
  email?: string;
  role: string;
}

export default function Invite() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const { data: inviteInfo, isLoading: inviteLoading, error } = useQuery<InviteInfo>({
    queryKey: ["/api/invites", token],
    queryFn: async () => {
      const response = await fetch(`/api/invites/${token}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Invalid invite");
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const acceptInviteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/invites/${token}/accept`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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
        variant: "destructive" 
      });
    },
  });

  const handleLogin = () => {
    window.location.href = `/api/login?returnTo=/invite/${token}`;
  };

  const handleAccept = () => {
    acceptInviteMutation.mutate();
  };

  if (authLoading || inviteLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  if (error || !inviteInfo?.valid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>{t("invite.invalid")}</CardTitle>
            <CardDescription>
              {t("invite.invalidDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => setLocation("/")} data-testid="button-go-home">
              {t("invite.goHome")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>{t("invite.joinCompany")}</CardTitle>
          <CardDescription>
            {t("invite.invitedTo", { company: inviteInfo.companyName })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("invite.company")}</span>
              <span className="font-medium">{inviteInfo.companyName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t("invite.role")}</span>
              <span className="font-medium capitalize">{inviteInfo.role}</span>
            </div>
            {inviteInfo.email && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t("invite.email")}</span>
                <span className="font-medium">{inviteInfo.email}</span>
              </div>
            )}
          </div>

          {isAuthenticated ? (
            <Button 
              className="w-full" 
              onClick={handleAccept}
              disabled={acceptInviteMutation.isPending}
              data-testid="button-accept-invite"
            >
              {acceptInviteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {t("invite.accept")}
            </Button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                {t("invite.loginRequired")}
              </p>
              <Button 
                className="w-full" 
                onClick={handleLogin}
                data-testid="button-login-to-accept"
              >
                <LogIn className="h-4 w-4 mr-2" />
                {t("invite.loginToAccept")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
