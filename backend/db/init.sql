-- ============================================================
-- Schema do banco "Retirada de Senhas Online"
-- Executado automaticamente pelo container do MySQL na primeira
-- vez que o volume de dados for criado (docker-entrypoint-initdb.d).
-- Reconstruído a partir das queries usadas nos models do backend.
-- ============================================================

CREATE DATABASE IF NOT EXISTS bdsenha
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE bdsenha;

-- ------------------------------------------------------------
-- Clientes (login local ou via Google)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clientes (
    id                          INT AUTO_INCREMENT PRIMARY KEY,
    nome                        VARCHAR(150) NOT NULL,
    email                       VARCHAR(150) NOT NULL UNIQUE,
    senha                       VARCHAR(255) NULL,          -- NULL para contas só-Google
    google_id                   VARCHAR(255) NULL UNIQUE,
    email_verificado            TINYINT(1) NOT NULL DEFAULT 0,
    token_verificacao           VARCHAR(255) NULL,
    token_verificacao_expira    DATETIME NULL,
    token_reset                 VARCHAR(255) NULL,
    token_reset_expira          DATETIME NULL,
    criado_em                   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Administradores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(150) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    senha       VARCHAR(255) NOT NULL,
    criado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Atendentes (criados pelo admin)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS atendentes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nome        VARCHAR(150) NOT NULL,
    email       VARCHAR(150) NOT NULL UNIQUE,
    senha       VARCHAR(255) NOT NULL,
    ativo       TINYINT(1) NOT NULL DEFAULT 1,
    criado_por  INT NULL,
    criado_em   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_atendente_criado_por FOREIGN KEY (criado_por) REFERENCES admins(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Senhas (fila de atendimento)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS senha (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    numero          VARCHAR(10) NOT NULL,
    tipo            ENUM('normal', 'prioritario') NOT NULL,
    status          ENUM('esperando', 'chamando', 'atendido', 'cancelado') NOT NULL DEFAULT 'esperando',
    email_usuario   VARCHAR(150) NULL,       -- preenchido quando quem retirou está logado
    dispositivo_id  VARCHAR(255) NULL,       -- preenchido na retirada anônima (visitante)
    atendente_id    INT NULL,                -- quem chamou a senha
    codigo_acesso   VARCHAR(20) NOT NULL,    -- usado no acompanhamento sem login
    data            DATE NOT NULL,
    dia_referencia  DATE NOT NULL,
    criado_em       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_senha_atendente FOREIGN KEY (atendente_id) REFERENCES atendentes(id) ON DELETE SET NULL,
    INDEX idx_senha_dia_status (dia_referencia, status),
    INDEX idx_senha_dispositivo (dispositivo_id),
    INDEX idx_senha_codigo (codigo_acesso)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Configurações gerais (chave/valor)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracoes (
    id      INT AUTO_INCREMENT PRIMARY KEY,
    chave   VARCHAR(100) NOT NULL UNIQUE,
    valor   VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

INSERT INTO configuracoes (chave, valor) VALUES
    ('tempo_medio_atendimento',     '5'),
    ('horario_atendimento_inicio',  '08:00'),
    ('horario_atendimento_fim',     '18:00'),
    ('horario_senhas_inicio',       '08:00'),
    ('horario_senhas_fim',          '17:00'),
    ('dias_atendimento',            '1,2,3,4,5')
ON DUPLICATE KEY UPDATE chave = chave;

-- ------------------------------------------------------------
-- Admin padrão pra primeiro acesso
-- Login:  admin@sistema.com
-- Senha:  admin123   <-- TROCAR assim que possível, isso é só pra destravar o primeiro login
-- ------------------------------------------------------------
INSERT INTO admins (nome, email, senha)
VALUES ('Administrador', 'admin@sistema.com', '$2b$10$Pc60WTXSi1fk3VyzFySRj.0I1Bnrl7Bt2YKMfBtqN/3qd9mKQew8y')
ON DUPLICATE KEY UPDATE email = email;
