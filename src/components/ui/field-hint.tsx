'use client'

import { Info } from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

interface FieldHintProps {
    content: string;
    side?: "top" | "right" | "bottom" | "left";
}

export function FieldHint({ content, side = "top" }: FieldHintProps) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground/50 hover:text-primary cursor-help transition-colors ml-1.5 inline-block align-middle" />
            </PopoverTrigger>
            <PopoverContent side={side} className="w-auto max-w-xs text-xs p-3">
                <p>{content}</p>
            </PopoverContent>
        </Popover>
    )
}
