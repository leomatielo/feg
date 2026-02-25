# Piloto de Cronograma de Aulas - Fundação Educacional Guaçuana

Aplicação web simples (HTML/CSS/JS puro) para o piloto do período da manhã.

## Funcionalidades

- 28 turmas pré-cadastradas: `6A..6D`, `7A..7D`, `8A..8D`, `9A..9D`, `1EMA..1EMD`, `2EMA..2EMD`, `3EMA..3EMD`.
- Grade com 7 aulas por dia (segunda a sexta).
- Cadastro de professores com:
  - nome;
  - disciplina;
  - quantidade de aulas por turma;
  - bloqueio de dias/slots indisponíveis.
- Geração automática de combinação de horários por turma (heurística gulosa).
- Ajuste manual por **arrastar e soltar**:
  - da lista de aulas pendentes para a grade;
  - entre slots;
  - da grade de volta para o pool do professor.
- Alertas de conflito:
  - slot já ocupado na turma;
  - professor bloqueado naquele dia/slot;
  - professor já alocado em outra turma no mesmo horário.
- Indicador de carga atribuída por professor na turma atual (`atribuídas/requeridas`).

## Como executar

Basta abrir `index.html` no navegador, ou usar um servidor local:

```bash
python3 -m http.server 4173
```

Depois acesse `http://localhost:4173`.

## Observações do piloto

- A geração automática cria uma sugestão inicial e pode ser parcial quando há muitas restrições.
- O remanejamento manual é esperado para finalizar a grade.
