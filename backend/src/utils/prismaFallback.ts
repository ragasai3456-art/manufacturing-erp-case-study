import { inMemoryStore } from './inMemoryDb.js';

export function createPrismaFallback() {
  const store = inMemoryStore;

  // Helper for deep cloning
  const clone = <T>(obj: T): T => (obj ? JSON.parse(JSON.stringify(obj)) : obj);

  return {
    user: {
      findUnique: async ({ where }: any) => {
        const u = store.users.find((x) => (where.id && x.id === where.id) || (where.email && x.email.toLowerCase() === where.email.toLowerCase()));
        return clone(u) || null;
      },
      findFirst: async ({ where }: any) => {
        const u = store.users.find((x) => (!where?.email || x.email.toLowerCase() === where.email.toLowerCase()));
        return clone(u) || null;
      },
      create: async ({ data }: any) => {
        const newUser = {
          id: data.id || `usr-${Date.now()}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.users.push(newUser);
        return clone(newUser);
      },
    },

    customer: {
      findMany: async ({ orderBy }: any) => {
        const sorted = [...store.customers].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return clone(sorted);
      },
      findUnique: async ({ where }: any) => {
        const c = store.customers.find((x) => x.id === where.id);
        return clone(c) || null;
      },
      create: async ({ data }: any) => {
        const newCust = {
          id: data.id || `cust-${Date.now()}`,
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.customers.push(newCust);
        return clone(newCust);
      },
      update: async ({ where, data }: any) => {
        const idx = store.customers.findIndex((x) => x.id === where.id);
        if (idx === -1) throw new Error('Customer not found');
        store.customers[idx] = { ...store.customers[idx], ...data, updatedAt: new Date() };
        return clone(store.customers[idx]);
      },
    },

    product: {
      findMany: async ({ include, orderBy }: any) => {
        const prods = store.products.map((p) => {
          const res = { ...p };
          if (include?.inventory) {
            res.inventory = store.inventories.find((inv) => inv.productId === p.id) || null;
          }
          return res;
        });
        return clone(prods);
      },
      findUnique: async ({ where, include }: any) => {
        const p = store.products.find((x) => (where.id && x.id === where.id) || (where.productCode && x.productCode === where.productCode));
        if (!p) return null;
        const res = { ...p };
        if (include?.inventory) {
          res.inventory = store.inventories.find((inv) => inv.productId === p.id) || null;
        }
        return clone(res);
      },
      create: async ({ data, include }: any) => {
        const newProd = {
          id: data.id || `prod-${Date.now()}`,
          productCode: data.productCode,
          productName: data.productName,
          category: data.category,
          unit: data.unit,
          basePrice: data.basePrice,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.products.push(newProd);

        if (data.inventory?.create) {
          const newInv = {
            id: `inv-${Date.now()}`,
            productId: newProd.id,
            physicalQuantity: data.inventory.create.physicalQuantity || 0,
            reservedQuantity: data.inventory.create.reservedQuantity || 0,
            damagedQuantity: data.inventory.create.damagedQuantity || 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          store.inventories.push(newInv);
        }

        const res: any = { ...newProd };
        if (include?.inventory) {
          res.inventory = store.inventories.find((inv) => inv.productId === newProd.id) || null;
        }
        return clone(res);
      },
      update: async ({ where, data }: any) => {
        const idx = store.products.findIndex((x) => x.id === where.id);
        if (idx === -1) throw new Error('Product not found');
        store.products[idx] = { ...store.products[idx], ...data, updatedAt: new Date() };
        return clone(store.products[idx]);
      },
    },

    inventory: {
      findMany: async ({ include }: any) => {
        const invs = store.inventories.map((inv) => {
          const res: any = { ...inv };
          if (include?.product) {
            res.product = store.products.find((p) => p.id === inv.productId) || null;
          }
          return res;
        });
        return clone(invs);
      },
      findUnique: async ({ where, include }: any) => {
        const inv = store.inventories.find((x) => (where.id && x.id === where.id) || (where.productId && x.productId === where.productId));
        if (!inv) return null;
        const res: any = { ...inv };
        if (include?.product) {
          res.product = store.products.find((p) => p.id === inv.productId) || null;
        }
        return clone(res);
      },
      update: async ({ where, data }: any) => {
        const idx = store.inventories.findIndex((x) => (where.id && x.id === where.id) || (where.productId && x.productId === where.productId));
        if (idx === -1) throw new Error('Inventory not found');

        const current = store.inventories[idx];
        const updated = {
          ...current,
          physicalQuantity: data.physicalQuantity !== undefined ? (typeof data.physicalQuantity === 'object' && 'increment' in data.physicalQuantity ? current.physicalQuantity + data.physicalQuantity.increment : (typeof data.physicalQuantity === 'object' && 'decrement' in data.physicalQuantity ? current.physicalQuantity - data.physicalQuantity.decrement : data.physicalQuantity)) : current.physicalQuantity,
          reservedQuantity: data.reservedQuantity !== undefined ? (typeof data.reservedQuantity === 'object' && 'increment' in data.reservedQuantity ? current.reservedQuantity + data.reservedQuantity.increment : (typeof data.reservedQuantity === 'object' && 'decrement' in data.reservedQuantity ? current.reservedQuantity - data.reservedQuantity.decrement : data.reservedQuantity)) : current.reservedQuantity,
          damagedQuantity: data.damagedQuantity !== undefined ? data.damagedQuantity : current.damagedQuantity,
          updatedAt: new Date(),
        };

        store.inventories[idx] = updated;
        return clone(updated);
      },
    },

    enquiry: {
      findMany: async ({ include, orderBy }: any) => {
        const list = store.enquiries.map((e) => {
          const res: any = { ...e };
          if (include?.customer) {
            res.customer = store.customers.find((c) => c.id === e.customerId) || null;
          }
          if (include?.items) {
            res.items = store.enquiryItems
              .filter((it) => it.enquiryId === e.id)
              .map((it) => ({
                ...it,
                product: include.items?.include?.product ? store.products.find((p) => p.id === it.productId) : undefined,
              }));
          }
          return res;
        });
        return clone(list);
      },
      findUnique: async ({ where, include }: any) => {
        const e = store.enquiries.find((x) => x.id === where.id);
        if (!e) return null;
        const res: any = { ...e };
        if (include?.customer) {
          res.customer = store.customers.find((c) => c.id === e.customerId) || null;
        }
        if (include?.items) {
          res.items = store.enquiryItems
            .filter((it) => it.enquiryId === e.id)
            .map((it) => ({
              ...it,
              product: include.items?.include?.product ? store.products.find((p) => p.id === it.productId) : undefined,
            }));
        }
        return clone(res);
      },
      create: async ({ data, include }: any) => {
        const enquiryId = data.id || `enq-${Date.now()}`;
        const newEnquiry = {
          id: enquiryId,
          enquiryNumber: data.enquiryNumber,
          customerId: data.customerId,
          enquiryDate: data.enquiryDate || new Date(),
          requiredDate: new Date(data.requiredDate),
          notes: data.notes || null,
          status: data.status || 'NEW',
          createdById: data.createdById,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.enquiries.push(newEnquiry);

        if (data.items?.create) {
          for (const it of data.items.create) {
            store.enquiryItems.push({
              id: `enq-it-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              enquiryId,
              productId: it.productId,
              quantity: it.quantity,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        const res: any = { ...newEnquiry };
        if (include?.customer) {
          res.customer = store.customers.find((c) => c.id === newEnquiry.customerId) || null;
        }
        if (include?.items) {
          res.items = store.enquiryItems
            .filter((it) => it.enquiryId === enquiryId)
            .map((it) => ({
              ...it,
              product: include.items?.include?.product ? store.products.find((p) => p.id === it.productId) : undefined,
            }));
        }
        return clone(res);
      },
      update: async ({ where, data }: any) => {
        const idx = store.enquiries.findIndex((x) => x.id === where.id);
        if (idx === -1) throw new Error('Enquiry not found');
        store.enquiries[idx] = { ...store.enquiries[idx], ...data, updatedAt: new Date() };
        return clone(store.enquiries[idx]);
      },
    },

    quotation: {
      findMany: async ({ include, orderBy }: any) => {
        const list = store.quotations.map((q) => {
          const res: any = { ...q };
          if (include?.customer) res.customer = store.customers.find((c) => c.id === q.customerId) || null;
          if (include?.enquiry) res.enquiry = store.enquiries.find((e) => e.id === q.enquiryId) || null;
          if (include?.items) {
            res.items = store.quotationItems
              .filter((it) => it.quotationId === q.id)
              .map((it) => ({
                ...it,
                product: include.items?.include?.product ? store.products.find((p) => p.id === it.productId) : undefined,
              }));
          }
          if (include?.salesOrder) {
            res.salesOrder = store.salesOrders.find((so) => so.quotationId === q.id) || null;
          }
          return res;
        });
        return clone(list);
      },
      findUnique: async ({ where, include }: any) => {
        const q = store.quotations.find((x) => x.id === where.id);
        if (!q) return null;
        const res: any = { ...q };
        if (include?.customer) res.customer = store.customers.find((c) => c.id === q.customerId) || null;
        if (include?.enquiry) res.enquiry = store.enquiries.find((e) => e.id === q.enquiryId) || null;
        if (include?.items) {
          res.items = store.quotationItems
            .filter((it) => it.quotationId === q.id)
            .map((it) => ({
              ...it,
              product: include.items?.include?.product ? store.products.find((p) => p.id === it.productId) : undefined,
            }));
        }
        if (include?.salesOrder) {
          res.salesOrder = store.salesOrders.find((so) => so.quotationId === q.id) || null;
        }
        return clone(res);
      },
      create: async ({ data, include }: any) => {
        const quotationId = data.id || `quo-${Date.now()}`;
        const newQuo = {
          id: quotationId,
          quotationNumber: data.quotationNumber,
          enquiryId: data.enquiryId,
          customerId: data.customerId,
          validUntil: new Date(data.validUntil),
          subtotal: Number(data.subtotal),
          discountAmount: Number(data.discountAmount || 0),
          gstAmount: Number(data.gstAmount || 0),
          grandTotal: Number(data.grandTotal),
          status: data.status || 'DRAFT',
          createdById: data.createdById,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.quotations.push(newQuo);

        if (data.items?.create) {
          for (const it of data.items.create) {
            store.quotationItems.push({
              id: `quo-it-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              quotationId,
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: Number(it.unitPrice),
              discountPct: Number(it.discountPct || 0),
              gstPct: Number(it.gstPct || 18),
              lineAmount: Number(it.lineAmount),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        const res: any = { ...newQuo };
        if (include?.customer) res.customer = store.customers.find((c) => c.id === newQuo.customerId) || null;
        if (include?.items) {
          res.items = store.quotationItems
            .filter((it) => it.quotationId === quotationId)
            .map((it) => ({
              ...it,
              product: include.items?.include?.product ? store.products.find((p) => p.id === it.productId) : undefined,
            }));
        }
        return clone(res);
      },
      update: async ({ where, data }: any) => {
        const idx = store.quotations.findIndex((x) => x.id === where.id);
        if (idx === -1) throw new Error('Quotation not found');
        store.quotations[idx] = { ...store.quotations[idx], ...data, updatedAt: new Date() };
        return clone(store.quotations[idx]);
      },
    },

    salesOrder: {
      findMany: async ({ include, orderBy }: any) => {
        const list = store.salesOrders.map((so) => {
          const res: any = { ...so };
          if (include?.customer) res.customer = store.customers.find((c) => c.id === so.customerId) || null;
          if (include?.quotation) res.quotation = store.quotations.find((q) => q.id === so.quotationId) || null;
          if (include?.confirmedBy) res.confirmedBy = store.users.find((u) => u.id === so.confirmedById) || null;
          if (include?.cancelledBy) res.cancelledBy = store.users.find((u) => u.id === so.cancelledById) || null;
          if (include?.dispatch) {
            const d = store.dispatches.find((disp) => disp.salesOrderId === so.id);
            res.dispatch = d ? clone(d) : null;
          }
          if (include?.items) {
            res.items = store.salesOrderItems
              .filter((it) => it.salesOrderId === so.id)
              .map((it) => ({
                ...it,
                product: include.items?.include?.product ? store.products.find((p) => p.id === it.productId) : undefined,
              }));
          }
          return res;
        });
        return clone(list);
      },
      findUnique: async ({ where, include }: any) => {
        const so = store.salesOrders.find((x) => (where.id && x.id === where.id) || (where.quotationId && x.quotationId === where.quotationId));
        if (!so) return null;
        const res: any = { ...so };
        if (include?.customer) res.customer = store.customers.find((c) => c.id === so.customerId) || null;
        if (include?.quotation) res.quotation = store.quotations.find((q) => q.id === so.quotationId) || null;
        if (include?.confirmedBy) res.confirmedBy = store.users.find((u) => u.id === so.confirmedById) || null;
        if (include?.cancelledBy) res.cancelledBy = store.users.find((u) => u.id === so.cancelledById) || null;
        if (include?.dispatch) {
          const d = store.dispatches.find((disp) => disp.salesOrderId === so.id);
          res.dispatch = d ? clone(d) : null;
        }
        if (include?.items) {
          res.items = store.salesOrderItems
            .filter((it) => it.salesOrderId === so.id)
            .map((it) => ({
              ...it,
              product: include.items?.include?.product ? store.products.find((p) => p.id === it.productId) : undefined,
            }));
        }
        return clone(res);
      },
      create: async ({ data, include }: any) => {
        // Enforce uniqueness of quotationId
        if (store.salesOrders.some((x) => x.quotationId === data.quotationId)) {
          const err: any = new Error('A sales order with this quotationId already exists.');
          err.code = 'P2002';
          err.meta = { target: ['quotationId'] };
          throw err;
        }

        const soId = data.id || `so-${Date.now()}`;
        const newSo = {
          id: soId,
          orderNumber: data.orderNumber,
          customerId: data.customerId,
          quotationId: data.quotationId,
          orderDate: data.orderDate || new Date(),
          totalAmount: Number(data.totalAmount),
          status: data.status || 'PENDING',
          confirmedById: data.confirmedById || null,
          cancelledById: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.salesOrders.push(newSo);

        if (data.items?.create) {
          for (const it of data.items.create) {
            store.salesOrderItems.push({
              id: `so-it-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              salesOrderId: soId,
              productId: it.productId,
              quantity: it.quantity,
              unitPrice: Number(it.unitPrice),
              lineAmount: Number(it.lineAmount),
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        const res: any = { ...newSo };
        if (include?.customer) res.customer = store.customers.find((c) => c.id === newSo.customerId) || null;
        if (include?.quotation) res.quotation = store.quotations.find((q) => q.id === newSo.quotationId) || null;
        if (include?.items) {
          res.items = store.salesOrderItems
            .filter((it) => it.salesOrderId === soId)
            .map((it) => ({
              ...it,
              product: include.items?.include?.product ? store.products.find((p) => p.id === it.productId) : undefined,
            }));
        }
        return clone(res);
      },
      update: async ({ where, data, include }: any) => {
        const idx = store.salesOrders.findIndex((x) => x.id === where.id);
        if (idx === -1) throw new Error('Sales order not found');
        store.salesOrders[idx] = { ...store.salesOrders[idx], ...data, updatedAt: new Date() };

        const res: any = { ...store.salesOrders[idx] };
        if (include?.customer) res.customer = store.customers.find((c) => c.id === res.customerId) || null;
        if (include?.quotation) res.quotation = store.quotations.find((q) => q.id === res.quotationId) || null;
        if (include?.items) {
          res.items = store.salesOrderItems
            .filter((it) => it.salesOrderId === res.id)
            .map((it) => ({
              ...it,
              product: include.items?.include?.product ? store.products.find((p) => p.id === it.productId) : undefined,
            }));
        }
        return clone(res);
      },
    },

    dispatch: {
      findMany: async ({ include }: any) => clone(store.dispatches),
      findUnique: async ({ where }: any) => {
        const d = store.dispatches.find((x) => (where.id && x.id === where.id) || (where.salesOrderId && x.salesOrderId === where.salesOrderId));
        return clone(d) || null;
      },
      create: async ({ data, include }: any) => {
        // Enforce uniqueness of salesOrderId
        if (store.dispatches.some((x) => x.salesOrderId === data.salesOrderId)) {
          const err: any = new Error('A dispatch for this salesOrderId already exists.');
          err.code = 'P2002';
          err.meta = { target: ['salesOrderId'] };
          throw err;
        }

        const dispId = data.id || `disp-${Date.now()}`;
        const newDisp = {
          id: dispId,
          dispatchNumber: data.dispatchNumber,
          salesOrderId: data.salesOrderId,
          dispatchDate: data.dispatchDate || new Date(),
          vehicleNumber: data.vehicleNumber,
          driverName: data.driverName,
          notes: data.notes || null,
          dispatchedById: data.dispatchedById,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        store.dispatches.push(newDisp);

        if (data.items?.create) {
          for (const it of data.items.create) {
            store.dispatchItems.push({
              id: `disp-it-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              dispatchId: dispId,
              productId: it.productId,
              quantity: it.quantity,
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }

        const res: any = { ...newDisp };
        if (include?.items) {
          res.items = store.dispatchItems
            .filter((it) => it.dispatchId === dispId)
            .map((it) => ({
              ...it,
              product: include.items?.include?.product ? store.products.find((p) => p.id === it.productId) : undefined,
            }));
        }
        return clone(res);
      },
    },

    // Transaction & Raw query support
    $transaction: async (fnOrArray: any) => {
      if (typeof fnOrArray === 'function') {
        // Pass the fallback client into the callback
        return await fnOrArray(createPrismaFallback());
      }
      return Promise.all(fnOrArray);
    },

    $queryRaw: async (query: any, ...values: any[]) => {
      // In-memory row-level lock simulation
      // Extract productIds if matching SELECT ... FROM inventories WHERE product_id IN (...) FOR UPDATE
      return [];
    },

    $connect: async () => {},
    $disconnect: async () => {},
  };
}
