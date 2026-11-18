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

O pgAdmin é apenas o cliente usado para administrar o banco; a compatibilidade depende da
versão do servidor PostgreSQL. O esquema inicial e o armazenamento de sessões exigem PostgreSQL
9.5 ou superior. As migrações para bancos existentes exigem PostgreSQL 9.6 ou superior. Para
conferir a versão do servidor no pgAdmin, execute `SELECT version();`.

Para bancos já existentes, as migrações verificam os dados antes de aplicar restrições:

```sh
npm run migrate:guardian-links
npm run migrate:emails
npm run migrate:message-system
npm run migrate:notifications
npm run migrate:legal-consent
```

`migrate:legal-consent` adiciona os campos de versão e data de aceite dos Termos de Uso e de leitura do Aviso de Privacidade. Contas já existentes ficam sem aceite registrado e serão solicitadas a aceitar os documentos ao entrar.

`migrate:emails` não altera registros e será interrompida se encontrar e-mails duplicados. Para remover duplicatas sem dados relacionados, mantendo a conta de menor ID por e-mail, existe o comando destrutivo explícito:

```sh
npm run dedupe:emails -- --confirm-keep-lowest-id
```

Ele cancela sem alterações se as contas excedentes tiverem dados vinculados. Revise a regra e faça backup antes de usá-lo em outro banco.

`migrate:message-system` prepara mensagens, anexos privados, destinatários por usuário e confirmações de falecimento. Contatos de destinatários anteriores ficam sem proprietário e não são atribuídos nem apagados. Faça backup antes de aplicar a migração.

O servidor inicia automaticamente o worker de entrega. Ele verifica mensagens vencidas a cada 15 segundos, envia um e-mail por destinatário com os anexos privados e tenta novamente falhas até oito vezes. O SMTP deve estar configurado em `EMAIL_USER` e `EMAIL_PASS`.
As telas `/mensagem/cadastrar` e `/mensagem/listar` oferecem cadastro com anexos múltiplos e uma listagem pesquisável e paginada. Mensagens podem ser excluídas individualmente antes do início do envio.

Quando todos os destinatários recebem a mensagem, o worker registra uma notificação, remove a mensagem e seus metadados do banco e apaga os anexos privados. Mensagens antigas já marcadas como enviadas também são limpas pelo worker. No sino do header, o usuário pode marcar notificações como lidas ou excluí-las individualmente ou em lote.

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
- `npm run migrate:notifications` - Cria a tabela de notificações do usuário
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