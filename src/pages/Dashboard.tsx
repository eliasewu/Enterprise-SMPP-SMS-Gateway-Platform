import { useMemo } from 'react';
import { getDashboardStats, getSuppliers, getClients, getChannels, getOverdueInvoices, shouldSendReminder } from '../store/database';
import {
  Building2, Users, TrendingUp, DollarSign, MessageSquare, Clock,
  ArrowUpRight, Wifi, AlertTriangle, FileText
} from 'lucide-react';

export default function Dashboard() {
  const stats = useMemo(() => getDashboardStats(), []);
  const suppliers = useMemo(() => getSuppliers(), []);
  const clients = useMemo(() => getClients(), []);
  const channels = useMemo(() => getChannels(), []);
  const overdueInvoices = useMemo(() => getOverdueInvoices(), []);
  const isReminderDay = shouldSendReminder();

  const cards = [
    { label: 'Total Suppliers', value: stats.totalSuppliers, icon: Building2, color: 'from-amber-500 to-orange-600' },
    { label: 'Total Clients', value: stats.totalClients, icon: Users, color: 'from-blue-500 to-indigo-600' },
    { label: 'Total Revenue', value: `$${stats.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'from-green-500 to-emerald-600' },
    { label: 'Total Cost', value: `$${stats.totalCost.toFixed(2)}`, icon: TrendingUp, color: 'from-purple-500 to-violet-600' },
    { label: 'Net Profit', value: `$${stats.profit.toFixed(2)}`, icon: DollarSign, color: 'from-emerald-500 to-teal-600' },
    { label: 'SMS Today', value: stats.totalSmsToday.toLocaleString(), icon: MessageSquare, color: 'from-pink-500 to-rose-600' },
  ];

  

  return (
    <div className="space-y-6">
      {/* Alert for reminder day */}
      {isReminderDay && overdueInvoices.length > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-orange-900">Payment Reminder Day</p>
            <p className="text-sm text-orange-700">
              Today is {new Date().toLocaleDateString('en-US', { weekday: 'long' })}. 
              You have <strong>{overdueInvoices.length}</strong> overdue invoice(s) that need payment reminders.
            </p>
          </div>
          <button className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition">
            Send Reminders
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow duration-300">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium flex items-center gap-0.5 text-green-600">
                  <ArrowUpRight className="w-3 h-3" />+12%
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Channel Status & Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Channels */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Wifi className="w-4 h-4 text-green-500" /> Channel Status
            </h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              {stats.activeChannels}/{stats.totalChannels} Active
            </span>
          </div>
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {channels.map(ch => (
              <div key={ch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${ch.bindStatus === 'bound' ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{ch.name}</p>
                    <p className="text-xs text-gray-500">{ch.type.toUpperCase()} • {ch.entityType}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-sm">{ch.sessions}/{ch.maxSessions}</p>
                  <p className="text-[10px] text-gray-400">sessions</p>
                </div>
              </div>
            ))}
            {channels.length === 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">No channels configured</p>
            )}
          </div>
        </div>

        {/* Overdue Invoices */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-red-500" /> Overdue Invoices
            </h3>
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {stats.overdueInvoices} overdue
            </span>
          </div>
          <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
            {overdueInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{inv.invoiceNumber}</p>
                  <p className="text-xs text-gray-500">Due: {inv.dueDate}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-700">${inv.grandTotal.toFixed(2)}</p>
                  <p className="text-[10px] text-orange-600">{inv.remindersSent} reminder(s)</p>
                </div>
              </div>
            ))}
            {overdueInvoices.length === 0 && (
              <p className="text-center text-gray-400 py-4 text-sm">No overdue invoices 🎉</p>
            )}
          </div>
        </div>

        {/* Recent Billings */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" /> Recent Billing
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">SMS</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.recentBillings.slice(0, 5).map(b => (
                  <tr key={b.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        b.entityType === 'client' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                      }`}>{b.entityType.slice(0, 3)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700">{b.smsCount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">${b.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        b.status === 'delivered' ? 'bg-green-50 text-green-700' :
                        b.status === 'submitted' ? 'bg-blue-50 text-blue-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Entity Balances */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-500" /> Supplier Balances
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {suppliers.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{s.name}</p>
                  <p className="text-xs text-gray-500">Rate: ${s.defaultRate.toFixed(4)}/sms</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">${s.currentBalance.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">of ${s.creditLimit.toLocaleString()}</p>
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                    <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                      style={{ width: `${Math.min((s.currentBalance / s.creditLimit) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" /> Client Balances
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {clients.map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                  <p className="text-xs text-gray-500">Rate: ${c.defaultRate.toFixed(4)}/sms</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">${c.currentBalance.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">of ${c.creditLimit.toLocaleString()}</p>
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
                    <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"
                      style={{ width: `${Math.min((c.currentBalance / c.creditLimit) * 100, 100)}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
