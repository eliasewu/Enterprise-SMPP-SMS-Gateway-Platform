import { useState, useMemo } from 'react';
import { getChannels, getSuppliers, getClients, getCountries, addSmsLog } from '../store/database';
import { Send, Smartphone, RefreshCw, CheckCircle, XCircle, Clock, Zap, MessageSquare, Shield } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface TestResult {
  id: string;
  time: string;
  type: 'sms' | 'otp';
  recipient: string;
  message: string;
  channel: string;
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  dlrStatus?: string;
  dlrTime?: string;
  latency?: number;
}

export default function TestSms() {
  const channels = getChannels();
  const suppliers = getSuppliers();
  const clients = getClients();
  const countries = getCountries();

  const [testType, setTestType] = useState<'sms' | 'otp'>('otp');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [sender, setSender] = useState('TESTSMS');
  const [channelId, setChannelId] = useState(channels[0]?.id || '');
  const [otpLength, setOtpLength] = useState(6);
  const [otpExpiry, setOtpExpiry] = useState(5);
  const [results, setResults] = useState<TestResult[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [autoGenerateOtp, setAutoGenerateOtp] = useState(true);

  const boundChannels = useMemo(() => channels.filter(c => c.bindStatus === 'bound' || c.status === 'active'), [channels]);

  const generateOtp = () => {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < otpLength; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  };

  const detectCountry = (phone: string) => {
    const cleaned = phone.replace(/[^0-9+]/g, '');
    for (const country of countries) {
      if (cleaned.startsWith(country.dialCode) || cleaned.startsWith(country.prefix)) {
        return country;
      }
    }
    return null;
  };

  const sendTest = async () => {
    if (!recipient || !channelId) return;

    setIsSending(true);
    const startTime = Date.now();
    const otp = testType === 'otp' && autoGenerateOtp ? generateOtp() : '';
    const finalMessage = testType === 'otp' 
      ? (message || `Your OTP is: ${otp}. Valid for ${otpExpiry} minutes. Do not share.`)
      : (message || 'This is a test SMS message from Enterprise SMS Billing System.');

    const testId = uuidv4();
    const channel = channels.find(c => c.id === channelId);
    const detectedCountry = detectCountry(recipient);

    // Add initial result
    const newResult: TestResult = {
      id: testId,
      time: new Date().toISOString(),
      type: testType,
      recipient,
      message: finalMessage,
      channel: channel?.name || 'Unknown',
      status: 'sending',
    };
    setResults(prev => [newResult, ...prev]);

    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Update to sent
    setResults(prev => prev.map(r => r.id === testId ? { ...r, status: 'sent' as const } : r));

    // Simulate DLR
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    const success = Math.random() > 0.1; // 90% success rate
    const latency = Date.now() - startTime;

    setResults(prev => prev.map(r => r.id === testId ? {
      ...r,
      status: success ? 'delivered' as const : 'failed' as const,
      dlrStatus: success ? 'DELIVRD' : 'UNDELIV',
      dlrTime: new Date().toISOString(),
      latency,
    } : r));

    // Log to SMS logs
    if (channel) {
      const entity = channel.entityType === 'client' 
        ? clients.find(c => c.id === channel.entityId)
        : suppliers.find(s => s.id === channel.entityId);

      addSmsLog({
        messageId: `TEST-${testId.slice(0, 8)}`,
        channelId: channel.id,
        entityId: channel.entityId,
        entityType: channel.entityType,
        sender,
        recipient,
        message: finalMessage,
        messageLength: finalMessage.length,
        segments: Math.ceil(finalMessage.length / 160),
        country: detectedCountry?.country || 'Unknown',
        countryCode: detectedCountry?.countryCode || '',
        operator: detectedCountry?.operator || 'Unknown',
        mcc: detectedCountry?.mcc || '',
        mnc: detectedCountry?.mnc || '',
        rate: entity?.defaultRate || 0.005,
        cost: entity?.defaultRate || 0.005,
        status: success ? 'delivered' : 'failed',
        dlrStatus: success ? 'DELIVRD' : 'UNDELIV',
        dlrTime: new Date().toISOString(),
        submitTime: new Date().toISOString(),
      });
    }

    setIsSending(false);
  };

  const clearResults = () => setResults([]);

  const stats = useMemo(() => {
    const total = results.length;
    const delivered = results.filter(r => r.status === 'delivered').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const avgLatency = results.filter(r => r.latency).reduce((s, r) => s + (r.latency || 0), 0) / (results.filter(r => r.latency).length || 1);
    return { total, delivered, failed, avgLatency };
  }, [results]);

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Zap className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold text-purple-900">SMS & OTP Testing</h3>
            <p className="text-sm text-purple-700 mt-1">
              Send test SMS and OTP messages through your configured channels. Results are logged to SMS Logs for tracking.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test Form */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-500" /> Send Test
            </h3>

            {/* Test Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setTestType('otp')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition ${
                    testType === 'otp' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">OTP</span>
                </button>
                <button type="button" onClick={() => setTestType('sms')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition ${
                    testType === 'sms' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-medium">SMS</span>
                </button>
              </div>
            </div>

            {/* Channel */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
              <select value={channelId} onChange={e => setChannelId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                {boundChannels.length === 0 && <option value="">No active channels</option>}
                {boundChannels.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type.toUpperCase()}) - {c.entityType}
                  </option>
                ))}
              </select>
              {boundChannels.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Please bind a channel first</p>
              )}
            </div>

            {/* Recipient */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Number</label>
              <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              {recipient && detectCountry(recipient) && (
                <p className="text-xs text-green-600 mt-1">
                  Detected: {detectCountry(recipient)?.country} - {detectCountry(recipient)?.operator}
                </p>
              )}
            </div>

            {/* Sender */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Sender ID</label>
              <input type="text" value={sender} onChange={e => setSender(e.target.value)}
                placeholder="TESTSMS"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>

            {/* OTP Options */}
            {testType === 'otp' && (
              <div className="mb-4 p-3 bg-purple-50 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="autoOtp" checked={autoGenerateOtp} onChange={e => setAutoGenerateOtp(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500" />
                  <label htmlFor="autoOtp" className="text-sm text-purple-800">Auto-generate OTP</label>
                </div>
                {autoGenerateOtp && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-purple-700 mb-1">OTP Length</label>
                      <select value={otpLength} onChange={e => setOtpLength(parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 border border-purple-200 rounded-lg text-sm bg-white">
                        <option value={4}>4 digits</option>
                        <option value={6}>6 digits</option>
                        <option value={8}>8 digits</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-purple-700 mb-1">Expiry (min)</label>
                      <select value={otpExpiry} onChange={e => setOtpExpiry(parseInt(e.target.value))}
                        className="w-full px-2 py-1.5 border border-purple-200 rounded-lg text-sm bg-white">
                        <option value={2}>2 min</option>
                        <option value={5}>5 min</option>
                        <option value={10}>10 min</option>
                        <option value={15}>15 min</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message {testType === 'otp' && autoGenerateOtp && '(optional)'}
              </label>
              <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
                placeholder={testType === 'otp' ? 'Leave empty for default OTP message' : 'Enter test message'}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <p className="text-xs text-gray-500 mt-1">{message.length}/160 characters</p>
            </div>

            {/* Send Button */}
            <button onClick={sendTest} disabled={isSending || !recipient || !channelId || boundChannels.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-medium rounded-xl hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
              {isSending ? (
                <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4" /> Send Test {testType.toUpperCase()}</>
              )}
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total Tests</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              <p className="text-xs text-gray-500">Delivered</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-blue-600">{stats.avgLatency.toFixed(0)}ms</p>
              <p className="text-xs text-gray-500">Avg Latency</p>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800">Test Results</h3>
              {results.length > 0 && (
                <button onClick={clearResults} className="text-xs text-red-600 hover:underline">Clear All</button>
              )}
            </div>
            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {results.map(r => (
                <div key={r.id} className="p-4 hover:bg-gray-50/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        r.status === 'delivered' ? 'bg-green-100 text-green-600' :
                        r.status === 'failed' ? 'bg-red-100 text-red-600' :
                        r.status === 'sent' ? 'bg-blue-100 text-blue-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {r.status === 'delivered' ? <CheckCircle className="w-5 h-5" /> :
                         r.status === 'failed' ? <XCircle className="w-5 h-5" /> :
                         r.status === 'sending' ? <RefreshCw className="w-5 h-5 animate-spin" /> :
                         <Clock className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                            r.type === 'otp' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>{r.type.toUpperCase()}</span>
                          <span className="font-mono text-sm text-gray-900">{r.recipient}</span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">{r.message}</p>
                        <p className="text-xs text-gray-400 mt-1">Channel: {r.channel}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        r.status === 'delivered' ? 'bg-green-50 text-green-700' :
                        r.status === 'failed' ? 'bg-red-50 text-red-700' :
                        r.status === 'sent' ? 'bg-blue-50 text-blue-700' :
                        'bg-gray-50 text-gray-700'
                      }`}>{r.status}</span>
                      {r.dlrStatus && (
                        <p className="text-xs font-mono text-gray-500 mt-1">{r.dlrStatus}</p>
                      )}
                      {r.latency && (
                        <p className="text-xs text-gray-400">{r.latency}ms</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(r.time).toLocaleTimeString()}</p>
                    </div>
                  </div>
                </div>
              ))}
              {results.length === 0 && (
                <div className="p-12 text-center text-gray-400">
                  <Smartphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No test results yet</p>
                  <p className="text-xs">Send a test SMS or OTP to see results here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
