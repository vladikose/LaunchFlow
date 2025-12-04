import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Building2, 
  Save, 
  Loader2, 
  UserPlus, 
  Copy, 
  Trash2, 
  Clock, 
  Users,
  Link as LinkIcon
} from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Company, CompanyInvite, User } from "@shared/schema";

export default function AdminCompany() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"user" | "admin">("user");
  const [inviteMaxUses, setInviteMaxUses] = useState<number>(1);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);

  const { data: company, isLoading: companyLoading } = useQuery<Company>({
    queryKey: ["/api/company"],
  });

  const { data: invites, isLoading: invitesLoading } = useQuery<CompanyInvite[]>({
    queryKey: ["/api/company/invites"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
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

  const createInviteMutation = useMutation({
    mutationFn: async (data: { email?: string; role: string; maxUses: number }) => {
      const response = await apiRequest("POST", "/api/company/invites", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/invites"] });
      const inviteLink = `${window.location.origin}/invite/${data.token}`;
      setGeneratedInviteLink(inviteLink);
      toast({ title: t("admin.company.invites.created") });
    },
    onError: () => {
      toast({ title: t("admin.company.invites.createFailed"), variant: "destructive" });
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/company/invites/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company/invites"] });
      toast({ title: t("admin.company.invites.deleted") });
    },
    onError: () => {
      toast({ title: t("admin.company.invites.deleteFailed"), variant: "destructive" });
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/users/${userId}/company`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: t("admin.company.members.removed") });
    },
    onError: () => {
      toast({ title: t("admin.company.members.removeFailed"), variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (companyName.trim()) {
      updateCompanyMutation.mutate({ name: companyName.trim() });
    }
  };

  const handleCreateInvite = () => {
    createInviteMutation.mutate({ 
      email: inviteEmail.trim() || undefined, 
      role: inviteRole,
      maxUses: inviteMaxUses
    });
  };

  const handleCopyLink = async () => {
    if (generatedInviteLink) {
      await navigator.clipboard.writeText(generatedInviteLink);
      toast({ title: t("admin.company.invites.linkCopied") });
    }
  };

  const handleCloseInviteDialog = () => {
    setIsInviteDialogOpen(false);
    setInviteEmail("");
    setInviteRole("user");
    setInviteMaxUses(1);
    setGeneratedInviteLink(null);
  };

  const pendingInvites = invites?.filter(inv => {
    const maxUses = inv.maxUses || 1;
    const usedCount = inv.usedCount || 0;
    const isExpired = new Date(inv.expiresAt) <= new Date();
    const isExhausted = maxUses > 0 && usedCount >= maxUses;
    return !isExpired && !isExhausted;
  }) || [];

  const getUserInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const getUserDisplayName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.email || "Unknown User";
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
          {companyLoading ? (
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

      <Card>
        <CardHeader>
          <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                {t("admin.company.invites.title")}
              </CardTitle>
              <CardDescription>
                {t("admin.company.invites.description")}
              </CardDescription>
            </div>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-invite">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  {t("admin.company.invites.create")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("admin.company.invites.create")}</DialogTitle>
                  <DialogDescription>
                    {t("admin.company.invites.description")}
                  </DialogDescription>
                </DialogHeader>
                {generatedInviteLink ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                      <Input 
                        value={generatedInviteLink} 
                        readOnly 
                        className="flex-1"
                        data-testid="input-invite-link"
                      />
                      <Button 
                        size="icon" 
                        variant="outline" 
                        onClick={handleCopyLink}
                        data-testid="button-copy-link"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCloseInviteDialog} data-testid="button-close-invite-dialog">
                        {t("common.close")}
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="inviteEmail">{t("admin.company.invites.email")}</Label>
                        <Input
                          id="inviteEmail"
                          type="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder={t("admin.company.invites.emailPlaceholder")}
                          data-testid="input-invite-email"
                        />
                        <p className="text-sm text-muted-foreground">
                          {t("admin.company.invites.emailHint")}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inviteRole">{t("admin.company.invites.role")}</Label>
                        <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as "user" | "admin")}>
                          <SelectTrigger data-testid="select-invite-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">{t("admin.company.invites.roleUser")}</SelectItem>
                            <SelectItem value="admin">{t("admin.company.invites.roleAdmin")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inviteMaxUses">{t("admin.company.invites.maxUses")}</Label>
                        <Select 
                          value={inviteMaxUses.toString()} 
                          onValueChange={(v) => setInviteMaxUses(parseInt(v))}
                        >
                          <SelectTrigger data-testid="select-invite-max-uses">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">{t("admin.company.invites.singleUse")}</SelectItem>
                            <SelectItem value="5">5 {t("admin.company.invites.uses")}</SelectItem>
                            <SelectItem value="10">10 {t("admin.company.invites.uses")}</SelectItem>
                            <SelectItem value="25">25 {t("admin.company.invites.uses")}</SelectItem>
                            <SelectItem value="0">{t("admin.company.invites.unlimited")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.company.invites.maxUsesHint")}
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={handleCloseInviteDialog}>
                        {t("common.cancel")}
                      </Button>
                      <Button 
                        onClick={handleCreateInvite} 
                        disabled={createInviteMutation.isPending}
                        data-testid="button-submit-invite"
                      >
                        {createInviteMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4 mr-2" />
                        )}
                        {t("admin.company.invites.create")}
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t("admin.company.invites.pending")}</h4>
            {invitesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : pendingInvites.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t("admin.company.invites.noPending")}</p>
            ) : (
              <div className="space-y-2">
                {pendingInvites.map((invite) => {
                  const maxUses = invite.maxUses || 1;
                  const usedCount = invite.usedCount || 0;
                  const isUnlimited = maxUses === 0;
                  return (
                    <div 
                      key={invite.id} 
                      className="flex items-center justify-between p-3 border rounded-md"
                      data-testid={`invite-item-${invite.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {invite.email || t("admin.company.invites.generalLink")}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {invite.role === "admin" ? t("admin.company.invites.roleAdmin") : t("admin.company.invites.roleUser")}
                            </Badge>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {t("admin.company.invites.expires")}: {format(new Date(invite.expiresAt), "MMM d, yyyy")}
                            </span>
                            <Badge variant="secondary" className="text-xs">
                              {isUnlimited 
                                ? `${usedCount} ${t("admin.company.invites.usedUnlimited")}`
                                : `${usedCount}/${maxUses} ${t("admin.company.invites.used")}`
                              }
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={async () => {
                            const link = `${window.location.origin}/invite/${invite.token}`;
                            await navigator.clipboard.writeText(link);
                            toast({ title: t("admin.company.invites.linkCopied") });
                          }}
                          data-testid={`button-copy-invite-${invite.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteInviteMutation.mutate(invite.id)}
                          disabled={deleteInviteMutation.isPending}
                          data-testid={`button-delete-invite-${invite.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("admin.company.members.title")}
          </CardTitle>
          <CardDescription>
            {t("admin.company.members.description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersLoading || companyLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : users && company && users.filter(u => u.companyId === company.id).length > 0 ? (
            <div className="space-y-2">
              {users.filter(u => u.companyId === company.id).map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center justify-between p-3 border rounded-md"
                  data-testid={`member-item-${user.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{getUserDisplayName(user)}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{user.email}</span>
                        <Badge variant="outline" className="text-xs">
                          {user.role === "admin" 
                            ? t("admin.company.invites.roleAdmin") 
                            : user.role === "guest" 
                              ? "Guest" 
                              : t("admin.company.invites.roleUser")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        data-testid={`button-remove-user-${user.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("admin.company.members.remove")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          <span className="block">{t("admin.company.members.removeConfirm")}</span>
                          <span className="block mt-2 text-destructive">{t("admin.company.members.removeWarning")}</span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => removeUserMutation.mutate(user.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {removeUserMutation.isPending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : null}
                          {t("admin.company.members.remove")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4">{t("common.noData")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
