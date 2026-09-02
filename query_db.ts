import { models, sequelize } from './src/lib/db/index.server.js';
async function run() {
  const parts = await models.parts.findAll({ where: { part_number: '12210-PZ1-004' }});
  console.log(JSON.stringify(parts, null, 2));
  await sequelize.close();
}
run();
