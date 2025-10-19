import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("Admin123!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@synvora.com" },
    update: {},
    create: {
      email: "admin@synvora.com",
      name: "Synvora Admin",
      password
    }
  });

  const now = new Date();
  const sampleOrders = [
    {
      orderNumber: "#1001",
      customerName: "Ava Johnson",
      status: "Open",
      financialStatus: "Paid",
      fulfillmentStatus: "Fulfilled",
      totalAmount: 189.96,
      currency: "USD",
      processedAt: now,
      shippingCity: "New York",
      shippingCountry: "United States",
      tags: "VIP,Express",
      originalAmount: 5800,
      notes: "Customer requested gift wrap.",
      lineItems: {
        create: [
          {
            productName: "Synvora Silk Blouse",
            quantity: 1,
            sku: "SV-BL-001",
            price: 129.99,
            total: 129.99
          },
          {
            productName: "Synvora Leather Belt",
            quantity: 1,
            sku: "SV-AC-009",
            price: 59.97,
            total: 59.97
          }
        ]
      }
    },
    {
      orderNumber: "#1002",
      customerName: "Noah Carter",
      status: "Open",
      financialStatus: "Pending",
      fulfillmentStatus: "Unfulfilled",
      totalAmount: 89.99,
      currency: "USD",
      processedAt: new Date(now.getFullYear(), now.getMonth() - 1, 12),
      shippingCity: "Austin",
      shippingCountry: "United States",
      tags: "Wholesale",
      originalAmount: 2800,
      notes: null,
      lineItems: {
        create: [
          {
            productName: "Synvora Denim Jacket",
            quantity: 1,
            sku: "SV-OT-404",
            price: 89.99,
            total: 89.99
          }
        ]
      }
    },
    {
      orderNumber: "#1003",
      customerName: "Isabella Rossi",
      status: "Closed",
      financialStatus: "Refunded",
      fulfillmentStatus: "Returned",
      totalAmount: 0,
      currency: "USD",
      processedAt: new Date(now.getFullYear(), now.getMonth() - 2, 5),
      shippingCity: "Milan",
      shippingCountry: "Italy",
      tags: "International",
      originalAmount: 0,
      notes: "Full refund issued due to damaged package.",
      lineItems: {
        create: [
          {
            productName: "Synvora Cashmere Scarf",
            quantity: 2,
            sku: "SV-AC-210",
            price: 99.5,
            total: 199
          }
        ]
      }
    }
  ];

  for (const order of sampleOrders) {
    await prisma.order.create({
      data: {
        ...order,
        tags: order.tags,
        createdById: admin.id
      }
    });
  }

  console.log("Seed complete. Admin user: admin@synvora.com / Admin123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
