¡Hola, Agente! Este archivo es tu **Constitución**. Léelo entero antes de tocar una sola línea de código. Tu objetivo es mantener la estabilidad del proyecto y no alucinar rutas ni dependencias.

## 1. Regla de Oro: Análisis Estructural Obligatorio (Anti-Romper)
**Antes de SUGERIR o MODIFICAR cualquier archivo, DEBES seguir este protocolo:**

1. **Escanea el árbol actual**: Si no tienes visibilidad completa de las carpetas, **pregúntame explícitamente** por el contenido de `src/`, `public/`, `public/engine/`, `components/`, `scripts/` y `bin/`.
2. **Verifica rutas relativas**: Nunca asumas que un archivo está en una carpeta. Por ejemplo, para cargar una imagen con `this.load.image()`, primero revisa si existe en `public/assets/`, `public/engine/assets/`, `src/assets/` o `assets/`. Si no lo ves en el listado, no lo uses.
3. **Mapea dependencias**: Antes de cambiar un `import`, asegúrate de que el archivo destino exista en la ruta que estás escribiendo.
4. **Registra scripts nuevos en el manifest**: Cualquier archivo JS nuevo dentro de `public/engine/src/` **debe añadirse** a `public/engine/src/core/preload.scripts.jsonc` en el orden correcto de dependencias, o no se cargará nunca.
5. **Si dudas, para y pregunta**. Es preferible pedir confirmación a corromper el sistema de assets o las importaciones de TypeScript.

## 2. El Entorno de Ejecución (¡Sagrado!)
- **Comando para levantar el proyecto**: `neu run` (PC vía Neutralino) o `npm run dev` (PC con HMR).
  - *Nota*: El binario `neu` viene de `@neutralinojs/neu` — debe estar instalado globalmente o se ejecuta con `npx neu run`. El paquete `neu` listado en `package.json` es un placeholder vacío; el real es `@neutralinojs/neu` (verificar instalación antes de culpar al proyecto si falla).
- **Stacks soportados** (se autodetectan en `public/engine/src/core/preload.scripts.js`):
  - **PC (Neutralino)**: `neu run` — documentRoot `/public/engine/`.
  - **Móvil (React Native + Expo)**: `npm start` (Metro) → shell RN abre `http://host:8081/engine/index.html`.
  - **Web navegador**: abrir `public/engine/index.html` (limitado, FileSystem no disponible).
- **Variables de entorno**: No uses `process.env` a lo loco. Si necesitas una variable, debe estar definida en `neutralino.config.json`, `app.json` o un `.env` (si existe). Pregúntame antes de crear uno nuevo.

## 3. Phaser (La Base del Juego)
- **Fuente de Phaser**: está **vendeada localmente** en `public/engine/lib/phaser.min.js` (Phaser 3 desde CDN al build, luego vendado). **No cambies la versión de Phaser** sin consultarme.
- **PeerJS** y **FontAwesome** también están en `public/engine/lib/` (mismo trato: no actualizar sin consultar).
- **Versión**: La versión de Phaser debe confirmarse leyendo `public/engine/lib/phaser.min.js` (banner) o `neutralino.config.json` si se referencia. El `package.json` del proyecto **NO lista Phaser** como dependencia (es vendado).
- **Carga de Assets**: Usamos `this.load.image()`, `this.load.atlasXML()` y métodos nativos de Phaser.
  - **Regla estricta**: Las rutas son relativas al **punto de entrada del HTML** (`public/engine/index.html`). Como Neutralino sirve `public/engine/` como documentRoot, las rutas empiezan desde ahí. Ejemplo: `'assets/sprites/player.png'` equivale a `public/engine/assets/sprites/player.png`.
  - **Validación**: Antes de sugerir un asset, verifica en `public/engine/assets/` (y sus subcarpetas) si el archivo existe.
- **Convención de clases en `window`**: Todas las clases del engine se exponen como `window.NombreClase = NombreClase` (al final de cada archivo). Esto permite el orden de carga del manifest. **No rompas este patrón** en clases nuevas.

## 4. Estructura del Proyecto (Mapeo Inicial)
Basado en tu raíz actual (`Genesis-Engine-V2-main`):

- **`/src`** → Código TypeScript del **shell móvil** (React Native/Expo). Solo contiene `index.tsx` y el entry del WebView. **No es la lógica del juego**.
- **`/public`** → Raíz para Neutralino. Contiene `public/engine/` con el motor completo.
- **`/public/engine`** → **Raíz REAL del motor de juego**:
  - `index.html` — punto de entrada único.
  - `lib/` — librerías vendeadas (phaser, peerjs, font-awesome).
  - `src/` — código fuente del motor (escenas, utils, UI, datos).
  - `src/core/preload.scripts.jsonc` — **manifest de carga** (orden de todos los scripts).
  - `src/core/preload.scripts.js` — bootstrap que lee el manifest y arranca Phaser.
  - `assets/` — recursos del juego (png, xml, ogg, json, fonts).
- **`/components`** → Componentes del template Expo (haptic-tab, external-link). Sin uso real en el juego.
- **`/scripts`** → Scripts de utilidad/build (incluye `formatter-files.js`).
- **`/bin`** → Binarios de Neutralino (win_x64, linux, mac). **NO TOCAR**.
- **`/icons`** → Iconos de la app de escritorio.
- **`/app.json`** → Config de Expo (iconos, splash, plugins).
- **`/neutralino.config.json`** → Config de Neutralino (documentRoot, nativeAllowList, ventana).
- **`.storage` / `.tmp`** → Caché y auth de Neutralino. **NO TOCAR**.

**Siempre analiza las subcarpetas de `public/engine/src/`** (utils/, core/, funkin/play/, funkin/menu/) antes de proponer nuevas clases o assets. Si no las tienes claras, pídeme un listado.

## 5. Convenciones de Código (Estilo y Calidad)
- **TypeScript**: `tsconfig.json` está configurado (`strict: true`), pero **el motor completo está en JavaScript plano** (114+ `.js` sin tipos). TS solo aplica al shell móvil (`src/index.tsx`, `components/*.tsx`). El motor usa `window.*` globales y no compila con `tsc`.
- **ESLint**: Ejecuta `npx eslint . --fix` para formatear. La config está en `eslint.config.js` (flat config con `eslint-config-expo/flat`). El engine JS tiene muchas referencias a `window.*` que eslint no marca como error por los `globals.browser`, pero **no abuses de ellas**.
- **Nombres**: 
  - Clases de Phaser (Escenas, Objetos) → **PascalCase** (ej. `MainScene`, `PlayerEntity`).
  - Funciones y variables → **camelCase** (ej. `loadAssets`, `playerHealth`).
- **Comentarios**: Usa JSDoc (`/** ... */`) para funciones públicas y clases complejas. El código auto-explicativo es bueno, pero para la lógica de físicas o partículas, explica el "por qué".

## 6. Testing y Depuración
- **Logs**: Neutralino genera `neutralinojs.log`. Si ves errores de red o CORS, revisa ese archivo.
- **Consola del navegador**: Como es una app de escritorio (Neutralino), la consola se abre con `Ctrl+Shift+I` (como en Chrome). Úsala para depurar Phaser.
- **HMR** (opcional): `npm run hmt` arranca el servidor HMR en `ws://localhost:8082` que vigila `public/engine/src/`. Requiere `hmr-client.js` añadido a `index.html` para activarse.
- **Pruebas manuales**: No tenemos suite automatizada definida aún. Cualquier cambio en la lógica de físicas, carga de mapas o cámara debe ser probado manualmente ejecutando `neu run`. **Si no puedes probarlo, adviértelo en tu respuesta**.

## 7. Mi Personalidad como Asistente (Tu Estilo de Respuesta)
- Quiero respuestas **claras y directas**, pero con el contexto técnico suficiente.
- Si vas a modificar más de 3 archivos, **dímelo antes** y justifica por qué es necesario.
- Si algo no está en el `package.json` o en la estructura de carpetas, **no lo inventes**. Pregúntame: *"Oye, no encuentro X archivo en la ruta Y, ¿dónde está?"*.
- **Antes de refactorizar**: respeta el patrón `window.NombreClase = NombreClase` (al final de cada archivo) y asegúrate de que el manifest `preload.scripts.jsonc` refleje cualquier archivo nuevo o reordenado.

---

## ⚠️ Recordatorio Final
Eres un ingeniero de software cauteloso, no un cowboy del código. Cada cambio debe estar respaldado por la estructura real del proyecto. **El análisis de carpetas y subcarpetas es tu escudo contra el caos.**