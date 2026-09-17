import type {
  User,
  Customer,
  Product,
  Inventory,
  Enquiry,
  Quotation,
  SalesOrder,
  EnquiryStatus,
  QuotationStatus,
} from '../types/erp';

const RAW_API_URL = import.meta.env.VITE_API_URL || '/api';
const API_BASE = RAW_API_URL.endsWith('/') ? RAW_API_URL.slice(0, -1) : RAW_API_URL;

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(message: string, code = 'API_ERROR', status = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('erp_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg =
      json?.error?.message ||
      json?.message ||
      `Request failed with HTTP ${response.status}: ${response.statusText}`;
    const errorCode = json?.error?.code || 'UNKNOWN_ERROR';
    throw new ApiError(errorMsg, errorCode, response.status);
  }

  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Auth
  login: async (email: string, password: string): Promise<{ user: User; token: string }> => {
    const res = await request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const user = (res.user as any)?.user || res.user;
    return { ...res, user };
  },

  getCurrentUser: async (): Promise<User> => {
    const res = await request<{ user: User } | User>('/auth/me');
    if (res && typeof res === 'object') {
      if ('user' in res && (res as { user: User }).user) {
        return (res as { user: User }).user;
      }
    }
    return res as User;
  },

  // Customers
  getCustomers: () => request<Customer[]>('/customers'),
  createCustomer: (data: Partial<Customer>) =>
    request<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Products & Inventory
  getProducts: () => request<Product[]>('/products'),
  getInventory: () => request<Inventory[]>('/inventory'),
  updateInventory: (productId: string, data: { physicalQuantity?: number; damagedQuantity?: number; addPhysicalQuantity?: number; addDamagedQuantity?: number }) =>
    request<Inventory>(`/inventory/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Enquiries
  getEnquiries: () => request<Enquiry[]>('/enquiries'),
  getEnquiryById: (id: string) => request<Enquiry>(`/enquiries/${id}`),
  createEnquiry: (data: { customerId: string; requiredDate: string; notes?: string; items: { productId: string; quantity: number }[] }) =>
    request<Enquiry>('/enquiries', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateEnquiryStatus: (id: string, status: EnquiryStatus) =>
    request<Enquiry>(`/enquiries/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Quotations
  getQuotations: () => request<Quotation[]>('/quotations'),
  getQuotationById: (id: string) => request<Quotation>(`/quotations/${id}`),
  createQuotation: (data: {
    enquiryId: string;
    customerId: string;
    validUntil: string;
    items: { productId: string; quantity: number; unitPrice: number; discountPct: number; gstPct: number }[];
  }) =>
    request<Quotation>('/quotations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateQuotationStatus: (id: string, status: QuotationStatus) =>
    request<Quotation>(`/quotations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  convertQuotationToSalesOrder: (id: string) =>
    request<SalesOrder>(`/quotations/${id}/convert`, {
      method: 'POST',
    }),

  // Sales Orders
  getSalesOrders: () => request<SalesOrder[]>('/sales-orders'),
  getSalesOrderById: (id: string) => request<SalesOrder>(`/sales-orders/${id}`),
  confirmSalesOrder: (id: string) =>
    request<SalesOrder>(`/sales-orders/${id}/confirm`, {
      method: 'POST',
    }),
  cancelSalesOrder: (id: string, reason?: string) =>
    request<SalesOrder>(`/sales-orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  dispatchSalesOrder: (id: string, data: { vehicleNumber: string; driverName: string; notes?: string }) =>
    request<{ salesOrder: SalesOrder; dispatch: any }>(`/sales-orders/${id}/dispatch`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
