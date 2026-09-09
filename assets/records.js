(function(){
  const $ = (id) => document.getElementById(id);
  const recordsData = window.GOHEALTH_DATA?.brainRecords || {};
  const games = Array.isArray(recordsData.games) ? recordsData.games : [];
  const summary = recordsData.summary || {};
  let selectedGameId = games[0]?.id || '';

  const safe = (value) => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const chartColors = {
    blue: '#3b82f6',
    purple: '#8b5cf6',
    orange: '#f97316',
    emerald: '#10b981'
  };

  function shortDate(date){
    const parts = String(date).split('/');
    return parts.length === 3 ? `${parts[1]}/${parts[2]}` : String(date);
  }

  function renderSummary(){
    $('summary-days').textContent = summary.interactionDays ?? '—';
    $('summary-games').textContent = summary.completedGames ?? '—';
    $('summary-date').textContent = summary.lastInteractionDate || '—';
    $('summary-favorite').textContent = summary.favoriteGame || '—';
  }

  function renderTabs(){
    $('game-tabs').innerHTML = games.map((game, index) => `
      <button class="game-tab ${game.id === selectedGameId ? 'active' : ''}" id="game-tab-${safe(game.id)}" type="button" role="tab" aria-selected="${game.id === selectedGameId}" aria-controls="game-record-panel" data-game-id="${safe(game.id)}" tabindex="${game.id === selectedGameId ? '0' : '-1'}">
        <i class="fa-solid ${safe(game.icon)}" aria-hidden="true"></i>
        <span>${safe(game.name)}</span>
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

  function renderChart(game){
    const chart = $('record-chart');
    const records = [...game.records].slice(0, 12).reverse();
    if(!records.length){
      chart.innerHTML = '<title>近期完成時間折線圖</title><text x="360" y="130" text-anchor="middle" fill="#94a3b8">目前沒有紀錄</text>';
      return;
    }

    const width = 720;
    const height = 260;
    const padding = { top: 38, right: 24, bottom: 48, left: 48 };
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

    const grid = Array.from({ length: 5 }, (_, index) => {
      const value = maxValue - (range * index) / 4;
      const y = padding.top + (plotHeight * index) / 4;
      return `<line class="chart-grid" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}"></line>
        <text class="chart-axis-label" x="${padding.left - 8}" y="${y + 4}" text-anchor="end">${Math.round(value)}</text>`;
    }).join('');

    const points = records.map((record, index) => `${xAt(index)},${yAt(record.seconds)}`).join(' ');
    const dots = records.map((record, index) => {
      const x = xAt(index);
      const y = yAt(record.seconds);
      const levelShort = String(record.level).replace('Level ', 'L');
      return `<g>
        <title>${safe(record.date)}・${safe(record.level)}・${safe(record.seconds)} 秒</title>
        <text class="chart-level" x="${x}" y="${Math.max(15, y - 12)}">${safe(levelShort)}</text>
        <circle class="chart-dot" cx="${x}" cy="${y}" r="6" fill="${color}"></circle>
        <text class="chart-axis-label" x="${x}" y="${height - 19}" text-anchor="middle">${safe(shortDate(record.date))}</text>
      </g>`;
    }).join('');

    chart.innerHTML = `
      <title id="chart-title">${safe(game.name)}近期完成時間折線圖</title>
      <desc id="chart-description">顯示最近十二筆完成秒數，每個資料點皆標示挑戰 Level。</desc>
      ${grid}
      <polyline class="chart-line" points="${points}" stroke="${color}"></polyline>
      ${dots}
    `;
    chart.setAttribute('aria-label', `${game.name}最近十二筆完成秒數，每筆皆標示 Level`);

    requestAnimationFrame(() => {
      const scroller = document.querySelector('.record-chart-scroll');
      if(scroller) scroller.scrollLeft = scroller.scrollWidth;
    });
  }

  function renderList(game){
    $('record-list').innerHTML = game.records.slice(0, 12).map(record => `
      <article class="record-row" aria-label="${safe(record.date)}，${safe(record.level)}，完成 ${safe(record.seconds)} 秒">
        <time datetime="${safe(record.date.replaceAll('/', '-'))}">${safe(record.date)}</time>
        <span class="level-badge">${safe(record.level)}</span>
        <strong>${safe(record.seconds)} <span>秒</span></strong>
      </article>
    `).join('');
  }

  function renderGame(){
    const game = games.find(item => item.id === selectedGameId);
    if(!game) return;
    const records = Array.isArray(game.records) ? game.records : [];
    const latest = records[0];
    const best = records.reduce((result, record) => !result || Number(record.seconds) < Number(result.seconds) ? record : result, null);

    $('selected-game-name').textContent = game.name;
    $('selected-game-icon').className = `selected-game-icon accent-${game.accent || 'emerald'}`;
    $('selected-game-icon').innerHTML = `<i class="fa-solid ${safe(game.icon)}"></i>`;
    $('latest-seconds').textContent = latest?.seconds ?? '—';
    $('latest-level').textContent = latest?.level || '尚無紀錄';
    $('best-seconds').textContent = best?.seconds ?? '—';
    $('best-level').textContent = best ? `${best.level}・${best.date}` : '尚無紀錄';
    $('challenge-count').textContent = game.totalChallenges ?? records.length;
    renderChart({ ...game, records });
    renderList({ ...game, records });
  }

  function selectGame(gameId){
    if(!games.some(game => game.id === gameId)) return;
    selectedGameId = gameId;
    renderTabs();
    renderGame();
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderSummary();
    renderTabs();
    renderGame();
  });
})();
