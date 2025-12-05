import { eq, and, desc, asc, isNull, or, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  companies,
  companyInvites,
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
  type CompanyInvite,
  type InsertCompanyInvite,
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
  getStageFileByUrl(fileUrl: string): Promise<StageFile | undefined>;
  deleteStageFile(fileId: string): Promise<void>;

  createComment(comment: InsertComment): Promise<Comment>;
  getCommentsByStage(stageId: string): Promise<Comment[]>;

  createTask(task: InsertTask): Promise<Task>;
  getTasksByAssignee(userId: string): Promise<TaskWithUsers[]>;
  getTasksByStage(stageId: string): Promise<Task[]>;
  updateTask(id: string, data: Partial<Task>): Promise<Task | undefined>;

  createDeadlineHistory(history: InsertDeadlineHistory): Promise<void>;
  createStatusHistory(history: InsertStatusHistory): Promise<void>;
  getDashboardStats(companyId: string, userId: string): Promise<{
    // User-specific stats
    userActiveProjects: number;
    userCompletedProjects: number;
    userOverdueProjects: number;
    userAvgProjectDuration: number;
    // Company-wide stats
    companyActiveProjects: number;
    companyCompletedProjects: number;
    companyOverdueProjects: number;
  }>;
  getStatusHistoryByStage(stageId: string): Promise<any[]>;
  getDeadlineHistoryByStage(stageId: string): Promise<any[]>;
  getUsersWithStats(companyId: string): Promise<Array<User & { 
    projectCount: number; 
    completedProjectCount: number;
    avgProjectDuration: number | null;
  }>>;
  getAllUsersWithStats(): Promise<Array<User & { 
    projectCount: number; 
    completedProjectCount: number;
    avgProjectDuration: number | null;
  }>>;
  deleteUser(userId: string): Promise<void>;
  
  // Company invites
  createCompanyInvite(invite: InsertCompanyInvite): Promise<CompanyInvite>;
  getCompanyInviteByToken(token: string): Promise<CompanyInvite | undefined>;
  getCompanyInvitesByCompany(companyId: string): Promise<CompanyInvite[]>;
  useCompanyInvite(token: string, userId: string): Promise<CompanyInvite | undefined>;
  deleteCompanyInvite(id: string): Promise<void>;
  
  // Remove user from company
  removeUserFromCompany(userId: string): Promise<User | undefined>;
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

  async getStageFileByUrl(fileUrl: string): Promise<StageFile | undefined> {
    const [file] = await db
      .select()
      .from(stageFiles)
      .where(eq(stageFiles.fileUrl, fileUrl));
    return file;
  }

  async deleteStageFile(fileId: string): Promise<void> {
    await db.delete(stageFiles).where(eq(stageFiles.id, fileId));
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

  async getDashboardStats(companyId: string, userId: string): Promise<{
    userActiveProjects: number;
    userCompletedProjects: number;
    userOverdueProjects: number;
    userAvgProjectDuration: number;
    companyActiveProjects: number;
    companyCompletedProjects: number;
    companyOverdueProjects: number;
  }> {
    const allProjects = await db
      .select()
      .from(projects)
      .where(eq(projects.companyId, companyId));

    const now = new Date();
    
    // Company-wide stats
    let companyCompletedProjects = 0;
    let companyOverdueProjects = 0;
    
    // User-specific stats
    let userCompletedProjects = 0;
    let userOverdueProjects = 0;
    let userActiveProjects = 0;
    
    // For average duration calculation (user's completed projects)
    let userTotalDuration = 0;
    let userCompletedWithDates = 0;

    for (const project of allProjects) {
      const projectStages = await db
        .select()
        .from(stages)
        .where(eq(stages.projectId, project.id));

      const isUserProject = project.responsibleUserId === userId;
      
      // Check if project is completed
      const isCompleted = projectStages.length > 0 && projectStages.every(
        (s) => s.status === "completed" || s.status === "skip"
      );
      
      // Check if project is overdue (has deadline in past and not completed)
      const isOverdue = project.deadline && new Date(project.deadline) < now && !isCompleted;
      
      // Update company stats
      if (isCompleted) {
        companyCompletedProjects++;
      }
      if (isOverdue) {
        companyOverdueProjects++;
      }
      
      // Update user stats
      if (isUserProject) {
        if (isCompleted) {
          userCompletedProjects++;
          
          // Calculate duration for user's completed projects
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
              userTotalDuration += duration;
              userCompletedWithDates++;
            }
          }
        } else if (isOverdue) {
          userOverdueProjects++;
        } else {
          userActiveProjects++;
        }
      }
    }

    const companyActiveProjects = allProjects.length - companyCompletedProjects;
    const userAvgProjectDuration = userCompletedWithDates > 0 
      ? Math.round(userTotalDuration / userCompletedWithDates) 
      : 0;

    return {
      userActiveProjects,
      userCompletedProjects,
      userOverdueProjects,
      userAvgProjectDuration,
      companyActiveProjects,
      companyCompletedProjects,
      companyOverdueProjects,
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
    // Get only users from the specified company
    const companyUsers = await this.getUsersByCompany(companyId);
    return this.calculateUserStats(companyUsers);
  }

  async getAllUsersWithStats(): Promise<Array<User & { 
    projectCount: number; 
    completedProjectCount: number;
    avgProjectDuration: number | null;
  }>> {
    // Superadmin: get ALL users globally
    const allUsers = await this.getAllUsers();
    return this.calculateUserStats(allUsers);
  }

  private async calculateUserStats(userList: User[]): Promise<Array<User & { 
    projectCount: number; 
    completedProjectCount: number;
    avgProjectDuration: number | null;
  }>> {
    const result = [];

    for (const user of userList) {
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

  // Company invites methods
  async createCompanyInvite(invite: InsertCompanyInvite): Promise<CompanyInvite> {
    const [newInvite] = await db.insert(companyInvites).values(invite).returning();
    return newInvite;
  }

  async getCompanyInviteByToken(token: string): Promise<CompanyInvite | undefined> {
    const [invite] = await db
      .select()
      .from(companyInvites)
      .where(eq(companyInvites.token, token));
    return invite;
  }

  async getCompanyInvitesByCompany(companyId: string): Promise<CompanyInvite[]> {
    return db
      .select()
      .from(companyInvites)
      .where(eq(companyInvites.companyId, companyId))
      .orderBy(desc(companyInvites.createdAt));
  }

  async useCompanyInvite(token: string, userId: string): Promise<CompanyInvite | undefined> {
    const [invite] = await db
      .update(companyInvites)
      .set({ 
        usedById: userId, 
        usedAt: new Date(),
        usedCount: sql`COALESCE(${companyInvites.usedCount}, 0) + 1`
      })
      .where(eq(companyInvites.token, token))
      .returning();
    return invite;
  }

  async deleteCompanyInvite(id: string): Promise<void> {
    await db.delete(companyInvites).where(eq(companyInvites.id, id));
  }

  async removeUserFromCompany(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ companyId: null, role: "guest", updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deleteUser(userId: string): Promise<void> {
    // Full deletion - only for superadmin
    // First, clean up related references
    
    // Nullable references - set to null
    await db.update(projects).set({ responsibleUserId: null }).where(eq(projects.responsibleUserId, userId));
    await db.update(projects).set({ createdById: null }).where(eq(projects.createdById, userId));
    await db.update(companyInvites).set({ createdById: null }).where(eq(companyInvites.createdById, userId));
    await db.update(companyInvites).set({ usedById: null }).where(eq(companyInvites.usedById, userId));
    await db.update(stageFiles).set({ uploadedById: null }).where(eq(stageFiles.uploadedById, userId));
    
    // Non-nullable references - delete related records
    await db.delete(comments).where(eq(comments.userId, userId));
    await db.delete(tasks).where(eq(tasks.assignedToId, userId));
    await db.delete(tasks).where(eq(tasks.assignedById, userId));
    await db.delete(deadlineHistory).where(eq(deadlineHistory.changedById, userId));
    await db.delete(statusHistory).where(eq(statusHistory.changedById, userId));
    
    // Then delete the user
    await db.delete(users).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
