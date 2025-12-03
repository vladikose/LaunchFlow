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

async function ensureUserCompany(userId: string): Promise<string> {
  const user = await storage.getUser(userId);
  if (user?.companyId) {
    return user.companyId;
  }
  const company = await storage.createCompany({ name: "My Company" });
  await storage.updateUser(userId, { companyId: company.id, role: "admin" });
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
        quantity: z.number().optional(),
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
              quantity: product.quantity || null,
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
              quantity: product.quantity || null,
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
