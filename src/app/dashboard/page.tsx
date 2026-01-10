'use client'

import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import ProductGrid from '@/components/ProductGrid'
import UserBalance from '@/components/UserBalance'
import RecentTransactions from '@/components/RecentTransactions'
import PaymentDialog from '@/components/PaymentDialog'

export default function Dashboard() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [showPaymentDialog, setShowPaymentDialog] = useState(false)

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        }
    }, [status, router])

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div>Chargement...</div>
            </div>
        )
    }

    if (!session) {
        return null
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Bar de l&apos;Association
                            </h1>
                            <p className="text-gray-600">
                                Bonjour, {session.user?.name || session.user?.email}
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button
                                onClick={() => setShowPaymentDialog(true)}
                                variant="outline"
                            >
                                Payer
                            </Button>
                            <Button
                                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                                variant="outline"
                            >
                                Déconnexion
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Produits disponibles</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ProductGrid />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <UserBalance />
                        <RecentTransactions />
                    </div>
                </div>
            </main>

            <PaymentDialog
                open={showPaymentDialog}
                onOpenChange={setShowPaymentDialog}
            />
        </div>
    )
}