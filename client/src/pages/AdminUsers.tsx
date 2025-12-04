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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Users,
  MoreVertical,
  UserPlus,
  Shield,
  UserX,
  Key,
  Clock,
  FolderCheck,
} from "lucide-react";
import type { User } from "@shared/schema";

interface UserWithStats extends User {
  projectCount: number;
  completedProjectCount: number;
  avgProjectDuration: number | null;
}

export default function AdminUsers() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery<UserWithStats[]>({
    queryKey: ["/api/users/stats"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/users/${userId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/stats"] });
      toast({ title: "User role updated" });
    },
    onError: () => {
      toast({ title: "Failed to update role", variant: "destructive" });
    },
  });

  const getRoleBadgeVariant = (role: string | null) => {
    switch (role) {
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
      case "admin":
        return "Administrator";
      case "user":
        return "User";
      case "guest":
        return "Guest";
      default:
        return "User";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("admin.users.title")}</h1>
          <p className="text-muted-foreground mt-1">
            Manage users and their roles in your company
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
                  <TableHead>User</TableHead>
                  <TableHead>{t("admin.users.email")}</TableHead>
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
                            src={user.profileImageUrl || undefined}
                            className="object-cover"
                          />
                          <AvatarFallback className="text-xs">
                            {user.firstName && user.lastName
                              ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
                              : user.email?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {user.firstName && user.lastName
                              ? `${user.firstName} ${user.lastName}`
                              : "No name"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role)}>
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
                          {user.role !== "admin" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateRoleMutation.mutate({
                                  userId: user.id,
                                  role: "admin",
                                })
                              }
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Make Admin
                            </DropdownMenuItem>
                          )}
                          {user.role === "admin" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateRoleMutation.mutate({
                                  userId: user.id,
                                  role: "user",
                                })
                              }
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Make User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Key className="h-4 w-4 mr-2" />
                            {t("admin.users.resetPassword")}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 dark:text-red-400">
                            <UserX className="h-4 w-4 mr-2" />
                            {t("admin.users.remove")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No users found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
