import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Calendar,
  Paperclip,
  MessageSquare,
  UserPlus,
  History,
  ChevronDown,
  ChevronUp,
  Send,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  PlayCircle,
  AlertTriangle,
  FileIcon,
  Check,
  List,
} from "lucide-react";
import type { StageWithRelations, User, CommentWithUser, StageFile } from "@shared/schema";

interface StageCardProps {
  stage: StageWithRelations;
  projectId: string;
  users: User[];
  isLast?: boolean;
}

const statusConfig = {
  waiting: {
    label: "stages.status.waiting",
    icon: Clock,
    color: "bg-muted text-muted-foreground",
  },
  in_progress: {
    label: "stages.status.in_progress",
    icon: PlayCircle,
    color: "bg-primary/10 text-primary",
  },
  skip: {
    label: "stages.status.skip",
    icon: XCircle,
    color: "bg-muted text-muted-foreground",
  },
  completed: {
    label: "stages.status.completed",
    icon: CheckCircle2,
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  },
};

export function StageCard({ stage, projectId, users, isLast }: StageCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDeadlineModal, setShowDeadlineModal] = useState(false);
  const [showStartDateModal, setShowStartDateModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [deadlineReason, setDeadlineReason] = useState("");
  const [newDeadline, setNewDeadline] = useState(
    stage.deadline ? new Date(stage.deadline).toISOString().split("T")[0] : ""
  );
  const [newStartDate, setNewStartDate] = useState(
    stage.startDate ? new Date(stage.startDate).toISOString().split("T")[0] : ""
  );
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [newComment, setNewComment] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingChecklistItem, setUploadingChecklistItem] = useState<string | null>(null);

  const { data: historyData } = useQuery<{
    statusHistory: Array<{
      id: string;
      oldStatus: string;
      newStatus: string;
      createdAt: string;
      changedBy: User | null;
    }>;
    deadlineHistory: Array<{
      id: string;
      oldDeadline: string | null;
      newDeadline: string | null;
      reason: string;
      createdAt: string;
      changedBy: User | null;
    }>;
  }>({
    queryKey: ["/api/stages", stage.id, "history"],
    enabled: showHistory,
  });

  const isOverdue =
    stage.deadline &&
    new Date(stage.deadline) < new Date() &&
    stage.status !== "completed" &&
    stage.status !== "skip";

  const statusInfo = statusConfig[stage.status || "waiting"];
  const StatusIcon = statusInfo.icon;

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest("PATCH", `/api/stages/${stage.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const updateDeadlineMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/stages/${stage.id}/deadline`, {
        deadline: newDeadline,
        reason: deadlineReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setShowDeadlineModal(false);
      setDeadlineReason("");
      toast({ title: t("stages.deadlineUpdated") });
    },
    onError: () => {
      toast({ title: t("stages.deadlineUpdateFailed"), variant: "destructive" });
    },
  });

  const updateStartDateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/stages/${stage.id}`, {
        startDate: newStartDate || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setShowStartDateModal(false);
      toast({ title: t("stages.startDateUpdated") });
    },
    onError: () => {
      toast({ title: t("stages.startDateUpdateFailed"), variant: "destructive" });
    },
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/stages/${stage.id}/tasks`, {
        description: taskDescription,
        assignedToId: taskAssignee,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setShowTaskModal(false);
      setTaskDescription("");
      setTaskAssignee("");
      toast({ title: "Task assigned" });
    },
    onError: () => {
      toast({ title: "Failed to assign task", variant: "destructive" });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/stages/${stage.id}/comments`, {
        content: newComment,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      setNewComment("");
      toast({ title: t("stages.commentAdded") });
    },
    onError: () => {
      toast({ title: t("stages.commentFailed"), variant: "destructive" });
    },
  });

  const updateChecklistMutation = useMutation({
    mutationFn: async (data: { checklistData?: Record<string, boolean>; conditionalEnabled?: boolean; conditionalSubstagesData?: Record<string, boolean> }) => {
      return apiRequest("PATCH", `/api/stages/${stage.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
    },
    onError: () => {
      toast({ title: "Failed to update checklist", variant: "destructive" });
    },
  });

  const handleChecklistItemToggle = (itemKey: string, currentValue: boolean) => {
    const newChecklistData = {
      ...(stage.checklistData || {}),
      [itemKey]: !currentValue,
    };
    updateChecklistMutation.mutate({ checklistData: newChecklistData });
  };

  const handleConditionalToggle = (enabled: boolean) => {
    updateChecklistMutation.mutate({ 
      conditionalEnabled: enabled,
      status: enabled ? "waiting" : "skip",
    });
  };

  const handleConditionalSubstageToggle = (itemKey: string, currentValue: boolean) => {
    const newSubstagesData = {
      ...(stage.conditionalSubstagesData || {}),
      [itemKey]: !currentValue,
    };
    updateChecklistMutation.mutate({ conditionalSubstagesData: newSubstagesData });
  };

  // Get files for a specific checklist item
  const getFilesForChecklistItem = (itemKey: string) => {
    return (stage.files || []).filter(f => f.checklistItemKey === itemKey);
  };

  // Get accepted file types based on stage name
  const getAcceptedFileTypes = (stageName: string, itemKey?: string) => {
    if (stageName === "Render" || itemKey === "render") return "image/*";
    if (stageName === "3D Model") return ".step,.stp,.stl";
    if (itemKey === "boxPhoto") return "image/*";
    if (itemKey === "video") return "video/*";
    return "*";
  };

  // Get translation key for checklist item - tries multiple translation namespaces
  const getChecklistItemLabel = (itemKey: string) => {
    // Try different translation sections in order of specificity
    const translationPaths = [
      `stages.checklistItems.${itemKey}`,
      `stages.certificationSubstages.${itemKey}`,
      `stages.firstShipmentItems.${itemKey}`,
    ];
    
    for (const path of translationPaths) {
      // i18next with returnNull and returnEmptyString false returns the key if not found
      const translation = t(path, { defaultValue: null as any });
      if (translation && translation !== path) {
        return translation;
      }
    }
    
    // Fallback: format the key to be human-readable
    return itemKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
  };

  // Check if stage has checklist
  const hasChecklist = stage.template?.hasChecklist && stage.template?.checklistItems?.length;
  const checklistItems = stage.template?.checklistItems || [];
  
  // Check if stage has conditional substages (certification)
  const hasConditionalSubstages = stage.template?.hasConditionalSubstages && stage.template?.conditionalSubstages?.length;
  const conditionalSubstages = stage.template?.conditionalSubstages || [];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, checklistItemKey?: string) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (checklistItemKey) {
      setUploadingChecklistItem(checklistItemKey);
    } else {
      setIsUploading(true);
    }
    
    try {
      // Step 1: Get signed upload URL
      const urlResponse = await fetch(
        `/api/stages/${stage.id}/upload-url?fileName=${encodeURIComponent(file.name)}`,
        { credentials: "include" }
      );
      
      if (!urlResponse.ok) {
        throw new Error("Failed to get upload URL");
      }
      
      const { url } = await urlResponse.json();
      
      // Step 2: Upload file directly to cloud storage
      const uploadResponse = await fetch(url, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Upload to storage failed");
      }
      
      // Step 3: Record file metadata in database with checklist item key
      const fileUrl = url.split("?")[0]; // Remove query params for clean URL
      const recordResponse = await fetch(`/api/stages/${stage.id}/files`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          fileUrl: fileUrl,
          fileType: file.type,
          fileSize: file.size,
          checklistItemKey: checklistItemKey || null,
        }),
        credentials: "include",
      });
      
      if (!recordResponse.ok) {
        const error = await recordResponse.json();
        throw new Error(error.message || "Failed to record file");
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: t("stages.fileUploaded") });
    } catch (error) {
      console.error("File upload error:", error);
      toast({ 
        title: t("stages.fileUploadFailed"), 
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive" 
      });
    } finally {
      setIsUploading(false);
      setUploadingChecklistItem(null);
      event.target.value = "";
    }
  };

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return null;
    const user = users.find((u) => u.id === userId);
    if (!user) return null;
    return user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.email;
  };

  const getUserInitials = (userId: string | null | undefined) => {
    if (!userId) return "?";
    const user = users.find((u) => u.id === userId);
    if (!user) return "?";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.email?.[0]?.toUpperCase() || "?";
  };

  return (
    <>
      <div className="relative pl-14">
        <div
          className={`absolute left-0 top-6 h-14 w-14 rounded-full flex items-center justify-center z-10 ${
            stage.status === "completed"
              ? "bg-green-100 dark:bg-green-900/30"
              : stage.status === "in_progress"
              ? "bg-primary/10"
              : "bg-muted"
          }`}
        >
          <StatusIcon
            className={`h-6 w-6 ${
              stage.status === "completed"
                ? "text-green-600 dark:text-green-400"
                : stage.status === "in_progress"
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          />
        </div>

        <Card
          className={`transition-all ${
            isOverdue ? "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20" : ""
          }`}
          data-testid={`card-stage-${stage.id}`}
        >
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">{stage.name}</h3>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Overdue
                  </Badge>
                )}
              </div>
              <Select
                value={stage.status || "waiting"}
                onValueChange={(value) => updateStatusMutation.mutate(value)}
              >
                <SelectTrigger className="w-40" data-testid={`select-status-${stage.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiting">{t("stages.status.waiting")}</SelectItem>
                  <SelectItem value="in_progress">{t("stages.status.in_progress")}</SelectItem>
                  <SelectItem value="skip">{t("stages.status.skip")}</SelectItem>
                  <SelectItem value="completed">{t("stages.status.completed")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("stages.startDate")}:</span>
                <span>
                  {stage.startDate
                    ? new Date(stage.startDate).toLocaleDateString()
                    : t("stages.notSet")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowStartDateModal(true)}
                  className="h-6 px-2 text-xs"
                  data-testid={`button-change-start-date-${stage.id}`}
                >
                  {t("stages.changeStartDate")}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{t("stages.deadline")}:</span>
                <span className={isOverdue ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                  {stage.deadline
                    ? new Date(stage.deadline).toLocaleDateString()
                    : t("stages.notSet")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeadlineModal(true)}
                  className="h-6 px-2 text-xs"
                  data-testid={`button-change-deadline-${stage.id}`}
                >
                  {t("stages.changeDeadline")}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTaskModal(true)}
                data-testid={`button-assign-task-${stage.id}`}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t("stages.assignTask")}
              </Button>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  data-testid={`input-file-${stage.id}`}
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  asChild
                  data-testid={`button-attach-file-${stage.id}`}
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? t("common.loading") : t("stages.attachFile")}
                  </span>
                </Button>
              </label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHistory(!showHistory)}
                data-testid={`button-view-history-${stage.id}`}
              >
                <History className="h-4 w-4 mr-2" />
                {t("stages.viewHistory")}
              </Button>
            </div>

            {showHistory && (
              <div className="space-y-4 p-4 rounded-lg bg-muted/30 border" data-testid={`history-section-${stage.id}`}>
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <History className="h-4 w-4" />
                  {t("stages.changeHistory")}
                </h4>
                
                {historyData?.statusHistory && historyData.statusHistory.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase">{t("stages.statusChanges")}</h5>
                    <div className="space-y-2">
                      {historyData.statusHistory.map((record) => (
                        <div key={record.id} className="flex items-start gap-3 text-sm p-2 rounded bg-background">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <PlayCircle className="h-3 w-3 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p>
                              <span className="font-medium">
                                {record.changedBy ? 
                                  (record.changedBy.firstName && record.changedBy.lastName 
                                    ? `${record.changedBy.firstName} ${record.changedBy.lastName}` 
                                    : record.changedBy.email) 
                                  : t("common.unknown")}
                              </span>
                              {" "}{t("stages.changedStatusFrom")}{" "}
                              <Badge variant="outline" className="text-xs mx-1">
                                {t(`stages.status.${record.oldStatus || "waiting"}`)}
                              </Badge>
                              {" "}{t("common.to")}{" "}
                              <Badge variant="outline" className="text-xs mx-1">
                                {t(`stages.status.${record.newStatus}`)}
                              </Badge>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {record.createdAt ? new Date(record.createdAt).toLocaleString() : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {historyData?.deadlineHistory && historyData.deadlineHistory.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase">{t("stages.deadlineChanges")}</h5>
                    <div className="space-y-2">
                      {historyData.deadlineHistory.map((record) => (
                        <div key={record.id} className="flex items-start gap-3 text-sm p-2 rounded bg-background">
                          <div className="h-6 w-6 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Calendar className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p>
                              <span className="font-medium">
                                {record.changedBy ? 
                                  (record.changedBy.firstName && record.changedBy.lastName 
                                    ? `${record.changedBy.firstName} ${record.changedBy.lastName}` 
                                    : record.changedBy.email) 
                                  : t("common.unknown")}
                              </span>
                              {" "}{t("stages.changedDeadlineFrom")}{" "}
                              <span className="font-medium">
                                {record.oldDeadline ? new Date(record.oldDeadline).toLocaleDateString() : t("stages.notSet")}
                              </span>
                              {" "}{t("common.to")}{" "}
                              <span className="font-medium">
                                {record.newDeadline ? new Date(record.newDeadline).toLocaleDateString() : t("stages.notSet")}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              {t("stages.reason")}: {record.reason}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {record.createdAt ? new Date(record.createdAt).toLocaleString() : ""}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!historyData?.statusHistory?.length && !historyData?.deadlineHistory?.length) && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t("stages.noHistory")}
                  </p>
                )}
              </div>
            )}

            {/* Checklist Section */}
            {hasChecklist && (
              <div className="space-y-3 p-4 rounded-lg bg-muted/30 border" data-testid={`checklist-section-${stage.id}`}>
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <List className="h-4 w-4" />
                  {t("stages.checklist")}
                </h4>
                <div className="space-y-3">
                  {checklistItems.map((itemKey) => {
                    const isCompleted = stage.checklistData?.[itemKey] || false;
                    const itemFiles = getFilesForChecklistItem(itemKey);
                    const isItemUploading = uploadingChecklistItem === itemKey;
                    
                    return (
                      <div key={itemKey} className="flex flex-col gap-2 p-3 rounded-lg bg-background border">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Checkbox
                              id={`checklist-${stage.id}-${itemKey}`}
                              checked={isCompleted}
                              onCheckedChange={() => handleChecklistItemToggle(itemKey, isCompleted)}
                              data-testid={`checkbox-${stage.id}-${itemKey}`}
                            />
                            <label
                              htmlFor={`checklist-${stage.id}-${itemKey}`}
                              className={`text-sm cursor-pointer flex-1 ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                            >
                              {getChecklistItemLabel(itemKey)}
                            </label>
                          </div>
                          <label className="cursor-pointer flex-shrink-0">
                            <input
                              type="file"
                              className="hidden"
                              accept={getAcceptedFileTypes(stage.name, itemKey)}
                              onChange={(e) => handleFileUpload(e, itemKey)}
                              disabled={isItemUploading}
                              data-testid={`input-file-${stage.id}-${itemKey}`}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isItemUploading}
                              asChild
                              data-testid={`button-attach-${stage.id}-${itemKey}`}
                            >
                              <span className="flex items-center gap-1">
                                {isItemUploading ? (
                                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                                {itemFiles.length > 0 && (
                                  <Badge variant="secondary" className="text-xs px-1.5">
                                    {itemFiles.length}
                                  </Badge>
                                )}
                              </span>
                            </Button>
                          </label>
                        </div>
                        
                        {itemFiles.length > 0 && (
                          <div className="ml-7 space-y-1">
                            {itemFiles.map((file) => (
                              <div
                                key={file.id}
                                className="flex items-center gap-2 text-xs text-muted-foreground"
                                data-testid={`file-${stage.id}-${itemKey}-${file.id}`}
                              >
                                <FileIcon className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate flex-1">{file.fileName}</span>
                                {file.isLatest && (
                                  <Badge variant="outline" className="text-xs px-1">
                                    v{file.version}
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Conditional Certification Stage */}
            {hasConditionalSubstages && (
              <div className="space-y-3 p-4 rounded-lg bg-muted/30 border" data-testid={`conditional-section-${stage.id}`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{t("stages.templates.certification")}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {stage.conditionalEnabled ? t("common.yes") : t("common.no")}
                    </span>
                    <Switch
                      checked={stage.conditionalEnabled || false}
                      onCheckedChange={handleConditionalToggle}
                      data-testid={`switch-certification-${stage.id}`}
                    />
                  </div>
                </div>
                
                {stage.conditionalEnabled && (
                  <div className="space-y-3">
                    {conditionalSubstages.map((itemKey) => {
                      const isCompleted = stage.conditionalSubstagesData?.[itemKey] || false;
                      const itemFiles = getFilesForChecklistItem(itemKey);
                      const isItemUploading = uploadingChecklistItem === itemKey;
                      
                      return (
                        <div key={itemKey} className="flex flex-col gap-2 p-3 rounded-lg bg-background border">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Checkbox
                                id={`substage-${stage.id}-${itemKey}`}
                                checked={isCompleted}
                                onCheckedChange={() => handleConditionalSubstageToggle(itemKey, isCompleted)}
                                data-testid={`checkbox-substage-${stage.id}-${itemKey}`}
                              />
                              <label
                                htmlFor={`substage-${stage.id}-${itemKey}`}
                                className={`text-sm cursor-pointer flex-1 ${isCompleted ? "line-through text-muted-foreground" : ""}`}
                              >
                                {getChecklistItemLabel(itemKey)}
                              </label>
                            </div>
                            <label className="cursor-pointer flex-shrink-0">
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, itemKey)}
                                disabled={isItemUploading}
                                data-testid={`input-file-substage-${stage.id}-${itemKey}`}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isItemUploading}
                                asChild
                                data-testid={`button-attach-substage-${stage.id}-${itemKey}`}
                              >
                                <span className="flex items-center gap-1">
                                  {isItemUploading ? (
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  )}
                                  {itemFiles.length > 0 && (
                                    <Badge variant="secondary" className="text-xs px-1.5">
                                      {itemFiles.length}
                                    </Badge>
                                  )}
                                </span>
                              </Button>
                            </label>
                          </div>
                          
                          {itemFiles.length > 0 && (
                            <div className="ml-7 space-y-1">
                              {itemFiles.map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center gap-2 text-xs text-muted-foreground"
                                  data-testid={`file-substage-${stage.id}-${itemKey}-${file.id}`}
                                >
                                  <FileIcon className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate flex-1">{file.fileName}</span>
                                  {file.isLatest && (
                                    <Badge variant="outline" className="text-xs px-1">
                                      v{file.version}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                  data-testid={`button-expand-stage-${stage.id}`}
                >
                  <span className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Paperclip className="h-4 w-4" />
                      {stage.files?.length || 0} {t("stages.files")}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {stage.comments?.length || 0} {t("stages.comments")}
                    </span>
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="space-y-4 pt-4">
                <Separator />

                {stage.files && stage.files.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">{t("stages.files")}</h4>
                    <div className="space-y-2">
                      {stage.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                          data-testid={`file-${file.id}`}
                        >
                          <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.fileName}</p>
                            <p className="text-xs text-muted-foreground">
                              {t("files.uploaded")} {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : ""}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            v{file.version}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">{t("stages.comments")}</h4>
                  {stage.comments && stage.comments.length > 0 ? (
                    <div className="space-y-3">
                      {stage.comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3" data-testid={`comment-${comment.id}`}>
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarImage
                              src={comment.user?.profileImageUrl || undefined}
                              className="object-cover"
                            />
                            <AvatarFallback className="text-xs">
                              {getUserInitials(comment.userId)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {getUserName(comment.userId) || "Unknown"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {comment.createdAt
                                  ? new Date(comment.createdAt).toLocaleString()
                                  : ""}
                              </span>
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("comments.noComments")}</p>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder={t("comments.placeholder")}
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newComment.trim()) {
                          addCommentMutation.mutate();
                        }
                      }}
                      data-testid={`input-comment-${stage.id}`}
                    />
                    <Button
                      size="icon"
                      onClick={() => addCommentMutation.mutate()}
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      data-testid={`button-send-comment-${stage.id}`}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDeadlineModal} onOpenChange={setShowDeadlineModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stages.changeDeadline")}</DialogTitle>
            <DialogDescription>
              Please provide a reason for changing the deadline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("stages.deadline")}</label>
              <Input
                type="date"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                data-testid="input-new-deadline"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("stages.deadlineReason")} *</label>
              <Textarea
                value={deadlineReason}
                onChange={(e) => setDeadlineReason(e.target.value)}
                placeholder="Enter reason for deadline change..."
                data-testid="input-deadline-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeadlineModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => updateDeadlineMutation.mutate()}
              disabled={!deadlineReason.trim() || updateDeadlineMutation.isPending}
              data-testid="button-save-deadline"
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showStartDateModal} onOpenChange={setShowStartDateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stages.changeStartDate")}</DialogTitle>
            <DialogDescription>
              {t("stages.setStartDateDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("stages.startDate")}</label>
              <Input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                data-testid="input-new-start-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDateModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => updateStartDateMutation.mutate()}
              disabled={updateStartDateMutation.isPending}
              data-testid="button-save-start-date"
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showTaskModal} onOpenChange={setShowTaskModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stages.assignTask")}</DialogTitle>
            <DialogDescription>
              Assign a task to a team member for this stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("tasks.assignTo")} *</label>
              <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                <SelectTrigger data-testid="select-task-assignee">
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("tasks.taskDescription")} *</label>
              <Textarea
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Describe the task..."
                data-testid="input-task-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => createTaskMutation.mutate()}
              disabled={
                !taskAssignee || !taskDescription.trim() || createTaskMutation.isPending
              }
              data-testid="button-assign-task"
            >
              {t("stages.assignTask")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
