import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { randomBytes } from "crypto";
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
    jobTitle: null,
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

async function ensureUserCompany(userId: string): Promise<string | null> {
  const user = await storage.getUser(userId);
  if (user?.companyId) {
    return user.companyId;
  }
  return null;
}

class NoCompanyError extends Error {
  constructor() {
    super("User has no company");
    this.name = "NoCompanyError";
  }
}

async function requireUserCompany(userId: string): Promise<string> {
  const companyId = await ensureUserCompany(userId);
  if (!companyId) {
    throw new NoCompanyError();
  }
  return companyId;
}

function handleRouteError(error: unknown, res: Response, context: string): Response {
  if (error instanceof NoCompanyError) {
    return res.status(403).json({ message: "Please complete onboarding first", code: "NO_COMPANY" });
  }
  console.error(`Error ${context}:`, error);
  return res.status(500).json({ message: "Internal server error" });
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

  app.get("/api/users/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const currentUser = await storage.getUser(authUser.id);
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Superadmin sees all users globally, regular admin sees only company users
      if (currentUser.role === "superadmin") {
        const usersWithStats = await storage.getAllUsersWithStats();
        res.json(usersWithStats);
      } else if (currentUser.role === "admin") {
        const companyId = await requireUserCompany(authUser.id);
        const usersWithStats = await storage.getUsersWithStats(companyId);
        res.json(usersWithStats);
      } else {
        return res.status(403).json({ message: "Admin access required" });
      }
    } catch (error) {
      handleRouteError(error, res, "getting users with stats");
    }
  });

  app.patch("/api/users/me", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const { firstName, lastName, jobTitle, profileImageUrl } = req.body;
      const updateData: Record<string, any> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (jobTitle !== undefined) updateData.jobTitle = jobTitle;
      if (profileImageUrl !== undefined) {
        // Normalize profile image URL to /objects/ path format
        updateData.profileImageUrl = objectStorageService.normalizeObjectEntityPath(profileImageUrl);
      }
      
      const user = await storage.updateUser(authUser.id, updateData);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error updating current user:", error);
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
      if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
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

  // Create new company (for onboarding)
  app.post("/api/companies", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(authUser.id);
      if (user?.companyId) {
        return res.status(400).json({ message: "User already belongs to a company" });
      }
      
      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ message: "Company name is required" });
      }
      
      const company = await storage.createCompany({ name: name.trim() });
      await storage.updateUser(authUser.id, { companyId: company.id, role: "admin" });
      
      await ensureStageTemplates(company.id);
      
      const updatedUser = await storage.getUser(authUser.id);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get current company info
  app.get("/api/company", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const companyId = await requireUserCompany(authUser.id);
      const company = await storage.getCompanyById(companyId);
      res.json(company);
    } catch (error) {
      handleRouteError(error, res, "getting company");
    }
  });

  // Update company info (admin only)
  app.patch("/api/company", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const currentUser = await storage.getUser(authUser.id);
      if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const companyId = await requireUserCompany(authUser.id);
      const { name, logoUrl } = req.body;
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
      
      const company = await storage.updateCompany(companyId, updateData);
      res.json(company);
    } catch (error) {
      handleRouteError(error, res, "updating company");
    }
  });

  // Create invite link (admin only)
  app.post("/api/company/invites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const currentUser = await storage.getUser(authUser.id);
      if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const companyId = await requireUserCompany(authUser.id);
      const { email, role, maxUses } = req.body;
      
      // Generate a unique token
      const token = randomBytes(32).toString("hex");
      
      // Expires in 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const invite = await storage.createCompanyInvite({
        companyId,
        token,
        email: email || null,
        role: role || "user",
        createdById: authUser.id,
        maxUses: maxUses || 1,
        expiresAt,
      });
      
      res.json(invite);
    } catch (error) {
      handleRouteError(error, res, "creating invite");
    }
  });

  // Get all invites for company (admin only)
  app.get("/api/company/invites", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const currentUser = await storage.getUser(authUser.id);
      if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const companyId = await requireUserCompany(authUser.id);
      const invites = await storage.getCompanyInvitesByCompany(companyId);
      res.json(invites);
    } catch (error) {
      handleRouteError(error, res, "getting invites");
    }
  });

  // Delete an invite (admin only)
  app.delete("/api/company/invites/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const currentUser = await storage.getUser(authUser.id);
      if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      await storage.deleteCompanyInvite(req.params.id);
      res.json({ message: "Invite deleted" });
    } catch (error) {
      console.error("Error deleting invite:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Validate invite token (public)
  app.get("/api/invites/:token", async (req: Request, res: Response) => {
    try {
      const invite = await storage.getCompanyInviteByToken(req.params.token);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // Check if invite is exhausted (for limited-use invites)
      const maxUses = invite.maxUses || 1;
      const usedCount = invite.usedCount || 0;
      if (maxUses > 0 && usedCount >= maxUses) {
        return res.status(400).json({ message: "Invite usage limit reached" });
      }
      
      if (new Date() > new Date(invite.expiresAt)) {
        return res.status(400).json({ message: "Invite expired" });
      }
      
      // Get company name for display
      const company = await storage.getCompanyById(invite.companyId);
      res.json({ 
        valid: true, 
        companyName: company?.name,
        email: invite.email,
        role: invite.role,
        maxUses: invite.maxUses,
        usedCount: invite.usedCount,
      });
    } catch (error) {
      console.error("Error validating invite:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Accept invite (authenticated user)
  app.post("/api/invites/:token/accept", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // Check if user already has a company
      const currentUser = await storage.getUser(authUser.id);
      if (currentUser?.companyId) {
        return res.status(400).json({ message: "User already belongs to a company" });
      }
      
      const invite = await storage.getCompanyInviteByToken(req.params.token);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      
      // Check if invite is exhausted (for limited-use invites)
      const maxUses = invite.maxUses || 1;
      const usedCount = invite.usedCount || 0;
      if (maxUses > 0 && usedCount >= maxUses) {
        return res.status(400).json({ message: "Invite usage limit reached" });
      }
      
      if (new Date() > new Date(invite.expiresAt)) {
        return res.status(400).json({ message: "Invite expired" });
      }
      
      // Mark invite as used (increments count)
      await storage.useCompanyInvite(req.params.token, authUser.id);
      
      // Update user with company and role
      const user = await storage.updateUser(authUser.id, {
        companyId: invite.companyId,
        role: invite.role || "user",
      });
      
      if (!user) {
        return res.status(500).json({ message: "Failed to update user" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("Error accepting invite:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Remove user from company (admin only - soft delete)
  app.delete("/api/users/:id/company", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const currentUser = await storage.getUser(authUser.id);
      if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      // Can't remove yourself
      if (req.params.id === authUser.id) {
        return res.status(400).json({ message: "Cannot remove yourself from company" });
      }
      
      const user = await storage.removeUserFromCompany(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json({ message: "User removed from company" });
    } catch (error) {
      console.error("Error removing user from company:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Full delete user (superadmin only - hard delete)
  app.delete("/api/users/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const currentUser = await storage.getUser(authUser.id);
      if (currentUser?.role !== "superadmin") {
        return res.status(403).json({ message: "Superadmin access required" });
      }
      
      // Can't delete yourself
      if (req.params.id === authUser.id) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      
      await storage.deleteUser(req.params.id);
      res.json({ message: "User deleted permanently" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/dashboard/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const companyId = await requireUserCompany(authUser.id);
      const stats = await storage.getDashboardStats(companyId, authUser.id);
      res.json(stats);
    } catch (error) {
      handleRouteError(error, res, "getting dashboard stats");
    }
  });

  app.get("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const companyId = await requireUserCompany(authUser.id);
      const projects = await storage.getProjectsWithStageStatus(companyId);
      res.json(projects);
    } catch (error) {
      handleRouteError(error, res, "getting projects");
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
      const companyId = await requireUserCompany(authUser.id);
      
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
      handleRouteError(error, res, "creating project");
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
      
      const currentUser = await storage.getUser(authUser.id);
      if (currentUser?.role !== "admin" && currentUser?.role !== "superadmin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      if (currentUser.role !== "superadmin" && project.companyId !== currentUser.companyId) {
        return res.status(403).json({ message: "Access denied to this project" });
      }
      
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/projects/:id/products", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const project = await storage.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const products = await storage.getProductsByProject(req.params.id);
      res.json(products);
    } catch (error) {
      console.error("Error fetching products:", error);
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

  const distributionDataSchema = z.object({
    productPrices: z.record(z.number()).optional(),
    websiteDescription: z.string().optional(),
    videoDescription: z.string().optional(),
    mailingText: z.string().optional(),
  });

  const updateStageSchema = z.object({
    status: z.enum(["waiting", "in_progress", "skip", "completed"]).optional(),
    startDate: z.string().optional().nullable(),
    deadline: z.string().optional().nullable(),
    checklistData: z.record(z.any()).optional().nullable(),
    checklistInputData: z.record(z.string()).optional().nullable(),
    conditionalEnabled: z.boolean().optional(),
    conditionalSubstagesData: z.record(z.any()).optional().nullable(),
    customFieldsData: z.record(z.string()).optional().nullable(),
    distributionData: distributionDataSchema.optional().nullable(),
    productQuantitiesData: z.record(z.number()).optional().nullable(),
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
    reason: z.string().optional(),
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

      // Reason is required only when changing an existing deadline
      if (existingStage.deadline && (!validatedData.reason || validatedData.reason.trim() === '')) {
        return res.status(400).json({ 
          message: "Invalid data", 
          errors: [{ path: ["reason"], message: "Reason is required when changing deadline" }] 
        });
      }

      await storage.createDeadlineHistory({
        stageId: req.params.id,
        oldDeadline: existingStage.deadline,
        newDeadline: validatedData.deadline ? new Date(validatedData.deadline) : null,
        reason: validatedData.reason || "Initial deadline set",
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
      const companyId = await requireUserCompany(authUser.id);
      const templates = await storage.getStageTemplatesByCompany(companyId);
      res.json(templates);
    } catch (error) {
      handleRouteError(error, res, "getting stage templates");
    }
  });

  const customFieldSchema = z.object({
    key: z.string(),
    label: z.string(),
    labelRu: z.string().optional(),
    labelZh: z.string().optional(),
    type: z.enum(["text", "textarea", "number"]),
    position: z.number(),
  });

  const createTemplateSchema = z.object({
    name: z.string().min(1),
    nameRu: z.string().optional(),
    nameZh: z.string().optional(),
    description: z.string().optional(),
    position: z.number().optional(),
    hasChecklist: z.boolean().optional(),
    checklistItems: z.array(z.string()).optional(),
    hasConditionalSubstages: z.boolean().optional(),
    conditionalSubstages: z.array(z.string()).optional(),
    customFields: z.array(customFieldSchema).optional(),
    isActive: z.boolean().optional(),
  });

  app.post("/api/stage-templates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(authUser.id);
      if (user?.role !== "admin" && user?.role !== "superadmin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const companyId = await requireUserCompany(authUser.id);
      const validatedData = createTemplateSchema.parse(req.body);
      
      // Get existing templates to determine position if not provided
      const existingTemplates = await storage.getStageTemplatesByCompany(companyId);
      const position = validatedData.position ?? (existingTemplates.length + 1);
      
      const template = await storage.createStageTemplate({
        companyId,
        name: validatedData.name,
        nameRu: validatedData.nameRu || null,
        nameZh: validatedData.nameZh || null,
        description: validatedData.description || null,
        position,
        hasChecklist: validatedData.hasChecklist || false,
        checklistItems: validatedData.checklistItems || null,
        hasConditionalSubstages: validatedData.hasConditionalSubstages || false,
        conditionalSubstages: validatedData.conditionalSubstages || null,
        customFields: validatedData.customFields || null,
        isActive: validatedData.isActive ?? true,
      });

      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      handleRouteError(error, res, "creating stage template");
    }
  });

  app.put("/api/stage-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(authUser.id);
      if (user?.role !== "admin" && user?.role !== "superadmin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const validatedData = createTemplateSchema.partial().parse(req.body);
      
      const updateData: Record<string, any> = {};
      if (validatedData.name !== undefined) updateData.name = validatedData.name;
      if (validatedData.nameRu !== undefined) updateData.nameRu = validatedData.nameRu || null;
      if (validatedData.nameZh !== undefined) updateData.nameZh = validatedData.nameZh || null;
      if (validatedData.description !== undefined) updateData.description = validatedData.description || null;
      if (validatedData.position !== undefined) updateData.position = validatedData.position;
      if (validatedData.hasChecklist !== undefined) updateData.hasChecklist = validatedData.hasChecklist;
      if (validatedData.checklistItems !== undefined) updateData.checklistItems = validatedData.checklistItems || null;
      if (validatedData.hasConditionalSubstages !== undefined) updateData.hasConditionalSubstages = validatedData.hasConditionalSubstages;
      if (validatedData.conditionalSubstages !== undefined) updateData.conditionalSubstages = validatedData.conditionalSubstages || null;
      if (validatedData.customFields !== undefined) updateData.customFields = validatedData.customFields || null;
      if (validatedData.isActive !== undefined) updateData.isActive = validatedData.isActive;
      
      const template = await storage.updateStageTemplate(req.params.id, updateData);

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
      if (user?.role !== "admin" && user?.role !== "superadmin") {
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
    checklistItemKey: z.string().nullable().optional(),
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
      
      // Normalize the file URL to use /objects/ path for proper access
      const normalizedFileUrl = objectStorageService.normalizeObjectEntityPath(validatedData.fileUrl);
      
      const file = await storage.createStageFile({
        stageId: req.params.id,
        fileName: validatedData.fileName,
        fileUrl: normalizedFileUrl,
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

  app.delete("/api/stages/:stageId/files/:fileId", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const authUser = getUser(req);
      if (!authUser) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const stage = await storage.getStageById(req.params.stageId);
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
      
      await storage.deleteStageFile(req.params.fileId);
      res.status(200).json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting stage file:", error);
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
