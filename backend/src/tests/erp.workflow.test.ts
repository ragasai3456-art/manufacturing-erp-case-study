import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';

const app = createApp();

describe('Manufacturing ERP End-to-End Business Logic & RBAC Suite', () => {
  // In-memory simulation state for unit/integration testing
  let customersMap: Map<string, any>;
  let productsMap: Map<string, any>;
  let inventoriesMap: Map<string, any>;
  let enquiriesMap: Map<string, any>;
  let quotationsMap: Map<string, any>;
  let salesOrdersMap: Map<string, any>;
  let dispatchesMap: Map<string, any>;

  // Test credentials & tokens
  const adminUser = {
    id: 'admin-user-id',
    email: 'admin@example.com',
    name: 'Administrator',
    role: 'ADMIN' as const,
  };

  const salesUser = {
    id: 'sales-user-id',
    email: 'sales@example.com',
    name: 'Sales Rep',
    role: 'SALES' as const,
  };

  let adminToken: string;
  let salesToken: string;

  beforeEach(() => {
    customersMap = new Map();
    productsMap = new Map();
    inventoriesMap = new Map();
    enquiriesMap = new Map();
    quotationsMap = new Map();
    salesOrdersMap = new Map();
    dispatchesMap = new Map();

    adminToken = jwt.sign(
      { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    salesToken = jwt.sign(
      { id: salesUser.id, email: salesUser.email, role: salesUser.role },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Setup base customer
    customersMap.set('cust-1', {
      id: 'cust-1',
      companyName: 'Apex Machinery Ltd',
      contactPerson: 'David Miller',
      mobile: '+91 9876543210',
      email: 'david@apexmachinery.com',
      city: 'Pune',
      createdAt: new Date(),
      updatedAt: new Date(),
      enquiries: [],
      quotations: [],
      salesOrders: [],
    });

    // Setup base product & inventory
    const sampleProduct = {
      id: 'prod-bearing-1',
      productCode: 'BRG-6205',
      productName: 'Deep Groove Ball Bearing',
      category: 'Bearings',
      unit: 'PCS',
      basePrice: 1000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    productsMap.set(sampleProduct.id, sampleProduct);

    inventoriesMap.set(sampleProduct.id, {
      id: 'inv-1',
      productId: sampleProduct.id,
      physicalQuantity: 100,
      reservedQuantity: 30,
      damagedQuantity: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      product: sampleProduct,
    });

    // ==========================================
    // Mock Prisma methods
    // ==========================================
    (jest.spyOn(prisma.customer, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return (customersMap.get(where.id as string) as never) || null;
    });

    (jest.spyOn(prisma.customer, 'findMany') as any).mockImplementation(async () => {
      return Array.from(customersMap.values()) as never;
    });

    (jest.spyOn(prisma.customer, 'create') as any).mockImplementation(async ({ data }: any) => {
      const c = { id: `cust-${Date.now()}`, ...data, createdAt: new Date(), updatedAt: new Date() };
      customersMap.set(c.id, c);
      return c as never;
    });

    (jest.spyOn(prisma.product, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      if (where.id) return (productsMap.get(where.id) as never) || null;
      if (where.productCode) {
        for (const p of productsMap.values()) {
          if (p.productCode === where.productCode) return p as never;
        }
      }
      return null;
    });

    (jest.spyOn(prisma.product, 'findMany') as any).mockImplementation(async ({ where }: any) => {
      if (where?.id?.in) {
        const inIds = where.id.in as string[];
        return inIds.map((id) => productsMap.get(id)).filter(Boolean) as never;
      }
      return Array.from(productsMap.values()).map((p) => ({
        ...p,
        inventory: inventoriesMap.get(p.id) || null,
      })) as never;
    });

    (jest.spyOn(prisma.inventory, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return (inventoriesMap.get(where.productId) as never) || null;
    });

    (jest.spyOn(prisma.inventory, 'findMany') as any).mockImplementation(async ({ where }: any) => {
      if (where?.productId?.in) {
        const inIds = where.productId.in as string[];
        return inIds.map((id) => inventoriesMap.get(id)).filter(Boolean) as never;
      }
      return Array.from(inventoriesMap.values()) as never;
    });

    (jest.spyOn(prisma.inventory, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const current = inventoriesMap.get(where.productId);
      if (!current) throw new Error('Inventory not found');

      let newPhysical = current.physicalQuantity;
      let newReserved = current.reservedQuantity;
      let newDamaged = current.damagedQuantity;

      if (data.physicalQuantity !== undefined) {
        if (typeof data.physicalQuantity === 'number') newPhysical = data.physicalQuantity;
        else if (data.physicalQuantity.decrement) newPhysical -= data.physicalQuantity.decrement;
        else if (data.physicalQuantity.increment) newPhysical += data.physicalQuantity.increment;
      }

      if (data.reservedQuantity !== undefined) {
        if (typeof data.reservedQuantity === 'number') newReserved = data.reservedQuantity;
        else if (data.reservedQuantity.decrement) newReserved -= data.reservedQuantity.decrement;
        else if (data.reservedQuantity.increment) newReserved += data.reservedQuantity.increment;
      }

      if (data.damagedQuantity !== undefined) {
        newDamaged = data.damagedQuantity as number;
      }

      const updated = {
        ...current,
        physicalQuantity: newPhysical,
        reservedQuantity: newReserved,
        damagedQuantity: newDamaged,
        updatedAt: new Date(),
      };
      inventoriesMap.set(where.productId, updated);
      return updated as never;
    });

    (jest.spyOn(prisma.enquiry, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return (enquiriesMap.get(where.id) as never) || null;
    });

    (jest.spyOn(prisma.enquiry, 'findMany') as any).mockImplementation(async () => {
      return Array.from(enquiriesMap.values()) as never;
    });

    (jest.spyOn(prisma.enquiry, 'create') as any).mockImplementation(async ({ data }: any) => {
      const e = {
        id: `enq-${Date.now()}`,
        ...data,
        customer: customersMap.get(data.customerId),
        items: (data.items as any).create.map((item: any) => ({
          id: `item-${Math.random()}`,
          productId: item.productId,
          quantity: item.quantity,
          product: productsMap.get(item.productId),
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      enquiriesMap.set(e.id, e);
      return e as never;
    });

    (jest.spyOn(prisma.enquiry, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const current = enquiriesMap.get(where.id);
      if (!current) throw new Error('Enquiry not found');
      const updated = { ...current, ...data, updatedAt: new Date() };
      enquiriesMap.set(where.id, updated);
      return updated as never;
    });

    (jest.spyOn(prisma.quotation, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      return (quotationsMap.get(where.id) as never) || null;
    });

    (jest.spyOn(prisma.quotation, 'findMany') as any).mockImplementation(async () => {
      return Array.from(quotationsMap.values()) as never;
    });

    (jest.spyOn(prisma.quotation, 'create') as any).mockImplementation(async ({ data }: any) => {
      const q = {
        id: `quo-${Date.now()}`,
        ...data,
        customer: customersMap.get(data.customerId),
        items: (data.items as any).create.map((item: any) => ({
          id: `qitem-${Math.random()}`,
          ...item,
          product: productsMap.get(item.productId),
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      quotationsMap.set(q.id, q);
      return q as never;
    });

    (jest.spyOn(prisma.quotation, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const current = quotationsMap.get(where.id);
      if (!current) throw new Error('Quotation not found');
      const updated = { ...current, ...data, updatedAt: new Date() };
      quotationsMap.set(where.id, updated);
      return updated as never;
    });

    (jest.spyOn(prisma.salesOrder, 'findUnique') as any).mockImplementation(async ({ where }: any) => {
      if (where.id) return (salesOrdersMap.get(where.id) as never) || null;
      if (where.quotationId) {
        for (const order of salesOrdersMap.values()) {
          if (order.quotationId === where.quotationId) return order as never;
        }
      }
      return null;
    });

    (jest.spyOn(prisma.salesOrder, 'findMany') as any).mockImplementation(async () => {
      return Array.from(salesOrdersMap.values()) as never;
    });

    (jest.spyOn(prisma.salesOrder, 'create') as any).mockImplementation(async ({ data }: any) => {
      // Check unique constraint on quotationId
      for (const order of salesOrdersMap.values()) {
        if (order.quotationId === data.quotationId) {
          const err: any = new Error('Unique constraint failed on quotationId');
          err.code = 'P2002';
          throw err;
        }
      }
      const so = {
        id: `so-${Date.now()}`,
        ...data,
        customer: customersMap.get(data.customerId),
        items: (data.items as any).create.map((item: any) => ({
          id: `soitem-${Math.random()}`,
          ...item,
          product: productsMap.get(item.productId),
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      salesOrdersMap.set(so.id, so);

      // Link salesOrder on quotation
      const q = quotationsMap.get(data.quotationId);
      if (q) q.salesOrder = so;

      return so as never;
    });

    (jest.spyOn(prisma.salesOrder, 'update') as any).mockImplementation(async ({ where, data }: any) => {
      const current = salesOrdersMap.get(where.id);
      if (!current) throw new Error('Sales order not found');
      const updated = { ...current, ...data, updatedAt: new Date() };
      salesOrdersMap.set(where.id, updated);
      return updated as never;
    });

    (jest.spyOn(prisma.quotation, 'count') as any).mockImplementation(async () => {
      return quotationsMap.size;
    });

    (jest.spyOn(prisma.salesOrder, 'count') as any).mockImplementation(async () => {
      return salesOrdersMap.size;
    });

    (jest.spyOn(prisma.dispatch, 'count') as any).mockImplementation(async () => {
      return dispatchesMap.size;
    });

    (jest.spyOn(prisma.dispatch, 'create') as any).mockImplementation(async ({ data }: any) => {
      // Check unique constraint on salesOrderId
      for (const d of dispatchesMap.values()) {
        if (d.salesOrderId === data.salesOrderId) {
          const err: any = new Error('Unique constraint failed on salesOrderId');
          err.code = 'P2002';
          throw err;
        }
      }
      const d = {
        id: `dsp-${Date.now()}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      dispatchesMap.set(d.id, d);
      return d as never;
    });

    // Mock $transaction to execute callback with prisma
    (jest.spyOn(prisma, '$transaction') as any).mockImplementation(async (cb: any) => {
      return cb(prisma);
    });

    // Mock $queryRaw for row lock
    (jest.spyOn(prisma, '$queryRaw') as any).mockImplementation(async () => {
      return [];
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ==========================================
  // TEST 1: Quotation total is calculated correctly
  // ==========================================
  it('TEST 1: Backend authoritatively calculates quotation total (Quantity: 10, Unit Price: 1000, Discount: 10%, GST: 18% => 10620)', async () => {
    // 1. Create Enquiry
    const enquiry = {
      id: 'enq-calc-test',
      enquiryNumber: 'ENQ-2026-TEST',
      customerId: 'cust-1',
      requiredDate: new Date(),
      status: 'NEW',
      items: [{ productId: 'prod-bearing-1', quantity: 10 }],
    };
    enquiriesMap.set(enquiry.id, enquiry);

    // 2. Submit Quotation creation
    // Client tries to send bogus totals; backend must recalculate authoritatively
    const res = await request(app)
      .post('/api/quotations')
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        enquiryId: enquiry.id,
        customerId: 'cust-1',
        validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
        items: [
          {
            productId: 'prod-bearing-1',
            quantity: 10,
            unitPrice: 1000,
            discountPct: 10,
            gstPct: 18,
            // Even if client passes forged totals, backend ignores them
            lineAmount: 999999,
          },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    const quotation = res.body.data;
    // Base Amount = 10 * 1000 = 10000
    // Discount Amount = 10000 * 10% = 1000
    // After Discount = 9000
    // GST Amount = 9000 * 18% = 1620
    // Line Amount = 9000 + 1620 = 10620
    // Grand Total = 10620
    expect(quotation.subtotal).toBe(10000);
    expect(quotation.discountAmount).toBe(1000);
    expect(quotation.gstAmount).toBe(1620);
    expect(quotation.grandTotal).toBe(10620);
    expect(quotation.items[0].lineAmount).toBe(10620);
  });

  // ==========================================
  // TEST 2: DRAFT or REJECTED quotation cannot create a Sales Order
  // ==========================================
  it('TEST 2: DRAFT or REJECTED quotation cannot create a Sales Order, only ACCEPTED succeeds', async () => {
    // Create base quotation
    const quotation = {
      id: 'quo-test-transitions',
      quotationNumber: 'QUO-TRANS-01',
      customerId: 'cust-1',
      enquiryId: 'enq-calc-test',
      status: 'DRAFT',
      grandTotal: 10620,
      items: [{ productId: 'prod-bearing-1', quantity: 10, unitPrice: 1000, lineAmount: 10620 }],
    };
    quotationsMap.set(quotation.id, quotation);

    // 1. Attempt convert DRAFT -> Fail (409 Conflict)
    const draftRes = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(draftRes.status).toBe(409);
    expect(draftRes.body.success).toBe(false);
    expect(draftRes.body.error.message).toContain('Only ACCEPTED quotations may be converted');

    // 2. Move DRAFT to SENT, then to REJECTED
    quotation.status = 'REJECTED';

    // 3. Attempt convert REJECTED -> Fail (409 Conflict)
    const rejectedRes = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(rejectedRes.status).toBe(409);
    expect(rejectedRes.body.success).toBe(false);
    expect(rejectedRes.body.error.message).toContain('Only ACCEPTED quotations may be converted');

    // 4. Move quotation to ACCEPTED
    quotation.status = 'ACCEPTED';

    // 5. Attempt convert ACCEPTED -> Success (201 Created)
    const acceptedRes = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(acceptedRes.status).toBe(201);
    expect(acceptedRes.body.success).toBe(true);
    expect(acceptedRes.body.data.status).toBe('PENDING');
    expect(acceptedRes.body.data.orderNumber).toMatch(/^SO-/);
  });

  // ==========================================
  // TEST 3: Same quotation cannot generate duplicate Sales Orders
  // ==========================================
  it('TEST 3: Same quotation cannot generate duplicate Sales Orders (unique constraint protection)', async () => {
    const quotation = {
      id: 'quo-dup-test',
      quotationNumber: 'QUO-DUP-01',
      customerId: 'cust-1',
      enquiryId: 'enq-calc-test',
      status: 'ACCEPTED',
      grandTotal: 5000,
      items: [{ productId: 'prod-bearing-1', quantity: 5, unitPrice: 1000, lineAmount: 5000 }],
    };
    quotationsMap.set(quotation.id, quotation);

    // First conversion -> Success
    const firstRes = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(firstRes.status).toBe(201);
    expect(firstRes.body.success).toBe(true);

    // Second conversion of the same quotation -> Fails with Conflict 409
    const secondRes = await request(app)
      .post(`/api/quotations/${quotation.id}/convert`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(secondRes.status).toBe(409);
    expect(secondRes.body.success).toBe(false);
    expect(secondRes.body.error.message).toContain('already exists');
  });

  // ==========================================
  // TEST 4: Cannot reserve more than available inventory
  // ==========================================
  it('TEST 4: Cannot reserve more than available inventory (Physical: 100, Reserved: 30, Available: 70)', async () => {
    // Set inventory: Physical = 100, Reserved = 30, Available = 70
    inventoriesMap.set('prod-bearing-1', {
      id: 'inv-1',
      productId: 'prod-bearing-1',
      physicalQuantity: 100,
      reservedQuantity: 30,
      damagedQuantity: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Create Order with quantity = 80 (exceeds available 70!)
    const excessiveOrder = {
      id: 'so-excessive-80',
      orderNumber: 'SO-EXCESSIVE-80',
      customerId: 'cust-1',
      status: 'PENDING',
      items: [{ productId: 'prod-bearing-1', quantity: 80 }],
    };
    salesOrdersMap.set(excessiveOrder.id, excessiveOrder);

    // ADMIN attempts to confirm -> Fails with 409 Conflict
    const overRes = await request(app)
      .post(`/api/sales-orders/${excessiveOrder.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(overRes.status).toBe(409);
    expect(overRes.body.success).toBe(false);
    expect(overRes.body.error.message).toContain('Insufficient inventory');

    // Verify order remains PENDING and inventory unchanged
    expect(salesOrdersMap.get(excessiveOrder.id).status).toBe('PENDING');
    expect(inventoriesMap.get('prod-bearing-1').reservedQuantity).toBe(30);
    expect(inventoriesMap.get('prod-bearing-1').physicalQuantity).toBe(100);

    // Now test valid reservation: Quantity = 60 (within available 70!)
    const validOrder = {
      id: 'so-valid-60',
      orderNumber: 'SO-VALID-60',
      customerId: 'cust-1',
      status: 'PENDING',
      items: [{ productId: 'prod-bearing-1', quantity: 60 }],
    };
    salesOrdersMap.set(validOrder.id, validOrder);

    const validRes = await request(app)
      .post(`/api/sales-orders/${validOrder.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(validRes.status).toBe(200);
    expect(validRes.body.success).toBe(true);

    // Verified invariants:
    // Order becomes CONFIRMED
    expect(salesOrdersMap.get(validOrder.id).status).toBe('CONFIRMED');
    // Reserved becomes 30 + 60 = 90
    expect(inventoriesMap.get('prod-bearing-1').reservedQuantity).toBe(90);
    // Physical remains unchanged at 100
    expect(inventoriesMap.get('prod-bearing-1').physicalQuantity).toBe(100);
  });

  // ==========================================
  // TEST 5: Unauthorized user cannot perform restricted operations
  // ==========================================
  it('TEST 5: SALES user cannot perform restricted ADMIN operations (confirm, dispatch, modify inventory)', async () => {
    const order = {
      id: 'so-rbac-test',
      orderNumber: 'SO-RBAC-01',
      customerId: 'cust-1',
      status: 'PENDING',
      items: [{ productId: 'prod-bearing-1', quantity: 5 }],
    };
    salesOrdersMap.set(order.id, order);

    // 1. SALES attempts to confirm order -> 403 Forbidden
    const salesConfirmRes = await request(app)
      .post(`/api/sales-orders/${order.id}/confirm`)
      .set('Authorization', `Bearer ${salesToken}`);

    expect(salesConfirmRes.status).toBe(403);
    expect(salesConfirmRes.body.error.code).toBe('FORBIDDEN');

    // 2. SALES attempts to dispatch order -> 403 Forbidden
    const salesDispatchRes = await request(app)
      .post(`/api/sales-orders/${order.id}/dispatch`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ vehicleNumber: 'MH-12-AB-1234', driverName: 'Ramesh' });

    expect(salesDispatchRes.status).toBe(403);
    expect(salesDispatchRes.body.error.code).toBe('FORBIDDEN');

    // 3. SALES attempts to modify physical inventory -> 403 Forbidden
    const salesInvRes = await request(app)
      .patch(`/api/inventory/prod-bearing-1`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({ physicalQuantity: 500 });

    expect(salesInvRes.status).toBe(403);
    expect(salesInvRes.body.error.code).toBe('FORBIDDEN');

    // 4. ADMIN succeeds on confirm
    const adminConfirmRes = await request(app)
      .post(`/api/sales-orders/${order.id}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminConfirmRes.status).toBe(200);
    expect(adminConfirmRes.body.success).toBe(true);
  });

  // ==========================================
  // BONUS TEST: Concurrent reservation race condition simulation
  // ==========================================
  it('BONUS TEST: Concurrent reservation requests with Available = 100 (Req A: 80, Req B: 50) - Only one succeeds, final reserved never exceeds 100', async () => {
    // Inventory: Physical = 100, Reserved = 0, Damaged = 0 => Available = 100
    inventoriesMap.set('prod-bearing-1', {
      id: 'inv-1',
      productId: 'prod-bearing-1',
      physicalQuantity: 100,
      reservedQuantity: 0,
      damagedQuantity: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const orderA = {
      id: 'so-race-a',
      orderNumber: 'SO-RACE-A',
      customerId: 'cust-1',
      status: 'PENDING',
      items: [{ productId: 'prod-bearing-1', quantity: 80 }],
    };
    salesOrdersMap.set(orderA.id, orderA);

    const orderB = {
      id: 'so-race-b',
      orderNumber: 'SO-RACE-B',
      customerId: 'cust-1',
      status: 'PENDING',
      items: [{ productId: 'prod-bearing-1', quantity: 50 }],
    };
    salesOrdersMap.set(orderB.id, orderB);

    // Execute concurrently
    const [resA, resB] = await Promise.all([
      request(app)
        .post(`/api/sales-orders/${orderA.id}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`),
      request(app)
        .post(`/api/sales-orders/${orderB.id}/confirm`)
        .set('Authorization', `Bearer ${adminToken}`),
    ]);

    const statuses = [resA.status, resB.status];
    // Exactly one should succeed with 200, and the other MUST fail with 409 Conflict
    expect(statuses).toContain(200);
    expect(statuses).toContain(409);

    // The final reserved quantity MUST NOT exceed 100 (never 130!)
    const finalInv = inventoriesMap.get('prod-bearing-1');
    expect(finalInv.reservedQuantity).toBeLessThanOrEqual(100);
    expect([80, 50]).toContain(finalInv.reservedQuantity);
  });

  // ==========================================
  // ADDITIONAL TEST: Dispatch Workflow & Inventory Deduction
  // ==========================================
  it('ADDITIONAL TEST: Dispatch confirmed order deducts both physical and reserved quantity', async () => {
    // Setup confirmed order
    inventoriesMap.set('prod-bearing-1', {
      id: 'inv-1',
      productId: 'prod-bearing-1',
      physicalQuantity: 100,
      reservedQuantity: 60,
      damagedQuantity: 0,
    });

    const confirmedOrder = {
      id: 'so-to-dispatch',
      orderNumber: 'SO-DSP-01',
      customerId: 'cust-1',
      status: 'CONFIRMED',
      items: [{ productId: 'prod-bearing-1', quantity: 60 }],
    };
    salesOrdersMap.set(confirmedOrder.id, confirmedOrder);

    // ADMIN dispatches
    const res = await request(app)
      .post(`/api/sales-orders/${confirmedOrder.id}/dispatch`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        vehicleNumber: 'MH-12-QW-9999',
        driverName: 'Vikram Singh',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.salesOrder.status).toBe('DISPATCHED');
    expect(res.body.data.dispatch.dispatchNumber).toMatch(/^DSP-/);

    // Inventory check:
    // Physical: 100 - 60 = 40
    // Reserved: 60 - 60 = 0
    const inv = inventoriesMap.get('prod-bearing-1');
    expect(inv.physicalQuantity).toBe(40);
    expect(inv.reservedQuantity).toBe(0);
  });

  // ==========================================
  // ADDITIONAL TEST: Cancellation releases reserved inventory
  // ==========================================
  it('ADDITIONAL TEST: Cancelling a CONFIRMED order releases the reserved stock back to available', async () => {
    inventoriesMap.set('prod-bearing-1', {
      id: 'inv-1',
      productId: 'prod-bearing-1',
      physicalQuantity: 100,
      reservedQuantity: 40,
      damagedQuantity: 0,
    });

    const confirmedOrder = {
      id: 'so-cancel-test',
      orderNumber: 'SO-CANCEL-01',
      customerId: 'cust-1',
      status: 'CONFIRMED',
      items: [{ productId: 'prod-bearing-1', quantity: 40 }],
    };
    salesOrdersMap.set(confirmedOrder.id, confirmedOrder);

    // ADMIN cancels
    const res = await request(app)
      .post(`/api/sales-orders/${confirmedOrder.id}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Client requested cancellation' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('CANCELLED');

    // Reserved quantity was released back from 40 to 0
    const inv = inventoriesMap.get('prod-bearing-1');
    expect(inv.physicalQuantity).toBe(100);
    expect(inv.reservedQuantity).toBe(0);
  });
});
