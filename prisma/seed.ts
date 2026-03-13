import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;

if (databaseUrl === undefined || databaseUrl.trim().length === 0) {
  throw new Error("DATABASE_URL is required");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

const channels = [
  {
    id: "channel-1",
    username: "@tonnewsdaily",
    title: "TON News Daily",
    category: "crypto",
    price: 12,
    avgViews: 18000
  },
  {
    id: "channel-2",
    username: "@web3foundershub",
    title: "Web3 Founders Hub",
    category: "startups",
    price: 20,
    avgViews: 26000
  },
  {
    id: "channel-3",
    username: "@telegramgrowthlab",
    title: "Telegram Growth Lab",
    category: "marketing",
    price: 8,
    avgViews: 11000
  }
];

const main = async (): Promise<void> => {
  for (const channel of channels) {
    await prisma.channel.upsert({
      where: { id: channel.id },
      update: {
        username: channel.username,
        title: channel.title,
        category: channel.category,
        price: channel.price,
        avgViews: channel.avgViews
      },
      create: channel
    });
  }
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
