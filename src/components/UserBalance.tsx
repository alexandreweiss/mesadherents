'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

interface User {
    id: string
    name: string
    email: string
    balance: number
    role: string
}

export default function UserBalance() {
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchUser()
    }, [])

    const fetchUser = async () => {
        try {
            const response = await fetch('/api/user')
            const data = await response.json()
            setUser(data)
        } catch (error) {
            console.error('Error fetching user:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div>Chargement...</div>
                </CardContent>
            </Card>
        )
    }

    if (!user) {
        return null
    }

    const balanceColor = user.balance >= 0 ? 'text-green-600' : 'text-red-600'

    return (
        <Card>
            <CardHeader>
                <CardTitle>Solde de votre compte</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-center">
                    <div className={`text-2xl font-bold ${balanceColor}`}>
                        {user.balance.toFixed(2)}€
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                        {user.balance < 0 ? 'Solde débiteur' : 'Solde créditeur'}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}