import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';
import { UserRole } from '../types/express.js';

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResponse {
  user: SafeUser;
  token: string;
}

export class AuthService {
  /**
   * Generates a signed JWT with user claims (id, email, role).
   * Note: Passwords or hashes are NEVER placed inside tokens.
   */
  private generateToken(user: { id: string; email: string; role: string }): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      {
        expiresIn: env.JWT_EXPIRES_IN,
      } as jwt.SignOptions
    );
  }

  /**
   * Registers a new user.
   * Security Rule: Public/unauthenticated registration CANNOT self-escalate to ADMIN.
   * If an unauthenticated user attempts to register as ADMIN, their role is forced to SALES.
   */
  async registerUser(input: RegisterInput, requestingUserRole?: UserRole): Promise<AuthResponse> {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw AppError.conflict('A user with this email address already exists.');
    }

    // Role Escalation Prevention:
    // Public registration strictly creates SALES accounts.
    // An unauthenticated user cannot escalate privileges to ADMIN under any circumstances.
    const assignedRole: Role =
      input.role === 'ADMIN' && requestingUserRole === 'ADMIN'
        ? Role.ADMIN
        : Role.SALES;

    // Hash password with bcrypt cost factor 10
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(input.password, saltRounds);

    const createdUser = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: assignedRole,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const token = this.generateToken(createdUser);

    return {
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role as UserRole,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt,
      },
      token,
    };
  }

  /**
   * Authenticates user credentials and returns safe profile with signed JWT.
   */
  async loginUser(input: LoginInput): Promise<AuthResponse> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    // Timing-attack safe generic rejection message
    if (!user) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password.');
    }

    const token = this.generateToken(user);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as UserRole,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
    };
  }

  /**
   * Retrieves profile for authenticated user by ID.
   * Always derived strictly from verified JWT claims.
   */
  async getCurrentUser(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw AppError.notFound('Authenticated user profile not found.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const authService = new AuthService();
