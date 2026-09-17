import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Enquiry, Customer, Product, EnquiryStatus } from '../types/erp';
import { Plus, Search, Calendar, Building2, Package, AlertCircle, RefreshCw, CheckCircle2, ArrowRight } from 'lucide-react';

interface EnquiriesViewProps {
  onNavigateToQuotations: (enquiryId?: string) => void;
}

export const EnquiriesView: React.FC<EnquiriesViewProps> = ({ onNavigateToQuotations }) => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [requiredDate, setRequiredDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: '', quantity: 10 },
  ]);

  // Quick Customer Creation
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCity, setNewCity] = useState('');

  // Status Filter
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [enqData, custData, prodData] = await Promise.all([
        api.getEnquiries(),
        api.getCustomers(),
        api.getProducts(),
      ]);
      setEnquiries(enqData);
      setCustomers(custData);
      setProducts(prodData);
      if (custData.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(custData[0].id);
      }
      if (prodData.length > 0 && lineItems[0].productId === '') {
        setLineItems([{ productId: prodData[0].id, quantity: 10 }]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load enquiries data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddLineItem = () => {
    const defaultProdId = products[0]?.id || '';
    setLineItems([...lineItems, { productId: defaultProdId, quantity: 5 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.createCustomer({
        companyName: newCompanyName,
        contactPerson: newContactPerson,
        mobile: newMobile,
        email: newEmail,
        city: newCity,
      });
      setCustomers([...customers, created]);
      setSelectedCustomerId(created.id);
      setShowAddCustomer(false);
      setNewCompanyName('');
      setNewContactPerson('');
      setNewMobile('');
      setNewEmail('');
      setNewCity('');
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  };

  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await api.createEnquiry({
        customerId: selectedCustomerId,
        requiredDate,
        notes: notes || undefined,
        items: lineItems.filter((i) => i.productId && i.quantity > 0),
      });
      setIsModalOpen(false);
      setNotes('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to submit enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredEnquiries = enquiries.filter((enq) =>
    statusFilter === 'ALL' ? true : enq.status === statusFilter
  );

  const getStatusBadge = (status: EnquiryStatus) => {
    switch (status) {
      case 'NEW':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-950 text-blue-300 border border-blue-800">NEW</span>;
      case 'QUOTED':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-950 text-amber-300 border border-amber-800">QUOTED</span>;
      case 'WON':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">WON</span>;
      case 'LOST':
        return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">LOST</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Customer Enquiries</h2>
          <p className="text-xs text-slate-400">Capture customer product requirements, requested delivery dates, and specifications</p>
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
            id="btn-create-enquiry"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Enquiry</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 text-xs">
        <span className="text-slate-400 font-medium">Filter Status:</span>
        {['ALL', 'NEW', 'QUOTED', 'WON', 'LOST'].map((st) => (
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

      {/* Error alert */}
      {error && (
        <div className="p-4 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Enquiries Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading && enquiries.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
            Loading enquiries...
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No customer enquiries found matching the selected filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Enquiry #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Required By</th>
                  <th className="py-3 px-4">Products & Quantities</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredEnquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-bold text-indigo-400">{enq.enquiryNumber}</td>
                    <td className="py-3 px-4 font-sans">
                      <div className="font-medium text-white">{enq.customer?.companyName}</div>
                      <div className="text-[11px] text-slate-400">{enq.customer?.city}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">{new Date(enq.enquiryDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(enq.requiredDate).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-sans">
                      <div className="space-y-1">
                        {enq.items?.map((item, idx) => (
                          <div key={idx} className="text-xs flex items-center space-x-1.5">
                            <span className="font-mono text-slate-400 font-medium">{item.quantity}×</span>
                            <span className="text-slate-200">{item.product?.productName || item.productId}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-sans">{getStatusBadge(enq.status)}</td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        onClick={() => onNavigateToQuotations(enq.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-xs transition"
                        title="Generate Quotation for this enquiry"
                      >
                        <span>Quote</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE ENQUIRY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
              <div>
                <h3 className="text-lg font-bold text-white">Create Customer Enquiry</h3>
                <p className="text-xs text-slate-400">Specify customer requirements and normalized product lines</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEnquiry} className="space-y-4">
              {/* Customer Select */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300">Select Customer</label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(!showAddCustomer)}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {showAddCustomer ? 'Cancel New Customer' : '+ New Customer'}
                  </button>
                </div>

                {showAddCustomer ? (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 mb-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Company Name"
                        value={newCompanyName}
                        onChange={(e) => setNewCompanyName(e.target.value)}
                        required
                        className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                      />
                      <input
                        type="text"
                        placeholder="Contact Person"
                        value={newContactPerson}
                        onChange={(e) => setNewContactPerson(e.target.value)}
                        required
                        className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="email"
                        placeholder="Email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                        className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                      />
                      <input
                        type="text"
                        placeholder="Mobile"
                        value={newMobile}
                        onChange={(e) => setNewMobile(e.target.value)}
                        required
                        className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                      />
                      <input
                        type="text"
                        placeholder="City"
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        required
                        className="px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateCustomer}
                      className="w-full py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
                    >
                      Save Customer
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} ({c.city})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Required Date */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Required Delivery Date</label>
                <input
                  type="date"
                  value={requiredDate}
                  onChange={(e) => setRequiredDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-300">Requested Products (Multiple Lines)</label>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {lineItems.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-slate-950 p-2 rounded-lg border border-slate-800">
                      <select
                        value={item.productId}
                        onChange={(e) => {
                          const updated = [...lineItems];
                          updated[idx].productId = e.target.value;
                          setLineItems(updated);
                        }}
                        required
                        className="flex-1 px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.productCode} — {p.productName} ({p.unit})
                          </option>
                        ))}
                      </select>

                      <div className="w-28 flex items-center space-x-1">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const updated = [...lineItems];
                            updated[idx].quantity = parseInt(e.target.value) || 1;
                            setLineItems(updated);
                          }}
                          required
                          placeholder="Qty"
                          className="w-full px-2.5 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded text-white"
                        />
                      </div>

                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 transition"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Notes / Special Instructions</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., Client requires certificate of conformance"
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-slate-950 border border-slate-800 rounded-lg text-white"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
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
                  {submitting ? 'Creating...' : 'Submit Enquiry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
