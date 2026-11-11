// Tipos de `import.meta.env` para MYTHOS. Archivo de declaraciones global: sin imports de nivel superior.

interface ViteTypeOptions {
  // Cualquier `import.meta.env.X` no declarado aquí (o por Astro/Vite) es un error de tipos.
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  /** Ambiente lógico: development | staging | production. Validado en src/lib/env.ts. */
  readonly PUBLIC_APP_ENV?: string;
  /** Origen público absoluto, sin ruta. */
  readonly PUBLIC_SITE_URL?: string;
  /** Literal "true" | "false". Solo experimentos 3D adicionales. */
  readonly PUBLIC_ENABLE_EXPERIMENTAL_3D?: string;
  /** Inyectada por Vercel. Privada: solo se lee durante el build en src/lib/env.ts. */
  readonly VERCEL_ENV?: string;
}
