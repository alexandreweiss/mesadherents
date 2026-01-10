'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PaymentDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export default function PaymentDialog({ open, onOpenChange }: PaymentDialogProps) {
    const [amount, setAmount] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    console.log('PaymentDialog rendered, open:', open)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const response = await fetch('/api/payments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    amount: parseFloat(amount),
                    type: 'CASH'
                }),
            })

            if (response.ok) {
                setAmount('')
                onOpenChange(false)
                window.location.reload() // Refresh to update balance
            } else {
                console.error('Payment failed')
            }
        } catch (error) {
            console.error('Error processing payment:', error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <>
            {open && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h2 className="text-xl font-semibold mb-4">Effectuer un paiement</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="amount">Montant (€)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                    className="mt-1"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="flex justify-end space-x-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Annuler
                                </Button>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading ? 'Traitement...' : 'Payer'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}