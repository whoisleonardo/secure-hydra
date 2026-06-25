<div align="center">
  <h1 align="center">Secure Hydra</h1>

  <p align="center">
    <strong>Um fork do Hydra Launcher focado em isolamento. Downloads e execução de jogos podem rodar dentro de uma VM descartável, mantendo o sistema principal protegido de qualquer software desconhecido.</strong>
  </p>
</div>

## O que é

Secure Hydra é um fork do [Hydra Launcher](https://github.com/hydralauncher/hydra) que adiciona uma camada de isolamento por máquina virtual. A ideia é simples: software de origem desconhecida nunca toca no seu sistema principal.

Toda a base do Hydra — biblioteca, downloads, interface — permanece intacta. O que muda é o momento de jogar: você escolhe onde o jogo roda.

## Diferenciais deste fork

**Botão Jogar com escolha de ambiente.** Ao iniciar um jogo, um modal pergunta onde executá-lo:

- **Jogar na VM** — o jogo roda dentro de um ambiente isolado (Windows Sandbox ou VirtualBox). Malware fica contido, o sistema principal não é afetado.
- **Jogar no Host** — execução direta, performance máxima. Recomendado para jogos pesados que não rodam bem virtualizados.

**Aviso de performance.** Jogos exigentes (lançamentos recentes ou títulos AAA conhecidos) exibem um aviso sugerindo o Host, já que GPU virtualizada não dá conta de jogos de alta exigência.

**Detecção automática de ambiente.** Na primeira execução, um assistente detecta o backend de VM disponível:

- Windows Sandbox (nativo do Windows, sem instalação) — prioridade
- VirtualBox (fallback)
- Opção de ativar o Windows Sandbox automaticamente se nenhum for encontrado

**Isolamento real.** No modo VM, a pasta do jogo é montada como somente-leitura, a rede pode ser desabilitada, e o ambiente é descartado ao fechar — sem deixar rastros no host.

## Como funciona o isolamento

```
Sistema principal (intocado)
└── Backend de VM (Windows Sandbox ou VirtualBox)
    └── Ambiente descartável
        ├── Pasta do jogo (somente-leitura)
        ├── Rede isolada
        └── Jogo em execução — contido
```

Quando você fecha o jogo, o ambiente some. Para começar de novo, basta abrir outro.

## Requisitos

- Windows 10/11 (o isolamento por VM é específico para Windows nesta versão)
- Windows Sandbox requer Windows 11 Pro/Enterprise/Education, ou VirtualBox instalado como alternativa
- Virtualização (SVM/VT-x) habilitada na BIOS
- O restante dos requisitos do Hydra Launcher original

## Build

Mesmo processo do Hydra original:

```bash
yarn install
yarn dev      # desenvolvimento
yarn build    # produção
```

## Configuração do VirtualBox (opcional)

Se usar o backend VirtualBox, defina as credenciais do guest nas variáveis de ambiente em vez de usar o padrão:

```bash
VBOX_GUEST_USER=seu_usuario
VBOX_GUEST_PASS=sua_senha
```

## Créditos

Este projeto é um fork de [Hydra Launcher](https://github.com/hydralauncher/hydra), criado por **Los Broxas** e a comunidade Hydra, licenciado sob MIT. Todo o crédito pela base — biblioteca de jogos, sistema de download, interface e arquitetura — pertence aos autores originais.

As modificações deste fork se limitam à camada de isolamento por VM descrita acima.

## Licença

Distribuído sob a [Licença MIT](./LICENSE).

```
MIT License

Copyright (c) 2024 Los Broxas

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Aviso

Secure Hydra é uma ferramenta de gerenciamento e execução de jogos. O launcher em si é software livre. O conteúdo baixado através dele é de responsabilidade exclusiva de cada usuário, que deve respeitar as leis de direito autoral aplicáveis na sua jurisdição.
