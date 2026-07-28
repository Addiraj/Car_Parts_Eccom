import { Sequelize, Op } from 'sequelize';
import { initModels } from './generated_models/init-models';
export { Op };

export let sequelize: any;
export let models: any;

if (typeof window === 'undefined') {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = Number(process.env.DB_PORT) || 5432;
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'postgres'; 
  const dbName = process.env.DB_NAME || 'dubai_carparts';

  sequelize = new Sequelize(dbName, dbUser, dbPassword, {
    host: dbHost,
    port: dbPort,
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries for debugging
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

  // Test the connection (only runs on server startup)
  sequelize.authenticate()
    .then(() => console.log(`[Sequelize] Successfully connected to ${dbName} on ${dbHost}:${dbPort}`))
    .catch((err: unknown) => console.error('[Sequelize] Unable to connect to the database:', err));

  models = initModels(sequelize);
}
