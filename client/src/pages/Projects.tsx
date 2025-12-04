import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  FolderKanban,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Project, User as UserType } from "@shared/schema";

type FilterType = "all" | "my" | "overdue" | "active" | "completed";

export default function Projects() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlFilter = urlParams.get("filter") as FilterType | null;
  
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>(urlFilter || "all");
  
  useEffect(() => {
    if (urlFilter && ["all", "my", "overdue", "active", "completed"].includes(urlFilter)) {
      setFilter(urlFilter);
    }
  }, [urlFilter]);

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const getUserName = (userId: string | null | undefined) => {
    if (!userId || !users) return null;
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    return user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email;
  };

  const isOverdue = (project: Project) => {
    if (!project.deadline) return false;
    return new Date(project.deadline) < new Date();
  };

  const isCompleted = (project: Project & { stages?: Array<{ status: string }> }) => {
    if (!project.stages || project.stages.length === 0) return false;
    return project.stages.every((stage) => stage.status === "completed");
  };

  const isActive = (project: Project & { stages?: Array<{ status: string }> }) => {
    if (!project.stages || project.stages.length === 0) return true;
    return project.stages.some((stage) => stage.status !== "completed");
  };

  const filteredProjects = projects?.filter((project) => {
    const matchesSearch = project.name
      .toLowerCase()
      .includes(search.toLowerCase());
    
    if (filter === "my") {
      return matchesSearch && project.responsibleUserId === currentUser?.id;
    }
    
    if (filter === "overdue") {
      return matchesSearch && isOverdue(project);
    }
    
    if (filter === "active") {
      return matchesSearch && isActive(project);
    }
    
    if (filter === "completed") {
      return matchesSearch && isCompleted(project);
    }
    
    return matchesSearch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("projects.title")}</h1>
          <p className="text-muted-foreground mt-1">
            Manage your product launch projects
          </p>
        </div>
        <Button asChild data-testid="button-create-project">
          <Link href="/projects/new">
            <Plus className="h-4 w-4 mr-2" />
            {t("projects.create")}
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("common.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            data-testid="input-search-projects"
          />
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("projects.filters.all")}</SelectItem>
            <SelectItem value="active">{t("projects.filters.active")}</SelectItem>
            <SelectItem value="completed">{t("projects.filters.completed")}</SelectItem>
            <SelectItem value="overdue">{t("projects.filters.overdue")}</SelectItem>
            <SelectItem value="my">{t("projects.filters.myProjects")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects && filteredProjects.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => {
            const overdue = isOverdue(project);
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card
                  className={`hover-elevate cursor-pointer transition-all ${
                    overdue ? "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20" : ""
                  }`}
                  data-testid={`card-project-${project.id}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FolderKanban className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="font-semibold truncate">{project.name}</h3>
                      </div>
                      {overdue && (
                        <Badge variant="destructive" className="flex-shrink-0">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {t("projects.status.overdue")}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {project.responsibleUserId && (
                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          <span className="truncate max-w-[120px]">
                            {getUserName(project.responsibleUserId)}
                          </span>
                        </div>
                      )}
                      {project.deadline && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(project.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="py-16">
          <CardContent className="text-center">
            <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("projects.noProjects")}</h3>
            <p className="text-muted-foreground mb-6">{t("projects.createFirst")}</p>
            <Button asChild data-testid="button-create-first-project">
              <Link href="/projects/new">
                <Plus className="h-4 w-4 mr-2" />
                {t("projects.create")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
