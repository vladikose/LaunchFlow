import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  CheckSquare,
  Calendar,
  FolderKanban,
  Layers,
  User,
  AlertTriangle,
  Send,
  Inbox,
  RotateCcw,
  Trash2,
  MessageSquare,
  Clock,
} from "lucide-react";
import type { TaskWithUsers } from "@shared/schema";

export default function Tasks() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"incoming" | "outgoing">("incoming");
  const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
  const [selectedTaskForRevision, setSelectedTaskForRevision] = useState<TaskWithUsers | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTaskForDelete, setSelectedTaskForDelete] = useState<TaskWithUsers | null>(null);

  const { data: incomingTasks, isLoading: isLoadingIncoming } = useQuery<TaskWithUsers[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: outgoingTasks, isLoading: isLoadingOutgoing } = useQuery<TaskWithUsers[]>({
    queryKey: ["/api/tasks/outgoing"],
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ taskId, completed }: { taskId: string; completed: boolean }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, { 
        completed,
        status: completed ? "completed" : "pending"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/outgoing"] });
      toast({ title: t("tasks.statusUpdated") });
    },
    onError: () => {
      toast({ title: t("tasks.updateFailed"), variant: "destructive" });
    },
  });

  const requestRevisionMutation = useMutation({
    mutationFn: async ({ taskId, revisionNote }: { taskId: string; revisionNote: string }) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}/request-revision`, { revisionNote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/outgoing"] });
      setRevisionDialogOpen(false);
      setSelectedTaskForRevision(null);
      setRevisionNote("");
      toast({ title: t("tasks.revisionRequested") });
    },
    onError: () => {
      toast({ title: t("tasks.revisionRequestFailed"), variant: "destructive" });
    },
  });

  const resendTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, { 
        status: "pending",
        revisionNote: null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/outgoing"] });
      toast({ title: t("tasks.taskResent") });
    },
    onError: () => {
      toast({ title: t("tasks.resendFailed"), variant: "destructive" });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("DELETE", `/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/outgoing"] });
      setDeleteDialogOpen(false);
      setSelectedTaskForDelete(null);
      toast({ title: t("tasks.taskDeleted") });
    },
    onError: () => {
      toast({ title: t("tasks.deleteFailed"), variant: "destructive" });
    },
  });

  const isOverdue = (task: TaskWithUsers) => {
    if (!task.stage?.deadline) return false;
    return new Date(task.stage.deadline) < new Date();
  };

  const getStatusBadge = (task: TaskWithUsers) => {
    if (task.status === "needs_revision") {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800">
          <RotateCcw className="h-3 w-3 mr-1" />
          {t("tasks.needsRevision")}
        </Badge>
      );
    }
    if (task.status === "completed" || task.completed) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
          <CheckSquare className="h-3 w-3 mr-1" />
          {t("tasks.completed")}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
        <Clock className="h-3 w-3 mr-1" />
        {t("tasks.pending")}
      </Badge>
    );
  };

  const sortTasks = (tasks: TaskWithUsers[]) => {
    return [...tasks].sort((a, b) => {
      const statusOrder = { needs_revision: 0, pending: 1, completed: 2 };
      const aStatus = a.status || (a.completed ? "completed" : "pending");
      const bStatus = b.status || (b.completed ? "completed" : "pending");
      const statusDiff = (statusOrder[aStatus as keyof typeof statusOrder] || 1) - (statusOrder[bStatus as keyof typeof statusOrder] || 1);
      if (statusDiff !== 0) return statusDiff;
      
      const aDate = a.stage?.deadline ? new Date(a.stage.deadline).getTime() : Infinity;
      const bDate = b.stage?.deadline ? new Date(b.stage.deadline).getTime() : Infinity;
      return aDate - bDate;
    });
  };

  const renderTaskCard = (task: TaskWithUsers, isOutgoing: boolean) => {
    const overdue = isOverdue(task);
    const isNeedsRevision = task.status === "needs_revision";
    const isCompleted = task.status === "completed" || !!task.completed;
    const isPending = !isNeedsRevision && !isCompleted;

    return (
      <Card
        key={task.id}
        className={`transition-all ${
          overdue && isPending
            ? "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20"
            : isNeedsRevision
            ? "border-yellow-200 dark:border-yellow-900 bg-yellow-50/50 dark:bg-yellow-950/20"
            : isCompleted
            ? "opacity-60"
            : ""
        }`}
        data-testid={`card-task-${task.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {!isOutgoing && (
              <Checkbox
                checked={isCompleted}
                disabled={isNeedsRevision}
                onCheckedChange={(checked) => 
                  toggleCompleteMutation.mutate({ taskId: task.id, completed: !!checked })
                }
                className="mt-1"
                data-testid={`checkbox-task-${task.id}`}
              />
            )}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className={`font-medium ${isCompleted ? "line-through" : ""}`}>
                  {task.description}
                </p>
                {getStatusBadge(task)}
              </div>
              
              {isNeedsRevision && task.revisionNote && (
                <div className="bg-yellow-100 dark:bg-yellow-950 p-2 rounded-md text-sm">
                  <div className="flex items-center gap-1 text-yellow-700 dark:text-yellow-400 font-medium mb-1">
                    <MessageSquare className="h-3.5 w-3.5" />
                    {t("tasks.revisionNote")}:
                  </div>
                  <p className="text-yellow-800 dark:text-yellow-300">{task.revisionNote}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                {task.stage?.project && (
                  <Link
                    href={`/projects/${task.stage.project.id}`}
                    className="flex items-center gap-1 hover:text-primary transition-colors"
                  >
                    <FolderKanban className="h-3.5 w-3.5" />
                    <span className="truncate max-w-[150px]">
                      {task.stage.project.name}
                    </span>
                  </Link>
                )}
                {task.stage && (
                  <div className="flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5" />
                    <span>{task.stage.name}</span>
                  </div>
                )}
                {task.stage?.deadline && (
                  <div
                    className={`flex items-center gap-1 ${
                      overdue && isPending ? "text-red-600 dark:text-red-400" : ""
                    }`}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {new Date(task.stage.deadline).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {isOutgoing && task.assignedTo && (
                  <div className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    <span>
                      {t("tasks.assignedTo")}:{" "}
                      {task.assignedTo.firstName && task.assignedTo.lastName
                        ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}`
                        : task.assignedTo.email}
                    </span>
                  </div>
                )}
                {!isOutgoing && task.assignedBy && (
                  <div className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    <span>
                      {t("tasks.assignedBy")}:{" "}
                      {task.assignedBy.firstName && task.assignedBy.lastName
                        ? `${task.assignedBy.firstName} ${task.assignedBy.lastName}`
                        : task.assignedBy.email}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {!isOutgoing && isPending && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedTaskForRevision(task);
                      setRevisionDialogOpen(true);
                    }}
                    data-testid={`button-request-revision-${task.id}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    {t("tasks.requestRevision")}
                  </Button>
                )}
                
                {isOutgoing && isNeedsRevision && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => resendTaskMutation.mutate(task.id)}
                    disabled={resendTaskMutation.isPending}
                    data-testid={`button-resend-task-${task.id}`}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    {t("tasks.resendTask")}
                  </Button>
                )}
                
                {isOutgoing && !isCompleted && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => {
                      setSelectedTaskForDelete(task);
                      setDeleteDialogOpen(true);
                    }}
                    data-testid={`button-delete-task-${task.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    {t("tasks.deleteTask")}
                  </Button>
                )}
              </div>
            </div>
            {overdue && isPending && (
              <Badge variant="destructive" className="flex-shrink-0">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {t("tasks.overdue")}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderTaskList = (tasks: TaskWithUsers[] | undefined, isLoading: boolean, isOutgoing: boolean) => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!tasks || tasks.length === 0) {
      return (
        <Card className="py-16">
          <CardContent className="text-center">
            {isOutgoing ? (
              <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            ) : (
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            )}
            <h3 className="text-lg font-medium mb-2">
              {isOutgoing ? t("tasks.noOutgoingTasks") : t("tasks.noTasks")}
            </h3>
            <p className="text-muted-foreground">
              {isOutgoing 
                ? t("tasks.noOutgoingTasksDescription")
                : t("tasks.noIncomingTasksDescription")}
            </p>
          </CardContent>
        </Card>
      );
    }

    const sortedTasks = sortTasks(tasks);

    return (
      <div className="space-y-3">
        {sortedTasks.map((task) => renderTaskCard(task, isOutgoing))}
      </div>
    );
  };

  const incomingPendingCount = incomingTasks?.filter(t => t.status !== "completed" && !t.completed).length || 0;
  const outgoingNeedsRevisionCount = outgoingTasks?.filter(t => t.status === "needs_revision").length || 0;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{t("tasks.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("tasks.description")}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "incoming" | "outgoing")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="incoming" className="flex items-center gap-2" data-testid="tab-incoming">
            <Inbox className="h-4 w-4" />
            {t("tasks.incoming")}
            {incomingPendingCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {incomingPendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="flex items-center gap-2" data-testid="tab-outgoing">
            <Send className="h-4 w-4" />
            {t("tasks.outgoing")}
            {outgoingNeedsRevisionCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {outgoingNeedsRevisionCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="mt-6">
          {renderTaskList(incomingTasks, isLoadingIncoming, false)}
        </TabsContent>

        <TabsContent value="outgoing" className="mt-6">
          {renderTaskList(outgoingTasks, isLoadingOutgoing, true)}
        </TabsContent>
      </Tabs>

      <Dialog open={revisionDialogOpen} onOpenChange={setRevisionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tasks.requestRevisionTitle")}</DialogTitle>
            <DialogDescription>
              {t("tasks.requestRevisionDescription")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("tasks.revisionNotePlaceholder")}
            value={revisionNote}
            onChange={(e) => setRevisionNote(e.target.value)}
            className="min-h-[100px]"
            data-testid="textarea-revision-note"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevisionDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => {
                if (selectedTaskForRevision) {
                  requestRevisionMutation.mutate({
                    taskId: selectedTaskForRevision.id,
                    revisionNote
                  });
                }
              }}
              disabled={requestRevisionMutation.isPending}
              data-testid="button-submit-revision"
            >
              {t("tasks.sendForRevision")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("tasks.deleteTaskTitle")}</DialogTitle>
            <DialogDescription>
              {t("tasks.deleteTaskDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedTaskForDelete) {
                  deleteTaskMutation.mutate(selectedTaskForDelete.id);
                }
              }}
              disabled={deleteTaskMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {t("tasks.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
