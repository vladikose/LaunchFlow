import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { z } from "zod";
import type { User } from "@shared/schema";

const objectStorageService = new ObjectStorageService();

function getUser(req: Request): User | null {
  const user = req.user as any;
  if (!user?.claims?.sub) return null;
  return {
    id: user.claims.sub,
    email: user.claims.email || null,
    firstName: user.claims.first_name || null,
    lastName: user.claims.last_name || null,
    profileImageUrl: user.claims.profile_image_url || null,
    companyId: null,
    role: null,
    createdAt: null,
    updatedAt: null,
  };
}

const DEFAULT_STAGE_TEMPLATES = [
  { 
    name: "Render", 
    nameRu: "Рендер", 
    nameZh: "渲染图", 
    position: 1, 
    hasChecklist: false,
    checklistItems: null,
    hasConditionalSubstages: false,
    conditionalSubstages: null,
    acceptedFileTypes: "image/*",
  },
  { 
    name: "3D Model", 
    nameRu: "3D-модель", 
    nameZh: "3D模型", 
    position: 2, 
    hasChecklist: false,
    checklistItems: null,
    hasConditionalSubstages: false,
    conditionalSubstages: null,
    acceptedFileTypes: ".step,.stp,.stl",
  },
  { 
    name: "3D Print", 
    nameRu: "Печать 3D-модели", 
    nameZh: "3D打印", 
    position: 3, 
    hasChecklist: false,
    checklistItems: null,
    hasConditionalSubstages: false,
    conditionalSubstages: null,
  },
  { 
    name: "Technical Description", 
    nameRu: "Техническое описание", 
    nameZh: "技术说明", 
    position: 4, 
    hasChecklist: false,
    checklistItems: null,
    hasConditionalSubstages: false,
    conditionalSubstages: null,
    description: "Функционал, комплектация, состав",
  },
  { 
    name: "Factory Proposal", 
    nameRu: "Предложение от завода", 
    nameZh: "工厂报价", 
    position: 5, 
    hasChecklist: false,
    checklistItems: null,
    hasConditionalSubstages: false,
    conditionalSubstages: null,
  },
  { 
    name: "Tooling", 
    nameRu: "Оснастка", 
    nameZh: "模具", 
    position: 6, 
    hasChecklist: false,
    checklistItems: null,
    hasConditionalSubstages: false,
    conditionalSubstages: null,
  },
  { 
    name: "Sample", 
    nameRu: "Образец", 
    nameZh: "样品", 
    position: 7, 
    hasChecklist: false,
    checklistItems: null,
    hasConditionalSubstages: false,
    conditionalSubstages: null,
  },
  { 
    name: "Order Placement", 
    nameRu: "Размещение заказа", 
    nameZh: "下单", 
    position: 8, 
    hasChecklist: false,
    checklistItems: null,
    hasConditionalSubstages: false,
    conditionalSubstages: null,
  },
  { 
    name: "Documentation Checklist", 
    nameRu: "Получение документации", 
    nameZh: "文档清单", 
    position: 9, 
    hasChecklist: true,
    checklistItems: ["explosionDiagram", "productDrawing", "boxDrawing"],
    hasConditionalSubstages: false,
    conditionalSubstages: null,
  },
  { 
    name: "Packaging Checklist", 
    nameRu: "Подготовка упаковки", 
    nameZh: "包装清单", 
    position: 10, 
    hasChecklist: true,
    checklistItems: ["box", "instruction", "externalSticker", "internalSticker"],
    hasConditionalSubstages: false,
    conditionalSubstages: null,
  },
  { 
    name: "Certification", 
    nameRu: "Сертификация", 
    nameZh: "认证", 
    position: 11, 
    hasChecklist: false,
    checklistItems: null,
    hasConditionalSubstages: true,
    conditionalSubstages: ["application", "sampleShipping", "certificateReceived"],
  },
  { 
    name: "First Shipment", 
    nameRu: "Отправка первой партии", 
    nameZh: "首批发货", 
    position: 12, 
    hasChecklist: true,
    checklistItems: ["boxPhoto", "hsCode", "catalogPage"],
    hasConditionalSubstages: false,
    conditionalSubstages: null,
  },
  { 
    name: "Distribution Preparation", 
    nameRu: "Подготовка к рассылке", 
    nameZh: "分销准备", 
    position: 13, 
    hasChecklist: true,
    checklistItems: ["video", "render", "price", "websiteDescription", "videoDescription", "mailingText"],
    hasConditionalSubstages: false,
    conditionalSubstages: null,
  },
];

async function ensureStageTemplates(companyId: string): Promise<void> {
  const existingTemplates = await storage.getStageTemplatesByCompany(companyId);
  if (existingTemplates.length === 0) {
    for (const template of DEFAULT_STAGE_TEMPLATES) {
      await storage.createStageTemplate({
        companyId,
        name: template.name,
        nameRu: template.nameRu,
        nameZh: template.nameZh,
        position: template.position,
        hasChecklist: template.hasChecklist,
        checklistItems: template.checklistItems,
        hasConditionalSubstages: template.hasConditionalSubstages,
        conditionalSubstages: template.conditionalSubstages,
        isActive: true,
      });
    }
  }
}

async function ensureUserCompany(userId: string): Promise<string> {
  const user = await storage.getUser(userId);
  if (user?.companyId) {
    // Ensure existing company has stage templates
    await ensureStageTemplates(user.companyId);
    return user.companyId;
  }
  const company = await storage.createCompany({ name: "My Company" });
  await storage.updateUser(userId, { companyId: company.id, role: "admin" });
  
  // Seed default stage templates for the new company
  await ensureStageTemplates(company.id);
  
  return company.id;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/auth/user", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser(authUser.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/users", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error getting users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.patch("/api/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const currentUser = await storage.getUser(authUser.id);
      if (currentUser?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const user = await storage.updateUser(req.params.id, req.body);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dashboard/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const companyId = await ensureUserCompany(authUser.id);
      const stats = await storage.getDashboardStats(companyId);
      res.json(stats);
    } catch (error) {
      console.error("Error getting dashboard stats:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const companyId = await ensureUserCompany(authUser.id);
      const projects = await storage.getProjectsByCompany(companyId);
      res.json(projects);
    } catch (error) {
      console.error("Error getting projects:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error getting project:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const createProjectSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    responsibleUserId: z.string().optional(),
    deadline: z.string().optional(),
    products: z.array(
      z.object({
        article: z.string().optional(),
        name: z.string().min(1),
        barcode: z.string().optional(),
      })
    ).optional(),
  });

  app.post("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const companyId = await ensureUserCompany(authUser.id);
      
      const validatedData = createProjectSchema.parse(req.body);
      
      const project = await storage.createProject({
        companyId,
        name: validatedData.name,
        description: validatedData.description || null,
        responsibleUserId: validatedData.responsibleUserId || null,
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
        createdById: authUser.id,
      });

      if (validatedData.products && validatedData.products.length > 0) {
        for (const product of validatedData.products) {
          if (product.name.trim()) {
            await storage.createProduct({
              projectId: project.id,
              article: product.article || null,
              name: product.name,
              barcode: product.barcode || null,
            });
          }
        }
      }

      const templates = await storage.getStageTemplatesByCompany(companyId);
      for (const template of templates) {
        await storage.createStage({
          projectId: project.id,
          templateId: template.id,
          name: template.name,
          position: template.position,
          status: "waiting",
          startDate: null,
          deadline: null,
          checklistData: template.hasChecklist ? {} : null,
          conditionalEnabled: false,
          conditionalSubstagesData: null,
        });
      }

      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const validatedData = createProjectSchema.parse(req.body);
      
      const project = await storage.updateProject(req.params.id, {
        name: validatedData.name,
        description: validatedData.description || null,
        responsibleUserId: validatedData.responsibleUserId || null,
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (validatedData.products) {
        await storage.deleteProductsByProject(project.id);
        for (const product of validatedData.products) {
          if (product.name.trim()) {
            await storage.createProduct({
              projectId: project.id,
              article: product.article || null,
              name: product.name,
              barcode: product.barcode || null,
            });
          }
        }
      }

      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/projects/:id/generate-stages", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const existingStages = await storage.getStagesByProject(project.id);
      if (existingStages.length > 0) {
        return res.status(400).json({ message: "Project already has stages" });
      }

      const templates = await storage.getStageTemplatesByCompany(project.companyId);
      
      const uniqueTemplates = templates.reduce((acc, template) => {
        const existingPos = acc.find(t => t.position === template.position);
        if (!existingPos) {
          acc.push(template);
        }
        return acc;
      }, [] as typeof templates);

      for (const template of uniqueTemplates) {
        // Initialize checklistData with all items set to false
        let checklistData: Record<string, boolean> | null = null;
        if (template.hasChecklist && template.checklistItems) {
          checklistData = {};
          for (const item of template.checklistItems) {
            checklistData[item] = false;
          }
        }
        
        // Initialize conditionalSubstagesData with all substages set to false
        let conditionalSubstagesData: Record<string, boolean> | null = null;
        if (template.hasConditionalSubstages && template.conditionalSubstages) {
          conditionalSubstagesData = {};
          for (const substage of template.conditionalSubstages) {
            conditionalSubstagesData[substage] = false;
          }
        }
        
        await storage.createStage({
          projectId: project.id,
          templateId: template.id,
          name: template.name,
          position: template.position,
          status: "waiting",
          startDate: null,
          deadline: null,
          checklistData,
          conditionalEnabled: false,
          conditionalSubstagesData,
        });
      }

      const updatedProject = await storage.getProjectById(project.id);
      res.json(updatedProject);
    } catch (error) {
      console.error("Error generating stages:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const updateStageSchema = z.object({
    status: z.enum(["waiting", "in_progress", "skip", "completed"]).optional(),
    startDate: z.string().optional().nullable(),
    deadline: z.string().optional().nullable(),
    checklistData: z.record(z.any()).optional().nullable(),
    conditionalEnabled: z.boolean().optional(),
    conditionalSubstagesData: z.record(z.any()).optional().nullable(),
  });

  app.patch("/api/stages/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const existingStage = await storage.getStageById(req.params.id);
      if (!existingStage) {
        return res.status(404).json({ message: "Stage not found" });
      }

      const validatedData = updateStageSchema.parse(req.body);
      const { status, ...otherData } = validatedData;
      
      if (status && status !== existingStage.status) {
        await storage.createStatusHistory({
          stageId: req.params.id,
          oldStatus: existingStage.status,
          newStatus: status,
          changedById: authUser.id,
        });
      }

      const updateData: any = { ...otherData };
      if (status) updateData.status = status;
      if (otherData.startDate) updateData.startDate = new Date(otherData.startDate);
      if (otherData.deadline) updateData.deadline = new Date(otherData.deadline);

      const stage = await storage.updateStage(req.params.id, updateData);
      res.json(stage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating stage:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const updateDeadlineSchema = z.object({
    deadline: z.string().optional().nullable(),
    reason: z.string().min(1, "Reason is required"),
  });

  app.patch("/api/stages/:id/deadline", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validatedData = updateDeadlineSchema.parse(req.body);

      const existingStage = await storage.getStageById(req.params.id);
      if (!existingStage) {
        return res.status(404).json({ message: "Stage not found" });
      }

      await storage.createDeadlineHistory({
        stageId: req.params.id,
        oldDeadline: existingStage.deadline,
        newDeadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
        reason: validatedData.reason,
        changedById: authUser.id,
      });

      const stage = await storage.updateStage(req.params.id, {
        deadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
      });

      res.json(stage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating stage deadline:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/stages/:id/history", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const statusHistory = await storage.getStatusHistoryByStage(req.params.id);
      const deadlineHistory = await storage.getDeadlineHistoryByStage(req.params.id);

      res.json({ statusHistory, deadlineHistory });
    } catch (error) {
      console.error("Error getting stage history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const createCommentSchema = z.object({
    content: z.string().min(1, "Content is required"),
  });

  app.post("/api/stages/:id/comments", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validatedData = createCommentSchema.parse(req.body);

      const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
      const mentions: string[] = [];
      let match;
      while ((match = mentionRegex.exec(validatedData.content)) !== null) {
        mentions.push(match[2]);
      }

      const comment = await storage.createComment({
        stageId: req.params.id,
        userId: authUser.id,
        content: validatedData.content,
        mentions: mentions.length > 0 ? mentions : null,
      });

      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const createTaskSchema = z.object({
    description: z.string().min(1, "Description is required"),
    assignedToId: z.string().min(1, "Assignee is required"),
  });

  app.post("/api/stages/:id/tasks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validatedData = createTaskSchema.parse(req.body);

      const task = await storage.createTask({
        stageId: req.params.id,
        description: validatedData.description,
        assignedToId: validatedData.assignedToId,
        assignedById: authUser.id,
        completed: false,
      });

      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/tasks", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const tasks = await storage.getTasksByAssignee(authUser.id);
      res.json(tasks);
    } catch (error) {
      console.error("Error getting tasks:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const updateTaskSchema = z.object({
    description: z.string().optional(),
    completed: z.boolean().optional(),
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const validatedData = updateTaskSchema.parse(req.body);
      const updateData: any = { ...validatedData };
      if (updateData.completed) {
        updateData.completedAt = new Date();
      }
      
      const task = await storage.updateTask(req.params.id, updateData);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/stage-templates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const companyId = await ensureUserCompany(authUser.id);
      const templates = await storage.getStageTemplatesByCompany(companyId);
      res.json(templates);
    } catch (error) {
      console.error("Error getting stage templates:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const createTemplateSchema = z.object({
    name: z.string().min(1),
    nameRu: z.string().optional(),
    nameZh: z.string().optional(),
    description: z.string().optional(),
    position: z.number(),
    hasChecklist: z.boolean().optional(),
    checklistItems: z.array(z.string()).optional(),
  });

  app.post("/api/stage-templates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(authUser.id);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const companyId = await ensureUserCompany(authUser.id);
      const validatedData = createTemplateSchema.parse(req.body);
      
      const template = await storage.createStageTemplate({
        companyId,
        name: validatedData.name,
        nameRu: validatedData.nameRu || null,
        nameZh: validatedData.nameZh || null,
        description: validatedData.description || null,
        position: validatedData.position,
        hasChecklist: validatedData.hasChecklist || false,
        checklistItems: validatedData.checklistItems || null,
        hasConditionalSubstages: false,
        conditionalSubstages: null,
        isActive: true,
      });

      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating stage template:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/stage-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(authUser.id);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const validatedData = createTemplateSchema.parse(req.body);
      
      const template = await storage.updateStageTemplate(req.params.id, {
        name: validatedData.name,
        nameRu: validatedData.nameRu || null,
        nameZh: validatedData.nameZh || null,
        description: validatedData.description || null,
        position: validatedData.position,
        hasChecklist: validatedData.hasChecklist || false,
        checklistItems: validatedData.checklistItems || null,
      });

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating stage template:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.delete("/api/stage-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(authUser.id);
      if (user?.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      await storage.deleteStageTemplate(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting stage template:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Stage file upload - get signed URL for upload
  app.get("/api/stages/:id/upload-url", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Verify stage exists and user has access
      const stage = await storage.getStageById(req.params.id);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }
      
      const project = await storage.getProjectById(stage.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const user = await storage.getUser(authUser.id);
      if (!user || user.companyId !== project.companyId) {
        return res.status(403).json({ message: "Access denied to this stage" });
      }
      
      const fileName = req.query.fileName as string;
      if (!fileName) {
        return res.status(400).json({ message: "fileName query parameter required" });
      }
      
      const url = await objectStorageService.getObjectEntityUploadURL();
      res.json({ url, fileName });
    } catch (error) {
      console.error("Error getting stage file upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // File type validation helper
  function validateFileType(fileName: string, stageName: string): { valid: boolean; message?: string } {
    const ext = fileName.toLowerCase().split('.').pop() || '';
    
    // Stage-specific file type rules
    if (stageName === 'Render') {
      const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
      if (!imageExts.includes(ext)) {
        return { valid: false, message: 'Render stage requires image files (jpg, png, gif, webp, svg)' };
      }
    }
    
    if (stageName === '3D Model') {
      const stepExts = ['step', 'stp', 'stl'];
      if (!stepExts.includes(ext)) {
        return { valid: false, message: '3D Model stage requires STEP/STP/STL files' };
      }
    }
    
    return { valid: true };
  }
  
  // Stage file record - create database record after upload
  const createStageFileSchema = z.object({
    fileName: z.string().min(1, "File name is required"),
    fileUrl: z.string().min(1, "File URL is required"),
    fileType: z.string().optional(),
    fileSize: z.number().optional(),
    checklistItemKey: z.string().optional(),
  });

  app.post("/api/stages/:id/files", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Verify stage exists and user has access
      const stage = await storage.getStageById(req.params.id);
      if (!stage) {
        return res.status(404).json({ message: "Stage not found" });
      }
      
      const project = await storage.getProjectById(stage.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const user = await storage.getUser(authUser.id);
      if (!user || user.companyId !== project.companyId) {
        return res.status(403).json({ message: "Access denied to this stage" });
      }
      
      const validatedData = createStageFileSchema.parse(req.body);
      
      // Validate file type based on stage
      const fileTypeValidation = validateFileType(validatedData.fileName, stage.name);
      if (!fileTypeValidation.valid) {
        return res.status(400).json({ message: fileTypeValidation.message });
      }
      
      const file = await storage.createStageFile({
        stageId: req.params.id,
        fileName: validatedData.fileName,
        fileUrl: validatedData.fileUrl,
        fileType: validatedData.fileType || null,
        fileSize: validatedData.fileSize || null,
        uploadedById: authUser.id,
        version: 1,
        isLatest: true,
        checklistItemKey: validatedData.checklistItemKey || null,
      });
      
      res.status(201).json(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating stage file record:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/objects/upload-url", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const url = await objectStorageService.getObjectEntityUploadURL();
      res.json({ url });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  app.get("/objects/*", async (req: Request, res: Response) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ message: "Object not found" });
      } else {
        console.error("Error downloading object:", error);
        res.status(500).json({ message: "Failed to download object" });
      }
    }
  });

  app.get("/public/*", async (req: Request, res: Response) => {
    try {
      const filePath = req.path.replace(/^\/public\//, "");
      const objectFile = await objectStorageService.searchPublicObject(filePath);
      if (!objectFile) {
        return res.status(404).json({ message: "File not found" });
      }
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving public file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  return httpServer;
}
