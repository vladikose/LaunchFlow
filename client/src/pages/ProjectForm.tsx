import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import type { User, Project, Product } from "@shared/schema";

const productSchema = z.object({
  article: z.string().optional(),
  name: z.string(),
  quantity: z.coerce.number().optional(),
});

const projectFormSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  responsibleUserId: z.string().optional(),
  deadline: z.string().optional(),
  products: z.array(productSchema).optional().default([]),
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

  const { data: existingProject, isLoading: projectLoading } = useQuery<Project & { products?: Product[] }>({
    queryKey: ["/api/projects", projectId],
    enabled: isEdit,
  });

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: "",
      description: "",
      responsibleUserId: "",
      deadline: "",
      products: [],
    },
    values: existingProject
      ? {
          name: existingProject.name,
          description: existingProject.description || "",
          responsibleUserId: existingProject.responsibleUserId || "",
          deadline: existingProject.deadline
            ? new Date(existingProject.deadline).toISOString().split("T")[0]
            : "",
          products: existingProject.products?.length
            ? existingProject.products.map((p) => ({
                article: p.article || "",
                name: p.name,
                quantity: p.quantity || undefined,
              }))
            : [],
        }
      : undefined,
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "products",
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      return apiRequest("POST", "/api/projects", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project created successfully" });
      navigate("/projects");
    },
    onError: (error: Error) => {
      toast({ title: "Error creating project", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProjectFormValues) => {
      return apiRequest("PUT", `/api/projects/${projectId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects", projectId] });
      toast({ title: "Project updated successfully" });
      navigate(`/projects/${projectId}`);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating project", description: error.message, variant: "destructive" });
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
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} data-testid="button-back">
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>{t("projects.products")}</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ article: "", name: "", quantity: undefined })}
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
                    <div>{t("projects.quantity")}</div>
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
                      name={`products.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="md:hidden">{t("projects.quantity")}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Qty"
                              data-testid={`input-product-quantity-${index}`}
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

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
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
    </div>
  );
}
