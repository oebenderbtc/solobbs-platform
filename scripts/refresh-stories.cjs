/**
 * Recreate demo stories for existing models (24h TTL expired them).
 * Does not wipe other data.
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const STORY_CAPTIONS = {
  sofia: ["Buenos días Medellín", "Outfit de hoy", "Nos vemos esta noche"],
  lucia: ["Disponible hoy", "Nuevo look", "After office"],
  camila: ["Bogotá vibes", "Lista para salir", "DM abiertos"],
  valentina: ["Calorcito", "Nuevas fotos", "Agenda abierta"],
  isabella: ["Cartagena hoy", "Mar y sol", "Reserva tu mesa"],
  daniela: ["Buenas tardes", "Disponible", "Nueva galería"],
  mariana: ["Bquilla mode", "Hoy salgo", "Escríbeme"],
  paula: ["Pereira", "Look del día", "Cupos limitados"],
  andrea: ["Agenda VIP", "Nuevo set", "Solo escrow"],
  natalia: ["Hola Medallo", "Stories fresh", "Agenda de la semana"],
};

async function main() {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
  const models = await prisma.user.findMany({
    where: { role: "MODEL" },
    select: { id: true, name: true, avatarUrl: true, referralCode: true },
  });

  let created = 0;
  for (const m of models) {
    const slug =
      Object.keys(STORY_CAPTIONS).find((s) =>
        (m.avatarUrl || "").includes(`/gallery/${s}/`),
      ) || m.name.split(" ")[0].toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

    const captions = STORY_CAPTIONS[slug] || [
      "Disponible hoy",
      "Nuevo look",
      "Agenda abierta",
    ];

    await prisma.story.deleteMany({ where: { modelId: m.id } });
    await prisma.story.createMany({
      data: captions.map((caption, idx) => ({
        modelId: m.id,
        url: `/gallery/${slug}/story-${String(idx + 1).padStart(2, "0")}.jpg`,
        mediaType: "IMAGE",
        caption,
        expiresAt,
        createdAt: new Date(Date.now() - (2 - idx) * 60 * 60 * 1000),
      })),
    });
    created += captions.length;
    console.log(`OK ${m.referralCode} (${slug}) → ${captions.length} estados`);
  }

  console.log(`Hecho: ${created} estados, caducan ${expiresAt.toISOString()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
