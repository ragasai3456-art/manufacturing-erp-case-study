import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Quotation, Enquiry, QuotationStatus } from '../types/erp';
import {
  Plus,
  RefreshCw,
  AlertCircle,
  FileCheck2,
  Send,
  CheckCircle,
  XCircle,
  ArrowRight,
  Calculator,
} from 'lucide-react';

interface QuotationsViewProps {
  preselectedEnquiryId?: string;
  onNavigateToSalesOrders: () => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({
  preselectedEnquiryId,
  onNavigateToSalesOrders,
}) => {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string>(preselectedEnquiryId || '');
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [items, setItems] = useState<
    { productId: string; productName: string; quantity: number; unitPrice: number; discountPct: number; gstPct: number }[]
  >([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [quoData, enqData] = await Promise.all([
        api.getQuotations(),
        api.getEnquiries(),
      ]);
      setQuotations(quoData);
      setEnquiries(enqData);

      if (preselectedEnquiryId) {
        setSelectedEnquiryId(preselectedEnquiryId);
        setIsModalOpen(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load quotations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [preselectedEnquiryId]);

  // When enquiry selection changes in the modal, populate line items from that enquiry
  useEffect(() => {
    if (!selectedEnquiryId) return;
    const enq = enquiries.find((e) => e.id === selectedEnquiryId);
    if (enq && enq.items) {
      setItems(
        enq.items.map((it) => ({
          productId: it.productId,
          productName: it.product?.productName || it.productId,
          quantity: it.quantity,
          unitPrice: Number(it.product?.basePrice) || 1000,
          discountPct: 0,
          gstPct: 18,
        }))
      );
    }
  }, [selectedEnquiryId, enquiries]);

  // Client-side preview calculation (indicative only; server calculates authoritatively)
  const calculatePreview = () => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalGst = 0;
    let grandTotal = 0;

    const lineCalculations = items.map((it) => {
      const base = it.quantity * it.unitPrice;
      const discount = (base * it.discountPct) / 100;
      const afterDiscount = base - discount;
      const gst = (afterDiscount * it.gstPct) / 100;
      const total = afterDiscount + gst;

      subtotal += base;
      totalDiscount += discount;
      totalGst += gst;
      grandTotal += total;

      return { base, discount, gst, total };
    });

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalGst: Math.round(totalGst * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      lineCalculations,
    };
  };

  const preview = calculatePreview();

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const enq = enquiries.find((e) => e.id === selectedEnquiryId);
    if (!enq) {
      setError('Please select a valid enquiry.');
      setSubmitting(false);
      return;
    }

    try {
      await api.createQuotation({
        enquiryId: selectedEnquiryId,
        customerId: enq.customerId,
        validUntil,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discountPct: it.discountPct,
          gstPct: it.gstPct,
        })),
      });

      setIsModalOpen(false);
      setActionSuccess('Quotation generated successfully with server-verified calculations.');
      setTimeout(() => setActionSuccess(null), 4000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create quotation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (quotationId: string, newStatus: QuotationStatus) => {
    setError(null);
    try {
      await api.updateQuotationStatus(quotationId, newStatus);
      setActionSuccess(`Quotation updated to ${newStatus}.`);
      setTimeout(() => setActionSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || `Failed to transition quotation to ${newStatus}.`);
    }
  };

  const handleConvertToSalesOrder = async (quotationId: string) => {
    setError(null);
    try {
      const order = await api.convertQuotationToSalesOrder(quotationId);
      setActionSuccess(`Quotation converted! Sales Order ${order.orderNumber} created in PENDING status.`);
      setTimeout(() => {
        setActionSuccess(null);
        onNavigateToSalesOrders();
      }, 1500);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to convert quotation to Sales Order.');
    }
  };

  const filteredQuotations = quotations.filter((q) =>
    statusFilter === 'ALL' ? true : q.status === statusFilter
  );

  const getStatusBadge = (status: QuotationStatus) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">DRAFT</span>;
      case 'SENT':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">SENT</span>;
      case 'ACCEPTED':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">ACCEPTED</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-800">REJECTED</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Quotations & Financials</h2>
          <p className="text-xs text-slate-400">
            Commercial quotation generation, price calculations, and sales order conversion
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            id="btn-create-quotation"
            onClick={() => {
              if (enquiries.length > 0 && !selectedEnquiryId) {
                setSelectedEnquiryId(enquiries[0].id);
              }
              setIsModalOpen(true);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Quotation</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 text-xs">
        <span className="text-slate-400 font-medium">Filter Status:</span>
        {['ALL', 'DRAFT', 'SENT', 'ACCEPTED', 'REJECTED'].map((st) => (
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

      {/* Success banner */}
      {actionSuccess && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Quotations Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading && quotations.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
            Loading quotations...
          </div>
        ) : filteredQuotations.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No quotations found matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Quotation #</th>
                  <th className="py-3 px-4">Customer & Ref</th>
                  <th className="py-3 px-4">Line Items</th>
                  <th className="py-3 px-4 text-right">Financials</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Valid Until</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredQuotations.map((quo) => (
                  <tr key={quo.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-400">{quo.quotationNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-white">{quo.customer?.companyName}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Enq: {quo.enquiry?.enquiryNumber || 'Direct'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {quo.items?.map((it, idx) => (
                          <div key={idx} className="text-xs flex items-center space-x-2">
                            <span className="font-mono text-slate-400 font-semibold">{it.quantity}×</span>
                            <span className="text-slate-200">{it.product?.productName || it.productId}</span>
                            <span className="text-[11px] text-slate-400">(@₹{it.unitPrice}, {it.discountPct}% disc, {it.gstPct}% GST)</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono">
                      <div className="text-sm font-bold text-white">₹{quo.grandTotal.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-400">
                        Base: ₹{quo.subtotal} | Disc: -₹{quo.discountAmount} | GST: +₹{quo.gstAmount}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(quo.status)}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono">
                      {new Date(quo.validUntil).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* DRAFT -> SENT */}
                        {quo.status === 'DRAFT' && (
                          <button
                            id={`btn-send-quo-${quo.id}`}
                            onClick={() => handleStatusChange(quo.id, 'SENT')}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 text-xs transition"
                            title="Send quotation to client"
                          >
                            <Send className="w-3 h-3" />
                            <span>Send</span>
                          </button>
                        )}

                        {/* SENT -> ACCEPTED / REJECTED */}
                        {quo.status === 'SENT' && (
                          <>
                            <button
                              id={`btn-accept-quo-${quo.id}`}
                              onClick={() => handleStatusChange(quo.id, 'ACCEPTED')}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs transition"
                              title="Client accepted quotation"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Accept</span>
                            </button>
                            <button
                              id={`btn-reject-quo-${quo.id}`}
                              onClick={() => handleStatusChange(quo.id, 'REJECTED')}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs transition"
                              title="Client rejected quotation"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {/* ACCEPTED -> CONVERT TO SALES ORDER */}
                        {quo.status === 'ACCEPTED' && !quo.salesOrder && (
                          <button
                            id={`btn-convert-quo-${quo.id}`}
                            onClick={() => handleConvertToSalesOrder(quo.id)}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition"
                            title="Convert accepted quotation into a PENDING Sales Order"
                          >
                            <span>Convert to Sales Order</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Already Converted Link */}
                        {quo.salesOrder && (
                          <span
                            onClick={onNavigateToSalesOrders}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 text-indigo-400 font-mono text-xs cursor-pointer hover:underline"
                            title="View linked Sales Order"
                          >
                            <FileCheck2 className="w-3 h-3" />
                            <span>Order: {quo.salesOrder.orderNumber}</span>
                          </span>
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

      {/* CREATE QUOTATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Generate Industrial Quotation</h3>
                <p className="text-xs text-slate-400">
                  Select customer enquiry, configure commercial pricing, and review server-enforced calculations
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuotation} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Select Enquiry */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Source Enquiry</label>
                  <select
                    value={selectedEnquiryId}
                    onChange={(e) => setSelectedEnquiryId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {enquiries.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.enquiryNumber} — {e.customer?.companyName} ({e.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Valid Until */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Validity Period (Valid Until)</label>
                  <input
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Line Items Pricing Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-300">Commercial Line Items</label>
                  <span className="text-[11px] text-slate-500">Live preview (Backend is authoritative)</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/80 text-slate-400 font-semibold uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Product</th>
                        <th className="py-2.5 px-3 w-20">Qty</th>
                        <th className="py-2.5 px-3 w-24">Unit Price (₹)</th>
                        <th className="py-2.5 px-3 w-20">Disc %</th>
                        <th className="py-2.5 px-3 w-20">GST %</th>
                        <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {items.map((it, idx) => {
                        const lineCalc = preview.lineCalculations[idx] || { total: 0 };
                        return (
                          <tr key={idx}>
                            <td className="py-2.5 px-3 font-sans font-medium text-white">{it.productName}</td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="1"
                                value={it.quantity}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].quantity = parseInt(e.target.value) || 1;
                                  setItems(updated);
                                }}
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                value={it.unitPrice}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].unitPrice = parseFloat(e.target.value) || 0;
                                  setItems(updated);
                                }}
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={it.discountPct}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].discountPct = parseFloat(e.target.value) || 0;
                                  setItems(updated);
                                }}
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            </td>
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={it.gstPct}
                                onChange={(e) => {
                                  const updated = [...items];
                                  updated[idx].gstPct = parseFloat(e.target.value) || 0;
                                  setItems(updated);
                                }}
                                className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-white"
                              />
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-indigo-400">
                              ₹{lineCalc.total.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Summary Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-mono">
                <div className="text-xs text-slate-400 space-y-1">
                  <div>Base Subtotal: <span className="text-white">₹{preview.subtotal.toLocaleString()}</span></div>
                  <div>Discount Total: <span className="text-rose-400">-₹{preview.totalDiscount.toLocaleString()}</span></div>
                  <div>GST Total: <span className="text-emerald-400">+₹{preview.totalGst.toLocaleString()}</span></div>
                </div>

                <div className="text-right">
                  <div className="text-xs uppercase text-slate-400 font-sans">Authoritative Grand Total</div>
                  <div className="text-2xl font-bold text-indigo-400">₹{preview.grandTotal.toLocaleString()}</div>
                </div>
              </div>

              {/* Server Authority Notice */}
              <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-lg text-xs text-indigo-300 flex items-start space-x-2 font-sans">
                <Calculator className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Server Authority Guarantee:</strong> The backend computes base, discount, and GST
                  authoritatively with 2-decimal financial precision. Client-supplied totals are discarded by the API.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800 font-sans">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? 'Generating Quotation...' : 'Create Quotation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
