import { useState, useCallback, useMemo } from 'react';
import { getInvoices, addInvoice, updateInvoice, getClients, getSuppliers, getSmsLogs, getNextInvoiceNumber, getDepartmentEmail, addNotification, addPayment } from '../store/database';
import type { Invoice, InvoiceItem } from '../types';
import { Plus, X, Filter, Send, DollarSign, FileText, AlertTriangle, CheckCircle, Clock, Eye, Bell } from 'lucide-react';

type PeriodType = 'custom' | 'hourly' | 'daily' | 'weekly' | 'monthly';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>(() => getInvoices());
  const clients = getClients();
  const suppliers = getSuppliers();
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<Invoice | null>(null);
  const [showPayModal, setShowPayModal] = useState<Invoice | null>(null);
  const [filterType, setFilterType] = useState<'' | 'client' | 'supplier'>('');
  const [filterStatus, setFilterStatus] = useState('');

  const [form, setForm] = useState({
    entityType: 'client' as 'client' | 'supplier',
    entityId: '',
    periodType: 'monthly' as PeriodType,
    periodStart: '',
    periodEnd: '',
    taxRate: 10,
    notes: '',
  });

  const [payAmount, setPayAmount] = useState(0);

  const refresh = useCallback(() => setInvoices(getInvoices()), []);

  const getEntityName = (inv: Invoice) => {
    if (inv.entityType === 'client') return clients.find(c => c.id === inv.entityId)?.name || 'Unknown';
    return suppliers.find(s => s.id === inv.entityId)?.name || 'Unknown';
  };

  const entities = form.entityType === 'client' ? clients : suppliers;

  const generateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    // Get SMS logs for the period
    const logs = getSmsLogs({
      entityId: form.entityId,
      entityType: form.entityType,
      dateFrom: form.periodStart,
      dateTo: form.periodEnd,
    });

    // Group by country/operator
    const grouped = new Map<string, { country: string; operator: string; smsType: string; count: number; rate: number; amount: number }>();
    logs.forEach(l => {
      const key = `${l.country}-${l.operator}-${l.entityType === 'client' ? 'revenue' : 'cost'}`;
      const existing = grouped.get(key) || { country: l.country, operator: l.operator, smsType: 'mixed', count: 0, rate: l.rate, amount: 0 };
      existing.count++;
      existing.amount += l.cost;
      grouped.set(key, existing);
    });

    const items: InvoiceItem[] = Array.from(grouped.values()).map(g => ({
      country: g.country,
      operator: g.operator,
      smsType: g.smsType,
      smsCount: g.count,
      rate: g.rate,
      amount: g.amount,
    }));

    const totalSms = items.reduce((s, i) => s + i.smsCount, 0);
    const totalAmount = items.reduce((s, i) => s + i.amount, 0);
    const taxAmount = totalAmount * (form.taxRate / 100);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 15);

    addInvoice({
      invoiceNumber: getNextInvoiceNumber(),
      entityId: form.entityId,
      entityType: form.entityType,
      periodType: form.periodType,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      totalSms,
      totalAmount,
      taxRate: form.taxRate,
      taxAmount,
      grandTotal: totalAmount + taxAmount,
      status: 'draft',
      dueDate: dueDate.toISOString().slice(0, 10),
      notes: form.notes,
      items,
      remindersSent: 0,
    });

    setShowModal(false);
    refresh();
  };

  const sendInvoice = (inv: Invoice) => {
    const billingDept = getDepartmentEmail('billing');
    const entity = inv.entityType === 'client' ? clients.find(c => c.id === inv.entityId) : suppliers.find(s => s.id === inv.entityId);
    
    updateInvoice(inv.id, { status: 'sent', sentAt: new Date().toISOString() });
    addNotification({
      entityId: inv.entityId,
      entityType: inv.entityType,
      invoiceId: inv.id,
      type: 'invoice_sent',
      channel: 'email',
      status: 'sent',
      sentAt: new Date().toISOString(),
      message: `Invoice ${inv.invoiceNumber} sent to ${entity?.billingEmail}`,
    });

    alert(`📧 Invoice ${inv.invoiceNumber} sent!\n\nFrom: ${billingDept?.email}\nTo: ${entity?.billingEmail}\nAmount: $${inv.grandTotal.toFixed(2)}`);
    refresh();
  };

  const sendReminder = (inv: Invoice) => {
    const accountsDept = getDepartmentEmail('accounts');
    const entity = inv.entityType === 'client' ? clients.find(c => c.id === inv.entityId) : suppliers.find(s => s.id === inv.entityId);
    
    updateInvoice(inv.id, { 
      remindersSent: inv.remindersSent + 1, 
      lastReminderDate: new Date().toISOString(),
      status: 'overdue'
    });
    
    addNotification({
      entityId: inv.entityId,
      entityType: inv.entityType,
      invoiceId: inv.id,
      type: 'payment_reminder',
      channel: 'email',
      status: 'sent',
      sentAt: new Date().toISOString(),
      message: `Payment reminder #${inv.remindersSent + 1} for Invoice ${inv.invoiceNumber}`,
    });

    alert(`⏰ Reminder sent!\n\nFrom: ${accountsDept?.email}\nTo: ${entity?.billingEmail}\nInvoice: ${inv.invoiceNumber}\nAmount Due: $${inv.grandTotal.toFixed(2)}\n\nReminders are sent on Monday and Thursday`);
    refresh();
  };

  const markPaid = (inv: Invoice) => {
    addPayment({
      entityId: inv.entityId,
      entityType: inv.entityType,
      invoiceId: inv.id,
      amount: payAmount || inv.grandTotal,
      paymentMethod: 'bank_transfer',
      reference: `PAY-${inv.invoiceNumber}`,
      notes: `Payment for ${inv.invoiceNumber}`,
      status: 'completed',
    });
    
    // No more reminders needed when paid
    addNotification({
      entityId: inv.entityId,
      entityType: inv.entityType,
      invoiceId: inv.id,
      type: 'payment_received',
      channel: 'email',
      status: 'sent',
      sentAt: new Date().toISOString(),
      message: `Payment received for Invoice ${inv.invoiceNumber}`,
    });

    setShowPayModal(null);
    setPayAmount(0);
    refresh();
  };

  let filtered = invoices;
  if (filterType) filtered = filtered.filter(i => i.entityType === filterType);
  if (filterStatus) filtered = filtered.filter(i => i.status === filterStatus);

  const stats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + i.grandTotal, 0);
    const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.grandTotal, 0);
    const pending = invoices.filter(i => i.status === 'sent' || i.status === 'draft').reduce((s, i) => s + i.grandTotal, 0);
    const overdue = invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.grandTotal, 0);
    return { total, paid, pending, overdue };
  }, [invoices]);

  const statusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'overdue': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'sent': return <Send className="w-4 h-4 text-blue-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">${stats.total.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Total Invoiced</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-green-600">${stats.paid.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Paid</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-yellow-600">${stats.pending.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xl font-bold text-red-600">${stats.overdue.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Overdue</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Types</option>
            <option value="client">Client Invoices</option>
            <option value="supplier">Supplier Invoices</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition">
          <Plus className="w-4 h-4" /> Create Invoice
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Invoice #', 'Type', 'Entity', 'Period', 'SMS Count', 'Amount', 'Tax', 'Total', 'Due Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-3 font-mono font-medium text-gray-900">{inv.invoiceNumber}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      inv.entityType === 'client' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}>{inv.entityType}</span>
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{getEntityName(inv)}</td>
                  <td className="px-3 py-3 text-gray-600 text-xs">
                    <span className="capitalize">{inv.periodType}</span><br />
                    <span className="text-gray-400">{inv.periodStart} - {inv.periodEnd}</span>
                  </td>
                  <td className="px-3 py-3 font-medium">{inv.totalSms.toLocaleString()}</td>
                  <td className="px-3 py-3 font-mono">${inv.totalAmount.toFixed(2)}</td>
                  <td className="px-3 py-3 font-mono text-gray-500">${inv.taxAmount.toFixed(2)}</td>
                  <td className="px-3 py-3 font-mono font-bold text-gray-900">${inv.grandTotal.toFixed(2)}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{inv.dueDate}</td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      {statusIcon(inv.status)}
                      <span className={`text-xs font-medium capitalize ${
                        inv.status === 'paid' ? 'text-green-700' :
                        inv.status === 'overdue' ? 'text-red-700' :
                        inv.status === 'sent' ? 'text-blue-700' : 'text-gray-500'
                      }`}>{inv.status}</span>
                    </div>
                    {inv.remindersSent > 0 && (
                      <span className="text-[10px] text-orange-500">{inv.remindersSent} reminder(s)</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setShowDetail(inv)} className="p-1 rounded hover:bg-gray-100 text-gray-500" title="View"><Eye className="w-4 h-4" /></button>
                      {inv.status === 'draft' && (
                        <button onClick={() => sendInvoice(inv)} className="p-1 rounded hover:bg-blue-50 text-blue-600" title="Send Invoice">
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {(inv.status === 'sent' || inv.status === 'overdue') && (
                        <>
                          <button onClick={() => sendReminder(inv)} className="p-1 rounded hover:bg-orange-50 text-orange-600" title="Send Reminder">
                            <Bell className="w-4 h-4" />
                          </button>
                          <button onClick={() => { setShowPayModal(inv); setPayAmount(inv.grandTotal); }} className="p-1 rounded hover:bg-green-50 text-green-600" title="Mark Paid">
                            <DollarSign className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">No invoices found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Create Invoice</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={generateInvoice} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                  <select value={form.entityType} onChange={e => setForm({...form, entityType: e.target.value as 'client' | 'supplier', entityId: ''})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="client">Client</option>
                    <option value="supplier">Supplier</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{form.entityType === 'client' ? 'Client' : 'Supplier'}</label>
                  <select required value={form.entityId} onChange={e => setForm({...form, entityId: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Select</option>
                    {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {(['custom', 'hourly', 'daily', 'weekly', 'monthly'] as PeriodType[]).map(p => (
                    <button key={p} type="button" onClick={() => setForm({...form, periodType: p})}
                      className={`p-2 rounded-lg border text-xs font-medium capitalize ${form.periodType === p ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                  <input type="date" required value={form.periodStart} onChange={e => setForm({...form, periodStart: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                  <input type="date" required value={form.periodEnd} onChange={e => setForm({...form, periodEnd: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
                <input type="number" min="0" max="30" value={form.taxRate} onChange={e => setForm({...form, taxRate: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button type="submit"
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-lg">
                  Generate Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Invoice {showDetail.invoiceNumber}</h3>
              <button onClick={() => setShowDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">Entity</p><p className="font-medium">{getEntityName(showDetail)}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">Period</p><p className="font-medium">{showDetail.periodStart} - {showDetail.periodEnd}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">Total SMS</p><p className="font-medium">{showDetail.totalSms.toLocaleString()}</p></div>
                <div className="bg-gray-50 p-3 rounded-lg"><p className="text-gray-500 text-xs">Due Date</p><p className="font-medium">{showDetail.dueDate}</p></div>
              </div>
              
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Country</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Operator</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">SMS Count</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Rate</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {showDetail.items.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">{item.country}</td>
                        <td className="px-3 py-2">{item.operator}</td>
                        <td className="px-3 py-2 font-medium">{item.smsCount.toLocaleString()}</td>
                        <td className="px-3 py-2 font-mono">${item.rate.toFixed(4)}</td>
                        <td className="px-3 py-2 font-mono">${item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span className="font-mono">${showDetail.totalAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-600">Tax ({showDetail.taxRate}%):</span><span className="font-mono">${showDetail.taxAmount.toFixed(2)}</span></div>
                <div className="flex justify-between border-t border-gray-200 pt-2"><span className="font-semibold">Grand Total:</span><span className="font-mono font-bold text-lg">${showDetail.grandTotal.toFixed(2)}</span></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Record Payment</h3>
              <button onClick={() => setShowPayModal(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">Recording payment for Invoice <strong>{showPayModal.invoiceNumber}</strong></p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                <input type="number" step="0.01" value={payAmount} onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm text-green-800">✓ Once marked as paid, no more payment reminders will be sent.</p>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowPayModal(null)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button onClick={() => markPaid(showPayModal)}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:shadow-lg">
                  <CheckCircle className="w-4 h-4" /> Mark as Paid
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
