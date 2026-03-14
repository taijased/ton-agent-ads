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
    id: "tontestyshmestyhackaton",
    username: "@tontestyshmestyhackaton",
    description: null,
    title: "TON Testy Shmesty Hackaton",
    category: "crypto",
    price: 8,
    avgViews: 11000
  },
];

const main = async (): Promise<void> => {
  await prisma.deal.deleteMany();
  await prisma.channel.deleteMany();

  await prisma.channel.createMany({
    data: channels
  });
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
