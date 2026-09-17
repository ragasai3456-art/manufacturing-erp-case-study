export type Role = 'ADMIN' | 'SALES';

export type EnquiryStatus = 'NEW' | 'QUOTED' | 'WON' | 'LOST';
export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
export type SalesOrderStatus = 'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface Customer {
  id: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  city: string;
  createdAt: string;
}

export interface Inventory {
  id: string;
  productId: string;
  physicalQuantity: number;
  reservedQuantity: number;
  damagedQuantity: number;
  availableQuantity: number;
  updatedAt: string;
}

export interface Product {
  id: string;
  productCode: string;
  productName: string;
  category: string;
  unit: string;
  basePrice: number | string;
  inventory?: Inventory | null;
}

export interface EnquiryItem {
  id?: string;
  productId: string;
  quantity: number;
  product?: Product;
}

export interface Enquiry {
  id: string;
  enquiryNumber: string;
  customerId: string;
  customer: Customer;
  enquiryDate: string;
  requiredDate: string;
  notes?: string | null;
  status: EnquiryStatus;
  items: EnquiryItem[];
  createdAt: string;
}

export interface QuotationItem {
  id?: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  gstPct: number;
  lineAmount: number;
  product?: Product;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  enquiryId: string;
  customerId: string;
  customer: Customer;
  enquiry?: Enquiry;
  validUntil: string;
  subtotal: number;
  discountAmount: number;
  gstAmount: number;
  grandTotal: number;
  status: QuotationStatus;
  items: QuotationItem[];
  salesOrder?: {
    id: string;
    orderNumber: string;
    status: SalesOrderStatus;
  } | null;
  createdAt: string;
}

export interface SalesOrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  lineAmount: number;
  product?: Product;
}

export interface DispatchItem {
  id: string;
  productId: string;
  quantity: number;
  product?: Product;
}

export interface Dispatch {
  id: string;
  dispatchNumber: string;
  salesOrderId: string;
  dispatchDate: string;
  vehicleNumber: string;
  driverName: string;
  notes?: string | null;
  items: DispatchItem[];
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: Customer;
  quotationId: string;
  quotation?: Quotation;
  orderDate: string;
  totalAmount: number;
  status: SalesOrderStatus;
  items: SalesOrderItem[];
  confirmedBy?: { id: string; name: string; email: string; role: Role } | null;
  cancelledBy?: { id: string; name: string; email: string; role: Role } | null;
  dispatch?: Dispatch | null;
  createdAt: string;
}
