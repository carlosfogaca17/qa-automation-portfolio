-- Seed de dados para ambiente de teste.
-- Executado automaticamente pelo Docker Compose (montado em /docker-entrypoint-initdb.d).

TRUNCATE pedidos, usuarios RESTART IDENTITY CASCADE;

INSERT INTO usuarios (nome, email, ativo) VALUES
    ('Ana Souza',    'ana.souza@example.com',   TRUE),
    ('Bruno Lima',   'bruno.lima@example.com',  TRUE),
    ('Carla Dias',   'carla.dias@example.com',  FALSE),
    ('Diego Alves',  'diego.alves@example.com', TRUE);

INSERT INTO pedidos (usuario_id, descricao, valor, status) VALUES
    (1, 'Teclado mecânico',   350.00, 'PAGO'),
    (1, 'Mouse sem fio',       89.90, 'ENVIADO'),
    (2, 'Monitor 27"',        1299.99, 'PENDENTE'),
    (4, 'Webcam HD',          249.50, 'CANCELADO');
