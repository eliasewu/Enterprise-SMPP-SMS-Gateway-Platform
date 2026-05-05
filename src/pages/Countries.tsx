import { useState, useCallback, useMemo, useRef } from 'react';
import { getCountries, addCountry, updateCountry, deleteCountry } from '../store/database';
import type { CountryMccMnc } from '../types';
import { Plus, Pencil, Trash2, X, Search, Globe, Upload, Download, FileText, AlertCircle, CheckCircle } from 'lucide-react';

export default function Countries() {
  const [countries, setCountries] = useState<CountryMccMnc[]>(() => getCountries());
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editing, setEditing] = useState<CountryMccMnc | null>(null);
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Import state
  const [importData, setImportData] = useState<Omit<CountryMccMnc, 'id'>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccess, setImportSuccess] = useState(false);

  const emptyForm: Omit<CountryMccMnc, 'id'> = {
    country: '', countryCode: '', dialCode: '', mcc: '', mnc: '',
    operator: '', brand: '', prefix: '', status: 'active',
  };
  const [form, setForm] = useState(emptyForm);

  const refresh = useCallback(() => setCountries(getCountries()), []);

  const uniqueCountries = useMemo(() => {
    const set = new Set(countries.map(c => c.country));
    return Array.from(set).sort();
  }, [countries]);

  const openAdd = () => { setForm({...emptyForm}); setEditing(null); setShowModal(true); };
  const openEdit = (c: CountryMccMnc) => {
    setForm({
      country: c.country, countryCode: c.countryCode, dialCode: c.dialCode, mcc: c.mcc,
      mnc: c.mnc, operator: c.operator, brand: c.brand, prefix: c.prefix, status: c.status,
    });
    setEditing(c);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateCountry(editing.id, form);
    else addCountry(form);
    setShowModal(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this MCC/MNC entry?')) { deleteCountry(id); refresh(); }
  };

  // Export to CSV
  const exportToCsv = () => {
    const headers = ['country', 'countryCode', 'dialCode', 'mcc', 'mnc', 'operator', 'brand', 'prefix', 'status'];
    const rows = countries.map(c => [
      c.country, c.countryCode, c.dialCode, c.mcc, c.mnc, c.operator, c.brand, c.prefix, c.status
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mcc_mnc_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export template
  const exportTemplate = () => {
    const headers = ['country', 'countryCode', 'dialCode', 'mcc', 'mnc', 'operator', 'brand', 'prefix', 'status'];
    const sampleRows = [
      ['United States', 'US', '+1', '310', '410', 'AT&T', 'AT&T Mobility', '1', 'active'],
      ['United Kingdom', 'GB', '+44', '234', '15', 'Vodafone', 'Vodafone UK', '44', 'active'],
      ['India', 'IN', '+91', '405', '857', 'Jio', 'Reliance Jio', '91', 'active'],
    ];
    
    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcc_mnc_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Parse CSV
  const parseCsv = (text: string): { data: Omit<CountryMccMnc, 'id'>[]; errors: string[] } => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    const errors: string[] = [];
    const data: Omit<CountryMccMnc, 'id'>[] = [];

    if (lines.length < 2) {
      return { data: [], errors: ['File is empty or has no data rows'] };
    }

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    
    const requiredHeaders = ['country', 'countrycode', 'dialcode', 'mcc', 'mnc', 'operator', 'prefix'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return { data: [], errors: [`Missing required columns: ${missingHeaders.join(', ')}`] };
    }

    // Parse rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Parse CSV line (handle quoted values)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            current += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      // Map values to object
      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });

      // Validate required fields
      if (!row.country || !row.mcc || !row.mnc || !row.operator) {
        errors.push(`Row ${i + 1}: Missing required fields (country, mcc, mnc, operator)`);
        continue;
      }

      data.push({
        country: row.country,
        countryCode: row.countrycode || row.country.slice(0, 2).toUpperCase(),
        dialCode: row.dialcode || '',
        mcc: row.mcc,
        mnc: row.mnc,
        operator: row.operator,
        brand: row.brand || row.operator,
        prefix: row.prefix || '',
        status: (row.status === 'inactive' ? 'inactive' : 'active') as 'active' | 'inactive',
      });
    }

    return { data, errors };
  };

  // Handle file import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const { data, errors } = parseCsv(text);
      setImportData(data);
      setImportErrors(errors);
      setImportSuccess(false);
      setShowImportModal(true);
    };
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Confirm import
  const confirmImport = () => {
    let added = 0;
    importData.forEach(item => {
      // Check if already exists
      const exists = countries.some(c => 
        c.mcc === item.mcc && c.mnc === item.mnc && c.operator === item.operator
      );
      if (!exists) {
        addCountry(item);
        added++;
      }
    });
    
    setImportSuccess(true);
    setTimeout(() => {
      setShowImportModal(false);
      setImportData([]);
      setImportErrors([]);
      setImportSuccess(false);
      refresh();
    }, 1500);
  };

  // Bulk delete
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} selected MCC/MNC entries?`)) {
      selectedIds.forEach(id => deleteCountry(id));
      setSelectedIds([]);
      refresh();
    }
  };

  let filtered = countries;
  if (filterCountry) filtered = filtered.filter(c => c.country === filterCountry);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(c =>
      c.country.toLowerCase().includes(s) ||
      c.operator.toLowerCase().includes(s) ||
      c.mcc.includes(s) ||
      c.mnc.includes(s) ||
      c.prefix.includes(s)
    );
  }

  const stats = useMemo(() => {
    const countryCount = new Set(countries.map(c => c.country)).size;
    const operatorCount = countries.length;
    const activeCount = countries.filter(c => c.status === 'active').length;
    return { countryCount, operatorCount, activeCount };
  }, [countries]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Globe className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.countryCount}</p>
            <p className="text-xs text-gray-500">Countries</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">MCC</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.operatorCount}</p>
            <p className="text-xs text-gray-500">MCC/MNC Entries</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{stats.activeCount}</p>
            <p className="text-xs text-gray-500">Active</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-amber-600">{selectedIds.length}</p>
            <p className="text-xs text-gray-500">Selected</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search MCC, MNC, operator..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
            className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Countries</option>
            {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <button onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-700 text-sm font-medium rounded-xl hover:bg-red-100 border border-red-200 transition">
              <Trash2 className="w-4 h-4" /> Delete ({selectedIds.length})
            </button>
          )}
          <button onClick={exportTemplate}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition">
            <FileText className="w-4 h-4" /> Template
          </button>
          <button onClick={exportToCsv}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <label className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition cursor-pointer">
            <Upload className="w-4 h-4" /> Import CSV
            <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
          </label>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition">
            <Plus className="w-4 h-4" /> Add MCC/MNC
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-3 text-left">
                  <input type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={e => setSelectedIds(e.target.checked ? filtered.map(c => c.id) : [])} />
                </th>
                {['Country', 'Code', 'Dial Code', 'MCC', 'MNC', 'Operator', 'Brand', 'Prefix', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.slice(0, 100).map(c => (
                <tr key={c.id} className={`hover:bg-gray-50/50 ${selectedIds.includes(c.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-3 py-2">
                    <input type="checkbox" checked={selectedIds.includes(c.id)}
                      onChange={e => setSelectedIds(e.target.checked ? [...selectedIds, c.id] : selectedIds.filter(id => id !== c.id))} />
                  </td>
                  <td className="px-3 py-2 font-medium text-gray-900">{c.country}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{c.countryCode}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{c.dialCode}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-purple-700">{c.mcc}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-indigo-700">{c.mnc}</td>
                  <td className="px-3 py-2 text-gray-900">{c.operator}</td>
                  <td className="px-3 py-2 text-gray-600">{c.brand}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">+{c.prefix}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                      c.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>{c.status}</span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-8 text-center text-gray-400">No MCC/MNC entries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 100 && (
          <div className="px-4 py-3 bg-gray-50 text-center text-sm text-gray-500">
            Showing 100 of {filtered.length} entries
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">{editing ? 'Edit MCC/MNC' : 'Add MCC/MNC'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input type="text" required value={form.country} onChange={e => setForm({...form, country: e.target.value})}
                    placeholder="United States"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country Code (ISO)</label>
                  <input type="text" required maxLength={2} value={form.countryCode} onChange={e => setForm({...form, countryCode: e.target.value.toUpperCase()})}
                    placeholder="US"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dial Code</label>
                  <input type="text" required value={form.dialCode} onChange={e => setForm({...form, dialCode: e.target.value})}
                    placeholder="+1"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MCC</label>
                  <input type="text" required value={form.mcc} onChange={e => setForm({...form, mcc: e.target.value})}
                    placeholder="310"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MNC</label>
                  <input type="text" required value={form.mnc} onChange={e => setForm({...form, mnc: e.target.value})}
                    placeholder="410"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                  <input type="text" required value={form.operator} onChange={e => setForm({...form, operator: e.target.value})}
                    placeholder="AT&T"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input type="text" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})}
                    placeholder="AT&T Mobility"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
                  <input type="text" required value={form.prefix} onChange={e => setForm({...form, prefix: e.target.value})}
                    placeholder="1"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm({...form, status: e.target.value as 'active' | 'inactive'})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
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

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
              <h3 className="text-lg font-semibold">Import MCC/MNC Data</h3>
              <button onClick={() => { setShowImportModal(false); setImportData([]); setImportErrors([]); }} 
                className="p-1.5 rounded-lg hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {importSuccess ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-lg font-semibold text-green-800">Import Successful!</p>
                  <p className="text-sm text-gray-500">Data has been imported successfully</p>
                </div>
              ) : (
                <>
                  {/* Errors */}
                  {importErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800">Import Warnings</p>
                          <ul className="text-sm text-red-700 mt-1 space-y-1">
                            {importErrors.slice(0, 5).map((err, i) => (
                              <li key={i}>• {err}</li>
                            ))}
                            {importErrors.length > 5 && (
                              <li>• ... and {importErrors.length - 5} more</li>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Preview */}
                  {importData.length > 0 && (
                    <>
                      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                        <p className="font-medium text-green-800">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Ready to import <strong>{importData.length}</strong> MCC/MNC entries
                        </p>
                        <p className="text-sm text-green-700 mt-1">Duplicates will be skipped automatically</p>
                      </div>

                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                          <p className="text-sm font-medium text-gray-700">Preview (first 10 rows)</p>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="px-3 py-2 text-left text-gray-500">Country</th>
                                <th className="px-3 py-2 text-left text-gray-500">Code</th>
                                <th className="px-3 py-2 text-left text-gray-500">MCC</th>
                                <th className="px-3 py-2 text-left text-gray-500">MNC</th>
                                <th className="px-3 py-2 text-left text-gray-500">Operator</th>
                                <th className="px-3 py-2 text-left text-gray-500">Prefix</th>
                                <th className="px-3 py-2 text-left text-gray-500">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {importData.slice(0, 10).map((row, i) => (
                                <tr key={i}>
                                  <td className="px-3 py-2 font-medium">{row.country}</td>
                                  <td className="px-3 py-2 font-mono">{row.countryCode}</td>
                                  <td className="px-3 py-2 font-mono text-purple-700">{row.mcc}</td>
                                  <td className="px-3 py-2 font-mono text-indigo-700">{row.mnc}</td>
                                  <td className="px-3 py-2">{row.operator}</td>
                                  <td className="px-3 py-2 font-mono">+{row.prefix}</td>
                                  <td className="px-3 py-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      row.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>{row.status}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {importData.length > 10 && (
                          <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500 text-center">
                            ... and {importData.length - 10} more rows
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {importData.length === 0 && importErrors.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>No valid data found in the file</p>
                    </div>
                  )}
                </>
              )}
            </div>
            {!importSuccess && importData.length > 0 && (
              <div className="p-5 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                <button onClick={() => { setShowImportModal(false); setImportData([]); setImportErrors([]); }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200">Cancel</button>
                <button onClick={confirmImport}
                  className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl hover:shadow-lg">
                  <Upload className="w-4 h-4" /> Import {importData.length} Entries
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
