import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/transactions - Add item to current session
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { productId, quantity = 1 } = await request.json()

        if (!productId) {
            return NextResponse.json(
                { error: 'Product ID is required' },
                { status: 400 }
            )
        }

        // Get the product
        const product = await prisma.product.findUnique({
            where: { id: productId }
        })

        if (!product || !product.isActive) {
            return NextResponse.json(
                { error: 'Product not found' },
                { status: 404 }
            )
        }

        // Get or create current bar session
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        let barSession = await prisma.barSession.findFirst({
            where: {
                date: {
                    gte: today
                },
                isActive: true
            }
        })

        if (!barSession) {
            barSession = await prisma.barSession.create({
                data: {
                    date: new Date(),
                    isActive: true
                }
            })
        }

        // Create transaction
        const totalAmount = product.price * quantity

        const transaction = await prisma.transaction.create({
            data: {
                userId: session.user.id,
                productId,
                sessionId: barSession.id,
                quantity,
                unitPrice: product.price,
                totalAmount
            },
            include: {
                product: true
            }
        })

        // Update user balance
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                balance: {
                    decrement: totalAmount
                }
            }
        })

        return NextResponse.json(transaction)
    } catch (error) {
        console.error('Error creating transaction:', error)
        return NextResponse.json(
            { error: 'Failed to create transaction' },
            { status: 500 }
        )
    }
}

// GET /api/transactions - Get user's transactions
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const transactions = await prisma.transaction.findMany({
            where: { userId: session.user.id },
            include: {
                product: true,
                session: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        return NextResponse.json(transactions)
    } catch (error) {
        console.error('Error fetching transactions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch transactions' },
            { status: 500 }
        )
    }
}