# JP ARENA COMBATE

Arena shooter single-player em Three.js, com dois mundos, quatro ondas por arena, três armas, jetpack e progressão por portais.

**Jogar:** https://reinaldorego.github.io/jp-arena-combate/

Escolha MUNDO GUAMÁ (mercado verde) ou MUNDO JURUNAS (fortaleza e lava), digite seu nome e selecione a dificuldade. Os monstros MARCUS, ADY, REINALDO, CAVALCANTE, CYNTHIA, JULIANA, SAID, JAINARA, FÁBIO, DEJA e NADJA perseguem o jogador e atacam de perto. O HUD mantém nome, mundo, vida e Kills; a área de munição identifica a arma atual e há um indicador discreto de combustível.

## Dificuldade e progressão

| Dificuldade | Monstros por mundo | Vida dos monstros | Dano base | Reservas de munição |
| --- | ---: | ---: | ---: | ---: |
| Fácil | 44 | 100% | 5 | 100% |
| Normal | 57 | 130% | 9 | 70% |
| Difícil | 73 | 165% | 14 | 45% |

O dano também varia ligeiramente entre monstros. A dificuldade altera a velocidade e a recuperação entre ondas. Eliminações deixam vida ou munição; pedestais disponibilizam armas e jetpack.

Após eliminar as quatro ondas, um portal azul brilhante abre na arena, sem bloquear os controles ou mostrar uma tela de fim. Caminhe até ele para ir do Guamá ao Jurunas ou do Jurunas ao Guamá. Nome, dificuldade, armas, munição e Kills acumulados são preservados; a nova arena repõe os itens e começa novas ondas. A morte encerra a jornada; reiniciar zera a progressão.

## Armas e jetpack

| Tecla | Arma | Comportamento | Carregador | Recarga |
| --- | --- | --- | ---: | ---: |
| 1 | Metralhadora | 22 de dano base, automática, 0,065 s entre tiros | 30 | 1,35 s |
| 2 | Rifle | 85 de dano base, tiro único por clique, preciso à distância | 8 | 1,8 s |
| 3 | Bazuca | Foguete com tempo de viagem e explosão em área de até 5,5 m; munição escassa | 1 | 2,8 s |
| 4 | Alternar arma | Percorre as três armas | — | — |

As três armas podem ser selecionadas desde o início; os itens no mapa equipam a arma coletada e repõem munição. Cada arma mantém seu próprio carregador, reserva e recarga. Paredes bloqueiam tiros e explosões. ADS reduz a dispersão e a sensibilidade, com FOV interpolado de 100° para 50°.

Colete o jetpack e segure Espaço ou JET no celular para subir e voar. O item oferece **20 segundos totais de combustível**, consumido somente enquanto o botão está pressionado, inclusive no limite de altura de 9 m. Soltar o botão ou esgotar o combustível devolve a gravidade. Há chamas nos motores e brilho na borda da visão; o jogador pode pousar nos telhados e atirar durante o voo. Sem combustível ou sem jetpack, o botão permite pular.

## Controles

PC: WASD/setas movem, mouse olha, esquerdo dispara, direito segura ADS, R recarrega, Espaço pula/voa, 1–3 escolhem arma, 4 alterna e Escape pausa.

Celular: joystick à esquerda; arraste à direita para olhar. ATIRAR aceita disparo e arraste com o mesmo dedo; MIRA alterna ADS; ARMA alterna o equipamento; PULAR/JET pula ou voa enquanto pressionado; RECARREGAR e PAUSA têm botões próprios. Movimento, mira, tiro e voo aceitam toques simultâneos. O tutorial completo fica no menu inicial; a mensagem do portal é discreta no topo.

## Desenvolvimento e testes

Node.js 24 e npm:

```sh
npm ci
npm run dev
npm test
npm run build
```

Com Chrome instalado e o servidor de desenvolvimento ativo:

```sh
npm run qa:browser
npm run qa:mobile
```

Os testes da simulação cobrem navegação, dificuldade, todas as ondas, contagem de Kills, portais, preservação de inventário, três armas, colisões e explosões, recarga, coletas, combustível, gravidade, pulo, pouso, vitória da arena e derrota. Os testes de navegador cobrem PC e quatro tamanhos de celular nos dois mundos, gestos simultâneos, ADS, arma semiautomática, jetpack e progressão nos dois sentidos. Defina GAME_URL para testar outra URL; capturas ficam em artifacts/.

Pushes em main acionam .github/workflows/pages.yml, que executa testes, compila e publica no GitHub Pages.