import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type ModelSeed = {
  email: string;
  name: string;
  referralCode: string;
  city: string;
  phone: string;
  bio: string;
  rateFrom: number;
  walletBalance: number;
  totalEarned: number;
  totalJobs: number;
  rating: number;
  slug: string;
  captions: string[];
  storyCaptions: string[];
};

const MODELS: ModelSeed[] = [
  {
    email: "sofia@solobbs.com",
    name: "Sofía Delgado",
    referralCode: "SOFIA88",
    city: "Medellín",
    phone: "+57 300 555 0188",
    bio: "Compañía premium para cenas, viajes cortos y eventos. Puntual, discreta y muy clara con los acuerdos. Agenda en El Poblado y Laureles. Prefiero escrow SoloBBs para tranquilidad de ambos.",
    rateFrom: 200,
    walletBalance: 3100,
    totalEarned: 9600000,
    totalJobs: 31,
    rating: 4.95,
    slug: "sofia",
    captions: ["Look de noche", "Café en la ciudad", "Retrato natural", "Jardín · día"],
    storyCaptions: ["Buenos días Medellín", "Outfit de hoy", "Nos vemos esta noche"],
  },
  {
    email: "lucia@solobbs.com",
    name: "Lucía Vargas",
    referralCode: "LUCIA7X",
    city: "Medellín",
    phone: "+57 310 111 2233",
    bio: "Experiencias premium con total discreción. Cenas, eventos corporativos y compañía de viaje. Agenda selecta en El Poblado.",
    rateFrom: 180,
    walletBalance: 4200,
    totalEarned: 12800000,
    totalJobs: 47,
    rating: 4.9,
    slug: "lucia",
    captions: ["Elegante", "City lights", "Retrato", "Rooftop"],
    storyCaptions: ["Disponible hoy", "Nuevo look", "After office"],
  },
  {
    email: "camila@solobbs.com",
    name: "Camila Ríos",
    referralCode: "CAMI9K",
    city: "Bogotá",
    phone: "+57 320 444 5566",
    bio: "Citas elegantes y agenda flexible. Zona T, Parque 93 y Chapinero. Comunicación clara y escrow siempre.",
    rateFrom: 150,
    walletBalance: 1800,
    totalEarned: 4200000,
    totalJobs: 18,
    rating: 4.8,
    slug: "camila",
    captions: ["Zona T", "Café", "Natural", "Noche"],
    storyCaptions: ["Bogotá vibes", "Lista para salir", "DM abiertos"],
  },
  {
    email: "valentina@solobbs.com",
    name: "Valentina Mora",
    referralCode: "VALE3M",
    city: "Cali",
    phone: "+57 315 222 3344",
    bio: "Energía vallecaucana, buen humor y presencia. Ideal para cenas y salidas por Granada o Ciudad Jardín.",
    rateFrom: 120,
    walletBalance: 640,
    totalEarned: 1100000,
    totalJobs: 6,
    rating: 5,
    slug: "valentina",
    captions: ["Sol de Cali", "Look casual", "Retrato", "Salida"],
    storyCaptions: ["Calorcito", "Nuevas fotos", "Agenda abierta"],
  },
  {
    email: "isabella@solobbs.com",
    name: "Isabella Cruz",
    referralCode: "ISA42",
    city: "Cartagena",
    phone: "+57 300 777 1122",
    bio: "Compañía para cenas en el Centro Histórico, yates y eventos. Discreción total y estilo caribeño.",
    rateFrom: 220,
    walletBalance: 2500,
    totalEarned: 5400000,
    totalJobs: 22,
    rating: 4.92,
    slug: "isabella",
    captions: ["Murallas", "Atardecer", "Blanco", "Brisa"],
    storyCaptions: ["Cartagena hoy", "Mar y sol", "Reserva tu mesa"],
  },
  {
    email: "daniela@solobbs.com",
    name: "Daniela Restrepo",
    referralCode: "DANI15",
    city: "Bucaramanga",
    phone: "+57 301 888 3344",
    bio: "Perfil selecto, conversación interesante y puntualidad. Cabecera y Cañaveral.",
    rateFrom: 140,
    walletBalance: 980,
    totalEarned: 2100000,
    totalJobs: 12,
    rating: 4.85,
    slug: "daniela",
    captions: ["Día", "Soft", "Mirada", "Noche"],
    storyCaptions: ["Buenas tardes", "Disponible", "Nueva galería"],
  },
  {
    email: "mariana@solobbs.com",
    name: "Mariana López",
    referralCode: "MARI22",
    city: "Barranquilla",
    phone: "+57 302 999 5566",
    bio: "Alegría costeña con estilo. Cenas, eventos y compañía de viaje por la costa.",
    rateFrom: 160,
    walletBalance: 1320,
    totalEarned: 3800000,
    totalJobs: 19,
    rating: 4.88,
    slug: "mariana",
    captions: ["Costa", "Fashion", "Street", "Glam"],
    storyCaptions: ["Bquilla mode", "Hoy salgo", "Escríbeme"],
  },
  {
    email: "paula@solobbs.com",
    name: "Paula Méndez",
    referralCode: "PAULA9",
    city: "Pereira",
    phone: "+57 304 111 7788",
    bio: "Compañía cálida para cenas y escapadas al Eje Cafetero. Clara con tiempos y tarifas.",
    rateFrom: 130,
    walletBalance: 760,
    totalEarned: 1750000,
    totalJobs: 9,
    rating: 4.9,
    slug: "paula",
    captions: ["Café", "Retrato", "Soft glam", "City"],
    storyCaptions: ["Pereira", "Look del día", "Cupos limitados"],
  },
  {
    email: "andrea@solobbs.com",
    name: "Andrea Salas",
    referralCode: "ANDRE7",
    city: "Bogotá",
    phone: "+57 305 222 9900",
    bio: "Presencia sofisticada para cenas de negocios y eventos. Usa Siempre escrow SoloBBs.",
    rateFrom: 190,
    walletBalance: 2100,
    totalEarned: 7200000,
    totalJobs: 28,
    rating: 4.97,
    slug: "andrea",
    captions: ["Black dress", "Oficina chic", "Retrato", "Terraza"],
    storyCaptions: ["Agenda VIP", "Nuevo set", "Solo escrow"],
  },
  {
    email: "natalia@solobbs.com",
    name: "Natalia Gómez",
    referralCode: "NATA33",
    city: "Medellín",
    phone: "+57 306 333 4411",
    bio: "Company girl para cenas, after y viajes cortos. Laureles y Envigado. Sin drama, solo acuerdos claros.",
    rateFrom: 170,
    walletBalance: 1450,
    totalEarned: 4500000,
    totalJobs: 21,
    rating: 4.91,
    slug: "natalia",
    captions: ["Envigado", "Casual chic", "Noche", "Natural"],
    storyCaptions: ["Hola Medallo", "Stories fresh", "Agenda de la semana"],
  },
];

async function main() {
  const existing = await prisma.user.count();
  if (existing > 0 && process.env.SEED_ON_BOOT === "true") {
    console.log("Seed omitido: la base ya tiene usuarios (SEED_ON_BOOT).");
    return;
  }

  await prisma.supportMessage.deleteMany();
  await prisma.supportConversation.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.inquiryMessage.deleteMany();
  await prisma.inquiry.deleteMany();
  await prisma.story.deleteMany();
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
  const storyExpires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 días (demo)

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

  const createdModels: { id: string; slug: string; referralCode: string; name: string }[] = [];

  for (let i = 0; i < MODELS.length; i++) {
    const m = MODELS[i];
    const referredById =
      i === 0
        ? undefined
        : createdModels[0]?.id; // red bajo Sofía / primera

    const user = await prisma.user.create({
      data: {
        email: m.email,
        passwordHash,
        name: m.name,
        role: "MODEL",
        referralCode: m.referralCode,
        referredById: i === 1 ? undefined : referredById, // Lucía raíz de red histórica
        city: m.city,
        phone: m.phone,
        whatsapp: m.phone,
        whatsappNotify: true,
        bio: m.bio,
        isVerified: true,
        galleryPublic: true,
        rateFrom: m.rateFrom,
        walletBalance: m.walletBalance,
        totalEarned: m.totalEarned,
        totalJobs: m.totalJobs,
        rating: m.rating,
        avatarUrl: `/gallery/${m.slug}/01.jpg`,
      },
    });
    createdModels.push({
      id: user.id,
      slug: m.slug,
      referralCode: m.referralCode,
      name: m.name,
    });

    await prisma.galleryImage.createMany({
      data: m.captions.map((caption, idx) => ({
        modelId: user.id,
        url: `/gallery/${m.slug}/${String(idx + 1).padStart(2, "0")}.jpg`,
        mediaType: "IMAGE",
        caption,
        isCover: idx === 0,
        sortOrder: idx,
      })),
    });

    await prisma.story.createMany({
      data: m.storyCaptions.map((caption, idx) => ({
        modelId: user.id,
        url: `/gallery/${m.slug}/story-${String(idx + 1).padStart(2, "0")}.jpg`,
        mediaType: "IMAGE",
        caption,
        expiresAt: storyExpires,
        createdAt: new Date(Date.now() - (2 - idx) * 60 * 60 * 1000),
      })),
    });
  }

  // Fix referral tree: Lucía as root, others referred by Lucía/Camila like before
  const lucia = createdModels.find((m) => m.referralCode === "LUCIA7X")!;
  const camila = createdModels.find((m) => m.referralCode === "CAMI9K")!;
  const sofia = createdModels.find((m) => m.referralCode === "SOFIA88")!;
  const valentina = createdModels.find((m) => m.referralCode === "VALE3M")!;

  await prisma.user.update({
    where: { id: lucia.id },
    data: { referredById: null },
  });
  await prisma.user.update({
    where: { id: camila.id },
    data: { referredById: lucia.id },
  });
  await prisma.user.update({
    where: { id: sofia.id },
    data: { referredById: lucia.id },
  });
  await prisma.user.update({
    where: { id: valentina.id },
    data: { referredById: camila.id },
  });
  for (const m of createdModels) {
    if (["LUCIA7X", "CAMI9K", "SOFIA88", "VALE3M"].includes(m.referralCode)) continue;
    await prisma.user.update({
      where: { id: m.id },
      data: { referredById: lucia.id },
    });
  }

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
        body: "SoloBBs seed cargado con 10 modelos y estados.",
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

  console.log("Seed OK — 10 modelos con galería (4 fotos) + 3 estados c/u");
  console.log("Admin: admin@solobbs.com / solobbs123");
  console.log("Cliente: cliente@solobbs.com / solobbs123 (500 USDT)");
  for (const m of createdModels) {
    console.log(`Modelo: ${m.name} → /m/${m.referralCode}`);
  }
  console.log("Password todas: solobbs123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
