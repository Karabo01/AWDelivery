import { PrismaClient, OrderStatus, PaymentStatus, ParcelSize } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const hashedPassword = await bcrypt.hash("password123", 12);

  // ─── Admin user ──────────────────────────────────────────────────────────────

  const admin = await prisma.user.upsert({
    where: { phone: "+27000000000" },
    update: { isAdmin: true },
    create: {
      phone: "+27000000000",
      name: "Admin",
      surname: "User",
      email: "admin@awdelivery.co.za",
      password: hashedPassword,
      isVerified: true,
      isAdmin: true,
    },
  });

  console.log(`Admin user: ${admin.id} (${admin.phone})`);

  // ─── Demo sender ─────────────────────────────────────────────────────────────

  const sender = await prisma.user.upsert({
    where: { phone: "+27812345678" },
    update: {},
    create: {
      phone: "+27812345678",
      name: "Demo",
      surname: "Sender",
      email: "demo@awdelivery.co.za",
      password: hashedPassword,
      isVerified: true,
      isAdmin: false,
    },
  });

  console.log(`Demo sender: ${sender.id} (${sender.phone})`);

  // ─── Sample order ────────────────────────────────────────────────────────────

  const existingOrder = await prisma.order.findUnique({
    where: { trackingNumber: "AW-X7K9M2" },
  });

  if (!existingOrder) {
    const order = await prisma.order.create({
      data: {
        trackingNumber: "AW-X7K9M2",
        senderId: sender.id,
        pickupAddress: {
          street: "5 Rivonia Road",
          suburb: "Sandton",
          city: "Johannesburg",
          postalCode: "2196",
          province: "Gauteng",
          coordinates: { lat: -26.1076, lng: 28.0567 },
          notes: "Reception desk",
        },
        deliveryAddress: {
          street: "2 Heuwel Avenue",
          suburb: "Centurion",
          city: "Pretoria",
          postalCode: "0157",
          province: "Gauteng",
          coordinates: { lat: -25.8603, lng: 28.1896 },
          notes: "Guard gate",
        },
        parcelDetails: {
          size: ParcelSize.MEDIUM,
          weightKg: 2.5,
          description: "Documents",
        },
        status: OrderStatus.IN_TRANSIT,
        quoteAmount: 8500,
        paymentStatus: PaymentStatus.PAID,
        receiverPhone: "+27823456789",
        timeline: {
          create: [
            {
              status: OrderStatus.PENDING_PAYMENT,
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18),
            },
            {
              status: OrderStatus.CONFIRMED,
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18 + 1000 * 60 * 2),
              note: "Payment confirmed via PayFast",
            },
            {
              status: OrderStatus.PICKED_UP,
              timestamp: new Date(Date.now() - 1000 * 60 * 60 * 18 + 1000 * 60 * 55),
              note: "Collected from reception",
            },
            {
              status: OrderStatus.IN_TRANSIT,
              timestamp: new Date(Date.now() - 1000 * 60 * 20),
              note: "On route to receiver",
            },
          ],
        },
      },
    });

    console.log(`Sample order: ${order.trackingNumber} (${order.id})`);
  } else {
    console.log(`Sample order already exists: ${existingOrder.trackingNumber}`);
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
