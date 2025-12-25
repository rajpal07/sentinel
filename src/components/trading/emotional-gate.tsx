'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { FieldHint } from '@/components/ui/field-hint'

interface EmotionalGateProps {
    onPass: () => void;
    onFail: () => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const QUESTIONS = [
    { text: "Are you trying to recover a recent loss?", hint: "Revenge trading leads to ruin. Accept the loss and reset." },
    { text: "Do you feel urged to trade immediately?", hint: "FOMO isn't a strategy. Wait for your setup." },
    { text: "Are you distracted or angry?", hint: "Emotional baseline must be neutral before engaging." },
    { text: "Did you deviate from your plan on the last trade?", hint: "Discipline is a muscle. Don't compound errors." }
]

export function EmotionalGate({ onPass, onFail, open, onOpenChange }: EmotionalGateProps) {
    const [answers, setAnswers] = useState<Record<number, string>>({})
    const [failed, setFailed] = useState(false)

    const handleAnswer = (index: number, value: 'yes' | 'no') => {
        setAnswers(prev => ({ ...prev, [index]: value }))
    }

    const handleSubmit = () => {
        const hasYes = Object.values(answers).some(a => a === 'yes')
        if (hasYes) {
            setFailed(true)
            onFail()
        } else {
            onPass()
            // Reset for next time after a delay or just close
            setAnswers({})
            setFailed(false)
            onOpenChange(false)
        }
    }

    const allAnswered = QUESTIONS.every((_, i) => answers[i])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-card border-destructive/20 shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-primary" />
                        State Check
                    </DialogTitle>
                    <DialogDescription>
                        Honest answers only. The market will punish lies.
                    </DialogDescription>
                </DialogHeader>

                {!failed ? (
                    <div className="space-y-6 py-4">
                        {QUESTIONS.map((q, i) => (
                            <div key={i} className="flex items-center justify-between gap-4 p-3 bg-muted/20 rounded-lg">
                                <div className="flex items-center">
                                    <span className="text-sm font-medium">{q.text}</span>
                                    <FieldHint content={q.hint} side="right" />
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant={answers[i] === 'yes' ? 'destructive' : 'outline'}
                                        onClick={() => handleAnswer(i, 'yes')}
                                        className={answers[i] === 'yes' ? 'opacity-100' : 'opacity-50 hover:opacity-100'}
                                    >
                                        Yes
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant={answers[i] === 'no' ? 'default' : 'outline'}
                                        onClick={() => handleAnswer(i, 'no')}
                                        className={answers[i] === 'no' ? 'bg-green-500 opacity-100 hover:bg-green-600' : 'opacity-50 hover:opacity-100'}
                                    >
                                        No
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center space-y-4">
                        <div className="text-6xl">🛑</div>
                        <h3 className="text-xl font-bold text-destructive">Trading Blocked</h3>
                        <p className="text-muted-foreground">
                            You are in a compromised emotional state. <br />
                            Step away from the terminal.
                        </p>
                        <div className="p-4 bg-muted/30 rounded text-sm text-muted-foreground italic">
                            &quot;The market is a device for transferring money from the impatient to the patient.&quot;
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {!failed && (
                        <Button
                            className="w-full"
                            disabled={!allAnswered}
                            onClick={handleSubmit}
                        >
                            Submit Declaration
                        </Button>
                    )}
                    {failed && (
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
                            Acknowledge
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
