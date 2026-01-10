'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface User {
    id: string
    name: string
    email: string
    balance: number
    role: string
    isActive: boolean
    createdAt: string
}

export default function AdminBalances() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [paymentAmounts, setPaymentAmounts] = useState<{ [key: string]: string }>({})
    const [processingPayments, setProcessingPayments] = useState<{ [key: string]: boolean }>({})

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        } else if (session?.user?.role !== 'ADMIN') {
            router.push('/dashboard')
        } else {
            fetchUsers()
        }
    }, [status, session, router])

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/users')
            if (response.ok) {
                const data = await response.json()
                setUsers(data)
            }
        } catch (error) {
            console.error('Error fetching users:', error)
        } finally {
            setLoading(false)
        }
    }

    const handlePaymentAmountChange = (userId: string, amount: string) => {
        setPaymentAmounts(prev => ({ ...prev, [userId]: amount }))
    }

    const handlePayment = async (userId: string, userName: string) => {
        const amount = paymentAmounts[userId]
        if (!amount || parseFloat(amount) <= 0) {
            alert('Veuillez saisir un montant valide')
            return
        }

        setProcessingPayments(prev => ({ ...prev, [userId]: true }))

        try {
            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    type: 'CASH',
                    userId: userId
                })
            })

            if (response.ok) {
                // Update the user balance locally
                setUsers(prev => prev.map(user =>
                    user.id === userId
                        ? { ...user, balance: user.balance + parseFloat(amount) }
                        : user
                ))
                // Clear the amount input
                setPaymentAmounts(prev => ({ ...prev, [userId]: '' }))
                alert(`Paiement de ${amount}€ effectué pour ${userName}`)
            } else {
                const error = await response.json()
                alert(`Erreur: ${error.error}`)
            }
        } catch (error) {
            console.error('Error processing payment:', error)
            alert('Erreur lors du traitement du paiement')
        } finally {
            setProcessingPayments(prev => ({ ...prev, [userId]: false }))
        }
    }

    if (status === 'loading' || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div>Chargement...</div>
            </div>
        )
    }

    if (!session || session.user.role !== 'ADMIN') {
        return null
    }

    const activeMembers = users.filter(user => user.isActive && user.role === 'MEMBER')
    const totalBalance = activeMembers.reduce((sum, user) => sum + Number(user.balance), 0)

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Gestion des Soldes
                            </h1>
                            <p className="text-gray-600">
                                Administration des paiements membres
                            </p>
                        </div>
                        <div className="flex space-x-4">
                            <Button onClick={() => router.push('/admin/users')} variant="outline">
                                Gestion Membres
                            </Button>
                            <Button onClick={() => router.push('/dashboard')}>
                                Retour au Bar
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Summary Card */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Résumé</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{activeMembers.length}</div>
                                <div className="text-sm text-gray-600">Membres actifs</div>
                            </div>
                            <div className="text-center">
                                <div className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {totalBalance.toFixed(2)}€
                                </div>
                                <div className="text-sm text-gray-600">Solde total</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-orange-600">
                                    {activeMembers.filter(u => Number(u.balance) < 0).length}
                                </div>
                                <div className="text-sm text-gray-600">Comptes débiteurs</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Members Balance Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Soldes des membres</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full table-auto">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-2">Nom</th>
                                        <th className="text-left py-3 px-2">Email</th>
                                        <th className="text-right py-3 px-2">Solde actuel</th>
                                        <th className="text-center py-3 px-2">Montant</th>
                                        <th className="text-center py-3 px-2">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeMembers.map((user) => (
                                        <tr key={user.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-2 font-medium">{user.name}</td>
                                            <td className="py-3 px-2 text-gray-600 text-sm">{user.email}</td>
                                            <td className={`py-3 px-2 text-right font-bold ${Number(user.balance) >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {Number(user.balance).toFixed(2)}€
                                            </td>
                                            <td className="py-3 px-2">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0.01"
                                                    placeholder="Montant"
                                                    value={paymentAmounts[user.id] || ''}
                                                    onChange={(e) => handlePaymentAmountChange(user.id, e.target.value)}
                                                    className="w-24"
                                                    disabled={processingPayments[user.id]}
                                                />
                                            </td>
                                            <td className="py-3 px-2 text-center">
                                                <Button
                                                    onClick={() => handlePayment(user.id, user.name)}
                                                    disabled={!paymentAmounts[user.id] || processingPayments[user.id]}
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700"
                                                >
                                                    {processingPayments[user.id] ? 'Traitement...' : 'Payer'}
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {activeMembers.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                Aucun membre actif trouvé.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}