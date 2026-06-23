// Selecionando os elementos do HTML que vamos manipular
const form = document.getElementById('form-triagem');
const tabelaPacientes = document.getElementById('tabela-pacientes');

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

function calcularTempoEspera(paciente) {
    const index = filaPacientes.indexOf(paciente);
    if (index <= 0) return '0 min';

    let totalMinutos = 0;
    for (let i = 0; i < index; i++) {
        totalMinutos += tempoBasePorPrioridade[filaPacientes[i].prioridade];
    }

    const tempoDecorrido = filaInicioAtendimento ? Math.floor((Date.now() - filaInicioAtendimento) / 60000) : 0;
    const tempoRestante = Math.max(0, totalMinutos - tempoDecorrido);

    return `${tempoRestante} min`;
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

function adicionarPaciente(nome, cns, idade, fc, fr, saturacao, glicemia, pressao, temperatura, prioridade, sintomas, justificativa) {
    const badgeTexto = {
        vermelho: 'EMERGÊNCIA',
        laranja: 'MUITO URGENTE',
        verde: 'POUCO URGENTE',
        azul: 'NÃO URGENTE'
    }[prioridade] || 'NÃO CLASSIFICADO';

    const paciente = {
        nome,
        cns,
        idade,
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
        chegada: Date.now()
    };

    filaPacientes.push(paciente);
    ordenarFila();
    atualizarTabela();
    atualizarContadores();

    if (!filaInicioAtendimento) {
        filaInicioAtendimento = Date.now();
    }
}

form.addEventListener('submit', function(evento) {
    evento.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const cns = document.getElementById('cns').value.trim();
    const idade = document.getElementById('idade').value.trim();
    const fc = document.getElementById('fc').value.trim();
    const fr = document.getElementById('fr').value.trim();
    const saturacao = document.getElementById('saturacao').value.trim();
    const glicemia = document.getElementById('glicemia').value.trim();
    const pressao = document.getElementById('pressao').value.trim();
    const temperatura = document.getElementById('temperatura').value.trim();
    const sintomas = document.getElementById('sintomas').value.trim();

    if (!nome || !cns || !idade || !fc || !fr || !saturacao || !glicemia || !pressao || !temperatura) {
        alert('Preencha todos os campos obrigatórios antes de enviar.');
        return;
    }

    const resultado = gerarClassificacaoRisco(idade, Number(fc), Number(fr), Number(saturacao), pressao, Number(temperatura), Number(glicemia));
    const classificacao = resultado.classificacao;
    const justificativa = resultado.justificativa;

    adicionarPaciente(nome, cns, idade, Number(fc), Number(fr), Number(saturacao), Number(glicemia), pressao, Number(temperatura), classificacao, sintomas, justificativa);
    form.reset();
});

setInterval(() => {
    if (filaPacientes.length > 0) {
        atualizarTabela();
    }
}, 1000);

atualizarTabela();
atualizarContadores();