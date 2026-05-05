import { v4 as uuidv4 } from 'uuid';
import type {
  Supplier, Client, SupplierRate, ClientRate,
  SmsBilling, Payment, ForceDlrConfig, User,
  SmsLog, Channel, CountryMccMnc, Invoice, Report,
  EmailTemplate, Notification, DepartmentEmail
} from '../types';

const DB_KEY = 'sms_billing_db';

interface Database {
  suppliers: Supplier[];
  clients: Client[];
  supplierRates: SupplierRate[];
  clientRates: ClientRate[];
  billings: SmsBilling[];
  payments: Payment[];
  forceDlrConfigs: ForceDlrConfig[];
  smsLogs: SmsLog[];
  channels: Channel[];
  countries: CountryMccMnc[];
  invoices: Invoice[];
  reports: Report[];
  emailTemplates: EmailTemplate[];
  notifications: Notification[];
  departmentEmails: DepartmentEmail[];
  user: User | null;
  initialized: boolean;
}

function getDefaultDb(): Database {
  return {
    suppliers: [],
    clients: [],
    supplierRates: [],
    clientRates: [],
    billings: [],
    payments: [],
    forceDlrConfigs: [],
    smsLogs: [],
    channels: [],
    countries: [],
    invoices: [],
    reports: [],
    emailTemplates: [],
    notifications: [],
    departmentEmails: [],
    user: null,
    initialized: false,
  };
}

function loadDb(): Database {
  try {
    const data = localStorage.getItem(DB_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load DB:', e);
  }
  return getDefaultDb();
}

function saveDb(db: Database): void {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// MCC/MNC Data for major countries
const countryData: Omit<CountryMccMnc, 'id'>[] = [
  // USA
  { country: 'United States', countryCode: 'US', dialCode: '+1', mcc: '310', mnc: '410', operator: 'AT&T', brand: 'AT&T', prefix: '1', status: 'active' },
  { country: 'United States', countryCode: 'US', dialCode: '+1', mcc: '311', mnc: '480', operator: 'Verizon', brand: 'Verizon', prefix: '1', status: 'active' },
  { country: 'United States', countryCode: 'US', dialCode: '+1', mcc: '310', mnc: '260', operator: 'T-Mobile', brand: 'T-Mobile', prefix: '1', status: 'active' },
  // UK
  { country: 'United Kingdom', countryCode: 'GB', dialCode: '+44', mcc: '234', mnc: '15', operator: 'Vodafone', brand: 'Vodafone UK', prefix: '44', status: 'active' },
  { country: 'United Kingdom', countryCode: 'GB', dialCode: '+44', mcc: '234', mnc: '10', operator: 'O2', brand: 'O2 UK', prefix: '44', status: 'active' },
  { country: 'United Kingdom', countryCode: 'GB', dialCode: '+44', mcc: '234', mnc: '30', operator: 'EE', brand: 'EE', prefix: '44', status: 'active' },
  { country: 'United Kingdom', countryCode: 'GB', dialCode: '+44', mcc: '234', mnc: '20', operator: 'Three', brand: '3 UK', prefix: '44', status: 'active' },
  // India
  { country: 'India', countryCode: 'IN', dialCode: '+91', mcc: '405', mnc: '857', operator: 'Jio', brand: 'Reliance Jio', prefix: '91', status: 'active' },
  { country: 'India', countryCode: 'IN', dialCode: '+91', mcc: '404', mnc: '10', operator: 'Airtel', brand: 'Airtel', prefix: '91', status: 'active' },
  { country: 'India', countryCode: 'IN', dialCode: '+91', mcc: '404', mnc: '20', operator: 'Vodafone Idea', brand: 'Vi', prefix: '91', status: 'active' },
  { country: 'India', countryCode: 'IN', dialCode: '+91', mcc: '404', mnc: '45', operator: 'BSNL', brand: 'BSNL', prefix: '91', status: 'active' },
  // Bangladesh
  { country: 'Bangladesh', countryCode: 'BD', dialCode: '+880', mcc: '470', mnc: '01', operator: 'Grameenphone', brand: 'GP', prefix: '880', status: 'active' },
  { country: 'Bangladesh', countryCode: 'BD', dialCode: '+880', mcc: '470', mnc: '02', operator: 'Robi', brand: 'Robi', prefix: '880', status: 'active' },
  { country: 'Bangladesh', countryCode: 'BD', dialCode: '+880', mcc: '470', mnc: '03', operator: 'Banglalink', brand: 'Banglalink', prefix: '880', status: 'active' },
  { country: 'Bangladesh', countryCode: 'BD', dialCode: '+880', mcc: '470', mnc: '04', operator: 'Teletalk', brand: 'Teletalk', prefix: '880', status: 'active' },
  // Pakistan
  { country: 'Pakistan', countryCode: 'PK', dialCode: '+92', mcc: '410', mnc: '01', operator: 'Jazz', brand: 'Jazz', prefix: '92', status: 'active' },
  { country: 'Pakistan', countryCode: 'PK', dialCode: '+92', mcc: '410', mnc: '03', operator: 'Ufone', brand: 'Ufone', prefix: '92', status: 'active' },
  { country: 'Pakistan', countryCode: 'PK', dialCode: '+92', mcc: '410', mnc: '04', operator: 'Zong', brand: 'Zong', prefix: '92', status: 'active' },
  { country: 'Pakistan', countryCode: 'PK', dialCode: '+92', mcc: '410', mnc: '06', operator: 'Telenor', brand: 'Telenor PK', prefix: '92', status: 'active' },
  // Germany
  { country: 'Germany', countryCode: 'DE', dialCode: '+49', mcc: '262', mnc: '01', operator: 'Telekom', brand: 'T-Mobile DE', prefix: '49', status: 'active' },
  { country: 'Germany', countryCode: 'DE', dialCode: '+49', mcc: '262', mnc: '02', operator: 'Vodafone', brand: 'Vodafone DE', prefix: '49', status: 'active' },
  { country: 'Germany', countryCode: 'DE', dialCode: '+49', mcc: '262', mnc: '03', operator: 'O2', brand: 'O2 DE', prefix: '49', status: 'active' },
  // France
  { country: 'France', countryCode: 'FR', dialCode: '+33', mcc: '208', mnc: '01', operator: 'Orange', brand: 'Orange', prefix: '33', status: 'active' },
  { country: 'France', countryCode: 'FR', dialCode: '+33', mcc: '208', mnc: '10', operator: 'SFR', brand: 'SFR', prefix: '33', status: 'active' },
  { country: 'France', countryCode: 'FR', dialCode: '+33', mcc: '208', mnc: '20', operator: 'Bouygues', brand: 'Bouygues', prefix: '33', status: 'active' },
  // UAE
  { country: 'UAE', countryCode: 'AE', dialCode: '+971', mcc: '424', mnc: '02', operator: 'Etisalat', brand: 'Etisalat', prefix: '971', status: 'active' },
  { country: 'UAE', countryCode: 'AE', dialCode: '+971', mcc: '424', mnc: '03', operator: 'du', brand: 'du', prefix: '971', status: 'active' },
  // Saudi Arabia
  { country: 'Saudi Arabia', countryCode: 'SA', dialCode: '+966', mcc: '420', mnc: '01', operator: 'STC', brand: 'STC', prefix: '966', status: 'active' },
  { country: 'Saudi Arabia', countryCode: 'SA', dialCode: '+966', mcc: '420', mnc: '03', operator: 'Mobily', brand: 'Mobily', prefix: '966', status: 'active' },
  { country: 'Saudi Arabia', countryCode: 'SA', dialCode: '+966', mcc: '420', mnc: '04', operator: 'Zain', brand: 'Zain SA', prefix: '966', status: 'active' },
  // Singapore
  { country: 'Singapore', countryCode: 'SG', dialCode: '+65', mcc: '525', mnc: '01', operator: 'Singtel', brand: 'Singtel', prefix: '65', status: 'active' },
  { country: 'Singapore', countryCode: 'SG', dialCode: '+65', mcc: '525', mnc: '03', operator: 'M1', brand: 'M1', prefix: '65', status: 'active' },
  { country: 'Singapore', countryCode: 'SG', dialCode: '+65', mcc: '525', mnc: '05', operator: 'StarHub', brand: 'StarHub', prefix: '65', status: 'active' },
  // Malaysia
  { country: 'Malaysia', countryCode: 'MY', dialCode: '+60', mcc: '502', mnc: '12', operator: 'Maxis', brand: 'Maxis', prefix: '60', status: 'active' },
  { country: 'Malaysia', countryCode: 'MY', dialCode: '+60', mcc: '502', mnc: '13', operator: 'Celcom', brand: 'Celcom', prefix: '60', status: 'active' },
  { country: 'Malaysia', countryCode: 'MY', dialCode: '+60', mcc: '502', mnc: '16', operator: 'Digi', brand: 'Digi', prefix: '60', status: 'active' },
  // Indonesia
  { country: 'Indonesia', countryCode: 'ID', dialCode: '+62', mcc: '510', mnc: '10', operator: 'Telkomsel', brand: 'Telkomsel', prefix: '62', status: 'active' },
  { country: 'Indonesia', countryCode: 'ID', dialCode: '+62', mcc: '510', mnc: '11', operator: 'XL', brand: 'XL Axiata', prefix: '62', status: 'active' },
  { country: 'Indonesia', countryCode: 'ID', dialCode: '+62', mcc: '510', mnc: '01', operator: 'Indosat', brand: 'Indosat', prefix: '62', status: 'active' },
  // Philippines
  { country: 'Philippines', countryCode: 'PH', dialCode: '+63', mcc: '515', mnc: '02', operator: 'Globe', brand: 'Globe', prefix: '63', status: 'active' },
  { country: 'Philippines', countryCode: 'PH', dialCode: '+63', mcc: '515', mnc: '03', operator: 'Smart', brand: 'Smart', prefix: '63', status: 'active' },
  // Thailand
  { country: 'Thailand', countryCode: 'TH', dialCode: '+66', mcc: '520', mnc: '01', operator: 'AIS', brand: 'AIS', prefix: '66', status: 'active' },
  { country: 'Thailand', countryCode: 'TH', dialCode: '+66', mcc: '520', mnc: '04', operator: 'TrueMove', brand: 'TrueMove H', prefix: '66', status: 'active' },
  { country: 'Thailand', countryCode: 'TH', dialCode: '+66', mcc: '520', mnc: '05', operator: 'dtac', brand: 'dtac', prefix: '66', status: 'active' },
  // Nigeria
  { country: 'Nigeria', countryCode: 'NG', dialCode: '+234', mcc: '621', mnc: '20', operator: 'Airtel', brand: 'Airtel NG', prefix: '234', status: 'active' },
  { country: 'Nigeria', countryCode: 'NG', dialCode: '+234', mcc: '621', mnc: '30', operator: 'MTN', brand: 'MTN NG', prefix: '234', status: 'active' },
  { country: 'Nigeria', countryCode: 'NG', dialCode: '+234', mcc: '621', mnc: '50', operator: 'Glo', brand: 'Glo', prefix: '234', status: 'active' },
  // South Africa
  { country: 'South Africa', countryCode: 'ZA', dialCode: '+27', mcc: '655', mnc: '01', operator: 'Vodacom', brand: 'Vodacom', prefix: '27', status: 'active' },
  { country: 'South Africa', countryCode: 'ZA', dialCode: '+27', mcc: '655', mnc: '10', operator: 'MTN', brand: 'MTN SA', prefix: '27', status: 'active' },
  // Australia
  { country: 'Australia', countryCode: 'AU', dialCode: '+61', mcc: '505', mnc: '01', operator: 'Telstra', brand: 'Telstra', prefix: '61', status: 'active' },
  { country: 'Australia', countryCode: 'AU', dialCode: '+61', mcc: '505', mnc: '02', operator: 'Optus', brand: 'Optus', prefix: '61', status: 'active' },
  { country: 'Australia', countryCode: 'AU', dialCode: '+61', mcc: '505', mnc: '03', operator: 'Vodafone', brand: 'Vodafone AU', prefix: '61', status: 'active' },
  // Canada
  { country: 'Canada', countryCode: 'CA', dialCode: '+1', mcc: '302', mnc: '220', operator: 'Telus', brand: 'Telus', prefix: '1', status: 'active' },
  { country: 'Canada', countryCode: 'CA', dialCode: '+1', mcc: '302', mnc: '720', operator: 'Rogers', brand: 'Rogers', prefix: '1', status: 'active' },
  { country: 'Canada', countryCode: 'CA', dialCode: '+1', mcc: '302', mnc: '610', operator: 'Bell', brand: 'Bell', prefix: '1', status: 'active' },
  // Brazil
  { country: 'Brazil', countryCode: 'BR', dialCode: '+55', mcc: '724', mnc: '10', operator: 'Vivo', brand: 'Vivo', prefix: '55', status: 'active' },
  { country: 'Brazil', countryCode: 'BR', dialCode: '+55', mcc: '724', mnc: '02', operator: 'TIM', brand: 'TIM', prefix: '55', status: 'active' },
  { country: 'Brazil', countryCode: 'BR', dialCode: '+55', mcc: '724', mnc: '31', operator: 'Claro', brand: 'Claro BR', prefix: '55', status: 'active' },
  // Mexico
  { country: 'Mexico', countryCode: 'MX', dialCode: '+52', mcc: '334', mnc: '020', operator: 'Telcel', brand: 'Telcel', prefix: '52', status: 'active' },
  { country: 'Mexico', countryCode: 'MX', dialCode: '+52', mcc: '334', mnc: '030', operator: 'Movistar', brand: 'Movistar MX', prefix: '52', status: 'active' },
  // Spain
  { country: 'Spain', countryCode: 'ES', dialCode: '+34', mcc: '214', mnc: '01', operator: 'Vodafone', brand: 'Vodafone ES', prefix: '34', status: 'active' },
  { country: 'Spain', countryCode: 'ES', dialCode: '+34', mcc: '214', mnc: '03', operator: 'Orange', brand: 'Orange ES', prefix: '34', status: 'active' },
  { country: 'Spain', countryCode: 'ES', dialCode: '+34', mcc: '214', mnc: '07', operator: 'Movistar', brand: 'Movistar ES', prefix: '34', status: 'active' },
  // Italy
  { country: 'Italy', countryCode: 'IT', dialCode: '+39', mcc: '222', mnc: '01', operator: 'TIM', brand: 'TIM IT', prefix: '39', status: 'active' },
  { country: 'Italy', countryCode: 'IT', dialCode: '+39', mcc: '222', mnc: '10', operator: 'Vodafone', brand: 'Vodafone IT', prefix: '39', status: 'active' },
  { country: 'Italy', countryCode: 'IT', dialCode: '+39', mcc: '222', mnc: '88', operator: 'Wind Tre', brand: 'WindTre', prefix: '39', status: 'active' },
  // Japan
  { country: 'Japan', countryCode: 'JP', dialCode: '+81', mcc: '440', mnc: '10', operator: 'NTT Docomo', brand: 'Docomo', prefix: '81', status: 'active' },
  { country: 'Japan', countryCode: 'JP', dialCode: '+81', mcc: '440', mnc: '20', operator: 'SoftBank', brand: 'SoftBank', prefix: '81', status: 'active' },
  { country: 'Japan', countryCode: 'JP', dialCode: '+81', mcc: '440', mnc: '50', operator: 'KDDI', brand: 'au', prefix: '81', status: 'active' },
  // South Korea
  { country: 'South Korea', countryCode: 'KR', dialCode: '+82', mcc: '450', mnc: '05', operator: 'SK Telecom', brand: 'SKT', prefix: '82', status: 'active' },
  { country: 'South Korea', countryCode: 'KR', dialCode: '+82', mcc: '450', mnc: '06', operator: 'LG U+', brand: 'LG U+', prefix: '82', status: 'active' },
  { country: 'South Korea', countryCode: 'KR', dialCode: '+82', mcc: '450', mnc: '08', operator: 'KT', brand: 'KT', prefix: '82', status: 'active' },
  // China
  { country: 'China', countryCode: 'CN', dialCode: '+86', mcc: '460', mnc: '00', operator: 'China Mobile', brand: 'CMCC', prefix: '86', status: 'active' },
  { country: 'China', countryCode: 'CN', dialCode: '+86', mcc: '460', mnc: '01', operator: 'China Unicom', brand: 'CU', prefix: '86', status: 'active' },
  { country: 'China', countryCode: 'CN', dialCode: '+86', mcc: '460', mnc: '03', operator: 'China Telecom', brand: 'CT', prefix: '86', status: 'active' },
  // Russia
  { country: 'Russia', countryCode: 'RU', dialCode: '+7', mcc: '250', mnc: '01', operator: 'MTS', brand: 'MTS', prefix: '7', status: 'active' },
  { country: 'Russia', countryCode: 'RU', dialCode: '+7', mcc: '250', mnc: '02', operator: 'MegaFon', brand: 'MegaFon', prefix: '7', status: 'active' },
  { country: 'Russia', countryCode: 'RU', dialCode: '+7', mcc: '250', mnc: '99', operator: 'Beeline', brand: 'Beeline RU', prefix: '7', status: 'active' },
  // Turkey
  { country: 'Turkey', countryCode: 'TR', dialCode: '+90', mcc: '286', mnc: '01', operator: 'Turkcell', brand: 'Turkcell', prefix: '90', status: 'active' },
  { country: 'Turkey', countryCode: 'TR', dialCode: '+90', mcc: '286', mnc: '02', operator: 'Vodafone', brand: 'Vodafone TR', prefix: '90', status: 'active' },
  { country: 'Turkey', countryCode: 'TR', dialCode: '+90', mcc: '286', mnc: '03', operator: 'Turk Telekom', brand: 'Turk Telekom', prefix: '90', status: 'active' },
  // Egypt
  { country: 'Egypt', countryCode: 'EG', dialCode: '+20', mcc: '602', mnc: '01', operator: 'Orange', brand: 'Orange EG', prefix: '20', status: 'active' },
  { country: 'Egypt', countryCode: 'EG', dialCode: '+20', mcc: '602', mnc: '02', operator: 'Vodafone', brand: 'Vodafone EG', prefix: '20', status: 'active' },
  { country: 'Egypt', countryCode: 'EG', dialCode: '+20', mcc: '602', mnc: '03', operator: 'Etisalat', brand: 'Etisalat EG', prefix: '20', status: 'active' },
  // Kenya
  { country: 'Kenya', countryCode: 'KE', dialCode: '+254', mcc: '639', mnc: '02', operator: 'Safaricom', brand: 'Safaricom', prefix: '254', status: 'active' },
  { country: 'Kenya', countryCode: 'KE', dialCode: '+254', mcc: '639', mnc: '03', operator: 'Airtel', brand: 'Airtel KE', prefix: '254', status: 'active' },
  // Vietnam
  { country: 'Vietnam', countryCode: 'VN', dialCode: '+84', mcc: '452', mnc: '01', operator: 'Mobifone', brand: 'Mobifone', prefix: '84', status: 'active' },
  { country: 'Vietnam', countryCode: 'VN', dialCode: '+84', mcc: '452', mnc: '02', operator: 'Vinaphone', brand: 'Vinaphone', prefix: '84', status: 'active' },
  { country: 'Vietnam', countryCode: 'VN', dialCode: '+84', mcc: '452', mnc: '04', operator: 'Viettel', brand: 'Viettel', prefix: '84', status: 'active' },
  // Sri Lanka
  { country: 'Sri Lanka', countryCode: 'LK', dialCode: '+94', mcc: '413', mnc: '01', operator: 'Dialog', brand: 'Dialog', prefix: '94', status: 'active' },
  { country: 'Sri Lanka', countryCode: 'LK', dialCode: '+94', mcc: '413', mnc: '02', operator: 'Mobitel', brand: 'Mobitel', prefix: '94', status: 'active' },
  // Nepal
  { country: 'Nepal', countryCode: 'NP', dialCode: '+977', mcc: '429', mnc: '01', operator: 'Nepal Telecom', brand: 'NTC', prefix: '977', status: 'active' },
  { country: 'Nepal', countryCode: 'NP', dialCode: '+977', mcc: '429', mnc: '02', operator: 'Ncell', brand: 'Ncell', prefix: '977', status: 'active' },
];

function initializeWithSeedData(): Database {
  const db = getDefaultDb();
  db.initialized = true;

  // Seed countries
  db.countries = countryData.map(c => ({ ...c, id: uuidv4() }));

  // Seed department emails
  db.departmentEmails = [
    { id: uuidv4(), department: 'rates', email: 'rates@smsbilling.com', name: 'Rates Department', status: 'active' },
    { id: uuidv4(), department: 'billing', email: 'billing@smsbilling.com', name: 'Billing Department', status: 'active' },
    { id: uuidv4(), department: 'accounts', email: 'accounts@smsbilling.com', name: 'Accounts Department', status: 'active' },
    { id: uuidv4(), department: 'support', email: 'support@smsbilling.com', name: 'Support Team', status: 'active' },
  ];

  // Seed email templates
  db.emailTemplates = [
    { id: uuidv4(), name: 'Rate Update', type: 'rate_update', subject: 'SMS Rate Update - {{entity_name}}', 
      body: 'Dear {{entity_name}},\n\nPlease find attached the updated SMS rates effective from {{date}}.\n\nCountry: {{country}}\nOperator: {{operator}}\nOld Rate: ${{old_rate}}\nNew Rate: ${{new_rate}}\n\nBest regards,\nRates Department',
      department: 'rates', departmentEmail: 'rates@smsbilling.com', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), name: 'Invoice', type: 'invoice', subject: 'Invoice #{{invoice_number}} - {{entity_name}}',
      body: 'Dear {{entity_name}},\n\nPlease find attached Invoice #{{invoice_number}} for the period {{period_start}} to {{period_end}}.\n\nTotal Amount: ${{amount}}\nDue Date: {{due_date}}\n\nKindly make the payment by the due date.\n\nBest regards,\nBilling Department',
      department: 'billing', departmentEmail: 'billing@smsbilling.com', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), name: 'Payment Reminder', type: 'payment_reminder', subject: 'Payment Reminder - Invoice #{{invoice_number}}',
      body: 'Dear {{entity_name}},\n\nThis is a friendly reminder that Invoice #{{invoice_number}} for ${{amount}} is due on {{due_date}}.\n\nPlease make the payment at your earliest convenience to avoid service interruption.\n\nBest regards,\nAccounts Department',
      department: 'accounts', departmentEmail: 'accounts@smsbilling.com', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), name: 'Payment Received', type: 'payment_received', subject: 'Payment Received - Invoice #{{invoice_number}}',
      body: 'Dear {{entity_name}},\n\nThank you! We have received your payment of ${{amount}} for Invoice #{{invoice_number}}.\n\nYour account has been updated accordingly.\n\nBest regards,\nAccounts Department',
      department: 'accounts', departmentEmail: 'accounts@smsbilling.com', status: 'active', createdAt: new Date().toISOString() },
  ];

  // Seed suppliers
  const sup1: Supplier = {
    id: uuidv4(), name: 'TeleRoute Global', email: 'ops@teleroute.com',
    phone: '+1-555-0101', company: 'TeleRoute Inc', status: 'active',
    creditLimit: 50000, currentBalance: 12500, defaultRate: 0.0035,
    ratesEmail: 'rates@teleroute.com', billingEmail: 'billing@teleroute.com',
    createdAt: new Date().toISOString()
  };
  const sup2: Supplier = {
    id: uuidv4(), name: 'SMS Gateway Pro', email: 'billing@smsgw.pro',
    phone: '+44-20-7946-0958', company: 'SMSGW Ltd', status: 'active',
    creditLimit: 100000, currentBalance: 45000, defaultRate: 0.0028,
    ratesEmail: 'rates@smsgw.pro', billingEmail: 'accounts@smsgw.pro',
    createdAt: new Date().toISOString()
  };
  const sup3: Supplier = {
    id: uuidv4(), name: 'MobiConnect Asia', email: 'support@mobiconnect.asia',
    phone: '+91-9876543210', company: 'MobiConnect Pvt Ltd', status: 'active',
    creditLimit: 75000, currentBalance: 30000, defaultRate: 0.0015,
    ratesEmail: 'rates@mobiconnect.asia', billingEmail: 'billing@mobiconnect.asia',
    createdAt: new Date().toISOString()
  };
  db.suppliers = [sup1, sup2, sup3];

  // Seed clients
  const cli1: Client = {
    id: uuidv4(), name: 'E-Commerce Plus', email: 'sms@ecommplus.com',
    phone: '+1-555-0201', company: 'EComm Plus LLC', status: 'active',
    creditLimit: 25000, currentBalance: 8500, defaultRate: 0.0065,
    ratesEmail: 'tech@ecommplus.com', billingEmail: 'accounts@ecommplus.com',
    createdAt: new Date().toISOString()
  };
  const cli2: Client = {
    id: uuidv4(), name: 'FinSecure Bank', email: 'otp@finsecure.bank',
    phone: '+44-20-7946-1234', company: 'FinSecure Holdings', status: 'active',
    creditLimit: 200000, currentBalance: 95000, defaultRate: 0.0080,
    ratesEmail: 'it@finsecure.bank', billingEmail: 'finance@finsecure.bank',
    createdAt: new Date().toISOString()
  };
  const cli3: Client = {
    id: uuidv4(), name: 'HealthAlert Co', email: 'alerts@healthalert.co',
    phone: '+91-9812345678', company: 'HealthAlert India', status: 'active',
    creditLimit: 50000, currentBalance: 22000, defaultRate: 0.0050,
    ratesEmail: 'tech@healthalert.co', billingEmail: 'accounts@healthalert.co',
    createdAt: new Date().toISOString()
  };
  db.clients = [cli1, cli2, cli3];

  // Seed channels (Kannel SMPP/HTTP)
  db.channels = [
    { id: uuidv4(), name: 'Kannel SMPP - TeleRoute', type: 'smpp', entityId: sup1.id, entityType: 'supplier',
      host: '192.168.1.100', port: 2775, systemId: 'teleroute', password: '****', systemType: 'SMPP',
      bindType: 'transceiver', status: 'bound', bindStatus: 'bound', tps: 100, sessions: 2, maxSessions: 5,
      lastConnected: new Date().toISOString(), createdAt: new Date().toISOString() },
    { id: uuidv4(), name: 'HTTP API - SMS Gateway', type: 'http', entityId: sup2.id, entityType: 'supplier',
      host: 'api.smsgw.pro', port: 443, systemId: 'client123', password: '****', systemType: 'HTTP',
      bindType: 'transceiver', httpUrl: 'https://api.smsgw.pro/v2/send', httpMethod: 'POST',
      status: 'active', bindStatus: 'bound', tps: 200, sessions: 1, maxSessions: 1,
      lastConnected: new Date().toISOString(), createdAt: new Date().toISOString() },
    { id: uuidv4(), name: 'Kannel SMPP - ECommerce', type: 'smpp', entityId: cli1.id, entityType: 'client',
      host: '10.0.0.50', port: 2775, systemId: 'ecomm', password: '****', systemType: 'SMPP',
      bindType: 'transmitter', status: 'bound', bindStatus: 'bound', tps: 50, sessions: 1, maxSessions: 3,
      lastConnected: new Date().toISOString(), createdAt: new Date().toISOString() },
    { id: uuidv4(), name: 'HTTP - FinSecure', type: 'http', entityId: cli2.id, entityType: 'client',
      host: 'otp.finsecure.bank', port: 443, systemId: 'finsec_api', password: '****', systemType: 'HTTP',
      bindType: 'transceiver', httpUrl: 'https://otp.finsecure.bank/webhook', httpMethod: 'POST',
      status: 'active', bindStatus: 'bound', tps: 150, sessions: 1, maxSessions: 1,
      lastConnected: new Date().toISOString(), createdAt: new Date().toISOString() },
    { id: uuidv4(), name: 'Kannel - MobiConnect', type: 'smpp', entityId: sup3.id, entityType: 'supplier',
      host: '172.16.0.10', port: 2775, systemId: 'mobiconn', password: '****', systemType: 'SMPP',
      bindType: 'transceiver', status: 'disconnected', bindStatus: 'unbound', tps: 80, sessions: 0, maxSessions: 4,
      lastError: 'Connection timeout', createdAt: new Date().toISOString() },
  ];

  // Seed supplier rates with MCC/MNC
  db.supplierRates = [
    { id: uuidv4(), supplierId: sup1.id, country: 'United States', countryCode: 'US', mcc: '310', mnc: '410', operator: 'AT&T', prefix: '1', rate: 0.0040, smsType: 'transactional', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), supplierId: sup1.id, country: 'United States', countryCode: 'US', mcc: '311', mnc: '480', operator: 'Verizon', prefix: '1', rate: 0.0038, smsType: 'transactional', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), supplierId: sup1.id, country: 'United Kingdom', countryCode: 'GB', mcc: '234', mnc: '15', operator: 'Vodafone', prefix: '44', rate: 0.0045, smsType: 'otp', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), supplierId: sup2.id, country: 'India', countryCode: 'IN', mcc: '405', mnc: '857', operator: 'Jio', prefix: '91', rate: 0.0012, smsType: 'promotional', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), supplierId: sup2.id, country: 'India', countryCode: 'IN', mcc: '404', mnc: '10', operator: 'Airtel', prefix: '91', rate: 0.0014, smsType: 'transactional', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), supplierId: sup3.id, country: 'Bangladesh', countryCode: 'BD', mcc: '470', mnc: '01', operator: 'Grameenphone', prefix: '880', rate: 0.0020, smsType: 'otp', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), supplierId: sup3.id, country: 'Pakistan', countryCode: 'PK', mcc: '410', mnc: '01', operator: 'Jazz', prefix: '92', rate: 0.0018, smsType: 'transactional', status: 'active', createdAt: new Date().toISOString() },
  ];

  // Seed client rates
  db.clientRates = [
    { id: uuidv4(), clientId: cli1.id, country: 'United States', countryCode: 'US', mcc: '310', mnc: '410', operator: 'AT&T', prefix: '1', rate: 0.0075, smsType: 'transactional', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), clientId: cli1.id, country: 'United States', countryCode: 'US', mcc: '311', mnc: '480', operator: 'Verizon', prefix: '1', rate: 0.0070, smsType: 'transactional', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), clientId: cli2.id, country: 'United Kingdom', countryCode: 'GB', mcc: '234', mnc: '15', operator: 'Vodafone', prefix: '44', rate: 0.0090, smsType: 'otp', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), clientId: cli2.id, country: 'India', countryCode: 'IN', mcc: '405', mnc: '857', operator: 'Jio', prefix: '91', rate: 0.0045, smsType: 'otp', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), clientId: cli3.id, country: 'India', countryCode: 'IN', mcc: '404', mnc: '10', operator: 'Airtel', prefix: '91', rate: 0.0055, smsType: 'transactional', status: 'active', createdAt: new Date().toISOString() },
    { id: uuidv4(), clientId: cli3.id, country: 'Bangladesh', countryCode: 'BD', mcc: '470', mnc: '01', operator: 'Grameenphone', prefix: '880', rate: 0.0060, smsType: 'otp', status: 'active', createdAt: new Date().toISOString() },
  ];

  // Seed SMS logs
  const now = new Date();
  const logs: SmsLog[] = [];
  const statuses: SmsLog['status'][] = ['delivered', 'delivered', 'delivered', 'sent', 'failed', 'delivered', 'pending'];
  for (let i = 0; i < 50; i++) {
    const isClient = Math.random() > 0.5;
    const entity = isClient ? [cli1, cli2, cli3][Math.floor(Math.random() * 3)] : [sup1, sup2, sup3][Math.floor(Math.random() * 3)];
    const channel = db.channels.find(c => c.entityId === entity.id) || db.channels[0];
    const country = db.countries[Math.floor(Math.random() * db.countries.length)];
    logs.push({
      id: uuidv4(),
      messageId: `MSG${Date.now()}${i}`,
      channelId: channel.id,
      entityId: entity.id,
      entityType: isClient ? 'client' : 'supplier',
      sender: 'SMSBILL',
      recipient: `${country.dialCode}${Math.floor(Math.random() * 9000000000) + 1000000000}`,
      message: `Test message ${i + 1}`,
      messageLength: 50 + Math.floor(Math.random() * 100),
      segments: 1,
      country: country.country,
      countryCode: country.countryCode,
      operator: country.operator,
      mcc: country.mcc,
      mnc: country.mnc,
      rate: 0.003 + Math.random() * 0.005,
      cost: 0.003 + Math.random() * 0.005,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      dlrStatus: 'DELIVRD',
      submitTime: new Date(now.getTime() - Math.random() * 86400000 * 7).toISOString(),
      createdAt: new Date(now.getTime() - Math.random() * 86400000 * 7).toISOString(),
    });
  }
  db.smsLogs = logs;

  // Seed billings
  db.billings = [
    { id: uuidv4(), entityId: cli1.id, entityType: 'client', billingSign: 'normal', smsCount: 5000, rate: 0.0075, totalAmount: 37.50, country: 'USA', operator: 'AT&T', smsType: 'transactional', status: 'delivered', forceDlr: false, forceDlrTimeout: 0, createdAt: new Date(now.getTime() - 86400000).toISOString(), updatedAt: new Date().toISOString() },
    { id: uuidv4(), entityId: cli2.id, entityType: 'client', billingSign: 'success_submit', smsCount: 15000, rate: 0.0090, totalAmount: 135.00, country: 'UK', operator: 'Vodafone', smsType: 'otp', status: 'submitted', forceDlr: true, forceDlrTimeout: 3, createdAt: new Date(now.getTime() - 43200000).toISOString(), updatedAt: new Date().toISOString() },
    { id: uuidv4(), entityId: sup1.id, entityType: 'supplier', billingSign: 'deliver', smsCount: 5000, rate: 0.0040, totalAmount: 20.00, country: 'USA', operator: 'AT&T', smsType: 'transactional', status: 'delivered', forceDlr: false, forceDlrTimeout: 0, createdAt: new Date(now.getTime() - 86400000).toISOString(), updatedAt: new Date().toISOString() },
    { id: uuidv4(), entityId: sup2.id, entityType: 'supplier', billingSign: 'success_submit', smsCount: 15000, rate: 0.0012, totalAmount: 18.00, country: 'India', operator: 'Jio', smsType: 'promotional', status: 'submitted', forceDlr: false, forceDlrTimeout: 0, createdAt: new Date(now.getTime() - 43200000).toISOString(), updatedAt: new Date().toISOString() },
  ];

  // Seed invoices
  db.invoices = [
    {
      id: uuidv4(), invoiceNumber: 'INV-2024-001', entityId: cli1.id, entityType: 'client',
      periodType: 'monthly', periodStart: '2024-01-01', periodEnd: '2024-01-31',
      totalSms: 150000, totalAmount: 975.00, taxRate: 10, taxAmount: 97.50, grandTotal: 1072.50,
      status: 'paid', dueDate: '2024-02-15', paidDate: '2024-02-10', paidAmount: 1072.50, notes: '',
      items: [
        { country: 'USA', operator: 'AT&T', smsType: 'transactional', smsCount: 80000, rate: 0.0075, amount: 600 },
        { country: 'USA', operator: 'Verizon', smsType: 'transactional', smsCount: 70000, rate: 0.0070, amount: 490 },
      ],
      remindersSent: 0, createdAt: new Date(now.getTime() - 86400000 * 30).toISOString(),
    },
    {
      id: uuidv4(), invoiceNumber: 'INV-2024-002', entityId: cli2.id, entityType: 'client',
      periodType: 'weekly', periodStart: '2024-02-01', periodEnd: '2024-02-07',
      totalSms: 200000, totalAmount: 1800.00, taxRate: 10, taxAmount: 180.00, grandTotal: 1980.00,
      status: 'overdue', dueDate: '2024-02-20', notes: 'OTP traffic for February Week 1',
      items: [
        { country: 'UK', operator: 'Vodafone', smsType: 'otp', smsCount: 100000, rate: 0.0090, amount: 900 },
        { country: 'India', operator: 'Jio', smsType: 'otp', smsCount: 100000, rate: 0.0045, amount: 450 },
      ],
      remindersSent: 2, lastReminderDate: new Date(now.getTime() - 86400000 * 3).toISOString(),
      sentAt: new Date(now.getTime() - 86400000 * 20).toISOString(),
      createdAt: new Date(now.getTime() - 86400000 * 20).toISOString(),
    },
    {
      id: uuidv4(), invoiceNumber: 'INV-2024-003', entityId: cli3.id, entityType: 'client',
      periodType: 'daily', periodStart: '2024-02-10', periodEnd: '2024-02-10',
      totalSms: 50000, totalAmount: 275.00, taxRate: 10, taxAmount: 27.50, grandTotal: 302.50,
      status: 'sent', dueDate: '2024-02-25', notes: '',
      items: [
        { country: 'India', operator: 'Airtel', smsType: 'transactional', smsCount: 50000, rate: 0.0055, amount: 275 },
      ],
      remindersSent: 0, sentAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    },
  ];

  // Seed payments
  db.payments = [
    { id: uuidv4(), entityId: cli1.id, entityType: 'client', invoiceId: db.invoices[0].id, amount: 1072.50, paymentMethod: 'bank_transfer', reference: 'PAY-001', notes: 'Monthly invoice payment', status: 'completed', createdAt: new Date(now.getTime() - 86400000 * 20).toISOString() },
    { id: uuidv4(), entityId: cli2.id, entityType: 'client', amount: 2000, paymentMethod: 'online', reference: 'PAY-002', notes: 'Advance payment', status: 'completed', createdAt: new Date(now.getTime() - 86400000).toISOString() },
    { id: uuidv4(), entityId: sup1.id, entityType: 'supplier', amount: 1500, paymentMethod: 'bank_transfer', reference: 'SUP-PAY-001', notes: 'Route payment', status: 'completed', createdAt: new Date(now.getTime() - 86400000 * 3).toISOString() },
  ];

  // Seed force DLR configs
  db.forceDlrConfigs = [
    { id: uuidv4(), entityId: cli2.id, entityType: 'client', enabled: true, timeoutSeconds: 3, dlrStatus: 'DELIVRD', createdAt: new Date().toISOString() },
    { id: uuidv4(), entityId: sup1.id, entityType: 'supplier', enabled: false, timeoutSeconds: 5, dlrStatus: 'DELIVRD', createdAt: new Date().toISOString() },
  ];

  // Seed notifications
  db.notifications = [
    { id: uuidv4(), entityId: cli2.id, entityType: 'client', invoiceId: db.invoices[1].id, type: 'payment_reminder', channel: 'email', status: 'sent', sentAt: new Date(now.getTime() - 86400000 * 3).toISOString(), message: 'Payment reminder for Invoice INV-2024-002', createdAt: new Date(now.getTime() - 86400000 * 3).toISOString() },
  ];

  saveDb(db);
  return db;
}

// =================== DB Operations ===================

export function getDb(): Database {
  const db = loadDb();
  if (!db.initialized) {
    return initializeWithSeedData();
  }
  return db;
}

export function resetDb(): Database {
  localStorage.removeItem(DB_KEY);
  return initializeWithSeedData();
}

// Auth
export function login(username: string, password: string): User | null {
  if (username === 'admin' && password === 'admin123') {
    const user: User = { username: 'admin', role: 'admin' };
    const db = getDb();
    db.user = user;
    saveDb(db);
    return user;
  }
  if (username === 'manager' && password === 'manager123') {
    const user: User = { username: 'manager', role: 'manager' };
    const db = getDb();
    db.user = user;
    saveDb(db);
    return user;
  }
  return null;
}

export function logout(): void {
  const db = getDb();
  db.user = null;
  saveDb(db);
}

export function getCurrentUser(): User | null {
  return getDb().user;
}

// Suppliers
export function getSuppliers(): Supplier[] { return getDb().suppliers; }
export function getSupplier(id: string): Supplier | undefined { return getDb().suppliers.find(s => s.id === id); }
export function addSupplier(data: Omit<Supplier, 'id' | 'createdAt'>): Supplier {
  const db = getDb();
  const supplier: Supplier = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  db.suppliers.push(supplier);
  saveDb(db);
  return supplier;
}
export function updateSupplier(id: string, data: Partial<Supplier>): Supplier | null {
  const db = getDb();
  const idx = db.suppliers.findIndex(s => s.id === id);
  if (idx === -1) return null;
  db.suppliers[idx] = { ...db.suppliers[idx], ...data };
  saveDb(db);
  return db.suppliers[idx];
}
export function deleteSupplier(id: string): boolean {
  const db = getDb();
  db.suppliers = db.suppliers.filter(s => s.id !== id);
  db.supplierRates = db.supplierRates.filter(r => r.supplierId !== id);
  saveDb(db);
  return true;
}

// Clients
export function getClients(): Client[] { return getDb().clients; }
export function getClient(id: string): Client | undefined { return getDb().clients.find(c => c.id === id); }
export function addClient(data: Omit<Client, 'id' | 'createdAt'>): Client {
  const db = getDb();
  const client: Client = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  db.clients.push(client);
  saveDb(db);
  return client;
}
export function updateClient(id: string, data: Partial<Client>): Client | null {
  const db = getDb();
  const idx = db.clients.findIndex(c => c.id === id);
  if (idx === -1) return null;
  db.clients[idx] = { ...db.clients[idx], ...data };
  saveDb(db);
  return db.clients[idx];
}
export function deleteClient(id: string): boolean {
  const db = getDb();
  db.clients = db.clients.filter(c => c.id !== id);
  db.clientRates = db.clientRates.filter(r => r.clientId !== id);
  saveDb(db);
  return true;
}

// Supplier Rates
export function getSupplierRates(supplierId?: string): SupplierRate[] {
  const db = getDb();
  return supplierId ? db.supplierRates.filter(r => r.supplierId === supplierId) : db.supplierRates;
}
export function addSupplierRate(data: Omit<SupplierRate, 'id' | 'createdAt'>): SupplierRate {
  const db = getDb();
  const rate: SupplierRate = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  db.supplierRates.push(rate);
  saveDb(db);
  return rate;
}
export function updateSupplierRate(id: string, data: Partial<SupplierRate>): SupplierRate | null {
  const db = getDb();
  const idx = db.supplierRates.findIndex(r => r.id === id);
  if (idx === -1) return null;
  db.supplierRates[idx] = { ...db.supplierRates[idx], ...data };
  saveDb(db);
  return db.supplierRates[idx];
}
export function deleteSupplierRate(id: string): boolean {
  const db = getDb();
  db.supplierRates = db.supplierRates.filter(r => r.id !== id);
  saveDb(db);
  return true;
}

// Client Rates
export function getClientRates(clientId?: string): ClientRate[] {
  const db = getDb();
  return clientId ? db.clientRates.filter(r => r.clientId === clientId) : db.clientRates;
}
export function addClientRate(data: Omit<ClientRate, 'id' | 'createdAt'>): ClientRate {
  const db = getDb();
  const rate: ClientRate = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  db.clientRates.push(rate);
  saveDb(db);
  return rate;
}
export function updateClientRate(id: string, data: Partial<ClientRate>): ClientRate | null {
  const db = getDb();
  const idx = db.clientRates.findIndex(r => r.id === id);
  if (idx === -1) return null;
  db.clientRates[idx] = { ...db.clientRates[idx], ...data };
  saveDb(db);
  return db.clientRates[idx];
}
export function deleteClientRate(id: string): boolean {
  const db = getDb();
  db.clientRates = db.clientRates.filter(r => r.id !== id);
  saveDb(db);
  return true;
}

// Billings
export function getBillings(entityType?: 'supplier' | 'client', entityId?: string): SmsBilling[] {
  const db = getDb();
  let billings = db.billings;
  if (entityType) billings = billings.filter(b => b.entityType === entityType);
  if (entityId) billings = billings.filter(b => b.entityId === entityId);
  return billings;
}
export function addBilling(data: Omit<SmsBilling, 'id' | 'createdAt' | 'updatedAt'>): SmsBilling {
  const db = getDb();
  const billing: SmsBilling = { ...data, id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.billings.push(billing);
  saveDb(db);
  return billing;
}
export function updateBilling(id: string, data: Partial<SmsBilling>): SmsBilling | null {
  const db = getDb();
  const idx = db.billings.findIndex(b => b.id === id);
  if (idx === -1) return null;
  db.billings[idx] = { ...db.billings[idx], ...data, updatedAt: new Date().toISOString() };
  saveDb(db);
  return db.billings[idx];
}

// Payments
export function getPayments(entityType?: 'supplier' | 'client', entityId?: string): Payment[] {
  const db = getDb();
  let payments = db.payments;
  if (entityType) payments = payments.filter(p => p.entityType === entityType);
  if (entityId) payments = payments.filter(p => p.entityId === entityId);
  return payments;
}
export function addPayment(data: Omit<Payment, 'id' | 'createdAt'>): Payment {
  const db = getDb();
  const payment: Payment = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  db.payments.push(payment);
  // Update balance
  if (data.entityType === 'client') {
    const idx = db.clients.findIndex(c => c.id === data.entityId);
    if (idx !== -1) db.clients[idx].currentBalance += data.amount;
  } else {
    const idx = db.suppliers.findIndex(s => s.id === data.entityId);
    if (idx !== -1) db.suppliers[idx].currentBalance += data.amount;
  }
  // Mark invoice as paid if linked
  if (data.invoiceId) {
    const invIdx = db.invoices.findIndex(i => i.id === data.invoiceId);
    if (invIdx !== -1) {
      db.invoices[invIdx].status = 'paid';
      db.invoices[invIdx].paidDate = new Date().toISOString();
      db.invoices[invIdx].paidAmount = data.amount;
    }
  }
  saveDb(db);
  return payment;
}

// Force DLR
export function getForceDlrConfigs(entityType?: 'supplier' | 'client'): ForceDlrConfig[] {
  const db = getDb();
  return entityType ? db.forceDlrConfigs.filter(c => c.entityType === entityType) : db.forceDlrConfigs;
}
export function getForceDlrConfig(entityId: string): ForceDlrConfig | undefined {
  return getDb().forceDlrConfigs.find(c => c.entityId === entityId);
}
export function upsertForceDlrConfig(data: Omit<ForceDlrConfig, 'id' | 'createdAt'>): ForceDlrConfig {
  const db = getDb();
  const idx = db.forceDlrConfigs.findIndex(c => c.entityId === data.entityId);
  if (idx !== -1) {
    db.forceDlrConfigs[idx] = { ...db.forceDlrConfigs[idx], ...data };
    saveDb(db);
    return db.forceDlrConfigs[idx];
  }
  const config: ForceDlrConfig = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  db.forceDlrConfigs.push(config);
  saveDb(db);
  return config;
}

// SMS Logs
export function getSmsLogs(filters?: { entityId?: string; entityType?: 'supplier' | 'client'; channelId?: string; status?: string; dateFrom?: string; dateTo?: string }): SmsLog[] {
  const db = getDb();
  let logs = db.smsLogs;
  if (filters?.entityId) logs = logs.filter(l => l.entityId === filters.entityId);
  if (filters?.entityType) logs = logs.filter(l => l.entityType === filters.entityType);
  if (filters?.channelId) logs = logs.filter(l => l.channelId === filters.channelId);
  if (filters?.status) logs = logs.filter(l => l.status === filters.status);
  if (filters?.dateFrom) logs = logs.filter(l => l.createdAt >= filters.dateFrom!);
  if (filters?.dateTo) logs = logs.filter(l => l.createdAt <= filters.dateTo!);
  return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export function addSmsLog(data: Omit<SmsLog, 'id' | 'createdAt'>): SmsLog {
  const db = getDb();
  const log: SmsLog = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  db.smsLogs.push(log);
  saveDb(db);
  return log;
}

// Channels
export function getChannels(entityType?: 'supplier' | 'client'): Channel[] {
  const db = getDb();
  return entityType ? db.channels.filter(c => c.entityType === entityType) : db.channels;
}
export function getChannel(id: string): Channel | undefined {
  return getDb().channels.find(c => c.id === id);
}
export function addChannel(data: Omit<Channel, 'id' | 'createdAt'>): Channel {
  const db = getDb();
  const channel: Channel = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  db.channels.push(channel);
  saveDb(db);
  return channel;
}
export function updateChannel(id: string, data: Partial<Channel>): Channel | null {
  const db = getDb();
  const idx = db.channels.findIndex(c => c.id === id);
  if (idx === -1) return null;
  db.channels[idx] = { ...db.channels[idx], ...data };
  saveDb(db);
  return db.channels[idx];
}
export function deleteChannel(id: string): boolean {
  const db = getDb();
  db.channels = db.channels.filter(c => c.id !== id);
  saveDb(db);
  return true;
}

// Countries/MCC/MNC
export function getCountries(): CountryMccMnc[] { return getDb().countries; }
export function getCountriesByCode(countryCode: string): CountryMccMnc[] {
  return getDb().countries.filter(c => c.countryCode === countryCode);
}
export function addCountry(data: Omit<CountryMccMnc, 'id'>): CountryMccMnc {
  const db = getDb();
  const country: CountryMccMnc = { ...data, id: uuidv4() };
  db.countries.push(country);
  saveDb(db);
  return country;
}
export function updateCountry(id: string, data: Partial<CountryMccMnc>): CountryMccMnc | null {
  const db = getDb();
  const idx = db.countries.findIndex(c => c.id === id);
  if (idx === -1) return null;
  db.countries[idx] = { ...db.countries[idx], ...data };
  saveDb(db);
  return db.countries[idx];
}
export function deleteCountry(id: string): boolean {
  const db = getDb();
  db.countries = db.countries.filter(c => c.id !== id);
  saveDb(db);
  return true;
}

// Invoices
export function getInvoices(entityType?: 'supplier' | 'client', entityId?: string): Invoice[] {
  const db = getDb();
  let invoices = db.invoices;
  if (entityType) invoices = invoices.filter(i => i.entityType === entityType);
  if (entityId) invoices = invoices.filter(i => i.entityId === entityId);
  return invoices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export function getInvoice(id: string): Invoice | undefined {
  return getDb().invoices.find(i => i.id === id);
}
export function addInvoice(data: Omit<Invoice, 'id' | 'createdAt'>): Invoice {
  const db = getDb();
  const invoice: Invoice = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  db.invoices.push(invoice);
  saveDb(db);
  return invoice;
}
export function updateInvoice(id: string, data: Partial<Invoice>): Invoice | null {
  const db = getDb();
  const idx = db.invoices.findIndex(i => i.id === id);
  if (idx === -1) return null;
  db.invoices[idx] = { ...db.invoices[idx], ...data };
  saveDb(db);
  return db.invoices[idx];
}
export function getNextInvoiceNumber(): string {
  const db = getDb();
  const year = new Date().getFullYear();
  const count = db.invoices.filter(i => i.invoiceNumber.includes(`${year}`)).length + 1;
  return `INV-${year}-${String(count).padStart(3, '0')}`;
}

// Reports
export function getReports(): Report[] {
  return getDb().reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export function addReport(data: Omit<Report, 'id' | 'createdAt'>): Report {
  const db = getDb();
  const report: Report = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  db.reports.push(report);
  saveDb(db);
  return report;
}
export function updateReport(id: string, data: Partial<Report>): Report | null {
  const db = getDb();
  const idx = db.reports.findIndex(r => r.id === id);
  if (idx === -1) return null;
  db.reports[idx] = { ...db.reports[idx], ...data };
  saveDb(db);
  return db.reports[idx];
}

// Generate report data
export function generateReportData(filters: { periodStart: string; periodEnd: string; entityId?: string; entityType?: 'supplier' | 'client'; channelId?: string }): Report['data'] {
  const logs = getSmsLogs({
    entityId: filters.entityId,
    entityType: filters.entityType,
    channelId: filters.channelId,
    dateFrom: filters.periodStart,
    dateTo: filters.periodEnd,
  });

  const totalSms = logs.length;
  const deliveredSms = logs.filter(l => l.status === 'delivered').length;
  const failedSms = logs.filter(l => l.status === 'failed').length;
  const pendingSms = logs.filter(l => l.status === 'pending' || l.status === 'sent').length;
  const totalCost = logs.filter(l => l.entityType === 'supplier').reduce((s, l) => s + l.cost, 0);
  const totalRevenue = logs.filter(l => l.entityType === 'client').reduce((s, l) => s + l.cost, 0);

  const byCountryMap = new Map<string, { count: number; amount: number }>();
  const byOperatorMap = new Map<string, { count: number; amount: number }>();
  const byHourMap = new Map<string, number>();
  const byDayMap = new Map<string, { count: number; amount: number }>();

  logs.forEach(l => {
    // By country
    const c = byCountryMap.get(l.country) || { count: 0, amount: 0 };
    c.count++; c.amount += l.cost;
    byCountryMap.set(l.country, c);

    // By operator
    const o = byOperatorMap.get(l.operator) || { count: 0, amount: 0 };
    o.count++; o.amount += l.cost;
    byOperatorMap.set(l.operator, o);

    // By hour
    const hour = new Date(l.createdAt).getHours().toString().padStart(2, '0') + ':00';
    byHourMap.set(hour, (byHourMap.get(hour) || 0) + 1);

    // By day
    const day = l.createdAt.slice(0, 10);
    const d = byDayMap.get(day) || { count: 0, amount: 0 };
    d.count++; d.amount += l.cost;
    byDayMap.set(day, d);
  });

  return {
    totalSms,
    deliveredSms,
    failedSms,
    pendingSms,
    deliveryRate: totalSms > 0 ? (deliveredSms / totalSms) * 100 : 0,
    totalCost,
    totalRevenue,
    profit: totalRevenue - totalCost,
    byCountry: Array.from(byCountryMap, ([country, data]) => ({ country, ...data })),
    byOperator: Array.from(byOperatorMap, ([operator, data]) => ({ operator, ...data })),
    byHour: Array.from(byHourMap, ([hour, count]) => ({ hour, count })).sort((a, b) => a.hour.localeCompare(b.hour)),
    byDay: Array.from(byDayMap, ([day, data]) => ({ day, ...data })).sort((a, b) => a.day.localeCompare(b.day)),
  };
}

// Email Templates
export function getEmailTemplates(): EmailTemplate[] { return getDb().emailTemplates; }
export function getEmailTemplate(type: EmailTemplate['type']): EmailTemplate | undefined {
  return getDb().emailTemplates.find(t => t.type === type && t.status === 'active');
}
export function updateEmailTemplate(id: string, data: Partial<EmailTemplate>): EmailTemplate | null {
  const db = getDb();
  const idx = db.emailTemplates.findIndex(t => t.id === id);
  if (idx === -1) return null;
  db.emailTemplates[idx] = { ...db.emailTemplates[idx], ...data };
  saveDb(db);
  return db.emailTemplates[idx];
}

// Department Emails
export function getDepartmentEmails(): DepartmentEmail[] { return getDb().departmentEmails; }
export function getDepartmentEmail(dept: DepartmentEmail['department']): DepartmentEmail | undefined {
  return getDb().departmentEmails.find(e => e.department === dept && e.status === 'active');
}
export function updateDepartmentEmail(id: string, data: Partial<DepartmentEmail>): DepartmentEmail | null {
  const db = getDb();
  const idx = db.departmentEmails.findIndex(e => e.id === id);
  if (idx === -1) return null;
  db.departmentEmails[idx] = { ...db.departmentEmails[idx], ...data };
  saveDb(db);
  return db.departmentEmails[idx];
}

// Notifications
export function getNotifications(filters?: { entityId?: string; type?: string; status?: string }): Notification[] {
  const db = getDb();
  let notifications = db.notifications;
  if (filters?.entityId) notifications = notifications.filter(n => n.entityId === filters.entityId);
  if (filters?.type) notifications = notifications.filter(n => n.type === filters.type);
  if (filters?.status) notifications = notifications.filter(n => n.status === filters.status);
  return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
export function addNotification(data: Omit<Notification, 'id' | 'createdAt'>): Notification {
  const db = getDb();
  const notification: Notification = { ...data, id: uuidv4(), createdAt: new Date().toISOString() };
  db.notifications.push(notification);
  saveDb(db);
  return notification;
}
export function updateNotification(id: string, data: Partial<Notification>): Notification | null {
  const db = getDb();
  const idx = db.notifications.findIndex(n => n.id === id);
  if (idx === -1) return null;
  db.notifications[idx] = { ...db.notifications[idx], ...data };
  saveDb(db);
  return db.notifications[idx];
}

// Get overdue invoices for reminders
export function getOverdueInvoices(): Invoice[] {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  return db.invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.dueDate < today);
}

// Check if it's Monday or Thursday for reminders
export function shouldSendReminder(): boolean {
  const day = new Date().getDay();
  return day === 1 || day === 4; // Monday = 1, Thursday = 4
}

// Dashboard stats
export function getDashboardStats() {
  const db = getDb();
  const clientBillings = db.billings.filter(b => b.entityType === 'client');
  const supplierBillings = db.billings.filter(b => b.entityType === 'supplier');
  const totalRevenue = clientBillings.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalCost = supplierBillings.reduce((sum, b) => sum + b.totalAmount, 0);
  const today = new Date().toISOString().slice(0, 10);
  const totalSmsToday = db.smsLogs.filter(l => l.createdAt.slice(0, 10) === today).length;
  const pendingPayments = db.payments.filter(p => p.status === 'pending').length;
  const overdueInvoices = getOverdueInvoices().length;
  const activeChannels = db.channels.filter(c => c.bindStatus === 'bound').length;
  const totalChannels = db.channels.length;

  return {
    totalSuppliers: db.suppliers.length,
    totalClients: db.clients.length,
    totalRevenue,
    totalCost,
    profit: totalRevenue - totalCost,
    totalSmsToday,
    pendingPayments,
    recentBillings: db.billings.slice(-10).reverse(),
    overdueInvoices,
    activeChannels,
    totalChannels,
    totalSmsLogs: db.smsLogs.length,
  };
}
