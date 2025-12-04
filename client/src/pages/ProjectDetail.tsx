import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { StageCard } from "@/components/StageCard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Edit,
  LayoutGrid,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { Project, Product, User as UserType, StageWithRelations } from "@shared/schema";

interface ProjectWithDetails extends Project {
  products?: Product[];
  stages?: StageWithRelations[];
  responsibleUser?: UserType;
}

export default function ProjectDetail() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id;
  const { toast } = useToast();
  const [allExpanded, setAllExpanded] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());

  const { data: project, isLoading } = useQuery<ProjectWithDetails>({
    queryKey: ["/api/projects", projectId],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const generateStagesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/projects/${projectId}/generate-stages`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: t("stages.stagesGenerated") });
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const handleExpandAll = () => {
    if (project?.stages) {
      const allIds = new Set(project.stages.map(s => s.id));
      setExpandedStages(allIds);
      setAllExpanded(true);
    }
  };

  const handleCollapseAll = () => {
    setExpandedStages(new Set());
    setAllExpanded(false);
  };

  const handleToggleStage = (stageId: string) => {
    setExpandedStages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stageId)) {
        newSet.delete(stageId);
      } else {
        newSet.add(stageId);
      }
      return newSet;
    });
  };

  const calculateProgress = () => {
    if (!project?.stages || project.stages.length === 0) return 0;
    const completed = project.stages.filter(s => s.status === "completed").length;
    return Math.round((completed / project.stages.length) * 100);
  };

  const calculateDaysRemaining = () => {
    if (!project?.deadline) return null;
    const deadline = new Date(project.deadline);
    const today = new Date();
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getEarliestStartDate = () => {
    if (!project?.stages || project.stages.length === 0) return null;
    const dates = project.stages
      .filter(s => s.startDate)
      .map(s => new Date(s.startDate!));
    if (dates.length === 0) {
      return project.createdAt ? new Date(project.createdAt) : null;
    }
    return new Date(Math.min(...dates.map(d => d.getTime())));
  };

  const formatDateShort = (date: Date | string | null) => {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const progress = calculateProgress();
  const daysRemaining = calculateDaysRemaining();
  const startDate = getEarliestStartDate();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="flex gap-6">
          <Skeleton className="h-32 w-32 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-5 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-32 w-64" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <Card className="py-16">
          <CardContent className="text-center">
            <h3 className="text-lg font-medium mb-2">Project not found</h3>
            <p className="text-muted-foreground mb-6">
              The project you're looking for doesn't exist or has been deleted.
            </p>
            <Button asChild>
              <Link href="/projects">Back to Projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button asChild variant="outline" size="sm" data-testid="button-edit-project">
          <Link href={`/projects/${projectId}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            {t("common.edit")}
          </Link>
        </Button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex gap-6">
          <div className="h-32 w-32 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
            {project.coverImageId ? (
              <img
                src={`/objects/${project.coverImageId}`}
                alt={project.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-16 w-16 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                <Layers className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-3">
            <h1 className="text-2xl font-semibold" data-testid="text-project-name">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{t("projects.progress") || "Progress"}</span>
              <div className="flex-1 max-w-xs">
                <Progress value={progress} className="h-2" />
              </div>
              <span className="text-sm font-medium">{progress}%</span>
            </div>
          </div>
        </div>

        <Card className="lg:w-72 flex-shrink-0">
          <CardContent className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">{t("projects.timelineSummary") || "Timeline Summary"}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("projects.startDate") || "Start Date"}</span>
                <span className="font-mono">{formatDateShort(startDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("projects.estLaunch") || "Est. Launch"}</span>
                <span className="font-mono">{formatDateShort(project.deadline)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("projects.daysRemaining") || "Days Remaining"}</span>
                <span className={`font-semibold ${daysRemaining !== null && daysRemaining < 0 ? "text-destructive" : daysRemaining !== null && daysRemaining <= 7 ? "text-orange-500" : "text-primary"}`}>
                  {daysRemaining !== null ? (daysRemaining < 0 ? `${Math.abs(daysRemaining)} overdue` : daysRemaining) : "-"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            <h2 className="text-xl font-semibold">{t("projects.developmentStages") || "Development Stages"}</h2>
          </div>
          {project.stages && project.stages.length > 0 && (
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCollapseAll}
                className="text-muted-foreground"
                data-testid="button-collapse-all"
              >
                <ChevronUp className="h-4 w-4 mr-1" />
                {t("projects.collapseAll") || "Collapse All"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExpandAll}
                className="text-muted-foreground"
                data-testid="button-expand-all"
              >
                <ChevronDown className="h-4 w-4 mr-1" />
                {t("projects.expandAll") || "Expand All"}
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {project.stages && project.stages.length > 0 ? (
            project.stages
              .sort((a, b) => a.position - b.position)
              .map((stage, index) => (
                <StageCard
                  key={stage.id}
                  stage={stage}
                  projectId={projectId!}
                  users={users || []}
                  position={index + 1}
                  isExpanded={expandedStages.has(stage.id)}
                  onToggle={() => handleToggleStage(stage.id)}
                />
              ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">{t("stages.noStages")}</h3>
                <p className="text-muted-foreground mb-4">
                  {t("stages.noStagesDescription")}
                </p>
                <Button
                  onClick={() => generateStagesMutation.mutate()}
                  disabled={generateStagesMutation.isPending}
                  data-testid="button-generate-stages"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  {generateStagesMutation.isPending ? t("common.loading") : t("stages.generateStages")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
