'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface User {
    id: string
    name: string
    email: string
    balance: number
    role: string
    isActive: boolean
}

interface Product {
    id: string
    name: string
    price: number
    category: string
    isActive: boolean
}

interface Transaction {
    id: string
    type: 'transaction' | 'payment'
    quantity?: number
    totalAmount?: number
    amount?: number
    paymentType?: string
    createdAt: string
    product?: {
        name: string
        price: number
        category: string
    }
}

export default function AdminConsumption() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [products, setProducts] = useState<Product[]>([])
    const [selectedUser, setSelectedUser] = useState<User | null>(null)
    const [userTransactions, setUserTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [loadingTransactions, setLoadingTransactions] = useState(false)
    const [processing, setProcessing] = useState<{ [key: string]: boolean }>({})

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        } else if (session?.user?.role !== 'ADMIN') {
            router.push('/dashboard')
        } else {
            fetchData()
        }
    }, [status, session, router])

    const fetchData = async () => {
        try {
            const [usersResponse, productsResponse] = await Promise.all([
                fetch('/api/users'),
                fetch('/api/products')
            ])

            if (usersResponse.ok && productsResponse.ok) {
                const [usersData, productsData] = await Promise.all([
                    usersResponse.json(),
                    productsResponse.json()
                ])

                setUsers(usersData.filter((u: User) => u.isActive && u.role === 'MEMBER'))
                setProducts(productsData.filter((p: Product) => p.isActive))
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchTransactions = async (userId: string) => {
        setLoadingTransactions(true)
        try {
            const response = await fetch(`/api/transactions/${userId}`)
            if (response.ok) {
                const data = await response.json()
                setUserTransactions(data)
            } else {
                console.error('Failed to fetch transactions')
                setUserTransactions([])
            }
        } catch (error) {
            console.error('Error fetching transactions:', error)
            setUserTransactions([])
        } finally {
            setLoadingTransactions(false)
        }
    }

    const handleUserSelect = (user: User) => {
        setSelectedUser(user)
        fetchTransactions(user.id)
    }

    const handleConsumption = async (productId: string, productName: string) => {
        if (!selectedUser) {
            alert('Veuillez sélectionner un membre')
            return
        }

        setProcessing(prev => ({ ...prev, [productId]: true }))

        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productId,
                    quantity: 1,
                    userId: selectedUser.id
                })
            })

            if (response.ok) {
                const transaction = await response.json()
                // Update user balance locally
                setUsers(prev => prev.map(user =>
                    user.id === selectedUser.id
                        ? { ...user, balance: user.balance - Number(transaction.totalAmount) }
                        : user
                ))
                // Update selected user balance
                setSelectedUser(prev => prev ? {
                    ...prev,
                    balance: prev.balance - Number(transaction.totalAmount)
                } : null)

                // Refresh transaction history
                fetchTransactions(selectedUser.id)

                alert(`${productName} enregistré pour ${selectedUser.name}`)
            } else {
                const error = await response.json()
                alert(`Erreur: ${error.error}`)
            }
        } catch (error) {
            console.error('Error recording consumption:', error)
            alert('Erreur lors de l\'enregistrement')
        } finally {
            setProcessing(prev => ({ ...prev, [productId]: false }))
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

    const drinks = products.filter(p => p.category === 'DRINK')
    const food = products.filter(p => p.category === 'FOOD')

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Enregistrer Consommations
                            </h1>
                            <p className="text-gray-600">
                                Administration - Enregistrement pour les membres
                            </p>
                        </div>
                        <div className="flex space-x-4">
                            <Button onClick={() => router.push('/admin/balances')} variant="outline">
                                Soldes
                            </Button>
                            <Button onClick={() => router.push('/admin/users')} variant="outline">
                                Membres
                            </Button>
                            <Button onClick={() => router.push('/dashboard')}>
                                Retour au Bar
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 space-y-6">
                {/* Member Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>1. Sélectionner le membre</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {users.map((user) => (
                                <Button
                                    key={user.id}
                                    onClick={() => handleUserSelect(user)}
                                    variant={selectedUser?.id === user.id ? "default" : "outline"}
                                    className="h-auto p-4 flex flex-col items-center space-y-1"
                                >
                                    <div className="font-medium">{user.name}</div>
                                    <div className={`text-sm ${Number(user.balance) >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {Number(user.balance).toFixed(2)}€
                                    </div>
                                </Button>
                            ))}
                        </div>
                        {users.length === 0 && (
                            <div className="text-center text-gray-500 py-8">
                                Aucun membre actif trouvé
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Selected Member Info */}
                {selectedUser && (
                    <Card className="border-blue-200 bg-blue-50">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-semibold text-lg">Membre sélectionné: {selectedUser.name}</div>
                                    <div className="text-sm text-gray-600">{selectedUser.email}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-600">Solde actuel</div>
                                    <div className={`text-xl font-bold ${Number(selectedUser.balance) >= 0 ? 'text-green-600' : 'text-red-600'
                                        }`}>
                                        {Number(selectedUser.balance).toFixed(2)}€
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Products Selection */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Drinks */}
                    <Card>
                        <CardHeader>
                            <CardTitle>2. Boissons</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-3">
                                {drinks.map((product) => (
                                    <Button
                                        key={product.id}
                                        onClick={() => handleConsumption(product.id, product.name)}
                                        disabled={!selectedUser || processing[product.id]}
                                        className="h-auto p-4 flex flex-col items-center space-y-1"
                                        variant="outline"
                                    >
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-sm text-blue-600">
                                            {Number(product.price).toFixed(2)}€
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Food */}
                    <Card>
                        <CardHeader>
                            <CardTitle>2. Nourriture</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-3">
                                {food.map((product) => (
                                    <Button
                                        key={product.id}
                                        onClick={() => handleConsumption(product.id, product.name)}
                                        disabled={!selectedUser || processing[product.id]}
                                        className="h-auto p-4 flex flex-col items-center space-y-1"
                                        variant="outline"
                                    >
                                        <div className="font-medium">{product.name}</div>
                                        <div className="text-sm text-green-600">
                                            {Number(product.price).toFixed(2)}€
                                        </div>
                                    </Button>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Transaction History */}
                {selectedUser && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Historique - {selectedUser.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {loadingTransactions ? (
                                <div className="text-center py-4">
                                    <div>Chargement de l'historique...</div>
                                </div>
                            ) : userTransactions.length === 0 ? (
                                <div className="text-center text-gray-500 py-4">
                                    Aucune transaction trouvée
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-5 gap-4 font-semibold text-sm text-gray-600 border-b pb-2">
                                        <div>Date</div>
                                        <div>Type</div>
                                        <div>Description</div>
                                        <div>Quantité</div>
                                        <div>Montant</div>
                                    </div>
                                    {userTransactions.slice(0, 10).map((item) => (
                                        <div key={item.id} className="grid grid-cols-5 gap-4 text-sm py-2 border-b border-gray-100">
                                            <div className="text-gray-600">
                                                {new Date(item.createdAt).toLocaleDateString('fr-FR', {
                                                    day: '2-digit',
                                                    month: '2-digit',
                                                    year: '2-digit',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                            <div className={`font-medium text-xs px-2 py-1 rounded-full inline-block ${item.type === 'transaction'
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-green-100 text-green-700'
                                                }`}>
                                                {item.type === 'transaction' ? 'Achat' : 'Paiement'}
                                            </div>
                                            <div className="font-medium">
                                                {item.type === 'transaction' && item.product
                                                    ? item.product.name
                                                    : item.type === 'payment'
                                                        ? `Rechargement (${item.paymentType})`
                                                        : 'N/A'
                                                }
                                            </div>
                                            <div>
                                                {item.type === 'transaction' ? item.quantity || 1 : '-'}
                                            </div>
                                            <div className={`font-semibold ${item.type === 'transaction' ? 'text-red-600' : 'text-green-600'
                                                }`}>
                                                {item.type === 'transaction'
                                                    ? `-${Number(item.totalAmount || 0).toFixed(2)}€`
                                                    : `+${Number(item.amount || 0).toFixed(2)}€`
                                                }
                                            </div>
                                        </div>
                                    ))}
                                    {userTransactions.length > 10 && (
                                        <div className="text-center text-sm text-gray-500 pt-2">
                                            ... et {userTransactions.length - 10} autres entrées
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Instructions */}
                <Card className="border-gray-200 bg-gray-50">
                    <CardContent className="p-4">
                        <h3 className="font-semibold mb-2">Instructions:</h3>
                        <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                            <li>Sélectionnez d'abord le membre dans la liste ci-dessus</li>
                            <li>Cliquez ensuite sur le produit consommé</li>
                            <li>La consommation sera automatiquement débitée du compte du membre</li>
                            <li>Le solde du membre sera mis à jour en temps réel</li>
                        </ol>
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}