"use client";

import { useState } from 'react';
import { Presentation, Check, Copy } from 'lucide-react';

interface PresentationButtonProps {
    chartId: string;
    className?: string;
}

export function PresentationButton({ chartId, className = '' }: PresentationButtonProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (typeof window === 'undefined') return;

        const origin = window.location.origin;
        const presentationUrl = `${origin}/presentation?chartId=${chartId}`;

        const onSuccess = () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        };

        // Método moderno: solo disponible en HTTPS o localhost
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(presentationUrl).then(onSuccess);
            return;
        }

        // Fallback para HTTP (Hetzner sin TLS): textarea temporal + execCommand
        const textarea = document.createElement('textarea');
        textarea.value = presentationUrl;
        // Fuera del viewport para que no se vea
        textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            document.execCommand('copy');
            onSuccess();
        } catch (err) {
            console.error('Clipboard fallback falló:', err);
        } finally {
            document.body.removeChild(textarea);
        }
    };

    return (
        <button
            onClick={handleCopy}
            title="Copiar URL para PowerPoint Web Viewer"
            className={`
                group inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest
                px-3 py-1.5 rounded-full border transition-all duration-200 select-none
                ${copied
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600'
                }
                ${className}
            `}
        >
            {copied ? (
                <>
                    <Check className="w-3 h-3" />
                    <span>¡URL Copiada!</span>
                </>
            ) : (
                <>
                    <Presentation className="w-3 h-3" />
                    <span>Presentación</span>
                </>
            )}
        </button>
    );
}
