import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { SalesOrder, Product, SalesOrderStatus } from '../types/erp';
import {
  PackageCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Truck,
  XCircle,
  ShieldAlert,
  Boxes,
  SlidersHorizontal,
  Info,
} from 'lucide-react';

export const SalesOrdersView: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Dispatch Modal State
  const [dispatchModalOrderId, setDispatchModalOrderId] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState('MH-12-AB-4567');
  const [driverName, setDriverName] = useState('Vikram Singh');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [submittingDispatch, setSubmittingDispatch] = useState(false);

  // Inventory Adjustment Modal (Admin only)
  const [adjustModalProductId, setAdjustModalProductId] = useState<string | null>(null);
  const [adjPhysical, setAdjPhysical] = useState<number>(100);
  const [adjDamaged, setAdjDamaged] = useState<number>(0);
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderData, prodData] = await Promise.all([
        api.getSalesOrders(),
        api.getProducts(),
      ]);
      setOrders(orderData);
      setProducts(prodData);
    } catch (err: any) {
      setError(err.message || 'Failed to load sales orders & inventory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Action: ADMIN confirms order & reserves inventory
  const handleConfirmOrder = async (orderId: string) => {
    setError(null);
    try {
      const confirmed = await api.confirmSalesOrder(orderId);
      setActionSuccess(`Sales Order ${confirmed.orderNumber} confirmed! Inventory reserved.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm sales order.');
    }
  };

  // Action: ADMIN cancels order & releases inventory
  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm('Are you sure you want to cancel this order? Any reserved inventory will be released back to available stock.')) {
      return;
    }
    setError(null);
    try {
      const cancelled = await api.cancelSalesOrder(orderId, 'Client cancellation requested');
      setActionSuccess(`Sales Order ${cancelled.orderNumber} cancelled. Reserved stock was released.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel sales order.');
    }
  };

  // Action: ADMIN dispatches order & deducts inventory
  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalOrderId) return;
    setError(null);
    setSubmittingDispatch(true);

    try {
      const result = await api.dispatchSalesOrder(dispatchModalOrderId, {
        vehicleNumber,
        driverName,
        notes: dispatchNotes || undefined,
      });

      setDispatchModalOrderId(null);
      setActionSuccess(`Dispatched successfully! Dispatch ${result.dispatch.dispatchNumber} issued.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch sales order.');
    } finally {
      setSubmittingDispatch(false);
    }
  };

  // Action: ADMIN adjusts inventory
  const handleAdjustInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProductId) return;
    setError(null);
    setSubmittingAdjust(true);

    try {
      await api.updateInventory(adjustModalProductId, {
        physicalQuantity: adjPhysical,
        damagedQuantity: adjDamaged,
      });
      setAdjustModalProductId(null);
      setActionSuccess('Inventory updated successfully. Available quantity recalculated.');
      setTimeout(() => setActionSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to adjust inventory.');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const filteredOrders = orders.filter((o) =>
    statusFilter === 'ALL' ? true : o.status === statusFilter
  );

  const getStatusBadge = (status: SalesOrderStatus) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">PENDING</span>;
      case 'CONFIRMED':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">CONFIRMED</span>;
      case 'DISPATCHED':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">DISPATCHED</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">CANCELLED</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {isAdmin ? 'Sales Orders & Inventory Fulfillment' : 'Sales Orders'}
          </h2>
          <p className="text-xs text-slate-400">
            {isAdmin
              ? 'Order verification, atomic inventory reservation, and dispatch fulfillment'
              : 'Customer sales orders and read-only inventory availability'}
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition self-start sm:self-auto"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* SUCCESS / ERROR ALERTS */}
      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 1: INVENTORY PANEL (ADMIN FULL METRICS vs SALES READ-ONLY AVAILABILITY) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Boxes className={`w-5 h-5 ${isAdmin ? 'text-purple-400' : 'text-emerald-400'}`} />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {isAdmin ? 'Inventory Warehouse Stock' : 'Stock Availability'}
            </h3>
          </div>
          <div className="text-xs">
            {isAdmin ? (
              <span className="px-2.5 py-1 rounded bg-purple-950/90 text-purple-200 border border-purple-800 font-bold font-mono">
                ADMIN: Physical & Allocation Control
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded bg-emerald-950/90 text-emerald-300 border border-emerald-800 font-bold font-mono">
                SALES: Read-Only Availability
              </span>
            )}
          </div>
        </div>

        {isAdmin ? (
          /* ADMIN VIEW: Physical, Reserved, Damaged, Available & Adjust Button */
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Product Code</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3 text-right">Physical</th>
                    <th className="py-2.5 px-3 text-right">Reserved</th>
                    <th className="py-2.5 px-3 text-right">Damaged</th>
                    <th className="py-2.5 px-3 text-right text-emerald-400">Available</th>
                    <th className="py-2.5 px-3 text-right">Adjust Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {products.map((p) => {
                    const inv = p.inventory;
                    const physical = inv?.physicalQuantity ?? 0;
                    const reserved = inv?.reservedQuantity ?? 0;
                    const damaged = inv?.damagedQuantity ?? 0;
                    const available = Math.max(0, physical - reserved - damaged);

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 font-bold text-indigo-400">{p.productCode}</td>
                        <td className="py-2 px-3 font-sans text-white">{p.productName}</td>
                        <td className="py-2 px-3 text-right text-slate-300">{physical}</td>
                        <td className="py-2 px-3 text-right text-amber-400">{reserved}</td>
                        <td className="py-2 px-3 text-right text-rose-400">{damaged}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-400">{available}</td>
                        <td className="py-2 px-3 text-right font-sans">
                          <button
                            onClick={() => {
                              setAdjustModalProductId(p.id);
                              setAdjPhysical(physical);
                              setAdjDamaged(damaged);
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-[11px] border border-slate-700 transition"
                            title="Adjust physical or damaged stock"
                          >
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="text-[11px] text-slate-500 font-mono flex items-center space-x-2">
              <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>Warehouse Formula: Available = Physical - Reserved - Damaged</span>
            </div>
          </>
        ) : (
          /* SALES VIEW: Clean Read-Only Availability */
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800 font-mono">
                  <tr>
                    <th className="py-2.5 px-3">Product Code</th>
                    <th className="py-2.5 px-3">Product Name</th>
                    <th className="py-2.5 px-3">Unit</th>
                    <th className="py-2.5 px-3 text-right text-emerald-400">Available for Order</th>
                    <th className="py-2.5 px-3 text-right">Availability Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {products.map((p) => {
                    const inv = p.inventory;
                    const physical = inv?.physicalQuantity ?? 0;
                    const reserved = inv?.reservedQuantity ?? 0;
                    const damaged = inv?.damagedQuantity ?? 0;
                    const available = Math.max(0, physical - reserved - damaged);

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/30">
                        <td className="py-2 px-3 font-bold text-indigo-400">{p.productCode}</td>
                        <td className="py-2 px-3 font-sans text-white">{p.productName}</td>
                        <td className="py-2 px-3 font-sans text-slate-400">{p.unit}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-400 text-sm">
                          {available}
                        </td>
                        <td className="py-2 px-3 text-right font-sans">
                          {available > 20 ? (
                            <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                              In Stock
                            </span>
                          ) : available > 0 ? (
                            <span className="px-2 py-0.5 rounded text-[11px] bg-amber-950 text-amber-300 border border-amber-800">
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[11px] bg-rose-950 text-rose-300 border border-rose-800">
                              Out of Stock
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="text-[11px] text-slate-500 font-sans flex items-center space-x-2">
              <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span>Live warehouse inventory available for immediate quotation and order placement (Read-Only).</span>
            </div>
          </>
        )}
      </div>

      {/* SECTION 2: SALES ORDERS LIST */}
      <div className="space-y-3">
        {/* Status Filters */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 text-xs">
          <span className="text-slate-400 font-medium">Filter Orders:</span>
          {['ALL', 'PENDING', 'CONFIRMED', 'DISPATCHED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded transition ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* Orders Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {loading && orders.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
              Loading sales orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No sales orders found matching the selected filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 font-mono">
                  <tr>
                    <th className="py-3 px-4">Order #</th>
                    <th className="py-3 px-4">Customer & Quotation</th>
                    <th className="py-3 px-4">Items & Quantities</th>
                    <th className="py-3 px-4 text-right">Total Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Audit Trace</th>
                    <th className="py-3 px-4 text-right">{isAdmin ? 'Actions' : 'Fulfillment Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-800/40 transition font-sans">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">{order.orderNumber}</td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{order.customer?.companyName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Quo: {order.quotation?.quotationNumber}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          {order.items?.map((it, idx) => (
                            <div key={idx} className="text-xs flex items-center space-x-1.5 font-mono">
                              <span className="text-slate-400 font-semibold">{it.quantity}×</span>
                              <span className="text-slate-200">{it.product?.productName || it.productId}</span>
                              <span className="text-slate-500">(@₹{it.unitPrice})</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-white">
                        ₹{order.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(order.status)}</td>
                      <td className="py-3 px-4 text-[11px] text-slate-400">
                        {order.status === 'CONFIRMED' && (
                          <span className="text-blue-300">Confirmed by {order.confirmedBy?.name || 'Admin'}</span>
                        )}
                        {order.status === 'DISPATCHED' && order.dispatch && (
                          <div className="space-y-0.5 font-mono text-[10px]">
                            <div className="text-emerald-300 font-bold">{order.dispatch.dispatchNumber}</div>
                            <div>Veh: {order.dispatch.vehicleNumber}</div>
                            <div>Drv: {order.dispatch.driverName}</div>
                          </div>
                        )}
                        {order.status === 'CANCELLED' && (
                          <span className="text-rose-400">Cancelled by {order.cancelledBy?.name || 'Admin'}</span>
                        )}
                        {order.status === 'PENDING' && (
                          <span className="text-slate-500">Order placed • Stock pending reservation</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {/* ========================================= */}
                          {/* ADMIN CONTROLS                            */}
                          {/* ========================================= */}
                          {isAdmin ? (
                            <>
                              {/* PENDING: Confirm Order & Cancel */}
                              {order.status === 'PENDING' && (
                                <>
                                  <button
                                    id={`btn-confirm-order-${order.id}`}
                                    onClick={() => handleConfirmOrder(order.id)}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-sm transition"
                                    title="Verify stock and reserve inventory"
                                  >
                                    Confirm Order
                                  </button>
                                  <button
                                    id={`btn-cancel-order-${order.id}`}
                                    onClick={() => handleCancelOrder(order.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs transition"
                                    title="Cancel order"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}

                              {/* CONFIRMED: Dispatch or Cancel */}
                              {order.status === 'CONFIRMED' && (
                                <>
                                  <button
                                    id={`btn-dispatch-order-${order.id}`}
                                    onClick={() => setDispatchModalOrderId(order.id)}
                                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition"
                                    title="Record dispatch details and deduct inventory"
                                  >
                                    <Truck className="w-3.5 h-3.5" />
                                    <span>Dispatch</span>
                                  </button>
                                  <button
                                    id={`btn-cancel-confirmed-${order.id}`}
                                    onClick={() => handleCancelOrder(order.id)}
                                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-700 text-xs transition"
                                    title="Cancel order and release reserved stock"
                                  >
                                    Cancel
                                  </button>
                                </>
                              )}

                              {order.status === 'DISPATCHED' && (
                                <span className="px-2 py-1 rounded bg-emerald-950/50 text-emerald-400 text-xs border border-emerald-900">
                                  Fulfilled
                                </span>
                              )}

                              {order.status === 'CANCELLED' && (
                                <span className="px-2 py-1 rounded bg-rose-950/50 text-rose-400 text-xs border border-rose-900">
                                  Voided
                                </span>
                              )}
                            </>
                          ) : (
                            /* ========================================= */
                            /* SALES VIEW: STRICTLY READ-ONLY BADGES     */
                            /* ========================================= */
                            <div className="text-xs font-medium">
                              {order.status === 'PENDING' && (
                                <span className="px-2 py-1 rounded bg-slate-800 text-amber-300/90 border border-amber-900/40">
                                  Pending Confirmation
                                </span>
                              )}
                              {order.status === 'CONFIRMED' && (
                                <span className="px-2 py-1 rounded bg-slate-800 text-blue-300/90 border border-blue-900/40">
                                  Confirmed • Reserved
                                </span>
                              )}
                              {order.status === 'DISPATCHED' && (
                                <span className="px-2 py-1 rounded bg-slate-800 text-emerald-400/90 border border-emerald-900/40">
                                  Dispatched
                                </span>
                              )}
                              {order.status === 'CANCELLED' && (
                                <span className="px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                  Cancelled
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* DISPATCH MODAL (ADMIN ONLY) */}
      {dispatchModalOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Execute Industrial Dispatch</h3>
              </div>
              <button onClick={() => setDispatchModalOrderId(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleDispatchOrder} className="space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 leading-relaxed">
                Dispatching will deduct both <strong className="text-white">Physical Quantity</strong> and <strong className="text-white">Reserved Quantity</strong>, transition the order to DISPATCHED, and issue an immutable Dispatch note.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Vehicle Registration #</label>
                <input
                  type="text"
                  required
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  placeholder="MH-12-AB-1234"
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Driver Name</label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="e.g., Vikram Singh"
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Notes / Logistics Reference</label>
                <input
                  type="text"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="Gate pass #, carrier name, etc."
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setDispatchModalOrderId(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingDispatch}
                  className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-md transition disabled:opacity-50"
                >
                  {submittingDispatch ? 'Processing...' : 'Confirm Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST INVENTORY MODAL (ADMIN ONLY) */}
      {adjustModalProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Stock Adjustment (ADMIN)</h3>
              </div>
              <button onClick={() => setAdjustModalProductId(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAdjustInventory} className="space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 leading-relaxed">
                Update physical and damaged inventory counts. Available stock will recalculate dynamically: <strong className="text-white">Available = Physical - Reserved - Damaged</strong>.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Physical Quantity</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjPhysical}
                  onChange={(e) => setAdjPhysical(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Damaged Quantity</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={adjDamaged}
                  onChange={(e) => setAdjDamaged(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs flex justify-between">
                <span className="text-slate-400">Resulting Available:</span>
                <span className="font-bold text-emerald-400">
                  {Math.max(0, adjPhysical - adjDamaged)} (minus current reserved)
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustModalProductId(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjust}
                  className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-md transition disabled:opacity-50"
                >
                  {submittingAdjust ? 'Updating...' : 'Save Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
