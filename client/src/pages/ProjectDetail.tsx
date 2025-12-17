import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StageCard } from "@/components/StageCard";
import { ImageCropper } from "@/components/ImageCropper";
import { FireworksCelebration } from "@/components/FireworksCelebration";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getObjectUrl } from "@/lib/objectStorage";
import {
  ArrowLeft,
  Edit,
  LayoutGrid,
  Layers,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Check,
  Crop,
} from "lucide-react";
import type { Project, Product, User as UserType, StageWithRelations, StageFile, Factory, ProductType } from "@shared/schema";

interface ProjectWithDetails extends Project {
  products?: Product[];
  stages?: StageWithRelations[];
  responsibleUser?: UserType;
  factory?: Factory | null;
  productType?: ProductType | null;
}

export default function ProjectDetail() {
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/projects/:id");
  const projectId = params?.id;
  const { toast } = useToast();
  const [allExpanded, setAllExpanded] = useState(false);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [selectedImageForCrop, setSelectedImageForCrop] = useState<string | null>(null);
  const [showFireworks, setShowFireworks] = useState(false);

  const { data: project, isLoading } = useQuery<ProjectWithDetails>({
    queryKey: ["/api/projects", projectId],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const updateCoverImageMutation = useMutation({
    mutationFn: async (coverImageId: string | null) => {
      return apiRequest("PATCH", `/api/projects/${projectId}`, { coverImageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setImagePickerOpen(false);
      toast({ title: t("projects.coverImageUpdated") || "Cover image updated" });
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const uploadCroppedImageMutation = useMutation({
    mutationFn: async (blob: Blob) => {
      const urlResponse = await fetch("/api/objects/upload-url", {
        credentials: "include",
      });
      
      if (!urlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }
      
      const { url } = await urlResponse.json();
      
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: blob,
        headers: {
          "Content-Type": "image/jpeg",
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Failed to upload cropped image");
      }
      
      const baseUrl = url.split("?")[0];
      const uploadsIndex = baseUrl.indexOf("/uploads/");
      if (uploadsIndex === -1) {
        throw new Error("Invalid upload URL format");
      }
      const objectId = `/objects${baseUrl.substring(uploadsIndex)}`;
      return objectId;
    },
    onSuccess: (objectId: string) => {
      updateCoverImageMutation.mutate(objectId);
      setCropperOpen(false);
      setSelectedImageForCrop(null);
    },
    onError: (error: Error) => {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    },
  });

  const handleImageClick = (imageSrc: string) => {
    setSelectedImageForCrop(imageSrc);
    setCropperOpen(true);
    setImagePickerOpen(false);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    uploadCroppedImageMutation.mutate(croppedBlob);
  };

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

  const handleStageComplete = () => {
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      const updatedProject = queryClient.getQueryData<ProjectWithDetails>(["/api/projects", projectId]);
      if (updatedProject?.stages && updatedProject.stages.length > 0) {
        const allCompleted = updatedProject.stages.every(s => s.status === "completed");
        if (allCompleted) {
          setShowFireworks(true);
        }
      }
    }, 500);
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

  const getRenderImages = (): StageFile[] => {
    if (!project?.stages) return [];
    const renderStage = project.stages.find(
      s => s.name === "Render" || s.name === "Рендер" || s.position === 1
    );
    if (!renderStage?.files) return [];
    return renderStage.files.filter(f => {
      const ext = f.fileName?.toLowerCase().split('.').pop() || '';
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
    });
  };

  const renderImages = getRenderImages();
  
  const normalizeObjectId = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (url.startsWith('/objects/')) {
      return url.replace('/objects/', '');
    }
    if (url.includes('storage.googleapis.com')) {
      const parts = url.split('/');
      return parts[parts.length - 1];
    }
    return url;
  };
  
  const getImageSrc = (idOrUrl: string): string => {
    if (idOrUrl.startsWith('/objects/') || idOrUrl.startsWith('http')) {
      return idOrUrl;
    }
    return `/objects/${idOrUrl}`;
  };
  
  const normalizedCoverImageId = normalizeObjectId(project?.coverImageId);
  const firstRenderImageId = renderImages.length > 0 ? normalizeObjectId(renderImages[0].fileUrl) : null;
  const currentCoverImageId = normalizedCoverImageId || firstRenderImageId;

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
          <Popover open={imagePickerOpen} onOpenChange={setImagePickerOpen}>
            <PopoverTrigger asChild>
              <button
                className="h-32 w-32 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer hover-elevate relative group"
                data-testid="button-select-cover-image"
              >
                {currentCoverImageId ? (
                  <>
                    <img
                      src={getImageSrc(currentCoverImageId)}
                      alt={project.name}
                      className="h-full w-full object-contain"
                    />
                    {renderImages.length > 1 && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-16 w-16 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                    <Layers className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </button>
            </PopoverTrigger>
            {renderImages.length > 0 && (
              <PopoverContent className="w-80 p-3" align="start">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">{t("projects.selectCoverImage") || "Select Cover Image"}</h4>
                  <ScrollArea className="h-48">
                    <div className="grid grid-cols-3 gap-2">
                      {renderImages.map((file) => {
                        const objectId = normalizeObjectId(file.fileUrl);
                        if (!objectId) return null;
                        const imageSrc = getImageSrc(objectId);
                        return (
                          <button
                            key={file.id}
                            onClick={() => handleImageClick(imageSrc)}
                            className={`relative aspect-square rounded-md overflow-hidden border-2 transition-colors ${
                              currentCoverImageId === objectId
                                ? "border-primary"
                                : "border-transparent hover:border-muted-foreground/50"
                            }`}
                            data-testid={`button-cover-image-${file.id}`}
                          >
                            <img
                              src={imageSrc}
                              alt={file.fileName || "Render image"}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Crop className="h-5 w-5 text-white" />
                            </div>
                            {currentCoverImageId === objectId && (
                              <div className="absolute bottom-1 right-1">
                                <Check className="h-4 w-4 text-primary bg-white rounded-full p-0.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("projects.clickToCrop") || "Click on an image to crop and set as cover"}
                  </p>
                </div>
              </PopoverContent>
            )}
          </Popover>
          
          <div className="flex-1 space-y-3">
            <h1 className="text-2xl font-semibold" data-testid="text-project-name">{project.name}</h1>
            {project.description && (
              <p className="text-muted-foreground">{project.description}</p>
            )}
            
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {project.factory && (
                <div className="flex items-center gap-1.5" data-testid="text-factory">
                  <span className="text-muted-foreground">{t("projects.factory")}:</span>
                  <span className="font-medium">{project.factory.name}</span>
                </div>
              )}
              {project.productType && (
                <div className="flex items-center gap-1.5" data-testid="text-product-type">
                  <span className="text-muted-foreground">{t("projects.productType")}:</span>
                  <span className="font-medium">
                    {i18n.language === "ru" && project.productType.nameRu
                      ? project.productType.nameRu
                      : i18n.language === "zh" && project.productType.nameZh
                      ? project.productType.nameZh
                      : project.productType.name}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{t("projects.progress") || "Progress"}</span>
              <div className="flex-1 max-w-xs">
                <Progress value={progress} className="h-2" />
              </div>
              <span className="text-sm font-medium">{progress}%</span>
            </div>

            {project.products && project.products.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">
                  {t("products.title")}
                </h3>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          {t("products.article")}
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          {t("products.name")}
                        </th>
                        <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                          {t("products.barcode")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {project.products.map((product) => (
                        <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2 font-mono text-sm" data-testid={`text-article-${product.id}`}>
                            {product.article || "-"}
                          </td>
                          <td className="px-3 py-2" data-testid={`text-product-name-${product.id}`}>
                            {product.name}
                          </td>
                          <td className="px-3 py-2 font-mono text-sm" data-testid={`text-barcode-${product.id}`}>
                            {product.barcode || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:w-72 flex-shrink-0">
          {project.responsibleUser && (
            <div className="flex items-center gap-3 justify-end" data-testid="responsible-user-info">
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">{t("projects.responsible") || "Responsible"}</p>
                <p className="font-medium" data-testid="text-responsible-name">
                  {project.responsibleUser.firstName} {project.responsibleUser.lastName}
                </p>
                {project.responsibleUser.jobTitle && (
                  <p className="text-sm text-muted-foreground" data-testid="text-responsible-job-title">
                    {project.responsibleUser.jobTitle}
                  </p>
                )}
              </div>
              <Avatar className="h-12 w-12" data-testid="avatar-responsible">
                <AvatarImage src={getObjectUrl(project.responsibleUser.profileImageUrl)} />
                <AvatarFallback>
                  {(project.responsibleUser.firstName?.charAt(0) || "") + (project.responsibleUser.lastName?.charAt(0) || "")}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          <Card>
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
                    {daysRemaining !== null ? (daysRemaining < 0 ? `${Math.abs(daysRemaining)} ${t("projects.overdue") || "overdue"}` : daysRemaining) : "-"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
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
                  responsibleUserId={project.responsibleUserId}
                  users={users || []}
                  position={index + 1}
                  isExpanded={expandedStages.has(stage.id)}
                  onToggle={() => handleToggleStage(stage.id)}
                  onStageComplete={handleStageComplete}
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

      {selectedImageForCrop && (
        <ImageCropper
          imageSrc={selectedImageForCrop}
          open={cropperOpen}
          onClose={() => {
            setCropperOpen(false);
            setSelectedImageForCrop(null);
          }}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
        />
      )}

      <FireworksCelebration
        show={showFireworks}
        onClose={() => setShowFireworks(false)}
      />
    </div>
  );
}
