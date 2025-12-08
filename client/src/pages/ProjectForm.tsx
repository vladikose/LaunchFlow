import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Plus, Trash2, Save, Layers, AlertTriangle } from "lucide-react";
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
import type { User, Project, Product, Factory, ProductType, StageTemplate, Stage } from "@shared/schema";

const productSchema = z.object({
  article: z.string().optional(),
  name: z.string(),
  barcode: z.string().optional(),
});

const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  responsibleUserId: z.string().optional(),
  factoryId: z.string().optional(),
  productTypeId: z.string().optional(),
  deadline: z.string().optional(),
  products: z.array(productSchema).optional().default([]),
  excludedTemplateIds: z.array(z.string()).optional().default([]),
});

type ProjectFormValues = z.infer<typeof projectFormSchema>;

export default function ProjectForm() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/projects/:id/edit");
  const isEdit = !!params?.id;
  const projectId = params?.id;
  const { toast } = useToast();

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: factories, isLoading: factoriesLoading } = useQuery<Factory[]>({
    queryKey: ["/api/factories"],
  });

  const { data: productTypes, isLoading: productTypesLoading } = useQuery<ProductType[]>({
    queryKey: ["/api/product-types"],
  });

  const { data: stageTemplates, isLoading: templatesLoading } = useQuery<StageTemplate[]>({
    queryKey: ["/api/stage-templates"],
  });

  const { data: existingProject, isLoading: projectLoading } = useQuery<Project & { products?: Product[], stages?: Stage[] }>({
    queryKey: ["/api/projects", projectId],
    enabled: isEdit,
  });

  const [excludedTemplateIds, setExcludedTemplateIds] = useState<string[]>([]);
  const [stagesToAdd, setStagesToAdd] = useState<string[]>([]);
  const [stagesToRemove, setStagesToRemove] = useState<string[]>([]);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [pendingRemoveTemplateId, setPendingRemoveTemplateId] = useState<string | null>(null);

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      responsibleUserId: "",
      factoryId: "",
      productTypeId: "",
      deadline: "",
      products: [],
      excludedTemplateIds: [],
    },
    values: existingProject
      ? {
          name: existingProject.name,
          description: existingProject.description || "",
          responsibleUserId: existingProject.responsibleUserId || "",
          factoryId: existingProject.factoryId || "",
          productTypeId: existingProject.productTypeId || "",
          deadline: existingProject.deadline
            ? new Date(existingProject.deadline).toISOString().split("T")[0]
            : "",
          products: existingProject.products?.length
            ? existingProject.products.map((p) => ({
                article: p.article || "",
                name: p.name,
                barcode: p.barcode || "",
              }))
            : [],
          excludedTemplateIds: [],
        }
      : undefined,
  });

  const sortedTemplates = useMemo(() => {
    if (!stageTemplates) return [];
    return [...stageTemplates]
      .filter(t => t.isActive !== false)
      .sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [stageTemplates]);

  const existingTemplateIds = useMemo(() => {
    if (!existingProject?.stages) return new Set<string>();
    return new Set(existingProject.stages.map(s => s.templateId).filter(Boolean) as string[]);
  }, [existingProject?.stages]);

  const templateToStageId = useMemo(() => {
    if (!existingProject?.stages) return new Map<string, string>();
    const map = new Map<string, string>();
    existingProject.stages.forEach(s => {
      if (s.templateId) {
        map.set(s.templateId, s.id);
      }
    });
    return map;
  }, [existingProject?.stages]);

  const toggleTemplateExclusion = (templateId: string) => {
    setExcludedTemplateIds(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const toggleStageToAdd = (templateId: string) => {
    setStagesToAdd(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleExistingStageToggle = (templateId: string) => {
    const isMarkedForRemoval = stagesToRemove.includes(templateId);
    if (isMarkedForRemoval) {
      setStagesToRemove(prev => prev.filter(id => id !== templateId));
    } else {
      setPendingRemoveTemplateId(templateId);
      setShowRemoveConfirm(true);
    }
  };

  const confirmStageRemoval = () => {
    if (pendingRemoveTemplateId) {
      setStagesToRemove(prev => [...prev, pendingRemoveTemplateId]);
    }
    setShowRemoveConfirm(false);
    setPendingRemoveTemplateId(null);
  };

  const getTemplateName = (template: StageTemplate, lang: string) => {
    if (lang === "ru" && template.nameRu) return template.nameRu;
    if (lang === "zh" && template.nameZh) return template.nameZh;
    return template.name;
  };

  const currentLang = t("nav.dashboard") === "Панель управления" ? "ru" : 
                      t("nav.dashboard") === "控制面板" ? "zh" : "en";

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      return apiRequest("POST", "/api/projects", {
        ...data,
        excludedTemplateIds,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: t("projects.createSuccess") });
      navigate("/projects");
    },
    onError: (error: Error) => {
      toast({ title: t("projects.createError"), description: error.message, variant: "destructive" });
    },
  });

  const addStagesMutation = useMutation({
    mutationFn: async (templateIds: string[]) => {
      return apiRequest("POST", `/api/projects/${projectId}/add-stages`, { templateIds });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      await apiRequest("PUT", `/api/projects/${projectId}`, data);
      
      for (const templateId of stagesToRemove) {
        const stageId = templateToStageId.get(templateId);
        if (stageId) {
          await apiRequest("DELETE", `/api/stages/${stageId}`);
        }
      }
      
      if (stagesToAdd.length > 0) {
        await addStagesMutation.mutateAsync(stagesToAdd);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: t("projects.updateSuccess") });
      navigate(`/projects/${projectId}`);
    },
    onError: (error: Error) => {
      toast({ title: t("projects.updateError"), description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ProjectFormValues) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isEdit && projectLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} data-testid="button-back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-semibold">
            {isEdit ? "Edit Project" : t("projects.create")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEdit ? "Update project details" : "Create a new product launch project"}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("projects.name")} *</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-project-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("projects.description")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} data-testid="input-project-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="responsibleUserId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("projects.responsible")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-responsible">
                            <SelectValue placeholder="Select responsible person" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {usersLoading ? (
                            <div className="p-2">
                              <Skeleton className="h-8 w-full" />
                            </div>
                          ) : (
                            users?.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.firstName && user.lastName
                                  ? `${user.firstName} ${user.lastName}`
                                  : user.email}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("projects.deadline")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-deadline" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="factoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("projects.factory")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-factory">
                            <SelectValue placeholder={t("projects.selectFactory")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {factoriesLoading ? (
                            <div className="p-2">
                              <Skeleton className="h-8 w-full" />
                            </div>
                          ) : (
                            factories?.map((factory) => (
                              <SelectItem key={factory.id} value={factory.id}>
                                {factory.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="productTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("projects.productType")}</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-product-type">
                            <SelectValue placeholder={t("projects.selectProductType")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {productTypesLoading ? (
                            <div className="p-2">
                              <Skeleton className="h-8 w-full" />
                            </div>
                          ) : (
                            productTypes?.map((pt) => (
                              <SelectItem key={pt.id} value={pt.id}>
                                {pt.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>{t("projects.products")}</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ article: "", name: "", barcode: "" })}
                data-testid="button-add-product"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("projects.addProduct")}
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.length > 0 && (
                  <div className="hidden md:grid md:grid-cols-[1fr_2fr_1fr_auto] gap-4 text-sm font-medium text-muted-foreground">
                    <div>{t("projects.article")}</div>
                    <div>{t("projects.productName")}</div>
                    <div>{t("projects.barcode")}</div>
                    <div className="w-10"></div>
                  </div>
                )}
                {fields.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No products added yet. Click "Add Product" to add products to this project.</p>
                  </div>
                )}
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-4 md:grid-cols-[1fr_2fr_1fr_auto] items-start p-4 md:p-0 rounded-lg md:rounded-none bg-muted/50 md:bg-transparent"
                  >
                    <FormField
                      control={form.control}
                      name={`products.${index}.article`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="md:hidden">{t("projects.article")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Article"
                              data-testid={`input-product-article-${index}`}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`products.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="md:hidden">{t("projects.productName")} *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Product name"
                              data-testid={`input-product-name-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`products.${index}.barcode`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="md:hidden">{t("projects.barcode")}</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Barcode"
                              data-testid={`input-product-barcode-${index}`}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="mt-6 md:mt-0"
                      data-testid={`button-remove-product-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                <CardTitle>{t("projects.stageSelection")}</CardTitle>
              </div>
              <CardDescription>
                {isEdit 
                  ? t("projects.stageSelectionDescriptionEdit") 
                  : t("projects.stageSelectionDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : sortedTemplates.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  {t("projects.noStageTemplates")}
                </p>
              ) : (
                <div className="space-y-2">
                  {sortedTemplates.map((template, index) => {
                    const isExisting = existingTemplateIds.has(template.id);
                    const isExcluded = excludedTemplateIds.includes(template.id);
                    const isSelectedToAdd = stagesToAdd.includes(template.id);
                    const isMarkedForRemoval = stagesToRemove.includes(template.id);
                    
                    if (isEdit) {
                      const getRowStyle = () => {
                        if (isMarkedForRemoval) {
                          return "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900";
                        }
                        if (isExisting) {
                          return "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900";
                        }
                        if (isSelectedToAdd) {
                          return "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900";
                        }
                        return "bg-muted/30 border-dashed opacity-60";
                      };

                      return (
                        <div
                          key={template.id}
                          className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${getRowStyle()}`}
                          data-testid={`stage-template-${template.id}`}
                        >
                          <Checkbox
                            id={`template-${template.id}`}
                            checked={(isExisting && !isMarkedForRemoval) || isSelectedToAdd}
                            onCheckedChange={() => {
                              if (isExisting) {
                                handleExistingStageToggle(template.id);
                              } else {
                                toggleStageToAdd(template.id);
                              }
                            }}
                            data-testid={`checkbox-template-${template.id}`}
                          />
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className={`flex-shrink-0 w-6 h-6 rounded-full text-xs font-medium flex items-center justify-center ${
                              isMarkedForRemoval
                                ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300"
                                : isExisting 
                                  ? "bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300" 
                                  : "bg-primary/10 text-primary"
                            }`}>
                              {index + 1}
                            </span>
                            <label
                              htmlFor={`template-${template.id}`}
                              className={`font-medium truncate cursor-pointer ${
                                isMarkedForRemoval
                                  ? "text-red-700 dark:text-red-300 line-through"
                                  : isExisting 
                                    ? "text-green-700 dark:text-green-300" 
                                    : !isSelectedToAdd 
                                      ? "text-muted-foreground" 
                                      : ""
                              }`}
                            >
                              {getTemplateName(template, currentLang)}
                            </label>
                            {currentLang !== "en" && template.name && (
                              <span className="text-sm text-muted-foreground truncate hidden sm:inline">
                                ({template.name})
                              </span>
                            )}
                            {isMarkedForRemoval && (
                              <span className="text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">
                                {t("projects.stageToRemove")}
                              </span>
                            )}
                            {isExisting && !isMarkedForRemoval && (
                              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                                {t("projects.stageExists")}
                              </span>
                            )}
                            {isSelectedToAdd && !isExisting && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                                {t("projects.stageToAdd")}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={template.id}
                        className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${
                          isExcluded 
                            ? "bg-muted/30 border-dashed opacity-60" 
                            : "bg-background"
                        }`}
                        data-testid={`stage-template-${template.id}`}
                      >
                        <Checkbox
                          id={`template-${template.id}`}
                          checked={!isExcluded}
                          onCheckedChange={() => toggleTemplateExclusion(template.id)}
                          data-testid={`checkbox-template-${template.id}`}
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
                            {index + 1}
                          </span>
                          <label
                            htmlFor={`template-${template.id}`}
                            className={`font-medium cursor-pointer truncate ${
                              isExcluded ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {getTemplateName(template, currentLang)}
                          </label>
                          {currentLang !== "en" && template.name && (
                            <span className="text-sm text-muted-foreground truncate hidden sm:inline">
                              ({template.name})
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-sm text-muted-foreground mt-4">
                    {isEdit ? (
                      <>
                        {t("projects.existingStagesCount", { count: existingTemplateIds.size - stagesToRemove.length })}
                        {stagesToAdd.length > 0 && (
                          <span className="text-blue-600 dark:text-blue-400 ml-2">
                            (+{stagesToAdd.length} {t("projects.toAdd")})
                          </span>
                        )}
                        {stagesToRemove.length > 0 && (
                          <span className="text-red-600 dark:text-red-400 ml-2">
                            (-{stagesToRemove.length} {t("projects.toRemove")})
                          </span>
                        )}
                      </>
                    ) : (
                      t("projects.selectedStagesCount", { 
                        count: sortedTemplates.length - excludedTemplateIds.length,
                        total: sortedTemplates.length
                      })
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.history.back()}
              data-testid="button-cancel"
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending} data-testid="button-save-project">
              <Save className="h-4 w-4 mr-2" />
              {isPending ? t("common.loading") : t("common.save")}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("projects.confirmStageRemoval")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("projects.confirmStageRemovalDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRemoveTemplateId(null)}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStageRemoval}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("projects.removeStage")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
