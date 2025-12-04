import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["guest", "user", "admin"]);
export const stageStatusEnum = pgEnum("stage_status", ["waiting", "in_progress", "skip", "completed"]);

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// Companies table
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Users table (extended for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email", { length: 255 }).unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  jobTitle: varchar("job_title", { length: 100 }),
  profileImageUrl: varchar("profile_image_url", { length: 500 }),
  companyId: varchar("company_id").references(() => companies.id),
  role: userRoleEnum("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company invites table
export const companyInvites = pgTable("company_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id).notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  email: varchar("email", { length: 255 }),
  role: userRoleEnum("role").default("user"),
  createdById: varchar("created_by_id").references(() => users.id),
  usedById: varchar("used_by_id").references(() => users.id),
  usedAt: timestamp("used_at"),
  maxUses: integer("max_uses").default(1),
  usedCount: integer("used_count").default(0),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  responsibleUserId: varchar("responsible_user_id").references(() => users.id),
  deadline: timestamp("deadline"),
  coverImageId: varchar("cover_image_id"),
  excludedTemplateIds: jsonb("excluded_template_ids").$type<string[]>(),
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products table (items within a project)
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  article: varchar("article", { length: 100 }),
  name: varchar("name", { length: 255 }).notNull(),
  barcode: varchar("barcode", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Distribution data type for stages
export type DistributionData = {
  productPrices: Record<string, number>;
  websiteDescription: string;
  videoDescription: string;
  mailingText: string;
};

// Custom field type for stage templates
export type CustomField = {
  key: string;
  label: string;
  labelRu?: string;
  labelZh?: string;
  type: 'text' | 'textarea' | 'number';
  position: number;
  required?: boolean;
};

// Block types for template builder
export type BlockType = 
  | 'comments' 
  | 'checklist' 
  | 'customFields' 
  | 'files' 
  | 'tasks' 
  | 'substages' 
  | 'gallery'
  | 'divider'
  | 'header';

// Checklist item configuration
export type ChecklistItemConfig = {
  key: string;
  label: string;
  labelRu?: string;
  labelZh?: string;
  required?: boolean;
  acceptedFileTypes?: string[];
  hasInput?: boolean;
  inputLabel?: string;
  inputLabelRu?: string;
  inputLabelZh?: string;
  inputPlaceholder?: string;
};

// Block configuration types
export type CommentsBlockConfig = {
  mentionsEnabled?: boolean;
};

export type ChecklistBlockConfig = {
  items: ChecklistItemConfig[];
};

export type CustomFieldsBlockConfig = {
  fields: CustomField[];
};

export type FilesBlockConfig = {
  accept?: string[];
  maxFiles?: number;
  scope?: 'stage' | 'checklist';
};

export type TasksBlockConfig = {
  allowAssign?: boolean;
  showAssignees?: boolean;
};

export type SubstagesBlockConfig = {
  items: {
    key: string;
    label: string;
    labelRu?: string;
    labelZh?: string;
  }[];
};

export type GalleryBlockConfig = {
  source: 'stage_files' | 'external';
  maxItems?: number;
  layout?: 'grid' | 'carousel';
};

export type HeaderBlockConfig = {
  text: string;
  textRu?: string;
  textZh?: string;
  level?: 'h2' | 'h3' | 'h4';
};

export type DividerBlockConfig = {
  style?: 'solid' | 'dashed' | 'dotted';
};

// Union type for all block configs
export type BlockConfig = 
  | CommentsBlockConfig 
  | ChecklistBlockConfig 
  | CustomFieldsBlockConfig 
  | FilesBlockConfig 
  | TasksBlockConfig 
  | SubstagesBlockConfig 
  | GalleryBlockConfig
  | HeaderBlockConfig
  | DividerBlockConfig
  | Record<string, never>;

// Template block definition
export type TemplateBlock = {
  id: string;
  type: BlockType;
  title?: string;
  titleRu?: string;
  titleZh?: string;
  required?: boolean;
  collapsed?: boolean;
  config: BlockConfig;
};

// Stage templates (for admin customization)
export const stageTemplates = pgTable("stage_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  nameRu: varchar("name_ru", { length: 255 }),
  nameZh: varchar("name_zh", { length: 255 }),
  description: text("description"),
  position: integer("position").notNull(),
  hasChecklist: boolean("has_checklist").default(false),
  checklistItems: jsonb("checklist_items").$type<string[]>(),
  hasConditionalSubstages: boolean("has_conditional_substages").default(false),
  conditionalSubstages: jsonb("conditional_substages").$type<string[]>(),
  customFields: jsonb("custom_fields").$type<CustomField[]>(),
  blocks: jsonb("blocks").$type<TemplateBlock[]>(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stages table (instances within projects)
export const stages = pgTable("stages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  templateId: varchar("template_id").references(() => stageTemplates.id),
  name: varchar("name", { length: 255 }).notNull(),
  status: stageStatusEnum("status").default("waiting"),
  startDate: timestamp("start_date"),
  deadline: timestamp("deadline"),
  position: integer("position").notNull(),
  checklistData: jsonb("checklist_data").$type<Record<string, boolean>>(),
  checklistInputData: jsonb("checklist_input_data").$type<Record<string, string>>(),
  conditionalEnabled: boolean("conditional_enabled").default(false),
  conditionalSubstagesData: jsonb("conditional_substages_data").$type<Record<string, boolean>>(),
  customFieldsData: jsonb("custom_fields_data").$type<Record<string, string>>(),
  distributionData: jsonb("distribution_data").$type<DistributionData>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Stage files (attachments)
export const stageFiles = pgTable("stage_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stageId: varchar("stage_id").references(() => stages.id, { onDelete: "cascade" }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileType: varchar("file_type", { length: 100 }),
  fileSize: integer("file_size"),
  uploadedById: varchar("uploaded_by_id").references(() => users.id),
  version: integer("version").default(1),
  isLatest: boolean("is_latest").default(true),
  checklistItemKey: varchar("checklist_item_key", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Comments table
export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stageId: varchar("stage_id").references(() => stages.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  mentions: jsonb("mentions").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stageId: varchar("stage_id").references(() => stages.id, { onDelete: "cascade" }).notNull(),
  assignedToId: varchar("assigned_to_id").references(() => users.id).notNull(),
  assignedById: varchar("assigned_by_id").references(() => users.id).notNull(),
  description: text("description").notNull(),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Deadline history (for tracking changes)
export const deadlineHistory = pgTable("deadline_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stageId: varchar("stage_id").references(() => stages.id, { onDelete: "cascade" }).notNull(),
  oldDeadline: timestamp("old_deadline"),
  newDeadline: timestamp("new_deadline"),
  reason: text("reason").notNull(),
  changedById: varchar("changed_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Status history (for tracking stage status changes)
export const statusHistory = pgTable("status_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stageId: varchar("stage_id").references(() => stages.id, { onDelete: "cascade" }).notNull(),
  oldStatus: stageStatusEnum("old_status"),
  newStatus: stageStatusEnum("new_status").notNull(),
  changedById: varchar("changed_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  projects: many(projects),
  stageTemplates: many(stageTemplates),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, {
    fields: [users.companyId],
    references: [companies.id],
  }),
  projectsResponsible: many(projects),
  comments: many(comments),
  tasksAssigned: many(tasks),
  filesUploaded: many(stageFiles),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  company: one(companies, {
    fields: [projects.companyId],
    references: [companies.id],
  }),
  responsibleUser: one(users, {
    fields: [projects.responsibleUserId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [projects.createdById],
    references: [users.id],
  }),
  products: many(products),
  stages: many(stages),
}));

export const productsRelations = relations(products, ({ one }) => ({
  project: one(projects, {
    fields: [products.projectId],
    references: [projects.id],
  }),
}));

export const stagesRelations = relations(stages, ({ one, many }) => ({
  project: one(projects, {
    fields: [stages.projectId],
    references: [projects.id],
  }),
  template: one(stageTemplates, {
    fields: [stages.templateId],
    references: [stageTemplates.id],
  }),
  files: many(stageFiles),
  comments: many(comments),
  tasks: many(tasks),
  deadlineHistory: many(deadlineHistory),
  statusHistory: many(statusHistory),
}));

export const stageFilesRelations = relations(stageFiles, ({ one }) => ({
  stage: one(stages, {
    fields: [stageFiles.stageId],
    references: [stages.id],
  }),
  uploadedBy: one(users, {
    fields: [stageFiles.uploadedById],
    references: [users.id],
  }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  stage: one(stages, {
    fields: [comments.stageId],
    references: [stages.id],
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  stage: one(stages, {
    fields: [tasks.stageId],
    references: [stages.id],
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
  }),
  assignedBy: one(users, {
    fields: [tasks.assignedById],
    references: [users.id],
  }),
}));

export const deadlineHistoryRelations = relations(deadlineHistory, ({ one }) => ({
  stage: one(stages, {
    fields: [deadlineHistory.stageId],
    references: [stages.id],
  }),
  changedBy: one(users, {
    fields: [deadlineHistory.changedById],
    references: [users.id],
  }),
}));

export const statusHistoryRelations = relations(statusHistory, ({ one }) => ({
  stage: one(stages, {
    fields: [statusHistory.stageId],
    references: [stages.id],
  }),
  changedBy: one(users, {
    fields: [statusHistory.changedById],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertStageTemplateSchema = createInsertSchema(stageTemplates).omit({ id: true, createdAt: true });
export const insertStageSchema = createInsertSchema(stages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertStageFileSchema = createInsertSchema(stageFiles).omit({ id: true, createdAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, completedAt: true });
export const insertDeadlineHistorySchema = createInsertSchema(deadlineHistory).omit({ id: true, createdAt: true });
export const insertStatusHistorySchema = createInsertSchema(statusHistory).omit({ id: true, createdAt: true });
export const insertCompanyInviteSchema = createInsertSchema(companyInvites).omit({ id: true, createdAt: true, usedAt: true, usedById: true });

// Types
export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type StageTemplate = typeof stageTemplates.$inferSelect;
export type InsertStageTemplate = z.infer<typeof insertStageTemplateSchema>;
export type Stage = typeof stages.$inferSelect;
export type InsertStage = z.infer<typeof insertStageSchema>;
export type StageFile = typeof stageFiles.$inferSelect;
export type InsertStageFile = z.infer<typeof insertStageFileSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type DeadlineHistory = typeof deadlineHistory.$inferSelect;
export type InsertDeadlineHistory = z.infer<typeof insertDeadlineHistorySchema>;
export type StatusHistory = typeof statusHistory.$inferSelect;
export type InsertStatusHistory = z.infer<typeof insertStatusHistorySchema>;
export type CompanyInvite = typeof companyInvites.$inferSelect;
export type InsertCompanyInvite = z.infer<typeof insertCompanyInviteSchema>;

// Extended types with relations
export type ProjectWithRelations = Project & {
  responsibleUser?: User | null;
  products?: Product[];
  stages?: StageWithRelations[];
};

export type StageWithRelations = Stage & {
  files?: StageFile[];
  comments?: CommentWithUser[];
  tasks?: TaskWithUsers[];
  template?: StageTemplate | null;
};

export type CommentWithUser = Comment & {
  user?: User;
};

export type TaskWithUsers = Task & {
  assignedTo?: User;
  assignedBy?: User;
  stage?: Stage & { project?: Project };
};

export type StageFileWithUser = StageFile & {
  uploadedBy?: User;
};
