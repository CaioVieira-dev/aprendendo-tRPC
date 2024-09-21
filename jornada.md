# Testes com tRPC :)

## Motivação do projeto

tRPC é a sigla para TypeScript Remote Procedure Call, traduzindo Chamada de procedimento remoto em TypeScript. É uma maneira de chamar funções em um computador, no caso o servidor, a partir de outro, o cliente.
Com uma api HTTP/REST tradicional, você chama uma url e recebe uma resposta, com RPC, você chama uma função e recebe uma resposta.
Gostei do tRPC porque vi que minha API ficava tipada corretamente na aplicação.

## Passos com o projeto

### 1. .devcontainer

#### Contexto

Normalmente eu trabalho numa maquina com ubuntu, mas minha maquina pessoal é windows, então para ter (basicamente) a mesma experiencia de desenvolvimento estou usando devcontainers.
DevContainers é uma extensão para o vscode que junto com o docker e o wsl2 me permite desenvolver numa maquina linux sem sair do meu windows :).
Com o devcontainer eu consigo especificar exatamente o que eu preciso na maquina, e caso bugs estranhos aconteçam, eu posso pedir ajuda mais facilmente porque qualquer pessoa teria a mesma maquina para reproduzir o problema.

---

#### O 1º passo

Iniciar o docker no windows e criar um devcontainer com pela extensão do vscode.
Escolhi o container base do ubuntu na versão jammy.
Adicionei as features(opções adicionais) "node", "zsh", "common utils"(para o zsh) e "shell history".
Eu poderia configurar mais algumas coisas nas features, mas preferi deixar no padrão.
Depois de terminar a configuração, o vscode reabre no container de desenvolvimento, o docker começa a criar o container, e depois de alguns segundos/minutos, meu ambiente ubuntu está pronto para o desenvolvimento.
Os ultimos retoques para começar a codar é re-habilitar as extensões relevantes no vscode, porque os containers de desenvolvimento não vem com todas as extensões do seu vscode habilitadas por padrão, então algumas extensões como prettier precisam ser habilitadas manualmente no container. (pra mim esse comportamento é até bem util, pois meu vscode padrão no windows geralmente tem extensões inuteis para alguns projetos de webdev)

---

### 2. Tutoriais

#### Não sei basicamente nada sobre tRPC

É basicamente o que o subtitulo diz "não sei basicamente nada sobre tRPC". Sei que é uma lib que me ajuda a criar APIs com uma tipagem forte, mas meu conhecimento só vai até aí.
No meu primeiro contato com a lib usando o `npm create t3-app@latest`, eu consegui me virar e usar app de exemplo para criar uma API comum, mas no momento em que tentei alguns conceitos mais avaçados como WebSockets, eu travei legal.
Para aprender o que é necessario para esse tipo de API, decidi criar um app seguindo um [tutorial](https://preciselab.io/trpc/) do Daniel Gustaw, espero que com um escopo menor seja mais facil de identificar o que fiz de errado no outro projeto.

---

#### O 2º passo

Seguindo o tutorial do Daniel, primeiramente vou criar um projeto minimo com trpc, então instalei as dependencias do trpc e o zod:

```bash
npm i @trpc/server @trpc/client zod
```

Criei as pastas client e server:

```txt
- client
- server
```

Na sequencia crio o arquivo `server/index.ts`:

```TS
import {initTRPC} from '@trpc/server';
import {createHTTPServer} from '@trpc/server/adapters/standalone';
import {z} from 'zod'

export type AppRouter = typeof appRouter;

const t = initTRPC.create();

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
    greet: publicProcedure
        .input(z.string())
        .query(({input}) => ({greeting: `hello, ${input}!`})),
});

createHTTPServer({
    router: appRouter,
}).listen(2022);
```

A linha `export type AppRouter = typeof appRouter;` exporta a tipagem da api, o schema, que o cliente vai usar, e o router define as funções que a api executa.
Além do `query` o tRPC tem o `mutation` e o `subscription`, mas no exemplo minimo só preciso do query.
Então crio o `client/index.ts`:

```TS
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../server';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:2022',
    }),
  ],
});

async function main() {
  const result = await client.greet.query('tRPC');

  // Type safe
  console.log(result.greeting.toUpperCase());
}

void main();
```

No client, o `AppRouter` foi importado como um tipo, então o `client` tem as funções, parametros e resultados tipados corretamente.

---

##### Extra

Como estou usando typescript e não fiz uma configuração global, para rodar o server e o client, eu instalei o typescript como dependencia de desenvolvimento

```bash
npm i -D typescript ts-node
```

```bash
npx tsc --init
```

E na sequencia abri dois terminais e rodei no primeiro:

```bash
npx ts-node ./server/index.ts
```

e no segundo:

```bash
npx ts-node ./client/index.ts
```

No final, vi no segundo o log `HELLO, TRPC!`

---

#### O 3º passo

O proximo passo é a autenticação. Criar uma função no servidor que só pode ser executada por um admin.
Para simplificar, o tutorial usa um header com uma ""senha"" simples para simular um usuario autenticado.

##### Criando a autenticação

Criando o arquivo `server/context.ts`:

```TS
import {inferAsyncReturnType} from '@trpc/server';
import {CreateNextContextOptions} from '@trpc/server/adapters/next';

export async function createContext({req}: CreateNextContextOptions) {
    return {
        auth: req.headers.authorization === 'ABC'
    };
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

##### Implementando a autenticação

Agora altero no `server/index.ts`, trocando

```TS
const t = initTRPC.create();
```

para

```TS
import type { Context } from './context';
export const t = initTRPC.context<Context>().create();
```

e trocando

```TS
createHTTPServer({
    router: appRouter,
}).listen(2022);
```

para

```TS
import {createContext} from "./context";

createHTTPServer({
    router: appRouter,
    createContext
}).listen(2022);
```

Agora posso adicionar no router a função

```TS
secret: publicProcedure.query(({ ctx }) => {
  if (!ctx.auth) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return {
    secret: "sauce",
  };
}),
```

Isso até funciona, mas estou usando um procedimento publico, um jeito melhor seria usar o middleware `protectedProcedure`
O ajuste no `server/index.ts` é adicionar

```TS
const isAuthed = t.middleware(({ next, ctx }) => {
    if (!ctx.auth) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    return next({
        ctx: {
            auth: ctx.auth
        }
    });
});
const protectedProcedure = t.procedure.use(isAuthed);
```

E o secret seria refatorado para isso

```TS
  secret: protectedProcedure.query(({ ctx }) => {
    return {
      secret: "sauce",
    };
  }),
```

Outra função para testar seria a

```TS
secretMutation: protectedProcedure.mutation(() => "access granted")
```

No `client/index.ts` podemos ver os erros

```TS
const unauthorizedError = await client.secret.query();
console.log(unauthorizedError);
const unauthorizedErrorMutation = await client.secretMutation.mutate();
console.log(unauthorizedErrorMutation);
```

Para autorizar a chamada de função, eu adiciono o header no cliente

```TS
const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:2022',
      headers: {
        Authorization: 'ABC'
      }
    }),
  ],
});
```

Dessa maneira eu teria que recriar o client com novos headers toda vez que ele mudar. Uma maneira simples de melhorar isso é

```TS
const headers: Map<string, string> = new Map<string, string>();

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:2022',
      headers: () => Object.fromEntries(headers)
    }),
  ],
});
```

E durante a execução posso decidir o header com

```TS
headers.set('Authorization', 'ABC');
```

#### O 4º passo

WebSockets. O proximo passo é a integração do tRPC com websockets.
Primeiro instalo as libs ws e @types/ws

```bash
npm i ws
npm i -D @types/ws
```

Depois crio a função no `router`

```TS
time: publicProcedure.subscription(() => {
        return observable<Date>((emit) => {
            // logic that will execute on subscription start
            const interval = setInterval(() => emit.next(new Date()), 1000);
            // function to clean up and close interval after end of connection
            return () => {
                clearInterval(interval);
            }
        })
    })
```

E depois crio o servidor do websocket

```TS
import ws from "ws";
import { applyWSSHandler } from '@trpc/server/adapters/ws';

const wss = new ws.Server({
    port: 3001,
});
const handler = applyWSSHandler({ wss, router: appRouter, createContext });
wss.on('connection', (ws) => {
    console.log(`➕➕ Connection (${wss.clients.size})`);
    ws.once('close', () => {
        console.log(`➖➖ Connection (${wss.clients.size})`);
    });
});
console.log('✅ WebSocket Server listening on ws://localhost:3001');
process.on('SIGTERM', () => {
    console.log('SIGTERM');
    handler.broadcastReconnectNotification();
    wss.close();
});
```

Para checar o resultado, eu uso um payload com este formato num cliente de http como o insomnia.

```TS
{
  id: number | string;
  jsonrpc?: '2.0';
  method: 'subscription';
  params: {
    path: string;
    input?: unknown; // <-- pass input of procedure, serialized by transformer
  };
}
```
