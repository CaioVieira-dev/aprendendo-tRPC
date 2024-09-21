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

##### Conectando no client

###### Atenção:

`createWSClient` assume que está operando no browser, no node client ele pode mostrar um erro de

```TS
ReferenceError: WebSocket is not defined
```

Para resolver esse erro instalo o ws e os tipos dele no escopo global

##### continuando

Agora crio o `wsClient`

```TS
const WebSocket = require('ws');
const wsClient = createWSClient({
  url: `ws://localhost:3001`,
  WebSocket: WebSocket,
});
```

E uso ele no link

```TS
const client = createTRPCProxyClient<AppRouter>({
  links: [
    wsLink({
      client: wsClient
    }),
  ],
});
```

e por fim me inscrevo no websocket

```TS
client.time.subscribe(undefined, {
  onData: (time) => {
    console.log(time)
  }
 })
```

Por enquanto para funcionar eu preciso comentar a parte de autenticação no client.

#### O 5º passo

Usar http e websockets no mesmo router.
Websockets não suportam cabeçalhos http, com isso fica dificil autenticar. Mas podemos ter uma requisição http que sofre um upgrade para websocket([detalhes](https://www.rfc-editor.org/rfc/rfc6455?ref=preciselab.io)).
Para separar as partes em websocket das em http uso o `splitLink`

```TS
const client = createTRPCProxyClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => op.type === "subscription",
      true: wsLink({
        client: wsClient,
      }),
      false: httpBatchLink({
        url: "http://localhost:2022",
        headers: () => Object.fromEntries(headers),
      }),
    }),
  ],
});
```

##### Cenario 1: Passar os headers de autenticação numa requisição de handshake (facil, mas não muito pratico)

Esse cenario é facil de implementar, mas não é muito pratico.
Seguindo o tutorial, vou usar isso só como prova de conceito.

Primeiro crio um proxy que vai adicionar os cabeçalhos

```TS
const WebSocket = require('ws');

const WebSocketProxy = new Proxy(WebSocket, {
  construct(target, args) {
    return new target(args[0], undefined, {
      headers: Object.fromEntries(headers),
    });
  },
});
```

Headers, é o objeto que vai ter os cabeçalhos de autenticação.

```TS
const headers: Map<string, string> = new Map<string, string>();
```

No target, `args[0]` é a url.
`undefined` é o protocolo(pulo isso porque não preciso agora).
E o terceiro parametro vai ter os headers, que seto antes de chamar o `createWSClient` com

```TS
headers.set('Authorization', 'ABC');
```

Agora, posso usar o `WebSocketProxy` no lugar do `Websocket`

```TS
const wsClient = createWSClient({
  url: `ws://localhost:3001`,
  WebSocket: WebSocketProxy,
});
```

E o client pode ter só o wsLink

```TS
const client = createTRPCProxyClient<AppRouter>({
  links: [
    wsLink({
      client: wsClient,
    }),
  ],
});
```

ou ser dividido entre http e websocket

```TS
const client = createTRPCProxyClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => op.type === "subscription",
      true: wsLink({
        client: wsClient,
      }),
      false: httpBatchLink({
        url: "http://localhost:2022",
        headers: () => Object.fromEntries(headers),
      }),
    }),
  ],
});
```

No server não preciso de muita alteração, só uma pequena melhoria é retornar o o `auth` no `time`

```TS
  time: publicProcedure.subscription(({ ctx }) => {
    return observable<{ date: Date; auth: boolean }>((emit) => {
      // logic that will execute on subscription start
      const interval = setInterval(
        () => emit.next({ date: new Date(), auth: ctx.auth }),
        1000
      );
      // function to clean up and close interval after end of connection
      return () => {
        clearInterval(interval);
      };
    });
  }),
```

E o `main` do client vai ficar assim

```TS
async function main() {
  // client.time.subscribe(undefined, {
  //   onData: (time) => {
  //     console.log(time);
  //   },
  // });
  const result = await client.greet.query("tRPC");

  // Type safe
  console.log(result.greeting.toUpperCase());

  // const unauthorizedError = await client.secret.query();
  // console.log(unauthorizedError);
  // const unauthorizedErrorMutation = await client.secretMutation.mutate();
  // console.log(unauthorizedErrorMutation);

  const authorized = await client.secret.query();
  console.log(authorized);
  const authorizedMutation = await client.secretMutation.mutate();
  console.log(authorizedMutation);

  client.time.subscribe(undefined, {
    onData: ({ auth, date }) => {
      console.log(`I am ${auth ? "auth" : "not auth"} at ${date}`);
    },
  });
}
```

Esse cenario até funciona, mas assume que estou autenticado desde o inicio. Um cenario real é iniciar não autenticado fazer uma requisição de autenticação http e depois iniciar a conexão do websocket

##### Cenario 2: Criar um mapa de ids de conexão e tokens de autenticação (tem algumas falhas, mas funciona)

Aqui o tutorial começa a partir de um design.

1. Setar `sec-websocket-key`(no caso `sec-websocket-id`) que vou usar para salvar e reusar no cliente
2. Setar um mapa de keys de autenticação no client
3. Permitir atualizar o mapa de keys com requisições http
4. Ver na conexão de websocket que estou autenticado usando as keys

###### Setar o header com um client id

Quando o meu client começa(ex: meu usuario entra na pagina), eu gero um id. No `node` eu uso o `crypto`
No client eu adiciono antes do `const wsClient = createWSClient({`

```TS
import crypto from 'crypto';
const id = crypto.randomBytes(16).toString('hex')
headers.set('sec-websocket-id', id);
```

(ps: em um ponto era possivel setar `sec-websocket-key`, mas isso não era algo desejavel e o pessoal responsavel pelo `ws` removel essa possibilidade)
(ps2: nesse ponto eu substituí o header `headers.set("Authorization", "ABC");` pelo de id)

###### Setar o mapa e conexões no server

É um ponto crucial compartilhar `headers` para `http` e `websocket` links.
No `createContext` do servidor eu posso ver os headers de todos os tipos de requisição(http e http com o upgrade request que vai abrir o websocket)
No `context.ts` eu reescrevo assim:

```TS
import { inferAsyncReturnType } from "@trpc/server";
import { CreateNextContextOptions } from "@trpc/server/adapters/next";

const authState = new Map<string, boolean>();

export async function createContext({ req }: CreateNextContextOptions) {
  console.log(req.headers);
  const auth = req.headers.authorization === "ABC";
  const id = req.headers["sec-websocket-id"];

  authState.set(id, auth);

  return {
    auth: () => authState.get(id) ?? false,
    id,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

agora não estou checando o authState na requisição atual, mas o ultimo valor salvo no mapa.
No meu cenario existem os eventos

- query publica
- setar o token
- mutação privada <- aqui seto a autenticação como true
- subscription no websocket <- aqui uso o state do mapa
  Preciso ajustar em dois lugares. No `isAuthed` preciso chamar auth

```TS
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.auth()) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      auth: ctx.auth,
    },
  });
});
```

e no `time`, preciso ajustar `ctx.auth` para `ctx.auth()`

```TS
const interval = setInterval(() => emit.next({date: new Date(), auth: ctx.auth()}), 1000);
```

###### Checar no client se funcionou

no `main` do client agora tenho

```TS
async function main() {
  // client.time.subscribe(undefined, {
  //   onData: (time) => {
  //     console.log(time);
  //   },
  // });
  const result = await client.greet.query("tRPC");

  // Type safe
  console.log(result.greeting.toUpperCase());

  // const unauthorizedError = await client.secret.query();
  // console.log(unauthorizedError);
  // const unauthorizedErrorMutation = await client.secretMutation.mutate();
  // console.log(unauthorizedErrorMutation);

  // const authorized = await client.secret.query();
  // console.log(authorized);
  // const authorizedMutation = await client.secretMutation.mutate();
  // console.log(authorizedMutation);

  setTimeout(async () => {
    headers.set("Authorization", "ABC");

    const secret = await client.secretMutation.mutate();
    console.log(secret);
  }, 2000);

  client.time.subscribe(undefined, {
    onData: ({ auth, date }) => {
      console.log(`I am ${auth ? "auth" : "not auth"} at ${date}`);
    },
  });
}
```

##### Cenario 3: Passar o token no payload de todos os subscription (meio feio mas escala bem)

Passar o token no payload da subscription ao invez da requisição de "handshake"
O ajuste no `time`

```TS
 time: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .subscription(({ ctx, input }) => {
      return observable<{ date: Date; ctx_auth: boolean; input_auth: boolean }>(
        (emit) => {
          // logic that will execute on subscription start
          const interval = setInterval(
            () =>
              emit.next({
                date: new Date(),
                ctx_auth: ctx.auth(),
                input_auth: input.token === "ABC",
              }),
            1000
          );
          // function to clean up and close interval after end of connection
          return () => {
            clearInterval(interval);
          };
        }
      );
    }),
```

e no client

```TS
  client.time.subscribe(
    { token: "ABC" },
    {
      onData: (ctx) => {
        console.log(
          `I am ${ctx.input_auth ? "auth" : "not auth"} at ${ctx.date}`
        );
      },
    }
  );
```

No final o `main` ficou assim

```TS
async function main() {
  // client.time.subscribe(undefined, {
  //   onData: (time) => {
  //     console.log(time);
  //   },
  // });
  const result = await client.greet.query("tRPC");

  // Type safe
  console.log(result.greeting.toUpperCase());

  // const unauthorizedError = await client.secret.query();
  // console.log(unauthorizedError);
  // const unauthorizedErrorMutation = await client.secretMutation.mutate();
  // console.log(unauthorizedErrorMutation);

  // const authorized = await client.secret.query();
  // console.log(authorized);
  // const authorizedMutation = await client.secretMutation.mutate();
  // console.log(authorizedMutation);

  setTimeout(async () => {
    headers.set("Authorization", "ABC");

    const secret = await client.secretMutation.mutate();
    console.log(secret);
  }, 2000);

  // client.time.subscribe(undefined, {
  //   onData: ({ auth, date }) => {
  //     console.log(`I am ${auth ? "auth" : "not auth"} at ${date}`);
  //   },
  // });
  client.time.subscribe(
    { token: "ABC" },
    {
      onData: (ctx) => {
        console.log(
          `I am ${ctx.input_auth ? "auth" : "not auth"} at ${ctx.date}`
        );
      },
    }
  );
}
```
