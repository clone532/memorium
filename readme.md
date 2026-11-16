# MEMORIUM aplicação Node.js Typescript com Express e EJS

Este projeto é uma aplicação Node.js utilizando o framework Express e o motor de templates EJS para renderização de páginas dinâmicas.

## Tecnologias Utilizadas
- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [EJS](https://ejs.co/)
- [PostgreSQL](https://www.postgresql.org/)
- [TypeScript](https://www.typescriptlang.org/)

## Instalação

### 1. Clone o repositório
```sh
git clone <url-do-repositorio>
cd memorium
```

### 2. Instale as dependências
```sh
npm install
```

### 3. Configure as variáveis de ambiente
Copie o arquivo de exemplo e configure suas credenciais:
```sh
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Configurações do Banco de Dados
DB_HOST=localhost
DB_USER=seu_usuario_postgres
DB_PASSWORD=sua_senha
DB_NAME=nome_do_banco
DB_PORT=5432

# Configurações da Aplicação
PORT=3333
APP_BASE_URL=http://localhost:3333
SESSION_SECRET=sua_chave_secreta_aqui

# E-mail para convites de guardião
EMAIL_USER=seu_email
EMAIL_PASS=sua_senha_de_app
```

As sessões são armazenadas no PostgreSQL na tabela `session`, criada automaticamente
na primeira utilização. O usuário do banco precisa ter permissão para criar essa tabela.
Isso mantém o login após reinicializações do servidor durante o desenvolvimento.
Mantenha o mesmo `SESSION_SECRET` entre reinicializações; os cookies expiram após uma
hora. Para encerrar uma sessão, faça logout ou remova os registros da tabela.

### 4. Configure o banco de dados
Execute o script SQL `banco.sql` no seu PostgreSQL para criar as tabelas necessárias.

Para bancos já existentes, as migrações verificam os dados antes de aplicar restrições:

```sh
npm run migrate:guardian-links
npm run migrate:emails
npm run migrate:message-system
```

`migrate:emails` não altera registros e será interrompida se encontrar e-mails duplicados. Para remover duplicatas sem dados relacionados, mantendo a conta de menor ID por e-mail, existe o comando destrutivo explícito:

```sh
npm run dedupe:emails -- --confirm-keep-lowest-id
```

Ele cancela sem alterações se as contas excedentes tiverem dados vinculados. Revise a regra e faça backup antes de usá-lo em outro banco.

`migrate:message-system` prepara mensagens, anexos privados, destinatários por usuário e confirmações de falecimento. Contatos de destinatários anteriores ficam sem proprietário e não são atribuídos nem apagados. Faça backup antes de aplicar a migração.

### 5. Inicie o servidor
```sh
npm run dev
```

O servidor estará rodando em `http://localhost:3333/`

## Scripts Disponíveis
- `npm run dev` - Inicia o servidor em modo desenvolvimento
- `npm run build` - Compila o TypeScript
- `npm run migrate:guardian-links` - Impõe vínculo obrigatório e único entre usuário e guardião
- `npm run migrate:emails` - Impõe unicidade de e-mail após verificação de duplicados
- `npm run migrate:message-system` - Prepara o banco para mensagens e confirmação por guardiões
- `npm run dedupe:emails -- --confirm-keep-lowest-id` - Remove contas excedentes sem dados vinculados e cria o índice único
- `npm test` - Executa os testes (ainda não implementados)

## Estrutura do Projeto
```
src/
├── controllers/     # Controladores da aplicação
├── infra/          # Configurações de infraestrutura (banco, etc.)
├── middlewares/    # Middlewares personalizados
├── models/         # Modelos de dados
├── routes/         # Definições de rotas
├── utils/          # Utilitários
└── views/          # Templates EJS
```

## Informações úteis ou importantes
Login do usuário administrador para teste:

email fictício:
```
admin@gmail.com
```
senha:
```
123
```

Login do usuário comum para teste:

email fictício:
```
usuario@gmail.com
```
senha: 
```
123
```

`O CÓDIGO NO ARQUIVO banco.sql TAMBÉM POSSUI o "insert into" de 200 usuários aleatórios, gerados com inteligencia artificial, pra simular usuários finais no sistema que você consegue ver por meio da página de listar usuários.`

```
 * template feito pelo Willian e modificado pelo grupo 8 de TCC da ETEC de Santa Fé do Sul, com ensino médio integrado em desenolvimento de sistemas
```