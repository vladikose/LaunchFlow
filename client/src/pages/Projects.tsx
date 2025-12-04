import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  FolderKanban,
  Calendar,
  User,
  AlertTriangle,
  Image as ImageIcon,
  LayoutGrid,
  Trash2,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
  const { toast } = useToast();
  const searchString = useSearch();
  const urlParams = new URLSearchParams(searchString);
  const urlFilter = urlParams.get("filter") as FilterType | null;
  
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>(urlFilter || "all");
  const [columns, setColumns] = useState(() => {
    const saved = localStorage.getItem("projectsColumns");
    return saved ? parseInt(saved, 10) : 4;
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectWithExtras | null>(null);
  
  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "superadmin";
  
  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string) => {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: t("projects.deleteSuccess"),
        description: t("projects.deleteSuccessDescription"),
      });
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    },
    onError: () => {
      toast({
        title: t("common.error"),
        description: t("projects.deleteError"),
        variant: "destructive",
      });
    },
  });
  
  const handleDeleteClick = (e: React.MouseEvent, project: ProjectWithExtras) => {
    e.preventDefault();
    e.stopPropagation();
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };
  
  const confirmDelete = () => {
    if (projectToDelete) {
      deleteProjectMutation.mutate(projectToDelete.id);
    }
  };
  
  useEffect(() => {
    if (urlFilter && ["all", "my", "overdue", "active", "completed"].includes(urlFilter)) {
      setFilter(urlFilter);
    }
  }, [urlFilter]);

  useEffect(() => {
    localStorage.setItem("projectsColumns", columns.toString());
  }, [columns]);

  const getGridClass = () => {
    switch (columns) {
      case 2: return "grid-cols-1 sm:grid-cols-2";
      case 3: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
      case 4: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
      case 5: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
      case 6: return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6";
      default: return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
    }
  };

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
        <div className="flex items-center gap-2 w-full sm:w-40">
          <LayoutGrid className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Slider
            value={[columns]}
            onValueChange={(value) => setColumns(value[0])}
            min={2}
            max={6}
            step={1}
            className="flex-1"
            data-testid="slider-columns"
          />
          <span className="text-sm text-muted-foreground w-4">{columns}</span>
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
        <div className={`grid gap-3 ${getGridClass()}`}>
          {Array.from({ length: columns * 2 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0 flex h-28">
                <Skeleton className="w-24 h-28 rounded-l-xl flex-shrink-0" />
                <div className="flex-1 p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-1.5 w-full" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects && filteredProjects.length > 0 ? (
        <div className={`grid gap-3 ${getGridClass()}`}>
          {filteredProjects.map((project) => {
            const overdue = isOverdue(project);
            const progress = getProgress(project);
            const imageSrc = getImageSrc(project.coverImage);
            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card
                  className={`hover-elevate cursor-pointer transition-all ${
                    overdue ? "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20" : ""
                  }`}
                  data-testid={`card-project-${project.id}`}
                >
                  <CardContent className="p-0 flex h-28">
                    <div className="w-24 h-28 flex-shrink-0 bg-muted flex items-center justify-center overflow-hidden rounded-l-xl">
                      {imageSrc ? (
                        <img
                          src={imageSrc}
                          alt={project.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <h3 className="font-semibold text-sm truncate flex-1">{project.name}</h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {overdue && (
                            <Badge variant="destructive" className="text-xs px-1 py-0">
                              <AlertTriangle className="h-3 w-3" />
                            </Badge>
                          )}
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={(e) => handleDeleteClick(e, project)}
                              data-testid={`button-delete-project-${project.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Progress value={progress} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground">{progress}%</span>
                      </div>
                      <div className="space-y-0.5 text-xs text-muted-foreground">
                        {project.deadline && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>{new Date(project.deadline).toLocaleDateString()}</span>
                          </div>
                        )}
                        {project.responsibleUserName && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {project.responsibleUserName}
                            </span>
                          </div>
                        )}
                      </div>
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
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("projects.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("projects.deleteConfirmDescription", { name: projectToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteProjectMutation.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
