'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface User {
    id: string
    name: string
    email: string
    balance: number
    role: string
    isActive: boolean
    createdAt: string
}

interface NewUser {
    name: string
    email: string
    role: string
    balance: number
}

export default function AdminUsers() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [newUser, setNewUser] = useState<NewUser>({
        name: '',
        email: '',
        role: 'MEMBER',
        balance: 0
    })
    const [creating, setCreating] = useState(false)

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

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)

        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newUser)
            })

            if (response.ok) {
                const createdUser = await response.json()
                setUsers([createdUser, ...users])
                setNewUser({ name: '', email: '', role: 'MEMBER', balance: 0 })
                setShowCreateForm(false)
                alert('Membre créé avec succès!')
            } else {
                const error = await response.json()
                alert(`Erreur: ${error.error}`)
            }
        } catch (error) {
            console.error('Error creating user:', error)
            alert('Erreur lors de la création du membre')
        } finally {
            setCreating(false)
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

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Gestion des Membres
                            </h1>
                            <p className="text-gray-600">
                                Administration du bar de l&apos;association
                            </p>
                        </div>
                        <div className="flex space-x-4">
                            <Button onClick={() => router.push('/dashboard')}>
                                Retour au Bar
                            </Button>
                            <Button onClick={() => setShowCreateForm(true)}>
                                Nouveau Membre
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Create User Form */}
                {showCreateForm && (
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle>Créer un nouveau membre</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreateUser} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="name">Nom complet</Label>
                                        <Input
                                            id="name"
                                            value={newUser.name}
                                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={newUser.email}
                                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="role">Rôle</Label>
                                        <select
                                            id="role"
                                            value={newUser.role}
                                            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                                            className="w-full p-2 border rounded-md"
                                        >
                                            <option value="MEMBER">Membre</option>
                                            <option value="ADMIN">Administrateur</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label htmlFor="balance">Solde initial (€)</Label>
                                        <Input
                                            id="balance"
                                            type="number"
                                            step="0.01"
                                            value={newUser.balance}
                                            onChange={(e) => setNewUser({ ...newUser, balance: parseFloat(e.target.value) || 0 })}
                                        />
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <Button type="submit" disabled={creating}>
                                        {creating ? 'Création...' : 'Créer le membre'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setShowCreateForm(false)}
                                    >
                                        Annuler
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Users List */}
                <Card>
                    <CardHeader>
                        <CardTitle>Liste des membres ({users.length})</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full table-auto">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2">Nom</th>
                                        <th className="text-left py-2">Email</th>
                                        <th className="text-left py-2">Rôle</th>
                                        <th className="text-right py-2">Solde</th>
                                        <th className="text-center py-2">Statut</th>
                                        <th className="text-left py-2">Créé le</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.map((user) => (
                                        <tr key={user.id} className="border-b">
                                            <td className="py-2 font-medium">{user.name}</td>
                                            <td className="py-2 text-gray-600">{user.email}</td>
                                            <td className="py-2">
                                                <span className={`px-2 py-1 rounded-full text-xs ${user.role === 'ADMIN'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className={`py-2 text-right font-medium ${Number(user.balance) >= 0 ? 'text-green-600' : 'text-red-600'
                                                }`}>
                                                {Number(user.balance).toFixed(2)}€
                                            </td>
                                            <td className="py-2 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs ${user.isActive
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {user.isActive ? 'Actif' : 'Inactif'}
                                                </span>
                                            </td>
                                            <td className="py-2 text-sm text-gray-600">
                                                {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {users.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                Aucun membre trouvé.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>
        </div>
    )
}