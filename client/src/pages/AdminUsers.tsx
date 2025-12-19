import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getObjectUrl } from "@/lib/objectStorage";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  MoreVertical,
  UserPlus,
  Shield,
  UserX,
  Key,
  Clock,
  FolderCheck,
  Trash2,
  Building2,
} from "lucide-react";
import type { User } from "@shared/schema";
import { useState } from "react";

interface UserWithStats extends User {
  projectCount: number;
  completedProjectCount: number;
  avgProjectDuration: number | null;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithStats | null>(null);
  const [deleteType, setDeleteType] = useState<"remove" | "delete">("remove");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [userToChangePassword, setUserToChangePassword] = useState<UserWithStats | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Get current user to check if superadmin
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const isSuperadmin = currentUser?.role === "superadmin";

  const { data: users, isLoading } = useQuery<UserWithStats[]>({
    queryKey: ["/api/users/stats"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/users/${userId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      toast({ title: t("admin.users.roleUpdated") });
    },
    onError: () => {
      toast({ title: t("admin.users.roleUpdateFailed"), variant: "destructive" });
    },
  });

  // Remove user from company (soft delete)
  const removeFromCompanyMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/users/${userId}/company`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      toast({ title: t("admin.users.userRemoved") });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: () => {
      toast({ title: t("admin.users.userRemoveFailed"), variant: "destructive" });
    },
  });

  // Full delete user (superadmin only)
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      toast({ title: t("admin.users.userDeleted") });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    },
    onError: () => {
      toast({ title: t("admin.users.userDeleteFailed"), variant: "destructive" });
    },
  });

  // Change user password (superadmin only)
  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      return apiRequest("POST", `/api/users/${userId}/reset-password`, { newPassword });
    },
    onSuccess: () => {
      toast({ title: t("admin.users.passwordChanged") });
      setPasswordDialogOpen(false);
      setUserToChangePassword(null);
      setNewPassword("");
    },
    onError: () => {
      toast({ title: t("admin.users.passwordChangeFailed"), variant: "destructive" });
    },
  });

  const handleChangePasswordClick = (user: UserWithStats) => {
    setUserToChangePassword(user);
    setNewPassword("");
    setPasswordDialogOpen(true);
  };

  const handleConfirmChangePassword = () => {
    if (!userToChangePassword || newPassword.length < 6) return;
    changePasswordMutation.mutate({ userId: userToChangePassword.id, newPassword });
  };

  const handleRemoveClick = (user: UserWithStats) => {
    setUserToDelete(user);
    setDeleteType("remove");
    setDeleteDialogOpen(true);
  };

  const handleDeleteClick = (user: UserWithStats) => {
    setUserToDelete(user);
    setDeleteType("delete");
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    if (deleteType === "delete" && isSuperadmin) {
      deleteUserMutation.mutate(userToDelete.id);
    } else {
      removeFromCompanyMutation.mutate(userToDelete.id);
    }
  };

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
      case "superadmin":
        return "default";
      case "admin":
        return "default";
      case "user":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role: string | null) => {
    switch (role) {
      case "superadmin":
        return t("admin.users.roles.superadmin");
      case "admin":
        return t("admin.users.roles.admin");
      case "user":
        return t("admin.users.roles.user");
      case "guest":
        return t("admin.users.roles.guest");
      default:
        return t("admin.users.roles.user");
    }
  };

  // Check if user can be managed (can't manage yourself or superadmins if not superadmin)
  const canManageUser = (user: UserWithStats) => {
    if (user.id === currentUser?.id) return false;
    if (user.role === "superadmin" && !isSuperadmin) return false;
    return true;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("admin.users.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {isSuperadmin 
              ? t("admin.users.descriptionSuperadmin")
              : t("admin.users.description")
            }
          </p>
        </div>
        <Button data-testid="button-invite-user">
          <UserPlus className="h-4 w-4 mr-2" />
          {t("admin.users.invite")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : users && users.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin.users.user")}</TableHead>
                  <TableHead>{t("admin.users.email")}</TableHead>
                  {isSuperadmin && (
                    <TableHead>{t("admin.users.company")}</TableHead>
                  )}
                  <TableHead>{t("admin.users.role")}</TableHead>
                  <TableHead className="text-center">{t("admin.users.projects")}</TableHead>
                  <TableHead className="text-center">{t("admin.users.avgProjectTime")}</TableHead>
                  <TableHead className="text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={getObjectUrl(user.profileImageUrl)}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-xs">
                            {user.firstName && user.lastName
                              ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                              : user.email?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium" data-testid={`text-user-name-${user.id}`}>
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : t("admin.users.noName")}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground" data-testid={`text-user-email-${user.id}`}>
                      {user.email || "-"}
                    </TableCell>
                    {isSuperadmin && (
                      <TableCell>
                        {user.companyId ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm truncate max-w-32" title={user.companyId}>
                              {user.companyId.substring(0, 8)}...
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)} data-testid={`badge-role-${user.id}`}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FolderCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{user.completedProjectCount}</span>
                        <span className="text-muted-foreground">/ {user.projectCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {user.avgProjectDuration !== null ? (
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">{user.avgProjectDuration}</span>
                          <span className="text-muted-foreground">{t("common.days")}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {canManageUser(user) ? (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              data-testid={`button-user-actions-${user.id}`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {user.role !== "admin" && user.role !== "superadmin" && (
                              <DropdownMenuItem
                                data-testid={`button-make-admin-${user.id}`}
                                onClick={() =>
                                  updateRoleMutation.mutate({
                                    userId: user.id,
                                    role: "admin",
                                  })
                                }
                              >
                                <Shield className="h-4 w-4 mr-2" />
                                {t("admin.users.makeAdmin")}
                              </DropdownMenuItem>
                            )}
                            {user.role === "admin" && (
                              <DropdownMenuItem
                                data-testid={`button-make-user-${user.id}`}
                                onClick={() =>
                                  updateRoleMutation.mutate({
                                    userId: user.id,
                                    role: "user",
                                  })
                                }
                              >
                                <Users className="h-4 w-4 mr-2" />
                                {t("admin.users.makeUser")}
                              </DropdownMenuItem>
                            )}
                            {isSuperadmin && (
                              <DropdownMenuItem 
                                data-testid={`button-change-password-${user.id}`}
                                onClick={() => handleChangePasswordClick(user)}
                              >
                                <Key className="h-4 w-4 mr-2" />
                                {t("admin.users.changePassword")}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {user.companyId && (
                              <DropdownMenuItem 
                                data-testid={`button-remove-user-${user.id}`}
                                className="text-orange-600 dark:text-orange-400"
                                onClick={() => handleRemoveClick(user)}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                {t("admin.users.removeFromCompany")}
                              </DropdownMenuItem>
                            )}
                            {isSuperadmin && (
                              <DropdownMenuItem 
                                data-testid={`button-delete-user-${user.id}`}
                                className="text-red-600 dark:text-red-400"
                                onClick={() => handleDeleteClick(user)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                {t("admin.users.deletePermanently")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      ) : (
                        <span className="text-muted-foreground text-sm">
                          {user.id === currentUser?.id ? t("admin.users.you") : ""}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">{t("admin.users.noUsers")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteType === "delete" 
                ? t("admin.users.deleteConfirmTitle")
                : t("admin.users.removeConfirmTitle")
              }
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "delete" 
                ? t("admin.users.deleteConfirmDescription", { 
                    name: userToDelete?.firstName 
                      ? `${userToDelete.firstName} ${userToDelete.lastName || ""}`.trim()
                      : userToDelete?.email 
                  })
                : t("admin.users.removeConfirmDescription", { 
                    name: userToDelete?.firstName 
                      ? `${userToDelete.firstName} ${userToDelete.lastName || ""}`.trim()
                      : userToDelete?.email 
                  })
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={handleConfirmDelete}
              className={deleteType === "delete" ? "bg-red-600 hover:bg-red-700" : "bg-orange-600 hover:bg-orange-700"}
            >
              {deleteType === "delete" 
                ? t("admin.users.deleteButton")
                : t("admin.users.removeButton")
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("admin.users.changePasswordTitle")}</DialogTitle>
            <DialogDescription>
              {t("admin.users.changePasswordDescription", {
                name: userToChangePassword?.firstName
                  ? `${userToChangePassword.firstName} ${userToChangePassword.lastName || ""}`.trim()
                  : userToChangePassword?.email,
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">{t("admin.users.newPassword")}</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("admin.users.newPasswordPlaceholder")}
                data-testid="input-new-password"
              />
              {newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-sm text-destructive">{t("admin.users.passwordTooShort")}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPasswordDialogOpen(false)}
              data-testid="button-cancel-password"
            >
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleConfirmChangePassword}
              disabled={newPassword.length < 6 || changePasswordMutation.isPending}
              data-testid="button-confirm-password"
            >
              {changePasswordMutation.isPending ? t("common.saving") : t("admin.users.changePasswordButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
