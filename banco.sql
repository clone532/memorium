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
	descricao VARCHAR(255) NOT NULL,
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

select * from Usuario;
select * from Destinatario;