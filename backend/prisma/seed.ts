import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Manufacturing ERP Database Seeding...');

  // 1. Users
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const salesPassword = await bcrypt.hash('Sales@123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      name: 'Chief Operations Administrator',
      role: 'ADMIN',
    },
  });

  const sales = await prisma.user.upsert({
    where: { email: 'sales@example.com' },
    update: {},
    create: {
      email: 'sales@example.com',
      password: salesPassword,
      name: 'David Miller',
      role: 'SALES',
    },
  });

  console.log('✅ Users seeded: admin@example.com, sales@example.com');

  // 2. Customers
  const customer1 = await prisma.customer.create({
    data: {
      companyName: 'Apex Industrial Machinery Ltd',
      contactPerson: 'Rajesh Sharma',
      mobile: '+91 98201 12345',
      email: 'rajesh.sharma@apexmachinery.com',
      city: 'Mumbai',
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      companyName: 'Bharat Heavy Power Engineering',
      contactPerson: 'Ananya Deshmukh',
      mobile: '+91 98450 67890',
      email: 'a.deshmukh@bharatheavy.in',
      city: 'Bengaluru',
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      companyName: 'Precision Turbines & Valves Corp',
      contactPerson: 'Karan Patel',
      mobile: '+91 98790 54321',
      email: 'kpatel@precisionturbines.com',
      city: 'Pune',
    },
  });

  console.log('✅ Customers seeded: 3 industrial clients');

  // 3. 6 Industrial Products & Inventories
  const productData = [
    {
      code: 'BRG-6205',
      name: 'Deep Groove Ball Bearing 6205-2RS',
      category: 'Bearings',
      unit: 'PCS',
      price: 1250.0,
      physical: 100,
      reserved: 20,
      damaged: 0,
    },
    {
      code: 'PMP-HYD-50',
      name: 'Hydraulic Gear Pump 50 L/min',
      category: 'Hydraulics',
      unit: 'SET',
      price: 14500.0,
      physical: 50,
      reserved: 10,
      damaged: 0,
    },
    {
      code: 'MTR-AC-3HP',
      name: 'High-Torque 3-Phase AC Induction Motor 3HP',
      category: 'Electrical Motors',
      unit: 'PCS',
      price: 22000.0,
      physical: 75,
      reserved: 15,
      damaged: 5,
    },
    {
      code: 'BLT-CNV-HD',
      name: 'Heavy-Duty Reinforced Rubber Conveyor Belt (100m Roll)',
      category: 'Transmission',
      unit: 'ROLL',
      price: 38000.0,
      physical: 30,
      reserved: 0,
      damaged: 0,
    },
    {
      code: 'CPL-STL-FLEX',
      name: 'Cast Steel Flexible Jaw Shaft Coupling',
      category: 'Transmission',
      unit: 'SET',
      price: 4200.0,
      physical: 120,
      reserved: 25,
      damaged: 5,
    },
    {
      code: 'VLV-PRV-SS',
      name: 'Stainless Steel 316 High-Pressure Relief Valve',
      category: 'Valves',
      unit: 'PCS',
      price: 8500.0,
      physical: 60,
      reserved: 0,
      damaged: 0,
    },
  ];

  const createdProducts: any[] = [];

  for (const p of productData) {
    const prod = await prisma.product.upsert({
      where: { productCode: p.code },
      update: {},
      create: {
        productCode: p.code,
        productName: p.name,
        category: p.category,
        unit: p.unit,
        basePrice: p.price,
        inventory: {
          create: {
            physicalQuantity: p.physical,
            reservedQuantity: p.reserved,
            damagedQuantity: p.damaged,
          },
        },
      },
      include: { inventory: true },
    });
    createdProducts.push(prod);
  }

  console.log(`✅ Products & Inventories seeded: ${createdProducts.length} items`);

  // 4. Enquiries
  const enquiry1 = await prisma.enquiry.create({
    data: {
      enquiryNumber: 'ENQ-2026-0001',
      customerId: customer1.id,
      requiredDate: new Date(Date.now() + 14 * 86400000),
      notes: 'Urgent quarterly overhaul requirement. Standard industrial packaging.',
      status: 'NEW',
      createdById: sales.id,
      items: {
        create: [
          { productId: createdProducts[0].id, quantity: 10 },
          { productId: createdProducts[1].id, quantity: 2 },
        ],
      },
    },
  });

  const enquiry2 = await prisma.enquiry.create({
    data: {
      enquiryNumber: 'ENQ-2026-0002',
      customerId: customer2.id,
      requiredDate: new Date(Date.now() + 21 * 86400000),
      notes: 'Heavy duty application. Include manufacturer test certificates.',
      status: 'QUOTED',
      createdById: sales.id,
      items: {
        create: [
          { productId: createdProducts[2].id, quantity: 4 },
          { productId: createdProducts[3].id, quantity: 1 },
        ],
      },
    },
  });

  console.log('✅ Enquiries seeded: 2 enquiries with normalized line items');

  // 5. Quotations
  // Quotation 1: DRAFT (for demo of DRAFT -> SENT -> ACCEPTED)
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QUO-2026-0001',
      enquiryId: enquiry1.id,
      customerId: customer1.id,
      validUntil: new Date(Date.now() + 30 * 86400000),
      subtotal: 41500.0,
      discountAmount: 2075.0,
      gstAmount: 7096.5,
      grandTotal: 46521.5,
      status: 'DRAFT',
      createdById: sales.id,
      items: {
        create: [
          {
            productId: createdProducts[0].id,
            quantity: 10,
            unitPrice: 1250.0,
            discountPct: 5.0,
            gstPct: 18.0,
            lineAmount: 13998.75,
          },
          {
            productId: createdProducts[1].id,
            quantity: 2,
            unitPrice: 14500.0,
            discountPct: 5.0,
            gstPct: 18.0,
            lineAmount: 32522.75,
          },
        ],
      },
    },
  });

  // Quotation 2: ACCEPTED (for immediate demo of Convert to Sales Order)
  await prisma.quotation.create({
    data: {
      quotationNumber: 'QUO-2026-0002',
      enquiryId: enquiry2.id,
      customerId: customer2.id,
      validUntil: new Date(Date.now() + 30 * 86400000),
      subtotal: 126000.0,
      discountAmount: 6300.0,
      gstAmount: 21546.0,
      grandTotal: 141246.0,
      status: 'ACCEPTED',
      createdById: sales.id,
      items: {
        create: [
          {
            productId: createdProducts[2].id,
            quantity: 4,
            unitPrice: 22000.0,
            discountPct: 5.0,
            gstPct: 18.0,
            lineAmount: 99176.0,
          },
          {
            productId: createdProducts[3].id,
            quantity: 1,
            unitPrice: 38000.0,
            discountPct: 5.0,
            gstPct: 18.0,
            lineAmount: 42070.0,
          },
        ],
      },
    },
  });

  console.log('✅ Quotations seeded: 1 DRAFT and 1 ACCEPTED quotation ready for demo');
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
