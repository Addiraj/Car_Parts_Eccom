const { createServer } = require('vite');

async function run() {
  const server = await createServer({
    configFile: 'vite.config.ts',
    server: { middlewareMode: true }
  });
  try {
    const mod = await server.ssrLoadModule('/src/lib/admin.notifications.functions.ts');
    console.log("Successfully loaded:", Object.keys(mod));
  } catch (err) {
    console.error("Vite SSR Load Error:", err);
  }
  await server.close();
  process.exit(0);
}
run();
