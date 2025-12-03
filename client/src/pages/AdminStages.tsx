import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  GripVertical,
  CheckSquare,
  ChevronUp,
  ChevronDown,
  FileText,
  ToggleLeft,
  X,
} from "lucide-react";
import type { StageTemplate, CustomField } from "@shared/schema";

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
    hasConditionalSubstages: false,
    conditionalSubstages: [] as string[],
    customFields: [] as CustomField[],
    isActive: true,
  });
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [newCustomField, setNewCustomField] = useState({
    key: "",
    label: "",
    labelRu: "",
    labelZh: "",
    type: "textarea" as "text" | "textarea" | "number",
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
      toast({ title: t("admin.stageTemplates.created") });
    },
    onError: () => {
      toast({ title: t("admin.stageTemplates.createFailed"), variant: "destructive" });
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
      toast({ title: t("admin.stageTemplates.updated") });
    },
    onError: () => {
      toast({ title: t("admin.stageTemplates.updateFailed"), variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/stage-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stage-templates"] });
      toast({ title: t("admin.stageTemplates.deleted") });
    },
    onError: () => {
      toast({ title: t("admin.stageTemplates.deleteFailed"), variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest("PUT", `/api/stage-templates/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stage-templates"] });
    },
    onError: () => {
      toast({ title: t("admin.stageTemplates.updateFailed"), variant: "destructive" });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ id, newPosition }: { id: string; newPosition: number }) => {
      return apiRequest("PUT", `/api/stage-templates/${id}`, { position: newPosition });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stage-templates"] });
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
      hasConditionalSubstages: false,
      conditionalSubstages: [],
      customFields: [],
      isActive: true,
    });
    setEditingTemplate(null);
    setNewChecklistItem("");
    setNewCustomField({
      key: "",
      label: "",
      labelRu: "",
      labelZh: "",
      type: "textarea",
    });
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
      hasConditionalSubstages: template.hasConditionalSubstages || false,
      conditionalSubstages: (template.conditionalSubstages as string[]) || [],
      customFields: (template.customFields as CustomField[]) || [],
      isActive: template.isActive ?? true,
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

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      setFormData({
        ...formData,
        checklistItems: [...formData.checklistItems, newChecklistItem.trim()],
      });
      setNewChecklistItem("");
    }
  };

  const removeChecklistItem = (index: number) => {
    setFormData({
      ...formData,
      checklistItems: formData.checklistItems.filter((_, i) => i !== index),
    });
  };

  const addCustomField = () => {
    if (newCustomField.key.trim() && newCustomField.label.trim()) {
      const field: CustomField = {
        key: newCustomField.key.trim(),
        label: newCustomField.label.trim(),
        labelRu: newCustomField.labelRu.trim() || undefined,
        labelZh: newCustomField.labelZh.trim() || undefined,
        type: newCustomField.type,
        position: formData.customFields.length + 1,
      };
      setFormData({
        ...formData,
        customFields: [...formData.customFields, field],
      });
      setNewCustomField({
        key: "",
        label: "",
        labelRu: "",
        labelZh: "",
        type: "textarea",
      });
    }
  };

  const removeCustomField = (index: number) => {
    const updated = formData.customFields.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      customFields: updated.map((f, i) => ({ ...f, position: i + 1 })),
    });
  };

  const moveCustomField = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.customFields.length) return;
    
    const updated = [...formData.customFields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setFormData({
      ...formData,
      customFields: updated.map((f, i) => ({ ...f, position: i + 1 })),
    });
  };

  const moveTemplate = (template: StageTemplate, direction: "up" | "down") => {
    const sorted = [...(templates || [])].sort((a, b) => a.position - b.position);
    const currentIndex = sorted.findIndex(t => t.id === template.id);
    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    
    if (newIndex < 0 || newIndex >= sorted.length) return;
    
    const otherTemplate = sorted[newIndex];
    
    reorderMutation.mutate({ id: template.id, newPosition: otherTemplate.position });
    reorderMutation.mutate({ id: otherTemplate.id, newPosition: template.position });
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
            {t("admin.stageTemplates.description")}
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
                  className={`flex items-center gap-4 p-4 transition-colors ${
                    template.isActive === false ? "opacity-50 bg-muted/30" : "hover:bg-muted/50"
                  }`}
                  data-testid={`row-template-${template.id}`}
                >
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveTemplate(template, "up")}
                      disabled={index === 0}
                      data-testid={`button-move-up-${template.id}`}
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium">{template.position}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => moveTemplate(template, "down")}
                      disabled={index === sortedTemplates.length - 1}
                      data-testid={`button-move-down-${template.id}`}
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{template.name}</p>
                      {template.isActive === false && (
                        <Badge variant="secondary" className="text-xs">
                          {t("admin.stageTemplates.inactive")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {template.nameRu && (
                        <span className="text-xs text-muted-foreground">
                          RU: {template.nameRu}
                        </span>
                      )}
                      {template.hasChecklist && (
                        <Badge variant="outline" className="text-xs">
                          <CheckSquare className="h-3 w-3 mr-1" />
                          {t("admin.stageTemplates.hasChecklist")}
                        </Badge>
                      )}
                      {(template.customFields as CustomField[])?.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {(template.customFields as CustomField[]).length} {t("admin.stageTemplates.fields")}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={template.isActive !== false}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: template.id, isActive: checked })
                      }
                      data-testid={`switch-active-${template.id}`}
                    />
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
              <p className="text-muted-foreground mb-4">{t("admin.stageTemplates.noTemplates")}</p>
              <Button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("admin.stageTemplates.addFirst")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t("admin.stageTemplates.edit") : t("admin.stageTemplates.add")}
            </DialogTitle>
            <DialogDescription>
              {t("admin.stageTemplates.configureSettings")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-4">
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
                <Label htmlFor="is-active">{t("admin.stageTemplates.activeByDefault")}</Label>
                <Switch
                  id="is-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                  data-testid="switch-is-active"
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
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

              {formData.hasChecklist && (
                <div className="space-y-3 pl-4 border-l-2 border-muted">
                  <Label>{t("admin.stageTemplates.checklistItems")}</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder={t("admin.stageTemplates.itemKey")}
                      onKeyDown={(e) => e.key === "Enter" && addChecklistItem()}
                      data-testid="input-new-checklist-item"
                    />
                    <Button type="button" onClick={addChecklistItem} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {formData.checklistItems.length > 0 && (
                    <div className="space-y-2">
                      {formData.checklistItems.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <span className="text-sm flex-1">{item}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => removeChecklistItem(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>{t("admin.stageTemplates.customFields")}</Label>
              </div>
              
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <Label className="text-xs text-muted-foreground">{t("admin.stageTemplates.addField")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={newCustomField.key}
                    onChange={(e) => setNewCustomField({ ...newCustomField, key: e.target.value })}
                    placeholder={t("admin.stageTemplates.fieldKey")}
                    data-testid="input-field-key"
                  />
                  <Input
                    value={newCustomField.label}
                    onChange={(e) => setNewCustomField({ ...newCustomField, label: e.target.value })}
                    placeholder={t("admin.stageTemplates.fieldLabel")} 
                    data-testid="input-field-label"
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={newCustomField.labelRu}
                    onChange={(e) => setNewCustomField({ ...newCustomField, labelRu: e.target.value })}
                    placeholder="Название (RU)"
                  />
                  <Input
                    value={newCustomField.labelZh}
                    onChange={(e) => setNewCustomField({ ...newCustomField, labelZh: e.target.value })}
                    placeholder="标签 (ZH)"
                  />
                  <Select
                    value={newCustomField.type}
                    onValueChange={(value: "text" | "textarea" | "number") =>
                      setNewCustomField({ ...newCustomField, type: value })
                    }
                  >
                    <SelectTrigger data-testid="select-field-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">{t("admin.stageTemplates.fieldTypeText")}</SelectItem>
                      <SelectItem value="textarea">{t("admin.stageTemplates.fieldTypeTextarea")}</SelectItem>
                      <SelectItem value="number">{t("admin.stageTemplates.fieldTypeNumber")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" onClick={addCustomField} size="sm" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("admin.stageTemplates.addFieldButton")}
                </Button>
              </div>

              {formData.customFields.length > 0 && (
                <div className="space-y-2">
                  {formData.customFields.map((field, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-background border rounded">
                      <div className="flex flex-col items-center gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => moveCustomField(index, "up")}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground">{field.position}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => moveCustomField(index, "down")}
                          disabled={index === formData.customFields.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{field.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {field.key} • {field.type}
                          {field.labelRu && ` • RU: ${field.labelRu}`}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCustomField(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
