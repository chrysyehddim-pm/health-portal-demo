(function(){
  const $ = (id) => document.getElementById(id);
  const recordsData = window.GOHEALTH_DATA?.brainRecords || {};
  const games = Array.isArray(recordsData.games) ? recordsData.games : [];
  const badges = Array.isArray(recordsData.badges) ? recordsData.badges : [];
  const summary = recordsData.summary || {};
  const stage = new URLSearchParams(window.location.search).get('stage') === 'p16' ? 'p16' : 'p15';
  let selectedGameId = games[0]?.id || '';
  let feedbackTimer = null;
  let lastFocusedElement = null;

  const safe = (value) => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const chartColors = {
    blue: '#3b82f6',
    purple: '#8b5cf6',
    orange: '#f97316',
    emerald: '#10b981'
  };

  function recordTimestamp(record){
    const normalizedDate = String(record?.date || '').replaceAll('/', '-');
    const timestamp = Date.parse(`${normalizedDate}T${record?.time || '00:00'}:00+08:00`);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }

  function isCompleted(record){
    return !record?.status || ['success', 'completed'].includes(record.status);
  }

  function referenceDate(){
    const normalized = String(summary.referenceDate || '').replaceAll('/', '-');
    const parsed = normalized ? new Date(`${normalized}T23:59:59+08:00`) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  function recentRecords(game, limit = 10){
    const cutoff = referenceDate();
    cutoff.setMonth(cutoff.getMonth() - 3);
    return [...(game.records || [])]
      .filter(record => isCompleted(record) && recordTimestamp(record) >= cutoff.getTime())
      .sort((a, b) => recordTimestamp(b) - recordTimestamp(a))
      .slice(0, limit);
  }

  function formatRecordTime(record){
    const parts = String(record?.date || '').split('/');
    const date = parts.length === 3 ? `${parts[1]}/${parts[2]}` : String(record?.date || '—');
    return { date, time: record?.time || '—' };
  }

  function formatFullDate(date){
    const parts = String(date || '').split('/');
    return parts.length === 3 ? `${parts[0]} 年 ${Number(parts[1])} 月 ${Number(parts[2])} 日` : String(date || '—');
  }

  function favoriteGameThisMonth(){
    const monthKey = String(summary.referenceDate || '').slice(0, 7);
    const ranked = games.map((game, index) => {
      const monthlyRecords = (game.records || []).filter(record => isCompleted(record) && String(record.date).startsWith(monthKey));
      return {
        index,
        name: game.name,
        count: monthlyRecords.length,
        latest: monthlyRecords.reduce((value, record) => Math.max(value, recordTimestamp(record)), 0)
      };
    }).filter(game => game.count > 0)
      .sort((a, b) => b.count - a.count || b.latest - a.latest || a.index - b.index);
    return ranked[0]?.name || '本月尚無紀錄';
  }

  function renderStage(){
    const badgesSection = $('badges-section');
    badgesSection?.classList.toggle('hidden-view', stage !== 'p16');
  }

  function renderSummary(){
    $('summary-days').textContent = summary.interactionDays ?? '—';
    $('summary-games').textContent = summary.completedGames ?? '—';
    $('summary-date').textContent = summary.lastInteractionDate || '—';
    $('summary-favorite').textContent = favoriteGameThisMonth();
  }

  function renderTabs(){
    $('game-tabs').innerHTML = games.map(game => `
      <button class="game-tab ${game.id === selectedGameId ? 'active' : ''}" id="game-tab-${safe(game.id)}" type="button" role="tab" aria-selected="${game.id === selectedGameId}" aria-controls="game-record-panel" data-game-id="${safe(game.id)}" tabindex="${game.id === selectedGameId ? '0' : '-1'}">
        <i class="fa-solid ${safe(game.icon)}" aria-hidden="true"></i>
        <span class="game-tab-copy">
          <span>${safe(game.name)}</span>
          <small class="game-tab-status"><i class="fa-solid fa-check" aria-hidden="true"></i> 已選擇</small>
        </span>
      </button>
    `).join('');

    document.querySelectorAll('.game-tab').forEach((button, index) => {
      button.addEventListener('click', () => selectGame(button.dataset.gameId));
      button.addEventListener('keydown', event => {
        if(!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
        const nextIndex = (index + direction + games.length) % games.length;
        const nextGame = games[nextIndex];
        selectGame(nextGame.id);
        document.getElementById(`game-tab-${nextGame.id}`)?.focus();
      });
    });
  }

  function showSwitchFeedback(game, switched = false){
    const feedback = $('game-switch-feedback');
    if(!feedback || !game || !switched) return;
    clearTimeout(feedbackTimer);
    feedback.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> 已切換為：<strong>${safe(game.name)}</strong>`;
    feedback.classList.remove('hidden-view');
    feedbackTimer = window.setTimeout(() => {
      feedback.classList.add('hidden-view');
      feedback.textContent = '';
    }, 1800);
  }

  function renderRecentPerformance(game){
    const pr = Number(game.recentPerformance?.pr);
    $('peer-pr').textContent = Number.isFinite(pr) ? `PR ${pr}` : 'PR —';
    $('peer-performance-level').textContent = game.recentPerformance?.level || 'LV —';
    $('peer-updated').textContent = game.recentPerformance?.updatedAt
      ? `資料更新：${game.recentPerformance.updatedAt}・每日更新一次`
      : '資料每日更新一次';
  }

  function renderChart(game){
    const chart = $('record-chart');
    const records = recentRecords(game).reverse();
    if(!records.length){
      chart.innerHTML = '<title>近期完成時間折線圖</title><text x="180" y="110" text-anchor="middle" fill="#94a3b8">最近三個月沒有完成紀錄</text>';
      return;
    }

    const width = 360;
    const height = 180;
    const padding = { top: 28, right: 18, bottom: 28, left: 40 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const values = records.map(record => Number(record.seconds));
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const minValue = Math.max(0, Math.floor((rawMin - 10) / 10) * 10);
    const maxValue = Math.ceil((rawMax + 10) / 10) * 10;
    const range = Math.max(10, maxValue - minValue);
    const xAt = index => padding.left + (records.length === 1 ? plotWidth / 2 : (plotWidth * index) / (records.length - 1));
    const yAt = value => padding.top + ((maxValue - value) / range) * plotHeight;
    const color = chartColors[game.accent] || chartColors.emerald;

    const grid = Array.from({ length: 4 }, (_, index) => {
      const value = maxValue - (range * index) / 3;
      const y = padding.top + (plotHeight * index) / 3;
      return `<line class="chart-grid" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>
        <text class="chart-axis-label" x="${padding.left - 8}" y="${y + 4}" text-anchor="end">${Math.round(value)}</text>`;
    }).join('');

    const points = records.map((record, index) => `${xAt(index)},${yAt(record.seconds)}`).join(' ');
    const dots = records.map((record, index) => {
      const x = xAt(index);
      const y = yAt(record.seconds);
      const levelShort = String(record.level).replace('Level ', 'L');
      return `<g tabindex="0" role="img" aria-label="${safe(record.date)} ${safe(record.time)}，${safe(record.level)}，完成 ${safe(record.seconds)} 秒">
        <title>${safe(record.date)} ${safe(record.time)}・${safe(record.level)}・${safe(record.seconds)} 秒</title>
        <text class="chart-level" x="${x}" y="${Math.max(13, y - 10)}">${safe(levelShort)}</text>
        <circle class="chart-dot" cx="${x}" cy="${y}" r="5" fill="${color}"></circle>
      </g>`;
    }).join('');

    chart.innerHTML = `
      <title id="chart-title">${safe(game.name)}最近十次完成時間折線圖</title>
      <desc id="chart-description">顯示最近三個月內最多十筆完成秒數，每個資料點皆標示挑戰 Level，右側為最近一次。</desc>
      ${grid}
      <polyline class="chart-line" points="${points}" stroke="${color}"></polyline>
      ${dots}
      <text class="chart-order-label" x="${padding.left}" y="${height - 10}" text-anchor="start">較早</text>
      <text class="chart-order-label" x="${width - padding.right}" y="${height - 10}" text-anchor="end">最近</text>
    `;
    chart.setAttribute('aria-label', `${game.name}最近三個月內最多十筆完成秒數，每筆皆標示 Level，右側為最近一次`);
  }

  function renderList(game){
    const list = recentRecords(game);
    $('record-list').innerHTML = list.length ? list.map(record => {
      const completed = formatRecordTime(record);
      return `
      <article class="record-row" aria-label="${safe(record.date)} ${safe(record.time)}，${safe(record.level)}，完成 ${safe(record.seconds)} 秒">
        <time datetime="${safe(record.date.replaceAll('/', '-'))}T${safe(record.time)}"><span>${safe(completed.date)}</span><small>${safe(completed.time)}</small></time>
        <span class="level-badge">${safe(record.level)}</span>
        <strong>${safe(record.seconds)} <span>秒</span></strong>
      </article>`;
    }).join('') : '<p class="record-empty">最近三個月沒有完成紀錄</p>';
  }

  function renderGame(){
    const game = games.find(item => item.id === selectedGameId);
    if(!game) return;
    const records = Array.isArray(game.records) ? [...game.records].sort((a, b) => recordTimestamp(b) - recordTimestamp(a)) : [];
    const latest = records.find(isCompleted);
    $('selected-game-name').textContent = game.name;
    $('selected-game-icon').className = `selected-game-icon accent-${game.accent || 'emerald'}`;
    $('selected-game-icon').innerHTML = `<i class="fa-solid ${safe(game.icon)}"></i>`;
    $('latest-level').textContent = latest?.level || '尚無紀錄';
    $('challenge-count').textContent = game.totalChallenges ?? records.length;
    renderRecentPerformance(game);
    renderChart({ ...game, records });
    renderList({ ...game, records });
  }

  function renderBadges(){
    const earnedCount = badges.filter(badge => badge.earned).length;
    $('badge-earned-count').textContent = `已取得 ${earnedCount}／${badges.length}`;
    $('badge-total-count').textContent = badges.length;
    $('all-badges-count').textContent = `${earnedCount}／${badges.length}`;
    $('all-badges-summary').textContent = `已取得 ${earnedCount} 枚，還有 ${badges.length - earnedCount} 枚等你一起收藏`;

    const mostRecentEarned = badges
      .filter(badge => badge.earned && badge.earnedAt)
      .sort((a, b) => String(b.earnedAt).localeCompare(String(a.earnedAt)))[0];
    const closestLocked = badges
      .filter(badge => !badge.earned && Number(badge.target) > 0)
      .sort((a, b) => (Number(b.progress) / Number(b.target)) - (Number(a.progress) / Number(a.target)))[0];
    const previewBadges = [mostRecentEarned, closestLocked].filter(Boolean);
    if(previewBadges.length < 2){
      badges.filter(badge => !previewBadges.includes(badge)).slice(0, 2 - previewBadges.length).forEach(badge => previewBadges.push(badge));
    }

    $('badge-preview-grid').innerHTML = previewBadges.map(badgeCard).join('');
    $('all-badges-grid').innerHTML = badges.map(badgeCard).join('');
    document.querySelectorAll('[data-badge-id]').forEach(button => {
      button.addEventListener('click', () => {
        const fromAllBadges = Boolean(button.closest('#modal-all-badges'));
        if(fromAllBadges) closeRecordsModal('modal-all-badges', false);
        showBadgeModal(button.dataset.badgeId);
        if(fromAllBadges) lastFocusedElement = $('badge-view-all');
      });
    });
  }

  function badgeCard(badge){
    const cappedProgress = Math.min(Number(badge.progress) || 0, Number(badge.target) || 0);
    const status = badge.cardStatus || (badge.earned ? '已取得' : `${cappedProgress}／${badge.target}`);
    return `
      <button class="badge-card ${badge.earned ? 'earned' : 'locked'} tone-${safe(badge.tone)}" type="button" data-badge-id="${safe(badge.id)}" aria-label="${safe(badge.name)}，${badge.earned ? '已取得' : '尚未取得'}，查看取得方式">
        <span class="badge-icon"><i class="fa-solid ${safe(badge.icon)}" aria-hidden="true"></i></span>
        <span class="badge-card-copy">
          <strong>${safe(badge.name)}</strong>
          <span class="badge-category">${safe(badge.category || '健康徽章')}</span>
          <small>${safe(status)}</small>
        </span>
        <i class="fa-solid fa-chevron-right badge-chevron" aria-hidden="true"></i>
      </button>
    `;
  }

  function openModal(id){
    const modal = $(id);
    if(!modal) return;
    lastFocusedElement = document.activeElement;
    modal.classList.remove('hidden-view');
    document.body.classList.add('modal-open');
    const sheet = modal.querySelector('.records-info-sheet');
    if(sheet) sheet.scrollTop = 0;
    (modal.querySelector('[data-modal-initial-focus]') || modal.querySelector('button'))?.focus({ preventScroll: true });
  }

  function closeRecordsModal(id, restoreFocus = true){
    $(id)?.classList.add('hidden-view');
    const hasOpenModal = ['modal-peer-info', 'modal-badge-info', 'modal-all-badges'].some(modalId => !$(modalId)?.classList.contains('hidden-view'));
    document.body.classList.toggle('modal-open', hasOpenModal);
    if(restoreFocus) lastFocusedElement?.focus?.();
  }

  function showBadgeModal(badgeId){
    const badge = badges.find(item => item.id === badgeId);
    if(!badge) return;
    $('badge-modal-icon').className = `badge-modal-icon tone-${badge.tone}`;
    $('badge-modal-icon').innerHTML = `<i class="fa-solid ${safe(badge.icon)}"></i>`;
    $('badge-modal-status').textContent = badge.earned ? '已取得徽章' : '再一起完成一小步';
    $('badge-modal-title').textContent = badge.name;
    $('badge-modal-description').textContent = badge.description;
    $('badge-modal-rule').textContent = badge.rule;
    $('badge-modal-progress').textContent = `${Math.min(badge.progress, badge.target)}／${badge.target}`;
    $('badge-modal-progress-fill').style.width = `${Math.min(100, (badge.progress / badge.target) * 100)}%`;
    $('badge-modal-earned-at').textContent = badge.progressCaption || (badge.earnedAt ? `取得日期：${formatFullDate(badge.earnedAt)}・徽章永久保留` : '完成條件後會自動取得並永久保留');
    openModal('modal-badge-info');
  }

  function selectGame(gameId){
    if(!games.some(game => game.id === gameId)) return;
    selectedGameId = gameId;
    renderTabs();
    renderGame();
    showSwitchFeedback(games.find(game => game.id === gameId), true);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderStage();
    renderSummary();
    renderBadges();
    renderTabs();
    renderGame();
    $('peer-info-button')?.addEventListener('click', () => openModal('modal-peer-info'));
    $('badge-view-all')?.addEventListener('click', () => openModal('modal-all-badges'));
    document.querySelectorAll('[data-close-modal]').forEach(button => {
      button.addEventListener('click', () => closeRecordsModal(button.dataset.closeModal));
    });
    ['modal-peer-info', 'modal-badge-info', 'modal-all-badges'].forEach(id => {
      $(id)?.addEventListener('click', () => closeRecordsModal(id));
    });
    document.addEventListener('keydown', event => {
      if(event.key !== 'Escape') return;
      const openModalId = ['modal-badge-info', 'modal-all-badges', 'modal-peer-info']
        .find(id => !$(id)?.classList.contains('hidden-view'));
      if(openModalId) closeRecordsModal(openModalId);
    });
  });
})();
