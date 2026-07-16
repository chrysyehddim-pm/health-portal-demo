(function(){
  const $ = (id) => document.getElementById(id);
  const allRecords = [...(window.GOHEALTH_DATA?.exchangeHistory || [])];
  try {
    const latestRecord = JSON.parse(sessionStorage.getItem('gohealth_latest_exchange') || 'null');
    if(latestRecord?.id && !allRecords.some(record => record.id === latestRecord.id)) allRecords.unshift(latestRecord);
  } catch (error) {
    // Prototype 暫存資料無法解析時，仍顯示預設兌換紀錄。
  }
  const isEmptyDemo = new URLSearchParams(window.location.search).get('state') === 'empty';
  let currentFilter = 'all';
  let visibleCount = 10;

  const statusMeta = {
    success: { label:'兌換成功', badge:'history-status-success', icon:'fa-check', iconClass:'bg-emerald-50 text-emerald-600' },
    pending: { label:'點數處理中', badge:'history-status-pending', icon:'fa-clock', iconClass:'bg-amber-50 text-amber-600' },
    failed: { label:'兌換未完成', badge:'history-status-failed', icon:'fa-triangle-exclamation', iconClass:'bg-red-50 text-red-500' }
  };

  const format = (number) => Number(number || 0).toLocaleString('zh-TW');
  const safe = (value) => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

  function filteredRecords(){
    if(isEmptyDemo) return [];
    if(currentFilter === 'success') return allRecords.filter(record => record.status === 'success');
    if(currentFilter === 'incomplete') return allRecords.filter(record => record.status !== 'success');
    return allRecords;
  }

  function render(){
    const allFiltered = filteredRecords();
    const records = allFiltered.slice(0, visibleCount);
    $('history-count').textContent = allFiltered.length ? `共 ${allFiltered.length} 筆紀錄，最新紀錄顯示於最上方` : '';
    $('history-empty').classList.toggle('hidden', allFiltered.length > 0);
    $('history-list').classList.toggle('hidden', allFiltered.length === 0);
    $('history-load-more').classList.toggle('hidden', visibleCount >= allFiltered.length);
    $('history-list').innerHTML = records.map(record => {
      const meta = statusMeta[record.status];
      const date = safe(record.requestedAt.split(' ')[0]);
      const subline = record.status === 'success'
        ? `限時點數使用期限：${safe(record.expiresAt)}`
        : record.status === 'failed' ? '健康點未扣除' : '確認入點成功後才會扣除健康點';
      return `<button class="history-card" type="button" onclick="openHistoryDetail('${safe(record.id)}')">
        <div class="flex items-center justify-between gap-3">
          <span class="history-status ${meta.badge}">${meta.label}</span>
          <time class="text-base text-slate-500">${date}</time>
        </div>
        <div class="history-conversion"><strong>${format(record.healthPointsUsed)} 健康點</strong><i class="fa-solid fa-arrow-right text-slate-400"></i><strong class="text-emerald-700">${format(record.happyGoPoints)} 點 HAPPY GO</strong></div>
        <div class="flex items-end justify-between gap-3 mt-3"><p class="text-base ${record.status === 'failed' ? 'text-red-600 font-bold' : 'text-slate-600'} text-left">${subline}</p><span class="text-emerald-700 text-base font-bold shrink-0">查看詳情 <i class="fa-solid fa-chevron-right text-sm"></i></span></div>
      </button>`;
    }).join('');
  }

  function detailRow(label, value){
    if(value === null || value === undefined || value === '') return '';
    return `<div class="exchange-summary-row"><span class="text-slate-600">${label}</span><strong class="text-right">${value}</strong></div>`;
  }

  window.openHistoryDetail = function(id){
    const record = allRecords.find(item => item.id === id);
    if(!record) return;
    const meta = statusMeta[record.status];
    $('detail-status').textContent = meta.label;
    $('detail-status').className = `text-base mt-0.5 font-bold ${record.status === 'success' ? 'text-emerald-700' : record.status === 'failed' ? 'text-red-600' : 'text-amber-700'}`;
    $('detail-status-icon').className = `w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${meta.iconClass}`;
    $('detail-status-icon').innerHTML = `<i class="fa-solid ${meta.icon}"></i>`;
    $('detail-content').innerHTML = [
      detailRow('申請時間', safe(record.requestedAt)),
      detailRow('入點時間', safe(record.creditedAt)),
      detailRow('使用健康點', `${format(record.healthPointsUsed)} 點`),
      detailRow('兌換比例', `${format(record.exchangeRate)} 健康點：1 點`),
      detailRow('取得點數', `${format(record.happyGoPoints)} 點 HAPPY GO`),
      detailRow('使用期限', safe(record.expiresAt)),
      detailRow('兌換後餘額', record.balanceAfter === null ? null : `${format(record.balanceAfter)} 點`),
      detailRow('兌換紀錄編號', `<span class="break-all">${safe(record.id)}</span><button class="copy-record-id ml-2" type="button" onclick="copyRecordId('${safe(record.id)}')" aria-label="複製兌換紀錄編號"><i class="fa-regular fa-copy"></i></button>`)
    ].join('');
    $('detail-note').textContent = record.note || '';
    $('detail-expiry-note').classList.toggle('hidden', record.status !== 'success');
    $('detail-retry').classList.toggle('hidden', record.status !== 'failed');
    $('detail-retry').classList.toggle('flex', record.status === 'failed');
    $('history-detail-modal').classList.remove('hidden-view');
    document.body.classList.add('modal-open');
  };

  window.closeHistoryDetail = function(){
    $('history-detail-modal').classList.add('hidden-view');
    document.body.classList.remove('modal-open');
  };

  window.copyRecordId = function(id){
    if(!navigator.clipboard){ showToast(`紀錄編號：${id}`); return; }
    navigator.clipboard.writeText(id).then(() => showToast('兌換紀錄編號已複製')).catch(() => showToast(`紀錄編號：${id}`));
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.history-filter').forEach(button => {
      button.onclick = () => {
        currentFilter = button.dataset.filter;
        visibleCount = 10;
        document.querySelectorAll('.history-filter').forEach(item => item.classList.toggle('active', item === button));
        render();
      };
    });
    $('history-load-more').onclick = () => { visibleCount += 10; render(); };
    render();
  });
})();
