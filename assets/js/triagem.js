/**
 * TriageUBS - Módulo de Classificação de Risco (Protocolo de Manchester)
 * Este arquivo cuida das regras de negócio e triagem clínica.
 */

// Objeto com os principais "gatilhos" de sintomas para automação da triagem
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

/**
 * Analisa o texto de queixas do paciente e sugere uma classificação
 * @param {string} relatoSintomas - O texto digitado pelo enfermeiro
 * @returns {string} 'vermelho', 'laranja', 'verde' ou 'nao_identificado'
 */
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

    if (anos < 1) {
        return sist >= 70 && sist <= 100 && diast >= 40 && diast <= 60 ? 'normal' : 'anormal';
    }
    if (anos >= 1 && anos <= 3) {
        return sist >= 90 && sist <= 105 && diast >= 55 && diast <= 70 ? 'normal' : 'anormal';
    }
    if (anos >= 4 && anos < 6) {
        return sist >= 90 && sist <= 110 && diast >= 55 && diast <= 70 ? 'normal' : 'anormal';
    }
    if (anos >= 6 && anos < 12) {
        return sist >= 95 && sist <= 108 && diast >= 60 && diast <= 70 ? 'normal' : 'anormal';
    }
    if (anos >= 12) {
        return sist >= 90 && sist <= 129 && diast >= 60 && diast <= 84 ? 'normal' : 'anormal';
    }

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
    const resultados = {
        idade: faixa ? faixa.nome : 'desconhecida',
        fc: 'normal',
        fr: 'normal',
        saturacao: 'normal',
        pressao: 'normal',
        temperatura: 'normal',
        glicemia: 'normal'
    };

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

    if (avaliacoes.glicemia === 'hipoglicemia') {
        pontos += 5;
        motivos.push('glicemia severamente baixa (< 70 mg/dL)');
    } else if (avaliacoes.glicemia === 'hiperglicemia-severa') {
        pontos += 5;
        motivos.push('glicemia muito alta (> 300 mg/dL)');
    } else if (avaliacoes.glicemia === 'hiperglicemia') {
        pontos += 3;
        motivos.push('glicemia alta (≥ 126 mg/dL)');
    } else if (avaliacoes.glicemia === 'prediabetes') {
        pontos += 1;
        motivos.push('glicemia em faixa de risco (100-125 mg/dL)');
    }

    if (avaliacoes.saturacao === 'critica') {
        pontos += 5;
        motivos.push('SpO₂ crítica (< 92%)');
    } else if (avaliacoes.saturacao === 'baixa') {
        pontos += 2;
        motivos.push('SpO₂ reduzida (92-94%)');
    }

    if (avaliacoes.pressao === 'anormal') {
        pontos += 2;
        motivos.push('pressão arterial fora da faixa esperada para a idade');
    }
    if (avaliacoes.fc === 'anormal') {
        pontos += 1;
        motivos.push('frequência cardíaca fora da faixa esperada para a idade');
    }
    if (avaliacoes.fr === 'anormal') {
        pontos += 1;
        motivos.push('frequência respiratória fora da faixa esperada para a idade');
    }

    if (avaliacoes.temperatura === 'critica') {
        pontos += 3;
        motivos.push('temperatura crítica (≥ 39°C)');
    } else if (avaliacoes.temperatura === 'febre') {
        pontos += 1;
        motivos.push('febre (≥ 37.8°C)');
    } else if (avaliacoes.temperatura === 'abaixo') {
        pontos += 1;
        motivos.push('temperatura baixa (< 35.9°C)');
    }

    let classificacao = 'azul';
    if (pontos >= 5) classificacao = 'vermelho';
    else if (pontos >= 3) classificacao = 'laranja';
    else if (pontos >= 1) classificacao = 'verde';

    const justificativa = gerarJustificativa(idade, avaliacoes, motivos, classificacao);
    return { classificacao, justificativa, avaliacoes };
}

function gerarJustificativa(idade, avaliacoes, motivos, classificacao) {
    if (motivos.length === 0) {
        return `Sem sinais de instabilidade. Todos os parâmetros estão dentro dos valores esperados para ${obterFaixaEtaria(idade)?.nome || 'a idade informada'}.`; 
    }

    const fraseMotivos = motivos.join(', ').replace(/, ([^,]*)$/, ' e $1');
    const pesoGlicemia = (avaliacoes.glicemia === 'hipoglicemia' || avaliacoes.glicemia === 'hiperglicemia-severa')
        ? 'A glicemia teve peso maior no score por estar em nível crítico.'
        : '';

    return `Classificação ${classificacao.toUpperCase()} porque ${fraseMotivos}. ${pesoGlicemia}`.trim();
}

function sugerirClassificacaoPelosSinais(idade, fc, fr, saturacao, pressao, temperatura, glicemia) {
    const resultado = gerarClassificacaoRisco(idade, fc, fr, saturacao, pressao, temperatura, glicemia);
    return resultado;
}

function nivelMaior(a, b) {
    const ordem = { normal: 0, azul: 1, verde: 2, laranja: 3, vermelho: 4 };
    return ordem[a] >= ordem[b] ? a : b;
}

function limparAvisoVisual(selectClassificacao) {
    if (!selectClassificacao) return;
    selectClassificacao.classList.remove('alert-vermelho', 'alert-laranja', 'alert-verde');
    selectClassificacao.style.borderColor = '';
    selectClassificacao.style.backgroundColor = '';
    selectClassificacao.style.color = '';
}

function aplicarAvisoVisual(selectClassificacao, nivel) {
    limparAvisoVisual(selectClassificacao);
    if (nivel && nivel !== 'normal') {
        selectClassificacao.classList.add(`alert-${nivel}`);
        selectClassificacao.style.borderColor = nivel === 'vermelho' ? '#991b1b' : nivel === 'laranja' ? '#9a3412' : '#166534';
        if (nivel === 'vermelho') {
            selectClassificacao.style.backgroundColor = 'rgba(239, 68, 68, 0.18)';
            selectClassificacao.style.color = '#991b1b';
        } else if (nivel === 'laranja') {
            selectClassificacao.style.backgroundColor = 'rgba(249, 115, 22, 0.18)';
            selectClassificacao.style.color = '#9a3412';
        } else if (nivel === 'verde') {
            selectClassificacao.style.backgroundColor = 'rgba(34, 197, 94, 0.18)';
            selectClassificacao.style.color = '#14532d';
        }
    }
}

function avaliarAlarmesVitais(idade, fc, fr, saturacao, pressao, temperatura, glicemia) {
    const avisos = [];
    let nivel = 'normal';
    const faixa = obterFaixaEtaria(idade);

    const sat = Number(saturacao);
    if (!isNaN(sat) && saturacao !== 0) {
        if (sat < 90) {
            avisos.push('SpO₂ crítica (< 90%)');
            nivel = 'vermelho';
        } else if (sat <= 94) {
            avisos.push('SpO₂ reduzida (90-94%)');
            nivel = nivelMaior(nivel, 'laranja');
        }
    }

    const temp = Number(temperatura);
    if (!isNaN(temp) && temperatura !== 0) {
        if (temp >= 39) {
            avisos.push('temperatura crítica (≥ 39°C)');
            nivel = 'vermelho';
        } else if (temp >= 37.8) {
            avisos.push('febre (37.8-38.9°C)');
            nivel = nivelMaior(nivel, 'laranja');
        } else if (temp < 35.9) {
            avisos.push('temperatura baixa (< 35.9°C)');
            nivel = nivelMaior(nivel, 'laranja');
        }
    }

    const glic = Number(glicemia);
    if (!isNaN(glic) && glicemia !== 0) {
        if (glic < 70) {
            avisos.push('hipoglicemia (< 70 mg/dL)');
            nivel = 'vermelho';
        } else if (glic > 300) {
            avisos.push('hiperglicemia severa (> 300 mg/dL)');
            nivel = 'vermelho';
        } else if (glic >= 126) {
            avisos.push('hiperglicemia (≥ 126 mg/dL)');
            nivel = nivelMaior(nivel, 'laranja');
        }
    }

    if (faixa) {
        const fcNum = Number(fc);
        if (!isNaN(fcNum) && fcNum !== 0 && (fcNum < faixa.fc[0] || fcNum > faixa.fc[1])) {
            avisos.push('FC fora da faixa etária');
            nivel = nivelMaior(nivel, 'laranja');
        }

        const frNum = Number(fr);
        if (!isNaN(frNum) && frNum !== 0 && (frNum < faixa.fr[0] || frNum > faixa.fr[1])) {
            avisos.push('FR fora da faixa etária');
            nivel = nivelMaior(nivel, 'laranja');
        }
    }

    if (pressao && pressao.trim() !== '') {
        const pressaoStatus = classificarPressaoPorIdade(idade, pressao);
        if (pressaoStatus === 'anormal') {
            avisos.push('pressão arterial fora da faixa etária');
            nivel = nivelMaior(nivel, 'laranja');
        }
    }

    return { nivel, avisos };
}

function atualizarSugestaoPorSinais() {
    const idade = document.getElementById('idade').value.trim();
    const fcVal = document.getElementById('fc').value.trim();
    const frVal = document.getElementById('fr').value.trim();
    const satVal = document.getElementById('saturacao').value.trim();
    const pressao = document.getElementById('pressao').value.trim();
    const tempVal = document.getElementById('temperatura').value.trim();
    const glicVal = document.getElementById('glicemia').value.trim();
    
    const selectClassificacao = document.getElementById('classificacao');
    const aviso = document.getElementById('avaliacao-vitais');

    if (!selectClassificacao) return;

    const fc = Number(fcVal);
    const fr = Number(frVal);
    const saturacao = Number(satVal);
    const temperatura = Number(tempVal);
    const glicemia = Number(glicVal);

    const alerta = avaliarAlarmesVitais(idade, fc, fr, saturacao, pressao, temperatura, glicemia);
    aplicarAvisoVisual(selectClassificacao, alerta.nivel);

    if (alerta.nivel !== 'normal') {
        selectClassificacao.value = alerta.nivel;
        if (aviso) aviso.textContent = `Alerta: ${alerta.avisos.join(', ')}.`;
    }

    if (!idade || !fcVal || !frVal || !satVal || !pressao || !tempVal || !glicVal) {
        if (aviso && alerta.nivel === 'normal') {
            aviso.textContent = 'O sistema usa idade e sinais vitais para uma classificação mais precisa.';
        }
        return;
    }

    const resultado = sugerirClassificacaoPelosSinais(idade, fc, fr, saturacao, pressao, temperatura, glicemia);
    const classificacaoFinal = alerta.nivel !== 'normal' ? nivelMaior(resultado.classificacao, alerta.nivel) : resultado.classificacao;
    selectClassificacao.value = classificacaoFinal;
    
    if (aviso) {
        aviso.textContent = alerta.nivel !== 'normal'
            ? `Alerta: ${alerta.avisos.join(', ')}. ${resultado.justificativa}`
            : resultado.justificativa;
    }

    selectClassificacao.style.borderColor = 'var(--accent-color)';
    setTimeout(() => {
        selectClassificacao.style.borderColor = '#cbd5e1';
    }, 1000);
}

function onCampoVitalAlterado() {
    atualizarSugestaoPorSinais();
}

['idade', 'fc', 'fr', 'saturacao', 'pressao', 'temperatura', 'glicemia'].forEach(id => {
    const elemento = document.getElementById(id);
    if (element) elemento.addEventListener('input', onCampoVitalAlterado);
});

// Vincula um evento para escutar o que o enfermeiro digita no campo de sintomas
const inputSintomas = document.getElementById('sintomas');
if (inputSintomas) {
    inputSintomas.addEventListener('input', function(e) {
        const relato = e.target.value;
        const sugestao = sugerirClassificacao(relato);
        const selectClassificacao = document.getElementById('classificacao');
        const aviso = document.getElementById('avaliacao-vitais');

        if (sugestao !== 'nao_identificado' && selectClassificacao) {
            selectClassificacao.value = sugestao;
            if (aviso) aviso.textContent = `Classificação por relato de sintomas: ${sugestao.toUpperCase()}.`;
            selectClassificacao.style.borderColor = 'var(--accent-color)';
            setTimeout(() => {
                selectClassificacao.style.borderColor = '#cbd5e1';
            }, 1000);
        }
    });
}