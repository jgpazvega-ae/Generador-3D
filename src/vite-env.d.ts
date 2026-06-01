/// <reference types="vite/client" />

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          poster?: string;
          'auto-rotate'?: boolean | '';
          'camera-controls'?: boolean | '';
          'shadow-intensity'?: string;
          'shadow-softness'?: string;
          exposure?: string;
          ar?: boolean | '';
          'ar-modes'?: string;
          loading?: 'auto' | 'lazy' | 'eager';
          reveal?: 'auto' | 'interaction' | 'manual';
          'environment-image'?: string;
          'tone-mapping'?: string;
          'min-camera-orbit'?: string;
          'max-camera-orbit'?: string;
          style?: React.CSSProperties;
        },
        HTMLElement
      >;
    }
  }
}

export {};
