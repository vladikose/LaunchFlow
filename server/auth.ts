import session from "express-session";
import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { storage } from "./storage";
import { z } from "zod";

const emailTransporter = process.env.YANDEX_EMAIL && process.env.YANDEX_APP_PASSWORD
  ? nodemailer.createTransport({
      host: "smtp.yandex.ru",
      port: 465,
      secure: true,
      auth: {
        user: process.env.YANDEX_EMAIL,
        pass: process.env.YANDEX_APP_PASSWORD,
      },
    })
  : null;

declare module "express-session" {
  interface SessionData {
    userId: string;
    returnTo?: string;
  }
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000;

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(email);
  
  if (!attempts) return false;
  
  if (now - attempts.lastAttempt > LOCKOUT_DURATION) {
    loginAttempts.delete(email);
    return false;
  }
  
  return attempts.count >= MAX_LOGIN_ATTEMPTS;
}

function recordLoginAttempt(email: string): void {
  const now = Date.now();
  const attempts = loginAttempts.get(email);
  
  if (!attempts || now - attempts.lastAttempt > LOCKOUT_DURATION) {
    loginAttempts.set(email, { count: 1, lastAttempt: now });
  } else {
    loginAttempts.set(email, { count: attempts.count + 1, lastAttempt: now });
  }
}

function clearLoginAttempts(email: string): void {
  loginAttempts.delete(email);
}

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      const passwordHash = await hashPassword(validatedData.password);
      
      const newUser = await storage.createUser({
        email: validatedData.email,
        passwordHash,
        firstName: validatedData.firstName || null,
        lastName: validatedData.lastName || null,
        role: "guest",
        emailVerified: true,
      });

      req.session.userId = newUser.id;
      
      const { passwordHash: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      if (isRateLimited(validatedData.email)) {
        return res.status(429).json({ 
          message: "Too many login attempts. Please try again in 15 minutes." 
        });
      }

      const user = await storage.getUserByEmail(validatedData.email);
      if (!user) {
        recordLoginAttempt(validatedData.email);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!user.passwordHash) {
        return res.status(401).json({ 
          message: "This account was created with Replit. Please set a password first.",
          needsPasswordSet: true 
        });
      }

      const isValidPassword = await verifyPassword(validatedData.password, user.passwordHash);
      if (!isValidPassword) {
        recordLoginAttempt(validatedData.email);
        return res.status(401).json({ message: "Invalid email or password" });
      }

      clearLoginAttempts(validatedData.email);
      req.session.userId = user.id;
      
      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.redirect("/");
      }
      res.clearCookie("connect.sid");
      res.redirect("/");
    });
  });

  app.get("/api/auth/user", async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(req.session.userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { passwordHash: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post("/api/auth/forgot-password", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (user) {
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
        
        await storage.updateUser(user.id, {
          resetToken,
          resetTokenExpiry,
        });
        
        const resetUrl = `${req.protocol}://${req.get("host")}/reset-password?token=${resetToken}`;
        
        if (emailTransporter) {
          try {
            const userName = user.firstName || user.username || 'User';
            await emailTransporter.sendMail({
              from: process.env.YANDEX_EMAIL,
              to: email,
              subject: `${userName}, восстановление пароля`,
              text: `Здравствуйте, ${userName}!\n\nВы запросили восстановление пароля.\n\nДля установки нового пароля перейдите по ссылке:\n${resetUrl}\n\nСсылка действительна 1 час.\n\nЕсли вы не запрашивали восстановление пароля, проигнорируйте это письмо.`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <p>Здравствуйте, ${userName}!</p>
                  <p>Вы запросили восстановление пароля.</p>
                  <p>Для установки нового пароля перейдите по ссылке:</p>
                  <p><a href="${resetUrl}">${resetUrl}</a></p>
                  <p>Ссылка действительна 1 час.</p>
                  <p>Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.</p>
                </div>
              `,
            });
            console.log(`Password reset email sent to: ${email}`);
          } catch (emailError) {
            console.error("Failed to send reset email:", emailError);
          }
        } else {
          console.log(`Password reset requested for user: ${email}, but Yandex SMTP is not configured`);
          console.log(`Reset URL would be: ${resetUrl}`);
        }
      }

      res.json({ 
        message: "If an account exists with this email, reset instructions have been sent." 
      });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }
      
      if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
        return res.status(400).json({ message: "Reset token has expired" });
      }
      
      const passwordHash = await hashPassword(newPassword);
      await storage.updateUser(user.id, {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      });
      
      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/set-password", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { currentPassword, newPassword } = req.body;
      
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }

      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (user.passwordHash) {
        if (!currentPassword) {
          return res.status(400).json({ message: "Current password is required" });
        }
        
        const isValidPassword = await verifyPassword(currentPassword, user.passwordHash);
        if (!isValidPassword) {
          return res.status(401).json({ message: "Current password is incorrect" });
        }
      }

      const passwordHash = await hashPassword(newPassword);
      await storage.updateUser(req.session.userId, { passwordHash });

      res.json({ message: "Password set successfully" });
    } catch (error) {
      console.error("Set password error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await storage.getUser(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ message: "Unauthorized" });
  }

  (req as any).authUser = user;
  next();
};

export function getUser(req: Request) {
  return (req as any).authUser;
}
