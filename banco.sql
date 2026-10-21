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
	senha VARCHAR(12) NOT NULL,
	dataNasc DATE NOT NULL,
	estaMorto BOOLEAN DEFAULT FALSE,
	email VARCHAR(255) NOT NULL,
	numero VARCHAR(20),
	imagem VARCHAR(255),
	tipoUsuario INT NOT NULL REFERENCES tipo_usuario(id)
);

create table Plano (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(50) NOT NULL,
	valorMensal FLOAT,
	armazenamentoGB INT
);

create table Mensagem (
	id SERIAL PRIMARY KEY,
	titulo VARCHAR(255) NOT NULL,
	anexoUrl VARCHAR(255) NOT NULL,
	idTipoMensagem INT NOT NULL REFERENCES tipoMensagem(id)
);

create table Biografia (
	id SERIAL PRIMARY KEY,
	anexoUrl VARCHAR(255) NOT NULL,
	fkUsuario INT NOT NULL REFERENCES Usuario(id),
	fkMensagem INT NOT NULL REFERENCES Mensagem(id)
);

create table Mural (
	id SERIAL PRIMARY KEY,
	fkUsuario INT NOT NULL REFERENCES Usuario(id)
);

create table Comentario (
	id SERIAL PRIMARY KEY,
	dataHora DATE NOT NULL,
	conteudo VARCHAR(500) NOT NULL,
	fkMural INT NOT NULL REFERENCES Mural(id),
	fkUsuario INT NOT NULL REFERENCES Usuario(id)
);

create table Usuario_Guardiao (
	id SERIAL PRIMARY KEY,
	chave VARCHAR(255),
	idUsuario INT,
	idGuardiao INT,
	votoConfirma BOOLEAN DEFAULT FALSE,
	CONSTRAINT fkUsuario FOREIGN KEY(idUsuario) REFERENCES Usuario(id),
	CONSTRAINT fkGuardiao FOREIGN KEY(idGuardiao) REFERENCES Guardiao(id)
);

create table Destinatario_Mensagem (
	id SERIAL PRIMARY KEY,
	fkDestinatario INT NOT NULL REFERENCES Destinatario(id),
	fkMensagem INT NOT NULL REFERENCES Mensagem(id)
);

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
values ('admin', '123', '12/06/2007', 'admin@gmail.com', 2);

insert into usuario(nome, senha, dataNasc, email, tipoUsuario)
values ('usuario', '123', '12/06/2007', 'usuario@gmail.com', 1);

INSERT INTO Usuario
(nome, senha, dataNasc, estaMorto, email, numero, tipoUsuario)
VALUES
('Ana Clara Silva', 'Senha001', '2005-01-15', FALSE, 'ana.silva01@email.com', '11990000001', 1),
('Bruno Henrique Santos', 'Senha002', '2004-02-20', FALSE, 'bruno.santos02@email.com', '11990000002', 1),
('Carlos Eduardo Oliveira', 'Senha003', '2003-03-12', FALSE, 'carlos.oliveira03@email.com', '11990000003', 1),
('Daniela Souza', 'Senha004', '2006-04-25', FALSE, 'daniela.souza04@email.com', '11990000004', 1),
('Eduardo Lima', 'Senha005', '2002-05-18', FALSE, 'eduardo.lima05@email.com', '11990000005', 1),
('Fernanda Costa', 'Senha006', '2005-06-30', FALSE, 'fernanda.costa06@email.com', '11990000006', 1),
('Gabriel Almeida', 'Senha007', '2004-07-11', FALSE, 'gabriel.almeida07@email.com', '11990000007', 1),
('Helena Pereira', 'Senha008', '2003-08-22', FALSE, 'helena.pereira08@email.com', '11990000008', 1),
('Igor Rodrigues', 'Senha009', '2006-09-14', FALSE, 'igor.rodrigues09@email.com', '11990000009', 1),
('Juliana Martins', 'Senha010', '2005-10-05', FALSE, 'juliana.martins10@email.com', '11990000010', 1),

('Lucas Barbosa', 'Senha011', '2004-11-17', FALSE, 'lucas.barbosa11@email.com', '11990000011', 1),
('Mariana Ribeiro', 'Senha012', '2003-12-09', FALSE, 'mariana.ribeiro12@email.com', '11990000012', 1),
('Nicolas Carvalho', 'Senha013', '2005-01-28', FALSE, 'nicolas.carvalho13@email.com', '11990000013', 1),
('Olivia Gomes', 'Senha014', '2006-02-16', FALSE, 'olivia.gomes14@email.com', '11990000014', 1),
('Paulo Teixeira', 'Senha015', '2002-03-27', FALSE, 'paulo.teixeira15@email.com', '11990000015', 1),
('Renata Moreira', 'Senha016', '2004-04-19', FALSE, 'renata.moreira16@email.com', '11990000016', 1),
('Samuel Ferreira', 'Senha017', '2003-05-07', FALSE, 'samuel.ferreira17@email.com', '11990000017', 1),
('Tatiana Mendes', 'Senha018', '2005-06-21', FALSE, 'tatiana.mendes18@email.com', '11990000018', 1),
('Victor Nunes', 'Senha019', '2006-07-13', FALSE, 'victor.nunes19@email.com', '11990000019', 1),
('Yasmin Castro', 'Senha020', '2004-08-29', FALSE, 'yasmin.castro20@email.com', '11990000020', 1),

('Adriana Martins', 'Senha021', '2003-09-10', FALSE, 'adriana.martins21@email.com', '11990000021', 1),
('Alexandre Souza', 'Senha022', '2005-10-23', FALSE, 'alexandre.souza22@email.com', '11990000022', 1),
('Alice Ferreira', 'Senha023', '2006-11-15', FALSE, 'alice.ferreira23@email.com', '11990000023', 1),
('Anderson Lima', 'Senha024', '2002-12-04', FALSE, 'anderson.lima24@email.com', '11990000024', 1),
('Beatriz Almeida', 'Senha025', '2004-01-19', FALSE, 'beatriz.almeida25@email.com', '11990000025', 1),
('Bianca Costa', 'Senha026', '2005-02-27', FALSE, 'bianca.costa26@email.com', '11990000026', 1),
('Caio Pereira', 'Senha027', '2003-03-16', FALSE, 'caio.pereira27@email.com', '11990000027', 1),
('Camila Rodrigues', 'Senha028', '2006-04-08', FALSE, 'camila.rodrigues28@email.com', '11990000028', 1),
('Cesar Martins', 'Senha029', '2002-05-25', FALSE, 'cesar.martins29@email.com', '11990000029', 1),
('Clara Barbosa', 'Senha030', '2004-06-14', FALSE, 'clara.barbosa30@email.com', '11990000030', 1),

('Cristian Ribeiro', 'Senha031', '2005-07-22', FALSE, 'cristian.ribeiro31@email.com', '11990000031', 1),
('Diego Carvalho', 'Senha032', '2003-08-17', FALSE, 'diego.carvalho32@email.com', '11990000032', 1),
('Douglas Gomes', 'Senha033', '2006-09-29', FALSE, 'douglas.gomes33@email.com', '11990000033', 1),
('Elisa Teixeira', 'Senha034', '2004-10-11', FALSE, 'elisa.teixeira34@email.com', '11990000034', 1),
('Emanuel Moreira', 'Senha035', '2002-11-06', FALSE, 'emanuel.moreira35@email.com', '11990000035', 1),
('Fabiana Ferreira', 'Senha036', '2005-12-18', FALSE, 'fabiana.ferreira36@email.com', '11990000036', 1),
('Felipe Mendes', 'Senha037', '2003-01-24', FALSE, 'felipe.mendes37@email.com', '11990000037', 1),
('Gustavo Nunes', 'Senha038', '2004-02-13', FALSE, 'gustavo.nunes38@email.com', '11990000038', 1),
('Isabela Castro', 'Senha039', '2006-03-31', FALSE, 'isabela.castro39@email.com', '11990000039', 1),
('Joao Martins', 'Senha040', '2005-04-20', FALSE, 'joao.martins40@email.com', '11990000040', 1),

('Karen Silva', 'Senha041', '2003-05-12', FALSE, 'karen.silva41@email.com', '11990000041', 1),
('Leonardo Santos', 'Senha042', '2002-06-28', FALSE, 'leonardo.santos42@email.com', '11990000042', 1),
('Larissa Oliveira', 'Senha043', '2004-07-09', FALSE, 'larissa.oliveira43@email.com', '11990000043', 1),
('Leticia Souza', 'Senha044', '2005-08-26', FALSE, 'leticia.souza44@email.com', '11990000044', 1),
('Marcelo Lima', 'Senha045', '2003-09-18', FALSE, 'marcelo.lima45@email.com', '11990000045', 1),
('Marcos Costa', 'Senha046', '2006-10-07', FALSE, 'marcos.costa46@email.com', '11990000046', 1),
('Natalia Almeida', 'Senha047', '2004-11-21', FALSE, 'natalia.almeida47@email.com', '11990000047', 1),
('Otavio Pereira', 'Senha048', '2002-12-15', FALSE, 'otavio.pereira48@email.com', '11990000048', 1),
('Patricia Rodrigues', 'Senha049', '2005-01-30', FALSE, 'patricia.rodrigues49@email.com', '11990000049', 1),
('Rafael Barbosa', 'Senha050', '2003-02-22', FALSE, 'rafael.barbosa50@email.com', '11990000050', 1),

('Raquel Ribeiro', 'Senha051', '2004-03-17', FALSE, 'raquel.ribeiro51@email.com', '11990000051', 1),
('Rodrigo Carvalho', 'Senha052', '2006-04-29', FALSE, 'rodrigo.carvalho52@email.com', '11990000052', 1),
('Sabrina Gomes', 'Senha053', '2005-05-11', FALSE, 'sabrina.gomes53@email.com', '11990000053', 1),
('Thiago Teixeira', 'Senha054', '2002-06-19', FALSE, 'thiago.teixeira54@email.com', '11990000054', 1),
('Vanessa Moreira', 'Senha055', '2004-07-27', FALSE, 'vanessa.moreira55@email.com', '11990000055', 1),
('Wesley Ferreira', 'Senha056', '2003-08-14', FALSE, 'wesley.ferreira56@email.com', '11990000056', 1),
('Aline Mendes', 'Senha057', '2006-09-05', FALSE, 'aline.mendes57@email.com', '11990000057', 1),
('Arthur Nunes', 'Senha058', '2005-10-16', FALSE, 'arthur.nunes58@email.com', '11990000058', 1),
('Bruna Castro', 'Senha059', '2004-11-28', FALSE, 'bruna.castro59@email.com', '11990000059', 1),
('Cauan Silva', 'Senha060', '2003-12-20', FALSE, 'cauan.silva60@email.com', '11990000060', 1),

('Denise Santos', 'Senha061', '2005-01-09', FALSE, 'denise.santos61@email.com', '11990000061', 1),
('Erick Oliveira', 'Senha062', '2006-02-24', FALSE, 'erick.oliveira62@email.com', '11990000062', 1),
('Flavia Souza', 'Senha063', '2004-03-13', FALSE, 'flavia.souza63@email.com', '11990000063', 1),
('Henrique Lima', 'Senha064', '2002-04-18', FALSE, 'henrique.lima64@email.com', '11990000064', 1),
('Ingrid Costa', 'Senha065', '2005-05-26', FALSE, 'ingrid.costa65@email.com', '11990000065', 1),
('Jorge Almeida', 'Senha066', '2003-06-08', FALSE, 'jorge.almeida66@email.com', '11990000066', 1),
('Karina Pereira', 'Senha067', '2006-07-19', FALSE, 'karina.pereira67@email.com', '11990000067', 1),
('Luis Rodrigues', 'Senha068', '2004-08-30', FALSE, 'luis.rodrigues68@email.com', '11990000068', 1),
('Michele Martins', 'Senha069', '2005-09-22', FALSE, 'michele.martins69@email.com', '11990000069', 1),
('Nelson Barbosa', 'Senha070', '2002-10-14', FALSE, 'nelson.barbosa70@email.com', '11990000070', 1),

('Priscila Ribeiro', 'Senha071', '2004-11-05', FALSE, 'priscila.ribeiro71@email.com', '11990000071', 1),
('Ricardo Carvalho', 'Senha072', '2003-12-17', FALSE, 'ricardo.carvalho72@email.com', '11990000072', 1),
('Simone Gomes', 'Senha073', '2006-01-23', FALSE, 'simone.gomes73@email.com', '11990000073', 1),
('Tales Teixeira', 'Senha074', '2005-02-11', FALSE, 'tales.teixeira74@email.com', '11990000074', 1),
('Valeria Moreira', 'Senha075', '2004-03-29', FALSE, 'valeria.moreira75@email.com', '11990000075', 1),
('William Ferreira', 'Senha076', '2003-04-15', FALSE, 'william.ferreira76@email.com', '11990000076', 1),
('Amanda Mendes', 'Senha077', '2006-05-07', FALSE, 'amanda.mendes77@email.com', '11990000077', 1),
('Bernardo Nunes', 'Senha078', '2005-06-23', FALSE, 'bernardo.nunes78@email.com', '11990000078', 1),
('Carolina Castro', 'Senha079', '2004-07-31', FALSE, 'carolina.castro79@email.com', '11990000079', 1),
('Danilo Silva', 'Senha080', '2002-08-18', FALSE, 'danilo.silva80@email.com', '11990000080', 1),

('Eliane Santos', 'Senha081', '2005-09-27', FALSE, 'eliane.santos81@email.com', '11990000081', 1),
('Fernando Oliveira', 'Senha082', '2003-10-12', FALSE, 'fernando.oliveira82@email.com', '11990000082', 1),
('Giovana Souza', 'Senha083', '2006-11-19', FALSE, 'giovana.souza83@email.com', '11990000083', 1),
('Hugo Lima', 'Senha084', '2004-12-06', FALSE, 'hugo.lima84@email.com', '11990000084', 1),
('Iara Costa', 'Senha085', '2005-01-21', FALSE, 'iara.costa85@email.com', '11990000085', 1),
('Jonas Almeida', 'Senha086', '2002-02-28', FALSE, 'jonas.almeida86@email.com', '11990000086', 1),
('Katia Pereira', 'Senha087', '2004-03-09', FALSE, 'katia.pereira87@email.com', '11990000087', 1),
('Leandro Rodrigues', 'Senha088', '2003-04-22', FALSE, 'leandro.rodrigues88@email.com', '11990000088', 1),
('Monique Martins', 'Senha089', '2006-05-16', FALSE, 'monique.martins89@email.com', '11990000089', 1),
('Norberto Barbosa', 'Senha090', '2005-06-28', FALSE, 'norberto.barbosa90@email.com', '11990000090', 1),

('Amanda Ribeiro', 'Senha091', '2004-07-13', FALSE, 'amanda.ribeiro91@email.com', '11990000091', 1),
('Roberto Carvalho', 'Senha092', '2003-08-25', FALSE, 'roberto.carvalho92@email.com', '11990000092', 1),
('Silvia Gomes', 'Senha093', '2006-09-17', FALSE, 'silvia.gomes93@email.com', '11990000093', 1),
('Tomaz Teixeira', 'Senha094', '2005-10-29', FALSE, 'tomaz.teixeira94@email.com', '11990000094', 1),
('Viviane Moreira', 'Senha095', '2004-11-14', FALSE, 'viviane.moreira95@email.com', '11990000095', 1),
('Alex Ferreira', 'Senha096', '2002-12-23', FALSE, 'alex.ferreira96@email.com', '11990000096', 1),
('Barbara Mendes', 'Senha097', '2005-01-06', FALSE, 'barbara.mendes97@email.com', '11990000097', 1),
('Diego Nunes', 'Senha098', '2003-02-17', FALSE, 'diego.nunes98@email.com', '11990000098', 1),
('Estela Castro', 'Senha099', '2006-03-26', FALSE, 'estela.castro99@email.com', '11990000099', 1),
('Fabio Silva', 'Senha100', '2004-04-11', FALSE, 'fabio.silva100@email.com', '11990000100', 1),

('Gabriela Santos', 'Senha101', '2005-05-19', FALSE, 'gabriela.santos101@email.com', '11990000101', 1),
('Heitor Oliveira', 'Senha102', '2003-06-27', FALSE, 'heitor.oliveira102@email.com', '11990000102', 1),
('Isis Souza', 'Senha103', '2006-07-08', FALSE, 'isis.souza103@email.com', '11990000103', 1),
('Joao Lima', 'Senha104', '2004-08-21', FALSE, 'joao.lima104@email.com', '11990000104', 1),
('Kelly Costa', 'Senha105', '2002-09-13', FALSE, 'kelly.costa105@email.com', '11990000105', 1),
('Leonardo Almeida', 'Senha106', '2005-10-24', FALSE, 'leonardo.almeida106@email.com', '11990000106', 1),
('Luana Pereira', 'Senha107', '2003-11-16', FALSE, 'luana.pereira107@email.com', '11990000107', 1),
('Mateus Rodrigues', 'Senha108', '2006-12-05', FALSE, 'mateus.rodrigues108@email.com', '11990000108', 1),
('Natalia Martins', 'Senha109', '2004-01-27', FALSE, 'natalia.martins109@email.com', '11990000109', 1),
('Oscar Barbosa', 'Senha110', '2005-02-14', FALSE, 'oscar.barbosa110@email.com', '11990000110', 1),

('Pamela Ribeiro', 'Senha111', '2003-03-20', FALSE, 'pamela.ribeiro111@email.com', '11990000111', 1),
('Ramon Carvalho', 'Senha112', '2006-04-12', FALSE, 'ramon.carvalho112@email.com', '11990000112', 1),
('Sonia Gomes', 'Senha113', '2005-05-30', FALSE, 'sonia.gomes113@email.com', '11990000113', 1),
('Tiago Teixeira', 'Senha114', '2004-06-18', FALSE, 'tiago.teixeira114@email.com', '11990000114', 1),
('Ursula Moreira', 'Senha115', '2002-07-25', FALSE, 'ursula.moreira115@email.com', '11990000115', 1),
('Vitor Ferreira', 'Senha116', '2005-08-09', FALSE, 'vitor.ferreira116@email.com', '11990000116', 1),
('Amanda Mendes', 'Senha117', '2003-09-21', FALSE, 'amanda.mendes117@email.com', '11990000117', 1),
('Breno Nunes', 'Senha118', '2006-10-13', FALSE, 'breno.nunes118@email.com', '11990000118', 1),
('Cristina Castro', 'Senha119', '2004-11-26', FALSE, 'cristina.castro119@email.com', '11990000119', 1),
('Davi Silva', 'Senha120', '2005-12-17', FALSE, 'davi.silva120@email.com', '11990000120', 1),

('Elisa Santos', 'Senha121', '2003-01-29', FALSE, 'elisa.santos121@email.com', '11990000121', 1),
('Felipe Oliveira', 'Senha122', '2006-02-18', FALSE, 'felipe.oliveira122@email.com', '11990000122', 1),
('Gisele Souza', 'Senha123', '2004-03-07', FALSE, 'gisele.souza123@email.com', '11990000123', 1),
('Henrique Lima', 'Senha124', '2002-04-23', FALSE, 'henrique.lima124@email.com', '11990000124', 1),
('Isabela Costa', 'Senha125', '2005-05-15', FALSE, 'isabela.costa125@email.com', '11990000125', 1),
('Julio Almeida', 'Senha126', '2003-06-26', FALSE, 'julio.almeida126@email.com', '11990000126', 1),
('Karina Pereira', 'Senha127', '2006-07-17', FALSE, 'karina.pereira127@email.com', '11990000127', 1),
('Luciano Rodrigues', 'Senha128', '2004-08-08', FALSE, 'luciano.rodrigues128@email.com', '11990000128', 1),
('Marina Martins', 'Senha129', '2005-09-19', FALSE, 'marina.martins129@email.com', '11990000129', 1),
('Nelson Barbosa', 'Senha130', '2002-10-28', FALSE, 'nelson.barbosa130@email.com', '11990000130', 1),

('Paula Ribeiro', 'Senha131', '2004-11-12', FALSE, 'paula.ribeiro131@email.com', '11990000131', 1),
('Rafael Carvalho', 'Senha132', '2003-12-22', FALSE, 'rafael.carvalho132@email.com', '11990000132', 1),
('Sueli Gomes', 'Senha133', '2006-01-14', FALSE, 'sueli.gomes133@email.com', '11990000133', 1),
('Tomas Teixeira', 'Senha134', '2005-02-25', FALSE, 'tomas.teixeira134@email.com', '11990000134', 1),
('Valentina Moreira', 'Senha135', '2004-03-18', FALSE, 'valentina.moreira135@email.com', '11990000135', 1),
('Wagner Ferreira', 'Senha136', '2002-04-30', FALSE, 'wagner.ferreira136@email.com', '11990000136', 1),
('Alice Mendes', 'Senha137', '2005-05-22', FALSE, 'alice.mendes137@email.com', '11990000137', 1),
('Bernardo Nunes', 'Senha138', '2003-06-11', FALSE, 'bernardo.nunes138@email.com', '11990000138', 1),
('Claudia Castro', 'Senha139', '2006-07-29', FALSE, 'claudia.castro139@email.com', '11990000139', 1),
('Daniel Silva', 'Senha140', '2004-08-16', FALSE, 'daniel.silva140@email.com', '11990000140', 1),

('Eduarda Santos', 'Senha141', '2005-09-07', FALSE, 'eduarda.santos141@email.com', '11990000141', 1),
('Fernando Oliveira', 'Senha142', '2003-10-19', FALSE, 'fernando.oliveira142@email.com', '11990000142', 1),
('Gabriela Souza', 'Senha143', '2006-11-08', FALSE, 'gabriela.souza143@email.com', '11990000143', 1),
('Humberto Lima', 'Senha144', '2002-12-16', FALSE, 'humberto.lima144@email.com', '11990000144', 1),
('Ingrid Costa', 'Senha145', '2004-01-25', FALSE, 'ingrid.costa145@email.com', '11990000145', 1),
('Joaquim Almeida', 'Senha146', '2005-02-09', FALSE, 'joaquim.almeida146@email.com', '11990000146', 1),
('Kelly Pereira', 'Senha147', '2003-03-28', FALSE, 'kelly.pereira147@email.com', '11990000147', 1),
('Lucas Rodrigues', 'Senha148', '2006-04-17', FALSE, 'lucas.rodrigues148@email.com', '11990000148', 1),
('Manuela Martins', 'Senha149', '2004-05-06', FALSE, 'manuela.martins149@email.com', '11990000149', 1),
('Nicolas Barbosa', 'Senha150', '2005-06-24', FALSE, 'nicolas.barbosa150@email.com', '11990000150', 1),

('Otavio Ribeiro', 'Senha151', '2003-07-13', FALSE, 'otavio.ribeiro151@email.com', '11990000151', 1),
('Priscila Carvalho', 'Senha152', '2006-08-20', FALSE, 'priscila.carvalho152@email.com', '11990000152', 1),
('Ricardo Gomes', 'Senha153', '2004-09-11', FALSE, 'ricardo.gomes153@email.com', '11990000153', 1),
('Sandra Teixeira', 'Senha154', '2002-10-27', FALSE, 'sandra.teixeira154@email.com', '11990000154', 1),
('Thiago Moreira', 'Senha155', '2005-11-15', FALSE, 'thiago.moreira155@email.com', '11990000155', 1),
('Ursula Ferreira', 'Senha156', '2003-12-03', FALSE, 'ursula.ferreira156@email.com', '11990000156', 1),
('Vanessa Mendes', 'Senha157', '2006-01-18', FALSE, 'vanessa.mendes157@email.com', '11990000157', 1),
('William Nunes', 'Senha158', '2004-02-26', FALSE, 'william.nunes158@email.com', '11990000158', 1),
('Yara Castro', 'Senha159', '2005-03-14', FALSE, 'yara.castro159@email.com', '11990000159', 1),
('Zeca Silva', 'Senha160', '2002-04-21', FALSE, 'zeca.silva160@email.com', '11990000160', 1),

('Andre Santos', 'Senha161', '2004-05-17', FALSE, 'andre.santos161@email.com', '11990000161', 3),
('Beatriz Oliveira', 'Senha162', '2005-06-28', FALSE, 'beatriz.oliveira162@email.com', '11990000162', 3),
('Caio Souza', 'Senha163', '2003-07-09', FALSE, 'caio.souza163@email.com', '11990000163', 3),
('Diana Lima', 'Senha164', '2006-08-23', FALSE, 'diana.lima164@email.com', '11990000164', 3),
('Enzo Costa', 'Senha165', '2004-09-15', FALSE, 'enzo.costa165@email.com', '11990000165', 3),
('Flavia Almeida', 'Senha166', '2002-10-31', FALSE, 'flavia.almeida166@email.com', '11990000166', 3),
('Gustavo Pereira', 'Senha167', '2005-11-12', FALSE, 'gustavo.pereira167@email.com', '11990000167', 3),
('Heloisa Rodrigues', 'Senha168', '2003-12-20', FALSE, 'heloisa.rodrigues168@email.com', '11990000168', 3),
('Igor Martins', 'Senha169', '2006-01-07', FALSE, 'igor.martins169@email.com', '11990000169', 3),
('Joana Barbosa', 'Senha170', '2004-02-19', FALSE, 'joana.barbosa170@email.com', '11990000170', 3),

('Kevin Ribeiro', 'Senha171', '2005-03-25', FALSE, 'kevin.ribeiro171@email.com', '11990000171', 3),
('Larissa Carvalho', 'Senha172', '2003-04-13', FALSE, 'larissa.carvalho172@email.com', '11990000172', 3),
('Marcelo Gomes', 'Senha173', '2006-05-29', FALSE, 'marcelo.gomes173@email.com', '11990000173', 3),
('Natalia Teixeira', 'Senha174', '2004-06-16', FALSE, 'natalia.teixeira174@email.com', '11990000174', 3),
('Orlando Moreira', 'Senha175', '2002-07-24', FALSE, 'orlando.moreira175@email.com', '11990000175', 3),
('Patricia Ferreira', 'Senha176', '2005-08-11', FALSE, 'patricia.ferreira176@email.com', '11990000176', 3),
('Rafael Mendes', 'Senha177', '2003-09-27', FALSE, 'rafael.mendes177@email.com', '11990000177', 3),
('Sabrina Nunes', 'Senha178', '2006-10-18', FALSE, 'sabrina.nunes178@email.com', '11990000178', 3),
('Thiago Castro', 'Senha179', '2004-11-06', FALSE, 'thiago.castro179@email.com', '11990000179', 3),
('Viviane Silva', 'Senha180', '2005-12-28', FALSE, 'viviane.silva180@email.com', '11990000180', 3),

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