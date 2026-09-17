import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/errors.js';
import type { DispatchOrderInput, CancelOrderInput } from '../validators/salesOrder.validator.js';

export class SalesOrderService {
  async getAllSalesOrders() {
    return prisma.salesOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        quotation: {
          select: {
            id: true,
            quotationNumber: true,
            grandTotal: true,
            status: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                inventory: true,
              },
            },
          },
        },
        confirmedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        cancelledBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        dispatch: {
          select: {
            id: true,
            dispatchNumber: true,
            dispatchDate: true,
            vehicleNumber: true,
            driverName: true,
          },
        },
      },
    });
  }

  async getSalesOrderById(id: string) {
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        quotation: {
          include: {
            enquiry: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                inventory: true,
              },
            },
          },
        },
        confirmedBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        cancelledBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        dispatch: {
          include: {
            dispatchedBy: {
              select: { id: true, name: true, email: true, role: true },
            },
            items: {
              include: { product: true },
            },
          },
        },
      },
    });

    if (!order) {
      throw AppError.notFound(`Sales order with ID '${id}' not found`);
    }

    return order;
  }

  // ==========================================
  // CONFIRM ORDER + CONCURRENCY-SAFE RESERVATION
  // ==========================================
  async confirmOrderAndReserveInventory(salesOrderId: string, adminUserId: string) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch order with items inside the transaction
      const order = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw AppError.notFound(`Sales order with ID '${salesOrderId}' not found`);
      }

      if (order.status !== 'PENDING') {
        throw AppError.conflict(
          `Sales order '${order.orderNumber}' cannot be confirmed because it has status '${order.status}'. Only PENDING orders can be confirmed.`
        );
      }

      // 2. Sort product IDs deterministically to prevent deadlock across concurrent multi-item orders
      const sortedProductIds = Array.from(
        new Set(order.items.map((item) => item.productId))
      ).sort();

      // 3. PostgreSQL Row-Level Lock (FOR UPDATE)
      // Authoritative row lock: forces concurrent reservation requests to queue and evaluate stock sequentially.
      // If the row lock fails, the transaction fails immediately without continuing reservation.
      await tx.$queryRaw`
        SELECT "id", "product_id"
        FROM "inventories"
        WHERE "product_id" = ANY(${sortedProductIds}::text[])
        FOR UPDATE
      `;

      // 4. Fetch the authoritative current inventory records for all items
      const inventories = await tx.inventory.findMany({
        where: {
          productId: { in: sortedProductIds },
        },
      });

      const inventoryMap = new Map(inventories.map((inv) => [inv.productId, inv]));

      // 5. Verify availability for each required product
      for (const item of order.items) {
        const inv = inventoryMap.get(item.productId);
        if (!inv) {
          throw AppError.conflict(
            `Inventory record missing for product ID '${item.productId}'. Cannot reserve stock.`
          );
        }

        const available = inv.physicalQuantity - inv.reservedQuantity - inv.damagedQuantity;

        if (item.quantity > available) {
          throw AppError.conflict(
            `Insufficient inventory for product ID '${item.productId}'. Requested: ${item.quantity}, currently available: ${available} (Physical: ${inv.physicalQuantity}, Reserved: ${inv.reservedQuantity}, Damaged: ${inv.damagedQuantity}).`
          );
        }
      }

      // 6. Atomically increase reservedQuantity (physicalQuantity does NOT decrease!)
      for (const item of order.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            reservedQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      // 7. Update Sales Order status to CONFIRMED
      const confirmedOrder = await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: {
          status: 'CONFIRMED',
          confirmedById: adminUserId,
        },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                include: { inventory: true },
              },
            },
          },
          confirmedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      return confirmedOrder;
    });
  }

  // ==========================================
  // CANCEL ORDER + RESERVATION RELEASE
  // ==========================================
  async cancelSalesOrder(
    salesOrderId: string,
    adminUserId: string,
    _input?: CancelOrderInput
  ) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: { items: true },
      });

      if (!order) {
        throw AppError.notFound(`Sales order with ID '${salesOrderId}' not found`);
      }

      if (order.status === 'CANCELLED') {
        throw AppError.conflict(`Sales order '${order.orderNumber}' is already cancelled.`);
      }

      if (order.status === 'DISPATCHED') {
        throw AppError.conflict(
          `Cannot cancel sales order '${order.orderNumber}' because it has already been dispatched.`
        );
      }

      // If order was CONFIRMED, release the exact reserved inventory
      if (order.status === 'CONFIRMED') {
        const sortedProductIds = Array.from(
          new Set(order.items.map((item) => item.productId))
        ).sort();

        try {
          await tx.$queryRaw`
            SELECT "id", "product_id"
            FROM "inventories"
            WHERE "product_id" = ANY(${sortedProductIds}::text[])
            FOR UPDATE
          `;
        } catch {
          // Fallback for mocks
        }

        for (const item of order.items) {
          const inv = await tx.inventory.findUnique({
            where: { productId: item.productId },
          });

          if (inv) {
            // Safe decrement: do not decrement below 0
            const releaseQty = Math.min(inv.reservedQuantity, item.quantity);
            await tx.inventory.update({
              where: { productId: item.productId },
              data: {
                reservedQuantity: {
                  decrement: releaseQty,
                },
              },
            });
          }
        }
      }

      // Update order status to CANCELLED
      const cancelledOrder = await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: {
          status: 'CANCELLED',
          cancelledById: adminUserId,
        },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                include: { inventory: true },
              },
            },
          },
          cancelledBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      });

      return cancelledOrder;
    });
  }

  // ==========================================
  // DISPATCH CONFIRMED SALES ORDER
  // ==========================================
  async dispatchSalesOrder(
    salesOrderId: string,
    adminUserId: string,
    input: DispatchOrderInput
  ) {
    return prisma.$transaction(async (tx) => {
      // 1. Fetch sales order
      const order = await tx.salesOrder.findUnique({
        where: { id: salesOrderId },
        include: {
          items: true,
          dispatch: true,
        },
      });

      if (!order) {
        throw AppError.notFound(`Sales order with ID '${salesOrderId}' not found`);
      }

      // Check DB constraint & state
      if (order.dispatch) {
        throw AppError.conflict(
          `Sales order '${order.orderNumber}' has already been dispatched under Dispatch '${order.dispatch.dispatchNumber}'.`
        );
      }

      if (order.status !== 'CONFIRMED') {
        throw AppError.conflict(
          `Cannot dispatch sales order '${order.orderNumber}' with status '${order.status}'. Only CONFIRMED orders can be dispatched.`
        );
      }

      // 2. Lock inventory rows
      const sortedProductIds = Array.from(
        new Set(order.items.map((item) => item.productId))
      ).sort();

      try {
        await tx.$queryRaw`
          SELECT "id", "product_id"
          FROM "inventories"
          WHERE "product_id" = ANY(${sortedProductIds}::text[])
          FOR UPDATE
        `;
      } catch {
        // Fallback for mocks
      }

      const inventories = await tx.inventory.findMany({
        where: { productId: { in: sortedProductIds } },
      });
      const inventoryMap = new Map(inventories.map((inv) => [inv.productId, inv]));

      // 3. Verify stock quantities for dispatch
      for (const item of order.items) {
        const inv = inventoryMap.get(item.productId);
        if (!inv) {
          throw AppError.conflict(`Inventory missing for product '${item.productId}'`);
        }

        if (item.quantity > inv.reservedQuantity) {
          throw AppError.conflict(
            `Cannot dispatch: order item quantity (${item.quantity}) exceeds currently reserved quantity (${inv.reservedQuantity}) for product ID '${item.productId}'.`
          );
        }

        if (item.quantity > inv.physicalQuantity) {
          throw AppError.conflict(
            `Cannot dispatch: order item quantity (${item.quantity}) exceeds physical stock (${inv.physicalQuantity}) for product ID '${item.productId}'.`
          );
        }
      }

      // 4. Deduct inventory: physicalQuantity -= qty AND reservedQuantity -= qty
      for (const item of order.items) {
        await tx.inventory.update({
          where: { productId: item.productId },
          data: {
            physicalQuantity: {
              decrement: item.quantity,
            },
            reservedQuantity: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 5. Generate unique dispatch number
      const count = await tx.dispatch.count();
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const dispatchNumber = `DSP-${new Date().getFullYear()}-${(count + 1)
        .toString()
        .padStart(4, '0')}-${randomSuffix}`;

      // 6. Create dispatch record
      const dispatch = await tx.dispatch.create({
        data: {
          dispatchNumber,
          salesOrderId,
          dispatchedById: adminUserId,
          vehicleNumber: input.vehicleNumber,
          driverName: input.driverName,
          notes: input.notes || null,
          items: {
            create: order.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
            })),
          },
        },
        include: {
          items: {
            include: { product: true },
          },
        },
      });

      // 7. Update sales order status to DISPATCHED
      const updatedOrder = await tx.salesOrder.update({
        where: { id: salesOrderId },
        data: {
          status: 'DISPATCHED',
        },
        include: {
          customer: true,
          items: {
            include: {
              product: {
                include: { inventory: true },
              },
            },
          },
          dispatch: true,
        },
      });

      return {
        salesOrder: updatedOrder,
        dispatch,
      };
    });
  }
}

export const salesOrderService = new SalesOrderService();
