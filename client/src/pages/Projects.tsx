import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  Image as ImageIcon,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { Project } from "@shared/schema";

type ProjectWithExtras = Project & {
  stages: Array<{ status: string; templateId: string | null }>;
  coverImage: string | null;
  responsibleUserName: string | null;
};

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

  const { data: projects, isLoading } = useQuery<ProjectWithExtras[]>({
    queryKey: ["/api/projects"],
  });

  const getProgress = (project: ProjectWithExtras) => {
    if (!project.stages || project.stages.length === 0) return 0;
    const completed = project.stages.filter(s => s.status === 'completed').length;
    return Math.round((completed / project.stages.length) * 100);
  };

  const getImageSrc = (url: string | null) => {
    if (!url) return null;
    if (url.startsWith('/objects/')) return url;
    const match = url.match(/\/([^/]+)$/);
    if (match) return `/objects/${match[1]}`;
    return url;
  };

  const isOverdue = (project: ProjectWithExtras) => {
    if (!project.deadline) return false;
    return new Date(project.deadline) < new Date();
  };

  const isCompleted = (project: ProjectWithExtras) => {
    if (!project.stages || project.stages.length === 0) return false;
    return project.stages.every((stage) => stage.status === "completed");
  };

  const isActive = (project: ProjectWithExtras) => {
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
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i}>
              <CardContent className="p-3">
                <Skeleton className="h-32 w-full rounded-lg mb-3" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-1.5 w-full mb-3" />
                <div className="flex justify-end">
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects && filteredProjects.length > 0 ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProjects.map((project) => {
            const overdue = isOverdue(project);
            const progress = getProgress(project);
            const imageSrc = getImageSrc(project.coverImage);
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card
                  className={`hover-elevate cursor-pointer transition-all h-full ${
                    overdue ? "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20" : ""
                  }`}
                  data-testid={`card-project-${project.id}`}
                >
                  <CardContent className="p-3 flex flex-col h-full">
                    <div className="h-32 w-full rounded-lg bg-muted flex items-center justify-center overflow-hidden mb-3">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={project.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-sm truncate flex-1">{project.name}</h3>
                      {overdue && (
                        <Badge variant="destructive" className="flex-shrink-0 text-xs px-1.5 py-0.5">
                          <AlertTriangle className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Progress value={progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground">{progress}%</span>
                    </div>
                    <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground mt-auto">
                      {project.responsibleUserName && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span className="truncate max-w-[80px]">
                            {project.responsibleUserName}
                          </span>
                        </div>
                      )}
                      {project.deadline && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
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
