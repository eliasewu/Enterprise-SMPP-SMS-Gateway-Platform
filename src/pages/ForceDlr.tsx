import { useState, useCallback } from 'react';
import { getForceDlrConfigs, upsertForceDlrConfig, getSuppliers, getClients } from '../store/database';
import type { ForceDlrConfig } from '../types';
import { Plus, X, Zap, Save, Filter } from 'lucide-react';

type DlrStatus = 'DELIVRD' | 'UNDELIV' | 'EXPIRED' | 'REJECTD';

export default function ForceDlr() {
  const [configs, setConfigs] = useState<ForceDlrConfig[]>(() => getForceDlrConfigs());
  const suppliers = getSuppliers();
  const clients = getClients();
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState<'' | 'supplier' | 'client'>('');

  const [form, setForm] = useState<{
    entityId: string; entityType: 'supplier' | 'client';
    enabled: boolean; timeoutSeconds: number; dlrStatus: DlrStatus;
  }>({
    entityId: '', entityType: 'client', enabled: true, timeoutSeconds: 1, dlrStatus: 'DELIVRD',
  });

  const refresh = useCallback(() => setConfigs(getForceDlrConfigs()), []);

  const getName = (c: ForceDlrConfig) => {
    if (c.entityType === 'client') return clients.find(cl => cl.id === c.entityId)?.name || 'Unknown';
    return suppliers.find(s => s.id === c.entityId)?.name || 'Unknown';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    upsertForceDlrConfig(form);
    setShowModal(false);
    refresh();
  };

  const toggleEnabled = (config: ForceDlrConfig) => {
    upsertForceDlrConfig({ ...config, enabled: !config.enabled });
    refresh();
  };

  const updateTimeout = (config: ForceDlrConfig, timeout: number) => {
    upsertForceDlrConfig({ ...config, timeoutSeconds: Math.max(1, timeout) });
    refresh();
  };

  const updateDlrStatus = (config: ForceDlrConfig, dlrStatus: DlrStatus) => {
    upsertForceDlrConfig({ ...config, dlrStatus });
    refresh();
  };

  const entities = form.entityType === 'client' ? clients : suppliers;
  const filtered = filterType ? configs.filter(c => c.entityType === filterType) : configs;

  // Find entities not yet configured
  const configuredIds = new Set(configs.map(c => c.entityId));

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-purple-900">Force DLR Configuration</h3>
            <p className="text-sm text-purple-700 mt-1">
              Configure forced delivery reports for clients and suppliers. When enabled, the system will automatically
              generate a DLR response after the specified timeout (starting from 1 second). This applies to both
              client and supplier billing.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Configs</option>
            <option value="client">Client Only</option>
            <option value="supplier">Supplier Only</option>
          </select>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition">
          <Plus className="w-4 h-4" /> Add Force DLR Config
        </button>
      </div>

      {/* Configs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(config => (
          <div key={config.id} className={`bg-white rounded-xl border-2 p-5 transition ${config.enabled ? 'border-purple-200' : 'border-gray-200 opacity-60'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full mb-1 ${
                  config.entityType === 'client' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                }`}>{config.entityType}</span>
                <h4 className="font-semibold text-gray-900">{getName(config)}</h4>
              </div>
              <button onClick={() => toggleEnabled(config)}
                className={`relative w-12 h-6 rounded-full transition-colors ${config.enabled ? 'bg-purple-600' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Timeout (seconds)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" step="1" value={config.timeoutSeconds}
                    onChange={e => updateTimeout(config, parseInt(e.target.value) || 1)}
                    className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" />
                  <span className="text-xs text-gray-500">sec</span>
                  <div className="flex gap-1 ml-auto">
                    {[1, 3, 5, 10].map(t => (
                      <button key={t} onClick={() => updateTimeout(config, t)}
                        className={`px-2 py-1 text-xs rounded-lg transition ${config.timeoutSeconds === t ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">DLR Status</label>
                <select value={config.dlrStatus} onChange={e => updateDlrStatus(config, e.target.value as DlrStatus)}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20">
                  <option value="DELIVRD">DELIVRD (Delivered)</option>
                  <option value="UNDELIV">UNDELIV (Undeliverable)</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="REJECTD">REJECTD (Rejected)</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className={`inline-flex items-center gap-1 text-xs font-medium ${config.enabled ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                  {config.enabled ? 'Active' : 'Disabled'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(config.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            No force DLR configurations found. Add one to get started.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Add Force DLR Config</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{form.entityType === 'client' ? 'Client' : 'Supplier'}</label>
                <select required value={form.entityId} onChange={e => setForm({...form, entityId: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">Select {form.entityType}</option>
                  {entities.filter(e => !configuredIds.has(e.id)).map(e => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Timeout (seconds, minimum 1)</label>
                <input type="number" min="1" step="1" required value={form.timeoutSeconds}
                  onChange={e => setForm({...form, timeoutSeconds: Math.max(1, parseInt(e.target.value) || 1)})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                <p className="text-xs text-gray-500 mt-1">DLR will be forced after this many seconds (min 1 second)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">DLR Status</label>
                <select value={form.dlrStatus} onChange={e => setForm({...form, dlrStatus: e.target.value as DlrStatus})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="DELIVRD">DELIVRD (Delivered)</option>
                  <option value="UNDELIV">UNDELIV (Undeliverable)</option>
                  <option value="EXPIRED">EXPIRED</option>
                  <option value="REJECTD">REJECTD (Rejected)</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="enableForce" checked={form.enabled}
                  onChange={e => setForm({...form, enabled: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" />
                <label htmlFor="enableForce" className="text-sm font-medium text-gray-700">Enable immediately</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:shadow-lg">
                  <Save className="w-4 h-4" /> Save Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
