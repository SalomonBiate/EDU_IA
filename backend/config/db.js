// backend/config/db.js
const { PrismaClient } = require('@prisma/client')

// Meilleure pratique : singleton pour éviter plusieurs instances Prisma
const globalForPrisma = globalThis

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

module.exports = prisma