import { useState, useMemo } from 'react';
import { generateReportData, getSuppliers, getClients, getChannels, addReport, getReports } from '../store/database';
import type { Report } from '../types';
import { FileText, Download, Calendar, Filter, BarChart3, PieChart, TrendingUp } from 'lucide-react';

type PeriodType = 'custom' | 'hourly' | 'daily' | 'weekly' | 'monthly';

export default function Reports() {
  const suppliers = getSuppliers();
  const clients = getClients();
  const channels = getChannels();
  const [savedReports] = useState<Report[]>(() => getReports());

  const [filters, setFilters] = useState({
    periodType: 'daily' as PeriodType,
    periodStart: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    periodEnd: new Date().toISOString().slice(0, 10),
    entityType: '' as '' | 'supplier' | 'client',
    entityId: '',
    channelId: '',
  });

  const [showReport, setShowReport] = useState(false);

  const reportData = useMemo(() => {
    if (!showReport) return null;
    return generateReportData({
      periodStart: filters.periodStart,
      periodEnd: filters.periodEnd,
      entityId: filters.entityId || undefined,
      entityType: filters.entityType as 'supplier' | 'client' | undefined,
      channelId: filters.channelId || undefined,
    });
  }, [showReport, filters]);

  const entities = filters.entityType === 'client' ? clients : filters.entityType === 'supplier' ? suppliers : [...clients, ...suppliers];

  const generateReport = () => {
    setShowReport(true);
    addReport({
      name: `${filters.periodType.charAt(0).toUpperCase() + filters.periodType.slice(1)} Report`,
      type: 'sms',
      periodType: filters.periodType,
      periodStart: filters.periodStart,
      periodEnd: filters.periodEnd,
      entityId: filters.entityId || undefined,
      entityType: filters.entityType as 'supplier' | 'client' | undefined,
      channelId: filters.channelId || undefined,
      status: 'completed',
      data: generateReportData({
        periodStart: filters.periodStart,
        periodEnd: filters.periodEnd,
        entityId: filters.entityId || undefined,
        entityType: filters.entityType as 'supplier' | 'client' | undefined,
        channelId: filters.channelId || undefined,
      }),
    });
  };

  const exportCsv = () => {
    if (!reportData) return;
    let csv = 'SMS Report\n\n';
    csv += `Period: ${filters.periodStart} to ${filters.periodEnd}\n\n`;
    csv += `Total SMS,${reportData.totalSms}\n`;
    csv += `Delivered,${reportData.deliveredSms}\n`;
    csv += `Failed,${reportData.failedSms}\n`;
    csv += `Delivery Rate,${reportData.deliveryRate.toFixed(1)}%\n`;
    csv += `Total Revenue,$${reportData.totalRevenue.toFixed(2)}\n`;
    csv += `Total Cost,$${reportData.totalCost.toFixed(2)}\n`;
    csv += `Profit,$${reportData.profit.toFixed(2)}\n\n`;
    csv += 'By Country\nCountry,Count,Amount\n';
    reportData.byCountry.forEach(c => { csv += `${c.country},${c.count},$${c.amount.toFixed(2)}\n`; });
    csv += '\nBy Operator\nOperator,Count,Amount\n';
    reportData.byOperator.forEach(o => { csv += `${o.operator},${o.count},$${o.amount.toFixed(2)}\n`; });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `report_${filters.periodStart}_${filters.periodEnd}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Filter Panel */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-400" />
          <h3 className="font-semibold text-gray-800">Report Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period Type</label>
            <select value={filters.periodType} onChange={e => setFilters({...filters, periodType: e.target.value as PeriodType})}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="custom">Custom</option>
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input type="date" value={filters.periodStart} onChange={e => setFilters({...filters, periodStart: e.target.value})}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input type="date" value={filters.periodEnd} onChange={e => setFilters({...filters, periodEnd: e.target.value})}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
            <select value={filters.entityType} onChange={e => setFilters({...filters, entityType: e.target.value as typeof filters.entityType, entityId: ''})}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">All</option>
              <option value="client">Clients</option>
              <option value="supplier">Suppliers</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Entity</label>
            <select value={filters.entityId} onChange={e => setFilters({...filters, entityId: e.target.value})}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">All Entities</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
            <select value={filters.channelId} onChange={e => setFilters({...filters, channelId: e.target.value})}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
              <option value="">All Channels</option>
              {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-end gap-2 lg:col-span-2">
            <button onClick={generateReport}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition">
              <BarChart3 className="w-4 h-4" /> Generate Report
            </button>
            {reportData && (
              <button onClick={exportCsv}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition">
                <Download className="w-4 h-4" /> Export CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report Results */}
      {reportData && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{reportData.totalSms.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Total SMS</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-green-600">{reportData.deliveredSms.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Delivered</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-red-600">{reportData.failedSms.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-blue-600">{reportData.deliveryRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-500">Delivery Rate</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-emerald-600">${reportData.totalRevenue.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Revenue</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-amber-600">${reportData.totalCost.toFixed(2)}</p>
              <p className="text-xs text-gray-500">Cost</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className={`text-2xl font-bold ${reportData.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${reportData.profit.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500">Profit</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* By Country */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-blue-500" /> Traffic by Country
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {reportData.byCountry.sort((a, b) => b.count - a.count).map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{c.country}</span>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">{c.count.toLocaleString()}</span>
                      <span className="text-gray-400 text-sm ml-2">${c.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {reportData.byCountry.length === 0 && <p className="text-gray-400 text-center py-4">No data</p>}
              </div>
            </div>

            {/* By Operator */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-500" /> Traffic by Operator
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {reportData.byOperator.sort((a, b) => b.count - a.count).map((o, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{o.operator}</span>
                    <div className="text-right">
                      <span className="font-bold text-gray-900">{o.count.toLocaleString()}</span>
                      <span className="text-gray-400 text-sm ml-2">${o.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                {reportData.byOperator.length === 0 && <p className="text-gray-400 text-center py-4">No data</p>}
              </div>
            </div>

            {/* Daily Trend */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
              <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-500" /> Daily Trend
              </h4>
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 h-32 min-w-[600px]">
                  {reportData.byDay.map((d, i) => {
                    const maxCount = Math.max(...reportData.byDay.map(x => x.count), 1);
                    const height = (d.count / maxCount) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-gradient-to-t from-blue-500 to-indigo-500 rounded-t transition-all hover:from-blue-600 hover:to-indigo-600"
                          style={{ height: `${height}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                          title={`${d.day}: ${d.count} SMS, $${d.amount.toFixed(2)}`} />
                        <span className="text-[10px] text-gray-500 -rotate-45 origin-top-left whitespace-nowrap">{d.day.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Reports */}
      {!showReport && savedReports.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" /> Recent Reports
          </h4>
          <div className="space-y-2">
            {savedReports.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-500">{r.periodStart} - {r.periodEnd}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    r.status === 'completed' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'
                  }`}>{r.status}</span>
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
