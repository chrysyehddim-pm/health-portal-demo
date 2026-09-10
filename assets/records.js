(function(){
  const $ = (id) => document.getElementById(id);
  const recordsData = window.GOHEALTH_DATA?.brainRecords || {};
  const games = Array.isArray(recordsData.games) ? recordsData.games : [];
  const summary = recordsData.summary || {};
  let selectedGameId = games[0]?.id || '';
  let feedbackTimer = null;

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

  function renderSummary(){
    $('summary-days').textContent = summary.interactionDays ?? '—';
    $('summary-games').textContent = summary.completedGames ?? '—';
    $('summary-date').textContent = summary.lastInteractionDate || '—';
    $('summary-favorite').textContent = favoriteGameThisMonth();
  }

  function renderTabs(){
    $('game-tabs').innerHTML = games.map((game, index) => `
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
    if(!feedback || !game) return;
    clearTimeout(feedbackTimer);
    const setMessage = prefix => {
      feedback.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${prefix}<strong>${safe(game.name)}</strong>`;
    };
    setMessage(switched ? '已切換為：' : '目前查看：');
    if(switched){
      feedbackTimer = window.setTimeout(() => setMessage('目前查看：'), 1800);
    }
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
      return `<g>
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
    $('record-list').innerHTML = recentRecords(game).map(record => {
      const completed = formatRecordTime(record);
      return `
      <article class="record-row" aria-label="${safe(record.date)} ${safe(record.time)}，${safe(record.level)}，完成 ${safe(record.seconds)} 秒">
        <time datetime="${safe(record.date.replaceAll('/', '-'))}T${safe(record.time)}"><span>${safe(completed.date)}</span><small>${safe(completed.time)}</small></time>
        <span class="level-badge">${safe(record.level)}</span>
        <strong>${safe(record.seconds)} <span>秒</span></strong>
      </article>`;
    }).join('');
  }

  function renderGame(){
    const game = games.find(item => item.id === selectedGameId);
    if(!game) return;
    const records = Array.isArray(game.records) ? [...game.records].sort((a, b) => recordTimestamp(b) - recordTimestamp(a)) : [];
    const latest = records.find(isCompleted);
    const sameLevelRecords = latest ? records.filter(record => isCompleted(record) && record.level === latest.level) : [];
    const best = sameLevelRecords.reduce((result, record) => !result || Number(record.seconds) < Number(result.seconds) ? record : result, null);

    $('selected-game-name').textContent = game.name;
    $('selected-game-icon').className = `selected-game-icon accent-${game.accent || 'emerald'}`;
    $('selected-game-icon').innerHTML = `<i class="fa-solid ${safe(game.icon)}"></i>`;
    $('latest-seconds').textContent = latest?.seconds ?? '—';
    $('latest-level').textContent = latest?.level || '尚無紀錄';
    $('best-seconds').textContent = best?.seconds ?? '—';
    $('best-level').textContent = best ? `${best.level}・完成於 ${formatRecordTime(best).date}` : '尚無紀錄';
    $('challenge-count').textContent = game.totalChallenges ?? records.length;
    renderChart({ ...game, records });
    renderList({ ...game, records });
  }

  function selectGame(gameId){
    if(!games.some(game => game.id === gameId)) return;
    selectedGameId = gameId;
    renderTabs();
    renderGame();
    showSwitchFeedback(games.find(game => game.id === gameId), true);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSummary();
    renderTabs();
    renderGame();
    showSwitchFeedback(games.find(game => game.id === selectedGameId));
  });
})();
