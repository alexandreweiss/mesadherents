import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET /api/transactions/[userId] - Get transactions for specific user (admin only)
export async function GET(
    request: NextRequest,
    { params }: { params: { userId: string } }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        // Admin can view any user's transactions, regular users can only view their own
        const targetUserId = session.user.role === 'ADMIN' ? params.userId : session.user.id

        if (session.user.role !== 'ADMIN' && targetUserId !== session.user.id) {
            return NextResponse.json(
                { error: 'Forbidden - Can only view your own transactions' },
                { status: 403 }
            )
        }

        const transactions = await prisma.transaction.findMany({
            where: { userId: targetUserId },
            include: {
                product: true,
                session: true
            },
            orderBy: { createdAt: 'desc' },
            take: 20 // Limit to recent 20 transactions
        })

        const payments = await prisma.payment.findMany({
            where: { userId: targetUserId },
            include: {
                session: true
            },
            orderBy: { createdAt: 'desc' },
            take: 20 // Limit to recent 20 payments
        })

        // Combine transactions and payments into a unified history
        const history = [
            ...transactions.map(t => ({
                id: t.id,
                type: 'transaction' as const,
                quantity: t.quantity,
                totalAmount: t.totalAmount,
                createdAt: t.createdAt,
                product: {
                    name: t.product.name,
                    price: t.product.price,
                    category: t.product.category
                }
            })),
            ...payments.map(p => ({
                id: p.id,
                type: 'payment' as const,
                amount: p.amount,
                paymentType: p.type,
                createdAt: p.createdAt
            }))
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 20) // Take only the 20 most recent items

        return NextResponse.json(history)
    } catch (error) {
        console.error('Error fetching user transactions:', error)
        return NextResponse.json(
            { error: 'Failed to fetch transactions' },
            { status: 500 }
        )
    }
}