const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// --- ROTA DE BUSCA AVANÇADA (VERSÃO SEGURA) ---
router.get('/search', async (req, res) => {
  const { uf, cidade, limite = 50, pagina = 1 } = req.query; // Removidos filtros que davam erro

  let queryBase = `
    SELECT 
      e.*, 
      es.*,
      es.cnpj_base || es.cnpj_ordem || es.cnpj_dv AS cnpj_completo
    FROM empresas e
    JOIN estabelecimentos es ON e.cnpj_base = e.cnpj_base
    WHERE 1=1
  `;
  const queryParams = [];
  let paramIndex = 1;

  if (uf && uf.trim() !== '') {
    queryBase += ` AND es.uf = $${paramIndex++}`;
    queryParams.push(uf.toUpperCase());
  }
  
  // Nota: O filtro por 'cidade' foi removido temporariamente porque depende da tabela de municípios.
  
  const offset = (pagina - 1) * limite;
  queryBase += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  queryParams.push(limite, offset);

  try {
    const resultado = await pool.query(queryBase, queryParams);
    res.json({
      pagina_atual: parseInt(pagina),
      quantidade_de_resultados: resultado.rows.length,
      resultados: resultado.rows,
    });
  } catch (err) {
    console.error('Erro ao executar a busca avançada', err.stack);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// --- ROTA POR CNPJ ESPECÍFICO (VERSÃO SEGURA) ---
router.get('/:cnpj', async (req, res) => {
  const cnpjCompleto = req.params.cnpj.replace(/\D/g, '');
  if (cnpjCompleto.length !== 14) {
    return res.status(400).json({ error: 'O CNPJ deve ter 14 dígitos.' });
  }
  const cnpjBase = cnpjCompleto.substring(0, 8);
  const cnpjOrdem = cnpjCompleto.substring(8, 12);
  const cnpjDv = cnpjCompleto.substring(12, 14);

  try {
    const resultado = await pool.query(
      `SELECT e.*, es.* FROM empresas e
       JOIN estabelecimentos es ON e.cnpj_base = es.cnpj_base
       WHERE e.cnpj_base = $1 AND es.cnpj_ordem = $2 AND es.cnpj_dv = $3`,
      [cnpjBase, cnpjOrdem, cnpjDv]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Empresa não encontrada.' });
    }
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao executar a consulta', err.stack);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

// --- ROTA DE SÓCIOS (VERSÃO SEGURA) ---
router.get('/:cnpj/socios', async (req, res) => {
    const cnpjCompleto = req.params.cnpj.replace(/\D/g, '');
    const cnpjBase = cnpjCompleto.substring(0, 8);
  
    if (cnpjBase.length !== 8) {
      return res.status(400).json({ error: 'O CNPJ fornecido na URL é inválido.' });
    }
  
    try {
      const resultado = await pool.query(
        `SELECT * FROM socios WHERE s.cnpj_base = $1`,
        [cnpjBase]
      );
  
      if (resultado.rows.length === 0) {
        return res.status(404).json({ message: 'Nenhum sócio encontrado para esta empresa.' });
      }
      res.json(resultado.rows);
    } catch (err) {
      console.error('Erro ao buscar sócios', err.stack);
      res.status(500).json({ error: 'Erro interno do servidor.' });
    }
});
  
module.exports = router;