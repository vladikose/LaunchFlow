import { eq, and, desc, asc, isNull, or } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  companies,
  projects,
  products,
  stageTemplates,
  stages,
  stageFiles,
  comments,
  tasks,
  deadlineHistory,
  statusHistory,
  type User,
  type UpsertUser,
  type Company,
  type InsertCompany,
  type Project,
  type InsertProject,
  type Product,
  type InsertProduct,
  type StageTemplate,
  type InsertStageTemplate,
  type Stage,
  type InsertStage,
  type StageFile,
  type InsertStageFile,
  type Comment,
  type InsertComment,
  type Task,
  type InsertTask,
  type InsertDeadlineHistory,
  type InsertStatusHistory,
  type ProjectWithRelations,
  type StageWithRelations,
  type TaskWithUsers,
} from "@shared/schema";

export interface IStorage {
  upsertUser(user: UpsertUser): Promise<User>;
  getUser(id: string): Promise<User | undefined>;
  getUsersByCompany(companyId: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  createCompany(company: InsertCompany): Promise<Company>;
  getCompanyById(id: string): Promise<Company | undefined>;
  updateCompany(id: string, data: Partial<Company>): Promise<Company | undefined>;

  createProject(project: InsertProject): Promise<Project>;
  getProjectsByCompany(companyId: string): Promise<Project[]>;
  getProjectsWithStageStatus(companyId: string): Promise<(Project & { 
    stages: Array<{ status: string; templateId: string | null }>; 
    coverImage: string | null;
    responsibleUserName: string | null;
  })[]>;
  getProjectById(id: string): Promise<ProjectWithRelations | undefined>;
  updateProject(id: string, data: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  createProduct(product: InsertProduct): Promise<Product>;
  getProductsByProject(projectId: string): Promise<Product[]>;
  deleteProductsByProject(projectId: string): Promise<void>;

  createStageTemplate(template: InsertStageTemplate): Promise<StageTemplate>;
  getStageTemplatesByCompany(companyId: string): Promise<StageTemplate[]>;
  updateStageTemplate(id: string, data: Partial<StageTemplate>): Promise<StageTemplate | undefined>;
  deleteStageTemplate(id: string): Promise<void>;

  createStage(stage: InsertStage): Promise<Stage>;
  getStagesByProject(projectId: string): Promise<StageWithRelations[]>;
  getStageById(id: string): Promise<StageWithRelations | undefined>;
  updateStage(id: string, data: Partial<Stage>): Promise<Stage | undefined>;

  createStageFile(file: InsertStageFile): Promise<StageFile>;
  getFilesByStage(stageId: string): Promise<StageFile[]>;

  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByStage(stageId: string): Promise<Comment[]>;

  createTask(task: InsertTask): Promise<Task>;
  getTasksByAssignee(userId: string): Promise<TaskWithUsers[]>;
  getTasksByStage(stageId: string): Promise<Task[]>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;

  createDeadlineHistory(history: InsertDeadlineHistory): Promise<void>;
  createStatusHistory(history: InsertStatusHistory): Promise<void>;
  getDashboardStats(companyId: string): Promise<{
    completedProjects: number;
    activeProjects: number;
    overdueProjects: number;
    avgStageDuration: number;
  }>;
  getStatusHistoryByStage(stageId: string): Promise<any[]>;
  getDeadlineHistoryByStage(stageId: string): Promise<any[]>;
  getUsersWithStats(companyId: string): Promise<Array<User & { 
    projectCount: number; 
    completedProjectCount: number;
    avgProjectDuration: number | null;
  }>>;
}

export class DatabaseStorage implements IStorage {
  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.companyId, companyId));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(asc(users.firstName));
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async getCompanyById(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async updateCompany(id: string, data: Partial<Company>): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(companies.id, id))
      .returning();
    return company;
  }

  async createProject(project: InsertProject): Promise<Project> {
    const [newProject] = await db.insert(projects).values(project).returning();
    return newProject;
  }

  async getProjectsByCompany(companyId: string): Promise<Project[]> {
    return db
      .select()
      .from(projects)
      .where(eq(projects.companyId, companyId))
      .orderBy(desc(projects.createdAt));
  }

  async getProjectsWithStageStatus(companyId: string): Promise<(Project & { 
    stages: Array<{ status: string; templateId: string | null }>; 
    coverImage: string | null;
    responsibleUserName: string | null;
  })[]> {
    const companyProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.companyId, companyId))
      .orderBy(desc(projects.createdAt));

    const result = await Promise.all(
      companyProjects.map(async (project) => {
        const projectStages = await db
          .select({ status: stages.status, id: stages.id, templateId: stages.templateId })
          .from(stages)
          .where(eq(stages.projectId, project.id));
        
        let coverImage: string | null = project.coverImageId || null;
        
        if (!coverImage) {
          const renderTemplates = await db
            .select({ id: stageTemplates.id })
            .from(stageTemplates)
            .where(and(
              eq(stageTemplates.companyId, companyId),
              eq(stageTemplates.name, 'Render')
            ));
          
          if (renderTemplates.length > 0) {
            const renderTemplateIds = renderTemplates.map(t => t.id);
            const renderStage = projectStages.find(s => s.templateId && renderTemplateIds.includes(s.templateId));
            
            if (renderStage) {
              const renderFiles = await db
                .select({ fileUrl: stageFiles.fileUrl })
                .from(stageFiles)
                .where(eq(stageFiles.stageId, renderStage.id))
                .limit(1);
              
              if (renderFiles.length > 0) {
                coverImage = renderFiles[0].fileUrl;
              }
            }
          }
        }
        
        let responsibleUserName: string | null = null;
        if (project.responsibleUserId) {
          const [user] = await db
            .select({ firstName: users.firstName, lastName: users.lastName, email: users.email })
            .from(users)
            .where(eq(users.id, project.responsibleUserId));
          if (user) {
            responsibleUserName = user.firstName && user.lastName 
              ? `${user.firstName} ${user.lastName}`
              : user.email;
          }
        }
        
        return {
          ...project,
          stages: projectStages.map(s => ({ status: s.status || 'waiting', templateId: s.templateId })),
          coverImage,
          responsibleUserName,
        };
      })
    );

    return result;
  }

  async getProjectById(id: string): Promise<ProjectWithRelations | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));

    if (!project) return undefined;

    const projectProducts = await this.getProductsByProject(id);
    const projectStages = await this.getStagesByProject(id);
    let responsibleUser: User | null = null;
    if (project.responsibleUserId) {
      const user = await this.getUser(project.responsibleUserId);
      responsibleUser = user || null;
    }

    return {
      ...project,
      responsibleUser,
      products: projectProducts,
      stages: projectStages,
    };
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async getProductsByProject(projectId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.projectId, projectId));
  }

  async deleteProductsByProject(projectId: string): Promise<void> {
    await db.delete(products).where(eq(products.projectId, projectId));
  }

  async createStageTemplate(template: InsertStageTemplate): Promise<StageTemplate> {
    const [newTemplate] = await db.insert(stageTemplates).values(template).returning();
    return newTemplate;
  }

  async getStageTemplatesByCompany(companyId: string): Promise<StageTemplate[]> {
    return db
      .select()
      .from(stageTemplates)
      .where(and(eq(stageTemplates.companyId, companyId), eq(stageTemplates.isActive, true)))
      .orderBy(asc(stageTemplates.position));
  }

  async updateStageTemplate(
    id: string,
    data: Partial<StageTemplate>
  ): Promise<StageTemplate | undefined> {
    const [template] = await db
      .update(stageTemplates)
      .set(data)
      .where(eq(stageTemplates.id, id))
      .returning();
    return template;
  }

  async deleteStageTemplate(id: string): Promise<void> {
    await db.update(stageTemplates).set({ isActive: false }).where(eq(stageTemplates.id, id));
  }

  async createStage(stage: InsertStage): Promise<Stage> {
    const [newStage] = await db.insert(stages).values(stage).returning();
    return newStage;
  }

  async getStagesByProject(projectId: string): Promise<StageWithRelations[]> {
    const projectStages = await db
      .select()
      .from(stages)
      .where(eq(stages.projectId, projectId))
      .orderBy(asc(stages.position));

    const stagesWithRelations: StageWithRelations[] = [];

    for (const stage of projectStages) {
      const files = await this.getFilesByStage(stage.id);
      const stageComments = await this.getCommentsByStage(stage.id);
      const stageTasks = await this.getTasksByStage(stage.id);
      
      // Fetch template data if templateId exists
      let template: StageTemplate | null = null;
      if (stage.templateId) {
        const [templateData] = await db
          .select()
          .from(stageTemplates)
          .where(eq(stageTemplates.id, stage.templateId));
        template = templateData || null;
      }

      const commentsWithUsers = await Promise.all(
        stageComments.map(async (comment) => {
          const user = await this.getUser(comment.userId);
          return { ...comment, user };
        })
      );

      const tasksWithUsers = await Promise.all(
        stageTasks.map(async (task) => {
          const assignedTo = await this.getUser(task.assignedToId);
          const assignedBy = await this.getUser(task.assignedById);
          return { ...task, assignedTo, assignedBy };
        })
      );

      stagesWithRelations.push({
        ...stage,
        template,
        files,
        comments: commentsWithUsers,
        tasks: tasksWithUsers,
      });
    }

    return stagesWithRelations;
  }

  async getStageById(id: string): Promise<StageWithRelations | undefined> {
    const [stage] = await db.select().from(stages).where(eq(stages.id, id));
    if (!stage) return undefined;

    const files = await this.getFilesByStage(id);
    const stageComments = await this.getCommentsByStage(id);
    const stageTasks = await this.getTasksByStage(id);
    
    // Fetch template data if templateId exists
    let template: StageTemplate | null = null;
    if (stage.templateId) {
      const [templateData] = await db
        .select()
        .from(stageTemplates)
        .where(eq(stageTemplates.id, stage.templateId));
      template = templateData || null;
    }

    const commentsWithUsers = await Promise.all(
      stageComments.map(async (comment) => {
        const user = await this.getUser(comment.userId);
        return { ...comment, user };
      })
    );

    const tasksWithUsers = await Promise.all(
      stageTasks.map(async (task) => {
        const assignedTo = await this.getUser(task.assignedToId);
        const assignedBy = await this.getUser(task.assignedById);
        return { ...task, assignedTo, assignedBy };
      })
    );

    return {
      ...stage,
      template,
      files,
      comments: commentsWithUsers,
      tasks: tasksWithUsers,
    };
  }

  async updateStage(id: string, data: Partial<Stage>): Promise<Stage | undefined> {
    const [stage] = await db
      .update(stages)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(stages.id, id))
      .returning();
    return stage;
  }

  async createStageFile(file: InsertStageFile): Promise<StageFile> {
    const [newFile] = await db.insert(stageFiles).values(file).returning();
    return newFile;
  }

  async getFilesByStage(stageId: string): Promise<StageFile[]> {
    return db
      .select()
      .from(stageFiles)
      .where(and(eq(stageFiles.stageId, stageId), eq(stageFiles.isLatest, true)))
      .orderBy(desc(stageFiles.createdAt));
  }

  async createComment(comment: InsertComment): Promise<Comment> {
    const [newComment] = await db.insert(comments).values(comment).returning();
    return newComment;
  }

  async getCommentsByStage(stageId: string): Promise<Comment[]> {
    return db
      .select()
      .from(comments)
      .where(eq(comments.stageId, stageId))
      .orderBy(asc(comments.createdAt));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async getTasksByAssignee(userId: string): Promise<TaskWithUsers[]> {
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.assignedToId, userId))
      .orderBy(desc(tasks.createdAt));

    const tasksWithRelations: TaskWithUsers[] = [];

    for (const task of userTasks) {
      const assignedTo = await this.getUser(task.assignedToId);
      const assignedBy = await this.getUser(task.assignedById);
      const [stage] = await db.select().from(stages).where(eq(stages.id, task.stageId));
      let project: Project | undefined;
      if (stage) {
        const [proj] = await db.select().from(projects).where(eq(projects.id, stage.projectId));
        project = proj;
      }

      tasksWithRelations.push({
        ...task,
        assignedTo,
        assignedBy,
        stage: stage ? { ...stage, project } : undefined,
      });
    }

    return tasksWithRelations;
  }

  async getTasksByStage(stageId: string): Promise<Task[]> {
    return db
      .select()
      .from(tasks)
      .where(eq(tasks.stageId, stageId))
      .orderBy(desc(tasks.createdAt));
  }

  async updateTask(id: string, data: Partial<Task>): Promise<Task | undefined> {
    const [task] = await db.update(tasks).set(data).where(eq(tasks.id, id)).returning();
    return task;
  }

  async createDeadlineHistory(history: InsertDeadlineHistory): Promise<void> {
    await db.insert(deadlineHistory).values(history);
  }

  async createStatusHistory(history: InsertStatusHistory): Promise<void> {
    await db.insert(statusHistory).values(history);
  }

  async getDashboardStats(companyId: string): Promise<{
    completedProjects: number;
    activeProjects: number;
    overdueProjects: number;
    avgStageDuration: number;
  }> {
    const allProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.companyId, companyId));

    let completedProjects = 0;
    let overdueProjects = 0;
    const now = new Date();

    for (const project of allProjects) {
      const projectStages = await db
        .select()
        .from(stages)
        .where(eq(stages.projectId, project.id));

      if (projectStages.length > 0) {
        const allCompleted = projectStages.every(
          (s) => s.status === "completed" || s.status === "skip"
        );
        if (allCompleted) {
          completedProjects++;
        }
      }

      if (project.deadline && new Date(project.deadline) < now) {
        const projectStages = await db
          .select()
          .from(stages)
          .where(eq(stages.projectId, project.id));
        const allDone = projectStages.every(
          (s) => s.status === "completed" || s.status === "skip"
        );
        if (!allDone) {
          overdueProjects++;
        }
      }
    }

    // Calculate average project completion time (from first stage start to last stage completion)
    let totalDuration = 0;
    let completedProjectsWithDates = 0;

    for (const project of allProjects) {
      const projectStages = await db
        .select()
        .from(stages)
        .where(eq(stages.projectId, project.id));

      // Check if all stages are completed
      const allCompleted = projectStages.length > 0 && projectStages.every(
        (s) => s.status === "completed" || s.status === "skip"
      );

      if (allCompleted) {
        // Find earliest start date and latest deadline
        let earliestStart: Date | null = null;
        let latestEnd: Date | null = null;

        for (const stage of projectStages) {
          if (stage.startDate) {
            const startDate = new Date(stage.startDate);
            if (!earliestStart || startDate < earliestStart) {
              earliestStart = startDate;
            }
          }
          if (stage.deadline) {
            const endDate = new Date(stage.deadline);
            if (!latestEnd || endDate > latestEnd) {
              latestEnd = endDate;
            }
          }
        }

        if (earliestStart && latestEnd) {
          const duration = (latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24);
          if (duration > 0) {
            totalDuration += duration;
            completedProjectsWithDates++;
          }
        }
      }
    }

    const avgStageDuration =
      completedProjectsWithDates > 0 ? Math.round(totalDuration / completedProjectsWithDates) : 0;

    return {
      completedProjects,
      activeProjects: allProjects.length - completedProjects,
      overdueProjects,
      avgStageDuration,
    };
  }

  async getStatusHistoryByStage(stageId: string): Promise<any[]> {
    const history = await db
      .select()
      .from(statusHistory)
      .where(eq(statusHistory.stageId, stageId))
      .orderBy(desc(statusHistory.createdAt));
    
    const historyWithUsers = [];
    for (const record of history) {
      const user = await this.getUser(record.changedById);
      historyWithUsers.push({
        ...record,
        changedBy: user,
      });
    }
    return historyWithUsers;
  }

  async getDeadlineHistoryByStage(stageId: string): Promise<any[]> {
    const history = await db
      .select()
      .from(deadlineHistory)
      .where(eq(deadlineHistory.stageId, stageId))
      .orderBy(desc(deadlineHistory.createdAt));
    
    const historyWithUsers = [];
    for (const record of history) {
      const user = await this.getUser(record.changedById);
      historyWithUsers.push({
        ...record,
        changedBy: user,
      });
    }
    return historyWithUsers;
  }

  async getUsersWithStats(companyId: string): Promise<Array<User & { 
    projectCount: number; 
    completedProjectCount: number;
    avgProjectDuration: number | null;
  }>> {
    const companyUsers = await this.getUsersByCompany(companyId);
    const result = [];

    for (const user of companyUsers) {
      // Get all projects where user is responsible
      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.responsibleUserId, user.id));

      let completedProjectCount = 0;
      let totalDuration = 0;
      let projectsWithDuration = 0;

      for (const project of userProjects) {
        const projectStages = await db
          .select()
          .from(stages)
          .where(eq(stages.projectId, project.id));

        // Check if all stages are completed
        const allCompleted = projectStages.length > 0 && projectStages.every(
          (s) => s.status === "completed" || s.status === "skip"
        );

        if (allCompleted) {
          completedProjectCount++;

          // Calculate project duration from earliest start to latest deadline
          let earliestStart: Date | null = null;
          let latestEnd: Date | null = null;

          for (const stage of projectStages) {
            if (stage.startDate) {
              const startDate = new Date(stage.startDate);
              if (!earliestStart || startDate < earliestStart) {
                earliestStart = startDate;
              }
            }
            if (stage.deadline) {
              const endDate = new Date(stage.deadline);
              if (!latestEnd || endDate > latestEnd) {
                latestEnd = endDate;
              }
            }
          }

          if (earliestStart && latestEnd) {
            const duration = (latestEnd.getTime() - earliestStart.getTime()) / (1000 * 60 * 60 * 24);
            if (duration > 0) {
              totalDuration += duration;
              projectsWithDuration++;
            }
          }
        }
      }

      const avgProjectDuration = projectsWithDuration > 0 
        ? Math.round(totalDuration / projectsWithDuration) 
        : null;

      result.push({
        ...user,
        projectCount: userProjects.length,
        completedProjectCount,
        avgProjectDuration,
      });
    }

    return result;
  }
}

export const storage = new DatabaseStorage();
