# Generador 3D — Imágenes a Modelos 3D con IA

Herramienta web para convertir **fotografías de un objeto en un modelo 3D** usando
inteligencia artificial. Sube varias caras (ángulos) de la pieza, agrega las
medidas reales y obtén un modelo descargable en GLB/FBX/OBJ con la mayor
similitud posible.

> Inspirado en el flujo de Tencent Hunyuan 3D que se ve en el video original.

## ✨ Características

- **3 proveedores de IA** seleccionables:
  - **Hunyuan 3D (Replicate)** — el modelo open source de Tencent. Usa
    automáticamente `hunyuan3d-2mv` (multivista) cuando subes varias fotos.
  - **Meshy AI** — mejor reconstrucción multi-vista vía endpoint
    `multi-image-to-3d`, texturas hasta 4K PBR (`meshy-5` / `meshy-6`).
  - **Stability AI (SPAR3D)** — *Stable Point Aware 3D*: predice la parte
    trasera no visible para mayor fidelidad. Una imagen, muy rápido.
- **Carga multi-imagen** con etiquetas de ángulo (frente, atrás, izquierda,
  derecha, superior, inferior, diagonal).
- **Eliminación de fondo automática** en el navegador (aísla la pieza, el factor
  individual que más mejora el parecido).
- **Medidas reales** (mm/cm/m/in) → el modelo se **reescala** a las dimensiones
  físicas exactas al exportar (preciso para CAD / impresión 3D).
- **Presets de calidad** (Borrador / Estándar / Máxima) que ajustan polígonos,
  pasos de inferencia y resolución de textura.
- **Corrección de orientación EXIF** y optimización de imágenes antes de enviar.
- **Visor 3D interactivo** (rotar, zoom, auto-rotación) con `<model-viewer>`.
- **Descarga** en GLB, FBX y OBJ.
- **API key local**: se guarda solo en tu navegador, nunca en un servidor.

## 🧠 Cómo se maximiza la similitud (~99%)

La similitud real depende sobre todo de **las fotos de entrada**. La app aplica
una tubería de calidad:

1. **Eliminación de fondo** → la IA se concentra solo en la pieza.
2. **Corrección EXIF + alta resolución** → geometría más precisa.
3. **Reconstrucción multi-vista** (Meshy multi-image / Hunyuan `mv`) → combina
   varios ángulos en lugar de adivinar caras ocultas.
4. **SPAR3D** predice la parte trasera con difusión de nube de puntos.
5. **Preset Máxima** → más polígonos y texturas 4K PBR.
6. **Escalado a medidas reales** → dimensiones físicas exactas.

**Para las mejores fotos:** fondo liso, buena luz sin sombras duras, pieza
centrada y nítida, misma distancia en todos los ángulos, sin reflejos.

## 🚀 Desarrollo local

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # genera dist/
npm run preview  # sirve dist/ localmente
```

## 🔑 Obtener las API keys

| Proveedor | Dónde |
|-----------|-------|
| Replicate (Hunyuan 3D) | https://replicate.com/account/api-tokens |
| Meshy AI | https://app.meshy.ai (créditos gratis al registrarse) |
| Stability AI | https://platform.stability.ai/account/keys |

## 🌐 Despliegue en GitHub Pages

El sitio se publica solo al hacer **merge a `main`** mediante el workflow
`.github/workflows/deploy.yml`. Para activarlo **una vez**:

1. En el repo: **Settings → Pages**.
2. En **Source** selecciona **GitHub Actions**.
3. Haz merge de la rama a `main`. El workflow construye y publica.
4. Quedará disponible en `https://<usuario>.github.io/<repo>/`.

> El proyecto usa `base: './'` (rutas relativas) en Vite, por lo que funciona en
> cualquier subruta de Pages sin importar mayúsculas/minúsculas del nombre del
> repositorio. Si ves un **404 "There isn't a GitHub Pages site here"**, casi
> siempre es porque el paso 1–2 (activar Pages con *GitHub Actions*) aún no se
> ha hecho, o el merge a `main` todavía no ocurrió.

## 🛠️ Stack técnico

- React 18 + TypeScript + Vite
- Tailwind CSS (tema oscuro)
- `@google/model-viewer` (vía CDN) para el visor 3D
- `@gltf-transform/core` para reescalar el GLB a medidas reales
- `@imgly/background-removal` para quitar el fondo en el navegador
- GitHub Actions: CI (build en cada PR) + deploy a Pages

## 📁 Estructura

```
src/
├── api/            # Integraciones: meshy, stability, replicate
├── components/     # UI por pasos (config, upload, processing, result)
├── hooks/          # useGeneration, useLocalStorage
├── utils/          # imágenes (EXIF, fondo) y escalado GLB
└── types/          # tipos y presets de calidad
```

## 🔒 Privacidad

Las imágenes se procesan en tu navegador y se envían **directamente** desde tu
navegador al proveedor de IA que elijas, usando tu propia API key. Esta app no
tiene backend propio ni almacena tus datos.
