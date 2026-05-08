export interface LandingFeature {
  icon: string;
  title: string;
  description: string;
}

export interface LandingScreenshot {
  src: string;
  caption: string;
}

export interface LandingFooterLink {
  label: string;
  href: string;
}

export interface LandingContent {
  gameName: string;
  tagline: string;
  heroSubtitle: string;
  ctaPlay: string;
  ctaLearnMore: string;
  stats: { label: string; value: string }[];
  featuresTitle: string;
  featuresSubtitle: string;
  features: LandingFeature[];
  screenshotsTitle: string;
  screenshotsSubtitle: string;
  screenshots: LandingScreenshot[];
  loreTitle: string;
  loreSubtitle: string;
  loreParagraphs: string[];
  latestVersionTitle: string;
  latestVersionSubtitle: string;
  footer: {
    brand: string;
    tagline: string;
    copyright: string;
    developer: string;
    links: LandingFooterLink[];
  };
}

export const landingContent: LandingContent = {
  gameName: "Conquest of Etheria",
  tagline: "Construye. Alía. Conquista.",
  heroSubtitle:
    "Un mundo persistente de estrategia en tiempo real donde cada decisión forja el destino de tu imperio.",
  ctaPlay: "Comenzar Aventura",
  ctaLearnMore: "Descubrir el Mundo",
  stats: [
    { value: "13+", label: "Edificios" },
    { value: "5", label: "Unidades" },
    { value: "22", label: "Tecnologías" },
    { value: "7", label: "Zonas Climáticas" },
  ],
  featuresTitle: "Elige tu camino",
  featuresSubtitle: "Seis pilares que definen la experiencia de Etheria",
  features: [
    {
      icon: "🏗️",
      title: "Construcción Estratégica",
      description:
        "Levanta tu ciudad desde cero con 13 tipos de edificios, cada uno con 20 niveles de mejora. Gestiona recursos, almacenamiento y colas de construcción.",
    },
    {
      icon: "🤝",
      title: "Alianzas y Diplomacia",
      description:
        "Únete a alianzas poderosas, negocia tratados de paz con bonificaciones compartidas, y forja relaciones que cambiarán el destino de los reinos.",
    },
    {
      icon: "⚔️",
      title: "Guerras Épicas",
      description:
        "Comanda ejércitos con 5 tipos de unidades distintas. Calcula tiempos de marcha, asedia ciudades enemigas, y regresa con el botín.",
    },
    {
      icon: "❄️",
      title: "Temporadas Vivas",
      description:
        "El mundo cambia contigo. La Primavera trae abundancia, el Invierno exige resistencia. Adaptarse o perecer.",
    },
    {
      icon: "🔬",
      title: "Árbol de Tecnologías",
      description:
        "Investiga 22 tecnologías en 3 ramas. Desbloquea unidades avanzadas, reduce costes y fortifica tus defensas.",
    },
    {
      icon: "🗺️",
      title: "Mapa Mundial Persistente",
      description:
        "Explora un mundo continuo con ciudades reales de jugadores, campamentos bárbaros, y 7 zonas climáticas dinámicas.",
    },
  ],
  screenshotsTitle: "Etheria te espera",
  screenshotsSubtitle: "Un vistazo al mundo que construirás",
  screenshots: [
    { src: "/assets/landing/screenshot-village.jpg", caption: "Tu aldea en crecimiento" },
    { src: "/assets/landing/screenshot-battle.jpg", caption: "Preparando el asedio" },
    { src: "/assets/landing/screenshot-world.jpg", caption: "El mapa mundial" },
    { src: "/assets/landing/screenshot-tech.jpg", caption: "Investigación militar" },
  ],
  loreTitle: "El Mundo de Etheria",
  loreSubtitle: "Una historia escrita por cada jugador",
  loreParagraphs: [
    "En el principio, solo existía el Vacío. Luego, los Primeros Constructores alzaron sus ciudades desde la tierra, y así nació Etheria: un continente fragmentado donde el conocimiento, la guerra y la diplomacia se entrelazan en un tejido eterno.",
    "Las eras de Etheria están marcadas por el ciclo de las estaciones. La Primavera trae renovación y abundancia. El Verano es la época de la expansión. El Otoño exige preparación. Y cuando el Invierno llega, solo los más preparados sobreviven.",
    "Pero Etheria no es solo supervivencia. Es conquista. Los comandantes que dominan la forja de armas, la ciencia de la guerra y el arte de la alianza forjan imperios que perduran más allá de las estaciones.",
    "Tu ciudad te espera. Tus enemigos también.",
  ],
  latestVersionTitle: "Última Actualización",
  latestVersionSubtitle: "El mundo de Etheria evoluciona constantemente",
  footer: {
    brand: "Conquest of Etheria",
    tagline: "Construye. Alía. Conquista.",
    copyright: "© 2026 Conquest of Etheria",
    developer: "Desarrollado por 32bitsarg <3",
    links: [
      { label: "Changelog", href: "/changelog" },
      { label: "Iniciar Sesión", href: "/login" },
      { label: "Crear Cuenta", href: "/registro" },
    ],
  },
};
