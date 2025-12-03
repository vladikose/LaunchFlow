import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  CheckSquare,
} from "lucide-react";
import type { StageTemplate } from "@shared/schema";

export default function AdminStages() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<StageTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    nameRu: "",
    nameZh: "",
    description: "",
    position: 1,
    hasChecklist: false,
    checklistItems: [] as string[],
  });

  const { data: templates, isLoading } = useQuery<StageTemplate[]>({
    queryKey: ["/api/stage-templates"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/stage-templates", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stage-templates"] });
      setShowModal(false);
      resetForm();
      toast({ title: "Stage template created" });
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      return apiRequest("PUT", `/api/stage-templates/${data.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stage-templates"] });
      setShowModal(false);
      resetForm();
      toast({ title: "Stage template updated" });
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/stage-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stage-templates"] });
      toast({ title: "Stage template deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      nameRu: "",
      nameZh: "",
      description: "",
      position: (templates?.length || 0) + 1,
      hasChecklist: false,
      checklistItems: [],
    });
    setEditingTemplate(null);
  };

  const openEditModal = (template: StageTemplate) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      nameRu: template.nameRu || "",
      nameZh: template.nameZh || "",
      description: template.description || "",
      position: template.position,
      hasChecklist: template.hasChecklist || false,
      checklistItems: (template.checklistItems as string[]) || [],
    });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateMutation.mutate({ ...formData, id: editingTemplate.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const sortedTemplates = templates
    ? [...templates].sort((a, b) => a.position - b.position)
    : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{t("admin.stageTemplates.title")}</h1>
          <p className="text-muted-foreground mt-1">
            Configure the stages for new projects
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          data-testid="button-add-template"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("admin.stageTemplates.add")}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-6 w-6" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedTemplates.length > 0 ? (
            <div className="divide-y">
              {sortedTemplates.map((template, index) => (
                <div
                  key={template.id}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`row-template-${template.id}`}
                >
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <GripVertical className="h-4 w-4 cursor-grab" />
                    <span className="w-6 text-center font-medium">{index + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{template.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {template.hasChecklist && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CheckSquare className="h-3 w-3" />
                          Checklist
                        </span>
                      )}
                      {template.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-xs">
                          {template.description}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditModal(template)}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(template.id)}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No stage templates yet</p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t("admin.stageTemplates.edit") : t("admin.stageTemplates.add")}
            </DialogTitle>
            <DialogDescription>
              Configure the stage template settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("admin.stageTemplates.name")} (EN) *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Stage name in English"
                data-testid="input-template-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("admin.stageTemplates.name")} (RU)</Label>
                <Input
                  value={formData.nameRu}
                  onChange={(e) => setFormData({ ...formData, nameRu: e.target.value })}
                  placeholder="Название на русском"
                  data-testid="input-template-name-ru"
                />
              </div>
              <div className="space-y-2">
                <Label>{t("admin.stageTemplates.name")} (ZH)</Label>
                <Input
                  value={formData.nameZh}
                  onChange={(e) => setFormData({ ...formData, nameZh: e.target.value })}
                  placeholder="中文名称"
                  data-testid="input-template-name-zh"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("admin.stageTemplates.position")}</Label>
              <Input
                type="number"
                min={1}
                value={formData.position}
                onChange={(e) =>
                  setFormData({ ...formData, position: parseInt(e.target.value) || 1 })
                }
                data-testid="input-template-position"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="has-checklist">{t("admin.stageTemplates.hasChecklist")}</Label>
              <Switch
                id="has-checklist"
                checked={formData.hasChecklist}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, hasChecklist: checked })
                }
                data-testid="switch-has-checklist"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !formData.name.trim() ||
                createMutation.isPending ||
                updateMutation.isPending
              }
              data-testid="button-save-template"
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
