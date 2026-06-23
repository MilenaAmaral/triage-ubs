// Selecionando os elementos do HTML que vamos manipular
const form = document.getElementById('form-triagem');
const tabelaPacientes = document.getElementById('tabela-pacientes');
const tabelaHistorico = document.getElementById('tabela-historico');
const navLinks = document.querySelectorAll('.nav-links a[data-view]');
const views = document.querySelectorAll('.view');
const historicoKey = 'triageUBSHistorico';
const filaKey = 'triageUBSFila';
const temaKey = 'triageUBSTema';
const themeToggleButton = document.getElementById('theme-toggle-btn');
let historicoPacientes = [];

// Selecionando os números dos cards para atualização dinâmica
const cardTotal = document.querySelector('.card-kpi.total .number');
const cardVermelho = document.querySelector('.card-kpi.vermelho .number');
const cardLaranja = document.querySelector('.card-kpi.laranja .number');
const cardVerde = document.querySelector('.card-kpi.verde .number');
const cardAzul = document.querySelector('.card-kpi.azul .number');

const filaPacientes = [];
let filaInicioAtendimento = null;

const prioridadePontuacao = {
    vermelho: 100,
    laranja: 80,
    amarelo: 60,
    verde: 50,
    azul: 20
};

const tempoBasePorPrioridade = {
    vermelho: 5,
    laranja: 15,
    verde: 30,
    azul: 45
};

const limiteAlertaPorPrioridade = {
    vermelho: 5,
    laranja: 10,
    verde: 20,
    azul: 35
};

const badgeTextoPorPrioridade = {
    vermelho: 'EMERGÊNCIA',
    laranja: 'MUITO URGENTE',
    verde: 'POUCO URGENTE',
    azul: 'NÃO URGENTE'
};

function ordenarFila() {
    filaPacientes.sort((a, b) => {
        if (prioridadePontuacao[b.prioridade] !== prioridadePontuacao[a.prioridade]) {
            return prioridadePontuacao[b.prioridade] - prioridadePontuacao[a.prioridade];
        }
        return (a.chegada || a.entradaFila) - (b.chegada || b.entradaFila);
    });
}

function atualizarTemaBotao(tema) {
    if (!themeToggleButton) return;
    const label = themeToggleButton.querySelector('#theme-toggle-label');
    const icon = themeToggleButton.querySelector('i');
    if (tema === 'dark') {
        themeToggleButton.classList.add('dark-mode-active');
        if (label) label.textContent = 'Modo Claro';
        if (icon) {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }
    } else {
        themeToggleButton.classList.remove('dark-mode-active');
        if (label) label.textContent = 'Modo Escuro';
        if (icon) {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }
}

function aplicarTema(tema) {
    if (tema === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    atualizarTemaBotao(tema);
}

function salvarTema(tema) {
    localStorage.setItem(temaKey, tema);
}

function carregarTemaInicial() {
    const temaArmazenado = localStorage.getItem(temaKey);
    if (temaArmazenado) {
        return temaArmazenado;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function alternarTema() {
    const atual = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    const proximoTema = atual === 'dark' ? 'light' : 'dark';
    aplicarTema(proximoTema);
    salvarTema(proximoTema);
}

function formatarPacienteFila(paciente) {
    return {
        ...paciente,
        badgeTexto: paciente.badgeTexto || badgeTextoPorPrioridade[paciente.prioridade] || 'NÃO CLASSIFICADO',
        chegada: paciente.chegada || paciente.entradaFila,
    };
}

function salvarFila() {
    try {
        localStorage.setItem(filaKey, JSON.stringify(filaPacientes));
    } catch (error) {
        console.warn('Erro ao salvar fila no localStorage:', error);
    }
}

function parseJsonSafe(response) {
    return response.text().then((texto) => {
        if (!texto) return [];
        try {
            return JSON.parse(texto);
        } catch (erro) {
            console.warn('Erro ao analisar JSON inicial:', erro, texto);
            return [];
        }
    });
}

async function fetchFilaBackend() {
    try {
        const stored = carregarFila();
        filaPacientes.length = 0;
        filaPacientes.push(...stored.map(formatarPacienteFila));
        ordenarFila();
        atualizarPainel();
    } catch (error) {
        console.warn('Erro ao carregar fila local:', error);
    }
}

async function enviarTriagemParaBackend(paciente) {
    adicionarPaciente(
        paciente.nome,
        paciente.cns,
        paciente.dataNascimento,
        paciente.idade,
        paciente.nomeMae,
        paciente.sexoBiologico,
        paciente.peso,
        paciente.fc,
        paciente.fr,
        paciente.saturacao,
        paciente.glicemia,
        paciente.pressao,
        paciente.temperatura,
        paciente.prioridade,
        paciente.sintomas,
        paciente.historicoMedico,
        paciente.justificativa
    );
    salvarFila();
    return { paciente };
}

async function atenderPacienteBackend(id) {
    const indice = filaPacientes.findIndex(item => item.id === id);
    if (indice === -1) {
        throw new Error('Paciente não encontrado na fila.');
    }

    const paciente = filaPacientes[indice];
    paciente.status = 'Em Atendimento';
    paciente.atendimentoHora = Date.now();
    filaPacientes.splice(indice, 1);
    salvarFila();

    return { paciente };
}

function switchView(viewId) {
    views.forEach(view => view.classList.toggle('hidden', view.id !== viewId));
    navLinks.forEach(link => link.classList.toggle('active', link.dataset.view === viewId));
}

function carregarHistorico() {
    try {
        const stored = localStorage.getItem(historicoKey);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.warn('Erro ao carregar histórico:', error);
        return [];
    }
}

function carregarFila() {
    try {
        const stored = localStorage.getItem(filaKey);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.warn('Erro ao carregar fila:', error);
        return [];
    }
}

function salvarHistorico() {
    try {
        localStorage.setItem(historicoKey, JSON.stringify(historicoPacientes));
    } catch (error) {
        console.warn('Erro ao salvar histórico:', error);
    }
}

function atualizarHistorico() {
    if (!tabelaHistorico) return;
    tabelaHistorico.innerHTML = '';

    if (historicoPacientes.length === 0) {
        tabelaHistorico.innerHTML = `
            <tr>
                <td colspan="5" class="vazio">Nenhum registro no histórico ainda.</td>
            </tr>
        `;
        return;
    }

    historicoPacientes.forEach(paciente => {
        const linha = document.createElement('tr');
        linha.innerHTML = `
            <td>${paciente.nome}</td>
            <td>${paciente.idade}</td>
            <td><span class="badge ${paciente.prioridade}">${paciente.badgeTexto}</span></td>
            <td>${paciente.dataHoraFormatada}</td>
            <td>${paciente.justificativa || '-'}</td>
        `;
        tabelaHistorico.appendChild(linha);
    });
}

function limparHistorico() {
    historicoPacientes = [];
    salvarHistorico();
    atualizarHistorico();
}

function registrarHistorico(paciente) {
    const registro = {
        nome: paciente.nome,
        idade: paciente.idade,
        prioridade: paciente.prioridade,
        badgeTexto: paciente.badgeTexto,
        justificativa: paciente.justificativa,
        dataHoraFormatada: new Date(paciente.atendimentoHora || paciente.entradaFila).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    };

    historicoPacientes.unshift(registro);
    salvarHistorico();
    atualizarHistorico();
}

function calcularTempoEspera(paciente) {
    const entrada = paciente.entradaFila || paciente.chegada;
    const tempoEsperaMinutos = Math.max(0, Math.floor((Date.now() - entrada) / 60000));
    return `${tempoEsperaMinutos} min`;
}

function formatarHistoricoPaciente(paciente) {
    const dataHora = paciente.atendimentoHora || paciente.entradaFila || paciente.dataHora;
    return {
        nome: paciente.nome,
        idade: paciente.idade,
        prioridade: paciente.prioridade,
        badgeTexto: paciente.badgeTexto || badgeTextoPorPrioridade[paciente.prioridade] || 'NÃO CLASSIFICADO',
        justificativa: paciente.justificativa || '-',
        dataHoraFormatada: paciente.dataHoraFormatada || new Date(dataHora || Date.now()).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
    };
}

function obterLimiteAlerta(paciente) {
    return limiteAlertaPorPrioridade[paciente.prioridade] || tempoBasePorPrioridade[paciente.prioridade] || 0;
}

function verificarAlertaTempo(paciente) {
    const entrada = paciente.entradaFila || paciente.chegada;
    const tempoDecorrido = Math.max(0, Math.floor((Date.now() - entrada) / 60000));
    return tempoDecorrido > obterLimiteAlerta(paciente);
}

async function fetchHistoricoBackend() {
    try {
        const stored = carregarHistorico();
        historicoPacientes = Array.isArray(stored)
            ? stored.map(formatarHistoricoPaciente)
            : [];
        salvarHistorico();
        atualizarHistorico();
    } catch (error) {
        console.warn('Erro ao carregar histórico local:', error);
    }
}

async function carregarDadosIniciaisSeNecessario() {
    if (!localStorage.getItem(filaKey)) {
        try {
            const resposta = await fetch('data/triagem.json');
            const dados = await parseJsonSafe(resposta);
            const inicial = Array.isArray(dados) ? dados.map(formatarPacienteFila) : [];
            localStorage.setItem(filaKey, JSON.stringify(inicial));
        } catch (error) {
            console.warn('Não foi possível carregar triagem inicial:', error);
        }
    }
    if (!localStorage.getItem(historicoKey)) {
        try {
            const resposta = await fetch('data/historico.json');
            const dados = await parseJsonSafe(resposta);
            const inicial = Array.isArray(dados) ? dados.map(formatarHistoricoPaciente) : [];
            localStorage.setItem(historicoKey, JSON.stringify(inicial));
        } catch (error) {
            console.warn('Não foi possível carregar histórico inicial:', error);
        }
    }
}

function atualizarTabela() {
    tabelaPacientes.innerHTML = '';

    if (filaPacientes.length === 0) {
        tabelaPacientes.innerHTML = `
            <tr>
                <td colspan="6" class="vazio">Nenhum paciente na fila. Registre um novo caso.</td>
            </tr>
        `;
        return;
    }

    filaPacientes.forEach((paciente) => {
        const linha = document.createElement('tr');
        const justificativaEscapada = paciente.justificativa ? paciente.justificativa.replace(/"/g, '&quot;') : '';
        const tempoDecorrido = Math.floor((Date.now() - (paciente.entradaFila || paciente.chegada)) / 60000);
        const tempoAlertado = verificarAlertaTempo(paciente);

        linha.innerHTML = `
            <td>${paciente.nome}</td>
            <td>${paciente.idade}</td>
            <td>${paciente.cns}</td>
            <td><span class="badge ${paciente.prioridade}" title="${justificativaEscapada}">${paciente.badgeTexto}</span></td>
            <td>${paciente.historicoMedico && paciente.historicoMedico.length ? paciente.historicoMedico.join(', ') : '-'}</td>
            <td>${paciente.sintomas || '-'}</td>
            <td>${calcularTempoEspera(paciente)}</td>
            <td><button type="button" class="btn-call">Chamar Paciente</button></td>
        `;

        if (tempoAlertado) {
            linha.classList.add('alerta-prioridade');
        }
        tabelaPacientes.appendChild(linha);

        const btnCall = linha.querySelector('.btn-call');
        if (btnCall) {
            btnCall.addEventListener('click', () => chamarPaciente(paciente));
        }
    });
}

function atualizarPainel() {
    atualizarTabela();
    atualizarContadores();
    atualizarStatusLotacao();
}

function atualizarContadores() {
    const vermelho = filaPacientes.filter(p => p.prioridade === 'vermelho').length;
    const laranja = filaPacientes.filter(p => p.prioridade === 'laranja').length;
    const verde = filaPacientes.filter(p => p.prioridade === 'verde').length;
    const azul = filaPacientes.filter(p => p.prioridade === 'azul').length;

    cardTotal.textContent = filaPacientes.length;
    cardVermelho.textContent = vermelho;
    cardLaranja.textContent = laranja;
    cardVerde.textContent = verde;
    cardAzul.textContent = azul;
}

function atualizarStatusLotacao() {
    const statusEl = document.getElementById('status-unidade');
    const statusIcon = document.getElementById('status-icone');
    const statusTexto = document.getElementById('status-texto');
    if (!statusEl || !statusIcon || !statusTexto) return;

    const quantidade = filaPacientes.length;
    statusEl.classList.remove('lotacao-normal', 'lotacao-moderado', 'lotacao-critico');
    statusIcon.className = 'fa-solid';

    if (quantidade > 30) {
        statusTexto.textContent = `Nível de Lotação: Crítico (${quantidade} pacientes)`;
        statusEl.classList.add('lotacao-critico');
        statusIcon.classList.add('fa-triangle-exclamation');
    } else if (quantidade >= 10) {
        statusTexto.textContent = `Nível de Lotação: Moderado (${quantidade} pacientes)`;
        statusEl.classList.add('lotacao-moderado');
        statusIcon.classList.add('fa-exclamation-triangle');
    } else {
        statusTexto.textContent = `Nível de Lotação: Normal (${quantidade} pacientes)`;
        statusEl.classList.add('lotacao-normal');
        statusIcon.classList.add('fa-circle-check');
    }
}

function capturarHistoricoMedico(alergiaDetalhe = '') {
    const campos = document.querySelectorAll('#historico-medico input[type="checkbox"]:checked');
    const historico = Array.from(campos).map(item => item.value);
    if (historico.includes('Alergia a Medicamentos') && alergiaDetalhe) {
        historico.push(`Detalhe: ${alergiaDetalhe}`);
    }
    return historico;
}

async function chamarPaciente(paciente) {
    try {
        const resultado = await atenderPacienteBackend(paciente.id);
        const pacienteAtendido = resultado.paciente || paciente;
        registrarHistorico(pacienteAtendido);
        const indice = filaPacientes.findIndex(item => item.id === paciente.id);
        if (indice !== -1) {
            filaPacientes.splice(indice, 1);
        }
        atualizarPainel();
        await fetchHistoricoBackend();
    } catch (error) {
        alert(error.message || 'Não foi possível chamar o paciente.');
        console.warn('Erro ao atender paciente:', error);
        return;
    }

    const telaRecepcao = document.getElementById('tela-recepcao');
    const recepcaoTexto = document.getElementById('recepcao-texto');
    if (!telaRecepcao || !recepcaoTexto) return;

    const pacienteNome = paciente.nome ? paciente.nome.toUpperCase() : 'X';
    recepcaoTexto.textContent = `SENHA / PACIENTE ${pacienteNome} - DIRIJA-SE AO CONSULTÓRIO 2`;
    telaRecepcao.classList.remove('hidden');
    gerarBip();
}

function gerarBip() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        const oscillator = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
        oscillator.onended = () => audioCtx.close();
    } catch (error) {
        console.warn('Falha ao reproduzir bip:', error);
    }
}

const btnFecharRecepcao = document.getElementById('btn-fechar-recepcao');
const telaRecepcao = document.getElementById('tela-recepcao');
if (btnFecharRecepcao && telaRecepcao) {
    btnFecharRecepcao.addEventListener('click', () => {
        telaRecepcao.classList.add('hidden');
    });
}

function calcularIdadePorDataNascimento(dataNascimento) {
    if (!dataNascimento) return '';
    const nascimento = new Date(dataNascimento);
    if (Number.isNaN(nascimento.getTime())) return '';
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const mes = hoje.getMonth() - nascimento.getMonth();
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
        idade -= 1;
    }
    return idade >= 0 ? idade : '';
}

function adicionarPaciente(nome, cns, dataNascimento, idade, nomeMae, sexoBiologico, peso, fc, fr, saturacao, glicemia, pressao, temperatura, prioridade, sintomas, historicoMedico, justificativa) {
    const badgeTexto = {
        vermelho: 'EMERGÊNCIA',
        laranja: 'MUITO URGENTE',
        verde: 'POUCO URGENTE',
        azul: 'NÃO URGENTE'
    }[prioridade] || 'NÃO CLASSIFICADO';

    const entradaFila = Date.now();
    const paciente = {
        nome,
        cns,
        dataNascimento,
        idade,
        nomeMae,
        sexoBiologico,
        peso,
        historicoMedico,
        fc,
        fr,
        saturacao,
        glicemia,
        pressao,
        temperatura,
        sintomas,
        prioridade,
        justificativa,
        badgeTexto,
        entradaFila,
        chegada: entradaFila
    };

    filaPacientes.push(paciente);
    ordenarFila();
    atualizarPainel();
    registrarHistorico(paciente);

    if (!filaInicioAtendimento) {
        filaInicioAtendimento = Date.now();
    }
}

form.addEventListener('submit', async function(evento) {
    evento.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const cns = document.getElementById('cns').value.trim();
    const dataNascimento = document.getElementById('data-nascimento').value.trim();
    let idade = document.getElementById('idade').value.trim();
    const nomeMae = document.getElementById('nome-mae').value.trim();
    const sexoBiologico = document.getElementById('sexo-biologico').value.trim();
    const peso = document.getElementById('peso').value.trim();
    const fc = document.getElementById('fc').value.trim();
    const fr = document.getElementById('fr').value.trim();
    const saturacao = document.getElementById('saturacao').value.trim();
    const glicemia = document.getElementById('glicemia').value.trim();
    const pressao = document.getElementById('pressao').value.trim();
    const temperatura = document.getElementById('temperatura').value.trim();
    const sintomas = document.getElementById('sintomas').value.trim();
    const alergiaMedicamentosDetalheInput = document.getElementById('alergia-medicamentos-detalhe');
    const alergiaMedicamentosDetalhe = alergiaMedicamentosDetalheInput ? alergiaMedicamentosDetalheInput.value.trim() : '';
    const historicoMedico = capturarHistoricoMedico(alergiaMedicamentosDetalhe);

    if (!idade && dataNascimento) {
        idade = calcularIdadePorDataNascimento(dataNascimento).toString();
        document.getElementById('idade').value = idade;
    }

    if (!nome || !cns || !dataNascimento || !idade || !nomeMae || !sexoBiologico || !peso || !fc || !fr || !saturacao || !glicemia || !pressao || !temperatura) {
        alert('Preencha todos os campos obrigatórios antes de enviar.');
        return;
    }

    if (alergiaMedicamentosCheckbox && alergiaMedicamentosCheckbox.checked && !alergiaMedicamentosDetalhe) {
        alert('Informe qual medicamento causou alergia.');
        return;
    }

    const resultado = gerarClassificacaoRisco(idade, Number(fc), Number(fr), Number(saturacao), pressao, Number(temperatura), Number(glicemia));
    const classificacao = resultado.classificacao;
    const justificativa = resultado.justificativa;

    const pacientePayload = {
        nome,
        cns,
        dataNascimento,
        idade,
        nomeMae,
        sexoBiologico,
        peso: Number(peso),
        fc: Number(fc),
        fr: Number(fr),
        saturacao: Number(saturacao),
        glicemia: Number(glicemia),
        pressao,
        temperatura: Number(temperatura),
        prioridade: classificacao,
        sintomas,
        historicoMedico,
        justificativa
    };

    try {
        await enviarTriagemParaBackend(pacientePayload);
        await fetchFilaBackend();
        await fetchHistoricoBackend();
        form.reset();
        if (detalheAlergiaContainer) {
            detalheAlergiaContainer.style.display = 'none';
        }
        if (alergiaMedicamentosDetalheInput) {
            alergiaMedicamentosDetalheInput.required = false;
        }
    } catch (error) {
        alert(error.message || 'Erro ao enviar os dados da triagem.');
        console.warn('Erro no envio da triagem:', error);
    }
});

const alergiaMedicamentosCheckbox = document.getElementById('alergia-medicamentos-checkbox');
const detalheAlergiaContainer = document.getElementById('detalhe-alergia-container');
const alergiaMedicamentosDetalheInput = document.getElementById('alergia-medicamentos-detalhe');
if (alergiaMedicamentosCheckbox && detalheAlergiaContainer && alergiaMedicamentosDetalheInput) {
    alergiaMedicamentosCheckbox.addEventListener('change', () => {
        const visible = alergiaMedicamentosCheckbox.checked;
        detalheAlergiaContainer.style.display = visible ? 'block' : 'none';
        alergiaMedicamentosDetalheInput.required = visible;
        if (!visible) {
            alergiaMedicamentosDetalheInput.value = '';
        }
    });
}

const dataNascimentoInput = document.getElementById('data-nascimento');
const idadeInput = document.getElementById('idade');
if (dataNascimentoInput && idadeInput) {
    dataNascimentoInput.addEventListener('change', () => {
        const idadeCalculada = calcularIdadePorDataNascimento(dataNascimentoInput.value);
        if (idadeCalculada !== '') {
            idadeInput.value = idadeCalculada;
        }
    });
}

setInterval(() => {
    fetchFilaBackend();
    fetchHistoricoBackend();
}, 10000);

historicoPacientes = carregarHistorico();
atualizarHistorico();
const temaInicial = carregarTemaInicial();
aplicarTema(temaInicial);

if (themeToggleButton) {
    themeToggleButton.addEventListener('click', alternarTema);
}

switchView('dashboard-view');
carregarDadosIniciaisSeNecessario().then(() => {
    fetchFilaBackend();
    fetchHistoricoBackend();
});

const botaoLimparHistorico = document.getElementById('btn-limpar-historico');
if (botaoLimparHistorico) {
    botaoLimparHistorico.addEventListener('click', () => {
        if (confirm('Deseja realmente apagar todo o histórico de pacientes?')) {
            limparHistorico();
        }
    });
}

const botaoAtualizarFila = document.getElementById('btn-atualizar-fila');
if (botaoAtualizarFila) {
    botaoAtualizarFila.addEventListener('click', () => {
        fetchFilaBackend();
        fetchHistoricoBackend();
    });
}

navLinks.forEach(link => {
    link.addEventListener('click', function(event) {
        event.preventDefault();
        const target = this.dataset.view;
        if (target) switchView(target);
    });
});