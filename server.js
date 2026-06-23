const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const filaFile = path.join(dataDir, 'triagem.json');
const historicoFile = path.join(dataDir, 'historico.json');

const prioridadeOrdem = {
  vermelho: 1,
  laranja: 2,
  verde: 3,
  azul: 4
};

function ensureDataFiles() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(filaFile)) {
    fs.writeFileSync(filaFile, '[]', 'utf8');
  }

  if (!fs.existsSync(historicoFile)) {
    fs.writeFileSync(historicoFile, '[]', 'utf8');
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8') || '[]');
  } catch (error) {
    return [];
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function sortQueue(queue) {
  return queue.sort((a, b) => {
    const ordemA = prioridadeOrdem[a.prioridade] || 99;
    const ordemB = prioridadeOrdem[b.prioridade] || 99;
    if (ordemA !== ordemB) {
      return ordemA - ordemB;
    }
    return a.entradaFila - b.entradaFila;
  });
}

function generateId() {
  return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/triagem', (req, res) => {
  const {
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
    prioridade,
    sintomas,
    historicoMedico,
    justificativa
  } = req.body;

  if (!nome || !cns || !dataNascimento || !idade || !nomeMae || !sexoBiologico || !peso || !fc || !fr || !saturacao || !glicemia || !pressao || !temperatura || !prioridade) {
    return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
  }

  const fila = readJson(filaFile);
  const paciente = {
    id: generateId(),
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
    prioridade,
    sintomas,
    historicoMedico: Array.isArray(historicoMedico) ? historicoMedico : [],
    justificativa,
    status: 'Aguardando',
    entradaFila: Date.now()
  };

  fila.push(paciente);
  writeJson(filaFile, fila);
  res.status(201).json(paciente);
});

app.get('/api/fila', (req, res) => {
  const fila = readJson(filaFile).filter(paciente => paciente.status === 'Aguardando');
  res.json(sortQueue(fila));
});

app.put('/api/triagem/:id/atender', (req, res) => {
  const fila = readJson(filaFile);
  const historico = readJson(historicoFile);
  const pacienteIndex = fila.findIndex(paciente => paciente.id === req.params.id && paciente.status === 'Aguardando');

  if (pacienteIndex === -1) {
    return res.status(404).json({ error: 'Paciente não encontrado ou já está sendo atendido.' });
  }

  const paciente = fila[pacienteIndex];
  paciente.status = 'Em Atendimento';
  paciente.atendimentoHora = Date.now();
  historico.unshift(paciente);
  fila.splice(pacienteIndex, 1);

  writeJson(filaFile, fila);
  writeJson(historicoFile, historico);

  res.json({ ok: true, paciente });
});

app.get('/api/historico', (req, res) => {
  const historico = readJson(historicoFile);
  res.json(historico);
});

ensureDataFiles();

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
