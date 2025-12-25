'use client'

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function SignupPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${location.origin}/auth/callback`,
            },
        })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                router.push('/dashboard')
            } else {
                setError("Confirmation email sent. Please verify your account.")
            }
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[100px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="z-10 w-full max-w-md"
            >
                <Card className="border-border/50 bg-card/50 backdrop-blur-xl shadow-2xl">
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-3xl font-bold tracking-tighter text-center bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                            INIT PROTOCOL
                        </CardTitle>
                        <CardDescription className="text-center text-muted-foreground">
                            Create your Sentinel account
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="trader@sentinel.hq"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-background/50 border-input/50 focus:ring-primary/50"
                                    autoComplete="email"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <PasswordInput
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="bg-background/50 border-input/50 focus:ring-primary/50"
                                    autoComplete="new-password"
                                />
                            </div>
                            {error && (
                                <div className="text-blue-400 text-sm text-center bg-blue-500/10 p-2 rounded border border-blue-500/20">
                                    {error}
                                </div>
                            )}
                            <Button
                                type="submit"
                                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] cursor-pointer"
                                disabled={loading}
                            >
                                {loading ? 'Initializing...' : 'Sign Up'}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="justify-center">
                        <p className="text-sm text-muted-foreground">
                            Already enforced? <Link href="/login" className="text-primary hover:text-primary/80 hover:underline transition-colors">Login</Link>
                        </p>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    )
}
