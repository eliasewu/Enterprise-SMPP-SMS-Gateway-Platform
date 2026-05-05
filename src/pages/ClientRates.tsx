import { useState, useCallback, useMemo } from 'react';
import { getClientRates, getClients, getCountries, addClientRate, updateClientRate, deleteClientRate, getDepartmentEmail } from '../store/database';
import type { ClientRate, CountryMccMnc } from '../types';
import { Plus, Pencil, Trash2, X, Filter, Mail, Send, Upload, Check } from 'lucide-react';

type SmsType = 'transactional' | 'promotional' | 'otp';

export default function ClientRates() {
  const [rates, setRates] = useState<ClientRate[]>(() => getClientRates());
  const clients = getClients();
  const countries = getCountries();
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editing, setEditing] = useState<ClientRate | null>(null);
  const [filterClient, setFilterClient] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedRates, setSelectedRates] = useState<string[]>([]);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailNotes, setEmailNotes] = useState('');

  const emptyForm: {
    clientId: string; country: string; countryCode: string; mcc: string; mnc: string;
    operator: string; prefix: string; rate: number; smsType: SmsType; status: 'active' | 'inactive';
  } = {
    clientId: clients[0]?.id || '', country: '', countryCode: '', mcc: '', mnc: '',
    operator: '', prefix: '', rate: 0, smsType: 'transactional', status: 'active',
  };
  const [form, setForm] = useState(emptyForm);

  // Bulk add state
  const [bulkForm, setBulkForm] = useState({
    clientId: clients[0]?.id || '',
    selectedCountries: [] as string[],
    selectedMccMnc: [] as string[],
    rate: 0,
    smsType: 'transactional' as SmsType,
  });

  const refresh = useCallback(() => setRates(getClientRates()), []);

  const uniqueCountries = useMemo(() => {
    const set = new Set(countries.map(c => c.country));
    return Array.from(set).sort();
  }, [countries]);

  const operatorsForCountry = useMemo(() => {
    if (!form.country) return [];
    return countries.filter(c => c.country === form.country);
  }, [form.country, countries]);

  const bulkOperators = useMemo(() => {
    if (bulkForm.selectedCountries.length === 0) return countries;
    return countries.filter(c => bulkForm.selectedCountries.includes(c.country));
  }, [bulkForm.selectedCountries, countries]);

  const openAdd = () => { setForm({...emptyForm}); setEditing(null); setShowModal(true); };
  const openEdit = (r: ClientRate) => {
    setForm({
      clientId: r.clientId, country: r.country, countryCode: r.countryCode, mcc: r.mcc,
      mnc: r.mnc, operator: r.operator, prefix: r.prefix, rate: r.rate, smsType: r.smsType, status: r.status
    });
    setEditing(r);
    setShowModal(true);
  };

  const handleCountryChange = (country: string) => {
    const countryData = countries.find(c => c.country === country);
    setForm({
      ...form, country, countryCode: countryData?.countryCode || '', prefix: countryData?.prefix || '',
      operator: '', mcc: '', mnc: ''
    });
  };

  const handleOperatorChange = (opData: CountryMccMnc) => {
    setForm({
      ...form, operator: opData.operator, mcc: opData.mcc, mnc: opData.mnc,
      countryCode: opData.countryCode, prefix: opData.prefix
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateClientRate(editing.id, form);
    else addClientRate(form);
    setShowModal(false);
    refresh();
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedOps = countries.filter(c => bulkForm.selectedMccMnc.includes(`${c.mcc}-${c.mnc}`));
    
    selectedOps.forEach(op => {
      addClientRate({
        clientId: bulkForm.clientId,
        country: op.country,
        countryCode: op.countryCode,
        mcc: op.mcc,
        mnc: op.mnc,
        operator: op.operator,
        prefix: op.prefix,
        rate: bulkForm.rate,
        smsType: bulkForm.smsType,
        status: 'active',
      });
    });

    alert(`✅ Added ${selectedOps.length} rates successfully!`);
    setShowBulkModal(false);
    setBulkForm({ ...bulkForm, selectedCountries: [], selectedMccMnc: [], rate: 0 });
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this rate?')) { deleteClientRate(id); refresh(); }
  };

  const toggleMccMnc = (key: string) => {
    setBulkForm(prev => ({
      ...prev,
      selectedMccMnc: prev.selectedMccMnc.includes(key)
        ? prev.selectedMccMnc.filter(k => k !== key)
        : [...prev.selectedMccMnc, key]
    }));
  };

  const selectAllMccMnc = () => {
    setBulkForm(prev => ({
      ...prev,
      selectedMccMnc: bulkOperators.map(o => `${o.mcc}-${o.mnc}`)
    }));
  };

  const sendRatesEmail = () => {
    const ratesDept = getDepartmentEmail('rates');
    const client = clients.find(c => c.id === (selectedRates.length > 0 ? rates.find(r => r.id === selectedRates[0])?.clientId : ''));
    const selectedRateData = rates.filter(r => selectedRates.includes(r.id));
    
    const ratesList = selectedRateData.map(r => 
      `${r.country} | ${r.operator} | ${r.mcc}-${r.mnc} | $${r.rate.toFixed(4)} | ${r.smsType}`
    ).join('\n');

    alert(`📧 Rate Email Sent!\n\n` +
      `From: ${ratesDept?.email}\n` +
      `To: ${emailRecipient || client?.ratesEmail}\n` +
      `Subject: SMS Rate Update - ${client?.name}\n\n` +
      `Rates:\n${ratesList}\n\n` +
      `Notes: ${emailNotes || 'N/A'}`
    );
    
    setShowEmailModal(false);
    setSelectedRates([]);
    setEmailRecipient('');
    setEmailNotes('');
  };

  let filtered = rates;
  if (filterClient) filtered = filtered.filter(r => r.clientId === filterClient);
  if (filterCountry) filtered = filtered.filter(r => r.country === filterCountry);
  const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown';

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
          <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Countries</option>
            {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          {selectedRates.length > 0 && (
            <button onClick={() => { setEmailRecipient(''); setShowEmailModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition">
              <Mail className="w-4 h-4" /> Send Rates ({selectedRates.length})
            </button>
          )}
          <button onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition">
            <Upload className="w-4 h-4" /> Bulk Add
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition">
            <Plus className="w-4 h-4" /> Add Rate
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-3 text-left">
                  <input type="checkbox" 
                    checked={filtered.length > 0 && selectedRates.length === filtered.length}
                    onChange={e => setSelectedRates(e.target.checked ? filtered.map(r => r.id) : [])} />
                </th>
                {['Client', 'Country', 'MCC/MNC', 'Operator', 'Prefix', 'SMS Type', 'Rate', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50/50 ${selectedRates.includes(r.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-3 py-3">
                    <input type="checkbox" checked={selectedRates.includes(r.id)}
                      onChange={e => setSelectedRates(e.target.checked ? [...selectedRates, r.id] : selectedRates.filter(id => id !== r.id))} />
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-900">{getClientName(r.clientId)}</td>
                  <td className="px-3 py-3 text-gray-700">
                    <div className="flex items-center gap-1">
                      <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{r.countryCode}</span>
                      {r.country}
                    </div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-600">{r.mcc}-{r.mnc}</td>
                  <td className="px-3 py-3 text-gray-700">{r.operator}</td>
                  <td className="px-3 py-3 font-mono text-gray-600">+{r.prefix}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      r.smsType === 'otp' ? 'bg-purple-50 text-purple-700' :
                      r.smsType === 'promotional' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                    }`}>{r.smsType}</span>
                  </td>
                  <td className="px-3 py-3 font-mono font-semibold text-gray-900">${r.rate.toFixed(4)}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      r.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-gray-400">No rates found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Single Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">{editing ? 'Edit Rate' : 'Add Client Rate'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                <select required value={form.clientId} onChange={e => setForm({...form, clientId: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="">Select Client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select required value={form.country} onChange={e => handleCountryChange(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Select Country</option>
                    {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                  <select required value={form.operator} onChange={e => {
                    const op = operatorsForCountry.find(o => o.operator === e.target.value);
                    if (op) handleOperatorChange(op);
                  }}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Select Operator</option>
                    {operatorsForCountry.map(o => <option key={`${o.mcc}-${o.mnc}`} value={o.operator}>{o.operator} ({o.mcc}-{o.mnc})</option>)}
                  </select>
                </div>
              </div>
              {form.operator && (
                <div className="bg-gray-50 rounded-xl p-3 text-xs">
                  <div className="grid grid-cols-4 gap-2">
                    <div><span className="text-gray-500">Code:</span> <span className="font-mono font-medium">{form.countryCode}</span></div>
                    <div><span className="text-gray-500">MCC:</span> <span className="font-mono font-medium">{form.mcc}</span></div>
                    <div><span className="text-gray-500">MNC:</span> <span className="font-mono font-medium">{form.mnc}</span></div>
                    <div><span className="text-gray-500">Prefix:</span> <span className="font-mono font-medium">+{form.prefix}</span></div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate ($/SMS)</label>
                  <input type="number" step="0.0001" min="0" required value={form.rate}
                    onChange={e => setForm({...form, rate: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMS Type</label>
                  <select value={form.smsType} onChange={e => setForm({...form, smsType: e.target.value as SmsType})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="transactional">Transactional</option>
                    <option value="promotional">Promotional</option>
                    <option value="otp">OTP</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({...form, status: e.target.value as 'active' | 'inactive'})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button type="submit"
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:shadow-lg">
                  {editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-semibold">Bulk Add Client Rates</h3>
              <button onClick={() => setShowBulkModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleBulkSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                  <select required value={bulkForm.clientId} onChange={e => setBulkForm({...bulkForm, clientId: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="">Select Client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMS Type</label>
                  <select value={bulkForm.smsType} onChange={e => setBulkForm({...bulkForm, smsType: e.target.value as SmsType})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="transactional">Transactional</option>
                    <option value="promotional">Promotional</option>
                    <option value="otp">OTP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Countries (optional)</label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-xl max-h-24 overflow-y-auto">
                  {uniqueCountries.map(c => (
                    <button key={c} type="button"
                      onClick={() => setBulkForm(prev => ({
                        ...prev,
                        selectedCountries: prev.selectedCountries.includes(c)
                          ? prev.selectedCountries.filter(x => x !== c)
                          : [...prev.selectedCountries, c]
                      }))}
                      className={`px-2 py-1 text-xs rounded-lg transition ${
                        bulkForm.selectedCountries.includes(c) ? 'bg-blue-500 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Select MCC/MNC ({bulkForm.selectedMccMnc.length} selected)</label>
                  <button type="button" onClick={selectAllMccMnc} className="text-xs text-blue-600 hover:underline">Select All</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-gray-50 rounded-xl max-h-48 overflow-y-auto">
                  {bulkOperators.map(o => {
                    const key = `${o.mcc}-${o.mnc}`;
                    const selected = bulkForm.selectedMccMnc.includes(key);
                    return (
                      <button key={key} type="button" onClick={() => toggleMccMnc(key)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-left text-xs transition ${
                          selected ? 'bg-green-100 border-2 border-green-500' : 'bg-white border border-gray-200 hover:bg-gray-100'
                        }`}>
                        <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${selected ? 'bg-green-500 text-white' : 'bg-gray-200'}`}>
                          {selected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{o.operator}</p>
                          <p className="text-gray-500">{o.country} • {o.mcc}-{o.mnc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate ($/SMS) - Applied to all selected</label>
                <input type="number" step="0.0001" min="0" required value={bulkForm.rate}
                  onChange={e => setBulkForm({...bulkForm, rate: parseFloat(e.target.value) || 0})}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>

              {bulkForm.selectedMccMnc.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-sm text-green-800">
                    <strong>{bulkForm.selectedMccMnc.length}</strong> MCC/MNC entries will be added at <strong>${bulkForm.rate.toFixed(4)}</strong>/SMS
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={bulkForm.selectedMccMnc.length === 0}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:shadow-lg disabled:opacity-50">
                  Add {bulkForm.selectedMccMnc.length} Rates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">Send Rates via Email</h3>
              <button onClick={() => setShowEmailModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-sm text-purple-800">
                  <strong>{selectedRates.length}</strong> rate(s) selected
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Email</label>
                <input type="email" value={emailRecipient} onChange={e => setEmailRecipient(e.target.value)}
                  placeholder="rates@client.com"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                <p className="text-xs text-gray-500 mt-1">Leave empty to use client's rates email</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={emailNotes} onChange={e => setEmailNotes(e.target.value)} rows={3}
                  placeholder="Additional notes for the rate update..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button onClick={sendRatesEmail}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl hover:shadow-lg">
                  <Send className="w-4 h-4" /> Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
