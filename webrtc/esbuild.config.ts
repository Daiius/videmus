import { build } from 'esbuild'

await build({
  entryPoints: ['./src/server.ts'],
  outfile: './dist/server.js',
  platform: 'node',
  format: 'esm',
  bundle: true,
  target: 'node20',
  resolveExtensions: ['.ts', '.js'],
  external: ['tty'],
  banner: {
    js: `
      import { createRequire } from "module";
      import __url from "url";
      const require = createRequire(import.meta.url);
      const __filename = __url.fileURLToPath(import.meta.url);
      const __dirname = __url.fileURLToPath(new URL(".", import.meta.url));
    `,
  }
})

