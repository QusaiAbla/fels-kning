/* ==========================================================================
   Admin panel logic
   ========================================================================== */

(function () {
  let selectedFlowId = null;
  let selectedNodeId = null;

  // ---------------- AUTH GATE ----------------

  const gate = document.getElementById('login-gate');
  const shell = document.getElementById('admin-shell');
  const gateInput = document.getElementById('gate-pin-input');
  const gateError = document.getElementById('gate-pin-error');

  function checkAuth() {
    if (sessionStorage.getItem('ithjalpen_admin_authed') === '1') {
      gate.classList.add('hidden');
      shell.classList.remove('hidden');
      return true;
    }
    gate.classList.remove('hidden');
    shell.classList.add('hidden');
    return false;
  }

  function submitGate() {
    const config = Store.getConfig();
    if (gateInput.value === config.adminPin) {
      sessionStorage.setItem('ithjalpen_admin_authed', '1');
      checkAuth();
      renderAll();
    } else {
      gateError.textContent = 'Fel kod. Försök igen.';
      gateInput.classList.add('is-error');
      setTimeout(() => gateInput.classList.remove('is-error'), 350);
    }
  }

  document.getElementById('gate-pin-submit').addEventListener('click', submitGate);
  gateInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitGate(); });

  document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('ithjalpen_admin_authed');
    window.location.href = 'index.html';
  });

  // ---------------- NAV ----------------

  document.querySelectorAll('.admin-nav__item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.admin-nav__item').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('is-active'));
      document.getElementById('view-' + btn.dataset.view).classList.add('is-active');
      if (btn.dataset.view === 'dashboard') renderDashboard();
      if (btn.dataset.view === 'flows') renderFlowsTable();
      if (btn.dataset.view === 'builder') renderBuilder();
    });
  });

  // ---------------- TOAST ----------------

  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function toast(msg, isError) {
    toastEl.textContent = msg;
    toastEl.className = 'toast is-visible' + (isError ? ' is-error' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('is-visible'), 2600);
  }

  // ---------------- DASHBOARD ----------------

  function renderDashboard() {
    const flows = Store.getAllFlows();
    const published = flows.filter(f => f.status === 'published').length;
    const draft = flows.filter(f => f.status === 'draft').length;
    const totalNodes = flows.reduce((sum, f) => sum + Object.keys(f.nodes || {}).length, 0);
    const resultNodes = flows.reduce((sum, f) => sum + Object.values(f.nodes || {}).filter(n => n.type === 'result').length, 0);

    const stats = [
      { label: 'Publicerade flöden', value: published, dot: 'success' },
      { label: 'Utkast', value: draft, dot: 'warning' },
      { label: 'Totalt antal noder', value: totalNodes, dot: 'neutral' },
      { label: 'Slutnoder (resultat)', value: resultNodes, dot: 'danger' }
    ];

    document.getElementById('dashboard-stats').innerHTML = stats.map(s => `
      <div class="flow-card" style="cursor:default;">
        <div class="flow-card__top">
          <div class="flow-card__status"><span class="dot dot--${s.dot}"></span></div>
        </div>
        <h3 style="font-size:28px;">${s.value}</h3>
        <p>${s.label}</p>
      </div>
    `).join('');

    document.getElementById('dashboard-recent').innerHTML = flows.length
      ? flows.map(f => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--color-border);">
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="font-size:20px;">${f.icon || '🛠️'}</span>
            <div>
              <strong style="display:block; font-size:14.5px;">${escapeHTML(f.title)}</strong>
              <span class="text-muted" style="font-size:12.5px;">${Object.keys(f.nodes || {}).length} noder</span>
            </div>
          </div>
          <span class="status-pill ${f.status === 'published' ? 'published' : 'draft'}">${f.status === 'published' ? 'Publicerad' : 'Utkast'}</span>
        </div>
      `).join('')
      : '<p class="text-muted">Inga flöden ännu.</p>';
  }

  // ---------------- FLOWS TABLE ----------------

  function renderFlowsTable() {
    const flows = Store.getAllFlows();
    const tbody = document.getElementById('flows-table-body');
    if (!flows.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-hint">Inga flöden ännu. Klicka på "+ Nytt flöde" för att börja.</td></tr>`;
      return;
    }
    tbody.innerHTML = flows.map(f => `
      <tr>
        <td><strong>${escapeHTML(f.title)}</strong><br><span class="text-muted" style="font-size:12px;">${escapeHTML(f.description || '')}</span></td>
        <td><span class="status-pill ${f.status === 'published' ? 'published' : 'draft'}">${f.status === 'published' ? 'Publicerad' : 'Utkast'}</span></td>
        <td>${Object.keys(f.nodes || {}).length}</td>
        <td style="font-size:18px;">${f.icon || '🛠️'}</td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" title="Redigera i byggaren" data-edit="${f.id}">✏️</button>
            <button class="icon-btn" title="Växla status" data-toggle="${f.id}">🔁</button>
            <button class="icon-btn danger" title="Ta bort" data-delete="${f.id}">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => {
      selectedFlowId = btn.dataset.edit;
      selectedNodeId = null;
      document.querySelector('.admin-nav__item[data-view="builder"]').click();
    }));
    tbody.querySelectorAll('[data-toggle]').forEach(btn => btn.addEventListener('click', () => {
      const flow = Store.getFlow(btn.dataset.toggle);
      flow.status = flow.status === 'published' ? 'draft' : 'published';
      Store.saveFlow(flow);
      renderFlowsTable();
      toast(`Status uppdaterad: ${flow.status === 'published' ? 'Publicerad' : 'Utkast'}`);
    }));
    tbody.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => {
      if (!confirm('Ta bort detta flöde permanent?')) return;
      Store.deleteFlow(btn.dataset.delete);
      renderFlowsTable();
      renderDashboard();
      toast('Flöde borttaget');
    }));
  }

  document.getElementById('new-flow-btn').addEventListener('click', () => {
    const id = Store.genId('flow');
    const startId = Store.genId('n');
    const flow = {
      id, title: 'Nytt flöde', description: '', icon: '🛠️', status: 'draft',
      startNode: startId,
      nodes: {
        [startId]: { id: startId, type: 'question', text: 'Ny fråga', instructions: '', image: '', video: '', links: [], options: [] }
      }
    };
    Store.saveFlow(flow);
    selectedFlowId = id;
    selectedNodeId = startId;
    document.querySelector('.admin-nav__item[data-view="builder"]').click();
    toast('Nytt flöde skapat');
  });

  // ---------------- BUILDER ----------------

  function renderBuilderSelect() {
    const sel = document.getElementById('builder-flow-select');
    const flows = Store.getAllFlows();
    sel.innerHTML = '<option value="">— Välj flöde —</option>' + flows.map(f =>
      `<option value="${f.id}" ${f.id === selectedFlowId ? 'selected' : ''}>${escapeHTML(f.title)}</option>`
    ).join('');
  }

  document.getElementById('builder-flow-select').addEventListener('change', (e) => {
    selectedFlowId = e.target.value || null;
    selectedNodeId = null;
    renderBuilder();
  });

  document.getElementById('add-node-btn').addEventListener('click', () => {
    if (!selectedFlowId) { toast('Välj ett flöde först', true); return; }
    const flow = Store.getFlow(selectedFlowId);
    const id = Store.genId('n');
    flow.nodes[id] = { id, type: 'question', text: 'Ny fråga', instructions: '', image: '', video: '', links: [], options: [] };
    Store.saveFlow(flow);
    selectedNodeId = id;
    renderBuilder();
    toast('Nod tillagd');
  });

  function renderBuilder() {
    renderBuilderSelect();
    const layout = document.getElementById('builder-layout');
    const emptyHint = document.getElementById('builder-empty');
    const flow = selectedFlowId ? Store.getFlow(selectedFlowId) : null;

    if (!flow) {
      layout.innerHTML = '';
      layout.appendChild(emptyHint);
      document.getElementById('builder-title').textContent = 'Flödesbyggare';
      return;
    }

    document.getElementById('builder-title').textContent = 'Flödesbyggare — ' + flow.title;

    layout.innerHTML = `
      <div class="editor-panel" style="grid-column:1/-1;">
        <div class="form-grid-2">
          <div class="form-row">
            <label>Flödestitel</label>
            <input type="text" id="meta-title" value="${escapeAttr(flow.title)}">
          </div>
          <div class="form-row">
            <label>Ikon (emoji)</label>
            <input type="text" id="meta-icon" value="${escapeAttr(flow.icon || '')}" maxlength="4">
          </div>
        </div>
        <div class="form-row">
          <label>Beskrivning (visas på startkortet)</label>
          <input type="text" id="meta-desc" value="${escapeAttr(flow.description || '')}">
        </div>
        <div class="form-grid-2">
          <div class="form-row">
            <label>Status</label>
            <select id="meta-status">
              <option value="draft" ${flow.status === 'draft' ? 'selected' : ''}>Utkast</option>
              <option value="published" ${flow.status === 'published' ? 'selected' : ''}>Publicerad</option>
            </select>
          </div>
          <div class="form-row">
            <label>Startnod</label>
            <select id="meta-start"></select>
          </div>
        </div>
      </div>
      <div class="tree-panel">
        <div class="tree-panel__title">Flödesschema <span class="text-muted">${Object.keys(flow.nodes).length} noder</span></div>
        <div id="node-tree-container"></div>
      </div>
      <div class="editor-panel" id="node-editor-container"></div>
    `;

    // populate start node select
    const startSel = document.getElementById('meta-start');
    startSel.innerHTML = Object.values(flow.nodes).map(n =>
      `<option value="${n.id}" ${n.id === flow.startNode ? 'selected' : ''}>${escapeHTML(nodeLabel(n))}</option>`
    ).join('');

    document.getElementById('meta-title').addEventListener('change', e => { flow.title = e.target.value || 'Namnlöst flöde'; Store.saveFlow(flow); renderBuilder(); });
    document.getElementById('meta-icon').addEventListener('change', e => { flow.icon = e.target.value; Store.saveFlow(flow); });
    document.getElementById('meta-desc').addEventListener('change', e => { flow.description = e.target.value; Store.saveFlow(flow); });
    document.getElementById('meta-status').addEventListener('change', e => { flow.status = e.target.value; Store.saveFlow(flow); toast('Status uppdaterad'); });
    startSel.addEventListener('change', e => { flow.startNode = e.target.value; Store.saveFlow(flow); toast('Startnod uppdaterad'); });

    renderNodeTree(flow);
    renderNodeEditor(flow);
  }

  function nodeLabel(node) {
    const text = node.type === 'result' ? (node.title || 'Resultat') : (node.text || 'Fråga');
    return (text.length > 34 ? text.slice(0, 34) + '…' : text);
  }

  function renderNodeTree(flow) {
    const container = document.getElementById('node-tree-container');
    const visited = new Set();

    function buildNode(nodeId) {
      const node = flow.nodes[nodeId];
      if (!node) return `<li><span class="node-chip"><span class="dot dot--danger"></span><span class="node-chip__label">Saknad nod (${escapeHTML(nodeId)})</span></span></li>`;
      if (visited.has(nodeId)) {
        return `<li><span class="node-chip"><span class="dot dot--neutral"></span><span class="node-chip__label">&#8635; ${escapeHTML(nodeLabel(node))}</span></span></li>`;
      }
      visited.add(nodeId);
      const dotClass = node.type === 'result'
        ? (node.status === 'success' ? 'success' : node.status === 'warning' ? 'warning' : 'danger')
        : 'neutral';
      let html = `<li>
        <div class="node-chip ${nodeId === selectedNodeId ? 'is-selected' : ''}" data-node="${nodeId}">
          <span class="dot dot--${dotClass}"></span>
          <span class="node-chip__label">${escapeHTML(nodeLabel(node))}</span>
          <span class="node-chip__type">${node.type === 'result' ? 'slut' : 'fråga'}</span>
        </div>`;
      if (node.type === 'question' && node.options && node.options.length) {
        html += '<ul>';
        node.options.forEach(opt => {
          if (opt.next) {
            html += buildNode(opt.next);
          } else {
            html += `<li><span class="node-chip" style="opacity:.55;"><span class="dot dot--warning"></span><span class="node-chip__label">${escapeHTML(opt.label || 'Alternativ')} — ej kopplad</span></span></li>`;
          }
        });
        html += '</ul>';
      }
      html += '</li>';
      return html;
    }

    let treeHTML = `<ul class="node-tree">${buildNode(flow.startNode)}</ul>`;

    const orphans = Object.keys(flow.nodes).filter(id => !visited.has(id));
    if (orphans.length) {
      treeHTML += `<div class="tree-panel__title" style="margin-top:14px;">Ej kopplade noder</div><ul class="node-tree">`;
      orphans.forEach(id => { treeHTML += buildNode(id); });
      treeHTML += `</ul>`;
    }

    container.innerHTML = treeHTML;
    container.querySelectorAll('[data-node]').forEach(chip => {
      chip.addEventListener('click', () => {
        selectedNodeId = chip.dataset.node;
        renderNodeTree(flow);
        renderNodeEditor(flow);
      });
    });
  }

  function renderNodeEditor(flow) {
    const container = document.getElementById('node-editor-container');
    if (!selectedNodeId || !flow.nodes[selectedNodeId]) {
      container.innerHTML = `<div class="empty-hint">Välj en nod i trädet till vänster, eller skapa en ny.</div>`;
      return;
    }
    const node = flow.nodes[selectedNodeId];

    container.innerHTML = `
      <div class="node-type-toggle">
        <button type="button" data-type="question" class="${node.type === 'question' ? 'is-active' : ''}">Fråga</button>
        <button type="button" data-type="result" class="${node.type === 'result' ? 'is-active' : ''}">Slutresultat</button>
      </div>
      <div id="node-fields"></div>
      <div class="editor-footer">
        <button class="btn btn-ghost btn-sm" id="delete-node-btn">🗑️ Ta bort nod</button>
        <span class="text-muted" style="font-family:var(--font-mono); font-size:11px;">ID: ${escapeHTML(node.id)}</span>
      </div>
    `;

    container.querySelectorAll('.node-type-toggle button').forEach(btn => {
      btn.addEventListener('click', () => {
        node.type = btn.dataset.type;
        if (node.type === 'result' && !node.status) node.status = 'warning';
        if (node.type === 'question' && !node.options) node.options = [];
        Store.saveFlow(flow);
        renderNodeTree(flow);
        renderNodeEditor(flow);
      });
    });

    document.getElementById('delete-node-btn').addEventListener('click', () => {
      if (!confirm('Ta bort denna nod? Alternativ som pekar hit kommer bli okopplade.')) return;
      delete flow.nodes[selectedNodeId];
      Object.values(flow.nodes).forEach(n => {
        if (n.options) n.options.forEach(o => { if (o.next === selectedNodeId) o.next = ''; });
      });
      if (flow.startNode === selectedNodeId) {
        flow.startNode = Object.keys(flow.nodes)[0] || '';
      }
      selectedNodeId = null;
      Store.saveFlow(flow);
      renderBuilder();
      toast('Nod borttagen');
    });

    if (node.type === 'question') renderQuestionFields(flow, node);
    else renderResultFields(flow, node);
  }

  function renderQuestionFields(flow, node) {
    const fields = document.getElementById('node-fields');
    fields.innerHTML = `
      <div class="form-row">
        <label>Frågetext</label>
        <textarea id="f-text" rows="2">${escapeHTML(node.text)}</textarea>
      </div>
      <div class="form-row">
        <label>Instruktioner / steg-för-steg</label>
        <textarea id="f-instructions" rows="3">${escapeHTML(node.instructions || '')}</textarea>
        <div class="hint">Visas under frågan som stödtext för användaren.</div>
      </div>
      <div class="form-grid-2">
        <div class="form-row">
          <label>Bild-URL (valfritt)</label>
          <input type="url" id="f-image" value="${escapeAttr(node.image || '')}" placeholder="https://...">
        </div>
        <div class="form-row">
          <label>Video-länk (valfritt)</label>
          <input type="url" id="f-video" value="${escapeAttr(node.video || '')}" placeholder="https://youtube.com/...">
        </div>
      </div>
      <div class="form-row">
        <label>Externa länkar</label>
        <div id="links-list"></div>
        <button class="btn btn-ghost btn-sm" id="add-link-btn" type="button">+ Lägg till länk</button>
      </div>
      <div class="form-row">
        <label>Svarsalternativ &amp; grenlogik</label>
        <div id="options-list"></div>
        <button class="btn btn-ghost btn-sm" id="add-option-btn" type="button">+ Lägg till svarsalternativ</button>
      </div>
    `;

    document.getElementById('f-text').addEventListener('change', e => { node.text = e.target.value; Store.saveFlow(flow); renderNodeTree(flow); });
    document.getElementById('f-instructions').addEventListener('change', e => { node.instructions = e.target.value; Store.saveFlow(flow); });
    document.getElementById('f-image').addEventListener('change', e => { node.image = e.target.value; Store.saveFlow(flow); });
    document.getElementById('f-video').addEventListener('change', e => { node.video = e.target.value; Store.saveFlow(flow); });

    renderLinksList(flow, node);
    document.getElementById('add-link-btn').addEventListener('click', () => {
      node.links = node.links || [];
      node.links.push({ label: '', url: '' });
      Store.saveFlow(flow);
      renderLinksList(flow, node);
    });

    renderOptionsList(flow, node);
    document.getElementById('add-option-btn').addEventListener('click', () => {
      node.options = node.options || [];
      node.options.push({ label: 'Nytt alternativ', next: '' });
      Store.saveFlow(flow);
      renderOptionsList(flow, node);
      renderNodeTree(flow);
    });
  }

  function renderLinksList(flow, node) {
    const list = document.getElementById('links-list');
    node.links = node.links || [];
    list.innerHTML = node.links.map((l, i) => `
      <div class="option-row">
        <input type="text" placeholder="Länktext" value="${escapeAttr(l.label)}" data-link-label="${i}">
        <input type="url" placeholder="https://..." value="${escapeAttr(l.url)}" data-link-url="${i}">
        <button class="icon-btn danger" type="button" data-link-remove="${i}">✕</button>
      </div>
    `).join('') || '<p class="text-muted" style="font-size:13px;">Inga länkar tillagda.</p>';

    list.querySelectorAll('[data-link-label]').forEach(inp => inp.addEventListener('change', e => {
      node.links[+inp.dataset.linkLabel].label = e.target.value; Store.saveFlow(flow);
    }));
    list.querySelectorAll('[data-link-url]').forEach(inp => inp.addEventListener('change', e => {
      node.links[+inp.dataset.linkUrl].url = e.target.value; Store.saveFlow(flow);
    }));
    list.querySelectorAll('[data-link-remove]').forEach(btn => btn.addEventListener('click', () => {
      node.links.splice(+btn.dataset.linkRemove, 1); Store.saveFlow(flow); renderLinksList(flow, node);
    }));
  }

  function renderOptionsList(flow, node) {
    const list = document.getElementById('options-list');
    node.options = node.options || [];
    const nodeChoices = Object.values(flow.nodes).map(n => `<option value="${n.id}">${escapeHTML(nodeLabel(n))}</option>`).join('');

    list.innerHTML = node.options.map((opt, i) => `
      <div class="option-row">
        <input type="text" placeholder="Svarstext" value="${escapeAttr(opt.label)}" data-opt-label="${i}">
        <select data-opt-next="${i}">
          <option value="">— Koppla till nod —</option>
          ${nodeChoices}
        </select>
        <button class="icon-btn" type="button" data-opt-newnode="${i}" title="Skapa ny nod och koppla">+</button>
        <button class="icon-btn danger" type="button" data-opt-remove="${i}" title="Ta bort alternativ">✕</button>
      </div>
    `).join('') || '<p class="text-muted" style="font-size:13px;">Inga svarsalternativ tillagda.</p>';

    list.querySelectorAll('[data-opt-next]').forEach(sel => {
      const i = +sel.dataset.optNext;
      sel.value = node.options[i].next || '';
      sel.addEventListener('change', e => { node.options[i].next = e.target.value; Store.saveFlow(flow); renderNodeTree(flow); });
    });
    list.querySelectorAll('[data-opt-label]').forEach(inp => inp.addEventListener('change', e => {
      node.options[+inp.dataset.optLabel].label = e.target.value; Store.saveFlow(flow); renderNodeTree(flow);
    }));
    list.querySelectorAll('[data-opt-remove]').forEach(btn => btn.addEventListener('click', () => {
      node.options.splice(+btn.dataset.optRemove, 1); Store.saveFlow(flow); renderOptionsList(flow, node); renderNodeTree(flow);
    }));
    list.querySelectorAll('[data-opt-newnode]').forEach(btn => btn.addEventListener('click', () => {
      const i = +btn.dataset.optNewnode;
      const id = Store.genId('n');
      flow.nodes[id] = { id, type: 'question', text: 'Ny fråga', instructions: '', image: '', video: '', links: [], options: [] };
      node.options[i].next = id;
      Store.saveFlow(flow);
      renderOptionsList(flow, node);
      renderNodeTree(flow);
      toast('Ny nod skapad och kopplad');
    }));
  }

  function renderResultFields(flow, node) {
    const fields = document.getElementById('node-fields');
    fields.innerHTML = `
      <div class="form-row">
        <label>Statustyp</label>
        <select id="f-status">
          <option value="success" ${node.status === 'success' ? 'selected' : ''}>Grön — Löst</option>
          <option value="warning" ${node.status === 'warning' ? 'selected' : ''}>Gul — Kräver åtgärd</option>
          <option value="danger" ${node.status === 'danger' ? 'selected' : ''}>Röd — Eskalera</option>
        </select>
      </div>
      <div class="form-row">
        <label>Rubrik (Rekommenderad åtgärd)</label>
        <input type="text" id="f-title" value="${escapeAttr(node.title || '')}">
      </div>
      <div class="form-row">
        <label>Sammanfattning (en punkt per rad)</label>
        <textarea id="f-summary" rows="5">${escapeHTML((node.summary || []).join('\n'))}</textarea>
      </div>
    `;
    document.getElementById('f-status').addEventListener('change', e => { node.status = e.target.value; Store.saveFlow(flow); renderNodeTree(flow); });
    document.getElementById('f-title').addEventListener('change', e => { node.title = e.target.value; Store.saveFlow(flow); renderNodeTree(flow); });
    document.getElementById('f-summary').addEventListener('change', e => {
      node.summary = e.target.value.split('\n').map(s => s.trim()).filter(Boolean);
      Store.saveFlow(flow);
    });
  }

  // ---------------- SETTINGS ----------------

  function renderSettings() {
    const config = Store.getConfig();
    document.getElementById('org-name').value = config.orgName || '';
    document.getElementById('support-email').value = config.supportEmail || '';
  }

  document.getElementById('change-pin-btn').addEventListener('click', () => {
    const current = document.getElementById('current-pin').value;
    const next = document.getElementById('new-pin').value;
    const errorEl = document.getElementById('pin-change-error');
    const config = Store.getConfig();
    errorEl.textContent = '';
    if (current !== config.adminPin) { errorEl.textContent = 'Nuvarande kod stämmer inte.'; return; }
    if (!/^\d{4,6}$/.test(next)) { errorEl.textContent = 'Ny kod måste vara 4–6 siffror.'; return; }
    Store.saveConfig({ adminPin: next });
    document.getElementById('current-pin').value = '';
    document.getElementById('new-pin').value = '';
    toast('Administratörskoden har uppdaterats');
  });

  document.getElementById('save-org-btn').addEventListener('click', () => {
    Store.saveConfig({
      orgName: document.getElementById('org-name').value,
      supportEmail: document.getElementById('support-email').value
    });
    toast('Organisationsuppgifter sparade');
  });

  document.getElementById('export-flows-btn').addEventListener('click', () => { Store.exportFlows(); toast('flows.json exporterad'); });
  document.getElementById('export-config-btn').addEventListener('click', () => { Store.exportConfig(); toast('config.json exporterad'); });
  document.getElementById('reset-flows-btn').addEventListener('click', () => {
    if (!confirm('Detta rensar dina lokala ändringar och laddar om serverns flows.json. Fortsätt?')) return;
    Store.resetFlowsToServer();
    window.location.reload();
  });
  document.getElementById('import-flows-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        Store.importFlows(json);
        toast('flows.json importerad');
        renderAll();
      } catch (err) {
        toast('Kunde inte tolka filen som giltig JSON', true);
      }
    };
    reader.readAsText(file);
  });

  // ---------------- helpers ----------------

  function escapeHTML(str) {
    if (str === undefined || str === null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeAttr(str) { return escapeHTML(str).replace(/"/g, '&quot;'); }

  function renderAll() {
    renderDashboard();
    renderFlowsTable();
    renderBuilder();
    renderSettings();
  }

  // ---------------- init ----------------

  Store.init().then(() => {
    if (checkAuth()) renderAll();
  });
})();
