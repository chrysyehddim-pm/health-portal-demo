
(function(){
  const scenarios = window.GOHEALTH_DATA?.errorScenarios || [];
  function showToast(msg){
    const container=document.getElementById('toast-container'); if(!container) return;
    const toast=document.createElement('div'); toast.className='toast'; toast.innerHTML=msg; container.appendChild(toast);
    setTimeout(()=>{ toast.classList.add('hiding'); setTimeout(()=>toast.remove(),300); },2300);
  }
  function renderState(index){
    const s=scenarios[index];
    document.getElementById('state-icon').textContent=s.icon;
    document.getElementById('state-title').textContent=s.title;
    document.getElementById('state-message').textContent=s.msg;
    const btn=document.getElementById('state-btn');
    if(s.btn && s.btn.trim()!==''){ btn.textContent=s.btn; btn.classList.remove('hidden'); }
    else { btn.classList.add('hidden'); }
  }
  window.selectScenario = function(index){ renderState(index); };
  window.simulateKickedOut = function(){ showToast('⚠️ 您已不在原先的家庭群組中'); };
  document.addEventListener('DOMContentLoaded', () => {
    const list=document.getElementById('scenario-buttons');
    if(list){
      list.innerHTML = scenarios.map((s,i)=>`<button class="w-full text-left bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium active:bg-slate-50 transition" onclick="selectScenario(${i})">${i+1}. ${s.title}</button>`).join('');
    }
    renderState(0);
  });
})();
