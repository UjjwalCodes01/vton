import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://fabricvton_db_user:gk2ndfPb9hv8FUvUCkagH5MQGXll0qIy@dpg-d7h6ibtckfvc739r5vq0-a/fabricvton_db"
    }
  }
});
async function main() {
  const config = await prisma.shopConfig.findUnique({ where: { shop: "fabricvton-devstore.myshopify.com" } });
  console.log(config);
}
main().finally(() => prisma.$disconnect());
