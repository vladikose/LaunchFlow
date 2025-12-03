import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useRoute, useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StageCard } from "@/components/StageCard";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Edit,
  Calendar,
  User,
  Package,
  Layers,
  AlertTriangle,
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

  const { data: project, isLoading } = useQuery<ProjectWithDetails>({
    queryKey: ["/api/projects", projectId],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
  });

  const isOverdue = project?.deadline && new Date(project.deadline) < new Date();

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-64 w-full" />
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
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold">{project.name}</h1>
              {isOverdue && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {t("projects.status.overdue")}
                </Badge>
              )}
            </div>
            {project.description && (
              <p className="text-muted-foreground mt-1">{project.description}</p>
            )}
          </div>
        </div>
        <Button asChild variant="outline" data-testid="button-edit-project">
          <Link href={`/projects/${projectId}/edit`}>
            <Edit className="h-4 w-4 mr-2" />
            {t("common.edit")}
          </Link>
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("projects.responsible")}</p>
              <p className="font-medium">
                {project.responsibleUser
                  ? `${project.responsibleUser.firstName || ""} ${project.responsibleUser.lastName || ""}`.trim() ||
                    project.responsibleUser.email
                  : "Not assigned"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("projects.deadline")}</p>
              <p className={`font-medium ${isOverdue ? "text-red-600 dark:text-red-400" : ""}`}>
                {project.deadline
                  ? new Date(project.deadline).toLocaleDateString()
                  : "Not set"}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("projects.products")}</p>
              <p className="font-medium">{project.products?.length || 0} items</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline" data-testid="tab-timeline">
            <Layers className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">
            <Package className="h-4 w-4 mr-2" />
            {t("projects.products")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-0">
          <div className="relative">
            <div className="absolute left-[27px] top-0 bottom-0 w-0.5 bg-border" />
            <div className="space-y-6">
              {project.stages && project.stages.length > 0 ? (
                project.stages
                  .sort((a, b) => a.position - b.position)
                  .map((stage, index) => (
                    <StageCard
                      key={stage.id}
                      stage={stage}
                      projectId={projectId!}
                      users={users || []}
                      isLast={index === project.stages!.length - 1}
                    />
                  ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Layers className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No stages yet</h3>
                    <p className="text-muted-foreground">
                      Stages will be created based on the project templates.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>{t("projects.products")}</CardTitle>
            </CardHeader>
            <CardContent>
              {project.products && project.products.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("projects.article")}</TableHead>
                      <TableHead>{t("projects.productName")}</TableHead>
                      <TableHead className="text-right">{t("projects.barcode")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {project.products.map((product) => (
                      <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                        <TableCell className="font-mono text-sm">
                          {product.article || "-"}
                        </TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{product.barcode || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4" />
                  <p>No products added to this project</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
