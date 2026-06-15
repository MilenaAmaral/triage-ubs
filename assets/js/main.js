// Selecionando os elementos do HTML que vamos manipular
const form = document.getElementById('form-triagem');
const tabelaPacientes = document.getElementById('tabela-pacientes');

// Selecionando os números dos cards para atualização dinâmica
const cardTotal = document.querySelector('.card-kpi.total .number');
const cardVermelho = document.querySelector('.card-kpi.vermelho .number');
const cardAmarelo = document.querySelector('.card-kpi.amarelo .number');
const cardVerde = document.querySelector('.card-kpi.verde .number');

// Função para recalcular os contadores dos cards com base nas linhas da tabela
function atualizarContadores() {
    const linhas = tabelaPacientes.querySelectorAll('tr');
    
    let total = 0;
    let vermelho = 0;
    let amarelo = 0;
    let verde = 0;

    linhas.forEach(linha => {
        // Ignora caso a tabela esteja exibindo a mensagem de "Nenhum paciente"
        if (linha.querySelector('.badge')) {
            total++;
            const badge = linha.querySelector('.badge');
            
            if (badge.classList.contains('vermelho')) vermelho++;
            if (badge.classList.contains('amarelo')) amarelo++;
            if (badge.classList.contains('verde')) verde++;
        }
    });

    // Atualiza os textos na tela
    cardTotal.textContent = total;
    cardVermelho.textContent = vermelho;
    cardAmarelo.textContent = amarelo;
    cardVerde.textContent = verde;
}

// Ouvindo o evento de envio (submit) do formulário
form.addEventListener('submit', function(evento) {
    evento.preventDefault(); // Impede a página de recarregar

    // Pegando os valores digitados pelo usuário
    const nome = document.getElementById('nome').value;
    const cns = document.getElementById('cns').value;
    const classificacao = document.getElementById('classificacao').value;

    // Criando uma nova linha (tr) para a tabela
    const novaLinha = document.createElement('tr');

    // Definindo o texto interno da classificação com base na escolha
    let badgeTexto = '';
    if (classificacao === 'vermelho') badgeTexto = 'EMERGÊNCIA';
    if (classificacao === 'amarelo') badgeTexto = 'URGENTE';
    if (classificacao === 'verde') badgeTexto = 'POUCO URGENTE';

    // Montando as colunas (td) dentro da linha
    novaLinha.innerHTML = `
        <td>${nome}</td>
        <td>${cns}</td>
        <td><span class="badge ${classificacao}">${badgeTexto}</span></td>
    `;

    // Adiciona a nova linha no topo da tabela (para dar destaque ao último que chegou)
    tabelaPacientes.insertBefore(novaLinha, tabelaPacientes.firstChild);

    // Limpa os campos do formulário para o próximo registro
    form.reset();

    // Atualiza os painéis numéricos automaticamente
    atualizarContadores();
});

// Executa uma vez ao carregar a página para alinhar os números estáticos do HTML
atualizarContadores();