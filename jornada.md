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

#### O 1º passo

Iniciar o docker no windows e criar um devcontainer com pela extensão do vscode.
Escolhi o container base do ubuntu na versão jammy.
Adicionei as features(opções adicionais) "node", "zsh", "common utils"(para o zsh) e "shell history".
Eu poderia configurar mais algumas coisas nas features, mas preferi deixar no padrão.
Depois de terminar a configuração, o vscode reabre no container de desenvolvimento, o docker começa a criar o container, e depois de alguns segundos/minutos, meu ambiente ubuntu está pronto para o desenvolvimento.
Os ultimos retoques para começar a codar é re-habilitar as extensões relevantes no vscode, porque os containers de desenvolvimento não vem com todas as extensões do seu vscode habilitadas por padrão, então algumas extensões como prettier precisam ser habilitadas manualmente no container. (pra mim esse comportamento é até bem util, pois meu vscode padrão no windows geralmente tem extensões inuteis para alguns projetos de webdev)

### 2. Tutoriais

#### Não sei basicamente nada sobre tRPC

É basicamente o que o subtitulo diz "não sei basicamente nada sobre tRPC". Sei que é uma lib que me ajuda a criar APIs com uma tipagem forte, mas meu conhecimento só vai até aí.
No meu primeiro contato com a lib usando o `npm create t3-app@latest`, eu consegui me virar e usar app de exemplo para criar uma API comum, mas no momento em que tentei alguns conceitos mais avaçados como WebSockets, eu travei legal.
Para aprender o que é necessario para esse tipo de API, decidi criar um app seguindo um [tutorial](https://preciselab.io/trpc/), espero que com um escopo menor seja mais facil de identificar o que fiz de errado no outro projeto.

#### O 2º passo
