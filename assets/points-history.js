(function(){
  const $ = (id) => document.getElementById(id);
  const data = window.GOHEALTH_DATA || {};
  const exchange = data.exchange || {};
  const expiry = data.healthPointExpiry || {};
  const format = (value) => Number(value || 0).toLocaleString('zh-TW');
  const safe = (value) => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let currentFilter = 'all';
  let visibleCount = 10;

  const records = [...(data.pointHistory || [])];
  (data.exchangeHistory || []).forEach(record => records.push({
    ...record,
    type: record.status === 'success' ? 'use' : 'exchange-attempt',
    title: record.status === 'success' ? '兌換 HAPPY GO 點數' : record.status === 'pending' ? 'HAPPY GO 點數兌換處理中' : 'HAPPY GO 點數兌換未完成',
    occurredAt: record.requestedAt,
    points: record.status === 'success' ? -record.healthPointsUsed : 0
  }));
  try {
    const latest = JSON.parse(sessionStorage.getItem('gohealth_latest_exchange') || 'null');
    if(latest?.id && !records.some(record => record.id === latest.id)) records.push({ ...latest, type:'use', title:'兌換 HAPPY GO 點數', occurredAt:latest.requestedAt, points:-latest.healthPointsUsed });
  } catch (error) {}
  records.sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)));

  const meta = {
    earn: { label:'累積', badge:'history-status-earned', icon:'fa-plus', iconClass:'bg-emerald-50 text-emerald-600' },
    use: { label:'兌換使用', badge:'history-status-used', icon:'fa-arrow-right-arrow-left', iconClass:'bg-blue-50 text-blue-600' },
    expired: { label:'點數到期', badge:'history-status-expired', icon:'fa-hourglass-end', iconClass:'bg-slate-100 text-slate-500' },
    'exchange-attempt': { label:'未完成', badge:'history-status-pending', icon:'fa-clock', iconClass:'bg-amber-50 text-amber-600' }
  };

  function filtered(){
    if(currentFilter === 'earn') return records.filter(record => record.type === 'earn');
    if(currentFilter === 'use') return records.filter(record => record.type !== 'earn');
    return records;
  }

  function render(){
    const list = filtered();
    const shown = list.slice(0, visibleCount);
    $('history-count').textContent = list.length ? `共 ${list.length} 筆紀錄，最新紀錄顯示於最上方` : '';
    $('history-empty').classList.toggle('hidden', list.length > 0);
    $('history-list').classList.toggle('hidden', list.length === 0);
    $('history-load-more').classList.toggle('hidden', visibleCount >= list.length);
    $('history-list').innerHTML = shown.map(record => {
      const style = meta[record.type] || meta.use;
      const amount = Number(record.points || 0);
      const amountCopy = amount === 0 ? '未扣點' : `${amount > 0 ? '+' : '−'}${format(Math.abs(amount))}`;
      const amountClass = amount > 0 ? 'text-emerald-700' : amount < 0 ? 'text-blue-700' : 'text-slate-500';
      const subline = record.type === 'earn' ? `效期至 ${safe(record.expiresAt)}` : record.type === 'use' ? `兌換 ${format(record.happyGoPoints)} 點 HAPPY GO` : safe(record.note || '健康點未扣除');
      return `<button class="history-card" type="button" onclick="openPointDetail('${safe(record.id)}')">
        <div class="flex items-center justify-between gap-3"><span class="history-status ${style.badge}">${style.label}</span><time class="text-base text-slate-500">${safe(String(record.occurredAt).split(' ')[0])}</time></div>
        <div class="flex items-start justify-between gap-3 mt-4"><div class="min-w-0 text-left"><h2 class="text-lg font-black text-slate-800">${safe(record.title)}</h2><p class="text-base text-slate-600 mt-1">${subline}</p></div><strong class="point-ledger-amount ${amountClass}">${amountCopy}</strong></div>
        <div class="text-right mt-3 text-emerald-700 text-base font-bold">查看詳情 <i class="fa-solid fa-chevron-right text-sm"></i></div>
      </button>`;
    }).join('');
  }

  function row(label, value){ return value === null || value === undefined || value === '' ? '' : `<div class="exchange-summary-row"><span class="text-slate-600">${label}</span><strong class="text-right">${value}</strong></div>`; }

  window.openPointDetail = function(id){
    const record = records.find(item => item.id === id);
    if(!record) return;
    const style = meta[record.type] || meta.use;
    const amount = Number(record.points || 0);
    $('detail-icon').className = `w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${style.iconClass}`;
    $('detail-icon').innerHTML = `<i class="fa-solid ${style.icon}"></i>`;
    $('detail-title').textContent = record.title;
    $('detail-type').textContent = style.label;
    $('detail-type').className = `text-base mt-0.5 font-bold ${amount > 0 ? 'text-emerald-700' : amount < 0 ? 'text-blue-700' : 'text-amber-700'}`;
    $('detail-content').innerHTML = [
      row('日期時間', safe(record.occurredAt)),
      row('健康點異動', amount === 0 ? '0 點（未扣點）' : `${amount > 0 ? '+' : '−'}${format(Math.abs(amount))} 點`),
      row('兌換結果', record.happyGoPoints ? `${format(record.happyGoPoints)} 點 HAPPY GO` : null),
      row('健康點效期', record.type === 'earn' ? safe(record.expiresAt) : null),
      row('HAPPY GO 點數效期', record.type === 'use' ? safe(record.expiresAt) : null),
      row('異動後餘額', record.balanceAfter === null ? null : `${format(record.balanceAfter)} 點`),
      row('紀錄編號', `<span class="break-all">${safe(record.id)}</span>`)
    ].join('');
    $('detail-note').textContent = record.note || '';
    $('history-detail-modal').classList.remove('hidden-view');
    document.body.classList.add('modal-open');
  };
  window.closePointDetail = function(){ $('history-detail-modal').classList.add('hidden-view'); document.body.classList.remove('modal-open'); };
  window.closeExpiryInfo = function(){ $('expiry-modal').classList.add('hidden-view'); document.body.classList.remove('modal-open'); };

  document.addEventListener('DOMContentLoaded', () => {
    $('ledger-balance').textContent = format(exchange.healthPointBalance || 1200);
    $('next-expiry-points').textContent = format(expiry.nextExpiryPoints || 0);
    $('next-expiry-date').textContent = expiry.nextExpiryDate || '—';
    $('expiry-rule').textContent = expiry.rule || '';
    $('expiry-info').onclick = () => { $('expiry-modal').classList.remove('hidden-view'); document.body.classList.add('modal-open'); };
    document.querySelectorAll('.history-filter').forEach(button => button.onclick = () => {
      currentFilter = button.dataset.filter;
      visibleCount = 10;
      document.querySelectorAll('.history-filter').forEach(item => item.classList.toggle('active', item === button));
      render();
    });
    $('history-load-more').onclick = () => { visibleCount += 10; render(); };
    render();
  });
})();
