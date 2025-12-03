import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  CheckSquare,
  Calendar,
  FolderKanban,
  Layers,
  User,
  AlertTriangle,
} from "lucide-react";
import type { TaskWithUsers } from "@shared/schema";

export default function Tasks() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const { data: tasks, isLoading } = useQuery<TaskWithUsers[]>({
    queryKey: ["/api/tasks"],
  });

  const completeMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest("PATCH", `/api/tasks/${taskId}`, { completed: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task marked as complete" });
    },
    onError: () => {
      toast({ title: "Failed to complete task", variant: "destructive" });
    },
  });

  const pendingTasks = tasks?.filter((t) => !t.completed) || [];
  const completedTasks = tasks?.filter((t) => t.completed) || [];

  const isOverdue = (task: TaskWithUsers) => {
    if (!task.stage?.deadline) return false;
    return new Date(task.stage.deadline) < new Date();
  };

  const sortedPendingTasks = [...pendingTasks].sort((a, b) => {
    const aDate = a.stage?.deadline ? new Date(a.stage.deadline).getTime() : Infinity;
    const bDate = b.stage?.deadline ? new Date(b.stage.deadline).getTime() : Infinity;
    return aDate - bDate;
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">{t("tasks.title")}</h1>
        <p className="text-muted-foreground mt-1">
          Tasks assigned to you across all projects
        </p>
      </div>

      {isLoading ? (
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
      ) : tasks && tasks.length > 0 ? (
        <div className="space-y-6">
          {sortedPendingTasks.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                Pending Tasks ({sortedPendingTasks.length})
              </h2>
              <div className="space-y-3">
                {sortedPendingTasks.map((task) => {
                  const overdue = isOverdue(task);
                  return (
                    <Card
                      key={task.id}
                      className={`transition-all ${
                        overdue
                          ? "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20"
                          : ""
                      }`}
                      data-testid={`card-task-${task.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => completeMutation.mutate(task.id)}
                            className="mt-1"
                            data-testid={`checkbox-task-${task.id}`}
                          />
                          <div className="flex-1 min-w-0 space-y-2">
                            <p className="font-medium">{task.description}</p>
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
                                    overdue ? "text-red-600 dark:text-red-400" : ""
                                  }`}
                                >
                                  <Calendar className="h-3.5 w-3.5" />
                                  <span>
                                    {new Date(task.stage.deadline).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                              {task.assignedBy && (
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
                          </div>
                          {overdue && (
                            <Badge variant="destructive" className="flex-shrink-0">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {completedTasks.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium flex items-center gap-2 text-muted-foreground">
                <CheckSquare className="h-5 w-5" />
                Completed ({completedTasks.length})
              </h2>
              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <Card key={task.id} className="opacity-60" data-testid={`card-task-completed-${task.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Checkbox checked disabled className="mt-1" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <p className="font-medium line-through">{task.description}</p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            {task.stage?.project && (
                              <div className="flex items-center gap-1">
                                <FolderKanban className="h-3.5 w-3.5" />
                                <span className="truncate max-w-[150px]">
                                  {task.stage.project.name}
                                </span>
                              </div>
                            )}
                            {task.stage && (
                              <div className="flex items-center gap-1">
                                <Layers className="h-3.5 w-3.5" />
                                <span>{task.stage.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card className="py-16">
          <CardContent className="text-center">
            <CheckSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{t("tasks.noTasks")}</h3>
            <p className="text-muted-foreground">
              Tasks will appear here when assigned to you.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
