/**
 * TriageUBS - Módulo de Classificação de Risco (Protocolo de Manchester)
 * Este arquivo cuida das regras de negócio e triagem clínica.
 */

const SintomasProtocolo = {
    emergencia: [
        'parada', 'inconsciente', 'convulsão', 'dor no peito forte', 
        'falta de ar grave', 'hemorragia abundante', 'asfixia'
    ],
    urgente: [
        'febre alta', 'dor moderada', 'pressão alta', 'vômito constante', 
        'fratura', 'diabetes descompensada', 'confusão mental leve'
    ],
    poucoUrgente: [
        'dor leve', 'sintomas de gripe', 'tosse', 'enjoo', 
        'dor de garganta', 'renovação de receita', 'abrasão leve'
    ]
};

function sugerirClassificacao(relatoSintomas) {
    const textoNorm = relatoSintomas.toLowerCase();
    if (textoNorm.trim() === '') return 'nao_identificado';

    for (const sintoma of SintomasProtocolo.emergencia) {
        if (textoNorm.includes(sintoma)) return 'vermelho';
    }
    for (const sintoma of SintomasProtocolo.urgente) {
        if (textoNorm.includes(sintoma)) return 'laranja';
    }
    for (const sintoma of SintomasProtocolo.poucoUrgente) {
        if (textoNorm.includes(sintoma)) return 'verde';
    }
    return 'nao_identificado';
}

function classificarPressaoPorIdade(idade, pressao) {
    const partes = pressao.split('/').map(Number);
    if (partes.length !== 2 || partes.some(isNaN)) return 'desconhecida';
    const [sist, diast] = partes;
    const anos = Number(idade);

    if (anos < 1) return sist >= 70 && sist <= 100 && diast >= 40 && diast <= 60 ? 'normal' : 'anormal';
    if (anos >= 1 && anos <= 3) return sist >= 90 && sist <= 105 && diast >= 55 && diast <= 70 ? 'normal' : 'anormal';
    if (anos >= 4 && anos < 6) return sist >= 90 && sist <= 110 && diast >= 55 && diast <= 70 ? 'normal' : 'anormal';
    if (anos >= 6 && anos < 12) return sist >= 95 && sist <= 108 && diast >= 60 && diast <= 70 ? 'normal' : 'anormal';
    if (anos >= 12) return sist >= 90 && sist <= 129 && diast >= 60 && diast <= 84 ? 'normal' : 'anormal';
    return 'desconhecida';
}

function obterFaixaEtaria(idade) {
    const anos = Number(idade);
    if (Number.isNaN(anos)) return null;
    if (anos < 1) return { nome: 'recem-nascido/bebe', fc: [100, 160], fr: [30, 60] };
    if (anos < 2) return { nome: 'bebe', fc: [90, 140], fr: [30, 53] };
    if (anos < 10) return { nome: 'crianca', fc: [70, 120], fr: [20, 35] };
    return { nome: 'adulto', fc: [60, 100], fr: [12, 20] };
}

function avaliarSinaisVitais(idade, fc, fr, saturacao, pressao, temperatura, glicemia) {
    const faixa = obterFaixaEtaria(idade);
    const resultados = { idade: faixa ? faixa.nome : 'desconhecida', fc: 'normal', fr: 'normal', saturacao: 'normal', pressao: 'normal', temperatura: 'normal', glicemia: 'normal' };

    if (!faixa) return resultados;

    if (fc < faixa.fc[0] || fc > faixa.fc[1]) resultados.fc = 'anormal';
    if (fr < faixa.fr[0] || fr > faixa.fr[1]) resultados.fr = 'anormal';
    if (saturacao < 92) resultados.saturacao = 'critica';
    else if (saturacao < 95) resultados.saturacao = 'baixa';

    const pressaoStatus = classificarPressaoPorIdade(idade, pressao);
    if (pressaoStatus === 'anormal') resultados.pressao = 'anormal';
    if (pressaoStatus === 'desconhecida') resultados.pressao = 'desconhecida';

    if (temperatura >= 39) resultados.temperatura = 'critica';
    else if (temperatura >= 37.8) resultados.temperatura = 'febre';
    else if (temperatura < 35.9) resultados.temperatura = 'abaixo';

    if (glicemia < 70) resultados.glicemia = 'hipoglicemia';
    else if (glicemia > 300) resultados.glicemia = 'hiperglicemia-severa';
    else if (glicemia >= 126) resultados.glicemia = 'hiperglicemia';
    else if (glicemia >= 100) resultados.glicemia = 'prediabetes';

    return resultados;
}

function gerarClassificacaoRisco(idade, fc, fr, saturacao, pressao, temperatura, glicemia) {
    const avaliacoes = avaliarSinaisVitais(idade, fc, fr, saturacao, pressao, temperatura, glicemia);
    let pontos = 0;
    const motivos = [];

    if (avaliacoes.glicemia === 'hipoglicemia' || avaliacoes.glicemia === 'hiperglicemia-severa') pontos += 5;
    else if (avaliacoes.glicemia === 'hiperglicemia') pontos += 3;
    else if (avaliacoes.glicemia === 'prediabetes') pontos += 1;

    if (avaliacoes.saturacao === 'critica') pontos += 5;
    else if (avaliacoes.saturacao === 'baixa') pontos += 2;

    if (avaliacoes.pressao === 'anormal') pontos += 2;
    if (avaliacoes.fc === 'anormal') pontos += 1;
    if (avaliacoes.fr === 'anormal') pontos += 1;

    if (avaliacoes.temperatura === 'critica') pontos += 3;
    else if (avaliacoes.temperatura === 'febre' || avaliacoes.temperatura === 'abaixo') pontos += 1;

    let classificacao = 'azul';
    if (pontos >= 5) classificacao = 'vermelho';
    else if (pontos >= 3) classificacao = 'laranja';
    else if (pontos >= 1) classificacao = 'verde';

    return { classificacao, justificativa: gerarJustificativa(idade, avaliacoes, motivos, classificacao), avaliacoes };
}

function gerarJustificativa(idade, avaliacoes, motivos, classificacao) {
    if (motivos.length === 0) return `Sem sinais de instabilidade. Parâmetros dentro dos valores esperados.`; 
    return `Classificação ${classificacao.toUpperCase()} devido a instabilidades nos sinais vitais.`;
}

function sugerirClassificacaoPelosSinais(idade, fc, fr, saturacao, pressao, temperatura, glicemia) {
    return gerarClassificacaoRisco(idade, fc, fr, saturacao, pressao, temperatura, glicemia);
}

function nivelMaior(a, b) {
    const ordem = { normal: 0, azul: 1, verde: 2, laranja: 3, vermelho: 4 };
    return ordem[a] >= ordem[b] ? a : b;
}

function limparAvisoVisual(selectClassificacao) {
    if (!selectClassificacao) return;
    selectClassificacao.className = '';
    selectClassificacao.style.borderColor = '';
    selectClassificacao.style.backgroundColor = '';
    selectClassificacao.style.color = '';
}

function aplicarAvisoVisual(selectClassificacao, nivel) {
    limparAvisoVisual(selectClassificacao);
    if (nivel && nivel !== 'normal') {
        selectClassificacao.classList.add(`alert-${nivel}`);
        selectClassificacao.style.borderColor = nivel === 'vermelho' ? '#991b1b' : nivel === 'laranja' ? '#9a3412' : '#166534';
        selectClassificacao.style.backgroundColor = nivel === 'vermelho' ? 'rgba(239, 68, 68, 0.18)' : nivel === 'laranja' ? 'rgba(249, 115, 22, 0.18)' : 'rgba(34, 197, 94, 0.18)';
        selectClassificacao.style.color = nivel === 'vermelho' ? '#991b1b' : nivel === 'laranja' ? '#9a3412' : '#14532d';
    }
}

function avaliarAlarmesVitais(idade, fc, fr, saturacao, pressao, temperatura, glicemia) {
    const avisos = [];
    let nivel = 'normal';
    const faixa = obterFaixaEtaria(idade);

    if (saturacao < 90) { avisos.push('SpO₂ crítica'); nivel = 'vermelho'; } 
    else if (saturacao <= 94) { avisos.push('SpO₂ reduzida'); nivel = nivelMaior(nivel, 'laranja'); }

    if (temperatura >= 39) { avisos.push('Temp crítica'); nivel = 'vermelho'; }
    else if (temperatura >= 37.8 || temperatura < 35.9) { avisos.push('Temp fora de faixa'); nivel = nivelMaior(nivel, 'laranja'); }

    if (glicemia < 70 || glicemia > 300) { avisos.push('Glicemia crítica'); nivel = 'vermelho'; }
    else if (glicemia >= 126) { avisos.push('Hiperglicemia'); nivel = nivelMaior(nivel, 'laranja'); }

    if (faixa) {
        if ((fc < faixa.fc[0] || fc > faixa.fc[1]) || (fr < faixa.fr[0] || fr > faixa.fr[1])) {
            avisos.push('FC/FR fora da faixa'); nivel = nivelMaior(nivel, 'laranja');
        }
    }
    return { nivel, avisos };
}

function atualizarSugestaoPorSinais() {
    const idade = document.getElementById('idade').value.trim();
    const fc = Number(document.getElementById('fc').value);
    const fr = Number(document.getElementById('fr').value);
    const saturacao = Number(document.getElementById('saturacao').value);
    const pressao = document.getElementById('pressao').value.trim();
    const temperatura = Number(document.getElementById('temperatura').value);
    const glicemia = Number(document.getElementById('glicemia').value);
    const selectClassificacao = document.getElementById('classificacao');
    const aviso = document.getElementById('avaliacao-vitais');

    if (!selectClassificacao) return;

    const alerta = avaliarAlarmesVitais(idade, fc, fr, saturacao, pressao, temperatura, glicemia);
    aplicarAvisoVisual(selectClassificacao, alerta.nivel);

    if (idade && fc && fr && saturacao && pressao && temperatura && glicemia) {
        const resultado = sugerirClassificacaoPelosSinais(idade, fc, fr, saturacao, pressao, temperatura, glicemia);
        const classificacaoFinal = alerta.nivel !== 'normal' ? nivelMaior(resultado.classificacao, alerta.nivel) : resultado.classificacao;
        selectClassificacao.value = classificacaoFinal;
        if (aviso) aviso.textContent = resultado.justificativa;
    }
}

function onCampoVitalAlterado() {
    atualizarSugestaoPorSinais();
}

['idade', 'fc', 'fr', 'saturacao', 'pressao', 'temperatura', 'glicemia'].forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) elemento.addEventListener('input', onCampoVitalAlterado);
});

const inputSintomas = document.getElementById('sintomas');
if (inputSintomas) {
    inputSintomas.addEventListener('input', function(e) {
        const sugestao = sugerirClassificacao(e.target.value);
        const selectClassificacao = document.getElementById('classificacao');
        if (sugestao !== 'nao_identificado' && selectClassificacao) {
            selectClassificacao.value = sugestao;
        }
    });
}