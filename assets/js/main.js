// Selecionando os elementos do HTML que vamos manipular
const form = document.getElementById('form-triagem');
const tabelaPacientes = document.getElementById('tabela-pacientes');
const tabelaHistorico = document.getElementById('tabela-historico');
const navLinks = document.querySelectorAll('.nav-links a[data-view]');
const views = document.querySelectorAll('.view');
const historicoKey = 'triageUBSHistorico';
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
    verde: 50,
    azul: 20
};

const tempoBasePorPrioridade = {
    vermelho: 5,
    laranja: 15,
    verde: 30,
    azul: 45
};

function ordenarFila() {
    filaPacientes.sort((a, b) => {
        if (prioridadePontuacao[b.prioridade] !== prioridadePontuacao[a.prioridade]) {
            return prioridadePontuacao[b.prioridade] - prioridadePontuacao[a.prioridade];
        }
        return a.chegada - b.chegada;
    });
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
        dataHoraFormatada: new Date(paciente.entradaFila).toLocaleString('pt-BR', {
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
        linha.innerHTML = `
            <td>${paciente.nome}</td>
            <td>${paciente.idade}</td>
            <td>${paciente.cns}</td>
            <td><span class="badge ${paciente.prioridade}" title="${justificativaEscapada}">${paciente.badgeTexto}</span></td>
            <td>${paciente.sintomas || '-'}</td>
            <td>${calcularTempoEspera(paciente)}</td>
        `;
        tabelaPacientes.appendChild(linha);
    });
}

function atualizarPainel() {
    atualizarTabela();
    atualizarContadores();
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

function adicionarPaciente(nome, cns, dataNascimento, idade, nomeMae, sexoBiologico, peso, fc, fr, saturacao, glicemia, pressao, temperatura, prioridade, sintomas, justificativa) {
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

form.addEventListener('submit', function(evento) {
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

    if (!idade && dataNascimento) {
        idade = calcularIdadePorDataNascimento(dataNascimento).toString();
        document.getElementById('idade').value = idade;
    }

    if (!nome || !cns || !dataNascimento || !idade || !nomeMae || !sexoBiologico || !peso || !fc || !fr || !saturacao || !glicemia || !pressao || !temperatura) {
        alert('Preencha todos os campos obrigatórios antes de enviar.');
        return;
    }

    const resultado = gerarClassificacaoRisco(idade, Number(fc), Number(fr), Number(saturacao), pressao, Number(temperatura), Number(glicemia));
    const classificacao = resultado.classificacao;
    const justificativa = resultado.justificativa;

    adicionarPaciente(
        nome,
        cns,
        dataNascimento,
        idade,
        nomeMae,
        sexoBiologico,
        Number(peso),
        Number(fc),
        Number(fr),
        Number(saturacao),
        Number(glicemia),
        pressao,
        Number(temperatura),
        classificacao,
        sintomas,
        justificativa
    );
    form.reset();
});

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
    if (filaPacientes.length > 0) {
        atualizarTabela();
    }
}, 1000);

historicoPacientes = carregarHistorico();
atualizarHistorico();
switchView('dashboard-view');
atualizarTabela();
atualizarContadores();

const botaoLimparHistorico = document.getElementById('btn-limpar-historico');
if (botaoLimparHistorico) {
    botaoLimparHistorico.addEventListener('click', () => {
        if (confirm('Deseja realmente apagar todo o histórico de pacientes?')) {
            limparHistorico();
        }
    });
}

navLinks.forEach(link => {
    link.addEventListener('click', function(event) {
        event.preventDefault();
        const target = this.dataset.view;
        if (target) switchView(target);
    });
});