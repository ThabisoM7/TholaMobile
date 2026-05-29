const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function test() {
  try {
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('PostGIS enabled successfully!');
  } catch (e) {
    console.error('Failed to enable PostGIS:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
