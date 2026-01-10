import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Association Bar App',
    description: 'Gestion des consommations du bar de l\'association',
    manifest: '/manifest.json',
    themeColor: '#000000',
    viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="fr">
            <body className={inter.className}>
                <Providers>{children}</Providers>
            </body>
        </html>
    )
}