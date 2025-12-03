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
}

export const storage = new DatabaseStorage();
