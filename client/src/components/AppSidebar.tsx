import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Settings,
  Users,
  Layers,
  Building2,
  Rocket,
  LogOut,
  ChevronUp,
  FileArchive,
} from "lucide-react";
import { getObjectUrl } from "@/lib/objectStorage";

export function AppSidebar() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [location] = useLocation();

  const mainNavItems = [
    {
      title: t("nav.dashboard"),
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: t("nav.projects"),
      url: "/projects",
      icon: FolderKanban,
    },
    {
      title: t("nav.myTasks"),
      url: "/tasks",
      icon: CheckSquare,
    },
    {
      title: t("nav.companyCabinet"),
      url: "/company-cabinet",
      icon: FileArchive,
    },
  ];

  const adminNavItems = [
    {
      title: t("nav.company"),
      url: "/admin/company",
      icon: Building2,
    },
    {
      title: t("nav.users"),
      url: "/admin/users",
      icon: Users,
    },
    {
      title: t("nav.stages"),
      url: "/admin/stages",
      icon: Layers,
    },
  ];

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const userInitials = user
    ? `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || ""}`.toUpperCase() ||
      user.email?.charAt(0).toUpperCase() ||
      "U"
    : "U";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2" data-testid="link-logo">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Rocket className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold">LaunchFlow</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url || location.startsWith(item.url + "/")}
                  >
                    <Link href={item.url} data-testid={`nav-${item.url.replace("/", "")}`}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>{t("nav.admin")}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {adminNavItems.map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton
                        asChild
                        isActive={location === item.url || location.startsWith(item.url + "/")}
                      >
                        <Link href={item.url} data-testid={`nav-admin-${item.url.split("/").pop()}`}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 px-2"
              data-testid="button-user-menu"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={getObjectUrl(user?.profileImageUrl)} className="object-cover" />
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left truncate">
                <p className="text-sm font-medium truncate">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <Link href="/settings" data-testid="menu-item-settings">
                <Settings className="mr-2 h-4 w-4" />
                {t("nav.settings")}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/api/logout" data-testid="menu-item-logout">
                <LogOut className="mr-2 h-4 w-4" />
                {t("auth.logout")}
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
