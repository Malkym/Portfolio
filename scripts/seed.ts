/**
 * Données de démonstration.
 *
 *   npm run seed
 *
 * Persona fictive : un développeur basé à Bangui, en République
 * centrafricaine. Le contexte technique est cohérent avec cet environnement
 * (connexion instable, primauté du mobile, travail hors ligne), pour que la
 * démonstration ne soit pas un simple copier-coller de portfolio européen.
 *
 * Volontairement complet : toutes les sections sont remplies, y compris une
 * section dynamique « Certifications », pour que le portfolio soit
 * immédiatement présentable et que chaque fonctionnalité soit visible.
 *
 * ⚠ Remplacez ces données par les vôtres avant de publier : ce fichier est
 * versionné et devient le contenu réel du site.
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
    name: 'Landry Kongbo',
    title: 'Développeur Full-Stack',
    bio: "Je construis des applications web qui tiennent debout là où le réseau ne tient pas. Neuf ans à Bangui, à faire tourner du logiciel utile dans des conditions difficiles.",
    photo: '',
    email: 'landry.kongbo@exemple.cf',
    phone: '+236 72 45 18 90',
    location: 'Bangui, République centrafricaine',
    resumeUrl: '',
  },

  hero: {
    subtitle:
      "Je conçois des outils pensés pour le terrain : légers, utilisables hors ligne, et compréhensibles dès la première fois. La contrainte n'est pas un handicap, c'est ce qui force à faire simple.",
    typedWords: [
      'Développeur Full-Stack',
      'Spécialiste hors-ligne',
      'Vue.js & TypeScript',
      'Bangui, Centrafrique',
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
    content: `<p>J'ai appris à programmer au cyber de l'avenue Boganda, en partageant une connexion avec quinze personnes. Cette contrainte a façonné toute ma façon de travailler : si une page met dix secondes à s'afficher, elle ne sert à personne.</p>
<p>Aujourd'hui je conçois des applications pour des ONG, des coopératives et des administrations en Centrafrique. Le point commun de ces projets : ils doivent fonctionner sur un téléphone d'entrée de gamme, avec une connexion qui disparaît sans prévenir, et être pris en main par quelqu'un qui n'a jamais utilisé de logiciel métier.</p>
<p>Je travaille surtout avec <strong>Vue 3</strong>, <strong>TypeScript</strong> et <strong>Node.js</strong>, avec une attention particulière au <strong>fonctionnement hors ligne</strong> et au poids réel des pages. Je choisis l'outil selon le problème — jamais l'inverse.</p>`,
    image: '',
    values: [
      'Ce qui ne marche pas hors ligne ne marche pas',
      'Chaque kilo-octet se paie en crédit téléphonique',
      "Un outil qu'on doit expliquer est un outil raté",
      'Livrer vaut mieux que perfectionner',
    ],
  },

  stats: {
    enabled: true,
    title: 'En chiffres',
    subtitle: '',
    items: [
      { ...base(0), label: "Années d'expérience", value: 9, suffix: '', icon: 'hourglass' },
      { ...base(1), label: 'Projets livrés', value: 41, suffix: '', icon: 'rocket' },
      { ...base(2), label: 'Organisations accompagnées', value: 18, suffix: '', icon: 'handshake' },
      { ...base(3), label: 'Développeurs formés', value: 60, suffix: '+', icon: 'heart' },
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
          { id: id(), name: 'Vue.js 3', level: 'Expert', score: 94, icon: '', order: 0 },
          { id: id(), name: 'TypeScript', level: 'Senior', score: 88, icon: '', order: 1 },
          { id: id(), name: 'PWA & hors-ligne', level: 'Expert', score: 92, icon: '', order: 2 },
          { id: id(), name: 'CSS / Tailwind', level: 'Senior', score: 86, icon: '', order: 3 },
          { id: id(), name: 'Accessibilité (WCAG)', level: 'Mid', score: 70, icon: '', order: 4 },
        ],
      },
      {
        ...base(1),
        name: 'Back-end',
        icon: 'settings',
        skills: [
          { id: id(), name: 'Node.js', level: 'Senior', score: 87, icon: '', order: 0 },
          { id: id(), name: 'PHP / Laravel', level: 'Senior', score: 84, icon: '', order: 1 },
          { id: id(), name: 'SQLite & PostgreSQL', level: 'Senior', score: 85, icon: '', order: 2 },
          { id: id(), name: 'API REST', level: 'Expert', score: 90, icon: '', order: 3 },
        ],
      },
      {
        ...base(2),
        name: 'Contraintes de terrain',
        icon: 'wrench',
        skills: [
          { id: id(), name: 'Synchronisation différée', level: 'Expert', score: 93, icon: '', order: 0 },
          { id: id(), name: 'Optimisation basse bande passante', level: 'Expert', score: 91, icon: '', order: 1 },
          { id: id(), name: 'Passerelles SMS / USSD', level: 'Senior', score: 78, icon: '', order: 2 },
          { id: id(), name: 'Déploiement sur serveur local', level: 'Senior', score: 80, icon: '', order: 3 },
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
        title: 'Coordination humanitaire hors ligne',
        description:
          "Outil de suivi des distributions pour un collectif d'ONG. Les équipes saisissent sur le terrain sans réseau ; les données se synchronisent au retour à Bangui.",
        longDescription: '',
        image: '',
        video: '',
        technologies: ['Vue 3', 'TypeScript', 'IndexedDB', 'Node.js', 'PostgreSQL'],
        demoUrl: '',
        repoUrl: '',
        startDate: '2023-02-01',
        endDate: '2024-08-01',
        kind: 'client',
        tags: ['hors-ligne', 'humanitaire'],
        featured: true,
      },
      {
        ...base(1),
        title: 'Gestion pour coopérative agricole',
        description:
          "Suivi des livraisons et des paiements pour une coopérative caféière de la Lobaye. Interface en français et en sango, utilisable sur téléphone à petit écran.",
        longDescription: '',
        image: '',
        video: '',
        technologies: ['Vue 3', 'Laravel', 'MySQL'],
        demoUrl: '',
        repoUrl: '',
        startDate: '2022-04-01',
        endDate: '2023-01-01',
        kind: 'client',
        tags: ['agriculture', 'mobile'],
        featured: true,
      },
      {
        ...base(2),
        title: 'Portail de préinscription universitaire',
        description:
          "Préinscription en ligne pour une faculté de Bangui : 4 000 dossiers traités sur la première rentrée, contre des files d'attente de plusieurs jours auparavant.",
        longDescription: '',
        image: '',
        video: '',
        technologies: ['Vue 3', 'Node.js', 'PostgreSQL', 'Docker'],
        demoUrl: '',
        repoUrl: '',
        startDate: '2021-05-01',
        endDate: '2021-11-01',
        kind: 'client',
        tags: ['éducation', 'web'],
        featured: false,
      },
      {
        ...base(3),
        title: 'Composants légers pour connexion lente',
        description:
          "Bibliothèque Vue de composants pesant moins de 15 Ko au total, conçus pour des pages qui s'affichent en 2G. Utilisée par plusieurs équipes en Afrique centrale.",
        longDescription: '',
        image: '',
        video: '',
        technologies: ['Vue 3', 'TypeScript', 'Vite'],
        demoUrl: '',
        repoUrl: 'https://github.com',
        startDate: '2020-06-01',
        endDate: '',
        kind: 'open-source',
        tags: ['open-source', 'performance'],
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
        company: 'Bêafrîka Digital',
        role: 'Lead développeur',
        location: 'Bangui',
        startDate: '2021-04',
        endDate: '',
        current: true,
        description:
          "Je pilote l'architecture technique de l'agence et j'encadre une équipe de quatre développeurs.",
        achievements: [
          'Mise en place du fonctionnement hors ligne sur six applications clientes',
          'Poids moyen des pages réduit de 1,8 Mo à 240 Ko',
          "Programme interne de formation : douze développeurs juniors accompagnés",
        ],
        technologies: ['Vue 3', 'TypeScript', 'Node.js', 'Docker'],
        logo: '',
      },
      {
        ...base(1),
        company: 'Oubangui Solutions',
        role: 'Développeur full-stack',
        location: 'Bangui',
        startDate: '2018-09',
        endDate: '2021-03',
        current: false,
        description:
          "Développement d'applications de gestion pour des ONG et des administrations centrafricaines.",
        achievements: [
          'Portail de préinscription universitaire, 4 000 dossiers la première année',
          'Migration de trois applications vers une architecture synchronisable',
        ],
        technologies: ['Vue 2', 'Laravel', 'MySQL'],
        logo: '',
      },
      {
        ...base(2),
        company: 'Indépendant',
        role: 'Développeur web',
        location: 'Bangui',
        startDate: '2016-01',
        endDate: '2018-08',
        current: false,
        description:
          'Sites vitrines et petits outils de gestion pour des commerces et associations de Bangui.',
        achievements: ['Une vingtaine de projets livrés', 'Formation des clients à leur propre outil'],
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
        school: 'Université de Bangui',
        degree: 'Licence',
        field: 'Informatique',
        startYear: '2013',
        endYear: '2016',
        description: "Spécialisation en génie logiciel et bases de données.",
        logo: '',
      },
      {
        ...base(1),
        school: 'Lycée Barthélemy Boganda',
        degree: 'Baccalauréat',
        field: 'Série C — Mathématiques et sciences physiques',
        startYear: '2010',
        endYear: '2013',
        description: '',
        logo: '',
      },
    ],
  },

  testimonials: {
    enabled: true,
    title: 'Témoignages',
    subtitle: "Ce qu'en disent celles et ceux avec qui j'ai travaillé",
    items: [
      {
        ...base(0),
        name: 'Nadège Sepou',
        role: 'Coordinatrice programmes',
        company: 'Collectif humanitaire Ouham',
        photo: '',
        quote:
          "Nos équipes travaillent dans des zones sans réseau. Landry est le premier à nous avoir proposé un outil qui en tient compte au lieu de nous demander de nous adapter.",
        rating: 5,
      },
      {
        ...base(1),
        name: 'Clotaire Zoumara',
        role: 'Directeur technique',
        company: 'Bêafrîka Digital',
        photo: '',
        quote:
          "Il ne livre jamais une fonctionnalité sans l'avoir testée sur un téléphone bas de gamme en 2G. Ça paraît évident, presque personne ne le fait.",
        rating: 5,
      },
      {
        ...base(2),
        name: 'Prisca Ndoto',
        role: 'Présidente',
        company: 'Coopérative caféière de la Lobaye',
        photo: '',
        quote:
          "Nos membres ne sont pas informaticiens. Ils utilisent l'application depuis deux ans sans jamais nous appeler à l'aide. C'est la meilleure preuve.",
        rating: 5,
      },
    ],
  },

  articles: { enabled: false, title: 'Articles', subtitle: '', items: [] },

  timeline: {
    enabled: true,
    title: 'Parcours',
    subtitle: 'Les étapes qui comptent',
    items: [
      {
        ...base(0),
        date: '2016',
        title: 'Premiers clients à Bangui',
        description: "Licence en poche, premiers sites pour des commerces du centre-ville.",
        icon: '',
      },
      {
        ...base(1),
        date: '2018',
        title: 'Entrée chez Oubangui Solutions',
        description: 'Passage aux projets institutionnels et humanitaires.',
        icon: '',
      },
      {
        ...base(2),
        date: '2021',
        title: 'Lead développeur',
        description: "Responsabilité d'architecture et encadrement d'équipe.",
        icon: '',
      },
      {
        ...base(3),
        date: '2024',
        title: 'Formation de la relève',
        description: 'Plus de soixante développeurs formés en Afrique centrale.',
        icon: '',
      },
    ],
  },

  gallery: { enabled: false, title: 'Galerie', subtitle: '', items: [] },

  contact: {
    enabled: true,
    title: 'Contact',
    subtitle: "Un projet, une question, ou juste envie d'échanger ?",
    email: 'landry.kongbo@exemple.cf',
    phone: '+236 72 45 18 90',
    address: 'Bangui, République centrafricaine',
    mapEmbed: '',
    formEnabled: true,
    socialLinks: [
      { ...base(0), platform: 'GitHub', url: 'https://github.com', icon: 'github' },
      { ...base(1), platform: 'LinkedIn', url: 'https://linkedin.com', icon: 'briefcase' },
      { ...base(2), platform: 'WhatsApp', url: 'https://wa.me/23672451890', icon: 'message-circle' },
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
            nom: 'Développement web progressif (PWA)',
            organisme: 'Google Africa Developer Scholarship',
            date: '2022-11-18',
            lien: '',
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
            nom: 'Gestion de données humanitaires',
            organisme: 'OCHA — Bureau régional Afrique centrale',
            date: '2023-06-05',
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
    title: 'Landry Kongbo — Développeur Full-Stack à Bangui',
    description:
      "Portfolio de Landry Kongbo, développeur full-stack basé à Bangui. Applications web hors ligne et optimisées pour les connexions lentes. Vue.js, TypeScript, Node.js.",
    keywords:
      'développeur, full-stack, bangui, centrafrique, vue.js, typescript, node.js, hors-ligne, pwa',
    ogImage: '',
    author: 'Landry Kongbo',
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
    footerText: 'Construit à Bangui, avec soin et pour durer.',
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
