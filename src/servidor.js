console.log("---SERVIDORJS: NOVA VERSAO---");
// Importa o Express e as nossas rotas
const express = require('express');
const empresasRoutes = require('./routes/empresasRoutes');

// Cria o nosso servidor
const app = express();
const PORTA = 3000;

// Diz ao Express para usar o JSON no corpo das requisições
app.use(express.json());

// Diz ao servidor para usar as rotas que definimos no outro ficheiro
// Todos os endpoints em 'empresasRoutes' começarão com '/api/empresas'
app.use('/api/empresas', empresasRoutes);

// Endpoint de teste da raiz da API
app.get('/', (req, res) => {
  res.json({ message: 'API está funcionando!' });
});

// Liga o servidor
app.listen(PORTA, "0.0.0.0", () => {
  console.log(`Servidor está ligado e à escuta em http://0.0.0.0:${PORTA}`);
});
