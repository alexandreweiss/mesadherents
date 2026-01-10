import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST /api/payments - Make a payment
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { amount, type = 'CASH', sessionId } = await request.json()

        if (!amount || amount <= 0) {
            return NextResponse.json(
                { error: 'Invalid payment amount' },
                { status: 400 }
            )
        }

        // Create payment record
        const payment = await prisma.payment.create({
            data: {
                userId: session.user.id,
                amount: parseFloat(amount),
                type,
                sessionId
            }
        })

        // Update user balance
        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                balance: {
                    increment: parseFloat(amount)
                }
            }
        })

        return NextResponse.json(payment)
    } catch (error) {
        console.error('Error creating payment:', error)
        return NextResponse.json(
            { error: 'Failed to process payment' },
            { status: 500 }
        )
    }
}

// GET /api/payments - Get user's payments
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const payments = await prisma.payment.findMany({
            where: { userId: session.user.id },
            include: {
                session: true
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        return NextResponse.json(payments)
    } catch (error) {
        console.error('Error fetching payments:', error)
        return NextResponse.json(
            { error: 'Failed to fetch payments' },
            { status: 500 }
        )
    }
}