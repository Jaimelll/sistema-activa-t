// Layout aislado para modo presentación — sin sidebar, sin header, sin fondo oscuro.
// Solo carga el contenido puro para ser embebido en PowerPoint via Web Viewer.
export default function PresentationLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#ffffff', margin: 0, padding: 0 }}>
            {children}
        </div>
    );
}
