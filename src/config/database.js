// Importa a biblioteca do PostgreSQL
const { Pool } = require('pg');

// Configura a conexão com o banco de dados
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'dados_cnpj',
  password: 'mY[1HKgFpKqc', 
  port: 5432,
});

// Exporta o pool de conexões para que outros ficheiros possam usá-lo
module.exports = pool;