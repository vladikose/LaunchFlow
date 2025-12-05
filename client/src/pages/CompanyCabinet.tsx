import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Building2, 
  Download, 
  FileArchive, 
  CheckCircle2, 
  FolderOpen,
  FileText,
  Image,
  Package
} from "lucide-react";
import type { Project } from "@shared/schema";

interface ProjectWithStats extends Project {
  stages?: Array<{ status: string }>;
  coverImage?: string | null;
  responsibleUserName?: string | null;
}

export default function CompanyCabinet() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const { data: projects, isLoading } = useQuery<ProjectWithStats[]>({
    queryKey: ["/api/projects"],
  });

  const sortedProjects = useMemo(() => {
    if (!projects) return [];
    return [...projects].sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [projects]);

  const toggleProject = (projectId: string) => {
    setSelectedProjectIds(prev => 
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const selectAll = () => {
    if (sortedProjects.length === selectedProjectIds.length) {
      setSelectedProjectIds([]);
    } else {
      setSelectedProjectIds(sortedProjects.map(p => p.id));
    }
  };

  const getProjectProgress = (project: ProjectWithStats) => {
    if (!project.stages || project.stages.length === 0) return 0;
    const completed = project.stages.filter(s => s.status === 'completed').length;
    return Math.round((completed / project.stages.length) * 100);
  };

  const handleExport = async (exportAll: boolean) => {
    const projectIds = exportAll ? sortedProjects.map(p => p.id) : selectedProjectIds;
    
    if (projectIds.length === 0) {
      toast({
        title: t("cabinet.selectProjectsFirst"),
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const response = await fetch("/api/company/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectIds }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `company-export-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t("cabinet.exportSuccess"),
        description: t("cabinet.exportSuccessDescription", { count: projectIds.length }),
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: t("cabinet.exportError"),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const exportDataMutation = useMutation({
    mutationFn: async (projectIds: string[]) => {
      const response = await fetch("/api/company/export-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectIds }),
      });

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      return blob;
    },
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: t("cabinet.dataExportSuccess"),
      });
    },
    onError: () => {
      toast({
        title: t("cabinet.exportError"),
        variant: "destructive",
      });
    },
  });

  const handleDataExport = (exportAll: boolean) => {
    const projectIds = exportAll ? sortedProjects.map(p => p.id) : selectedProjectIds;
    
    if (projectIds.length === 0) {
      toast({
        title: t("cabinet.selectProjectsFirst"),
        variant: "destructive",
      });
      return;
    }

    exportDataMutation.mutate(projectIds);
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold">{t("cabinet.title")}</h1>
          <p className="text-muted-foreground">{t("cabinet.description")}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="hover-elevate">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileArchive className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t("cabinet.exportFiles")}</CardTitle>
            </div>
            <CardDescription>{t("cabinet.exportFilesDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleExport(true)}
                disabled={isExporting || sortedProjects.length === 0}
                data-testid="button-export-all-files"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("cabinet.exportAllFiles")}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport(false)}
                disabled={isExporting || selectedProjectIds.length === 0}
                data-testid="button-export-selected-files"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("cabinet.exportSelectedFiles")} ({selectedProjectIds.length})
              </Button>
            </div>
            {isExporting && (
              <div className="space-y-2">
                <Progress value={exportProgress} />
                <p className="text-sm text-muted-foreground">{t("cabinet.exporting")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover-elevate">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">{t("cabinet.exportData")}</CardTitle>
            </div>
            <CardDescription>{t("cabinet.exportDataDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => handleDataExport(true)}
                disabled={exportDataMutation.isPending || sortedProjects.length === 0}
                data-testid="button-export-all-data"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("cabinet.exportAllData")}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDataExport(false)}
                disabled={exportDataMutation.isPending || selectedProjectIds.length === 0}
                data-testid="button-export-selected-data"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("cabinet.exportSelectedData")} ({selectedProjectIds.length})
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              <CardTitle>{t("cabinet.selectProjects")}</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              data-testid="button-select-all"
            >
              {sortedProjects.length === selectedProjectIds.length
                ? t("cabinet.deselectAll")
                : t("cabinet.selectAll")}
            </Button>
          </div>
          <CardDescription>
            {t("cabinet.selectedCount", { count: selectedProjectIds.length, total: sortedProjects.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : sortedProjects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>{t("cabinet.noProjects")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedProjects.map((project) => {
                const isSelected = selectedProjectIds.includes(project.id);
                const progress = getProjectProgress(project);

                return (
                  <div
                    key={project.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer ${
                      isSelected 
                        ? "bg-primary/5 border-primary/30" 
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleProject(project.id)}
                    data-testid={`project-row-${project.id}`}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleProject(project.id)}
                      data-testid={`checkbox-project-${project.id}`}
                    />
                    
                    {project.coverImage ? (
                      <img 
                        src={project.coverImage.startsWith("http") ? project.coverImage.replace(/^https?:\/\/storage\.googleapis\.com\/[^/]+/, "/objects") : project.coverImage}
                        alt={project.name}
                        className="w-12 h-12 rounded object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <Image className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate">{project.name}</h3>
                        {progress === 100 && (
                          <Badge variant="secondary" className="flex-shrink-0">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {t("projects.status.completed")}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        {project.responsibleUserName && (
                          <span className="truncate">{project.responsibleUserName}</span>
                        )}
                        {project.deadline && (
                          <span>{new Date(project.deadline).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="w-24 hidden sm:block">
                        <div className="flex justify-between text-xs mb-1">
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
