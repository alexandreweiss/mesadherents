import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    // Create admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@association.com'
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123'
    const hashedPassword = await bcrypt.hash(adminPassword, 12)

    const admin = await prisma.user.upsert({
        where: { email: adminEmail },
        update: {},
        create: {
            email: adminEmail,
            name: 'Administrator',
            role: 'ADMIN',
            balance: 0,
        },
    })

    // Create sample products
    const products = [
        { name: 'Bière', price: 2.5, category: 'DRINK' },
        { name: 'Vin rouge', price: 3.0, category: 'DRINK' },
        { name: 'Vin blanc', price: 3.0, category: 'DRINK' },
        { name: 'Soda', price: 2.0, category: 'DRINK' },
        { name: 'Eau', price: 1.0, category: 'DRINK' },
        { name: 'Café', price: 1.5, category: 'DRINK' },
        { name: 'Chips', price: 1.5, category: 'FOOD' },
        { name: 'Cacahuètes', price: 1.5, category: 'FOOD' },
        { name: 'Sandwich', price: 4.0, category: 'FOOD' },
        { name: 'Pizza slice', price: 3.5, category: 'FOOD' },
    ]

    for (const product of products) {
        const existingProduct = await prisma.product.findFirst({
            where: { name: product.name },
        })

        if (!existingProduct) {
            await prisma.product.create({
                data: product,
            })
        }
    }

    console.log('Database seeded successfully!')
    console.log(`Admin user: ${adminEmail}`)
    console.log(`Admin password: ${adminPassword}`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })