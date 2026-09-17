import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

// Initialize express app for testing
const app = createApp();

describe('Authentication & RBAC Suite', () => {
  // In-memory test store to simulate database state safely and quickly
  interface TestUser {
    id: string;
    email: string;
    name: string;
    password: string;
    role: 'ADMIN' | 'SALES';
    createdAt: Date;
    updatedAt: Date;
  }

  let usersDb: Map<string, TestUser>;

  beforeEach(() => {
    usersDb = new Map();

    // Mock prisma.user.findUnique
    (jest.spyOn(prisma.user, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      if (where.email) {
        for (const u of usersDb.values()) {
          if (u.email === where.email) return u as never;
        }
      }
      if (where.id) {
        return (usersDb.get(where.id) as never) || null;
      }
      return null;
    });

    // Mock prisma.user.create
    (jest.spyOn(prisma.user, 'create') as any).mockImplementation(async ({ data }: any) => {
      const newUser: TestUser = {
        id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: data.name,
        email: data.email,
        password: data.password,
        role: (data.role as 'ADMIN' | 'SALES') || 'SALES',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      usersDb.set(newUser.id, newUser);
      return newUser as never;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================
  // Test A: Successful Registration
  // ==========================================
  it('A. Should successfully register a new user and return token and safe user (no password)', async () => {
    const payload = {
      name: 'John Salesperson',
      email: 'john.sales@example.com',
      password: 'SecurePassword123',
    };

    const res = await request(app).post('/api/auth/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(payload.email);
    expect(res.body.data.user.role).toBe('SALES');
    expect(res.body.data.token).toBeDefined();
    // Verify password is NOT returned
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  // ==========================================
  // Test B: Duplicate Email Registration Rejected
  // ==========================================
  it('B. Should reject registration when email already exists with HTTP 409 Conflict', async () => {
    const existingUser: TestUser = {
      id: 'existing-id-123',
      name: 'Existing Staff',
      email: 'duplicate@example.com',
      password: await bcrypt.hash('Secret123', 10),
      role: 'SALES',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersDb.set(existingUser.id, existingUser);

    const res = await request(app).post('/api/auth/register').send({
      name: 'Duplicate Staff',
      email: 'duplicate@example.com',
      password: 'Password123',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  // ==========================================
  // Test C: Successful Login
  // ==========================================
  it('C. Should successfully log in with valid credentials and return a signed JWT', async () => {
    const rawPassword = 'CorrectPassword123';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const user: TestUser = {
      id: 'user-valid-login',
      name: 'Admin User',
      email: 'admin.login@example.com',
      password: hashedPassword,
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersDb.set(user.id, user);

    const res = await request(app).post('/api/auth/login').send({
      email: 'admin.login@example.com',
      password: rawPassword,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user.role).toBe('ADMIN');

    // Decode JWT and verify claims
    const decoded = jwt.verify(res.body.data.token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: string;
    };
    expect(decoded.id).toBe(user.id);
    expect(decoded.role).toBe('ADMIN');
  });

  // ==========================================
  // Test D: Invalid Password Rejected
  // ==========================================
  it('D. Should reject login with invalid password with HTTP 401 Unauthorized', async () => {
    const hashedPassword = await bcrypt.hash('CorrectPassword123', 10);
    const user: TestUser = {
      id: 'user-invalid-pwd',
      name: 'Sales Rep',
      email: 'rep@example.com',
      password: hashedPassword,
      role: 'SALES',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersDb.set(user.id, user);

    const res = await request(app).post('/api/auth/login').send({
      email: 'rep@example.com',
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // ==========================================
  // Test E: Missing JWT Rejected
  // ==========================================
  it('E. Should reject protected route access when JWT header is missing with HTTP 401', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // ==========================================
  // Test F: Invalid JWT Rejected
  // ==========================================
  it('F. Should reject protected route access when JWT signature is invalid with HTTP 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.garbage.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // ==========================================
  // Test G: SALES user cannot access ADMIN-only route
  // ==========================================
  it('G. Should reject SALES user accessing an ADMIN-only protected route with HTTP 403 Forbidden', async () => {
    const salesUser: TestUser = {
      id: 'sales-user-rbac',
      name: 'Sales Rep',
      email: 'sales.rbac@example.com',
      password: 'hashedpassword',
      role: 'SALES',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersDb.set(salesUser.id, salesUser);

    const salesToken = jwt.sign(
      { id: salesUser.id, email: salesUser.email, role: salesUser.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/auth/test/admin-only')
      .set('Authorization', `Bearer ${salesToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // ==========================================
  // Test H: ADMIN can access ADMIN-only route
  // ==========================================
  it('H. Should allow ADMIN user to access an ADMIN-only protected route with HTTP 200 OK', async () => {
    const adminUser: TestUser = {
      id: 'admin-user-rbac',
      name: 'Director Admin',
      email: 'admin.rbac@example.com',
      password: 'hashedpassword',
      role: 'ADMIN',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    usersDb.set(adminUser.id, adminUser);

    const adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/auth/test/admin-only')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('ADMIN');
  });

  // ==========================================
  // Privilege Escalation Guard Test
  // ==========================================
  it('Should prevent unauthenticated user from registering directly as ADMIN (falls back to SALES)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Attacker Trying Admin',
      email: 'attacker@example.com',
      password: 'Password123',
      role: 'ADMIN', // Attempts to escalate role
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    // Role MUST remain SALES
    expect(res.body.data.user.role).toBe('SALES');
  });
});
