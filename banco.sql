create table Destinatario (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(255) NOT NULL,
	email VARCHAR(255) NOT NULL,
	numero VARCHAR(20) NOT NULL
);

create table tipoMensagem (
	id SERIAL PRIMARY KEY,
	nomeTipo VARCHAR(25) NOT NULL
);

create table Guardiao (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(255) NOT NULL,
	email VARCHAR(255) NOT NULL,
	numero VARCHAR(20) NOT NULL
);

CREATE TABLE tipo_usuario (
  id SERIAL PRIMARY KEY,
  nome varchar NOT NULL UNIQUE,
  descricao text
);

create table Usuario (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(255) NOT NULL,
	senha VARCHAR(255) NOT NULL,
	dataNasc DATE NOT NULL,
	estaMorto BOOLEAN DEFAULT FALSE,
	email VARCHAR(255) NOT NULL,
	numero VARCHAR(20),
	imagem VARCHAR(255),
	termos_versao_aceita VARCHAR(20),
	termos_aceito_em TIMESTAMPTZ,
	privacidade_versao_lida VARCHAR(20),
	privacidade_lida_em TIMESTAMPTZ,
	tipoUsuario INT NOT NULL REFERENCES tipo_usuario(id)
);

ALTER TABLE Destinatario
	ADD COLUMN fkUsuario INT NOT NULL REFERENCES Usuario(id);
ALTER TABLE Destinatario
	ADD CONSTRAINT destinatario_id_usuario_unico UNIQUE (id, fkUsuario);

CREATE UNIQUE INDEX usuario_email_unico ON Usuario (LOWER(BTRIM(email)));

create table Plano (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(50) NOT NULL,
	valorMensal FLOAT,
	armazenamentoGB INT
);

create table Mensagem (
	id SERIAL PRIMARY KEY,
	titulo VARCHAR(255) NOT NULL,
	conteudo TEXT NOT NULL DEFAULT '',
	anexoUrl VARCHAR(255),
	idTipoMensagem INT REFERENCES tipoMensagem(id),
	fkUsuario INT NOT NULL REFERENCES Usuario(id),
	data_envio TIMESTAMPTZ,
	status VARCHAR(32) NOT NULL DEFAULT 'rascunho'
		CHECK (status IN ('rascunho', 'agendada', 'aguardando_confirmacao',
			'pronta_para_envio', 'enviando', 'parcialmente_enviada', 'enviada',
			'falha', 'cancelada', 'legada')),
	criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	enviado_em TIMESTAMPTZ,
	tentativas_envio INT NOT NULL DEFAULT 0 CHECK (tentativas_envio >= 0),
	proxima_tentativa_em TIMESTAMPTZ,
	ultimo_erro TEXT,
	UNIQUE (id, fkUsuario)
);

CREATE INDEX mensagem_envio_agendado_idx
	ON Mensagem (data_envio)
	WHERE status = 'agendada';

CREATE INDEX mensagem_fila_envio_idx
	ON Mensagem (status, data_envio)
	WHERE status IN ('pronta_para_envio', 'parcialmente_enviada', 'falha');

CREATE TABLE Anexo_Mensagem (
	id SERIAL PRIMARY KEY,
	fkMensagem INT NOT NULL REFERENCES Mensagem(id) ON DELETE CASCADE,
	nome_original VARCHAR(255) NOT NULL,
	caminho_privado VARCHAR(512) NOT NULL,
	tipo_mime VARCHAR(100) NOT NULL,
	tamanho_bytes BIGINT NOT NULL CHECK (tamanho_bytes > 0 AND tamanho_bytes <= 15728640),
	criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE FUNCTION validar_limite_total_anexos_mensagem()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
	total_existente BIGINT;
BEGIN
	PERFORM 1 FROM Mensagem WHERE id = NEW.fkMensagem FOR UPDATE;

	SELECT COALESCE(SUM(tamanho_bytes), 0)
	INTO total_existente
	FROM Anexo_Mensagem
	WHERE fkMensagem = NEW.fkMensagem
	  AND id IS DISTINCT FROM NEW.id;

	IF total_existente + NEW.tamanho_bytes > 15728640 THEN
		RAISE EXCEPTION 'O conjunto de anexos da mensagem não pode exceder 15 MB.'
			USING ERRCODE = '23514';
	END IF;

	RETURN NEW;
END;
$$;

CREATE TRIGGER anexo_mensagem_limite_total
BEFORE INSERT OR UPDATE OF fkMensagem, tamanho_bytes ON Anexo_Mensagem
FOR EACH ROW
EXECUTE PROCEDURE validar_limite_total_anexos_mensagem();

create table Biografia (
	id SERIAL PRIMARY KEY,
	conteudo TEXT NOT NULL DEFAULT '',
	anexoUrl VARCHAR(255),
	tipoAnexo VARCHAR(100),
	dataHora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	fkUsuario INT NOT NULL REFERENCES Usuario(id),
	fkMensagem INT REFERENCES Mensagem(id)
);

create table Mural (
	id SERIAL PRIMARY KEY,
	fkUsuario INT NOT NULL UNIQUE REFERENCES Usuario(id)
);

create table Comentario (
	id SERIAL PRIMARY KEY,
	dataHora TIMESTAMP NOT NULL,
	conteudo VARCHAR(500) NOT NULL,
	fkMural INT NOT NULL REFERENCES Mural(id),
	fkUsuario INT NOT NULL REFERENCES Usuario(id)
);

create table Usuario_Guardiao (
	id SERIAL PRIMARY KEY,
	chave VARCHAR(255),
	idUsuario INT NOT NULL,
	idGuardiao INT NOT NULL,
	votoConfirma BOOLEAN DEFAULT FALSE,
	estado_vinculo VARCHAR(20) NOT NULL DEFAULT 'pendente'
		CHECK (estado_vinculo IN ('pendente', 'confirmado', 'revogado')),
	token_vinculo_hash CHAR(64),
	token_vinculo_expira_em TIMESTAMPTZ,
	convite_enviado_em TIMESTAMPTZ,
	vinculo_confirmado_em TIMESTAMPTZ,
	CONSTRAINT fkUsuario FOREIGN KEY(idUsuario) REFERENCES Usuario(id),
	CONSTRAINT fkGuardiao FOREIGN KEY(idGuardiao) REFERENCES Guardiao(id),
	CONSTRAINT usuario_guardiao_unico UNIQUE (idUsuario, idGuardiao)
);

CREATE UNIQUE INDEX usuario_guardiao_token_vinculo_unico
	ON Usuario_Guardiao (token_vinculo_hash)
	WHERE token_vinculo_hash IS NOT NULL;

CREATE TABLE Solicitacao_Falecimento (
	id SERIAL PRIMARY KEY,
	fkUsuario INT NOT NULL REFERENCES Usuario(id),
	status VARCHAR(32) NOT NULL DEFAULT 'aguardando_confirmacoes'
		CHECK (status IN ('aguardando_confirmacoes', 'confirmada', 'cancelada', 'expirada')),
	confirmacoes_necessarias SMALLINT NOT NULL DEFAULT 3
		CHECK (confirmacoes_necessarias >= 3),
	solicitado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	confirmado_em TIMESTAMPTZ,
	iniciado_por_vinculo INT REFERENCES Usuario_Guardiao(id)
);

CREATE UNIQUE INDEX solicitacao_falecimento_pendente_unica
	ON Solicitacao_Falecimento (fkUsuario)
	WHERE status = 'aguardando_confirmacoes';

CREATE TABLE Confirmacao_Falecimento (
	id SERIAL PRIMARY KEY,
	fkSolicitacao INT NOT NULL REFERENCES Solicitacao_Falecimento(id) ON DELETE CASCADE,
	fkUsuarioGuardiao INT NOT NULL REFERENCES Usuario_Guardiao(id),
	token_hash CHAR(64) NOT NULL UNIQUE,
	expira_em TIMESTAMPTZ NOT NULL,
	confirmado_em TIMESTAMPTZ,
	criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT confirmacao_falecimento_guardiao_unica
		UNIQUE (fkSolicitacao, fkUsuarioGuardiao)
);

CREATE INDEX confirmacao_falecimento_pendente_idx
	ON Confirmacao_Falecimento (expira_em)
	WHERE confirmado_em IS NULL;

CREATE TABLE Notificacao (
	id SERIAL PRIMARY KEY,
	fkUsuario INT NOT NULL REFERENCES Usuario(id) ON DELETE CASCADE,
	titulo VARCHAR(255) NOT NULL,
	conteudo TEXT NOT NULL,
	criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
	lida_em TIMESTAMPTZ,
	tipo VARCHAR(50),
	referencia_id INTEGER
);

CREATE INDEX notificacao_usuario_recente_idx
	ON Notificacao (fkUsuario, criado_em DESC);

CREATE INDEX notificacao_usuario_nao_lida_idx
	ON Notificacao (fkUsuario)
	WHERE lida_em IS NULL;

CREATE UNIQUE INDEX notificacao_vinculo_unica_idx
	ON Notificacao (fkUsuario, tipo, referencia_id)
	WHERE tipo IS NOT NULL AND referencia_id IS NOT NULL;

create table Destinatario_Mensagem (
	id SERIAL PRIMARY KEY,
	fkDestinatario INT NOT NULL REFERENCES Destinatario(id),
	fkMensagem INT NOT NULL REFERENCES Mensagem(id),
	fkUsuario INT NOT NULL REFERENCES Usuario(id),
	status_envio VARCHAR(24) NOT NULL DEFAULT 'pendente'
		CHECK (status_envio IN ('pendente', 'enviando', 'enviado', 'falha', 'cancelado', 'legada')),
	tentativas INT NOT NULL DEFAULT 0 CHECK (tentativas >= 0),
	proxima_tentativa_em TIMESTAMPTZ,
	enviado_em TIMESTAMPTZ,
	ultimo_erro TEXT,
	CONSTRAINT destinatario_mensagem_unico UNIQUE (fkMensagem, fkDestinatario),
	CONSTRAINT destinatario_mensagem_mensagem_usuario_fk
		FOREIGN KEY (fkMensagem, fkUsuario) REFERENCES Mensagem(id, fkUsuario),
	CONSTRAINT destinatario_mensagem_destinatario_usuario_fk
		FOREIGN KEY (fkDestinatario, fkUsuario) REFERENCES Destinatario(id, fkUsuario)
);

CREATE INDEX destinatario_mensagem_fila_idx
	ON Destinatario_Mensagem (fkMensagem, proxima_tentativa_em)
	WHERE status_envio IN ('pendente', 'falha', 'enviando');

create table Assinatura (
	id SERIAL PRIMARY KEY,
	dataInicio TIMESTAMP,
	dataFim TIMESTAMP,
	dias INT NOT NULL,
	fkUsuario INT REFERENCES Usuario(id),
	fkPlano INT REFERENCES Plano(id)
);

insert into tipo_usuario (nome, descricao)
values ('USUARIO', 'Usuário comum'),
       ('ADMIN', 'Administrador do sistema'),
       ('GUARDIAO', 'Guardião do usuário');

insert into tipoMensagem (nomeTipo)
values ('txt'), ('pdf'), ('img'), ('wav'), ('mp4'), ('docx'), ('mp3');

insert into usuario(nome, senha, dataNasc, email, tipoUsuario)
values ('admin', '$2b$10$PA64fjfE0..fdNSW9kJuEeKUxNnkRfrUTU7mvloEECIa0yIiflLb2', '2007-06-12', 'admin@gmail.com', 2);

insert into usuario(nome, senha, dataNasc, email, tipoUsuario)
values ('usuario', '$2b$10$PA64fjfE0..fdNSW9kJuEeKUxNnkRfrUTU7mvloEECIa0yIiflLb2', '2007-06-12', 'usuario@gmail.com', 1);

INSERT INTO Usuario
(nome, senha, dataNasc, estaMorto, email, numero, tipoUsuario)
VALUES
('Ana Clara Silva', '$2b$10$EN6gfaPLkDxeOxMl2J7Ld.CtafYYH.WlpwSx7cyMKJ0kIK0JJR1iO', '2005-01-15', FALSE, 'ana.silva01@email.com', '11990000001', 1),
('Bruno Henrique Santos', '$2b$10$yra6VzYwwBs03aYW0pa0JO594q4f1.LGFu8nMThoua/EN9gVv8v/q', '2004-02-20', FALSE, 'bruno.santos02@email.com', '11990000002', 1),
('Carlos Eduardo Oliveira', '$2b$10$TA2jMIJ0dE9w2jpJjmdKEeGtXPeMLTcjdTScXYJ9OF1UZcfCxZ9qS', '2003-03-12', FALSE, 'carlos.oliveira03@email.com', '11990000003', 1),
('Daniela Souza', '$2b$10$R0aKi2ujbr0cOdAdglpxcuwyr/ABBCoq/exVfZFwCzR1pwejWpQSa', '2006-04-25', FALSE, 'daniela.souza04@email.com', '11990000004', 1),
('Eduardo Lima', '$2b$10$HJwwBs.q6g30F75aWjzeXON3WPfkaxIUfD/pWsPdFRtAkfJu/Ik/2', '2002-05-18', FALSE, 'eduardo.lima05@email.com', '11990000005', 1),
('Fernanda Costa', '$2b$10$dxZedabsiT7y6iMt/rCMP.YWXcvz6rvvxW1m/0uJyr5K5ag7Z6VEi', '2005-06-30', FALSE, 'fernanda.costa06@email.com', '11990000006', 1),
('Gabriel Almeida', '$2b$10$3hWARKOFaFGCQep4S8BumeKG6CZmIXV6dvkjkgRaKDFN8T00JKOkS', '2004-07-11', FALSE, 'gabriel.almeida07@email.com', '11990000007', 1),
('Helena Pereira', '$2b$10$0VsRW2aiNp6KZ.Np154SYulNEUMLv9uQMjiPtTHCsEIxGe.4ptt.y', '2003-08-22', FALSE, 'helena.pereira08@email.com', '11990000008', 1),
('Igor Rodrigues', '$2b$10$H2K0w0Zml9i9F9sIveFdM.lGT2KOlSSTPfuiS4Xyn7TnobSRdY5Yq', '2006-09-14', FALSE, 'igor.rodrigues09@email.com', '11990000009', 1),
('Juliana Martins', '$2b$10$tbRDqPvOaONe412x27qE4uflMpF5Wcnp9xSYr19U64Ty2imZdXZVy', '2005-10-05', FALSE, 'juliana.martins10@email.com', '11990000010', 1),

('Lucas Barbosa', '$2b$10$jdvOUf8Dd2e0mUPy4LlKc.vYqdS1KK1vWz3f6cL.zrxFyzkcmf6mq', '2004-11-17', FALSE, 'lucas.barbosa11@email.com', '11990000011', 1),
('Mariana Ribeiro', '$2b$10$xX6KtqfkRZecAnR.VP4jTeFeJ0JiLk9aj21ogw81jndp7V8LI5E6.', '2003-12-09', FALSE, 'mariana.ribeiro12@email.com', '11990000012', 1),
('Nicolas Carvalho', '$2b$10$NWpaOmdk5SO956SrAfTV/eZHiEd10DBDIoUW3WhJIJQsmU0KvNwg.', '2005-01-28', FALSE, 'nicolas.carvalho13@email.com', '11990000013', 1),
('Olivia Gomes', '$2b$10$I3zU3PyoHGukn22xMFRuWeTGv9SKmE0YEMwDMSEqWAmxt8wHQc5v2', '2006-02-16', FALSE, 'olivia.gomes14@email.com', '11990000014', 1),
('Paulo Teixeira', '$2b$10$zrGg4W8KP79/OoniqnJluu3fv3yeLY5Msbjg5XD98awcRqRvLsrie', '2002-03-27', FALSE, 'paulo.teixeira15@email.com', '11990000015', 1),
('Renata Moreira', '$2b$10$TKBCLVowXmTLVALDSgaVTe5T1ScKYl2mYk2u4DZJ0bIadktCSx1Ja', '2004-04-19', FALSE, 'renata.moreira16@email.com', '11990000016', 1),
('Samuel Ferreira', '$2b$10$Oozz5jjR4q14Pa5729ncY.XTWYGwTY.QqD82oUohaFl0Kj6YCIQkW', '2003-05-07', FALSE, 'samuel.ferreira17@email.com', '11990000017', 1),
('Tatiana Mendes', '$2b$10$UQ5SrAxAsTLsl6NfsGTgNOVCKmZRTSqen0ujE0yMd93V9yExS5OgG', '2005-06-21', FALSE, 'tatiana.mendes18@email.com', '11990000018', 1),
('Victor Nunes', '$2b$10$PRFFGDzdn2GL6Xvh98C3IOiO7hhEQjQW9xzOJcjnIm01MEuhp3LTK', '2006-07-13', FALSE, 'victor.nunes19@email.com', '11990000019', 1),
('Yasmin Castro', '$2b$10$sYHpNxNS7AjRux6eMYef6.KmklCCV1VQyZrvcaN1QXkOvALyr3GL6', '2004-08-29', FALSE, 'yasmin.castro20@email.com', '11990000020', 1),

('Adriana Martins', '$2b$10$ZTf4UHnc5OpG6tQdCwfciuoMEDltFAlq2YcRNNbXRuh0aE2YV7ZyO', '2003-09-10', FALSE, 'adriana.martins21@email.com', '11990000021', 1),
('Alexandre Souza', '$2b$10$aD/4L06pcmdifxc33uEXQOB/j7Siz5Y5YAA3LRU03KkpP0Tr9IFxi', '2005-10-23', FALSE, 'alexandre.souza22@email.com', '11990000022', 1),
('Alice Ferreira', '$2b$10$RC3IOOK.HnWcO8fl8OGHYO9leZZm.qB75wPgeTefqp9cpRT.LhELu', '2006-11-15', FALSE, 'alice.ferreira23@email.com', '11990000023', 1),
('Anderson Lima', '$2b$10$Yso68XofwvwOnkzxRg7ktOcKn4PhJlkxAacNa0W/NgRHfkM0TF/2q', '2002-12-04', FALSE, 'anderson.lima24@email.com', '11990000024', 1),
('Beatriz Almeida', '$2b$10$BW13h7SqwLQKVCJAgCWyj.Cz3IrUNcXhsHQQI9uXoDiIGzNYeMo6a', '2004-01-19', FALSE, 'beatriz.almeida25@email.com', '11990000025', 1),
('Bianca Costa', '$2b$10$UtsSgxBn/BCBgFbxR1AfIOoZeed3u.IyIVfR0Cqa.E7FrEgdEqswW', '2005-02-27', FALSE, 'bianca.costa26@email.com', '11990000026', 1),
('Caio Pereira', '$2b$10$wst27v16gCBOve1k/8enBO0uOojagXp9gg23fMiQBoe7INBu1Es86', '2003-03-16', FALSE, 'caio.pereira27@email.com', '11990000027', 1),
('Camila Rodrigues', '$2b$10$6NIgEBOvRWAWfzA/Eml6dOnUJQsMeGGHAqikEOO3tDhGL166B5a0e', '2006-04-08', FALSE, 'camila.rodrigues28@email.com', '11990000028', 1),
('Cesar Martins', '$2b$10$1xSCNU3VkQosfR3gkyVvOeTC2wi4YJIlXrYNkmsMZm7MmncJ.3jB6', '2002-05-25', FALSE, 'cesar.martins29@email.com', '11990000029', 1),
('Clara Barbosa', '$2b$10$aYKFGRCQOjEnx.BVpLY.8u3MaPj0EREdMn3FlsNaMbCfOOFrYNwKq', '2004-06-14', FALSE, 'clara.barbosa30@email.com', '11990000030', 1),

('Cristian Ribeiro', '$2b$10$GhHvuJjp9x2QdZjHxfOHhOpc5oVsnyj2nG8SCoOQEBdDLRsLOPyIm', '2005-07-22', FALSE, 'cristian.ribeiro31@email.com', '11990000031', 1),
('Diego Carvalho', '$2b$10$8B8oHiUXnFNEcEeXxYAKXuFfFPDf2lqLKgDRhiRzgKge0A2duKCBW', '2003-08-17', FALSE, 'diego.carvalho32@email.com', '11990000032', 1),
('Douglas Gomes', '$2b$10$37Tt/EDm6HWHbq4DKJ83vOHm7udXvuXrEYN2yaqfsMFCDt.ndT9NG', '2006-09-29', FALSE, 'douglas.gomes33@email.com', '11990000033', 1),
('Elisa Teixeira', '$2b$10$giRqxwG/.EnleIc5Qs5yr.Ra6veGfjK46Hp45WUfTxZjA6Lbr6YfC', '2004-10-11', FALSE, 'elisa.teixeira34@email.com', '11990000034', 1),
('Emanuel Moreira', '$2b$10$/5C1kBNUbVS8r27KXUPCEeUk77l/owVlcfOcRowRczhqFOPvbYeSG', '2002-11-06', FALSE, 'emanuel.moreira35@email.com', '11990000035', 1),
('Fabiana Ferreira', '$2b$10$I2maxFKjig7sW.IS73.UQej.LaSiNmyaQWH7G6xewjoNVBpBNaRf6', '2005-12-18', FALSE, 'fabiana.ferreira36@email.com', '11990000036', 1),
('Felipe Mendes', '$2b$10$Epi2DYh.NLK/9C/1N8Hblu4eSZwv9Jqczk8KdAErIpoRp6aNzudKS', '2003-01-24', FALSE, 'felipe.mendes37@email.com', '11990000037', 1),
('Gustavo Nunes', '$2b$10$VzuXt5.hwyMf6QXpKZXA0eWV8OIbwYKpJIC9oHx6NKOZbgcyCi7sm', '2004-02-13', FALSE, 'gustavo.nunes38@email.com', '11990000038', 1),
('Isabela Castro', '$2b$10$zum9RpLEqkzDYhkVv4WlmeMnvEC4bFk3x2lo5S048C8gL17Z26khe', '2006-03-31', FALSE, 'isabela.castro39@email.com', '11990000039', 1),
('Joao Martins', '$2b$10$9Qw8iKRVAR8XshP561GhkufNsnqxZqOD96TpII96vK7rvTztlMYSu', '2005-04-20', FALSE, 'joao.martins40@email.com', '11990000040', 1),

('Karen Silva', '$2b$10$x7wdUwlfn869Cyp4Y4.KBOrwYcRBgCHF2pMnIKnrwE.JCpWo4mgaW', '2003-05-12', FALSE, 'karen.silva41@email.com', '11990000041', 1),
('Leonardo Santos', '$2b$10$DVFxGJSaKlZsPsIjsxbbHO7qBY9PDeIiQ1F6Td4nvz8FKPYlikEZe', '2002-06-28', FALSE, 'leonardo.santos42@email.com', '11990000042', 1),
('Larissa Oliveira', '$2b$10$b5BsFYDcK7Cr.IgDiXMUc.jo187kSwVVf5sNZftUYcFpFUwzk.CVO', '2004-07-09', FALSE, 'larissa.oliveira43@email.com', '11990000043', 1),
('Leticia Souza', '$2b$10$0jmdATV9JhxqQqqQq/R84epxgbaPvvDrkFDJZhzD4IedDgq9C2jKa', '2005-08-26', FALSE, 'leticia.souza44@email.com', '11990000044', 1),
('Marcelo Lima', '$2b$10$ZnN9mkJEo5hIw5NDgphChO8QUoDu7w2A4ORyS6E459DYpegrunbxi', '2003-09-18', FALSE, 'marcelo.lima45@email.com', '11990000045', 1),
('Marcos Costa', '$2b$10$TVwdbYlRAWZfGyKhOlDZAu6AQ7YpZCBEtmARxG2KadRmcRdWx2X0u', '2006-10-07', FALSE, 'marcos.costa46@email.com', '11990000046', 1),
('Natalia Almeida', '$2b$10$bdN8wBAbZ69pY0rr1Fz60eEVx/C5q3kAfM2WLTTkczt5LkrZQkx9G', '2004-11-21', FALSE, 'natalia.almeida47@email.com', '11990000047', 1),
('Otavio Pereira', '$2b$10$uFUcLVJkqCjZnO3va1X/cemujeAYJoxPqMIxUiBdQ91oVDssiiw..', '2002-12-15', FALSE, 'otavio.pereira48@email.com', '11990000048', 1),
('Patricia Rodrigues', '$2b$10$o/nWZokDOLHzEZPIN5rfYuDhP/mksJEYn9DYBZ8FzngYPtbnQFzOa', '2005-01-30', FALSE, 'patricia.rodrigues49@email.com', '11990000049', 1),
('Rafael Barbosa', '$2b$10$buePQK5gv5xL3bvPkXLql.WS3nWsa2UUU80/uAVC77WzbVoZ0aEH6', '2003-02-22', FALSE, 'rafael.barbosa50@email.com', '11990000050', 1),

('Raquel Ribeiro', '$2b$10$PouSQbI3HuACPepaBKyFV.j70e.00aTEkg5i3BYdndIlj5JRsW.8G', '2004-03-17', FALSE, 'raquel.ribeiro51@email.com', '11990000051', 1),
('Rodrigo Carvalho', '$2b$10$x1GVCZQTCxq8AGnRuw6nFO1seVojyuoC/Y408s17X6DhGQSD5/qFW', '2006-04-29', FALSE, 'rodrigo.carvalho52@email.com', '11990000052', 1),
('Sabrina Gomes', '$2b$10$xUy4.xG2UISHq3g76ceK1O9XB7LCUttntPFrJzQx5i918kxEUi2k.', '2005-05-11', FALSE, 'sabrina.gomes53@email.com', '11990000053', 1),
('Thiago Teixeira', '$2b$10$i2.9nqMTeExKT2H.XbM0D.QhOc0J/arF.r3NvttySKpoQB4wJUbz2', '2002-06-19', FALSE, 'thiago.teixeira54@email.com', '11990000054', 1),
('Vanessa Moreira', '$2b$10$zF4Q3uBHw5jm8BBNpQjsPO04neGMhklOeFa0KYhV1u6UQ7ZSBU9fu', '2004-07-27', FALSE, 'vanessa.moreira55@email.com', '11990000055', 1),
('Wesley Ferreira', '$2b$10$impu/Zd7gMOqQkhMsnP2W.MYJCc.1WYs7xw5rkYJwHBEWE6a7V0a.', '2003-08-14', FALSE, 'wesley.ferreira56@email.com', '11990000056', 1),
('Aline Mendes', '$2b$10$htAYX96nDFS1LczQYYboE.Xa7Jvq1zAxQiYRCcNT7v3QyLvhMbIUe', '2006-09-05', FALSE, 'aline.mendes57@email.com', '11990000057', 1),
('Arthur Nunes', '$2b$10$5UK.Dl6Z0q0rJ8rzzW0dtOXohp1bCODDTidN.yuh.yQWK3OpqR7yG', '2005-10-16', FALSE, 'arthur.nunes58@email.com', '11990000058', 1),
('Bruna Castro', '$2b$10$95ZmGnhlNKaYbHflggPWjeYdof78ciPJ2PB6byVa1jqQV1hyI7sIK', '2004-11-28', FALSE, 'bruna.castro59@email.com', '11990000059', 1),
('Cauan Silva', '$2b$10$E64.L9H.szDKx.F88piHK.79ysDrafshau5LhCzgFtimqn7Lg/qCa', '2003-12-20', FALSE, 'cauan.silva60@email.com', '11990000060', 1),

('Denise Santos', '$2b$10$Q9lJNro.ajwZtRdmzIjL8.Y3c6w4wQJ60LOB8RQNQV..uCQQCwCoO', '2005-01-09', FALSE, 'denise.santos61@email.com', '11990000061', 1),
('Erick Oliveira', '$2b$10$W4t34dX4XmPjzPo4zjhVt.Uv7jzpHoqYi4tvXzbpXuX3HUiDkd4Iq', '2006-02-24', FALSE, 'erick.oliveira62@email.com', '11990000062', 1),
('Flavia Souza', '$2b$10$BtK2lm0NDGqZlbUMbK52D.H38mGSQwFFxDa4rLpIk3w7/GM84rlM.', '2004-03-13', FALSE, 'flavia.souza63@email.com', '11990000063', 1),
('Henrique Lima', '$2b$10$FXSRjJZh314ixfchaJMdq.oZXuWg2sVqGeuOg/PJKV9LKgOS7brd2', '2002-04-18', FALSE, 'henrique.lima64@email.com', '11990000064', 1),
('Ingrid Costa', '$2b$10$4/tQ9n/dhQemtH1Q0Q5GFuEeTxhUm7SAcWDoeMi7D3HCAsWleDFoy', '2005-05-26', FALSE, 'ingrid.costa65@email.com', '11990000065', 1),
('Jorge Almeida', '$2b$10$BCvPzdta/6PdCJF6QZ2YV.ybEF8leyQbKHMcarGUMcTOzDslLdyti', '2003-06-08', FALSE, 'jorge.almeida66@email.com', '11990000066', 1),
('Karina Pereira', '$2b$10$fz7V7XoLoCx3u3O0Z9YTqu0xa4NX4vB9Dk0t7JD1DD/K75pHHhNha', '2006-07-19', FALSE, 'karina.pereira67@email.com', '11990000067', 1),
('Luis Rodrigues', '$2b$10$fWKfdZnr4TxqNrcieN4Wcuh.C2XdyFVe6A2Ehc5akChYOE0IzNel.', '2004-08-30', FALSE, 'luis.rodrigues68@email.com', '11990000068', 1),
('Michele Martins', '$2b$10$ozffcuz20zV2R.Vp7QWDZ.z6fxOIdaq.1Wmx7yfohMh0jISD5pyeq', '2005-09-22', FALSE, 'michele.martins69@email.com', '11990000069', 1),
('Nelson Barbosa', '$2b$10$E8NJBIjFwec/.wZ/qwczMuiEDkWnacU3roF2ZM7lTIqrkHIUE3Tpe', '2002-10-14', FALSE, 'nelson.barbosa70@email.com', '11990000070', 1),

('Priscila Ribeiro', '$2b$10$yAqU6UV/1m53Bzbu1MoYO.jY8kpFHlyCfOfYsKfVVwn//Qz8bQW6m', '2004-11-05', FALSE, 'priscila.ribeiro71@email.com', '11990000071', 1),
('Ricardo Carvalho', '$2b$10$szMN0BLcgNZ6w8MoX/vjv.xOOFvqyp9Y0ryc3YHrnIVGODGE8W3gG', '2003-12-17', FALSE, 'ricardo.carvalho72@email.com', '11990000072', 1),
('Simone Gomes', '$2b$10$2gVAWwEJKxD0pCUpt7LIJ.v1JZ8ZVu08MvDTe9Q4akkkVDVrLNPqO', '2006-01-23', FALSE, 'simone.gomes73@email.com', '11990000073', 1),
('Tales Teixeira', '$2b$10$CIRHgMMIGZEdOi0lt9BUC.jUKxSvPSmafUdOmzj.9BJQ01RBvi9JC', '2005-02-11', FALSE, 'tales.teixeira74@email.com', '11990000074', 1),
('Valeria Moreira', '$2b$10$kq6IwAdsRttgwrCSiDwD0ehl9D135JfDwb90M7RMmAyd4i//K9tbG', '2004-03-29', FALSE, 'valeria.moreira75@email.com', '11990000075', 1),
('William Ferreira', '$2b$10$c8DmLv3i9rwP.in7bzntUORh/yd30aI4PBsqdfHTr2rzboVbnofHe', '2003-04-15', FALSE, 'william.ferreira76@email.com', '11990000076', 1),
('Amanda Mendes', '$2b$10$Z3LeSfXYVBtXyQXY.Vg5QeimNy1FLM6XT7tJaN0Ztk.Izc6J3IQ96', '2006-05-07', FALSE, 'amanda.mendes77@email.com', '11990000077', 1),
('Bernardo Nunes', '$2b$10$S6Ng5y4pP338Xcvq1T9m0.0JVer6aTzGKdQi4Hof0xpYwmkDkQeke', '2005-06-23', FALSE, 'bernardo.nunes78@email.com', '11990000078', 1),
('Carolina Castro', '$2b$10$CVlqkKdaR9ypU3jDgefbR.aBOssdLBxyhEXp1g/tLQqaOZN5SkFla', '2004-07-31', FALSE, 'carolina.castro79@email.com', '11990000079', 1),
('Danilo Silva', '$2b$10$47aeWbqcmcKIOYeGZLftyuQ97wFBTyO3Gu6C8qU2frb2WKxzy.v5.', '2002-08-18', FALSE, 'danilo.silva80@email.com', '11990000080', 1),

('Eliane Santos', '$2b$10$u4EDojxQwf1bLfL0RbAi/eg/LXIXO9DFhp9kGBLV/fin2BN6XnK0W', '2005-09-27', FALSE, 'eliane.santos81@email.com', '11990000081', 1),
('Fernando Oliveira', '$2b$10$mMbEgxa5NvYFw6VGTSeKT./KWrJ0VACFgJVBySFb4jevd/Zml7zzm', '2003-10-12', FALSE, 'fernando.oliveira82@email.com', '11990000082', 1),
('Giovana Souza', '$2b$10$OLGtLHknWS/uRHY7ufY7qehEGkQGNJiWcD676xz2uAifC3HOHa9QS', '2006-11-19', FALSE, 'giovana.souza83@email.com', '11990000083', 1),
('Hugo Lima', '$2b$10$NXwCu.Vsd62kIuxULYzF.OOT1hvPoihhPhVuDcInnOfUK8Lwk4chq', '2004-12-06', FALSE, 'hugo.lima84@email.com', '11990000084', 1),
('Iara Costa', '$2b$10$/p5kK4b108Cd3Oh2pAiEQOPwF9szMxW/yqoeorsUSEcYkVMYiH3nu', '2005-01-21', FALSE, 'iara.costa85@email.com', '11990000085', 1),
('Jonas Almeida', '$2b$10$n6tKao91jx0kKPRAJo.2VOTkcOkHpJJUg62.S2m81W5YwjJu162Lu', '2002-02-28', FALSE, 'jonas.almeida86@email.com', '11990000086', 1),
('Katia Pereira', '$2b$10$cUWp3qvoijxu9WvAvJBF9.08FR7v5F1nA.ZToTWUnSgq.ir6FOy2K', '2004-03-09', FALSE, 'katia.pereira87@email.com', '11990000087', 1),
('Leandro Rodrigues', '$2b$10$uwdxWLGPPM248w0UtfHH1uDJKYwPDLDelQFhpPsBnH.JZtWiNP6Eq', '2003-04-22', FALSE, 'leandro.rodrigues88@email.com', '11990000088', 1),
('Monique Martins', '$2b$10$WUQ/rLdxkTDkDrEV/WcwVOZtdRKPW.s7P.9XuD9aDsc5q7ms0kMy6', '2006-05-16', FALSE, 'monique.martins89@email.com', '11990000089', 1),
('Norberto Barbosa', '$2b$10$UBQ9HEri.7MrO6XAa8FPA.1QxOo7Nm1nOp4JeMCD4SkmwtiZ28MSG', '2005-06-28', FALSE, 'norberto.barbosa90@email.com', '11990000090', 1),

('Amanda Ribeiro', '$2b$10$FR1WkLl3ADILyZbvhkW8Tu5EQU7uV2l3biqbRpnpwgyLTrIu09jq.', '2004-07-13', FALSE, 'amanda.ribeiro91@email.com', '11990000091', 1),
('Roberto Carvalho', '$2b$10$sae2gsTpChXF6vuaDgJKn.cqajm.7R/6FHWi0CdPP7A2q4yFrPUTm', '2003-08-25', FALSE, 'roberto.carvalho92@email.com', '11990000092', 1),
('Silvia Gomes', '$2b$10$w9PxPLKTqaO5.f3X.KKOieOeLcq1n27axamN5S4rPue9wcP6odqBy', '2006-09-17', FALSE, 'silvia.gomes93@email.com', '11990000093', 1),
('Tomaz Teixeira', '$2b$10$65ppnyCIA7p457gwUupUZeLClGpU5VAg7fyF2Y71lD5Q8WQnRSSFK', '2005-10-29', FALSE, 'tomaz.teixeira94@email.com', '11990000094', 1),
('Viviane Moreira', '$2b$10$bBtUSLeORJL9Hr8ecdcquuaftJsboXj6rq0UV3eb/qqE3ALZ1rpg6', '2004-11-14', FALSE, 'viviane.moreira95@email.com', '11990000095', 1),
('Alex Ferreira', '$2b$10$tKTSxt4d68H8utCLGEKPeOcsgdXfTQOjU8PK3qCQyPEM2BT9VPBju', '2002-12-23', FALSE, 'alex.ferreira96@email.com', '11990000096', 1),
('Barbara Mendes', '$2b$10$i1Mp27QVAWevkRjt9ezn9er..Pxc0R66jTTFjlmlshpkCZxtsBaIm', '2005-01-06', FALSE, 'barbara.mendes97@email.com', '11990000097', 1),
('Diego Nunes', '$2b$10$9Ln5T4wKgeld481Jy1fntOU.c8R.qkU7P/ofS67Y4gPolLWta6QzK', '2003-02-17', FALSE, 'diego.nunes98@email.com', '11990000098', 1),
('Estela Castro', '$2b$10$oxcnSYZ6xSqKrcXVeRjpw.j55IlpI4QjtNTQhWw6d3gUy.CgvPewu', '2006-03-26', FALSE, 'estela.castro99@email.com', '11990000099', 1),
('Fabio Silva', '$2b$10$Mlf0/czKFJ6UqY/xN.R3OekfNLjzpPprrJRcZQ0qDHPDLRcO8HDBy', '2004-04-11', FALSE, 'fabio.silva100@email.com', '11990000100', 1),

('Gabriela Santos', '$2b$10$UJ58nnbcq84MfK2zt1TROuBAbARQnCOLhDHzKYvHkx3vUYmplDaf.', '2005-05-19', FALSE, 'gabriela.santos101@email.com', '11990000101', 1),
('Heitor Oliveira', '$2b$10$nmUOFecUt3J1PeWf7KPBRuHlz.jrDfJaiAWsLt8hY0lLlmRvoVkrO', '2003-06-27', FALSE, 'heitor.oliveira102@email.com', '11990000102', 1),
('Isis Souza', '$2b$10$dSduBCg4/3.ibtTJWNUYN.HykKBwYss72lTrhBB/QpUYWLwTMHK5W', '2006-07-08', FALSE, 'isis.souza103@email.com', '11990000103', 1),
('Joao Lima', '$2b$10$Gb1SwMDnAHDaSwUMzcWz9.sZls7b/J6zeRoZmn2fH/M2ibUV9yxNm', '2004-08-21', FALSE, 'joao.lima104@email.com', '11990000104', 1),
('Kelly Costa', '$2b$10$fnNub3L2RKdlQgyI99yq1.y5sH9gVQNAs4TSsKsTIWtpSgU7erOby', '2002-09-13', FALSE, 'kelly.costa105@email.com', '11990000105', 1),
('Leonardo Almeida', '$2b$10$BjmE5HIi9xyB051nIWgwl.kc0x1UdlMvJ40xIxAs58mEYflZdrpVm', '2005-10-24', FALSE, 'leonardo.almeida106@email.com', '11990000106', 1),
('Luana Pereira', '$2b$10$KEyFUjerJGdNn1TMUbrsP.N4B1LCe1HA782lefp8vwzqzGEc3er5W', '2003-11-16', FALSE, 'luana.pereira107@email.com', '11990000107', 1),
('Mateus Rodrigues', '$2b$10$EqP9QSHWFdIxbwBaszYj8ecba3dM0BxocGbrNQxdbtmyQo9eAZ1TC', '2006-12-05', FALSE, 'mateus.rodrigues108@email.com', '11990000108', 1),
('Natalia Martins', '$2b$10$qtO1CVCugoXJGY8l46AYGeDIeetpjmsskoh31fDdQ7Ef6HSH8YVXW', '2004-01-27', FALSE, 'natalia.martins109@email.com', '11990000109', 1),
('Oscar Barbosa', '$2b$10$Hfutv.rCAELQPaMqCEtMdOhDIfuDJgAaikp9bG9lCbsYrBKezVT9i', '2005-02-14', FALSE, 'oscar.barbosa110@email.com', '11990000110', 1),

('Pamela Ribeiro', '$2b$10$.DbQgDfd.sDZkq9v94JZCulEBhdzqOc2hBYl5R7IC984LuYJQFxda', '2003-03-20', FALSE, 'pamela.ribeiro111@email.com', '11990000111', 1),
('Ramon Carvalho', '$2b$10$/EWbjA0K64ep8mFSnT5Xs.dtLzthn0iPcdplWP7q1YgLK6w4BPQwy', '2006-04-12', FALSE, 'ramon.carvalho112@email.com', '11990000112', 1),
('Sonia Gomes', '$2b$10$FIZLD554DliQumr6V5yYJu5H8NcZ1lr3FoRYFjFyyIMJSdw4LCkpi', '2005-05-30', FALSE, 'sonia.gomes113@email.com', '11990000113', 1),
('Tiago Teixeira', '$2b$10$gbXUUxIKRMh88HOB.lIZqepV8PDl70xiZSZd0ziDJJMHaC5eDKXaK', '2004-06-18', FALSE, 'tiago.teixeira114@email.com', '11990000114', 1),
('Ursula Moreira', '$2b$10$k0D5d23hsAZhISEHwKGXduzrObqQ0Ys7KQYdxF8mAGkpBJwc62Rxi', '2002-07-25', FALSE, 'ursula.moreira115@email.com', '11990000115', 1),
('Vitor Ferreira', '$2b$10$.R1hj6aVvZZmxxGnP8Y7BOVwzKIw9WpbVqjnlqIUkcqxsC7ODrjS6', '2005-08-09', FALSE, 'vitor.ferreira116@email.com', '11990000116', 1),
('Amanda Mendes', '$2b$10$Cno11Ju0fbRjh7lK8WiM1.VAI2HzCMtpv28if7mbhCk..hG2DYfCi', '2003-09-21', FALSE, 'amanda.mendes117@email.com', '11990000117', 1),
('Breno Nunes', '$2b$10$9y92ELcwpJJ/lvW3xmk/luZw01dZEZLxSaBgkHjfOILerqCQ4d.Da', '2006-10-13', FALSE, 'breno.nunes118@email.com', '11990000118', 1),
('Cristina Castro', '$2b$10$O7RkCyu6pjf0o8ie0efLeOvd02S63c6AFeCTyJcctsLBEETRKU1y.', '2004-11-26', FALSE, 'cristina.castro119@email.com', '11990000119', 1),
('Davi Silva', '$2b$10$uTAhgw7H.dw/ljl.vKeAiOgGuzBInd/tDqVlA8nG7De7eOZ10HjDO', '2005-12-17', FALSE, 'davi.silva120@email.com', '11990000120', 1),

('Elisa Santos', '$2b$10$NW1Ax5I3lgEKC5TrthcowuVfV5p4jnUqCc2qc/.Pn6HtDHcU.bN4i', '2003-01-29', FALSE, 'elisa.santos121@email.com', '11990000121', 1),
('Felipe Oliveira', '$2b$10$LLWS.8oaafmAQqedz3JzL.lnm53mSfIb19I4BecQMWryHmCPl35UO', '2006-02-18', FALSE, 'felipe.oliveira122@email.com', '11990000122', 1),
('Gisele Souza', '$2b$10$Rl8ZkadYJ40AvpRBVB.w0eROZgTTv793saQ7TO1aBhUW94loAf/eK', '2004-03-07', FALSE, 'gisele.souza123@email.com', '11990000123', 1),
('Henrique Lima', '$2b$10$z7HAKRrj8DdFpevjYi6qaOBPXtfffYrtw50GYtpyAesADcE1Ebfbe', '2002-04-23', FALSE, 'henrique.lima124@email.com', '11990000124', 1),
('Isabela Costa', '$2b$10$XJ9rYrzhbrRkmwWMj/FfGe09u0cTcJBaQipHjs0PKQkdHccNU29jy', '2005-05-15', FALSE, 'isabela.costa125@email.com', '11990000125', 1),
('Julio Almeida', '$2b$10$7l1h.ozA9a0xLsDFM4k40u6ub75oshQLQDS5L9CKANx2iGX84upoq', '2003-06-26', FALSE, 'julio.almeida126@email.com', '11990000126', 1),
('Karina Pereira', '$2b$10$sgM5i.dHhVfmKow4sQ5nlOWeMFeZ4FzTzqNjDkO6kbipA30.Mxs6G', '2006-07-17', FALSE, 'karina.pereira127@email.com', '11990000127', 1),
('Luciano Rodrigues', '$2b$10$OfTzWUW2xEzhDEyf8r/T9.63ww2K/MIhtEvoWMp8OLCYdfn0F7tgy', '2004-08-08', FALSE, 'luciano.rodrigues128@email.com', '11990000128', 1),
('Marina Martins', '$2b$10$J2p1QoqUN2A0pi3Nw11LXO9G2QvH7FosjEx.AA7GhmyHlvTEIQgbO', '2005-09-19', FALSE, 'marina.martins129@email.com', '11990000129', 1),
('Nelson Barbosa', '$2b$10$nci6Tq3SgdmBhkhc/X1Xbex3YKsPAYv.uy9eo5dNZ/0W2cHk8uuly', '2002-10-28', FALSE, 'nelson.barbosa130@email.com', '11990000130', 1),

('Paula Ribeiro', '$2b$10$UT.QS5aw3MQaRtj7MK0OWumLXFEemVplxGPXOeTJ1cRrihE24tiXO', '2004-11-12', FALSE, 'paula.ribeiro131@email.com', '11990000131', 1),
('Rafael Carvalho', '$2b$10$yJ7uLQiHjU4dyDGRTQA5PuRrP1Y9mX4Rljv4fb.lxwb6lDs3iPwWO', '2003-12-22', FALSE, 'rafael.carvalho132@email.com', '11990000132', 1),
('Sueli Gomes', '$2b$10$M3z07D5bTaoi701RiF241.4y499vVS0vajF7rjcb9YHGPBY9LrGf2', '2006-01-14', FALSE, 'sueli.gomes133@email.com', '11990000133', 1),
('Tomas Teixeira', '$2b$10$Tyh9CVR/wUD.GcZ2HA8fbO3yowinvceQRzeNfs0E2dLfppOJKq3Vu', '2005-02-25', FALSE, 'tomas.teixeira134@email.com', '11990000134', 1),
('Valentina Moreira', '$2b$10$S3PZ1mW.ubsb8tRedt5g0OkS2MwMYvtqN33ERfu2yTCg8JBFNaGiq', '2004-03-18', FALSE, 'valentina.moreira135@email.com', '11990000135', 1),
('Wagner Ferreira', '$2b$10$IDWUeD6CHGjKUxEgZf67OeZiE35ZpHGEtjoz9niqHV24W3F.78yu6', '2002-04-30', FALSE, 'wagner.ferreira136@email.com', '11990000136', 1),
('Alice Mendes', '$2b$10$NWdvKCW2PhQLLb6GiCLI9.hWd/ucp3zou.G0Xbn5zuucdT9FwC9FS', '2005-05-22', FALSE, 'alice.mendes137@email.com', '11990000137', 1),
('Bernardo Nunes', '$2b$10$HRk2qDjybIqL7ljBCIstT.lEUG7BZjnmKv5FLkDfCCTnVVmbqeL1m', '2003-06-11', FALSE, 'bernardo.nunes138@email.com', '11990000138', 1),
('Claudia Castro', '$2b$10$CRoO/sbFpiZKiJXjbnzH3OpeGvT9mNgTBjmQDTU18aApbk8FDwh7W', '2006-07-29', FALSE, 'claudia.castro139@email.com', '11990000139', 1),
('Daniel Silva', '$2b$10$ucyIxlNs63zSn6/DpV.57eIT75y/zlgA2/7qPTEYNmqwscwYuVG7K', '2004-08-16', FALSE, 'daniel.silva140@email.com', '11990000140', 1),

('Eduarda Santos', '$2b$10$Zr9lAQth4yoKKBK81BqB6.aX5ehfi3OilcYdbPybMeobqmE3iPl1y', '2005-09-07', FALSE, 'eduarda.santos141@email.com', '11990000141', 1),
('Fernando Oliveira', '$2b$10$Kie2wHBWKcj/3DCOplzPr.tEh11OuzGgxqRflekK3.O4TGfchrLMi', '2003-10-19', FALSE, 'fernando.oliveira142@email.com', '11990000142', 1),
('Gabriela Souza', '$2b$10$ub9uptLl8kWgNDYqVMlsJ.JS7BtREgaxYp7jhQA5E8lI7y2HdvaHq', '2006-11-08', FALSE, 'gabriela.souza143@email.com', '11990000143', 1),
('Humberto Lima', '$2b$10$xRePjhpv4kVrgfXdezn3cOuztwh/H.IvwN1edHnmklxJbZLrfCglm', '2002-12-16', FALSE, 'humberto.lima144@email.com', '11990000144', 1),
('Ingrid Costa', '$2b$10$A.wlQhxXw6tzqZ3aAydgo.iHuz9DuDSASrxWv9WHVLC6l8ic7pG1m', '2004-01-25', FALSE, 'ingrid.costa145@email.com', '11990000145', 1),
('Joaquim Almeida', '$2b$10$e7gxYDpNSZTzOgKyBXpqYOBaQRjzqwGqL706lKaHN0ojIQt81ZQ4W', '2005-02-09', FALSE, 'joaquim.almeida146@email.com', '11990000146', 1),
('Kelly Pereira', '$2b$10$KiKrK0ayglNuQRQ/pV.Rjung88tU2XUDsYR7FDB0etNhnpx/NfV9e', '2003-03-28', FALSE, 'kelly.pereira147@email.com', '11990000147', 1),
('Lucas Rodrigues', '$2b$10$sfQyeQhZc61bSCsub4VCGu0ldCYRmkKezv/3/Z.V/9bMzVnXHQtSi', '2006-04-17', FALSE, 'lucas.rodrigues148@email.com', '11990000148', 1),
('Manuela Martins', '$2b$10$m1l9rVlh/CQkzp9CSqwoWerUuLYjTKEmgByr5p/4bRWG4v3NlzXpa', '2004-05-06', FALSE, 'manuela.martins149@email.com', '11990000149', 1),
('Nicolas Barbosa', '$2b$10$weSrvKrn0uLTzaaZFBzn7eDHHQDhpfTh5/QM7IZu7wuSkr84i2WvK', '2005-06-24', FALSE, 'nicolas.barbosa150@email.com', '11990000150', 1),

('Otavio Ribeiro', '$2b$10$EjBRCTapbh89bNApdLC/qOUwe3rn6isfr9GaUWx3hqRQzS7GpGma6', '2003-07-13', FALSE, 'otavio.ribeiro151@email.com', '11990000151', 1),
('Priscila Carvalho', '$2b$10$xo.5OdZD9Ys9lH94cNDBiey1v81PeD8gOpcUhBXFGG9KtsQwMV/aG', '2006-08-20', FALSE, 'priscila.carvalho152@email.com', '11990000152', 1),
('Ricardo Gomes', '$2b$10$soIbggqNCrMb1gB9VVNii.j9VpKviP53scB8hWRH6dJUUfnNH3N/.', '2004-09-11', FALSE, 'ricardo.gomes153@email.com', '11990000153', 1),
('Sandra Teixeira', '$2b$10$CDHTA850b0GkqXeAdmf9xe5JxAQZRgxxLac3.E0IZqLRejQ1aV3Ze', '2002-10-27', FALSE, 'sandra.teixeira154@email.com', '11990000154', 1),
('Thiago Moreira', '$2b$10$DxC8oIqt6KD/ZmPe10HJyeIIke6KPQ5NhSMjmS7lxqR3gwI1fYHAG', '2005-11-15', FALSE, 'thiago.moreira155@email.com', '11990000155', 1),
('Ursula Ferreira', '$2b$10$Y0FvR/g3LKRmSECiBar.Heund96y4IJ0EIzvBl9TEMx5Cc55QKoxq', '2003-12-03', FALSE, 'ursula.ferreira156@email.com', '11990000156', 1),
('Vanessa Mendes', '$2b$10$pBh5yXyrBfCPrKODzBhdweyp2DP8c3L8Wm3wB96t/GcOQW0YHcp1C', '2006-01-18', FALSE, 'vanessa.mendes157@email.com', '11990000157', 1),
('William Nunes', '$2b$10$BKGZ8l.xbjyj0tJnHG9XRu2drZTYzCTjDYFQeyNYTLPiTOXnVl0Cy', '2004-02-26', FALSE, 'william.nunes158@email.com', '11990000158', 1),
('Yara Castro', '$2b$10$rpzZEFcJgRziLxYA/9i0OuiXCsb.SZFN1AbV9QQb6bv3zoFtBeHCu', '2005-03-14', FALSE, 'yara.castro159@email.com', '11990000159', 1),
('Zeca Silva', '$2b$10$dNYx/zLFeL4Njh9pb6WJgeRDAyV1eJfGnC7VqTkstQWir8WQHDt6a', '2002-04-21', FALSE, 'zeca.silva160@email.com', '11990000160', 1),

('Andre Santos', '$2b$10$VJUW6IZr5ToP0/T9CXeNt.vPf7LM7Dgg.wzkrjloh4FGsr14EVBte', '2004-05-17', FALSE, 'andre.santos161@email.com', '11990000161', 3),
('Beatriz Oliveira', '$2b$10$7rUAGettAiq4Ksrof488p.QV3t2BWtLxvtNihuu8QiafACAY5GvUG', '2005-06-28', FALSE, 'beatriz.oliveira162@email.com', '11990000162', 3),
('Caio Souza', '$2b$10$8Qo05wEEZRPOXO4a7u3GMefQcJpjuqyJzcrtgSOEa4kOl4tn674Re', '2003-07-09', FALSE, 'caio.souza163@email.com', '11990000163', 3),
('Diana Lima', '$2b$10$15CqSJNfDjBqH/bNG5q4zuaExBxo53/u7wpku4VYhVSOWShdaA9nW', '2006-08-23', FALSE, 'diana.lima164@email.com', '11990000164', 3),
('Enzo Costa', '$2b$10$uTZDqcE4lF8LtZOS5Ly/fOm9mAUvpCits0BGQT9m6Qo28NUFZAdOq', '2004-09-15', FALSE, 'enzo.costa165@email.com', '11990000165', 3),
('Flavia Almeida', '$2b$10$uXxm413qkcTVt0it8vdYeuX3sqwisaujhk8fAwVPfEE2roOvexkLy', '2002-10-31', FALSE, 'flavia.almeida166@email.com', '11990000166', 3),
('Gustavo Pereira', '$2b$10$thx3QIxmm399nh97OY3e8OcMWvATkuyKuphTvX5yvp8Ot3mc8nZwO', '2005-11-12', FALSE, 'gustavo.pereira167@email.com', '11990000167', 3),
('Heloisa Rodrigues', '$2b$10$/1KltdL6Ra9TdOXVImwL4.yPjpKubFsUYR0zcUezLbtct1JGkSh9e', '2003-12-20', FALSE, 'heloisa.rodrigues168@email.com', '11990000168', 3),
('Igor Martins', '$2b$10$R4WbEFmTO5LJ7ur3CPDTsOIk2Q5NfzbtTz23QP9xQh1VIu4OAVyJ6', '2006-01-07', FALSE, 'igor.martins169@email.com', '11990000169', 3),
('Joana Barbosa', '$2b$10$uEOcfDPqapDabmJ5.lVT8ur6pZjcrj422YJ6CBuIY8bupFrzlT5sm', '2004-02-19', FALSE, 'joana.barbosa170@email.com', '11990000170', 3),

('Kevin Ribeiro', '$2b$10$6RmXWASZ8SF3fjiOBVvKyugbX39MXNLTVSdTcbx/H5OF5T8La3gmu', '2005-03-25', FALSE, 'kevin.ribeiro171@email.com', '11990000171', 3),
('Larissa Carvalho', '$2b$10$kzJfcwlieiBuoXAIbGwj9.O/U7chs3Mlv9LaVd4NLhiQnG485Vo2S', '2003-04-13', FALSE, 'larissa.carvalho172@email.com', '11990000172', 3),
('Marcelo Gomes', '$2b$10$xlvFflkNxDnR18pomZrYF.htcYNVt3xRS8Lv3M7CPU1sdMzixd.Qq', '2006-05-29', FALSE, 'marcelo.gomes173@email.com', '11990000173', 3),
('Natalia Teixeira', '$2b$10$eYeE4.7q9Af.TaJSnE0u3eLrUNKMjTFDs3ghbYvkCrykgmGvPeOii', '2004-06-16', FALSE, 'natalia.teixeira174@email.com', '11990000174', 3),
('Orlando Moreira', '$2b$10$HcydUBc536OSHwkUiixkSeKjK3vMSaQgmWxknSCLTxXG9lmu9WBEm', '2002-07-24', FALSE, 'orlando.moreira175@email.com', '11990000175', 3),
('Patricia Ferreira', '$2b$10$lijQDzWyJXwS4h2L74PCLeimEGuAysgGhoWcTj1TlC2I22nvr7HaC', '2005-08-11', FALSE, 'patricia.ferreira176@email.com', '11990000176', 3),
('Rafael Mendes', '$2b$10$fmgKU0pLWcpzTqML26DVl.OTkj4gHIg.fN2Av2nhA1jZUqwumcGZi', '2003-09-27', FALSE, 'rafael.mendes177@email.com', '11990000177', 3),
('Sabrina Nunes', '$2b$10$HQYaI0xKHLY31LPEVfp2AevTbMylYVY.gj.FV9hi8HRUWjw6On8yq', '2006-10-18', FALSE, 'sabrina.nunes178@email.com', '11990000178', 3),
('Thiago Castro', '$2b$10$4WnFU0lXzVJVYmOhOATWeeE4UA1TjAIgvcXGL/Auihux4I5s/Cq7S', '2004-11-06', FALSE, 'thiago.castro179@email.com', '11990000179', 3),
('Viviane Silva', '$2b$10$dDs5PGPSUehYqB0jiA/N6eIfAkIcTJ8Ls1QT/7A7Gcg2rqlf5RuZa', '2005-12-28', FALSE, 'viviane.silva180@email.com', '11990000180', 3),

('Admin Sistema 01', 'Admin001', '1990-01-10', FALSE, 'admin01@email.com', '11990000181', 2),
('Admin Sistema 02', 'Admin002', '1991-02-15', FALSE, 'admin02@email.com', '11990000182', 2),
('Admin Sistema 03', 'Admin003', '1989-03-20', FALSE, 'admin03@email.com', '11990000183', 2),
('Admin Sistema 04', 'Admin004', '1992-04-25', FALSE, 'admin04@email.com', '11990000184', 2),
('Admin Sistema 05', 'Admin005', '1990-05-30', FALSE, 'admin05@email.com', '11990000185', 2),
('Admin Sistema 06', 'Admin006', '1993-06-12', FALSE, 'admin06@email.com', '11990000186', 2),
('Admin Sistema 07', 'Admin007', '1988-07-18', FALSE, 'admin07@email.com', '11990000187', 2),
('Admin Sistema 08', 'Admin008', '1991-08-22', FALSE, 'admin08@email.com', '11990000188', 2),
('Admin Sistema 09', 'Admin009', '1994-09-14', FALSE, 'admin09@email.com', '11990000189', 2),
('Admin Sistema 10', 'Admin010', '1992-10-27', FALSE, 'admin10@email.com', '11990000190', 2),

('Admin Sistema 11', 'Admin011', '1990-11-05', FALSE, 'admin11@email.com', '11990000191', 2),
('Admin Sistema 12', 'Admin012', '1989-12-19', FALSE, 'admin12@email.com', '11990000192', 2),
('Admin Sistema 13', 'Admin013', '1993-01-24', FALSE, 'admin13@email.com', '11990000193', 2),
('Admin Sistema 14', 'Admin014', '1991-02-08', FALSE, 'admin14@email.com', '11990000194', 2),
('Admin Sistema 15', 'Admin015', '1995-03-16', FALSE, 'admin15@email.com', '11990000195', 2),
('Admin Sistema 16', 'Admin016', '1988-04-29', FALSE, 'admin16@email.com', '11990000196', 2),
('Admin Sistema 17', 'Admin017', '1992-05-13', FALSE, 'admin17@email.com', '11990000197', 2),
('Admin Sistema 18', 'Admin018', '1990-06-21', FALSE, 'admin18@email.com', '11990000198', 2),
('Admin Sistema 19', 'Admin019', '1994-07-07', FALSE, 'admin19@email.com', '11990000199', 2),
('Admin Sistema 20', 'Admin020', '1993-08-17', FALSE, 'admin20@email.com', '11990000200', 2);

select * from Usuario;