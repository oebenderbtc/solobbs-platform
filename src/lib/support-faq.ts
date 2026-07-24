export type FaqEntry = {
  id: string;
  question: string;
  keys: string[];
  reply: string;
};

/** Base completa de preguntas frecuentes SoloBBs */
export const SUPPORT_FAQ: FaqEntry[] = [
  // Saludos
  {
    id: "hola",
    question: "Hola / ¿Me ayudas?",
    keys: ["hola", "buenas", "buen dia", "buen día", "hey", "hi", "hello", "saludos"],
    reply:
      "Hola, soy el asistente de SoloBBs. Puedo resolver dudas de escrow, pagos, billetera, red, cuenta y panel. Escribe tu pregunta o elige un tema.",
  },
  {
    id: "gracias",
    question: "Gracias",
    keys: ["gracias", "thank", "perfecto", "listo", "ok gracias"],
    reply: "Con gusto. Si necesitas algo más, aquí estoy.",
  },

  // Qué es SoloBBs
  {
    id: "que-es",
    question: "¿Qué es SoloBBs?",
    keys: ["que es solobbs", "qué es solobbs", "que es esto", "para que sirve", "para qué sirve", "plataforma"],
    reply:
      "SoloBBs es una plataforma para acompañantes: depósitos en garantía P2P, cobros con tarjeta/crypto, métricas, billetera y red de beneficios por referidos.",
  },
  {
    id: "como-funciona",
    question: "¿Cómo funciona el sitio?",
    keys: ["como funciona", "cómo funciona", "funcionamiento", "explicame", "explícame", "resumen"],
    reply:
      "1) Creas cuenta de modelo. 2) Creas un trabajo con escrow. 3) El cliente fondea con tarjeta o crypto. 4) Al terminar liberas el pago a tu billetera. 5) Invitas chicas y ganas comisiones en 3 niveles.",
  },
  {
    id: "para-quien",
    question: "¿Para quién es SoloBBs?",
    keys: ["para quien", "para quién", "modelos", "acompanantes", "acompañantes", "chicas", "prepago"],
    reply:
      "Está pensado para modelos/acompañantes que quieren cobrar con respaldo (escrow), ver métricas y crecer una red de referidos. También hay panel admin para gestionar la plataforma.",
  },

  // Cuenta / auth
  {
    id: "registro",
    question: "¿Cómo me registro?",
    keys: ["registro", "registrar", "crear cuenta", "unirme", "signup", "sign up"],
    reply:
      "Entra a /register, completa nombre, email, ciudad y contraseña. Si alguien te invitó, pega su código de referida. Luego entras directo a tu panel.",
  },
  {
    id: "login",
    question: "¿Cómo inicio sesión?",
    keys: ["login", "iniciar sesion", "iniciar sesión", "entrar", "acceder", "ingresar"],
    reply:
      "Ve a /login con tu email y contraseña. Si eres admin, te redirige a /admin; si eres modelo, a /dashboard.",
  },
  {
    id: "demo",
    question: "¿Hay cuentas demo?",
    keys: ["demo", "prueba", "cuenta de prueba", "usuario demo"],
    reply:
      "Sí. Modelo: lucia@solobbs.com / solobbs123. Admin: admin@solobbs.com / solobbs123. También existe camila@solobbs.com / solobbs123.",
  },
  {
    id: "olvide-clave",
    question: "Olvidé mi contraseña",
    keys: ["olvide", "olvidé", "contraseña", "password", "clave", "recuperar"],
    reply:
      "Por ahora la recuperación automática no está activa en demo. Escribe tu email aquí y un agente te ayudará a restablecerla.",
  },
  {
    id: "perfil",
    question: "¿Dónde edito mi perfil?",
    keys: ["perfil", "datos", "mi cuenta", "settings", "ajustes perfil"],
    reply:
      "En el panel modelo ve a Perfil. Allí ves nombre, email, ciudad, teléfono, código de referida, verificación y rating.",
  },
  {
    id: "verificacion",
    question: "¿Qué significa cuenta verificada?",
    keys: ["verificada", "verificacion", "verificación", "verificar"],
    reply:
      "Verificada indica que el admin validó tu cuenta. Mientras está pendiente puedes operar en demo; en producción el admin confirma identidad/perfil.",
  },

  // Escrow
  {
    id: "escrow-que",
    question: "¿Qué es el escrow / garantía P2P?",
    keys: ["escrow", "garantia p2p", "garantía p2p", "deposito en garantia", "depósito en garantía", "que es garantia", "qué es garantía"],
    reply:
      "Es un depósito en garantía: el cliente deja el dinero retenido. Tú no lo recibes hasta liberar el escrow al completar el servicio. Así se reducen no-shows y hay trazabilidad.",
  },
  {
    id: "escrow-crear",
    question: "¿Cómo creo un depósito?",
    keys: ["crear escrow", "crear deposito", "crear depósito", "nuevo escrow", "nuevo deposito", "garantia p2p crear"],
    reply:
      "Panel → Garantía P2P → completa título, monto, ciudad y método (tarjeta/crypto) → Crear escrow. Queda en estado Pendiente hasta el fondeo.",
  },
  {
    id: "escrow-fondeo",
    question: "¿Cómo se fondea un escrow?",
    keys: ["fondear", "fondeo", "simular fondeo", "cliente paga", "pagar escrow"],
    reply:
      "Cuando el cliente paga, el escrow pasa a En garantía. En demo puedes usar Simular fondeo. Luego puedes Liberar pago o abrir Disputa.",
  },
  {
    id: "escrow-liberar",
    question: "¿Cómo libero el pago?",
    keys: ["liberar", "liberar pago", "liberar escrow", "acreditar"],
    reply:
      "En Garantía P2P, en un escrow En garantía, pulsa Liberar pago. El neto va a tu billetera (menos fee), el trabajo se completa y se generan comisiones de red si aplica.",
  },
  {
    id: "escrow-disputa",
    question: "¿Qué es una disputa?",
    keys: ["disputa", "reclamo", "problema escrow", "conflicto"],
    reply:
      "Disputa marca el caso para revisión. El admin puede Liberar (a la modelo) o Reembolsar (al cliente) desde el panel de Escrows.",
  },
  {
    id: "escrow-minimo",
    question: "¿Hay monto mínimo de escrow?",
    keys: ["minimo", "mínimo", "monto minimo", "monto mínimo", "cuanto minimo"],
    reply:
      "Sí. Por defecto el mínimo es $50.000 COP (configurable por admin en Ajustes → Mínimo escrow).",
  },
  {
    id: "escrow-estados",
    question: "¿Qué estados tiene un escrow?",
    keys: ["estados escrow", "pendiente", "en garantia", "en garantía", "reembolsado", "liberado"],
    reply:
      "Pendiente → En garantía (fondeado) → Liberado o Reembolsado. También puede estar En curso o en Disputa.",
  },

  // Pagos
  {
    id: "pagos-metodos",
    question: "¿Qué métodos de pago aceptan?",
    keys: ["metodos de pago", "métodos de pago", "formas de pago", "como pagan", "cómo pagan"],
    reply:
      "Tarjeta (Visa/Mastercard en modo demo) y crypto (USDT TRC20 / BTC). Eliges el método al crear el escrow.",
  },
  {
    id: "tarjeta",
    question: "¿Cómo funciona el pago con tarjeta?",
    keys: ["tarjeta", "visa", "mastercard", "card", "credito", "crédito", "debito", "débito"],
    reply:
      "Al crear el escrow eliges Tarjeta. Cuando se fondea (en demo con Simular fondeo) queda registrado con últimos 4 dígitos y el monto pasa a garantía.",
  },
  {
    id: "crypto",
    question: "¿Cómo pago o cobro con crypto?",
    keys: ["crypto", "usdt", "btc", "bitcoin", "cripto", "trc20"],
    reply:
      "Elige Crypto al crear el escrow. Las wallets oficiales están en Billetera / Ajustes admin (USDT y BTC). En demo puedes simular la confirmación del tx.",
  },
  {
    id: "fee",
    question: "¿Cuánto cobra SoloBBs de comisión?",
    keys: ["fee", "comision plataforma", "comisión plataforma", "cuanto cobra", "cuánto cobra", "porcentaje plataforma"],
    reply:
      "El fee de plataforma por defecto es 8% al liberar un escrow. Lo configura el admin en Ajustes. El resto va a tu billetera.",
  },

  // Billetera
  {
    id: "billetera",
    question: "¿Qué veo en Billetera?",
    keys: ["billetera", "wallet", "saldo", "disponible"],
    reply:
      "Disponible (listo), En garantía (retenido en escrow) e Histórico (total ganado). También ves comisiones de red, wallets crypto y movimientos.",
  },
  {
    id: "retiro",
    question: "¿Cómo retiro mi dinero?",
    keys: ["retiro", "retirar", "sacar dinero", "withdraw", "transferencia"],
    reply:
      "En esta versión demo el saldo queda en billetera interna. Los retiros reales (transferencia/crypto) se habilitan en producción; un agente puede orientarte sobre el proceso.",
  },
  {
    id: "movimientos",
    question: "¿Dónde veo mis movimientos?",
    keys: ["movimientos", "historial pagos", "transacciones"],
    reply:
      "En Billetera → Movimientos. Allí aparecen pagos tarjeta/crypto vinculados a tus escrows y su estado.",
  },

  // Trabajos
  {
    id: "trabajos",
    question: "¿Qué son los Trabajos?",
    keys: ["trabajos", "agenda", "encuentros", "citas", "jobs"],
    reply:
      "Son el historial de encuentros/servicios: título, cliente, monto, estado y escrow asociado. Se crean al armar un depósito en Garantía P2P.",
  },
  {
    id: "trabajo-estados",
    question: "Estados de un trabajo",
    keys: ["programado", "activo", "completado", "cancelado", "no show"],
    reply:
      "Programado (creado), Activo (escrow fondeado), Completado (liberado), Cancelado o No show según el caso.",
  },

  // Red
  {
    id: "red",
    question: "¿Cómo funciona la red de beneficios?",
    keys: ["red", "red de beneficios", "referidos", "referidas", "piramide", "pirámide", "mlm"],
    reply:
      "Invitas chicas con tu código/link. Cuando cobran, ganas comisión: Nivel 1 = 10%, Nivel 2 = 5%, Nivel 3 = 2% (ajustable por admin).",
  },
  {
    id: "codigo-referido",
    question: "¿Dónde está mi código de referida?",
    keys: ["codigo", "código", "codigo referida", "código referida", "mi link", "link invitacion", "link invitación"],
    reply:
      "En el Panel principal (arriba) o en Mi red. También en Perfil. Puedes copiar código o link /register?ref=TUCODIGO.",
  },
  {
    id: "comisiones-cuando",
    question: "¿Cuándo se pagan las comisiones de red?",
    keys: ["cuando pagan comision", "cuándo pagan comisión", "comision red", "comisión red"],
    reply:
      "Al liberar un escrow de una chica de tu red, el sistema acredita automáticamente las comisiones de los niveles correspondientes a tu billetera.",
  },
  {
    id: "niveles",
    question: "¿Cuáles son los 3 niveles?",
    keys: ["nivel 1", "nivel 2", "nivel 3", "porcentajes red", "10%", "5%", "2%"],
    reply:
      "Nivel 1 (directas): 10%. Nivel 2: 5%. Nivel 3: 2%. Los ves en Mi red y el admin puede cambiarlos en Ajustes.",
  },

  // Panel / métricas
  {
    id: "panel",
    question: "¿Qué hay en el panel?",
    keys: ["panel", "dashboard", "metricas", "métricas", "resumen"],
    reply:
      "Resumen de billetera, garantía, total ganado, red, gráfica, alertas, últimos trabajos y escrows. Desde ahí vas a cada sección del menú.",
  },
  {
    id: "tips",
    question: "¿Qué son las guías flotantes?",
    keys: ["guia", "guía", "tips", "ayuda flotante", "notificaciones flotantes", "coach"],
    reply:
      "Son tips de cada sección del panel. Puedes pulsar Entendido, No mostrar más, o reabrirlos con el botón Ayuda.",
  },

  // Admin
  {
    id: "admin",
    question: "¿Qué puede hacer el admin?",
    keys: ["admin", "administrador", "panel admin"],
    reply:
      "El admin gestiona usuarias, escrows (liberar/reembolsar/disputa), pagos, soporte y ajustes (fees, % de red, wallets).",
  },
  {
    id: "admin-entrar",
    question: "¿Cómo entro como admin?",
    keys: ["entrar admin", "login admin", "admin@"],
    reply: "Usa admin@solobbs.com / solobbs123 en /login. Te lleva a /admin.",
  },

  // Seguridad / legal light
  {
    id: "seguridad",
    question: "¿Es seguro?",
    keys: ["seguro", "seguridad", "confianza", "estafa"],
    reply:
      "El escrow retiene el dinero hasta confirmar el servicio y deja historial visible para modelo y admin. En producción se conectan pasarelas reales (Stripe/crypto).",
  },
  {
    id: "privacidad",
    question: "Privacidad / discreción",
    keys: ["privacidad", "discrecion", "discreción", "anonimo", "anónimo"],
    reply:
      "La plataforma está pensada para operar con discreción. No compartas datos sensibles en el chat público; para temas sensibles pide agente.",
  },
  {
    id: "edades",
    question: "¿Hay restricción de edad?",
    keys: ["edad", "18", "mayores", "menor"],
    reply: "SoloBBs es solo para adultos 18+.",
  },

  // Técnico
  {
    id: "error",
    question: "Tengo un error en la página",
    keys: ["error", "bug", "falla", "no carga", "no funciona", "problema tecnico", "problema técnico"],
    reply:
      "Prueba recargar con Ctrl+F5. Si sigue fallando, describe en qué pantalla ocurre (landing, login, escrow, etc.) y un agente lo revisará.",
  },
  {
    id: "mobile",
    question: "¿Funciona en celular?",
    keys: ["celular", "movil", "móvil", "mobile", "telefono", "teléfono"],
    reply:
      "Sí. El sitio es responsive: landing, chat, paneles y menú móvil están adaptados a pantallas pequeñas.",
  },
  {
    id: "idiomas",
    question: "¿En qué idioma está?",
    keys: ["idioma", "ingles", "inglés", "language"],
    reply: "La interfaz actual está en español (es-CO para montos y fechas).",
  },
  {
    id: "contacto-agente",
    question: "Quiero hablar con un agente",
    keys: ["agente", "humano", "persona", "asesor", "operador", "hablar con alguien"],
    reply:
      "Entendido. Voy a marcar tu chat para un agente humano. Déjanos tu email y un resumen del caso; te responderán desde el panel de Soporte.",
  },
];

function normalize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type AutoReplyResult = {
  reply: string;
  matched: boolean;
  faqId?: string;
  needsAgent: boolean;
};

export function matchFaq(message: string): AutoReplyResult {
  const text = normalize(message);

  if (!text) {
    return {
      matched: false,
      needsAgent: true,
      reply: "No entendi tu mensaje. Puedes reformularlo?",
    };
  }

  if (
    ["agente", "humano", "persona real", "hablar con alguien", "operador"].some((k) =>
      text.includes(normalize(k)),
    )
  ) {
    return {
      matched: true,
      needsAgent: true,
      faqId: "contacto-agente",
      reply:
        "Listo: tu conversacion quedo marcada para un agente. Un humano del equipo SoloBBs te respondera pronto. Mientras, deja email y detalle del caso.",
    };
  }

  let best: { entry: FaqEntry; score: number } | null = null;

  for (const entry of SUPPORT_FAQ) {
    let score = 0;
    for (const key of entry.keys) {
      const k = normalize(key);
      if (!k) continue;
      if (text === k) score += 12;
      else if (text.includes(k)) score += 6 + Math.min(k.length, 10) * 0.15;
      else {
        const tokens = k.split(" ").filter((t) => t.length > 2);
        const hits = tokens.filter((t) => text.includes(t)).length;
        if (hits && hits === tokens.length) score += 4;
        else if (hits) score += hits * 1.2;
      }
    }

    const q = normalize(entry.question);
    const qTokens = q.split(" ").filter((t) => t.length > 3);
    const qHits = qTokens.filter((t) => text.includes(t)).length;
    if (qHits >= 2) score += qHits * 1.5;

    if (!best || score > best.score) best = { entry, score };
  }

  if (best && best.score >= 4) {
    return {
      matched: true,
      needsAgent: false,
      faqId: best.entry.id,
      reply: best.entry.reply,
    };
  }

  return {
    matched: false,
    needsAgent: true,
    reply:
      "No tengo una respuesta predefinida para eso. Voy a conectarte con un agente de soporte. Mientras llega, puedes preguntar por: escrow, pagos, billetera, red, registro, fee o panel.",
  };
}

export function listFaqTopics() {
  return SUPPORT_FAQ.filter((f) => !["hola", "gracias"].includes(f.id)).map((f) => ({
    id: f.id,
    question: f.question,
  }));
}
