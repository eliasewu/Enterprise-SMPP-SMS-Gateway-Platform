import { useState, useCallback } from 'react';
import { getBillings, addBilling, updateBilling, getClients, getClientRates } from '../store/database';
import type { SmsBilling, BillingSignType } from '../types';
import { Plus, X, Filter, Send, CheckCircle, Truck, Eye } from 'lucide-react';

type SmsType = 'transactional' | 'promotional' | 'otp';
type BillingStatus = 'pending' | 'submitted' | 'delivered' | 'failed';

const emptyForm: {
  entityId: string; billingSign: BillingSignType; smsCount: number; rate: number;
  country: string; operator: string; smsType: SmsType; forceDlr: boolean; forceDlrTimeout: number;
} = {
  entityId: '', billingSign: 'normal', smsCount: 0, rate: 0,
  country: '', operator: '', smsType: 'transactional', forceDlr: false, forceDlrTimeout: 1,
};

export default function ClientBilling() {
  const [billings, setBillings] = useState<SmsBilling[]>(() => getBillings('client'));
  const clients = getClients();
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<SmsBilling | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [filterClient, setFilterClient] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const refresh = useCallback(() => setBillings(getBillings('client')), []);

  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';

  const openAdd = () => {
    setForm({...emptyForm, entityId: clients[0]?.id || ''});
    setShowModal(true);
  };

  const updateRate = (newForm: typeof emptyForm) => {
    if (newForm.entityId && newForm.country && newForm.operator) {
      const rates = getClientRates(newForm.entityId);
      const matched = rates.find(r =>
        r.country.toLowerCase() === newForm.country.toLowerCase() &&
        r.operator.toLowerCase() === newForm.operator.toLowerCase() &&
        r.smsType === newForm.smsType &&
        r.status === 'active'
      );
      if (matched) {
        newForm.rate = matched.rate;
      } else {
        const cli = clients.find(c => c.id === newForm.entityId);
        if (cli) newForm.rate = cli.defaultRate;
      }
    }
    setForm({...newForm});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = form.smsCount * form.rate;

    let status: BillingStatus = 'pending';
    if (form.billingSign === 'normal') status = 'pending';
    else if (form.billingSign === 'success_submit') status = 'submitted';
    else if (form.billingSign === 'deliver') status = 'delivered';

    addBilling({
      entityId: form.entityId,
      entityType: 'client',
      billingSign: form.billingSign,
      smsCount: form.smsCount,
      rate: form.rate,
      totalAmount,
      country: form.country,
      operator: form.operator,
      smsType: form.smsType,
      status,
      forceDlr: form.forceDlr,
      forceDlrTimeout: form.forceDlr ? form.forceDlrTimeout : 0,
    });
    setShowModal(false);
    refresh();
  };

  const sendBilling = (id: string) => {
    updateBilling(id, { status: 'submitted' });
    refresh();
  };

  const submitBilling = (id: string) => {
    updateBilling(id, { status: 'submitted' });
    refresh();
  };

  const deliverBilling = (id: string) => {
    updateBilling(id, { status: 'delivered' });
    refresh();
  };

  let filtered = billings;
  if (filterClient) filtered = filtered.filter(b => b.entityId === filterClient);
  if (filterStatus) filtered = filtered.filter(b => b.status === filterStatus);

  const billingSignLabel = (sign: BillingSignType) => {
    switch(sign) {
      case 'normal': return { label: 'Normal', color: 'bg-gray-100 text-gray-700' };
      case 'success_submit': return { label: 'Submit Billing', color: 'bg-blue-50 text-blue-700' };
      case 'deliver': return { label: 'Delivered Billing', color: 'bg-green-50 text-green-700' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition">
          <Plus className="w-4 h-4" /> New Client Billing
        </button>
      </div>

      {/* Billing Sign Legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Billing Sign Types for Client</p>
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-lg text-xs font-medium text-gray-700">
            <span className="w-2 h-2 rounded-full bg-gray-400" /> Normal — Default (send billing)
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 rounded-lg text-xs font-medium text-blue-700">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Submit Billing — Auto submit
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 rounded-lg text-xs font-medium text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Delivered Billing — Auto delivered
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Client', 'Billing Sign', 'Country', 'Operator', 'Type', 'SMS Count', 'Rate', 'Total', 'Force DLR', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(b => {
                const sign = billingSignLabel(b.billingSign);
                return (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{getClientName(b.entityId)}</td>
                    <td className="px-3 py-3"><span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${sign.color}`}>{sign.label}</span></td>
                    <td className="px-3 py-3 text-gray-700">{b.country}</td>
                    <td className="px-3 py-3 text-gray-700">{b.operator}</td>
                    <td className="px-3 py-3 text-gray-700 capitalize">{b.smsType}</td>
                    <td className="px-3 py-3 font-medium">{b.smsCount.toLocaleString()}</td>
                    <td className="px-3 py-3 font-mono">${b.rate.toFixed(4)}</td>
                    <td className="px-3 py-3 font-mono font-semibold">${b.totalAmount.toFixed(4)}</td>
                    <td className="px-3 py-3">
                      {b.forceDlr ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-50 text-purple-700">
                          Yes ({b.forceDlrTimeout}s)
                        </span>
                      ) : <span className="text-gray-400 text-xs">No</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        b.status === 'delivered' ? 'bg-green-50 text-green-700' :
                        b.status === 'submitted' ? 'bg-blue-50 text-blue-700' :
                        b.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                        'bg-red-50 text-red-700'
                      }`}>{b.status}</span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setShowDetail(b)} className="p-1 rounded hover:bg-gray-100 text-gray-500" title="View"><Eye className="w-4 h-4" /></button>
                        {b.status === 'pending' && (
                          <>
                            <button onClick={() => sendBilling(b.id)} className="p-1 rounded hover:bg-indigo-50 text-indigo-600" title="Send Billing">
                              <Send className="w-4 h-4" />
                            </button>
                            <button onClick={() => submitBilling(b.id)} className="p-1 rounded hover:bg-blue-50 text-blue-600" title="Submit Billing">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {(b.status === 'pending' || b.status === 'submitted') && (
                          <button onClick={() => deliverBilling(b.id)} className="p-1 rounded hover:bg-green-50 text-green-600" title="Delivered Billing">
                            <Truck className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">No billing records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">New Client Billing</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select required value={form.entityId} onChange={e => updateRate({...form, entityId: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name} (Default: ${c.defaultRate.toFixed(4)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Billing Sign</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'success_submit', 'deliver'] as BillingSignType[]).map(sign => {
                    const info = billingSignLabel(sign);
                    return (
                      <button key={sign} type="button"
                        onClick={() => setForm({...form, billingSign: sign})}
                        className={`p-3 rounded-xl border-2 text-center text-xs font-medium transition ${
                          form.billingSign === sign ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}>
                        {info.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input type="text" required value={form.country} onChange={e => updateRate({...form, country: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                  <input type="text" required value={form.operator} onChange={e => updateRate({...form, operator: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMS Type</label>
                  <select value={form.smsType} onChange={e => updateRate({...form, smsType: e.target.value as SmsType})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="transactional">Transactional</option>
                    <option value="promotional">Promotional</option>
                    <option value="otp">OTP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMS Count</label>
                  <input type="number" min="1" required value={form.smsCount}
                    onChange={e => setForm({...form, smsCount: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate ($/SMS)</label>
                  <input type="number" step="0.0001" min="0" required value={form.rate}
                    onChange={e => setForm({...form, rate: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-sm text-gray-600">Total Amount: <span className="font-bold text-gray-900">${(form.smsCount * form.rate).toFixed(4)}</span></p>
              </div>

              {/* Force DLR Section */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="forceDlrCli" checked={form.forceDlr}
                    onChange={e => setForm({...form, forceDlr: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                  <label htmlFor="forceDlrCli" className="text-sm font-medium text-gray-700">Enable Force DLR</label>
                </div>
                {form.forceDlr && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">DLR Timeout (seconds, min 1)</label>
                    <input type="number" min="1" step="1" value={form.forceDlrTimeout}
                      onChange={e => setForm({...form, forceDlrTimeout: Math.max(1, parseInt(e.target.value) || 1)})}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    <p className="text-xs text-gray-500 mt-1">Force DLR will be triggered after {form.forceDlrTimeout} second(s)</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button type="submit"
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-lg">
                  Create Billing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Billing Details</h3>
              <button onClick={() => setShowDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">Client</p><p className="font-medium">{getClientName(showDetail.entityId)}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">Billing Sign</p><p className="font-medium">{billingSignLabel(showDetail.billingSign).label}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">Country</p><p className="font-medium">{showDetail.country}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">Operator</p><p className="font-medium">{showDetail.operator}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">SMS Count</p><p className="font-medium">{showDetail.smsCount.toLocaleString()}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">Rate</p><p className="font-medium font-mono">${showDetail.rate.toFixed(4)}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">Total</p><p className="font-bold font-mono">${showDetail.totalAmount.toFixed(4)}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">Status</p><p className="font-medium capitalize">{showDetail.status}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">Force DLR</p><p className="font-medium">{showDetail.forceDlr ? `Yes (${showDetail.forceDlrTimeout}s)` : 'No'}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">Created</p><p className="font-medium text-xs">{new Date(showDetail.createdAt).toLocaleString()}</p></div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                {showDetail.status === 'pending' && (
                  <>
                    <button onClick={() => { sendBilling(showDetail.id); setShowDetail(null); }}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-xl hover:bg-indigo-700">
                      <Send className="w-3.5 h-3.5" /> Send
                    </button>
                    <button onClick={() => { submitBilling(showDetail.id); setShowDetail(null); }}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700">
                      <CheckCircle className="w-3.5 h-3.5" /> Submit
                    </button>
                  </>
                )}
                {(showDetail.status === 'pending' || showDetail.status === 'submitted') && (
                  <button onClick={() => { deliverBilling(showDetail.id); setShowDetail(null); }}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-xl hover:bg-green-700">
                    <Truck className="w-3.5 h-3.5" /> Delivered
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
