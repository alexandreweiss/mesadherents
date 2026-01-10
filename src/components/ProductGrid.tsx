'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Product {
    id: string
    name: string
    price: number
    category: string
}

export default function ProductGrid() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const response = await fetch('/api/products')
            const data = await response.json()
            setProducts(data)
        } catch (error) {
            console.error('Error fetching products:', error)
        } finally {
            setLoading(false)
        }
    }

    const addToCart = async (productId: string) => {
        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ productId, quantity: 1 }),
            })

            if (response.ok) {
                // Refresh the page to update balance and transactions
                window.location.reload()
            } else {
                console.error('Failed to add product')
            }
        } catch (error) {
            console.error('Error adding product:', error)
        }
    }

    if (loading) {
        return <div>Chargement des produits...</div>
    }

    const drinks = products.filter(p => p.category === 'DRINK')
    const food = products.filter(p => p.category === 'FOOD')

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-semibold mb-3">Boissons</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {drinks.map((product) => (
                        <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <h4 className="font-medium">{product.name}</h4>
                                    <p className="text-sm text-gray-600">{product.price}€</p>
                                    <Button
                                        onClick={() => addToCart(product.id)}
                                        className="w-full mt-2"
                                        size="sm"
                                    >
                                        Ajouter
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            <div>
                <h3 className="text-lg font-semibold mb-3">Nourriture</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {food.map((product) => (
                        <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="text-center">
                                    <h4 className="font-medium">{product.name}</h4>
                                    <p className="text-sm text-gray-600">{product.price}€</p>
                                    <Button
                                        onClick={() => addToCart(product.id)}
                                        className="w-full mt-2"
                                        size="sm"
                                    >
                                        Ajouter
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}