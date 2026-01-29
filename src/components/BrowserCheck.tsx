'use client'

import { useEffect, useState } from 'react'

export function BrowserCheck() {
    const [isChrome, setIsChrome] = useState(true)

    useEffect(() => {
        // Basic check for Chrome/Chromium
        // Note: Edge and other Chromium browsers often identify as Chrome too, which is usually desired.
        // 'vendor' property is specific to Chrome/Webkit, but checking UserAgent is more common for this specific constraint.
        const userAgent = navigator.userAgent.toLowerCase()

        // Simple check: "chrome" must be present. 
        // Excluding "edg" (Edge) or "opr" (Opera) might be too strict, but "google explorer" implies strictness.
        // Let's stick to checking if it is a Chromium based browser which is usually enough for compatibility.
        // However, user said "google explorer" which is imprecise (likely means Google Chrome).
        // Let's enforce that it MUST include "chrome" and valid vendor.

        const isChromium = userAgent.includes('chrome') && !!(window as any).chrome;

        // Strict Chrome check (trying to differentiate from Edge usually involves checking for "edg")
        const isEdge = userAgent.includes('edg/')

        // If strict Google Chrome is required:
        const isGoogleChrome = isChromium && !isEdge

        setIsChrome(isGoogleChrome)
    }, [])

    if (isChrome) return null

    return (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center p-4 text-center">
            <div className="max-w-md space-y-6">
                <h1 className="text-3xl font-bold text-red-600">Navegador No Compatible</h1>
                <p className="text-gray-700 text-lg">
                    Por favor, utiliza <strong>Google Chrome</strong> para acceder a este sistema.
                </p>
                <p className="text-sm text-gray-500">
                    Hemos detectado que estás usando un navegador diferente. Para garantizar el correcto funcionamiento de todas las funcionalidades, requerimos el uso de Chrome.
                </p>
                <div className="pt-4">
                    <a
                        href="https://www.google.com/chrome/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                        Descargar Google Chrome
                    </a>
                </div>
            </div>
        </div>
    )
}
