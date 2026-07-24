import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0 && process.env.SEED_ON_BOOT === "true") {
    console.log("Seed omitido: la base ya tiene usuarios (SEED_ON_BOOT).");
    return;
  }

  await prisma.notification.deleteMany();
  await prisma.inquiryMessage.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.galleryImage.deleteMany();
  await prisma.review.deleteMany();
  await prisma.commission.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.escrow.deleteMany();
  await prisma.job.deleteMany();
  await prisma.walletDeposit.deleteMany();
  await prisma.userPaymentMethod.deleteMany();
  await prisma.user.deleteMany();
  await prisma.platformSettings.deleteMany();

  await prisma.platformSettings.create({
    data: { id: "default" },
  });

  const passwordHash = await bcrypt.hash("solobbs123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@solobbs.com",
      passwordHash,
      name: "Admin SoloBBs",
      role: "ADMIN",
      referralCode: "ADMIN001",
      isVerified: true,
      city: "Bogotá",
    },
  });

  const lucia = await prisma.user.create({
    data: {
      email: "lucia@solobbs.com",
      passwordHash,
      name: "Lucía Vargas",
      role: "MODEL",
      referralCode: "LUCIA7X",
      city: "Medellín",
      bio: "Experiencias premium con total discreción.",
      isVerified: true,
      galleryPublic: true,
      rateFrom: 180,
      walletBalance: 4200,
      totalEarned: 12800000,
      totalJobs: 47,
      rating: 4.9,
      avatarUrl: "/avatars/lucia.svg",
    },
  });

  const camila = await prisma.user.create({
    data: {
      email: "camila@solobbs.com",
      passwordHash,
      name: "Camila Ríos",
      role: "MODEL",
      referralCode: "CAMI9K",
      referredById: lucia.id,
      city: "Bogotá",
      bio: "Citas elegantes y agenda flexible.",
      isVerified: true,
      galleryPublic: true,
      rateFrom: 150,
      walletBalance: 1800,
      totalEarned: 4200000,
      totalJobs: 18,
      rating: 4.8,
      avatarUrl: "/avatars/camila.svg",
    },
  });

  const valentina = await prisma.user.create({
    data: {
      email: "valentina@solobbs.com",
      passwordHash,
      name: "Valentina Mora",
      role: "MODEL",
      referralCode: "VALE3M",
      referredById: camila.id,
      city: "Cali",
      isVerified: true,
      galleryPublic: true,
      rateFrom: 120,
      walletBalance: 640,
      totalEarned: 1100000,
      totalJobs: 6,
      rating: 5,
      avatarUrl: "/avatars/valentina.svg",
    },
  });

  const sofia = await prisma.user.create({
    data: {
      email: "sofia@solobbs.com",
      passwordHash,
      name: "Sofía Delgado",
      role: "MODEL",
      referralCode: "SOFIA88",
      referredById: lucia.id,
      city: "Medellín",
      phone: "+57 300 555 0188",
      bio: "Compañía premium para cenas, viajes cortos y eventos. Puntual, discreta y muy clara con los acuerdos. Agenda en El Poblado y Laureles. Prefiero escrow SoloBBs para tranquilidad de ambos.",
      isVerified: true,
      galleryPublic: true,
      rateFrom: 200,
      walletBalance: 3100,
      totalEarned: 9600000,
      totalJobs: 31,
      rating: 4.95,
      avatarUrl: "/gallery/sofia/01.jpg",
    },
  });

  const client = await prisma.user.create({
    data: {
      email: "cliente@solobbs.com",
      passwordHash,
      name: "Andrés Client",
      role: "CLIENT",
      referralCode: "CLIENT1",
      city: "Bogotá",
      walletBalance: 500,
    },
  });

  const client2 = await prisma.user.create({
    data: {
      email: "marco@solobbs.com",
      passwordHash,
      name: "Marco R.",
      role: "CLIENT",
      referralCode: "MARCO2",
      city: "Medellín",
    },
  });

  const job1 = await prisma.job.create({
    data: {
      title: "Cena privada · Zona T",
      description: "Encuentro de 3 horas con depósito en garantía.",
      amount: 180,
      city: "Bogotá",
      status: "COMPLETED",
      scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
      modelId: camila.id,
      clientId: client.id,
    },
  });

  await prisma.escrow.create({
    data: {
      amount: 180,
      fee: 14.4,
      status: "RELEASED",
      paymentMethod: "CARD",
      cardLast4: "4242",
      jobId: job1.id,
      modelId: camila.id,
      clientId: client.id,
      fundedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
      releasedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    },
  });

  const job2 = await prisma.job.create({
    data: {
      title: "Escort hotel · El Poblado",
      description: "Depósito crypto USDT en escrow P2P.",
      amount: 220,
      city: "Medellín",
      status: "ACTIVE",
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 6),
      modelId: lucia.id,
      clientId: client.id,
    },
  });

  await prisma.escrow.create({
    data: {
      amount: 220,
      status: "FUNDED",
      paymentMethod: "CRYPTO",
      cryptoTxHash: "0xsolobbsdemotxid0001",
      jobId: job2.id,
      modelId: lucia.id,
      clientId: client.id,
      fundedAt: new Date(),
      notes: "USDT TRC20 confirmado",
    },
  });

  await prisma.user.update({
    where: { id: lucia.id },
    data: { escrowHeld: { increment: 220 } },
  });

  const job3 = await prisma.job.create({
    data: {
      title: "After office · Parque 93",
      amount: 150,
      city: "Bogotá",
      status: "SCHEDULED",
      scheduledAt: new Date(Date.now() + 1000 * 60 * 60 * 48),
      modelId: camila.id,
      clientId: client.id,
    },
  });

  await prisma.escrow.create({
    data: {
      amount: 150,
      status: "PENDING",
      paymentMethod: "CARD",
      jobId: job3.id,
      modelId: camila.id,
      clientId: client.id,
    },
  });

  await prisma.payment.createMany({
    data: [
      {
        amount: 180,
        method: "CARD",
        status: "COMPLETED",
        cardBrand: "Visa",
        cardLast4: "4242",
        userId: client.id,
      },
      {
        amount: 220,
        method: "CRYPTO",
        status: "COMPLETED",
        cryptoNetwork: "TRC20",
        cryptoAddress: "TSoloBBsDemoUSDT000000000000000000",
        externalId: "0xsolobbsdemotxid0001",
        userId: client.id,
      },
    ],
  });

  await prisma.commission.createMany({
    data: [
      {
        amount: 16.56,
        level: 1,
        percent: 10,
        description: "Nivel 1 · referido de Camila Ríos",
        earnerId: lucia.id,
        sourceId: camila.id,
      },
      {
        amount: 2.8,
        level: 2,
        percent: 5,
        description: "Nivel 2 · red de Valentina Mora",
        earnerId: lucia.id,
        sourceId: valentina.id,
      },
      {
        amount: 5.6,
        level: 1,
        percent: 10,
        description: "Nivel 1 · referido de Valentina Mora",
        earnerId: camila.id,
        sourceId: valentina.id,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: lucia.id,
        title: "Nuevo depósito en escrow",
        body: "Un cliente fondeó 220 USDT con USDT.",
      },
      {
        userId: camila.id,
        title: "Comisión de red",
        body: "Valentina generó comisión nivel 1 para ti.",
      },
      {
        userId: admin.id,
        title: "Plataforma lista",
        body: "SoloBBs seed cargado correctamente.",
      },
    ],
  });

  await prisma.review.createMany({
    data: [
      {
        jobId: job1.id,
        authorId: client.id,
        targetId: camila.id,
        rating: 5,
        comment: "Excelente presencia y puntualidad. Muy profesional.",
      },
      {
        jobId: job1.id,
        authorId: camila.id,
        targetId: client.id,
        rating: 5,
        comment: "Cliente respetuoso y claro con los acuerdos.",
      },
    ],
  });

  await prisma.user.update({ where: { id: camila.id }, data: { rating: 5 } });
  await prisma.user.update({ where: { id: client.id }, data: { rating: 5 } });

  const sofiaJob = await prisma.job.create({
    data: {
      title: "Cena + after · Provenza",
      description: "Encuentro de 4 horas. Cliente puntual y respetuoso.",
      amount: 200,
      city: "Medellín",
      status: "COMPLETED",
      scheduledAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
      completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9),
      modelId: sofia.id,
      clientId: client2.id,
    },
  });

  await prisma.escrow.create({
    data: {
      amount: 200,
      fee: 16,
      status: "RELEASED",
      paymentMethod: "CARD",
      cardLast4: "1888",
      jobId: sofiaJob.id,
      modelId: sofia.id,
      clientId: client2.id,
      fundedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
      releasedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9),
    },
  });

  await prisma.review.createMany({
    data: [
      {
        jobId: sofiaJob.id,
        authorId: client2.id,
        targetId: sofia.id,
        rating: 5,
        comment: "Sofía es impecable: comunicación clara, presencia top y cero drama.",
      },
      {
        jobId: sofiaJob.id,
        authorId: sofia.id,
        targetId: client2.id,
        rating: 5,
        comment: "Excelente cliente. Todo por escrow y con respeto.",
      },
    ],
  });

  await prisma.commission.create({
    data: {
      amount: 18.4,
      level: 1,
      percent: 10,
      description: "Nivel 1 · referido de Sofía Delgado",
      earnerId: lucia.id,
      sourceId: sofia.id,
    },
  });

  await prisma.galleryImage.createMany({
    data: [
      {
        modelId: lucia.id,
        url: "/avatars/lucia.svg",
        caption: "Portada Lucía",
        isCover: true,
        sortOrder: 0,
      },
      {
        modelId: camila.id,
        url: "/avatars/camila.svg",
        caption: "Portada Camila",
        isCover: true,
        sortOrder: 0,
      },
      {
        modelId: valentina.id,
        url: "/avatars/valentina.svg",
        caption: "Portada Valentina",
        isCover: true,
        sortOrder: 0,
      },
      {
        modelId: sofia.id,
        url: "/gallery/sofia/01.jpg",
        caption: "Look de noche",
        isCover: true,
        sortOrder: 0,
      },
      {
        modelId: sofia.id,
        url: "/gallery/sofia/02.jpg",
        caption: "Café en la ciudad",
        isCover: false,
        sortOrder: 1,
      },
      {
        modelId: sofia.id,
        url: "/gallery/sofia/03.jpg",
        caption: "Retrato natural",
        isCover: false,
        sortOrder: 2,
      },
      {
        modelId: sofia.id,
        url: "/gallery/sofia/04.jpg",
        caption: "Jardín · día",
        isCover: false,
        sortOrder: 3,
      },
    ],
  });

  // Example chat with Camila (already started). Sofía stays free for the practice flow.
  const inquiry = await prisma.inquiry.create({
    data: {
      modelId: camila.id,
      clientId: client.id,
      subject: "Consulta desde galería",
    },
  });

  await prisma.inquiryMessage.createMany({
    data: [
      {
        inquiryId: inquiry.id,
        senderId: client.id,
        body: "Hola Camila, vi tu galería. ¿Tienes disponibilidad el viernes?",
      },
      {
        inquiryId: inquiry.id,
        senderId: camila.id,
        body: "Hola Andrés, sí. Podemos cerrar con escrow cuando quieras.",
      },
    ],
  });

  await prisma.userPaymentMethod.createMany({
    data: [
      {
        userId: sofia.id,
        type: "NEQUI",
        label: "Nequi Sofía",
        accountName: "Sofía Delgado",
        accountNumber: "3001234567",
        phone: "3001234567",
        isDefault: true,
        notes: "Transferir y enviar captura en el chat",
      },
      {
        userId: sofia.id,
        type: "BANCOLOMBIA",
        label: "Ahorros Bancolombia",
        accountName: "Sofía Delgado",
        accountNumber: "123-456789-01",
        bankName: "Bancolombia",
      },
      {
        userId: camila.id,
        type: "NEQUI",
        label: "Nequi Camila",
        accountName: "Camila Ríos",
        accountNumber: "3109876543",
        phone: "3109876543",
        isDefault: true,
      },
      {
        userId: client.id,
        type: "NEQUI",
        label: "Mi Nequi",
        accountName: "Andrés Client",
        accountNumber: "3015556677",
        isDefault: true,
      },
    ],
  });

  await prisma.notification.create({
    data: {
      userId: sofia.id,
      title: "Tu galería está publicada",
      body: "Los clientes ya pueden verte en /m/SOFIA88 y escribirte.",
    },
  });

  console.log("Seed OK");
  console.log("Admin: admin@solobbs.com / solobbs123");
  console.log("Modelo demo: sofia@solobbs.com / solobbs123  →  /m/SOFIA88");
  console.log("Modelo: lucia@solobbs.com / solobbs123");
  console.log("Modelo: camila@solobbs.com / solobbs123");
  console.log("Cliente ejercicio: cliente@solobbs.com / solobbs123 (saldo 500 USDT)");
  console.log("Flujo: Billetera → cargar saldo → Mensajes → pagar orden con saldo");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
