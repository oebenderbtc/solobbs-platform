export type TermsSection = {
  title: string;
  paragraphs: string[];
};

export type TermsDoc = {
  title: string;
  updated: string;
  intro: string;
  sections: TermsSection[];
};

export const termsEs: TermsDoc = {
  title: "Términos y Condiciones",
  updated: "Actualizado: 24 de julio de 2026",
  intro:
    "Estos Términos regulan el uso de SoloBBs, plataforma tecnológica para adultas (18+) que facilita perfiles, galerías, mensajería, reservas y depósitos en garantía (escrow) P2P con liquidación en USDT, incluyendo pagos vía TronLink (USDT-TRC20). Al crear una cuenta, usar TronLink o utilizar el servicio, aceptas estos Términos.",
  sections: [
    {
      title: "1. Quiénes somos y qué ofrecemos",
      paragraphs: [
        "SoloBBs es una plataforma intermediaria de software. Ofrece cuentas para modelos y clientes, directorio de perfiles, galerías (fotos/videos), estados temporales, chat, órdenes P2P, billetera cripto, escrow con fee de plataforma, red de referidos y soporte.",
        "SoloBBs no organiza, promociona ni controla encuentros personales. Cualquier acuerdo entre modelo y cliente es privado entre ellas. La plataforma solo provee herramientas de pago en garantía, comunicación y gestión de cuenta.",
      ],
    },
    {
      title: "2. Elegibilidad y cuentas",
      paragraphs: [
        "Debes tener al menos 18 años y capacidad legal para contratar. Queda prohibido el uso por menores.",
        "Puedes registrarte con email/contraseña o con wallet TRON (TronLink u compatible). Eres responsable de la seguridad de tus credenciales y de tu wallet.",
        "Hay roles: Modelo, Cliente y Admin. Algunas funciones (contactar, pagar, liberar escrow) dependen del rol. SoloBBs puede suspender cuentas por fraude, abuso, menor de edad o incumplimiento.",
      ],
    },
    {
      title: "3. Contenido, galerías y estados",
      paragraphs: [
        "Las modelos publican fotos, videos y estados bajo su responsabilidad. Declaran tener derechos sobre el contenido y que todas las personas mostradas son adultas consentidoras.",
        "Prohibido: contenido ilegal, no consensuado, de menores, engañoso, malware o que vulnere derechos de terceros.",
        "Los estados pueden caducar automáticamente (p. ej. 24 h). SoloBBs puede retirar contenido que incumpla estas reglas o la ley aplicable.",
      ],
    },
    {
      title: "4. Mensajería, citas y contacto",
      paragraphs: [
        "El chat y las solicitudes de cita son para adultos que aceptan interactuar. Puedes ver perfiles sin cuenta; para enviar mensajes o pedir citas debes registrarte como cliente.",
        "Las alertas (p. ej. WhatsApp) son opcionales y dependen de la configuración de la modelo y del proveedor. No garantizamos entrega instantánea de notificaciones externas.",
      ],
    },
    {
      title: "5. Escrow P2P y pagos",
      paragraphs: [
        "El escrow retiene un monto acordado hasta liberarlo o disputarlo según el flujo de la plataforma. La moneda de liquidación es USDT (o equivalente interno convertido a USDT).",
        "Los clientes pueden fondear con saldo SoloBBs y/o con TronLink enviando USDT-TRC20 a la dirección treasury indicada. La liberación puede requerir firma TronLink de la modelo y/o confirmación de llegada del cliente.",
        "La plataforma cobra un fee (por defecto 8%, configurable) al liberar. En el mismo acto se descuentan automáticamente las comisiones de referidos (hasta 3 niveles) del monto post-fee, y el neto va a la modelo.",
        "Los precios mostrados en USD/COP son solo referencia visual; los cobros y el escrow se ejecutan en USDT.",
        "Transacciones blockchain son irreversibles una vez confirmadas. Errores de dirección, red o monto son responsabilidad del usuario que firma en TronLink.",
      ],
    },
    {
      title: "6. Billetera, depósitos y retiros",
      paragraphs: [
        "La billetera interna refleja saldos disponibles, en garantía e histórico. Depósitos BTC/LTC pueden convertirse a USDT de settlement según las tasas/config de la plataforma.",
        "Los medios de pago guardados (Nequi, banco, etc.) sirven para retiros de ganancias de la modelo, no sustituyen el fondeo del escrow del cliente.",
        "SoloBBs no es un banco ni un exchange. Los saldos demo o simulados en entornos de prueba no constituyen dinero real.",
      ],
    },
    {
      title: "7. Red de referidos",
      paragraphs: [
        "Las modelos pueden invitar a otras con código o link. Las comisiones por niveles se pagan cuando hay liberaciones de escrow reales, según la política publicada en la app.",
        "Está prohibido el abuso de referidos (autocuentas, fraude, spam). SoloBBs puede anular comisiones irregulares.",
      ],
    },
    {
      title: "8. Disputas y soporte",
      paragraphs: [
        "Puedes abrir disputa sobre un escrow según el estado permitido. Admin puede liberar, reembolsar o marcar disputa. La resolución busca proteger a las partes con la evidencia disponible en la plataforma.",
        "El chat de soporte y el FAQ orientan sobre el producto; no reemplazan asesoría legal o fiscal personalizada.",
      ],
    },
    {
      title: "9. Privacidad y datos",
      paragraphs: [
        "Tratamos datos de cuenta, perfil, mensajes operativos, pagos y direcciones wallet necesarias para el servicio. No vendas tu acceso ni compartas datos de terceros sin base legal.",
        "Al conectar TronLink, aceptas que tu dirección pública pueda asociarse a tu cuenta SoloBBs.",
      ],
    },
    {
      title: "10. Limitación de responsabilidad",
      paragraphs: [
        "El servicio se ofrece “tal cual”. No garantizamos encuentros, ingresos, disponibilidad continua ni resultados de citas.",
        "En la máxima medida permitida por la ley, SoloBBs no responde por daños indirectos, lucro cesante, pérdidas por volatilidad cripto, errores de red TRON/TronLink, ni conductas de usuarios fuera de la plataforma.",
        "La responsabilidad total agregada, si existiera, se limita a las fees de plataforma efectivamente pagadas por ti en los 3 meses previos al reclamo.",
      ],
    },
    {
      title: "11. Cumplimiento y prohibiciones",
      paragraphs: [
        "Debes cumplir la ley del lugar donde uses el servicio. Queda prohibido lavado de activos, financiación ilícita, suplantación, acoso, amenazas y cualquier uso que ponga en riesgo a otras personas.",
        "SoloBBs puede cooperar con autoridades competentes cuando exista requerimiento válido.",
      ],
    },
    {
      title: "12. Cambios y contacto",
      paragraphs: [
        "Podemos actualizar estos Términos. El uso continuado después de la publicación implica aceptación de la versión vigente.",
        "Para dudas sobre el servicio, usa el soporte dentro de la app. La versión aplicable es la publicada en /terms.",
      ],
    },
  ],
};

export const termsEn: TermsDoc = {
  title: "Terms and Conditions",
  updated: "Updated: July 24, 2026",
  intro:
    "These Terms govern SoloBBs, a technology platform for adults (18+) providing profiles, galleries, messaging, bookings and P2P escrow settled in USDT, including TronLink (USDT-TRC20) payments. By creating an account, using TronLink or using the service, you accept these Terms.",
  sections: [
    {
      title: "1. Who we are and what we offer",
      paragraphs: [
        "SoloBBs is a software intermediary. It offers model and client accounts, profile directory, galleries (photos/videos), temporary stories, chat, P2P orders, crypto wallet, escrow with platform fee, referral network and support.",
        "SoloBBs does not organize or control personal meetings. Any arrangement between model and client is private between them. The platform only provides escrow tools, communication and account management.",
      ],
    },
    {
      title: "2. Eligibility and accounts",
      paragraphs: [
        "You must be at least 18 and legally able to contract. Minors are prohibited.",
        "You may register with email/password or a TRON wallet (TronLink or compatible). You are responsible for credentials and wallet security.",
        "Roles include Model, Client and Admin. Some features depend on role. SoloBBs may suspend accounts for fraud, abuse, underage use or breach.",
      ],
    },
    {
      title: "3. Content, galleries and stories",
      paragraphs: [
        "Models publish photos, videos and stories under their responsibility and warrant rights and that all depicted people are consenting adults.",
        "Prohibited: illegal, non-consensual, underage, misleading or infringing content.",
        "Stories may auto-expire (e.g. 24h). SoloBBs may remove content that violates these rules or applicable law.",
      ],
    },
    {
      title: "4. Messaging and bookings",
      paragraphs: [
        "Chat and booking requests are for consenting adults. Profiles may be browsed without an account; messaging or booking requires a client account.",
        "External alerts (e.g. WhatsApp) are optional and not guaranteed to be instant.",
      ],
    },
    {
      title: "5. P2P escrow and payments",
      paragraphs: [
        "Escrow holds an agreed amount until release or dispute per the in-app flow. Settlement currency is USDT (or internal balances converted to USDT).",
        "Clients may fund with SoloBBs balance and/or TronLink by sending USDT-TRC20 to the stated treasury. Release may require the model’s TronLink signature and/or client arrival confirmation.",
        "The platform charges a fee (default 8%, configurable) on release. In the same step, referral commissions (up to 3 levels) are deducted automatically from the post-fee amount, and the net goes to the model.",
        "USD/COP price labels are display-only; charges and escrow run in USDT.",
        "Confirmed blockchain transactions are irreversible. Address, network or amount mistakes are the signing user’s responsibility.",
      ],
    },
    {
      title: "6. Wallet, deposits and withdrawals",
      paragraphs: [
        "The internal wallet shows available, held and historical balances. BTC/LTC deposits may convert to USDT settlement per platform settings.",
        "Saved payout methods (Nequi, bank, etc.) are for model withdrawals, not client escrow funding.",
        "SoloBBs is not a bank or exchange. Demo balances are not real money.",
      ],
    },
    {
      title: "7. Referral network",
      paragraphs: [
        "Models may invite others with a code or link. Level commissions pay when real escrows are released, per the app policy.",
        "Referral abuse is prohibited. SoloBBs may void irregular commissions.",
      ],
    },
    {
      title: "8. Disputes and support",
      paragraphs: [
        "You may open a dispute when allowed. Admin may release, refund or mark disputed based on available platform evidence.",
        "In-app support/FAQ do not replace personal legal or tax advice.",
      ],
    },
    {
      title: "9. Privacy and data",
      paragraphs: [
        "We process account, profile, operational messages, payment and wallet-address data needed to run the service.",
        "Connecting TronLink means your public address may be linked to your SoloBBs account.",
      ],
    },
    {
      title: "10. Limitation of liability",
      paragraphs: [
        "The service is provided “as is”. We do not guarantee meetings, income, uptime or booking outcomes.",
        "To the fullest extent allowed by law, SoloBBs is not liable for indirect damages, lost profits, crypto volatility, TRON/TronLink network errors, or off-platform user conduct.",
        "Aggregate liability, if any, is limited to platform fees you actually paid in the 3 months before the claim.",
      ],
    },
    {
      title: "11. Compliance",
      paragraphs: [
        "You must comply with local law. Money laundering, illicit finance, impersonation, harassment and harmful misuse are forbidden.",
        "SoloBBs may cooperate with competent authorities upon valid request.",
      ],
    },
    {
      title: "12. Changes and contact",
      paragraphs: [
        "We may update these Terms. Continued use after publication means acceptance of the current version.",
        "For product questions, use in-app support. The applicable version is published at /terms.",
      ],
    },
  ],
};
