import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  ChevronRight,
  User
} from "lucide-react";
import type { Project } from "@shared/schema";

interface DashboardStats {
  userActiveProjects: number;
  userCompletedProjects: number;
  userOverdueProjects: number;
  userAvgProjectDuration: number;
  companyActiveProjects: number;
  companyCompletedProjects: number;
  companyOverdueProjects: number;
}

export default function Dashboard() {
  const { t } = useTranslation();

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: dashboardStats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const stats: DashboardStats = dashboardStats || {
    userActiveProjects: 0,
    userCompletedProjects: 0,
    userOverdueProjects: 0,
    userAvgProjectDuration: 0,
    companyActiveProjects: 0,
    companyCompletedProjects: 0,
    companyOverdueProjects: 0,
  };
  
  const isLoading = projectsLoading || statsLoading;

  const userStatCards = [
    {
      title: t("dashboard.myActiveProjects"),
      value: stats.userActiveProjects,
      icon: BarChart3,
      color: "text-primary",
      bgColor: "bg-primary/10",
      testId: "card-user-active-projects",
    },
    {
      title: t("dashboard.myCompletedProjects"),
      value: stats.userCompletedProjects,
      icon: CheckCircle2,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-100 dark:bg-green-900/30",
      testId: "card-user-completed-projects",
    },
    {
      title: t("dashboard.myOverdueProjects"),
      value: stats.userOverdueProjects,
      icon: AlertTriangle,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-100 dark:bg-red-900/30",
      testId: "card-user-overdue-projects",
    },
    {
      title: t("dashboard.myAvgProjectDuration"),
      value: `${stats.userAvgProjectDuration}${t("common.days")}`,
      icon: Clock,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-100 dark:bg-amber-900/30",
      testId: "card-user-avg-duration",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-medium">{t("dashboard.myStatistics")}</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {userStatCards.map((stat, index) => (
            <Card key={index} data-testid={stat.testId}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16 mt-2" />
                    ) : (
                      <p className="text-3xl font-semibold mt-2">{stat.value}</p>
                    )}
                  </div>
                  <div className={`h-12 w-12 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t("dashboard.projectsByStatus")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <Link href="/projects?filter=active" data-testid="link-status-active">
                  <div className="flex items-center justify-between p-3 rounded-lg hover-elevate cursor-pointer transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <span className="text-sm font-medium">{t("projects.status.active")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{stats.companyActiveProjects}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
                <Link href="/projects?filter=completed" data-testid="link-status-completed">
                  <div className="flex items-center justify-between p-3 rounded-lg hover-elevate cursor-pointer transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <span className="text-sm font-medium">{t("projects.status.completed")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{stats.companyCompletedProjects}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
                <Link href="/projects?filter=overdue" data-testid="link-status-overdue">
                  <div className="flex items-center justify-between p-3 rounded-lg hover-elevate cursor-pointer transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="text-sm font-medium">{t("projects.status.overdue")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold">{stats.companyOverdueProjects}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t("dashboard.recentActivity")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : projects && projects.length > 0 ? (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    data-testid={`link-activity-${project.id}`}
                  >
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover-elevate cursor-pointer transition-all">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : ""}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {t("common.noData")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
