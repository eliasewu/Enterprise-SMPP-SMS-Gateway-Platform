import { useState, useMemo } from 'react';
import { getSmsLogs, getSuppliers, getClients, getChannels } from '../store/database';
import type { SmsLog } from '../types';
import { Filter, Search, Download, RefreshCw } from 'lucide-react';

export default function SmsLogs() {
  const suppliers = getSuppliers();
  const clients = getClients();
  const channels = getChannels();
  
  const [filters, setFilters] = useState({
    entityType: '' as '' | 'supplier' | 'client',
    entityId: '',
    channelId: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    search: '',
  });

  const logs = useMemo(() => {
    let result = getSmsLogs({
      entityType: filters.entityType || undefined,
      entityId: filters.entityId || undefined,
      channelId: filters.channelId || undefined,
      status: filters.status || undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
    });
    if (filters.search) {
      const s = filters.search.toLowerCase();
      result = result.filter(l => 
        l.recipient.includes(s) || l.message.toLowerCase().includes(s) || l.messageId.toLowerCase().includes(s)
      );
    }
    return result;
  }, [filters]);

  const getEntityName = (log: SmsLog) => {
    if (log.entityType === 'client') return clients.find(c => c.id === log.entityId)?.name || 'Unknown';
    return suppliers.find(s => s.id === log.entityId)?.name || 'Unknown';
  };

  const getChannelName = (id: string) => channels.find(c => c.id === id)?.name || 'Unknown';

  const entities = filters.entityType === 'client' ? clients : filters.entityType === 'supplier' ? suppliers : [...clients, ...suppliers];

  const stats = useMemo(() => {
    const total = logs.length;
    const delivered = logs.filter(l => l.status === 'delivered').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    const pending = logs.filter(l => l.status === 'pending' || l.status === 'sent').length;
    const totalCost = logs.reduce((s, l) => s + l.cost, 0);
    return { total, delivered, failed, pending, totalCost, deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(1) : '0' };
  }, [logs]);

  const exportCsv = () => {
    const headers = ['Message ID', 'Time', 'Type', 'Entity', 'Channel', 'Sender', 'Recipient', 'Country', 'Operator', 'Status', 'Rate', 'Cost'];
    const rows = logs.map(l => [
      l.messageId, l.submitTime, l.entityType, getEntityName(l), getChannelName(l.channelId),
      l.sender, l.recipient, l.country, l.operator, l.status, l.rate.toFixed(4), l.cost.toFixed(4)
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `sms_logs_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Total SMS</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-green-600">{stats.delivered.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Delivered</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-red-600">{stats.failed.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Failed</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-yellow-600">{stats.pending.toLocaleString()}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-blue-600">{stats.deliveryRate}%</p>
          <p className="text-xs text-gray-500">Delivery Rate</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">${stats.totalCost.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Total Cost</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filters.entityType} onChange={e => setFilters({...filters, entityType: e.target.value as typeof filters.entityType, entityId: ''})}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Types</option>
            <option value="client">Clients</option>
            <option value="supplier">Suppliers</option>
          </select>
          <select value={filters.entityId} onChange={e => setFilters({...filters, entityId: e.target.value})}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Entities</option>
            {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select value={filters.channelId} onChange={e => setFilters({...filters, channelId: e.target.value})}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Channels</option>
            {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Status</option>
            <option value="delivered">Delivered</option>
            <option value="sent">Sent</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="expired">Expired</option>
          </select>
          <input type="date" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          <input type="date" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search recipient, message..." value={filters.search}
              onChange={e => setFilters({...filters, search: e.target.value})}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <button onClick={() => setFilters({ entityType: '', entityId: '', channelId: '', status: '', dateFrom: '', dateTo: '', search: '' })}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Reset"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-lg hover:shadow-lg transition">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['Time', 'Message ID', 'Type', 'Entity', 'Channel', 'Recipient', 'Country', 'Operator', 'MCC/MNC', 'Status', 'DLR', 'Cost'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.slice(0, 100).map(l => (
                <tr key={l.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2 text-gray-500 text-xs whitespace-nowrap">{new Date(l.submitTime).toLocaleString()}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-600">{l.messageId.slice(-12)}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${
                      l.entityType === 'client' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                    }`}>{l.entityType.slice(0,3)}</span>
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{getEntityName(l)}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">{getChannelName(l.channelId)}</td>
                  <td className="px-3 py-2 font-mono text-gray-700">{l.recipient}</td>
                  <td className="px-3 py-2 text-gray-600">{l.country}</td>
                  <td className="px-3 py-2 text-gray-600">{l.operator}</td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{l.mcc}-{l.mnc}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      l.status === 'delivered' ? 'bg-green-50 text-green-700' :
                      l.status === 'sent' ? 'bg-blue-50 text-blue-700' :
                      l.status === 'pending' ? 'bg-yellow-50 text-yellow-700' :
                      l.status === 'failed' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>{l.status}</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{l.dlrStatus || '-'}</td>
                  <td className="px-3 py-2 font-mono font-medium text-gray-900">${l.cost.toFixed(4)}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={12} className="px-4 py-8 text-center text-gray-400">No logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {logs.length > 100 && (
          <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
            Showing 100 of {logs.length.toLocaleString()} records
          </div>
        )}
      </div>
    </div>
  );
}
