import { useState, useCallback } from 'react';
import { getPayments, addPayment, getSuppliers, getClients } from '../store/database';
import type { Payment } from '../types';
import { Plus, X, Filter, CreditCard, DollarSign } from 'lucide-react';

type PayMethod = 'bank_transfer' | 'cash' | 'cheque' | 'online' | 'crypto';
type PayStatus = 'completed' | 'pending' | 'failed';

const emptyForm: {
  entityId: string; entityType: 'supplier' | 'client'; amount: number;
  paymentMethod: PayMethod; reference: string; notes: string; status: PayStatus;
} = {
  entityId: '', entityType: 'client', amount: 0,
  paymentMethod: 'bank_transfer', reference: '', notes: '', status: 'completed',
};

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>(() => getPayments());
  const suppliers = getSuppliers();
  const clients = getClients();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filterType, setFilterType] = useState<'' | 'supplier' | 'client'>('');

  const refresh = useCallback(() => setPayments(getPayments()), []);

  const openAdd = () => { setForm({...emptyForm}); setShowModal(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPayment(form);
    setShowModal(false);
    refresh();
  };

  const getName = (p: Payment) => {
    if (p.entityType === 'client') return clients.find(c => c.id === p.entityId)?.name || 'Unknown';
    return suppliers.find(s => s.id === p.entityId)?.name || 'Unknown';
  };

  const entities = form.entityType === 'client' ? clients : suppliers;
  const filtered = filterType ? payments.filter(p => p.entityType === filterType) : payments;

  const totalCompleted = filtered.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const totalPending = filtered.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">${totalCompleted.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Completed Payments</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">${totalPending.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Pending Payments</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
            <p className="text-xs text-gray-500">Total Transactions</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Payments</option>
            <option value="client">Client Payments</option>
            <option value="supplier">Supplier Payments</option>
          </select>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition">
          <Plus className="w-4 h-4" /> Add Payment
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Type', 'Name', 'Amount', 'Method', 'Reference', 'Notes', 'Status', 'Date'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      p.entityType === 'client' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}>{p.entityType}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{getName(p)}</td>
                  <td className="px-4 py-3 font-bold text-green-700">${p.amount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-gray-700 capitalize">{p.paymentMethod.replace(/_/g, ' ')}</td>
                  <td className="px-4 py-3 font-mono text-gray-600">{p.reference}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[200px] truncate">{p.notes}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      p.status === 'completed' ? 'bg-green-50 text-green-700' :
                      p.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                      'bg-red-50 text-red-700'
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(p.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No payments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Add Payment</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment For</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setForm({...form, entityType: 'client', entityId: ''})}
                    className={`p-2.5 rounded-xl border-2 text-sm font-medium ${form.entityType === 'client' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                    Client
                  </button>
                  <button type="button" onClick={() => setForm({...form, entityType: 'supplier', entityId: ''})}
                    className={`p-2.5 rounded-xl border-2 text-sm font-medium ${form.entityType === 'supplier' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600'}`}>
                    Supplier
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.entityType === 'client' ? 'Client' : 'Supplier'}
                </label>
                <select required value={form.entityId} onChange={e => setForm({...form, entityId: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">Select {form.entityType}</option>
                  {entities.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.name} (Balance: ${e.currentBalance.toLocaleString()} / Limit: ${e.creditLimit.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input type="number" min="0.01" step="0.01" required value={form.amount}
                    onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                  <select value={form.paymentMethod} onChange={e => setForm({...form, paymentMethod: e.target.value as PayMethod})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                    <option value="crypto">Crypto</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                <input type="text" required value={form.reference} onChange={e => setForm({...form, reference: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value as PayStatus})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button type="submit"
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:shadow-lg">
                  Add Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
