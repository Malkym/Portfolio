/**
 * Données de démonstration.
 *
 *   npm run seed
 *
 * Volontairement complet : toutes les sections sont remplies, y compris une
 * section dynamique « Certifications », pour que le portfolio soit
 * immédiatement présentable et que chaque fonctionnalité soit visible.
 */
import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { setConfig } from '../server/database/db.js'
import { defaultPortfolio } from '../server/models/PortfolioData.js'
import type { PortfolioData } from '../src/shared/types/portfolio.types.js'

const id = () => randomUUID()
const base = (order: number) => ({ id: id(), order, enabled: true, archived: false })

const data: PortfolioData = {
  ...defaultPortfolio(),

  personal: {
    name: 'Alex Moreau',
    title: 'Développeur Full-Stack',
    bio: "Je conçois des applications web durables, accessibles et rapides. Douze ans à transformer des problèmes flous en produits nets.",
    photo: '',
    email: 'alex.moreau@exemple.com',
    phone: '+33 6 12 34 56 78',
    location: 'Lyon, France',
    resumeUrl: '',
  },

  hero: {
    subtitle:
      "Je transforme des idées complexes en interfaces limpides. Vue, TypeScript, Node — et une obsession pour les détails qu'on ne remarque que quand ils manquent.",
    typedWords: [
      'Développeur Full-Stack',
      'Architecte Front-end',
      'Passionné de Vue.js',
      "Amoureux du détail",
    ],
    ctaText: 'Voir mes projets',
    ctaLink: '#projects',
    ctaSecondaryText: 'Me contacter',
    ctaSecondaryLink: '#contact',
    background: 'gradient',
    backgroundMedia: '',
  },

  about: {
    enabled: true,
    title: 'À propos',
    subtitle: 'Qui je suis, et comment je travaille',
    content: `<p>Développeur depuis douze ans, j'ai commencé par bricoler des sites en PHP dans ma chambre. Aujourd'hui je conçois des architectures front-end qui tiennent la charge et le temps.</p>
<p>Ce qui m'intéresse n'est pas la technologie pour elle-même, mais ce qu'elle permet : une interface qui répond au doigt et à l'œil, un formulaire qu'on remplit sans réfléchir, une page qui s'affiche avant qu'on ait eu le temps de s'impatienter.</p>
<p>Je travaille surtout avec <strong>Vue 3</strong>, <strong>TypeScript</strong> et <strong>Node.js</strong>, mais je choisis toujours l'outil en fonction du problème — jamais l'inverse.</p>`,
    image: '',
    values: [
      "L'accessibilité n'est pas une option",
      'Un code lisible vaut mieux qu\'un code malin',
      'La performance est une fonctionnalité',
      'Livrer vaut mieux que perfectionner',
    ],
  },

  stats: {
    enabled: true,
    title: 'En chiffres',
    subtitle: '',
    items: [
      { ...base(0), label: "Années d'expérience", value: 12, suffix: '', icon: 'hourglass' },
      { ...base(1), label: 'Projets livrés', value: 87, suffix: '', icon: 'rocket' },
      { ...base(2), label: 'Clients satisfaits', value: 34, suffix: '', icon: 'handshake' },
      { ...base(3), label: 'Contributions open-source', value: 210, suffix: '+', icon: 'heart' },
    ],
  },

  skills: {
    enabled: true,
    title: 'Compétences',
    subtitle: 'Les outils que je maîtrise vraiment',
    categories: [
      {
        ...base(0),
        name: 'Front-end',
        icon: 'palette',
        skills: [
          { id: id(), name: 'Vue.js 3', level: 'Expert', score: 96, icon: '', order: 0 },
          { id: id(), name: 'TypeScript', level: 'Expert', score: 92, icon: '', order: 1 },
          { id: id(), name: 'React', level: 'Senior', score: 82, icon: '', order: 2 },
          { id: id(), name: 'CSS / Tailwind', level: 'Expert', score: 94, icon: '', order: 3 },
          { id: id(), name: 'Accessibilité (WCAG)', level: 'Senior', score: 85, icon: '', order: 4 },
        ],
      },
      {
        ...base(1),
        name: 'Back-end',
        icon: 'settings',
        skills: [
          { id: id(), name: 'Node.js', level: 'Expert', score: 90, icon: '', order: 0 },
          { id: id(), name: 'PostgreSQL', level: 'Senior', score: 84, icon: '', order: 1 },
          { id: id(), name: 'SQLite', level: 'Senior', score: 88, icon: '', order: 2 },
          { id: id(), name: 'API REST / GraphQL', level: 'Expert', score: 91, icon: '', order: 3 },
        ],
      },
      {
        ...base(2),
        name: 'Outils & DevOps',
        icon: 'wrench',
        skills: [
          { id: id(), name: 'Git', level: 'Expert', score: 95, icon: '', order: 0 },
          { id: id(), name: 'Docker', level: 'Senior', score: 80, icon: '', order: 1 },
          { id: id(), name: 'CI/CD', level: 'Senior', score: 78, icon: '', order: 2 },
          { id: id(), name: 'Vite / Webpack', level: 'Expert', score: 89, icon: '', order: 3 },
        ],
      },
    ],
  },

  projects: {
    enabled: true,
    title: 'Projets',
    subtitle: 'Une sélection de ce dont je suis le plus fier',
    items: [
      {
        ...base(0),
        title: 'Plateforme de gestion associative',
        description:
          "Application complète de gestion pour un réseau d'associations : membres, événements, comptabilité et communication.",
        longDescription: '',
        image: '',
        video: '',
        technologies: ['Vue 3', 'TypeScript', 'Node.js', 'PostgreSQL'],
        demoUrl: 'https://exemple.com',
        repoUrl: '',
        startDate: '2023-01-01',
        endDate: '2024-06-01',
        kind: 'client',
        tags: ['web', 'saas'],
        featured: true,
      },
      {
        ...base(1),
        title: 'Bibliothèque de composants accessibles',
        description:
          "Composants Vue conformes WCAG 2.2 AA, testés au lecteur d'écran. 4 000 téléchargements mensuels.",
        longDescription: '',
        image: '',
        video: '',
        technologies: ['Vue 3', 'TypeScript', 'Vitest'],
        demoUrl: '',
        repoUrl: 'https://github.com',
        startDate: '2022-05-01',
        endDate: '',
        kind: 'open-source',
        tags: ['open-source', 'librairie'],
        featured: true,
      },
      {
        ...base(2),
        title: 'Tableau de bord temps réel',
        description:
          "Visualisation de métriques industrielles à la seconde, sur 200 capteurs simultanés.",
        longDescription: '',
        image: '',
        video: '',
        technologies: ['Vue 3', 'WebSocket', 'D3.js', 'Redis'],
        demoUrl: '',
        repoUrl: '',
        startDate: '2021-09-01',
        endDate: '2022-04-01',
        kind: 'client',
        tags: ['web', 'data'],
        featured: false,
      },
      {
        ...base(3),
        title: 'Générateur de sites statiques',
        description:
          "Outil personnel de génération de sites depuis Markdown, avec rechargement à chaud instantané.",
        longDescription: '',
        image: '',
        video: '',
        technologies: ['Node.js', 'TypeScript', 'Vite'],
        demoUrl: '',
        repoUrl: 'https://github.com',
        startDate: '2020-02-01',
        endDate: '2020-11-01',
        kind: 'personnel',
        tags: ['open-source', 'outil'],
        featured: false,
      },
    ],
  },

  experience: {
    enabled: true,
    title: 'Expérience',
    subtitle: 'Mon parcours professionnel',
    items: [
      {
        ...base(0),
        company: 'Studio Numérique',
        role: 'Lead Développeur Front-end',
        location: 'Lyon',
        startDate: '2021-03',
        endDate: '',
        current: true,
        description:
          "Je pilote l'architecture front-end de l'agence et j'encadre une équipe de cinq développeurs.",
        achievements: [
          'Migration de 12 projets vers Vue 3 sans interruption de service',
          'Temps de chargement moyen divisé par trois',
          "Mise en place d'une bibliothèque de composants partagée",
        ],
        technologies: ['Vue 3', 'TypeScript', 'Vite', 'Node.js'],
        logo: '',
      },
      {
        ...base(1),
        company: 'TechCorp',
        role: 'Développeur Full-Stack',
        location: 'Paris',
        startDate: '2017-06',
        endDate: '2021-02',
        current: false,
        description:
          "Développement d'une plateforme SaaS B2B utilisée par 40 000 utilisateurs.",
        achievements: [
          'Refonte complète du parcours d\'inscription (+28 % de conversion)',
          'Réduction de 60 % du temps de build',
        ],
        technologies: ['Vue 2', 'Node.js', 'PostgreSQL', 'Docker'],
        logo: '',
      },
      {
        ...base(2),
        company: 'Freelance',
        role: 'Développeur Web',
        location: 'À distance',
        startDate: '2013-01',
        endDate: '2017-05',
        current: false,
        description:
          "Sites vitrines, e-commerce et applications métier pour des PME et des associations.",
        achievements: ['Plus de 40 projets livrés', 'Taux de reconduction de 80 %'],
        technologies: ['PHP', 'JavaScript', 'MySQL'],
        logo: '',
      },
    ],
  },

  education: {
    enabled: true,
    title: 'Formation',
    subtitle: '',
    items: [
      {
        ...base(0),
        school: 'INSA Lyon',
        degree: "Diplôme d'ingénieur",
        field: 'Informatique',
        startYear: '2009',
        endYear: '2014',
        description: "Spécialisation en génie logiciel et systèmes distribués.",
        logo: '',
      },
      {
        ...base(1),
        school: 'Université Lyon 1',
        degree: 'Licence',
        field: 'Mathématiques et Informatique',
        startYear: '2006',
        endYear: '2009',
        description: '',
        logo: '',
      },
    ],
  },

  testimonials: {
    enabled: true,
    title: 'Témoignages',
    subtitle: 'Ce qu\'en disent celles et ceux avec qui j\'ai travaillé',
    items: [
      {
        ...base(0),
        name: 'Camille Bernard',
        role: 'Directrice produit',
        company: 'TechCorp',
        photo: '',
        quote:
          "Alex a cette qualité rare : il comprend le problème métier avant d'écrire une ligne de code. Le résultat est toujours plus simple que ce qu'on avait imaginé.",
        rating: 5,
      },
      {
        ...base(1),
        name: 'Julien Petit',
        role: 'CTO',
        company: 'Studio Numérique',
        photo: '',
        quote:
          "La migration Vue 3 s'annonçait comme un cauchemar. Elle s'est faite en trois mois, sans une seule interruption. Du travail d'orfèvre.",
        rating: 5,
      },
      {
        ...base(2),
        name: 'Sarah Lambert',
        role: 'Présidente',
        company: 'Association Horizon',
        photo: '',
        quote:
          "Nous n'avons aucune compétence technique. Alex a construit un outil que nos bénévoles utilisent sans jamais nous appeler à l'aide. C'est la meilleure preuve.",
        rating: 5,
      },
    ],
  },

  articles: { enabled: true, title: 'Articles', subtitle: '', items: [] },

  timeline: {
    enabled: true,
    title: 'Parcours',
    subtitle: 'Les étapes qui comptent',
    items: [
      { ...base(0), date: '2013', title: 'Premiers pas en freelance', description: "Premier client, premier vrai cahier des charges.", icon: '' },
      { ...base(1), date: '2017', title: 'Entrée chez TechCorp', description: "Passage à l'échelle : 40 000 utilisateurs.", icon: '' },
      { ...base(2), date: '2021', title: 'Lead développeur', description: "Encadrement d'équipe et responsabilité d'architecture.", icon: '' },
      { ...base(3), date: '2024', title: 'Bibliothèque open-source', description: '4 000 téléchargements mensuels.', icon: '' },
    ],
  },

  gallery: { enabled: true, title: 'Galerie', subtitle: '', items: [] },

  contact: {
    enabled: true,
    title: 'Contact',
    subtitle: "Un projet, une question, ou juste envie d'échanger ?",
    email: 'alex.moreau@exemple.com',
    phone: '+33 6 12 34 56 78',
    address: 'Lyon, France',
    mapEmbed: '',
    formEnabled: true,
    socialLinks: [
      { ...base(0), platform: 'GitHub', url: 'https://github.com', icon: 'github' },
      { ...base(1), platform: 'LinkedIn', url: 'https://linkedin.com', icon: 'briefcase' },
      { ...base(2), platform: 'Mastodon', url: 'https://mastodon.social', icon: 'message-circle' },
    ],
  },

  // Section créée dynamiquement : la preuve que le mécanisme fonctionne.
  customSections: [
    {
      id: id(),
      name: 'Certifications',
      slug: 'certifications',
      icon: 'award',
      enabled: true,
      order: 0,
      layout: 'cards',
      fields: [
        { name: 'nom', label: 'Certification', type: 'text', required: true, role: 'title' },
        { name: 'organisme', label: 'Organisme', type: 'text', required: true, role: 'subtitle' },
        { name: 'date', label: "Date d'obtention", type: 'date', required: false },
        { name: 'lien', label: 'Vérifier', type: 'url', required: false, role: 'link' },
      ],
      items: [
        {
          id: id(),
          order: 0,
          enabled: true,
          archived: false,
          data: {
            nom: 'Certified Kubernetes Application Developer',
            organisme: 'Cloud Native Computing Foundation',
            date: '2023-09-14',
            lien: 'https://exemple.com',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: id(),
          order: 1,
          enabled: true,
          archived: false,
          data: {
            nom: 'Accessibilité numérique — RGAA',
            organisme: 'Access42',
            date: '2022-04-02',
            lien: '',
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    },
  ],

  design: {
    active: 'dark-matter',
    autoRotate: true,
    // Rotation : un thème par mois, sur les douze thèmes principaux.
    schedule: {
      '1': 'neon-pulse',
      '2': 'minimalist-white',
      '3': 'dark-matter',
      '4': 'glassmorphism',
      '5': 'gradient-flow',
      '6': 'retro-wave',
      '7': 'nature-organic',
      '8': 'tech-blue',
      '9': 'art-deco',
      '10': 'sakura',
      '11': 'corporate-pro',
      '12': 'futuristic',
    },
    customColors: {},
    customTypography: {},
    customCss: '',
    animationSpeed: 1,
    animationsEnabled: true,
  },

  seo: {
    title: 'Alex Moreau — Développeur Full-Stack',
    description:
      "Portfolio d'Alex Moreau, développeur full-stack spécialisé Vue.js et TypeScript. Douze ans d'expérience, 87 projets livrés.",
    keywords: 'développeur, full-stack, vue.js, typescript, node.js, lyon, freelance',
    ogImage: '',
    author: 'Alex Moreau',
    siteUrl: '',
  },

  analytics: { googleAnalyticsId: '', enableTracking: false },

  engagement: {
    likesEnabled: true,
    commentsEnabled: true,
    ratingsEnabled: true,
    commentsModerated: true,
    likeCountPublic: false,
  },

  branding: {
    logo: '',
    favicon: '',
    footerText: 'Construit avec soin, pour durer.',
  },
}

setConfig('portfolio', data)

// Copie lisible sur disque : utile comme référence et comme sauvegarde
// versionnable dans git, indépendamment de la base.
writeFileSync(
  resolve('./data/portfolio-data.json'),
  JSON.stringify(data, null, 2) + '\n',
  'utf8',
)

console.log('✓ Données de démonstration insérées')
console.log('  → base : data/portfolio.db')
console.log('  → copie : data/portfolio-data.json')
