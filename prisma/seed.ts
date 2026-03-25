import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  throw new Error("DATABASE_URL is required");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const devChannels = [
  {
    id: "seed-tonnewsdaily",
    title: "TON News Daily",
    username: "tonnewsdaily",
    description: "Daily updates from the TON ecosystem",
    category: "crypto",
    price: 50,
    avgViews: 3200,
  },
  {
    id: "seed-web3foundershub",
    title: "Web3 Founders Hub",
    username: "web3foundershub",
    description: "Community for Web3 builders and founders",
    category: "web3",
    price: 35,
    avgViews: 1800,
  },
  {
    id: "seed-telegramgrowthlab",
    title: "Telegram Growth Lab",
    username: "telegramgrowthlab",
    description: "Growth strategies for Telegram channels",
    category: "marketing",
    price: 45,
    avgViews: 2500,
  },
  {
    id: "seed-tontestyshmestyhackaton",
    title: "TON Test Hackathon",
    username: "tontestyshmestyhackaton",
    description: "TON hackathon test channel for integration testing",
    category: "crypto",
    price: 30,
    avgViews: 500,
  },
];

const main = async (): Promise<void> => {
  for (const channel of devChannels) {
    await prisma.channel.upsert({
      where: { username: channel.username },
      update: {
        title: channel.title,
        description: channel.description,
        category: channel.category,
        price: channel.price,
        avgViews: channel.avgViews,
      },
      create: channel,
    });
  }

  console.info(`Seeded ${devChannels.length} development channels.`);
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
