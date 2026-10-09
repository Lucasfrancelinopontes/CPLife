/**
 * ICPC 2027 Training OS — Frontend Logic
 * Interface ultrarrápida para registro e acompanhamento de domínio.
 */

const app = {
  data: {
    metrics: null,
    problems: [],
    topics: [],
    taxonomy: { errors: {}, labels: [] }
  },

  selectedErrors: new Set(),
  selectedHelpLevel: 0,
  selectedRevHelpLevel: 0,
  selectedUpsolveHelpLevel: 0,
  currentUpsolveFilter: 'ALL',

  
  navigate(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    
    const target = document.getElementById('view-' + viewId);
    const btn = document.getElementById('nav-' + viewId);
    
    if (target) target.style.display = 'block';
    if (btn) btn.classList.add('active');

    const titles = {
      'dashboard': 'Dashboard Executivo',
      'training': 'Treinamento',
      'reviews': 'Fila de Revisões',
      'contests': 'Competições & Simulados',
      'upsolving': 'Central de Upsolving',
      'skills': 'Árvore de Habilidades',
      'patterns': 'Caderno de Patterns',
      'templates': 'Handbook & Templates',
      'analysis': 'Análises e Erros'
    };
    
    const titleEl = document.getElementById('topbar-title');
    if (titleEl && titles[viewId]) {
      titleEl.innerText = titles[viewId];
    }
  },

  filterTraining() {
     this.renderTrainingHistory();
  },

  renderTrainingHistory() {
     const tbody = document.getElementById("training-history-body");
     if (!tbody || !this.data.attempts) return;
     
     const term = (document.getElementById("train-search")?.value || "").toLowerCase();
     const resFilter = document.getElementById("train-filter-result")?.value || "";
     
     const filtered = this.data.attempts.filter(a => {
        let match = true;
        if (resFilter && a.result !== resFilter && !(resFilter === 'WA' && a.result !== 'AC')) match = false;
        
        const prob = this.data.problems.find(p => p.problem_id === a.problem_id) || {};
        const txt = [a.problem_id, prob.title, prob.platform, a.notes, a.errors].join(" ").toLowerCase();
        if (term && !txt.includes(term)) match = false;
        
        return match;
     });
     
     if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="color: var(--text-dim); text-align: center;">Nenhuma tentativa encontrada.</td></tr>';
        return;
     }
     
     // Ordena por data decrescente (ou assume que a api já traz em ordem, reverter para ficar mais recente 1o)
     filtered.reverse();
     
     tbody.innerHTML = filtered.map(a => {
        const prob = this.data.problems.find(p => p.problem_id === a.problem_id) || {};
        const isAC = a.result === "AC";
        const c = isAC ? "var(--accent-green)" : (a.result === "GIVE_UP" ? "var(--text-dim)" : "var(--accent-red)");
        return `
          <tr>
            <td>${a.date}</td>
            <td><strong style="color: var(--text-main);">${a.problem_id}</strong><br><span style="font-size:0.75rem; color:var(--text-muted);">${prob.title || ''}</span></td>
            <td>${prob.main_topic || ''}</td>
            <td>${prob.platform || ''}</td>
            <td><strong style="color: ${c};">${a.result}</strong></td>
            <td>${a.total_time_min}m</td>
            <td>${a.help_level}</td>
            <td style="font-size: 0.8rem; color: var(--text-muted); max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
              ${a.errors ? '<span style="color:var(--accent-yellow)">[' + a.errors + ']</span> ' : ''}${a.notes || ''}
            </td>
          </tr>
        `;
     }).join("");
  },

  async init() {
    this.setupHotkeys();
    await this.fetchTaxonomy();
    await this.fetchTopics();
    await this.fetchProblems();
    await this.fetchAttempts();
    await this.refreshData();
  },

  setupHotkeys() {
    document.addEventListener("keydown", (e) => {
      // Ignora se estiver digitando em inputs
      const tag = e.target.tagName.toLowerCase();
      const inInput = tag === "input" || tag === "textarea" || tag === "select";

      if (e.key === "n" || e.key === "N") {
        if (!inInput) {
          e.preventDefault();
          this.openLogModal();
        }
      } else if (e.key === "Escape") {
        this.closeLogModal();
        this.closeReviewModal();
        this.closeContestModal();
        this.closeUpsolveModal();
      }
    });
  },

  async fetchTaxonomy() {
    try {
      const res = await fetch("/api/taxonomy");
      this.data.taxonomy = await res.json();
      this.renderErrorBadges();
    } catch (err) {
      console.error("Erro ao carregar taxonomia:", err);
    }
  },

  
  async fetchAttempts() {
    try {
      const res = await fetch("/api/attempts");
      const data = await res.json();
      this.data.attempts = Array.isArray(data) ? data : (data.attempts || []);
    } catch(e) { console.error("Error fetching attempts:", e); }
  },

  async fetchTopics() {
    try {
      const res = await fetch("/api/topics");
      this.data.topics = await res.json();
      this.populateTopicSelect();
    } catch (err) {
      console.error("Erro ao carregar tópicos:", err);
    }
  },

  async fetchProblems() {
    try {
      const res = await fetch("/api/problems");
      this.data.problems = await res.json();
      this.populateProblemsDatalist();
    } catch (err) {
      console.error("Erro ao carregar catálogo:", err);
    }
  },

  async refreshData() {
    try {
      const res = await fetch("/api/metrics");
      this.data.metrics = await res.json();
      this.renderSummary();
      this.renderContestsSection();
      this.renderUpsolvingSection();
      this.renderTopicsMastery();
      this.renderErrorDistribution();
      this.renderReviewQueue();
      this.renderRecentAttempts();
        this.renderTrainingHistory();
      } catch (err) {
      console.error("Erro ao atualizar métricas:", err);
    }
  },

  renderSummary() {
    const s = this.data.metrics.summary;
    document.getElementById("stat-solved").textContent = s.solved_count;
    document.getElementById("stat-total-catalog").textContent = `de ${s.total_problems} no catálogo mestre`;
    document.getElementById("stat-solo-rate").textContent = `${s.pure_solo_rate}%`;
    document.getElementById("stat-solo-count").textContent = `${s.solo_count} resolvidos 100% solo`;
    document.getElementById("stat-autonomy").textContent = `${s.weighted_autonomy}%`;
    document.getElementById("stat-bases").textContent = `${s.cses_solved} CSES / ${s.icpc_solved} ICPC`;
    document.getElementById("stat-time").textContent = `${s.total_time_hours}h em ${s.total_time_min}min de treino`;
    
    const dueEl = document.getElementById("stat-reviews-due");
    dueEl.textContent = s.due_today_count;
    if (s.due_today_count > 0) {
      dueEl.style.color = "var(--accent-red)";
    } else {
      dueEl.style.color = "var(--accent-green)";
    }
    document.getElementById("stat-reviews-total").textContent = `${s.pending_reviews_count} pendente(s) na fila`;

    const cCountEl = document.getElementById("stat-contests-count");
    if (cCountEl) {
      cCountEl.textContent = s.contests_count || 0;
      document.getElementById("stat-contests-sub").textContent = `Média: ${s.avg_contest_solved || '0.0'} AC • ${s.pending_upsolving_count || 0} pendentes upsolve`;
    }
  },

  renderTopicsMastery() {
    const containerFull = document.getElementById("topics-container-full");
    const containerDash = document.getElementById("dash-weak-topics");
    const topics = this.data.metrics.topics;

    if (!topics || topics.length === 0) {
      if (containerFull) containerFull.innerHTML = `<div style="color: var(--text-dim);">Nenhum tópico cadastrado.</div>`;
      if (containerDash) containerDash.innerHTML = `<div style="color: var(--text-dim);">Nenhum tópico cadastrado.</div>`;
      return;
    }

    const buildTopicRow = (t) => {
      const pct = Math.min(100, Math.round((t.score / 5.0) * 100));
      let fillColor = "#38bdf8";
      let labelBg = "rgba(56, 189, 248, 0.15)";
      let labelColor = "#38bdf8";

      if (t.score >= 4.0) {
        fillColor = "#22c55e";
        labelBg = "rgba(34, 197, 94, 0.15)";
        labelColor = "#22c55e";
      } else if (t.score >= 3.0) {
        fillColor = "#38bdf8";
      } else if (t.score >= 2.0) {
        fillColor = "#f59e0b";
        labelBg = "rgba(245, 158, 11, 0.15)";
        labelColor = "#f59e0b";
      } else if (t.score > 0.0) {
        fillColor = "#ef4444";
        labelBg = "rgba(239, 68, 68, 0.15)";
        labelColor = "#ef4444";
      } else {
        fillColor = "#334155";
        labelBg = "rgba(51, 65, 85, 0.3)";
        labelColor = "#64748b";
      }

      return `
        <div class="topic-row" onclick="app.toggleAudit('${t.topic_id}')" style="cursor: pointer;" title="Clique para ver auditoria do cálculo">
          <div class="topic-name" title="${t.name}">
            ${t.name}
          </div>
          <div class="topic-score-badge" style="color: ${fillColor}">
            ${t.score.toFixed(1)} <span style="font-size: 0.72rem; color: var(--text-dim); font-weight: normal;">/ 5.0</span>
          </div>
          <div class="score-progress-bar">
            <div class="score-progress-fill" style="width: ${pct}%; background: ${fillColor};"></div>
          </div>
          <div class="topic-label" style="background: ${labelBg}; color: ${labelColor};">
            ${t.label}
          </div>
        </div>
        <div id="audit-${t.topic_id}" class="audit-explanation" style="display: none;">
          🔍 <strong>Auditoria do Score:</strong> ${t.explanation}
        </div>
      `;
    };

    // Container completo (aba Habilidades), agrupado por categoria
    if (containerFull) {
      const groups = {};
      for (const t of topics) {
        const cat = t.category || "Outros";
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(t);
      }

      let htmlFull = "";
      for (const [category, catTopics] of Object.entries(groups)) {
        htmlFull += `
          <div class="category-block">
            <div class="category-group-title">${category}</div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
        `;
        for (const t of catTopics) {
          htmlFull += buildTopicRow(t);
        }
        htmlFull += `
            </div>
          </div>
        `;
      }
      containerFull.innerHTML = htmlFull;
    }

    // Container do dashboard: tópicos mais fracos (menor score primeiro)
    if (containerDash) {
      const weakest = [...topics]
        .sort((a, b) => a.score - b.score)
        .slice(0, 5);

      if (weakest.length === 0) {
        containerDash.innerHTML = `<div style="color: var(--text-dim);">Nenhum tópico cadastrado.</div>`;
      } else {
        containerDash.innerHTML = weakest.map(buildTopicRow).join("");
      }
    }
  },

  toggleAudit(topicId) {
    const el = document.getElementById(`audit-${topicId}`);
    if (el) {
      el.style.display = el.style.display === "none" ? "block" : "none";
    }
  },

  renderErrorDistribution() {
    const container = document.getElementById("errors-container-full");
    const errors = this.data.metrics.errors;

    const totalErrors = errors.reduce((acc, e) => acc + e.count, 0);

    let html = "";
    for (const e of errors) {
      const pct = totalErrors > 0 ? Math.round((e.count / totalErrors) * 100) : 0;
      html += `
        <div class="error-item" title="${e.code} — ${e.name}">
          <div class="error-code">${e.code}</div>
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.78rem; margin-bottom: 3px;">
              <span style="color: var(--text-main); font-weight: 500;">${e.name}</span>
              <span style="color: var(--text-dim);">${pct}%</span>
            </div>
            <div class="error-bar-bg">
              <div class="error-bar-fill" style="width: ${pct}%;"></div>
            </div>
          </div>
          <div class="error-count">${e.count}</div>
        </div>
      `;
    }
    container.innerHTML = html;
  },

  renderReviewQueue() {
    const rq = this.data.metrics.review_queue;
    const pendingBody = document.getElementById("reviews-pending-body-full");
    const completedBody = document.getElementById("reviews-completed-body-full");
    const badgeCount = document.getElementById("queue-badge-count-full");

    badgeCount.textContent = `${rq.pending.length} pendente(s)`;

    // Pendentes
    if (!rq.pending || rq.pending.length === 0) {
      pendingBody.innerHTML = `<tr><td colspan="6" style="color: var(--text-dim); text-align: center; padding: 18px;">🎉 Fila zerada! Nenhuma revisão pendente.</td></tr>`;
    } else {
      const today = new Date().toISOString().slice(0, 10);
      let html = "";
      for (const item of rq.pending) {
        const isOverdue = item.due_date && item.due_date < today;
        const isToday = item.due_date === today;
        let dateBadge = `<span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${item.due_date}</span>`;
        if (isOverdue) {
          dateBadge = `<span class="badge" style="background: var(--accent-red-bg); color: var(--accent-red);">Vencido (${item.due_date})</span>`;
        } else if (isToday) {
          dateBadge = `<span class="badge" style="background: var(--accent-yellow-bg); color: var(--accent-yellow);">Vence Hoje</span>`;
        }

        const cycleNames = { "1": "7 dias", "2": "30 dias", "3": "90 dias" };
        const cycleText = `Ciclo ${item.cycle} (${cycleNames[item.cycle] || "Revisão"})`;

        html += `
          <tr>
            <td>
              <strong>${item.problem_title}</strong>
              <div style="font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono);">${item.problem_id} • ${item.platform}</div>
            </td>
            <td><span class="badge badge-cycle">${cycleText}</span></td>
            <td>${dateBadge}</td>
            <td><span style="font-family: var(--font-mono);">${item.difficulty_value || '-'}</span></td>
            <td style="font-size: 0.82rem; color: var(--text-muted); max-width: 200px;">${item.notes || '-'}</td>
            <td style="text-align: right;">
              <button class="btn btn-primary btn-sm" onclick='app.openReviewModal(${JSON.stringify(item)})'>
                Revisar Agora
              </button>
            </td>
          </tr>
        `;
      }
      pendingBody.innerHTML = html;
    }

    // Concluídas
    if (!rq.completed || rq.completed.length === 0) {
      completedBody.innerHTML = `<tr><td colspan="7" style="color: var(--text-dim); text-align: center; padding: 12px;">Nenhuma revisão finalizada ainda.</td></tr>`;
    } else {
      let html = "";
      for (const item of rq.completed) {
        const helpBadgeClass = `badge-help-${item.review_help_level || 0}`;
        const helpNames = ["0: Solo", "1: Dica", "2: Ideia", "3: Editorial", "4: Copiado"];
        const helpText = helpNames[item.review_help_level] || `Ajuda ${item.review_help_level}`;

        html += `
          <tr>
            <td>
              <strong>${item.problem_title}</strong>
              <div style="font-size: 0.72rem; color: var(--text-dim); font-family: var(--font-mono);">${item.problem_id}</div>
            </td>
            <td>${item.review_date || '-'}</td>
            <td><span class="badge badge-cycle">Ciclo ${item.cycle}</span></td>
            <td><span class="badge badge-ac">${item.review_result || 'AC'}</span></td>
            <td style="font-family: var(--font-mono);">${item.review_time_min ? item.review_time_min + 'm' : '-'}</td>
            <td><span class="badge ${helpBadgeClass}">${helpText}</span></td>
            <td style="font-size: 0.8rem; color: var(--text-muted);">${item.notes || '-'}</td>
          </tr>
        `;
      }
      completedBody.innerHTML = html;
    }
  },

  renderRecentAttempts() {
    const container = document.getElementById("dash-recent-attempts-body");
    const attempts = this.data.metrics.recent_attempts;
    if (!attempts || attempts.length === 0) {
      container.innerHTML = `<tr><td colspan="6" style="color: var(--text-dim); text-align: center;">Nenhuma tentativa registrada.</td></tr>`;
      return;
    }
    let html = "";
    for (const att of attempts) {
      const resClass = att.result === "AC" ? "badge-ac" : (att.result === "WA" ? "badge-wa" : "badge-tle");
      const helpClass = `badge-help-${att.help_level || 0}`;
      const prob = (this.data.problems || []).find(p => p.problem_id === att.problem_id) || {};
      let titleHtml = att.problem_title;
      if (prob.link) {
         titleHtml = `<a href="${prob.link}" target="_blank" style="color: var(--accent-cyan); text-decoration: none;">${att.problem_title}</a>`;
      }
      html += `
        <tr>
          <td style="white-space: nowrap;">${att.date || ''}</td>
          <td>
            <div style="font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="${att.problem_title}">
              ${titleHtml}
            </div>
            <div style="font-size: 0.72rem; color: var(--text-dim); font-family: var(--font-mono);">${att.problem_id}</div>
          </td>
          <td><span class="badge ${resClass}">${att.result}</span></td>
          <td style="font-family: var(--font-mono);">${att.total_time_min}m</td>
          <td><span class="badge ${helpClass}">Ajuda ${att.help_level}</span></td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">${att.main_topic || ''}</td>
        </tr>
      `;
    }
    container.innerHTML = html;
  },
  
  populateTopicSelect() {
    const select = document.getElementById("log-main-topic");
    select.innerHTML = `<option value="">Selecione um tópico...</option>`;
    
    const groups = {};
    for (const t of this.data.topics) {
      const cat = t.category || "Outros";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(t);
    }

    for (const [cat, topList] of Object.entries(groups)) {
      const optgroup = document.createElement("optgroup");
      optgroup.label = cat;
      for (const t of topList) {
        const opt = document.createElement("option");
        opt.value = t.topic_id;
        opt.textContent = `${t.name} (ICPC Peso: ${t.icpc_weight})`;
        optgroup.appendChild(opt);
      }
      select.appendChild(optgroup);
    }
  },

  populateProblemsDatalist() {
    const datalist = document.getElementById("problems-datalist");
    datalist.innerHTML = "";
    for (const p of this.data.problems) {
      const opt = document.createElement("option");
      opt.value = p.problem_id;
      opt.textContent = `${p.title} (${p.platform})`;
      datalist.appendChild(opt);
    }
  },

  renderErrorBadges() {
    const grid = document.getElementById("error-badges-grid");
    const errors = this.data.taxonomy.errors;
    let html = "";
    for (const [code, desc] of Object.entries(errors)) {
      html += `
        <div class="error-badge-item" id="err-badge-${code}" onclick="app.toggleErrorBadge('${code}')">
          <span class="code">${code}</span>
          <span>${desc}</span>
        </div>
      `;
    }
    grid.innerHTML = html;
  },

  toggleErrorBadge(code) {
    const el = document.getElementById(`err-badge-${code}`);
    if (this.selectedErrors.has(code)) {
      this.selectedErrors.delete(code);
      el.classList.remove("active");
    } else {
      this.selectedErrors.add(code);
      el.classList.add("active");
    }
  },

  setHelpLevel(level) {
    this.selectedHelpLevel = level;
    document.getElementById("log-help-level").value = level;
    
    // Atualiza classes ativas
    const options = document.querySelectorAll("#help-level-selector .pill-option");
    options.forEach(opt => {
      if (parseInt(opt.getAttribute("data-level")) === level) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });

    // Se ajuda >= 2, marca automaticamente a fila de revisão para retenção
    const chk = document.getElementById("log-add-review");
    if (level >= 2) {
      chk.checked = true;
    }
  },

  onResultChange(result) {
    const chk = document.getElementById("log-add-review");
    if (result !== "AC") {
      chk.checked = true;
    }
  },

  onProblemSelected(problemId) {
    const pid = (problemId || "").trim();
    const prob = this.data.problems.find(p => 
      (p.problem_id && p.problem_id.toLowerCase() === pid.toLowerCase()) || 
      (p.title && p.title.toLowerCase() === pid.toLowerCase())
    );
    if (prob) {
      document.getElementById("log-problem-id").value = prob.problem_id;
      document.getElementById("log-problem-title").value = prob.title || "";
      document.getElementById("log-problem-link").value = prob.link || "";
      document.getElementById("log-platform").value = prob.platform || "Outros";
      document.getElementById("log-main-topic").value = prob.main_topic || "";
      document.getElementById("log-diff-val").value = prob.difficulty_value || "";
      document.getElementById("log-diff-src").value = prob.difficulty_source || "";
    }
  },

  openLogModal() {
    this.selectedErrors.clear();
    document.querySelectorAll(".error-badge-item").forEach(el => el.classList.remove("active"));
    this.setHelpLevel(0);
    document.getElementById("form-log-attempt").reset();
    document.getElementById("log-problem-link").value = "";
    document.getElementById("log-add-review").checked = false;
    document.getElementById("modal-log").classList.add("active");
    setTimeout(() => {
      document.getElementById("log-problem-id").focus();
    }, 50);
  },

  closeLogModal() {
    document.getElementById("modal-log").classList.remove("active");
  },

  async submitAttempt(event) {
    event.preventDefault();

    const pid = document.getElementById("log-problem-id").value.trim();
    const title = document.getElementById("log-problem-title").value.trim() || pid;
    const link = document.getElementById("log-problem-link").value.trim();
    const platform = document.getElementById("log-platform").value;
    const mainTopic = document.getElementById("log-main-topic").value;
    const diffVal = document.getElementById("log-diff-val").value.trim();
    const diffSrc = document.getElementById("log-diff-src").value.trim();
    const result = document.getElementById("log-result").value;
    const timeMin = parseInt(document.getElementById("log-time").value);
    const helpLvl = this.selectedHelpLevel;
    const errors = Array.from(this.selectedErrors).sort().join(";");
    const notes = document.getElementById("log-notes").value.trim();
    const addReview = document.getElementById("log-add-review").checked;

    if (!pid || !result || isNaN(timeMin)) {
      alert("Por favor, preencha todos os campos obrigatórios (Problema, Resultado e Tempo).");
      return;
    }

    const payload = {
      problem_id: pid,
      title: title,
      link: link,
      platform: platform,
      main_topic: mainTopic,
      difficulty_value: diffVal,
      difficulty_source: diffSrc,
      result: result,
      total_time_min: timeMin,
      help_level: helpLvl,
      errors: errors,
      notes: notes,
      add_to_review: addReview
    };

    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        alert("Erro ao salvar: " + data.error);
        return;
      }

      this.closeLogModal();
      await this.fetchProblems();
    await this.fetchAttempts();
      await this.refreshData();
    } catch (err) {
      alert("Falha na comunicação com o servidor: " + err.message);
    }
  },

  // Modal de Revisão
  openReviewModal(item) {
    document.getElementById("rev-item-id").value = item.review_id;
    document.getElementById("rev-modal-problem-title").textContent = item.problem_title;
    document.getElementById("rev-modal-sub").textContent = `${item.problem_id} • Ciclo ${item.cycle} • Vencimento: ${item.due_date}`;
    document.getElementById("rev-time").value = "";
    document.getElementById("rev-notes").value = "";
    document.getElementById("rev-result").value = "AC";
    this.setRevHelpLevel(0);
    document.getElementById("modal-review").classList.add("active");
    setTimeout(() => document.getElementById("rev-time").focus(), 50);
  },

  closeReviewModal() {
    document.getElementById("modal-review").classList.remove("active");
  },

  setRevHelpLevel(level) {
    this.selectedRevHelpLevel = level;
    document.getElementById("rev-help-level").value = level;
    const options = document.querySelectorAll("#rev-help-selector .pill-option");
    options.forEach(opt => {
      if (parseInt(opt.getAttribute("data-rev-level")) === level) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });
  },

  async submitReviewCompletion(event) {
    event.preventDefault();
    const reviewId = document.getElementById("rev-item-id").value;
    const res = document.getElementById("rev-result").value;
    const timeMin = parseInt(document.getElementById("rev-time").value);
    const helpLvl = this.selectedRevHelpLevel;
    const scheduleNext = document.getElementById("rev-schedule-next").checked;
    const notes = document.getElementById("rev-notes").value.trim();

    if (isNaN(timeMin)) {
      alert("Informe o tempo gasto na revisão.");
      return;
    }

    try {
      const response = await fetch("/api/reviews/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_id: reviewId,
          review_result: res,
          review_time_min: timeMin,
          review_help_level: helpLvl,
          schedule_next_cycle: scheduleNext,
          notes: notes
        })
      });
      const data = await response.json();
      if (data.error) {
        alert("Erro: " + data.error);
        return;
      }
      this.closeReviewModal();
      await this.refreshData();
    } catch (err) {
      alert("Falha na requisição: " + err.message);
    }
  },

  // ==========================================
  // Métodos de Contests / Simulados (Módulo 2A)
  // ==========================================
  renderContestsSection() {
    const cData = (this.data.metrics && this.data.metrics.contests) || {
      count: 0,
      avg_solved: 0.0,
      best_contest: null,
      pending_upsolving_count: 0,
      history: []
    };

    // Atualiza mini KPI bar
    const totalEl = document.getElementById("ckpi-total");
    const avgEl = document.getElementById("ckpi-avg");
    const bestEl = document.getElementById("ckpi-best");
    const pendEl = document.getElementById("ckpi-pending");

    if (totalEl) totalEl.textContent = cData.count;
    if (avgEl) avgEl.textContent = Number(cData.avg_solved || 0).toFixed(1);
    if (pendEl) pendEl.textContent = cData.pending_upsolving_count;

    if (bestEl) {
      if (cData.best_contest) {
        bestEl.textContent = `${cData.best_contest.solved_count} ACs (${cData.best_contest.name})`;
        bestEl.title = `Penalidade: ${cData.best_contest.penalty_min} min`;
      } else {
        bestEl.textContent = "-";
      }
    }

    // Tabela de Histórico
    const tbody = document.getElementById("contests-history-body");
    if (!tbody) return;

    if (!cData.history || cData.history.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="color: var(--text-dim); text-align: center; padding: 18px;">Nenhum contest registrado ainda. Clique em "+ Novo Contest" para cadastrar seu primeiro simulado.</td></tr>`;
      return;
    }

    let html = "";
    for (const c of cData.history) {
      let probsHtml = "";
      if (c.problem_ids) {
        const pids = c.problem_ids.split(";").filter(p => p.trim());
        probsHtml = pids.map(p => `<span class="contest-prob-tag">${p}</span>`).join(" ");
      } else {
        probsHtml = `<span style="color: var(--text-dim); font-size: 0.75rem;">Nenhum</span>`;
      }

      html += `
        <tr>
          <td><span style="font-family: var(--font-mono); font-size: 0.8rem;">${c.contest_date || '-'}</span></td>
          <td>
            <strong>${c.name}</strong>
            <div style="font-size: 0.72rem; color: var(--text-dim); font-family: var(--font-mono);">${c.contest_id}</div>
          </td>
          <td><span class="badge" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8;">${c.platform || 'BOCA'}</span></td>
          <td>
            <span class="badge badge-ac" style="font-size: 0.82rem;">${c.solved_count} AC</span>
            <span style="font-size: 0.78rem; color: var(--text-muted); margin-left: 4px;">/ ${c.attempted_count} tent. (total: ${c.problems_count})</span>
          </td>
          <td style="font-family: var(--font-mono);">${c.penalty_min ? c.penalty_min + 'm' : '0m'}</td>
          <td style="font-family: var(--font-mono); font-size: 0.8rem;">
            <span style="color: var(--accent-red); margin-right: 6px;">WA: ${c.wa_count || 0}</span>
            <span style="color: var(--accent-yellow); margin-right: 6px;">TLE: ${c.tle_count || 0}</span>
            <span style="color: var(--accent-purple);">RE: ${c.re_count || 0}</span>
          </td>
          <td style="max-width: 220px;">${probsHtml}</td>
          <td style="font-size: 0.8rem; color: var(--text-muted); max-width: 200px;">${c.notes || '-'}</td>
        </tr>
      `;
    }
    tbody.innerHTML = html;
  },

  openContestModal() {
    document.getElementById("form-log-contest").reset();
    document.getElementById("contest-date").value = new Date().toISOString().slice(0, 10);
    document.getElementById("contest-duration").value = "300";
    document.getElementById("contest-penalty").value = "0";
    document.getElementById("contest-wa").value = "0";
    document.getElementById("contest-tle").value = "0";
    document.getElementById("contest-re").value = "0";
    
    // Inicia com 5 problemas padrão (A a E)
    this.generateContestLetters(5);
    document.getElementById("modal-contest").classList.add("active");
    setTimeout(() => {
      document.getElementById("contest-name").focus();
    }, 50);
  },

  closeContestModal() {
    document.getElementById("modal-contest").classList.remove("active");
  },

  generateContestLetters(count) {
    const list = document.getElementById("contest-problems-list");
    if (!list) return;
    list.innerHTML = "";
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let i = 0; i < count && i < letters.length; i++) {
      this.addContestProblemRow(letters[i]);
    }
    this.updateContestAutoCounts();
  },

  addContestProblemRow(letter = "", problemId = "", result = "NOT_TRIED") {
    const list = document.getElementById("contest-problems-list");
    if (!list) return;
    const rowCount = list.children.length;
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const assignedLetter = letter || (rowCount < letters.length ? letters[rowCount] : `P${rowCount + 1}`);

    const tr = document.createElement("tr");
    tr.className = "contest-problem-entry";
    tr.innerHTML = `
      <td>
        <span class="letter-pill">${assignedLetter}</span>
        <input type="hidden" class="cp-letter" value="${assignedLetter}">
      </td>
      <td>
        <input 
          type="text" 
          class="form-input cp-problem-id" 
          list="problems-datalist"
          placeholder="problem_id existente ou novo" 
          value="${problemId}"
          style="padding: 6px 10px; font-size: 0.82rem;"
        >
      </td>
      <td>
        <select class="form-select cp-result" style="padding: 6px 10px; font-size: 0.82rem;" onchange="app.updateContestAutoCounts()">
          <option value="NOT_TRIED" ${result === 'NOT_TRIED' ? 'selected' : ''}>Não Tentei</option>
          <option value="AC" ${result === 'AC' ? 'selected' : ''}>AC (Accepted)</option>
          <option value="WA" ${result === 'WA' ? 'selected' : ''}>WA (Wrong Answer)</option>
          <option value="TLE" ${result === 'TLE' ? 'selected' : ''}>TLE (Time Limit)</option>
          <option value="RE" ${result === 'RE' ? 'selected' : ''}>RE (Runtime Error)</option>
        </select>
      </td>
      <td style="text-align: center;">
        <button type="button" style="background: transparent; border: none; color: var(--accent-red); cursor: pointer; font-size: 1.2rem; line-height: 1;" onclick="app.removeContestProblemRow(this)" title="Remover problema">&times;</button>
      </td>
    `;
    list.appendChild(tr);
    this.updateContestAutoCounts();
  },

  removeContestProblemRow(btn) {
    const tr = btn.closest("tr");
    if (tr) {
      tr.remove();
      this.updateContestAutoCounts();
    }
  },

  updateContestAutoCounts() {
    const list = document.getElementById("contest-problems-list");
    if (!list) return;
    const rows = list.querySelectorAll(".contest-problem-entry");
    let total = rows.length;
    let solved = 0;
    let attempted = 0;

    rows.forEach(r => {
      const res = r.querySelector(".cp-result").value;
      if (res === "AC") {
        solved++;
        attempted++;
      } else if (res !== "NOT_TRIED") {
        attempted++;
      }
    });

    const totEl = document.getElementById("contest-calc-total");
    const solEl = document.getElementById("contest-calc-solved");
    const attEl = document.getElementById("contest-calc-attempted");
    if (totEl) totEl.textContent = total;
    if (solEl) solEl.textContent = solved;
    if (attEl) attEl.textContent = attempted;
  },

  async submitContest(event) {
    event.preventDefault();

    const name = document.getElementById("contest-name").value.trim();
    const platform = document.getElementById("contest-platform").value;
    const date = document.getElementById("contest-date").value;
    const duration = parseInt(document.getElementById("contest-duration").value) || 300;
    const penalty = parseInt(document.getElementById("contest-penalty").value) || 0;
    const wa = parseInt(document.getElementById("contest-wa").value) || 0;
    const tle = parseInt(document.getElementById("contest-tle").value) || 0;
    const re = parseInt(document.getElementById("contest-re").value) || 0;
    const notes = document.getElementById("contest-notes").value.trim();

    if (!name) {
      alert("Por favor, informe o nome do contest.");
      return;
    }

    const rows = document.querySelectorAll("#contest-problems-list .contest-problem-entry");
    const problems = [];
    rows.forEach(r => {
      const letter = r.querySelector(".cp-letter").value;
      const pid = r.querySelector(".cp-problem-id").value.trim();
      const res = r.querySelector(".cp-result").value;
      if (pid) {
        problems.push({
          letter: letter,
          problem_id: pid,
          result: res
        });
      }
    });

    const solvedCount = problems.filter(p => p.result === "AC").length;
    const attemptedCount = problems.filter(p => p.result !== "NOT_TRIED").length;
    const problemsCount = problems.length > 0 ? problems.length : parseInt(document.getElementById("contest-calc-total").textContent || "0");

    const payload = {
      name: name,
      platform: platform,
      contest_date: date,
      duration_min: duration,
      problems_count: problemsCount,
      solved_count: solvedCount,
      attempted_count: attemptedCount,
      wa_count: wa,
      tle_count: tle,
      re_count: re,
      penalty_min: penalty,
      notes: notes,
      problems: problems
    };

    try {
      const res = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        alert("Erro ao salvar contest: " + data.error);
        return;
      }

      this.closeContestModal();
      await this.fetchProblems();
    await this.fetchAttempts();
      await this.refreshData();
    } catch (err) {
      alert("Falha na comunicação com o servidor: " + err.message);
    }
  },

  // ==========================================
  // Métodos de Upsolving (Módulo 2B)
  // ==========================================
  setUpsolveFilter(filter) {
    this.currentUpsolveFilter = filter;
    
    // Atualiza classes ativas nas abas
    const tabs = document.querySelectorAll("#upsolve-filter-pills .filter-tab");
    tabs.forEach(tab => {
      if (tab.getAttribute("data-filter") === filter) {
        tab.classList.add("active");
      } else {
        tab.classList.remove("active");
      }
    });

    this.renderUpsolvingCards();
  },

  renderUpsolvingSection() {
    const uData = (this.data.metrics && this.data.metrics.upsolving) || {
      total_count: 0,
      pending_count: 0,
      in_progress_count: 0,
      solved_count: 0,
      still_failed_count: 0,
      upsolve_rate: 0.0,
      avg_time_min: 0.0,
      avg_help_level: 0.0,
      solo_upsolve_count: 0,
      items: []
    };

    // Atualiza KPIs da barra
    const pendingEl = document.getElementById("ukpi-pending");
    const progressEl = document.getElementById("ukpi-progress");
    const solvedEl = document.getElementById("ukpi-solved");
    const rateEl = document.getElementById("ukpi-rate");
    const avgTimeEl = document.getElementById("ukpi-avg-time");
    const avgHelpEl = document.getElementById("ukpi-avg-help");
    const soloEl = document.getElementById("ukpi-solo");

    if (pendingEl) pendingEl.textContent = uData.pending_count;
    if (progressEl) progressEl.textContent = uData.in_progress_count;
    if (solvedEl) solvedEl.textContent = uData.solved_count;
    if (rateEl) rateEl.textContent = `${Number(uData.upsolve_rate || 0).toFixed(1)}%`;
    if (avgTimeEl) avgTimeEl.textContent = `${Number(uData.avg_time_min || 0).toFixed(0)}m`;
    if (avgHelpEl) avgHelpEl.textContent = Number(uData.avg_help_level || 0).toFixed(1);
    if (soloEl) soloEl.textContent = uData.solo_upsolve_count;

    // Atualiza contadores nas abas de filtro
    const fAll = document.getElementById("ufilter-all");
    const fPending = document.getElementById("ufilter-pending");
    const fProgress = document.getElementById("ufilter-progress");
    const fAc = document.getElementById("ufilter-ac");
    const fFailed = document.getElementById("ufilter-failed");

    if (fAll) fAll.textContent = uData.total_count;
    if (fPending) fPending.textContent = uData.pending_count;
    if (fProgress) fProgress.textContent = uData.in_progress_count;
    if (fAc) fAc.textContent = uData.solved_count;
    if (fFailed) fFailed.textContent = uData.still_failed_count;

    this.renderUpsolvingCards();
  },

  renderUpsolvingCards() {
    const container = document.getElementById("upsolving-cards-container");
    if (!container) return;

    const uData = (this.data.metrics && this.data.metrics.upsolving) || { items: [] };
    const allItems = uData.items || [];

    // Filtra apenas problemas que não foram resolvidos (AC) durante o contest oficial
    const candidateItems = allItems.filter(it => it.contest_result !== "AC");

    if (candidateItems.length === 0) {
      container.innerHTML = `
        <div style="color: var(--text-dim); text-align: center; padding: 28px; font-size: 0.9rem;">
          Nenhum problema pendente ou registrado para upsolving no momento. Ao cadastrar contests com problemas não resolvidos, eles aparecerão aqui automaticamente.
        </div>
      `;
      return;
    }

    // Aplica o filtro de status selecionado
    const filter = this.currentUpsolveFilter || "ALL";
    const filtered = candidateItems.filter(it => {
      const status = it.upsolve_status || "PENDING";
      const res = it.upsolve_result || status;
      if (filter === "ALL") return true;
      if (filter === "PENDING") return status === "PENDING";
      if (filter === "IN_PROGRESS") return status === "IN_PROGRESS";
      if (filter === "AC") return status === "AC" || res === "AC";
      if (filter === "STILL_FAILED") return status === "STILL_FAILED";
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="color: var(--text-dim); text-align: center; padding: 28px; font-size: 0.9rem;">
          Nenhum problema encontrado para o filtro <strong>${filter}</strong>.
        </div>
      `;
      return;
    }

    const helpLevelLabels = {
      0: "0 (Solo Total)",
      1: "1 (Pequena Dica)",
      2: "2 (Ideia / Técnica)",
      3: "3 (Editorial)",
      4: "4 (Código Adaptado)"
    };

    let html = "";
    for (const item of filtered) {
      const status = item.upsolve_status || "PENDING";
      const isSolved = status === "AC" || item.upsolve_result === "AC";
      
      let statusBadge = "";
      if (status === "AC" || item.upsolve_result === "AC") {
        statusBadge = `<span class="status-badge ac">✅ Resolvido (AC)</span>`;
      } else if (status === "IN_PROGRESS") {
        statusBadge = `<span class="status-badge in-progress">⚙️ Em Progresso</span>`;
      } else if (status === "STILL_FAILED") {
        statusBadge = `<span class="status-badge failed">❌ Não Resolvido</span>`;
      } else {
        statusBadge = `<span class="status-badge pending">⏳ Pendente</span>`;
      }

      // Título com link
      let titleHtml = `<strong>${item.problem_title || item.problem_id}</strong>`;
      if (item.link) {
        titleHtml = `<a href="${item.link}" target="_blank" rel="noopener noreferrer" title="Abrir link do enunciado">${item.problem_title || item.problem_id} 🔗</a>`;
      }

      // Dificuldade com valor e origem corretos
      let diffHtml = "";
      if (item.difficulty_value) {
        diffHtml = `<span class="badge" style="background: rgba(148, 163, 184, 0.15); color: #cbd5e1;">${item.difficulty_value}${item.difficulty_source ? ' • ' + item.difficulty_source : ''}</span>`;
      }

      // Taxonomia de erro explicada
      let origErrDesc = item.original_error || "-";
      if (item.original_error && this.data.taxonomy.errors && this.data.taxonomy.errors[item.original_error]) {
        origErrDesc = `${item.original_error} — ${this.data.taxonomy.errors[item.original_error]}`;
      }

      // Contest result badge
      let cResColor = "var(--accent-red)";
      if (item.contest_result === "NOT_TRIED" || item.contest_result === "NÃO TENTEI") {
        cResColor = "var(--text-dim)";
      }

      html += `
        <div class="upsolve-card">
          <div class="upsolve-card-header">
            <div class="upsolve-prob-meta">
              <span class="letter-pill">${item.problem_letter || '?'}</span>
              <div class="upsolve-prob-title">
                ${titleHtml}
              </div>
              <span class="badge" style="background: rgba(56, 189, 248, 0.12); color: #38bdf8;">${item.problem_id}</span>
              ${item.main_topic ? `<span class="badge" style="background: rgba(168, 85, 247, 0.15); color: #c084fc;">${item.main_topic}</span>` : ''}
              ${diffHtml}
              <span style="font-size: 0.78rem; color: var(--text-dim);">• Contest: <strong>${item.contest_name}</strong> (${item.contest_date || '-'})</span>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              ${statusBadge}
              <button 
                class="btn ${isSolved ? 'btn-secondary' : 'btn-primary'} btn-sm"
                onclick="app.openUpsolveModal('${item.upsolve_id}')"
              >
                ${isSolved ? '✏️ Editar Upsolve' : '🎯 Fazer Upsolve'}
              </button>
            </div>
          </div>

          <!-- Comparação Visual: Contest × Upsolve -->
          <div class="upsolve-comparison-grid">
            
            <!-- Lado Contest -->
            <div class="contest-side">
              <div class="side-header">
                <span>Durante o Contest</span>
                <span style="color: ${cResColor}; font-family: var(--font-mono); font-weight: 800;">${item.contest_result || 'NÃO TENTEI'}</span>
              </div>
              <div class="upsolve-detail-row">
                <span class="upsolve-detail-label">Tempo na Prova:</span>
                <span class="upsolve-detail-val" style="font-family: var(--font-mono);">${item.contest_time_min ? item.contest_time_min + ' min' : 'Não registrado'}</span>
              </div>
              <div class="upsolve-detail-row">
                <span class="upsolve-detail-label">Motivo Falha:</span>
                <span class="upsolve-detail-val" style="color: var(--accent-yellow); font-weight: 600;">${item.contest_failure_reason || 'Não informado'}</span>
              </div>
              <div class="upsolve-detail-row">
                <span class="upsolve-detail-label">Erro Original:</span>
                <span class="upsolve-detail-val" style="font-size: 0.8rem;">${origErrDesc}</span>
              </div>
            </div>

            <!-- Divisor / Seta de Evolução -->
            <div class="comparison-arrow">➔</div>

            <!-- Lado Upsolve -->
            <div class="upsolve-side">
              <div class="side-header">
                <span>Evolução no Upsolve</span>
                <span style="color: ${isSolved ? 'var(--accent-green)' : 'var(--accent-cyan)'}; font-family: var(--font-mono); font-weight: 800;">
                  ${item.upsolve_result || status}
                </span>
              </div>
              <div class="upsolve-detail-row">
                <span class="upsolve-detail-label">Tempo Upsolve:</span>
                <span class="upsolve-detail-val" style="font-family: var(--font-mono);">${item.upsolve_time_min ? item.upsolve_time_min + ' min' : '-'}</span>
              </div>
              <div class="upsolve-detail-row">
                <span class="upsolve-detail-label">Nível de Ajuda:</span>
                <span class="upsolve-detail-val">
                  ${helpLevelLabels[item.help_level] !== undefined ? helpLevelLabels[item.help_level] : (item.help_level || '-')}
                </span>
              </div>
              <div class="upsolve-detail-row">
                <span class="upsolve-detail-label">Técnica:</span>
                <span class="upsolve-detail-val" style="color: var(--accent-cyan); font-weight: 600;">${item.technique_learned || '-'}</span>
              </div>
              ${item.insight ? `
                <div class="insight-quote">
                  <strong>💡 Key Insight:</strong> ${item.insight}
                </div>
              ` : ''}
              ${item.notes ? `
                <div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 4px;">
                  <em>Obs: ${item.notes}</em>
                </div>
              ` : ''}
            </div>

          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  },

  openUpsolveModal(upsolveId) {
    const uData = (this.data.metrics && this.data.metrics.upsolving) || { items: [] };
    const item = (uData.items || []).find(it => it.upsolve_id === upsolveId);
    if (!item) {
      alert("Item de upsolving não encontrado.");
      return;
    }

    document.getElementById("form-upsolve").reset();

    document.getElementById("upsolve-id").value = item.upsolve_id;
    document.getElementById("upsolve-prob-id").value = item.problem_id;
    document.getElementById("upsolve-contest-id").value = item.contest_id;

    // Subtítulo do modal
    const subTitleEl = document.getElementById("upsolve-modal-subtitle");
    if (subTitleEl) {
      subTitleEl.textContent = `${item.contest_name} • Letra ${item.problem_letter || '?'} • ${item.problem_id} (${item.problem_title || ''})`;
    }

    // Seção Diagnóstico da Prova
    const failReasonSelect = document.getElementById("upsolve-failure-reason");
    if (failReasonSelect) {
      failReasonSelect.value = item.contest_failure_reason || "não tentei";
    }
    const origErrSelect = document.getElementById("upsolve-original-error");
    if (origErrSelect) {
      origErrSelect.value = item.original_error || "";
    }
    document.getElementById("upsolve-contest-time").value = item.contest_time_min || "";

    // Seção Resolução no Upsolve
    const statusSelect = document.getElementById("upsolve-status");
    const currentStatus = item.upsolve_status || "PENDING";
    statusSelect.value = currentStatus === "PENDING" ? "AC" : currentStatus;
    
    const resultSelect = document.getElementById("upsolve-result");
    resultSelect.value = item.upsolve_result && item.upsolve_result !== "PENDING" ? item.upsolve_result : "AC";
    
    document.getElementById("upsolve-time-min").value = item.upsolve_time_min || "";
    this.setUpsolveHelpLevel(parseInt(item.help_level || 0));

    document.getElementById("upsolve-technique").value = item.technique_learned || "";
    document.getElementById("upsolve-insight").value = item.insight || "";
    document.getElementById("upsolve-notes").value = item.notes || "";

    // Seção Integrações
    document.getElementById("upsolve-schedule-review").checked = true;
    document.getElementById("upsolve-review-cycle").value = "1";
    document.getElementById("upsolve-create-pattern").checked = false;
    this.togglePatternFields(false);

    // Preenche tópicos para o pattern
    const patTopicSelect = document.getElementById("pat-topic");
    if (patTopicSelect) {
      patTopicSelect.innerHTML = "";
      for (const t of this.data.topics) {
        const opt = document.createElement("option");
        opt.value = t.topic_id;
        opt.textContent = `${t.name} (${t.category})`;
        if (item.main_topic && (t.topic_id === item.main_topic || t.name === item.main_topic)) {
          opt.selected = true;
        }
        patTopicSelect.appendChild(opt);
      }
    }

    document.getElementById("modal-upsolve").classList.add("active");
    setTimeout(() => {
      document.getElementById("upsolve-time-min").focus();
    }, 50);
  },

  closeUpsolveModal() {
    const modal = document.getElementById("modal-upsolve");
    if (modal) modal.classList.remove("active");
  },

  setUpsolveHelpLevel(level) {
    this.selectedUpsolveHelpLevel = level;
    document.getElementById("upsolve-help-level").value = level;

    const options = document.querySelectorAll("#upsolve-help-selector .pill-option");
    options.forEach(opt => {
      if (parseInt(opt.getAttribute("data-upsolve-level")) === level) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });
  },

  onUpsolveStatusChange(status) {
    const resSelect = document.getElementById("upsolve-result");
    if (status === "AC") {
      resSelect.value = "AC";
    } else if (status === "STILL_FAILED") {
      resSelect.value = "WA";
    }
  },

  togglePatternFields(checked) {
    const box = document.getElementById("upsolve-pattern-fields");
    if (box) {
      box.style.display = checked ? "block" : "none";
    }
  },

  async submitUpsolve(event) {
    event.preventDefault();

    const upsolveId = document.getElementById("upsolve-id").value;
    const failureReason = document.getElementById("upsolve-failure-reason").value;
    const origError = document.getElementById("upsolve-original-error").value;
    const contestTime = document.getElementById("upsolve-contest-time").value;

    const status = document.getElementById("upsolve-status").value;
    const result = document.getElementById("upsolve-result").value;
    const timeMin = parseInt(document.getElementById("upsolve-time-min").value) || 0;
    const helpLvl = this.selectedUpsolveHelpLevel;
    const technique = document.getElementById("upsolve-technique").value.trim();
    const insight = document.getElementById("upsolve-insight").value.trim();
    const notes = document.getElementById("upsolve-notes").value.trim();

    const scheduleReview = document.getElementById("upsolve-schedule-review").checked;
    const reviewCycle = document.getElementById("upsolve-review-cycle").value;

    const createPattern = document.getElementById("upsolve-create-pattern").checked;
    const patTitle = document.getElementById("pat-title").value.trim();
    const patTopic = document.getElementById("pat-topic").value;
    const patTriggers = document.getElementById("pat-triggers").value.trim();
    const patIdea = document.getElementById("pat-idea").value.trim();

    const payload = {
      upsolve_id: upsolveId,
      contest_failure_reason: failureReason,
      original_error: origError,
      contest_time_min: contestTime,
      upsolve_status: status,
      upsolve_result: result,
      upsolve_time_min: timeMin,
      help_level: helpLvl,
      technique_learned: technique,
      insight: insight,
      notes: notes,
      schedule_review: scheduleReview,
      review_cycle: reviewCycle,
      create_pattern: createPattern,
      pattern_title: patTitle,
      pattern_topic_id: patTopic,
      pattern_triggers: patTriggers,
      pattern_key_idea: patIdea
    };

    try {
      const res = await fetch("/api/upsolving", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.error) {
        alert("Erro ao salvar upsolving: " + data.error);
        return;
      }

      this.closeUpsolveModal();
      await this.fetchProblems();
    await this.fetchAttempts();
      await this.refreshData();
    } catch (err) {
      alert("Falha na comunicação com o servidor: " + err.message);
    }
  }
};

window.addEventListener("DOMContentLoaded", () => {
  app.init();
});
