const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: 'securelab04@gmail.com' }
    });
    console.log("USER IN DB:", user);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
