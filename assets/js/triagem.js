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
 * @returns {string} 'vermelho', 'amarelo', 'verde' ou 'nao_identificado'
 */
function sugerirClassificacao(relatoSintomas) {
    const textoNorm = relatoSintomas.toLowerCase();

    if (textoNorm.trim() === '') return 'nao_identificado';

    // 1. Verifica critérios de Emergência (Vermelho)
    for (const sintoma of SintomasProtocolo.emergencia) {
        if (textoNorm.includes(sintoma)) return 'vermelho';
    }

    // 2. Verifica critérios de Urgência (Amarelo)
    for (const sintoma of SintomasProtocolo.urgente) {
        if (textoNorm.includes(sintoma)) return 'amarelo';
    }

    // 3. Verifica critérios de Pouco Urgente (Verde)
    for (const sintoma of SintomasProtocolo.poucoUrgente) {
        if (textoNorm.includes(sintoma)) return 'verde';
    }

    // Se não bateu com nenhuma palavra-chave, deixa o enfermeiro decidir
    return 'nao_identificado';
}

// Vincula um evento para escutar o que o enfermeiro digita no campo de sintomas
document.getElementById('sintomas').addEventListener('input', function(e) {
    const relato = e.target.value;
    const sugestao = sugerirClassificacao(relato);
    const selectClassificacao = document.getElementById('classificacao');

    // Se o sistema identificar um sintoma chave, ele altera o Select automaticamente!
    if (sugestao !== 'nao_identificado') {
        selectClassificacao.value = sugestao;
        
        // Pequeno efeito visual para mostrar que o sistema ajudou a escolher
        selectClassificacao.style.borderColor = 'var(--accent-color)';
        setTimeout(() => {
            selectClassificacao.style.borderColor = '#cbd5e1';
        }, 1000);
    }
});