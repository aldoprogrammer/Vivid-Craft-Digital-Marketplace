import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@vividcraft.local';
  const password = process.env.ADMIN_PASSWORD || 'AdminPass123!';
  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      role: Role.ADMIN,
      isActive: true,
      name: 'VividCraft Admin',
    },
    create: {
      email,
      password: hashed,
      name: 'VividCraft Admin',
      role: Role.ADMIN,
      isActive: true,
      bio: 'Platform administrator',
    },
  });

  console.log(`Admin ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
