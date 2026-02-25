const DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const SLOTS = Array.from({ length: 7 }, (_, i) => `Aula ${i + 1}`);
const LEVELS = ['6', '7', '8', '9', '1EM', '2EM', '3EM'];
const SECTIONS = ['A', 'B', 'C', 'D'];
const CLASSES = LEVELS.flatMap((level) => SECTIONS.map((section) => `${level}${section}`));

const teachers = [];
const scheduleByClass = {};
CLASSES.forEach((classId) => {
  scheduleByClass[classId] = createEmptyClassSchedule();
});

let currentClass = CLASSES[0];
let draggedPayload = null;

const classSelect = document.getElementById('class-select');
const tableHeadRow = document.querySelector('#schedule-table thead tr');
const tableBody = document.querySelector('#schedule-table tbody');
const blockGrid = document.getElementById('block-grid');
const teacherForm = document.getElementById('teacher-form');
const teacherList = document.getElementById('teacher-list');
const alerts = document.getElementById('alerts');
const poolCards = document.getElementById('pool-cards');
const teacherPool = document.getElementById('teacher-pool');
const generateBtn = document.getElementById('generate-btn');
const clearBtn = document.getElementById('clear-btn');

bootstrap();

function bootstrap() {
  buildClassOptions();
  buildBlockGrid();
  buildTableSkeleton();
  bindEvents();
  render();
}

function createEmptyClassSchedule() {
  return DAYS.map(() => Array.from({ length: SLOTS.length }, () => null));
}

function parseLoads(rawText) {
  const loads = {};
  rawText
    .split(';')
    .map((piece) => piece.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [classId, qtyText] = entry.split('=').map((part) => part.trim());
      const qty = Number(qtyText);
      if (CLASSES.includes(classId) && Number.isInteger(qty) && qty > 0) {
        loads[classId] = qty;
      }
    });

  return loads;
}

function buildClassOptions() {
  classSelect.innerHTML = CLASSES.map((classId) => `<option value="${classId}">${classId}</option>`).join('');
}

function buildBlockGrid() {
  const controls = [];
  DAYS.forEach((day, dayIndex) => {
    SLOTS.forEach((slot, slotIndex) => {
      const key = `${dayIndex}-${slotIndex}`;
      controls.push(`
        <label>
          <input type="checkbox" value="${key}" />
          ${day} ${slotIndex + 1}
        </label>
      `);
    });
  });
  blockGrid.innerHTML = controls.join('');
}

function buildTableSkeleton() {
  const dayHeaders = DAYS.map((day) => `<th>${day}</th>`).join('');
  tableHeadRow.innerHTML = `<th>Slot</th>${dayHeaders}`;

  tableBody.innerHTML = SLOTS.map((slot, slotIndex) => {
    const rowCells = DAYS.map((_, dayIndex) => {
      return `<td class="drop-zone" data-day="${dayIndex}" data-slot="${slotIndex}"></td>`;
    }).join('');
    return `<tr><th>${slot}</th>${rowCells}</tr>`;
  }).join('');
}

function bindEvents() {
  classSelect.addEventListener('change', () => {
    currentClass = classSelect.value;
    render();
  });

  teacherForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const name = document.getElementById('teacher-name').value.trim();
    const subject = document.getElementById('teacher-subject').value.trim();
    const loads = parseLoads(document.getElementById('teacher-loads').value.trim());
    const blocked = Array.from(blockGrid.querySelectorAll('input:checked')).map((cb) => cb.value);

    if (!name || !subject || Object.keys(loads).length === 0) {
      pushAlert('Preencha nome, disciplina e pelo menos uma turma com quantidade de aulas válida.', 'error');
      return;
    }

    teachers.push({
      id: crypto.randomUUID(),
      name,
      subject,
      loads,
      blocked,
    });

    teacherForm.reset();
    pushAlert(`Professor(a) ${name} cadastrado(a) com sucesso.`, 'success');
    render();
  });

  generateBtn.addEventListener('click', () => {
    autoGenerate();
  });

  clearBtn.addEventListener('click', () => {
    scheduleByClass[currentClass] = createEmptyClassSchedule();
    pushAlert(`Grade da turma ${currentClass} foi limpa.`, 'success');
    render();
  });

  tableBody.addEventListener('dragstart', onCardDragStart);
  tableBody.addEventListener('dragover', onDragOver);
  tableBody.addEventListener('drop', onDropOnSlot);
  tableBody.addEventListener('dragenter', onDragEnter);
  tableBody.addEventListener('dragleave', onDragLeave);

  teacherPool.addEventListener('dragover', onDragOver);
  teacherPool.addEventListener('drop', onDropOnPool);
  teacherPool.addEventListener('dragenter', () => teacherPool.classList.add('drag-over'));
  teacherPool.addEventListener('dragleave', () => teacherPool.classList.remove('drag-over'));

  poolCards.addEventListener('dragstart', onCardDragStart);
}

function pushAlert(message, type) {
  alerts.textContent = message;
  alerts.className = `alerts ${type}`;
}

function render() {
  classSelect.value = currentClass;
  renderTeacherList();
  renderTable();
  renderPool();
}

function renderTeacherList() {
  if (!teachers.length) {
    teacherList.innerHTML = '<li>Nenhum professor cadastrado.</li>';
    return;
  }

  teacherList.innerHTML = teachers
    .map((teacher) => {
      const loadsText = Object.entries(teacher.loads)
        .map(([classId, qty]) => `${classId}: ${qty}`)
        .join(', ');
      return `<li><strong>${teacher.name}</strong> (${teacher.subject})<br />${loadsText}</li>`;
    })
    .join('');
}

function renderTable() {
  const schedule = scheduleByClass[currentClass];

  tableBody.querySelectorAll('td.drop-zone').forEach((cell) => {
    const day = Number(cell.dataset.day);
    const slot = Number(cell.dataset.slot);
    const lesson = schedule[day][slot];
    cell.innerHTML = '';
    if (lesson) {
      cell.appendChild(createCard(lesson.teacherId, currentClass));
    }
  });
}

function createCard(teacherId, classId) {
  const template = document.getElementById('lesson-card-template');
  const card = template.content.firstElementChild.cloneNode(true);
  const teacher = teachers.find((item) => item.id === teacherId);
  if (!teacher) {
    return document.createElement('div');
  }

  const assignedCount = countTeacherAssignedForClass(teacherId, classId);
  const requiredCount = teacher.loads[classId] || 0;
  const overAllocated = assignedCount > requiredCount;

  card.textContent = `${teacher.name} (${teacher.subject}) ${assignedCount}/${requiredCount}`;
  card.dataset.teacherId = teacher.id;
  card.dataset.classId = classId;
  card.dataset.origin = 'schedule';
  card.dataset.overAllocated = String(overAllocated);
  return card;
}

function renderPool() {
  const cards = [];
  teachers.forEach((teacher) => {
    const required = teacher.loads[currentClass] || 0;
    if (!required) return;

    const assigned = countTeacherAssignedForClass(teacher.id, currentClass);
    const remaining = required - assigned;
    for (let i = 0; i < Math.max(remaining, 0); i += 1) {
      const card = createCard(teacher.id, currentClass);
      card.dataset.origin = 'pool';
      cards.push(card.outerHTML);
    }
  });

  poolCards.innerHTML = cards.length ? cards.join('') : '<small>Sem aulas pendentes para esta turma.</small>';
}

function countTeacherAssignedForClass(teacherId, classId) {
  const schedule = scheduleByClass[classId];
  let count = 0;
  schedule.forEach((day) => {
    day.forEach((lesson) => {
      if (lesson?.teacherId === teacherId) count += 1;
    });
  });
  return count;
}

function onCardDragStart(event) {
  const card = event.target.closest('.lesson-card');
  if (!card) return;

  const originCell = card.closest('td.drop-zone');
  draggedPayload = {
    teacherId: card.dataset.teacherId,
    classId: currentClass,
    origin: card.dataset.origin,
    fromDay: originCell ? Number(originCell.dataset.day) : null,
    fromSlot: originCell ? Number(originCell.dataset.slot) : null,
  };

  event.dataTransfer.effectAllowed = 'move';
}

function onDragOver(event) {
  event.preventDefault();
}

function onDragEnter(event) {
  const dropZone = event.target.closest('td.drop-zone');
  if (dropZone) dropZone.classList.add('drag-over');
}

function onDragLeave(event) {
  const dropZone = event.target.closest('td.drop-zone');
  if (dropZone) dropZone.classList.remove('drag-over');
}

function onDropOnSlot(event) {
  event.preventDefault();
  const dropZone = event.target.closest('td.drop-zone');
  tableBody.querySelectorAll('.drag-over').forEach((cell) => cell.classList.remove('drag-over'));
  if (!dropZone || !draggedPayload) return;

  const targetDay = Number(dropZone.dataset.day);
  const targetSlot = Number(dropZone.dataset.slot);
  const schedule = scheduleByClass[currentClass];

  if (schedule[targetDay][targetSlot]) {
    pushAlert('Conflito: já existe uma aula nesta turma para o horário escolhido.', 'error');
    draggedPayload = null;
    return;
  }

  if (isTeacherBlocked(draggedPayload.teacherId, targetDay, targetSlot)) {
    pushAlert('Conflito: professor bloqueado nesse dia/horário.', 'error');
    draggedPayload = null;
    return;
  }

  if (isTeacherBusyInAnotherClass(draggedPayload.teacherId, targetDay, targetSlot, currentClass)) {
    pushAlert('Conflito: professor já está alocado em outra turma nesse horário.', 'error');
    draggedPayload = null;
    return;
  }

  if (draggedPayload.origin === 'schedule' && draggedPayload.fromDay !== null) {
    schedule[draggedPayload.fromDay][draggedPayload.fromSlot] = null;
  }

  schedule[targetDay][targetSlot] = { teacherId: draggedPayload.teacherId };

  const teacher = teachers.find((item) => item.id === draggedPayload.teacherId);
  const assigned = countTeacherAssignedForClass(draggedPayload.teacherId, currentClass);
  const required = teacher?.loads[currentClass] || 0;

  if (assigned > required) {
    pushAlert(
      `Atenção: ${teacher?.name} ficou com ${assigned}/${required} aulas na turma ${currentClass}.`,
      'error',
    );
  } else {
    pushAlert('Alocação realizada com sucesso.', 'success');
  }

  draggedPayload = null;
  render();
}

function onDropOnPool(event) {
  event.preventDefault();
  teacherPool.classList.remove('drag-over');
  if (!draggedPayload) return;

  if (draggedPayload.origin === 'schedule' && draggedPayload.fromDay !== null) {
    scheduleByClass[currentClass][draggedPayload.fromDay][draggedPayload.fromSlot] = null;
    pushAlert('Aula devolvida para o professor (pool) para remanejamento.', 'success');
    render();
  }

  draggedPayload = null;
}

function isTeacherBlocked(teacherId, day, slot) {
  const teacher = teachers.find((item) => item.id === teacherId);
  if (!teacher) return false;
  return teacher.blocked.includes(`${day}-${slot}`);
}

function isTeacherBusyInAnotherClass(teacherId, day, slot, ignoredClassId) {
  return CLASSES.some((classId) => {
    if (classId === ignoredClassId) return false;
    const lesson = scheduleByClass[classId][day][slot];
    return lesson?.teacherId === teacherId;
  });
}

function autoGenerate() {
  if (!teachers.length) {
    pushAlert('Cadastre pelo menos um professor antes de gerar a grade.', 'error');
    return;
  }

  const schedule = createEmptyClassSchedule();
  const lessonsToPlace = [];

  teachers.forEach((teacher) => {
    const qty = teacher.loads[currentClass] || 0;
    for (let i = 0; i < qty; i += 1) {
      lessonsToPlace.push(teacher.id);
    }
  });

  lessonsToPlace.sort(() => Math.random() - 0.5);

  let placed = 0;
  lessonsToPlace.forEach((teacherId) => {
    for (let day = 0; day < DAYS.length; day += 1) {
      let inserted = false;
      for (let slot = 0; slot < SLOTS.length; slot += 1) {
        if (schedule[day][slot]) continue;
        if (isTeacherBlocked(teacherId, day, slot)) continue;
        if (isTeacherBusyInAnotherClass(teacherId, day, slot, currentClass)) continue;

        schedule[day][slot] = { teacherId };
        inserted = true;
        placed += 1;
        break;
      }
      if (inserted) break;
    }
  });

  scheduleByClass[currentClass] = schedule;
  if (placed < lessonsToPlace.length) {
    pushAlert(
      `Geração parcial: foram alocadas ${placed} de ${lessonsToPlace.length} aulas. Ajuste manualmente.`,
      'error',
    );
  } else {
    pushAlert('Combinação de horários gerada com sucesso.', 'success');
  }

  render();
}
