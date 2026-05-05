export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'active' | 'inactive';
  creditLimit: number;
  currentBalance: number;
  defaultRate: number;
  ratesEmail: string;
  billingEmail: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  status: 'active' | 'inactive';
  creditLimit: number;
  currentBalance: number;
  defaultRate: number;
  ratesEmail: string;
  billingEmail: string;
  createdAt: string;
}

export interface SupplierRate {
  id: string;
  supplierId: string;
  country: string;
  countryCode: string;
  mcc: string;
  mnc: string;
  operator: string;
  prefix: string;
  rate: number;
  smsType: 'transactional' | 'promotional' | 'otp';
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface ClientRate {
  id: string;
  clientId: string;
  country: string;
  countryCode: string;
  mcc: string;
  mnc: string;
  operator: string;
  prefix: string;
  rate: number;
  smsType: 'transactional' | 'promotional' | 'otp';
  status: 'active' | 'inactive';
  createdAt: string;
}

export type BillingSignType = 'normal' | 'success_submit' | 'deliver';

export interface SmsBilling {
  id: string;
  entityId: string;
  entityType: 'supplier' | 'client';
  billingSign: BillingSignType;
  smsCount: number;
  rate: number;
  totalAmount: number;
  country: string;
  operator: string;
  smsType: 'transactional' | 'promotional' | 'otp';
  status: 'pending' | 'submitted' | 'delivered' | 'failed';
  forceDlr: boolean;
  forceDlrTimeout: number;
  channelId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  entityId: string;
  entityType: 'supplier' | 'client';
  invoiceId?: string;
  amount: number;
  paymentMethod: 'bank_transfer' | 'cash' | 'cheque' | 'online' | 'crypto';
  reference: string;
  notes: string;
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
}

export interface ForceDlrConfig {
  id: string;
  entityId: string;
  entityType: 'supplier' | 'client';
  enabled: boolean;
  timeoutSeconds: number;
  dlrStatus: 'DELIVRD' | 'UNDELIV' | 'EXPIRED' | 'REJECTD';
  createdAt: string;
}

export interface User {
  username: string;
  role: 'admin' | 'manager' | 'viewer';
}

// ============ NEW TYPES ============

export interface SmsLog {
  id: string;
  messageId: string;
  channelId: string;
  entityId: string;
  entityType: 'supplier' | 'client';
  sender: string;
  recipient: string;
  message: string;
  messageLength: number;
  segments: number;
  country: string;
  countryCode: string;
  operator: string;
  mcc: string;
  mnc: string;
  rate: number;
  cost: number;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'expired';
  dlrStatus?: string;
  dlrTime?: string;
  submitTime: string;
  createdAt: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'smpp' | 'http';
  entityId: string;
  entityType: 'supplier' | 'client';
  // SMPP settings
  host: string;
  port: number;
  systemId: string;
  password: string;
  systemType: string;
  bindType: 'transmitter' | 'receiver' | 'transceiver';
  // HTTP settings
  httpUrl?: string;
  httpMethod?: 'GET' | 'POST';
  httpHeaders?: string;
  // Status
  status: 'active' | 'inactive' | 'binding' | 'bound' | 'disconnected' | 'error';
  bindStatus: 'unbound' | 'binding' | 'bound' | 'unbinding';
  lastConnected?: string;
  lastError?: string;
  tps: number; // transactions per second
  sessions: number;
  maxSessions: number;
  createdAt: string;
}

export interface CountryMccMnc {
  id: string;
  country: string;
  countryCode: string; // ISO 2-letter
  dialCode: string; // +1, +44, etc
  mcc: string;
  mnc: string;
  operator: string;
  brand: string;
  prefix: string;
  status: 'active' | 'inactive';
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  entityId: string;
  entityType: 'supplier' | 'client';
  periodType: 'custom' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  totalSms: number;
  totalAmount: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: string;
  paidDate?: string;
  paidAmount?: number;
  notes: string;
  items: InvoiceItem[];
  remindersSent: number;
  lastReminderDate?: string;
  sentAt?: string;
  createdAt: string;
}

export interface InvoiceItem {
  country: string;
  operator: string;
  smsType: string;
  smsCount: number;
  rate: number;
  amount: number;
}

export interface Report {
  id: string;
  name: string;
  type: 'sms' | 'billing' | 'revenue' | 'channel';
  periodType: 'custom' | 'hourly' | 'daily' | 'weekly' | 'monthly';
  periodStart: string;
  periodEnd: string;
  entityId?: string;
  entityType?: 'supplier' | 'client';
  channelId?: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  data?: ReportData;
  createdAt: string;
}

export interface ReportData {
  totalSms: number;
  deliveredSms: number;
  failedSms: number;
  pendingSms: number;
  deliveryRate: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  byCountry: { country: string; count: number; amount: number }[];
  byOperator: { operator: string; count: number; amount: number }[];
  byHour: { hour: string; count: number }[];
  byDay: { day: string; count: number; amount: number }[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  type: 'rate_update' | 'invoice' | 'payment_reminder' | 'payment_received';
  subject: string;
  body: string;
  department: 'rates' | 'billing' | 'accounts';
  departmentEmail: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface Notification {
  id: string;
  entityId: string;
  entityType: 'supplier' | 'client';
  invoiceId?: string;
  type: 'payment_reminder' | 'payment_received' | 'rate_update' | 'invoice_sent';
  channel: 'email' | 'sms' | 'both';
  status: 'pending' | 'sent' | 'failed';
  scheduledFor?: string;
  sentAt?: string;
  message: string;
  createdAt: string;
}

export interface DepartmentEmail {
  id: string;
  department: 'rates' | 'billing' | 'accounts' | 'support';
  email: string;
  name: string;
  status: 'active' | 'inactive';
}
