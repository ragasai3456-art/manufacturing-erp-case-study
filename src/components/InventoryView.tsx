import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { Product } from '../types/erp';
import {
  Boxes,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  SlidersHorizontal,
  Search,
  Package,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Adjustment Modal
  const [adjustModalProduct, setAdjustModalProduct] = useState<Product | null>(null);
  const [adjPhysical, setAdjPhysical] = useState<number>(0);
  const [adjDamaged, setAdjDamaged] = useState<number>(0);
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const prodData = await api.getProducts();
      setProducts(prodData);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdjustModal = (product: Product) => {
    setAdjustModalProduct(product);
    setAdjPhysical(product.inventory?.physicalQuantity ?? 0);
    setAdjDamaged(product.inventory?.damagedQuantity ?? 0);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalProduct) return;
    setError(null);
    setSubmittingAdjust(true);

    try {
      await api.updateInventory(adjustModalProduct.id, {
        physicalQuantity: adjPhysical,
        damagedQuantity: adjDamaged,
      });
      setAdjustModalProduct(null);
      setActionSuccess(`Inventory updated for ${adjustModalProduct.productCode}. Available stock recalculated.`);
      setTimeout(() => setActionSuccess(null), 3000);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to update inventory.');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  const filteredProducts = products.filter((p) => {
    const q = searchQuery.toLowerCase();
    return p.productCode.toLowerCase().includes(q) || p.productName.toLowerCase().includes(q);
  });

  const totalPhysical = products.reduce((acc, p) => acc + (p.inventory?.physicalQuantity || 0), 0);
  const totalReserved = products.reduce((acc, p) => acc + (p.inventory?.reservedQuantity || 0), 0);
  const totalDamaged = products.reduce((acc, p) => acc + (p.inventory?.damagedQuantity || 0), 0);
  const totalAvailable = Math.max(0, totalPhysical - totalReserved - totalDamaged);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Inventory Management</h2>
          <p className="text-xs text-slate-400">
            Warehouse stock monitoring, reserved order allocations, and physical stock adjustments
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

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Physical Stock</span>
            <Package className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{totalPhysical}</div>
          <p className="text-[11px] text-slate-500 mt-1">Total physical units on warehouse floor</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Reserved Stock</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono">{totalReserved}</div>
          <p className="text-[11px] text-slate-500 mt-1">Allocated to confirmed sales orders</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Damaged Units</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-400 font-mono">{totalDamaged}</div>
          <p className="text-[11px] text-slate-500 mt-1">Quarantined / non-salable inventory</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Available Stock</span>
            <Boxes className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{totalAvailable}</div>
          <p className="text-[11px] text-slate-500 mt-1">Physical - Reserved - Damaged</p>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by code or product name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800 font-mono">
              <tr>
                <th className="py-3 px-4">Product Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4 text-right">Physical</th>
                <th className="py-3 px-4 text-right">Reserved</th>
                <th className="py-3 px-4 text-right">Damaged</th>
                <th className="py-3 px-4 text-right text-emerald-400">Available</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredProducts.map((p) => {
                const inv = p.inventory;
                const physical = inv?.physicalQuantity ?? 0;
                const reserved = inv?.reservedQuantity ?? 0;
                const damaged = inv?.damagedQuantity ?? 0;
                const available = Math.max(0, physical - reserved - damaged);

                return (
                  <tr key={p.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-indigo-400">{p.productCode}</td>
                    <td className="py-3 px-4 font-sans text-white font-medium">{p.productName}</td>
                    <td className="py-3 px-4 text-slate-400 font-sans">{p.unit}</td>
                    <td className="py-3 px-4 text-right text-slate-200">{physical}</td>
                    <td className="py-3 px-4 text-right text-amber-400">{reserved}</td>
                    <td className="py-3 px-4 text-right text-rose-400">{damaged}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">{available}</td>
                    <td className="py-3 px-4 text-right font-sans">
                      <button
                        id={`btn-adjust-stock-${p.id}`}
                        onClick={() => handleOpenAdjustModal(p)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded text-xs border border-slate-700 transition"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-slate-400" />
                        <span>Adjust Stock</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADJUST INVENTORY MODAL */}
      {adjustModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Adjust Stock: {adjustModalProduct.productCode}
                </h3>
              </div>
              <button
                onClick={() => setAdjustModalProduct(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 leading-relaxed">
                Update physical and damaged inventory counts. Available stock is calculated dynamically:
                <div className="mt-1 font-mono text-indigo-300 font-semibold">
                  Available = Physical - Reserved ({adjustModalProduct.inventory?.reservedQuantity ?? 0}) - Damaged
                </div>
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
                <span className="text-slate-400">Resulting Available Stock:</span>
                <span className="font-bold text-emerald-400">
                  {Math.max(
                    0,
                    adjPhysical -
                      (adjustModalProduct.inventory?.reservedQuantity ?? 0) -
                      adjDamaged
                  )}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustModalProduct(null)}
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
