const { Pool } = require('pg');

// Configurações da conexão
let dbConfig;

// Se a variável de ambiente DATABASE_URL existir (no Render), use-a.
if (process.env.DATABASE_URL) {
  dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  };
} else {
  // Caso contrário, use a configuração local para desenvolvimento.
  dbConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'dados_cnpj',
    password: 'mY[1HKgFpKqc',
    port: 5432,
  };
}

const pool = new Pool(dbConfig);
module.exports = pool;



