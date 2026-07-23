# Cómo subir CareFlow a GitHub

## Opción sencilla desde el navegador

1. Descarga y descomprime `clinical-workflow-api.zip`.
2. Abre tu repositorio `clinical-workflow-api` en GitHub.
3. Si está vacío, selecciona **uploading an existing file**. Si ya contiene archivos, usa **Add file → Upload files**.
4. Entra en la carpeta descomprimida `clinical-workflow-api`.
5. Selecciona todo lo que está dentro de esa carpeta y arrástralo a GitHub. No subas la carpeta `node_modules` ni los directorios `dist`.
6. Usa el mensaje: `Build CareFlow full-stack clinical workflow platform`.
7. Selecciona **Commit directly to the main branch** y pulsa **Commit changes**.

GitHub debe mostrar en la raíz `README.md`, `package.json`, `apps`, `.github`, `docker-compose.yml` y los demás archivos.

## Probarlo en tu computadora

Instala Node.js 20 o superior. Después abre una terminal dentro de la carpeta:

```bash
npm install
npm run dev
```

Abre `http://localhost:5173` y utiliza:

- Usuario: `admin@careflow.demo`
- Contraseña: `demo1234`

## Verificaciones

```bash
npm run typecheck
npm test
npm run build
```

Los tres comandos deben terminar sin errores.
