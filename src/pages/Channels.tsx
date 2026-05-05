import { useState, useCallback, useEffect } from 'react';
import { getChannels, addChannel, updateChannel, deleteChannel, getSuppliers, getClients } from '../store/database';
import type { Channel } from '../types';
import { Plus, Pencil, Trash2, X, Wifi, WifiOff, RefreshCw, Radio, Globe, Server } from 'lucide-react';

export default function Channels() {
  const [channels, setChannels] = useState<Channel[]>(() => getChannels());
  const suppliers = getSuppliers();
  const clients = getClients();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Channel | null>(null);
  const [filterType, setFilterType] = useState<'' | 'smpp' | 'http'>('');
  const [filterEntity, setFilterEntity] = useState<'' | 'supplier' | 'client'>('');

  const emptyForm: Omit<Channel, 'id' | 'createdAt'> = {
    name: '', type: 'smpp', entityId: '', entityType: 'supplier',
    host: '', port: 2775, systemId: '', password: '', systemType: 'SMPP',
    bindType: 'transceiver', httpUrl: '', httpMethod: 'POST', httpHeaders: '',
    status: 'inactive', bindStatus: 'unbound', tps: 100, sessions: 0, maxSessions: 5,
  };
  const [form, setForm] = useState(emptyForm);

  const refresh = useCallback(() => setChannels(getChannels()), []);

  // Simulate bind status changes
  useEffect(() => {
    const interval = setInterval(() => {
      setChannels(prev => prev.map(ch => {
        if (ch.bindStatus === 'bound' && Math.random() > 0.95) {
          return { ...ch, sessions: Math.max(0, ch.sessions + (Math.random() > 0.5 ? 1 : -1)) };
        }
        return ch;
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const openAdd = () => { setForm({...emptyForm}); setEditing(null); setShowModal(true); };
  const openEdit = (c: Channel) => {
    setForm({
      name: c.name, type: c.type, entityId: c.entityId, entityType: c.entityType,
      host: c.host, port: c.port, systemId: c.systemId, password: c.password,
      systemType: c.systemType, bindType: c.bindType, httpUrl: c.httpUrl || '',
      httpMethod: c.httpMethod || 'POST', httpHeaders: c.httpHeaders || '',
      status: c.status, bindStatus: c.bindStatus, tps: c.tps, sessions: c.sessions, maxSessions: c.maxSessions,
      lastConnected: c.lastConnected, lastError: c.lastError,
    });
    setEditing(c);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateChannel(editing.id, form);
    else addChannel(form);
    setShowModal(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this channel?')) { deleteChannel(id); refresh(); }
  };

  const toggleBind = (ch: Channel) => {
    if (ch.bindStatus === 'bound') {
      updateChannel(ch.id, { bindStatus: 'unbound', status: 'inactive', sessions: 0 });
    } else {
      updateChannel(ch.id, { bindStatus: 'binding', status: 'binding' });
      setTimeout(() => {
        updateChannel(ch.id, { bindStatus: 'bound', status: 'bound', sessions: 1, lastConnected: new Date().toISOString() });
        refresh();
      }, 1500);
    }
    refresh();
  };

  const getEntityName = (ch: Channel) => {
    if (ch.entityType === 'client') return clients.find(c => c.id === ch.entityId)?.name || 'Unknown';
    return suppliers.find(s => s.id === ch.entityId)?.name || 'Unknown';
  };

  let filtered = channels;
  if (filterType) filtered = filtered.filter(c => c.type === filterType);
  if (filterEntity) filtered = filtered.filter(c => c.entityType === filterEntity);

  const entities = form.entityType === 'client' ? clients : suppliers;
  const boundCount = channels.filter(c => c.bindStatus === 'bound').length;
  const totalSessions = channels.reduce((s, c) => s + c.sessions, 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Server className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{channels.length}</p>
            <p className="text-xs text-gray-500">Total Channels</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Wifi className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{boundCount}</p>
            <p className="text-xs text-gray-500">Active (Bound)</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
            <Radio className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">{totalSessions}</p>
            <p className="text-xs text-gray-500">Total Sessions</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{channels.filter(c => c.type === 'http').length}</p>
            <p className="text-xs text-gray-500">HTTP Channels</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select value={filterType} onChange={e => setFilterType(e.target.value as typeof filterType)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Types</option>
            <option value="smpp">SMPP</option>
            <option value="http">HTTP</option>
          </select>
          <select value={filterEntity} onChange={e => setFilterEntity(e.target.value as typeof filterEntity)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Entities</option>
            <option value="client">Clients</option>
            <option value="supplier">Suppliers</option>
          </select>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition">
          <Plus className="w-4 h-4" /> Add Channel
        </button>
      </div>

      {/* Channels Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(ch => (
          <div key={ch.id} className={`bg-white rounded-xl border-2 p-5 transition ${
            ch.bindStatus === 'bound' ? 'border-green-200' : ch.bindStatus === 'binding' ? 'border-yellow-200' : 'border-gray-200'
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded ${ch.type === 'smpp' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {ch.type.toUpperCase()}
                  </span>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded ${
                    ch.entityType === 'client' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>{ch.entityType}</span>
                </div>
                <h4 className="font-semibold text-gray-900">{ch.name}</h4>
                <p className="text-xs text-gray-500">{getEntityName(ch)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(ch)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(ch.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Connection Info */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs space-y-1">
              {ch.type === 'smpp' ? (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">Host:</span> <span className="font-mono">{ch.host}:{ch.port}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">System ID:</span> <span className="font-mono">{ch.systemId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Bind Type:</span> <span className="font-medium capitalize">{ch.bindType}</span></div>
                </>
              ) : (
                <>
                  <div className="flex justify-between"><span className="text-gray-500">URL:</span> <span className="font-mono truncate max-w-[180px]">{ch.httpUrl}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Method:</span> <span className="font-medium">{ch.httpMethod}</span></div>
                </>
              )}
              <div className="flex justify-between"><span className="text-gray-500">TPS:</span> <span className="font-medium">{ch.tps}</span></div>
            </div>

            {/* Status & Sessions */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {ch.bindStatus === 'bound' ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Active
                  </span>
                ) : ch.bindStatus === 'binding' ? (
                  <span className="flex items-center gap-1 text-yellow-600 text-sm font-medium">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Binding...
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-gray-400 text-sm font-medium">
                    <span className="w-2 h-2 rounded-full bg-gray-300" /> Disconnected
                  </span>
                )}
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900">{ch.sessions}<span className="text-gray-400 text-sm font-normal">/{ch.maxSessions}</span></p>
                <p className="text-[10px] text-gray-500">Sessions</p>
              </div>
            </div>

            {/* Session bar */}
            <div className="w-full h-2 bg-gray-200 rounded-full mb-4">
              <div className={`h-full rounded-full transition-all duration-500 ${
                ch.bindStatus === 'bound' ? 'bg-gradient-to-r from-green-400 to-green-500' : 'bg-gray-300'
              }`} style={{ width: `${(ch.sessions / ch.maxSessions) * 100}%` }} />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => toggleBind(ch)}
                disabled={ch.bindStatus === 'binding'}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  ch.bindStatus === 'bound'
                    ? 'bg-red-50 text-red-700 hover:bg-red-100'
                    : ch.bindStatus === 'binding'
                    ? 'bg-yellow-50 text-yellow-700 cursor-not-allowed'
                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {ch.bindStatus === 'bound' ? (
                  <><WifiOff className="w-4 h-4" /> Unbind</>
                ) : ch.bindStatus === 'binding' ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Binding...</>
                ) : (
                  <><Wifi className="w-4 h-4" /> Bind</>
                )}
              </button>
            </div>

            {ch.lastError && (
              <p className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg p-2">{ch.lastError}</p>
            )}
            {ch.lastConnected && ch.bindStatus === 'bound' && (
              <p className="mt-2 text-[10px] text-gray-400">Connected: {new Date(ch.lastConnected).toLocaleString()}</p>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
            No channels found
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Channel' : 'Add Channel'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Channel Name</label>
                <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={e => setForm({...form, type: e.target.value as 'smpp' | 'http'})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="smpp">SMPP (Kannel)</option>
                    <option value="http">HTTP API</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                  <select value={form.entityType} onChange={e => setForm({...form, entityType: e.target.value as 'supplier' | 'client', entityId: ''})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="supplier">Supplier</option>
                    <option value="client">Client</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{form.entityType === 'client' ? 'Client' : 'Supplier'}</label>
                <select required value={form.entityId} onChange={e => setForm({...form, entityId: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">Select {form.entityType}</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>

              {form.type === 'smpp' ? (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                      <input type="text" required value={form.host} onChange={e => setForm({...form, host: e.target.value})}
                        placeholder="192.168.1.100"
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                      <input type="number" required value={form.port} onChange={e => setForm({...form, port: parseInt(e.target.value) || 2775})}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">System ID</label>
                      <input type="text" required value={form.systemId} onChange={e => setForm({...form, systemId: e.target.value})}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                      <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bind Type</label>
                      <select value={form.bindType} onChange={e => setForm({...form, bindType: e.target.value as typeof form.bindType})}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                        <option value="transceiver">Transceiver</option>
                        <option value="transmitter">Transmitter</option>
                        <option value="receiver">Receiver</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Sessions</label>
                      <input type="number" min="1" max="20" value={form.maxSessions} onChange={e => setForm({...form, maxSessions: parseInt(e.target.value) || 5})}
                        className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HTTP URL</label>
                    <input type="url" required value={form.httpUrl} onChange={e => setForm({...form, httpUrl: e.target.value})}
                      placeholder="https://api.example.com/sms/send"
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">HTTP Method</label>
                    <select value={form.httpMethod} onChange={e => setForm({...form, httpMethod: e.target.value as 'GET' | 'POST'})}
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                      <option value="POST">POST</option>
                      <option value="GET">GET</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">TPS (Transactions Per Second)</label>
                <input type="number" min="1" max="1000" value={form.tps} onChange={e => setForm({...form, tps: parseInt(e.target.value) || 100})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button type="submit"
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:shadow-lg">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
