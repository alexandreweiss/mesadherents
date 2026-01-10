'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface Transaction {
    id: string
    quantity: number
    totalAmount: number
    createdAt: string
    product: {
        name: string
        price: number
    }
}

export default function RecentTransactions() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchTransactions()
    }, [])

    const fetchTransactions = async () => {
        try {
            const response = await fetch('/api/transactions')
            const data = await response.json()
            setTransactions(data.slice(0, 5)) // Show only last 5 transactions
        } catch (error) {
            console.error('Error fetching transactions:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Dernières consommations</CardTitle>
                </CardHeader>
                <CardContent>
                    <div>Chargement...</div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Dernières consommations</CardTitle>
            </CardHeader>
            <CardContent>
                {transactions.length === 0 ? (
                    <div className="text-gray-500 text-center">
                        Aucune consommation récente
                    </div>
                ) : (
                    <div className="space-y-3">
                        {transactions.map((transaction) => (
                            <div
                                key={transaction.id}
                                className="flex justify-between items-center py-2 border-b last:border-b-0"
                            >
                                <div>
                                    <div className="font-medium">{transaction.product.name}</div>
                                    <div className="text-sm text-gray-600">
                                        {new Date(transaction.createdAt).toLocaleDateString('fr-FR')} • Qté: {transaction.quantity}
                                    </div>
                                </div>
                                <div className="text-red-600 font-medium">
                                    -{transaction.totalAmount.toFixed(2)}€
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}