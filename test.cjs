const { Client } = require('pg');

async function testConnection() {
  const passwords = ['postgres', 'admin', 'root', '123456', 'password', ''];
  
  for (const pwd of passwords) {
    console.log(`Trying password: '${pwd}'`);
    const client = new Client({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: pwd,
      database: 'postgres'
    });
    
    try {
      await client.connect();
      console.log(`✅ Success with password: '${pwd}'`);
      await client.end();
      return pwd;
    } catch (e) {
      console.log(`❌ Failed with '${pwd}': ${e.message}`);
    }
  }
  return null;
}

testConnection();
