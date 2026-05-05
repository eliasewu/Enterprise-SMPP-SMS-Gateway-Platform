import { useState } from 'react';
import { resetDb, getDepartmentEmails, updateDepartmentEmail, getEmailTemplates } from '../store/database';
import { RefreshCw, Database, GitBranch, Server, Copy, Check, Mail, Bell, FileText } from 'lucide-react';

export default function Settings() {
  const [resetDone, setResetDone] = useState(false);
  const [copied, setCopied] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'emails' | 'deploy'>('general');
  const [deptEmails, setDeptEmails] = useState(() => getDepartmentEmails());
  const [templates] = useState(() => getEmailTemplates());

  const handleReset = () => {
    if (confirm('Reset all data to seed values? This cannot be undone.')) {
      resetDb();
      setResetDone(true);
      setTimeout(() => { setResetDone(false); window.location.reload(); }, 1500);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const updateDeptEmail = (id: string, email: string) => {
    updateDepartmentEmail(id, { email });
    setDeptEmails(getDepartmentEmails());
  };

  const debianCommands = `# ===== Debian/Ubuntu Server Setup =====

# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install Git & Nginx
sudo apt install -y git nginx

# 4. Clone your repository
cd /var/www
sudo git clone https://github.com/YOUR_USERNAME/sms-billing-enterprise.git
cd sms-billing-enterprise

# 5. Install dependencies & build
npm install
npm run build

# 6. Configure Nginx
sudo tee /etc/nginx/sites-available/sms-billing <<'EOF'
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/sms-billing-enterprise/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
EOF

# 7. Enable site & restart
sudo ln -s /etc/nginx/sites-available/sms-billing /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl restart nginx

# 8. SSL with Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com`;

  const githubCommands = `# ===== GitHub Push Commands =====

# Initial setup
git init
git add .
git commit -m "feat: Enterprise SMS Billing System

Features:
- Supplier & Client management with rates
- MCC/MNC database for all countries
- SMPP/HTTP channel management (Kannel)
- Real-time bind status monitoring
- SMS logs with filtering & export
- Invoice generation (hourly/daily/weekly/monthly)
- Payment reminders (Monday & Thursday)
- Force DLR configuration
- Reports with analytics"

git remote add origin https://github.com/YOUR_USERNAME/sms-billing-enterprise.git
git branch -M main
git push -u origin main

# ===== Update deployed app =====
ssh user@your-server
cd /var/www/sms-billing-enterprise
git pull origin main
npm install && npm run build
sudo systemctl restart nginx`;

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'general', label: 'General', icon: Database },
          { id: 'emails', label: 'Email Settings', icon: Mail },
          { id: 'deploy', label: 'Deployment', icon: Server },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="space-y-6">
          {/* Database Section */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-500" /> Database Management
              </h3>
            </div>
            <div className="p-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• Storage: Browser LocalStorage</p>
                  <p>• Key: <code className="bg-blue-100 px-1 rounded">sms_billing_db</code></p>
                  <p>• Size: ~{((localStorage.getItem('sms_billing_db')?.length || 0) / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <button onClick={handleReset}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition ${
                  resetDone ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}>
                <RefreshCw className={`w-4 h-4 ${resetDone ? 'animate-spin' : ''}`} />
                {resetDone ? 'Reset Done! Reloading...' : 'Reset Database'}
              </button>
            </div>
          </div>

          {/* Login Credentials */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">🔐 Login Credentials</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-sm">Admin: <code>admin / admin123</code></p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-sm">Manager: <code>manager / manager123</code></p>
              </div>
            </div>
          </div>

          {/* Feature Summary */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-800 mb-4">📋 Enterprise Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                '✅ Supplier & Client Rate Management',
                '✅ Individual Rate per Country/Operator',
                '✅ MCC/MNC Database (80+ operators)',
                '✅ Kannel SMPP/HTTP Channels',
                '✅ Real-time Bind Status Monitoring',
                '✅ Session/Channel Management',
                '✅ SMS Logs with Export to CSV',
                '✅ Invoice: Custom/Hourly/Daily/Weekly/Monthly',
                '✅ Send Invoice from Billing Dept',
                '✅ Send Rates from Rates Dept',
                '✅ Payment Reminders (Mon & Thu)',
                '✅ Auto-stop reminders when paid',
                '✅ Force DLR for Client & Supplier',
                '✅ Force DLR Timeout (from 1 second)',
                '✅ Reports with Charts & Export',
                '✅ Credit Limit & Payment Tracking',
              ].map((f, i) => <p key={i} className="text-gray-700">{f}</p>)}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'emails' && (
        <div className="space-y-6">
          {/* Department Emails */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-500" /> Department Emails
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">Configure email addresses for each department. These will be used as "From" addresses when sending invoices, rates, and reminders.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {deptEmails.map(dept => (
                  <div key={dept.id} className="bg-gray-50 rounded-xl p-4">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">{dept.department} Department</label>
                    <input type="email" value={dept.email} onChange={e => updateDeptEmail(dept.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                    <p className="text-xs text-gray-400 mt-1">{dept.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-500" /> Payment Reminder Schedule
              </h3>
            </div>
            <div className="p-5">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-sm text-orange-800">
                  <strong>Automatic Reminders:</strong> Payment reminders are sent on <strong>Monday</strong> and <strong>Thursday</strong> for overdue invoices.
                </p>
                <ul className="text-sm text-orange-700 mt-2 space-y-1">
                  <li>• Reminders stop automatically when invoice is marked as paid</li>
                  <li>• Each reminder increments the reminder count</li>
                  <li>• Email sent from Accounts Department</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Email Templates */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" /> Email Templates
              </h3>
            </div>
            <div className="p-5 space-y-4">
              {templates.map(t => (
                <div key={t.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{t.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{t.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">From: {t.departmentEmail} ({t.department})</p>
                  <p className="text-sm text-gray-600"><strong>Subject:</strong> {t.subject}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'deploy' && (
        <div className="space-y-6">
          {/* Debian Deployment */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Server className="w-4 h-4 text-orange-500" /> Deploy on Debian/Ubuntu
              </h3>
              <button onClick={() => copyToClipboard(debianCommands, 'debian')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                {copied === 'debian' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                {copied === 'debian' ? 'Copied!' : 'Copy All'}
              </button>
            </div>
            <div className="p-5">
              <pre className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                {debianCommands}
              </pre>
            </div>
          </div>

          {/* GitHub Push */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <GitBranch className="w-4 h-4" /> GitHub Push & Update
              </h3>
              <button onClick={() => copyToClipboard(githubCommands, 'github')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                {copied === 'github' ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                {copied === 'github' ? 'Copied!' : 'Copy All'}
              </button>
            </div>
            <div className="p-5">
              <pre className="bg-gray-900 text-green-400 rounded-xl p-4 text-xs overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
                {githubCommands}
              </pre>
            </div>
          </div>

          {/* Quick Deploy Steps */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
            <h4 className="font-semibold text-blue-900 mb-3">🚀 Quick Deploy Checklist</h4>
            <ol className="text-sm text-blue-800 space-y-2">
              <li>1. Push code to GitHub</li>
              <li>2. SSH into your Debian server</li>
              <li>3. Clone repo to <code className="bg-blue-100 px-1 rounded">/var/www/</code></li>
              <li>4. Run <code className="bg-blue-100 px-1 rounded">npm install && npm run build</code></li>
              <li>5. Configure Nginx as reverse proxy</li>
              <li>6. Setup SSL with Let's Encrypt</li>
              <li>7. Access via your domain!</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
