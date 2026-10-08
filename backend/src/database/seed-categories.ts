import { Sequelize } from 'sequelize-typescript';
import { User } from '../users/models/user.model';
import { OtpCode } from '../auth/models/otp-code.model';
import { Category } from '../categories/models/category.model';
import { Event } from '../events/models/event.model';
import { Registration } from '../registrations/models/registration.model';
import { Notification } from '../notifications/models/notification.model';
import * as dotenv from 'dotenv';
dotenv.config();

const categoriesToSeed = [
  {
    name: 'Technology & AI',
    slug: 'technology-ai',
    description: 'Conferences, meetups, and workshops in AI, Machine Learning, and Computing.',
    icon: 'cpu-chip',
  },
  {
    name: 'Design & UX',
    slug: 'design-ux',
    description: 'UI, UX, and product design workshops, portfolio reviews, and creative sessions.',
    icon: 'palette',
  },
  {
    name: 'Web & Cloud Engineering',
    slug: 'web-cloud-engineering',
    description: 'Cloud computing, DevOps, Kubernetes, serverless, and modern web architectures.',
    icon: 'cloud',
  },
  {
    name: 'Cybersecurity & Privacy',
    slug: 'cybersecurity-privacy',
    description: 'Information security, ethical hacking, cryptography, and data privacy conferences.',
    icon: 'shield',
  },
  {
    name: 'Data Science & Big Data',
    slug: 'data-science-big-data',
    description: 'Data analytics, machine learning pipelines, business intelligence, and statistics.',
    icon: 'database',
  },
  {
    name: 'Mobile & App Development',
    slug: 'mobile-app-development',
    description: 'iOS, Android, React Native, Flutter, and cross-platform mobile engineering.',
    icon: 'smartphone',
  },
  {
    name: 'Blockchain & Web3',
    slug: 'blockchain-web3',
    description: 'Smart contracts, decentralized finance, crypto economics, and distributed ledgers.',
    icon: 'cpu',
  },
  {
    name: 'Product Management',
    slug: 'product-management',
    description: 'Product strategy, roadmapping, agile methodologies, and product discovery.',
    icon: 'briefcase',
  },
  {
    name: 'Startup & Entrepreneurship',
    slug: 'startup-entrepreneurship',
    description: 'Pitch competitions, venture capital, scaling tech ventures, and founder meetups.',
    icon: 'rocket',
  },
  {
    name: 'Music & Live Concerts',
    slug: 'music-live-concerts',
    description: 'Live music festivals, acoustic sessions, electronic beats, and artist showcases.',
    icon: 'music',
  },
  {
    name: 'Photography & Film',
    slug: 'photography-film',
    description: 'Cinematography, visual storytelling, digital photography, and film screenings.',
    icon: 'camera',
  },
  {
    name: 'Gaming & Esports',
    slug: 'gaming-esports',
    description: 'Competitive esports tournaments, game development jams, and indie game expos.',
    icon: 'gamepad-2',
  },
  {
    name: 'Health & Wellness',
    slug: 'health-wellness',
    description: 'Fitness bootcamps, mental health workshops, yoga retreats, and holistic well-being.',
    icon: 'heart',
  },
  {
    name: 'Science & Space Exploration',
    slug: 'science-space-exploration',
    description: 'Astronomy, physics symposiums, biotech breakthroughs, and scientific research.',
    icon: 'compass',
  },
  {
    name: 'Business & Finance',
    slug: 'business-finance',
    description: 'Fintech innovations, investing summits, economic forums, and corporate leadership.',
    icon: 'trending-up',
  },
  {
    name: 'Arts & Culture',
    slug: 'arts-culture',
    description: 'Art gallery exhibitions, theatre productions, literature festivals, and heritage.',
    icon: 'palette',
  },
  {
    name: 'Food & Culinary Arts',
    slug: 'food-culinary-arts',
    description: 'Chef masterclasses, wine tastings, culinary tours, and street food festivals.',
    icon: 'utensils',
  },
  {
    name: 'Career & Networking',
    slug: 'career-networking',
    description: 'Job fairs, professional networking mixers, mentoring circles, and industry meetups.',
    icon: 'users',
  },
];

async function seed() {
  const sequelize = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME || 'janvi',
    password: process.env.DB_PASSWORD || 'your_password',
    database: process.env.DB_DATABASE || 'eventhub_db',
    models: [User, OtpCode, Category, Event, Registration, Notification],
    logging: false,
  });

  try {
    await sequelize.authenticate();
    console.log('Connected to database for category seeding...');

    let inserted = 0;
    for (const cat of categoriesToSeed) {
      const [record, created] = await Category.findOrCreate({
        where: { slug: cat.slug },
        defaults: cat,
      });
      if (created) {
        inserted++;
        console.log(`+ Created category: "${record.name}" (${record.slug})`);
      } else {
        console.log(`= Existing category: "${record.name}"`);
      }
    }

    console.log(`\nCategory seeding complete! Total: ${categoriesToSeed.length} | Newly inserted: ${inserted}`);
  } catch (err) {
    console.error('Error seeding categories:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

seed();
