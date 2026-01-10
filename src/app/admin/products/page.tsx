'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Product {
    id: string
    name: string
    price: number
    category: string
    isActive: boolean
    description?: string
    createdAt: string
}

interface NewProduct {
    name: string
    price: number
    category: string
    description: string
}

export default function AdminProducts() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [newProduct, setNewProduct] = useState<NewProduct>({
        name: '',
        price: 0,
        category: 'DRINK',
        description: ''
    })
    const [processing, setProcessing] = useState<{[key: string]: boolean}>({})

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.push('/auth/signin')
        } else if (session?.user?.role !== 'ADMIN') {
            router.push('/dashboard')
        } else {
            fetchProducts()
        }
    }, [status, session, router])

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products/admin')
            if (response.ok) {
                const data = await response.json()
                setProducts(data)
            }
        } catch (error) {
            console.error('Error fetching products:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateProduct = async (e: React.FormEvent) => {
        e.preventDefault()
        setProcessing(prev => ({ ...prev, create: true }))

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newProduct)
            })

            if (response.ok) {
                const createdProduct = await response.json()
                setProducts([createdProduct, ...products])
                setNewProduct({ name: '', price: 0, category: 'DRINK', description: '' })
                setShowCreateForm(false)
                alert('Produit créé avec succès!')
            } else {
                const error = await response.json()
                alert(`Erreur: ${error.error}`)
            }
        } catch (error) {
            console.error('Error creating product:', error)
            alert('Erreur lors de la création du produit')
        } finally {
            setProcessing(prev => ({ ...prev, create: false }))
        }
    }

    const handleUpdateProduct = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingProduct) return

        setProcessing(prev => ({ ...prev, [editingProduct.id]: true }))

        try {
            const response = await fetch(`/api/products/${editingProduct.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(editingProduct)
            })

            if (response.ok) {
                const updatedProduct = await response.json()
                setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))
                setEditingProduct(null)
                alert('Produit modifié avec succès!')
            } else {
                const error = await response.json()
                alert(`Erreur: ${error.error}`)
            }
        } catch (error) {
            console.error('Error updating product:', error)
            alert('Erreur lors de la modification du produit')
        } finally {
            setProcessing(prev => ({ ...prev, [editingProduct.id]: false }))
        }
    }

    const handleDeleteProduct = async (productId: string, productName: string) => {
        if (!confirm(`Êtes-vous sûr de vouloir supprimer "${productName}" ?`)) {
            return
        }

        setProcessing(prev => ({ ...prev, [productId]: true }))

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE'
            })

            if (response.ok) {
                setProducts(prev => prev.map(p => 
                    p.id === productId ? { ...p, isActive: false } : p
                ))
                alert('Produit supprimé avec succès!')
            } else {
                const error = await response.json()
                alert(`Erreur: ${error.error}`)
            }
        } catch (error) {
            console.error('Error deleting product:', error)
            alert('Erreur lors de la suppression du produit')
        } finally {
            setProcessing(prev => ({ ...prev, [productId]: false }))
        }
    }

    const handleReactivateProduct = async (productId: string, productName: string) => {
        const product = products.find(p => p.id === productId)
        if (!product) return

        setProcessing(prev => ({ ...prev, [productId]: true }))

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ...product, isActive: true })
            })

            if (response.ok) {
                const updatedProduct = await response.json()
                setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p))
                alert('Produit réactivé avec succès!')
            } else {
                const error = await response.json()
                alert(`Erreur: ${error.error}`)
            }
        } catch (error) {
            console.error('Error reactivating product:', error)
            alert('Erreur lors de la réactivation du produit')
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

    const activeProducts = products.filter(p => p.isActive)
    const inactiveProducts = products.filter(p => !p.isActive)

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">
                                Gestion des Produits
                            </h1>
                            <p className="text-gray-600">
                                Administration - Ajouter/Supprimer des produits
                            </p>
                        </div>
                        <div className="flex space-x-4">
                            <Button onClick={() => router.push('/admin/consumption')} variant="outline">
                                Consommations
                            </Button>
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
                {/* Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            Résumé
                            <Button onClick={() => setShowCreateForm(true)}>
                                Nouveau Produit
                            </Button>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{activeProducts.length}</div>
                                <div className="text-sm text-gray-600">Produits actifs</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{inactiveProducts.length}</div>
                                <div className="text-sm text-gray-600">Produits supprimés</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{products.length}</div>
                                <div className="text-sm text-gray-600">Total produits</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Create/Edit Product Form */}
                {(showCreateForm || editingProduct) && (
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {editingProduct ? 'Modifier le produit' : 'Créer un nouveau produit'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={editingProduct ? handleUpdateProduct : handleCreateProduct} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="name">Nom du produit</Label>
                                        <Input
                                            id="name"
                                            value={editingProduct ? editingProduct.name : newProduct.name}
                                            onChange={(e) => editingProduct 
                                                ? setEditingProduct({...editingProduct, name: e.target.value})
                                                : setNewProduct({...newProduct, name: e.target.value})
                                            }
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="price">Prix (€)</Label>
                                        <Input
                                            id="price"
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={editingProduct ? editingProduct.price : newProduct.price}
                                            onChange={(e) => editingProduct
                                                ? setEditingProduct({...editingProduct, price: parseFloat(e.target.value) || 0})
                                                : setNewProduct({...newProduct, price: parseFloat(e.target.value) || 0})
                                            }
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="category">Catégorie</Label>
                                        <select
                                            id="category"
                                            value={editingProduct ? editingProduct.category : newProduct.category}
                                            onChange={(e) => editingProduct
                                                ? setEditingProduct({...editingProduct, category: e.target.value})
                                                : setNewProduct({...newProduct, category: e.target.value})
                                            }
                                            className="w-full p-2 border rounded-md"
                                            required
                                        >
                                            <option value="DRINK">Boisson</option>
                                            <option value="FOOD">Nourriture</option>
                                        </select>
                                    </div>
                                    <div>
                                        <Label htmlFor="description">Description</Label>
                                        <Input
                                            id="description"
                                            value={editingProduct ? (editingProduct.description || '') : newProduct.description}
                                            onChange={(e) => editingProduct
                                                ? setEditingProduct({...editingProduct, description: e.target.value})
                                                : setNewProduct({...newProduct, description: e.target.value})
                                            }
                                            placeholder="Description optionnelle"
                                        />
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <Button 
                                        type="submit" 
                                        disabled={processing.create || (editingProduct && processing[editingProduct.id])}
                                    >
                                        {processing.create || (editingProduct && processing[editingProduct.id]) 
                                            ? 'Traitement...' 
                                            : editingProduct ? 'Modifier' : 'Créer'
                                        }
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            setShowCreateForm(false)
                                            setEditingProduct(null)
                                        }}
                                    >
                                        Annuler
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Active Products */}
                <Card>
                    <CardHeader>
                        <CardTitle>Produits actifs</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="min-w-full table-auto">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-2">Nom</th>
                                        <th className="text-left py-2">Prix</th>
                                        <th className="text-left py-2">Catégorie</th>
                                        <th className="text-left py-2">Description</th>
                                        <th className="text-center py-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeProducts.map((product) => (
                                        <tr key={product.id} className="border-b">
                                            <td className="py-2 font-medium">{product.name}</td>
                                            <td className="py-2 text-blue-600 font-bold">
                                                {Number(product.price).toFixed(2)}€
                                            </td>
                                            <td className="py-2">
                                                <span className={`px-2 py-1 rounded-full text-xs ${
                                                    product.category === 'DRINK' 
                                                        ? 'bg-blue-100 text-blue-800' 
                                                        : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {product.category === 'DRINK' ? 'Boisson' : 'Nourriture'}
                                                </span>
                                            </td>
                                            <td className="py-2 text-sm text-gray-600">
                                                {product.description || '-'}
                                            </td>
                                            <td className="py-2 text-center">
                                                <div className="flex justify-center space-x-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => setEditingProduct(product)}
                                                    >
                                                        Modifier
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-red-600 hover:bg-red-50"
                                                        onClick={() => handleDeleteProduct(product.id, product.name)}
                                                        disabled={processing[product.id]}
                                                    >
                                                        {processing[product.id] ? 'Suppression...' : 'Supprimer'}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {activeProducts.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                Aucun produit actif.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Inactive Products */}
                {inactiveProducts.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Produits supprimés</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="min-w-full table-auto">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-2">Nom</th>
                                            <th className="text-left py-2">Prix</th>
                                            <th className="text-left py-2">Catégorie</th>
                                            <th className="text-center py-2">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {inactiveProducts.map((product) => (
                                            <tr key={product.id} className="border-b opacity-60">
                                                <td className="py-2 font-medium line-through">{product.name}</td>
                                                <td className="py-2 text-gray-500">
                                                    {Number(product.price).toFixed(2)}€
                                                </td>
                                                <td className="py-2">
                                                    <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                                                        {product.category === 'DRINK' ? 'Boisson' : 'Nourriture'}
                                                    </span>
                                                </td>
                                                <td className="py-2 text-center">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-green-600 hover:bg-green-50"
                                                        onClick={() => handleReactivateProduct(product.id, product.name)}
                                                        disabled={processing[product.id]}
                                                    >
                                                        {processing[product.id] ? 'Réactivation...' : 'Réactiver'}
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    )
}