import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const config = await prisma.shopConfig.findUnique({ where: { shop: "fabricvton-devstore.myshopify.com" } });
  console.log(config);
}
main().finally(() => prisma.$disconnect());
