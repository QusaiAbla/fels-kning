/* ==========================================================================
   Main app logic — home / question flow / result views
   ========================================================================== */

(function () {
  const viewHome = document.getElementById('view-home');
  const viewFlow = document.getElementById('view-flow');
  const viewResult = document.getElementById('view-result');
  const flowGrid = document.getElementById('flow-grid');
  const questionSlot = document.getElementById('question-card-slot');
  const resultSlot = document.getElementById('result-card-slot');
  const progressTrack = document.getElementById('progress-track');
  const stepCounter = document.getElementById('step-counter');

  let currentFlow = null;
  let path = []; // stack of node ids visited in current flow

  const STATUS_META = {
    success: { icon: '✓', label: 'Löst', className: 'success' },
    warning: { icon: '!', label: 'Kräver åtgärd', className: 'warning' },
    danger:  { icon: '⏫', label: 'Eskalera till IT', className: 'danger' }
  };

  document.getElementById('year').textContent = new Date().getFullYear();

  function show(view) {
    [viewHome, viewFlow, viewResult].forEach(v => v.classList.add('hidden'));
    view.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------------- HOME ----------------

  function renderHome() {
    const flows = Store.getPublishedFlows();
    flowGrid.innerHTML = '';

    if (!flows.length) {
      flowGrid.innerHTML = `<div class="empty-state">Inga felsökningsflöden är publicerade ännu. Kontakta en administratör.</div>`;
      return;
    }

    flows.forEach(flow => {
      const card = document.createElement('button');
      card.className = 'flow-card';
      card.setAttribute('aria-label', 'Starta flöde: ' + flow.title);
      const nodeCount = Object.keys(flow.nodes || {}).length;
      card.innerHTML = `
        <div class="flow-card__top">
          <div class="flow-card__icon">${flow.icon || '🛠️'}</div>
          <div class="flow-card__status"><span class="dot dot--success"></span> Publicerad</div>
        </div>
        <h3>${escapeHTML(flow.title)}</h3>
        <p>${escapeHTML(flow.description || '')}</p>
        <div class="flow-card__meta">
          <span>${nodeCount} steg</span>
          <span>Starta &rarr;</span>
        </div>
      `;
      card.addEventListener('click', () => startFlow(flow.id));
      flowGrid.appendChild(card);
    });
  }

  // ---------------- FLOW / QUESTIONS ----------------

  function startFlow(flowId) {
    currentFlow = Store.getFlow(flowId);
    if (!currentFlow) return;
    path = [currentFlow.startNode];
    show(viewFlow);
    renderCurrentNode();
  }

  function renderProgress() {
    progressTrack.innerHTML = '';
    path.forEach((nodeId, i) => {
      const seg = document.createElement('div');
      seg.className = 'progress-seg';
      if (i < path.length - 1) seg.classList.add('is-filled');
      else seg.classList.add('is-current');
      seg.innerHTML = '<span></span>';
      progressTrack.appendChild(seg);
    });
    stepCounter.textContent = 'Steg ' + path.length;
  }

  function renderCurrentNode(direction) {
    const nodeId = path[path.length - 1];
    const node = currentFlow.nodes[nodeId];
    renderProgress();
    document.getElementById('btn-back').style.visibility = path.length > 1 ? 'visible' : 'hidden';

    if (!node) {
      questionSlot.innerHTML = `<div class="question-card"><p>Steget kunde inte hittas. Kontakta IT-support.</p></div>`;
      return;
    }

    if (node.type === 'result') {
      renderResultNode(node);
      return;
    }

    const card = document.createElement('div');
    card.className = 'question-card anim-enter';
    card.innerHTML = `
      <span class="flow-name-tag">${escapeHTML(currentFlow.title)}</span>
      <h2>${escapeHTML(node.text)}</h2>
      <div class="options-grid" id="options-grid"></div>
      ${renderInfoPanel(node)}
    `;
    questionSlot.innerHTML = '';
    questionSlot.appendChild(card);

    const optionsGrid = card.querySelector('#options-grid');
    (node.options || []).forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.innerHTML = `<span>${escapeHTML(opt.label)}</span><span class="option-btn__arrow" aria-hidden="true">&rarr;</span>`;
      btn.addEventListener('click', () => goToNode(opt.next));
      optionsGrid.appendChild(btn);
    });
  }

  function renderInfoPanel(node) {
    const hasInstructions = node.instructions && node.instructions.trim().length;
    const hasImage = node.image && node.image.trim().length;
    const hasVideo = node.video && node.video.trim().length;
    const hasLinks = node.links && node.links.length;

    if (!hasInstructions && !hasImage && !hasVideo && !hasLinks) return '';

    let html = `<div class="info-panel"><div class="info-panel__title">Instruktioner &amp; stöd</div>`;
    if (hasInstructions) {
      html += `<div class="info-panel__body">${escapeHTML(node.instructions)}</div>`;
    }
    if (hasImage) {
      html += `<div class="info-panel__media"><img src="${escapeAttr(node.image)}" alt="Bildstöd för steget"></div>`;
    }
    if (hasVideo) {
      html += `<div class="info-panel__video"><iframe src="${escapeAttr(toEmbedUrl(node.video))}" allowfullscreen loading="lazy"></iframe></div>`;
    }
    if (hasLinks) {
      html += `<div class="info-panel__links">`;
      node.links.forEach(l => {
        html += `<a href="${escapeAttr(l.url)}" target="_blank" rel="noopener">${escapeHTML(l.label || l.url)} &nearr;</a>`;
      });
      html += `</div>`;
    }
    html += `</div>`;
    return html;
  }

  function toEmbedUrl(url) {
    // Best-effort YouTube embed conversion; falls back to raw URL for other hosts.
    const m = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
    if (m) return 'https://www.youtube.com/embed/' + m[1];
    return url;
  }

  function goToNode(nextId) {
    if (!nextId || !currentFlow.nodes[nextId]) return;
    path.push(nextId);
    renderCurrentNode();
  }

  function goBack() {
    if (path.length <= 1) return;
    path.pop();
    show(viewFlow);
    renderCurrentNode();
  }

  document.getElementById('btn-back').addEventListener('click', goBack);
  document.getElementById('btn-back-result').addEventListener('click', () => {
    if (path.length > 1) {
      path.pop();
      show(viewFlow);
      renderCurrentNode();
    } else {
      show(viewHome);
    }
  });

  // ---------------- RESULT ----------------

  function renderResultNode(node) {
    const meta = STATUS_META[node.status] || STATUS_META.warning;
    resultSlot.innerHTML = `
      <div class="result-card anim-enter">
        <div class="result-card__band ${meta.className}">
          <div class="result-card__icon">${meta.icon}</div>
          <div>
            <span class="result-card__eyebrow">${meta.label}</span>
            <strong>${escapeHTML(currentFlow.title)}</strong>
          </div>
        </div>
        <div class="result-card__body">
          <h2>Rekommenderad åtgärd</h2>
          <p class="text-muted">${escapeHTML(node.title || '')}</p>
          <ul class="result-list">
            ${(node.summary || []).map(s => `<li>${escapeHTML(s)}</li>`).join('')}
          </ul>
          <div class="result-actions">
            <button class="btn btn-primary" id="restart-flow-btn">Starta om flödet</button>
            <button class="btn btn-ghost" id="home-btn">Till startsidan</button>
          </div>
        </div>
      </div>
    `;
    show(viewResult);

    document.getElementById('restart-flow-btn').addEventListener('click', () => {
      path = [currentFlow.startNode];
      show(viewFlow);
      renderCurrentNode();
    });
    document.getElementById('home-btn').addEventListener('click', () => {
      currentFlow = null;
      path = [];
      show(viewHome);
    });
  }

  // ---------------- ADMIN PIN MODAL ----------------

  const pinModal = document.getElementById('pin-modal');
  const pinInput = document.getElementById('pin-input');
  const pinError = document.getElementById('pin-error');

  document.getElementById('admin-fab').addEventListener('click', () => {
    pinInput.value = '';
    pinError.textContent = '';
    pinInput.classList.remove('is-error');
    pinModal.classList.remove('hidden');
    setTimeout(() => pinInput.focus(), 60);
  });

  document.getElementById('pin-close').addEventListener('click', () => pinModal.classList.add('hidden'));
  pinModal.addEventListener('click', (e) => { if (e.target === pinModal) pinModal.classList.add('hidden'); });

  function submitPin() {
    const config = Store.getConfig();
    if (pinInput.value === config.adminPin) {
      sessionStorage.setItem('ithjalpen_admin_authed', '1');
      window.location.href = 'admin.html';
    } else {
      pinError.textContent = 'Fel kod. Försök igen.';
      pinInput.classList.add('is-error');
      setTimeout(() => pinInput.classList.remove('is-error'), 350);
    }
  }

  document.getElementById('pin-submit').addEventListener('click', submitPin);
  pinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitPin(); });

  // ---------------- helpers ----------------

  function escapeHTML(str) {
    if (str === undefined || str === null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
  function escapeAttr(str) {
    return escapeHTML(str).replace(/"/g, '&quot;');
  }

  // ---------------- init ----------------

  Store.init().then(() => {
    renderHome();
  });
})();
