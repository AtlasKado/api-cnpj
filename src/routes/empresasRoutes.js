const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// --- ROTA DE BUSCA AVANÇADA ---

// Colocada PRIMEIRO para ser encontrada antes da rota por CNPJ

router.get('/search', async (req, res) => {
console.log("teste:rota  com cod novo") 
const { uf, cidade, porte, cep, limite = 50, pagina = 1 } = req.query;

  if (!uf && !cidade && !porte && !cep) {
    return res.status(400).json({ error: 'É necessário fornecer pelo menos um filtro (uf, cidade, porte ou cep).' });
  }

  // ATUALIZAÇÃO FINAL: A lista de campos selecionados agora é idêntica à da busca individual
  let queryBase = `
    SELECT 
      -- Campos da tabela 'empresas'
      e.cnpj_base,
      e.razao_social,
      e.capital_social,
      e.porte_empresa,
      e.qualificacao_responsavel,
      e.ente_federativo_responsavel,
      
      -- Campos da tabela 'estabelecimentos'
      es.cnpj_ordem,
      es.cnpj_dv,
      es.identificador_matriz_filial,
      es.nome_fantasia,
      es.situacao_cadastral,
      es.data_situacao_cadastral,
      es.motivo_situacao_cadastral,
      es.data_inicio_atividade,
      es.cnae_fiscal_secundaria,
      es.tipo_logradouro,
      es.logradouro,
      es.numero,
      es.complemento,
      es.bairro,
      es.cep,
      es.uf,
      es.ddd_1, es.telefone_1,
      es.correio_eletronico,
      es.situacao_especial,
      es.data_situacao_especial,
      
      -- Campos enriquecidos dos JOINs
      p.descricao AS pais,
      mun.descricao AS municipio, 
      cnae.descricao AS atividade_principal,
      nj.descricao AS natureza_juridica,
      es.cnpj_base || es.cnpj_ordem || es.cnpj_dv AS cnpj_completo
      
    FROM estabelecimentos es
    JOIN empresas e ON es.cnpj_base = e.cnpj_base
    LEFT JOIN municipios mun ON es.municipio::INT = mun.codigo
    LEFT JOIN cnaes cnae ON es.cnae_fiscal_principal::INT = cnae.codigo
    LEFT JOIN naturezas_juridicas nj ON e.natureza_juridica::INT = nj.codigo
    LEFT JOIN paises p ON es.pais::INT = p.codigo
    WHERE 1=1
  `;
  const queryParams = [];
  let paramIndex = 1;

  if (uf) {
    queryBase += ` AND es.uf = $${paramIndex++}`;
    queryParams.push(uf.toUpperCase());
  }
  if (cidade) {
    queryBase += ` AND mun.descricao ILIKE $${paramIndex++}`;
    queryParams.push(`%${cidade}%`);
  }
  if (porte) {
    queryBase += ` AND e.porte_empresa = $${paramIndex++}`;
    queryParams.push(porte);
  }
  if (cep) {
    queryBase += ` AND es.cep = $${paramIndex++}`;
    queryParams.push(cep.replace(/\D/g, ''));
  }

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





  // ATUALIZAÇÃO FINAL: Adicionamos o JOIN com 'naturezas_ju

// --- ROTA POR CNPJ ESPECÍFICO ---
// Colocada DEPOIS da rota de busca
router.get('/:cnpj', async (req, res) => {
  const cnpjCompleto = req.params.cnpj.replace(/\D/g, '');

  if (cnpjCompleto.length !== 14) {
    return res.status(400).json({ error: 'O CNPJ deve ter 14 dígitos.' });
  }

  const cnpjBase = cnpjCompleto.substring(0, 8);
  const cnpjOrdem = cnpjCompleto.substring(8, 12);
  const cnpjDv = cnpjCompleto.substring(12, 14);

  try {
    // ATUALIZAÇÃO: Usamos a mesma consulta rica em detalhes da busca avançada
    const resultado = await pool.query(
      `SELECT 
        e.*, nj.descricao AS natureza_juridica_descricao,
        es.*, mun.descricao AS municipio_descricao, cnae.descricao AS atividade_principal_descricao,
        p.descricao AS pais_descricao
      FROM empresas e
      JOIN estabelecimentos es ON e.cnpj_base = es.cnpj_base
      LEFT JOIN municipios mun ON es.municipio::INT = mun.codigo
      LEFT JOIN cnaes cnae ON es.cnae_fiscal_principal::INT = cnae.codigo
      LEFT JOIN naturezas_juridicas nj ON e.natureza_juridica::INT = nj.codigo
      LEFT JOIN paises p ON es.pais::INT = p.codigo
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




//buscar os sócios de uma empresa
router.get('/:cnpj/socios', async (req, res) => {
  const cnpjCompleto = req.params.cnpj.replace(/\D/g, '');
  const cnpjBase = cnpjCompleto.substring(0, 8);

  if (cnpjBase.length !== 8) {
    return res.status(400).json({ error: 'O CNPJ fornecido na URL é inválido.' });
  }

  try {
    // ATUALIZAÇÃO: Adicionamos um JOIN com 'qualificacoes_socios'
    const resultado = await pool.query(
      `SELECT 
         s.nome_socio, 
         s.cnpj_cpf_socio, 
         q.descricao AS qualificacao, 
         s.data_entrada_sociedade
       FROM socios s
       LEFT JOIN qualificacoes_socios q ON s.qualificacao_socio = q.codigo
       WHERE s.cnpj_base = $1`,
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

// Endpoint de ajuda para obter um CNPJ aleatório para testes
router.get('/test/random-cnpj', async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT cnpj_base || cnpj_ordem || cnpj_dv AS cnpj_completo
       FROM estabelecimentos
       WHERE identificador_matriz_filial = 1
       ORDER BY RANDOM()
       LIMIT 1;`
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Nenhum CNPJ de matriz encontrado para teste.' });
    }

    res.json(resultado.rows[0]);

  } catch (err) {
    console.error('Erro ao buscar CNPJ aleatório', err.stack);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;
