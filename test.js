const { Sequelize } = require('sequelize');
const sequelize = new Sequelize('dubai_carparts', 'postgres', 'postgres', { host: 'localhost', port: 5432, dialect: 'postgres' });
sequelize.query("SELECT constraint_name, constraint_type FROM information_schema.table_constraints WHERE table_name = 'parts';")
  .then(res => { console.log(res[0]); process.exit(0); });
