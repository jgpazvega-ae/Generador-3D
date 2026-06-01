import { useEffect, useRef } from 'react';

interface Props {
  src: string;
  poster?: string;
}

export default function ModelViewerComponent({ src, poster }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    // Reset camera when model changes
    const mv = ref.current as HTMLElement & { resetTurntableRotation?: () => void };
    mv?.resetTurntableRotation?.();
  }, [src]);

  return (
    <div className="w-full h-full min-h-[300px] rounded-xl overflow-hidden bg-[#0a0a1a]">
      <model-viewer
        ref={ref as React.RefObject<HTMLElement>}
        src={src}
        poster={poster}
        alt="Modelo 3D generado"
        camera-controls=""
        auto-rotate=""
        shadow-intensity="1"
        shadow-softness="0.5"
        exposure="1"
        tone-mapping="commerce"
        environment-image="legacy"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '300px',
          background:
            'radial-gradient(ellipse at center, #1a1a38 0%, #0a0a16 100%)',
        }}
      />
    </div>
  );
}
