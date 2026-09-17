import bcrypt from 'bcrypt';

export interface InMemoryState {
  users: any[];
  customers: any[];
  products: any[];
  inventories: any[];
  enquiries: any[];
  enquiryItems: any[];
  quotations: any[];
  quotationItems: any[];
  salesOrders: any[];
  salesOrderItems: any[];
  dispatches: any[];
  dispatchItems: any[];
}

export const createInitialState = (): InMemoryState => {
  const adminPasswordHash = bcrypt.hashSync('Admin@123', 10);
  const salesPasswordHash = bcrypt.hashSync('Sales@123', 10);

  const adminUser = {
    id: 'usr-admin-001',
    email: 'admin@example.com',
    password: adminPasswordHash,
    name: 'Chief Operations Administrator',
    role: 'ADMIN',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const salesUser = {
    id: 'usr-sales-001',
    email: 'sales@example.com',
    password: salesPasswordHash,
    name: 'David Miller',
    role: 'SALES',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };

  const customers = [
    {
      id: 'cust-001',
      companyName: 'Apex Industrial Machinery Ltd',
      contactPerson: 'Rajesh Sharma',
      mobile: '+91 98201 12345',
      email: 'rajesh.sharma@apexmachinery.com',
      city: 'Mumbai',
      createdAt: new Date('2026-01-05T00:00:00Z'),
      updatedAt: new Date('2026-01-05T00:00:00Z'),
    },
    {
      id: 'cust-002',
      companyName: 'Bharat Heavy Power Engineering',
      contactPerson: 'Ananya Deshmukh',
      mobile: '+91 98450 67890',
      email: 'a.deshmukh@bharatheavy.in',
      city: 'Bengaluru',
      createdAt: new Date('2026-01-08T00:00:00Z'),
      updatedAt: new Date('2026-01-08T00:00:00Z'),
    },
    {
      id: 'cust-003',
      companyName: 'Precision Turbines & Valves Corp',
      contactPerson: 'Karan Patel',
      mobile: '+91 98790 54321',
      email: 'kpatel@precisionturbines.com',
      city: 'Pune',
      createdAt: new Date('2026-01-10T00:00:00Z'),
      updatedAt: new Date('2026-01-10T00:00:00Z'),
    },
  ];

  const products = [
    {
      id: 'prod-001',
      productCode: 'BRG-6205',
      productName: 'Deep Groove Ball Bearing 6205-2RS',
      category: 'Bearings',
      unit: 'PCS',
      basePrice: 1250.0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'prod-002',
      productCode: 'PMP-HYD-50',
      productName: 'Hydraulic Gear Pump 50 L/min',
      category: 'Hydraulics',
      unit: 'SET',
      basePrice: 14500.0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'prod-003',
      productCode: 'MTR-AC-3HP',
      productName: 'High-Torque 3-Phase AC Induction Motor 3HP',
      category: 'Electrical Motors',
      unit: 'PCS',
      basePrice: 22000.0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'prod-004',
      productCode: 'BLT-CNV-HD',
      productName: 'Heavy-Duty Reinforced Rubber Conveyor Belt (100m Roll)',
      category: 'Transmission',
      unit: 'ROLL',
      basePrice: 38000.0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'prod-005',
      productCode: 'CPL-STL-FLEX',
      productName: 'Cast Steel Flexible Jaw Shaft Coupling',
      category: 'Transmission',
      unit: 'SET',
      basePrice: 4200.0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'prod-006',
      productCode: 'VLV-PRV-SS',
      productName: 'Stainless Steel 316 High-Pressure Relief Valve',
      category: 'Valves',
      unit: 'PCS',
      basePrice: 8500.0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
  ];

  const inventories = [
    {
      id: 'inv-001',
      productId: 'prod-001',
      physicalQuantity: 100,
      reservedQuantity: 20,
      damagedQuantity: 0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'inv-002',
      productId: 'prod-002',
      physicalQuantity: 50,
      reservedQuantity: 10,
      damagedQuantity: 0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'inv-003',
      productId: 'prod-003',
      physicalQuantity: 75,
      reservedQuantity: 15,
      damagedQuantity: 5,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'inv-004',
      productId: 'prod-004',
      physicalQuantity: 30,
      reservedQuantity: 0,
      damagedQuantity: 0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'inv-005',
      productId: 'prod-005',
      physicalQuantity: 120,
      reservedQuantity: 25,
      damagedQuantity: 5,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
    {
      id: 'inv-006',
      productId: 'prod-006',
      physicalQuantity: 60,
      reservedQuantity: 0,
      damagedQuantity: 0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    },
  ];

  const enquiries = [
    {
      id: 'enq-001',
      enquiryNumber: 'ENQ-2026-0001',
      customerId: 'cust-001',
      enquiryDate: new Date('2026-02-01T00:00:00Z'),
      requiredDate: new Date('2026-03-01T00:00:00Z'),
      notes: 'Urgent quarterly overhaul requirement. Standard industrial packaging.',
      status: 'NEW',
      createdById: 'usr-sales-001',
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    },
    {
      id: 'enq-002',
      enquiryNumber: 'ENQ-2026-0002',
      customerId: 'cust-002',
      enquiryDate: new Date('2026-02-05T00:00:00Z'),
      requiredDate: new Date('2026-03-15T00:00:00Z'),
      notes: 'Heavy duty application. Include manufacturer test certificates.',
      status: 'QUOTED',
      createdById: 'usr-sales-001',
      createdAt: new Date('2026-02-05T00:00:00Z'),
      updatedAt: new Date('2026-02-05T00:00:00Z'),
    },
  ];

  const enquiryItems = [
    {
      id: 'enq-it-001',
      enquiryId: 'enq-001',
      productId: 'prod-001',
      quantity: 10,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    },
    {
      id: 'enq-it-002',
      enquiryId: 'enq-001',
      productId: 'prod-002',
      quantity: 2,
      createdAt: new Date('2026-02-01T00:00:00Z'),
      updatedAt: new Date('2026-02-01T00:00:00Z'),
    },
    {
      id: 'enq-it-003',
      enquiryId: 'enq-002',
      productId: 'prod-003',
      quantity: 4,
      createdAt: new Date('2026-02-05T00:00:00Z'),
      updatedAt: new Date('2026-02-05T00:00:00Z'),
    },
    {
      id: 'enq-it-004',
      enquiryId: 'enq-002',
      productId: 'prod-004',
      quantity: 1,
      createdAt: new Date('2026-02-05T00:00:00Z'),
      updatedAt: new Date('2026-02-05T00:00:00Z'),
    },
  ];

  // Quotation 1: DRAFT (For demo of DRAFT -> SENT -> ACCEPTED)
  const quotations = [
    {
      id: 'quo-001',
      quotationNumber: 'QUO-2026-0001',
      enquiryId: 'enq-001',
      customerId: 'cust-001',
      validUntil: new Date('2026-04-01T00:00:00Z'),
      subtotal: 41500.0,
      discountAmount: 2075.0,
      gstAmount: 7096.5,
      grandTotal: 46521.5,
      status: 'DRAFT',
      createdById: 'usr-sales-001',
      createdAt: new Date('2026-02-02T00:00:00Z'),
      updatedAt: new Date('2026-02-02T00:00:00Z'),
    },
    // Quotation 2: ACCEPTED (For immediate demo of Convert to Sales Order)
    {
      id: 'quo-002',
      quotationNumber: 'QUO-2026-0002',
      enquiryId: 'enq-002',
      customerId: 'cust-002',
      validUntil: new Date('2026-04-15T00:00:00Z'),
      subtotal: 126000.0,
      discountAmount: 6300.0,
      gstAmount: 21546.0,
      grandTotal: 141246.0,
      status: 'ACCEPTED',
      createdById: 'usr-sales-001',
      createdAt: new Date('2026-02-06T00:00:00Z'),
      updatedAt: new Date('2026-02-06T00:00:00Z'),
    },
  ];

  const quotationItems = [
    {
      id: 'quo-it-001',
      quotationId: 'quo-001',
      productId: 'prod-001',
      quantity: 10,
      unitPrice: 1250.0,
      discountPct: 5.0,
      gstPct: 18.0,
      lineAmount: 13998.75,
      createdAt: new Date('2026-02-02T00:00:00Z'),
      updatedAt: new Date('2026-02-02T00:00:00Z'),
    },
    {
      id: 'quo-it-002',
      quotationId: 'quo-001',
      productId: 'prod-002',
      quantity: 2,
      unitPrice: 14500.0,
      discountPct: 5.0,
      gstPct: 18.0,
      lineAmount: 32522.75,
      createdAt: new Date('2026-02-02T00:00:00Z'),
      updatedAt: new Date('2026-02-02T00:00:00Z'),
    },
    {
      id: 'quo-it-003',
      quotationId: 'quo-002',
      productId: 'prod-003',
      quantity: 4,
      unitPrice: 22000.0,
      discountPct: 5.0,
      gstPct: 18.0,
      lineAmount: 99176.0,
      createdAt: new Date('2026-02-06T00:00:00Z'),
      updatedAt: new Date('2026-02-06T00:00:00Z'),
    },
    {
      id: 'quo-it-004',
      quotationId: 'quo-002',
      productId: 'prod-004',
      quantity: 1,
      unitPrice: 38000.0,
      discountPct: 5.0,
      gstPct: 18.0,
      lineAmount: 42070.0,
      createdAt: new Date('2026-02-06T00:00:00Z'),
      updatedAt: new Date('2026-02-06T00:00:00Z'),
    },
  ];

  return {
    users: [adminUser, salesUser],
    customers,
    products,
    inventories,
    enquiries,
    enquiryItems,
    quotations,
    quotationItems,
    salesOrders: [],
    salesOrderItems: [],
    dispatches: [],
    dispatchItems: [],
  };
};

export const inMemoryStore = createInitialState();
