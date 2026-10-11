-- Queries utilitárias para validação em testes de banco de dados.

-- Q1: Total de usuários ativos
SELECT COUNT(*) AS usuarios_ativos
FROM usuarios
WHERE ativo = TRUE;

-- Q2: Valor total de pedidos pagos por usuário
SELECT u.nome,
       SUM(p.valor) AS total_pago
FROM usuarios u
JOIN pedidos p ON p.usuario_id = u.id
WHERE p.status = 'PAGO'
GROUP BY u.nome
ORDER BY total_pago DESC;

-- Q3: Usuários sem nenhum pedido
SELECT u.id, u.nome
FROM usuarios u
LEFT JOIN pedidos p ON p.usuario_id = u.id
WHERE p.id IS NULL;

-- Q4: Integridade — pedidos órfãos (não deveriam existir)
SELECT COUNT(*) AS orfaos
FROM pedidos p
LEFT JOIN usuarios u ON u.id = p.usuario_id
WHERE u.id IS NULL;
