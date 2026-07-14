
(function(){
  const clone = (obj) => JSON.parse(JSON.stringify(obj));
  const baseState = window.GOHEALTH_DATA?.initialAppState || { group: { isBound:true, inviteCode:'839201', streak:4, maxPoints:10000, members:[] } };
  window.appState = { group: clone(baseState.group), notifications: clone(window.GOHEALTH_DATA?.notifications || []) };
  let isDemoEmpty = new URLSearchParams(window.location.search).get('state') === 'empty';

  let pendingWarnAction = null;
  let interactionTarget = null;
  let nicknameTargetId = null;
  let termsObserver = null;

  function currentQuery() { return window.location.search || ''; }
  window.navigateTo = function(page) { window.location.href = page + currentQuery(); };

  function initAnnouncement(){
    const viewport=document.getElementById('announcement-viewport');
    const track=document.getElementById('announcement-track');
    if(!viewport || !track) return;
    const config=window.GOHEALTH_DATA?.announcement || {};
    const messages=(config.messages || []).filter(Boolean);
    if(!messages.length) return;
    const text=messages.join('　｜　');
    const gap=Number(config.messageGapPixels) || 56;
    const speed=Math.max(20, Number(config.pixelsPerSecond) || 38);
    const pause=Math.max(0, Number(config.pauseMilliseconds) || 0);
    track.innerHTML=`<span class="announcement-message">${text}</span><span class="announcement-message" aria-hidden="true">${text}</span>`;
    track.style.gap=`${gap}px`;
    const first=track.querySelector('.announcement-message');
    if(!first) return;
    const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const distance=first.getBoundingClientRect().width + gap;
    if(reduceMotion){
      track.classList.add('announcement-static');
      return;
    }
    const scrollDuration=(distance / speed) * 1000;
    const totalDuration=scrollDuration + pause;
    const holdPct=Math.min(35, (pause / totalDuration) * 100);
    const animation=track.animate([
      { transform:'translateX(0)', offset:0 },
      { transform:'translateX(0)', offset:holdPct/100 },
      { transform:`translateX(-${distance}px)`, offset:1 }
    ], { duration:totalDuration, iterations:Infinity, easing:'linear' });
    viewport.addEventListener('mouseenter',()=>animation.pause());
    viewport.addEventListener('mouseleave',()=>animation.play());
    viewport.addEventListener('focusin',()=>animation.pause());
    viewport.addEventListener('focusout',()=>animation.play());
  }

  function syncModalNavState() {
    const hasOpenModal = !!document.querySelector('.modal-overlay:not(.hidden-view), .report-modal-overlay:not(.hidden-view), .interaction-overlay:not(.hidden-view), .warn-modal-overlay:not(.hidden-view)');
    document.body.classList.toggle('modal-open', hasOpenModal);
  }
  window.openModal = function(id) { const m=document.getElementById(id); if(m){ m.classList.remove('hidden-view'); syncModalNavState(); } };
  window.closeModal = function(id) { const m=document.getElementById(id); if(m){ m.classList.add('hidden-view'); syncModalNavState(); } };

  window.showToast = function(msg){
    const container=document.getElementById('toast-container'); if(!container) return;
    const toast=document.createElement('div'); toast.className='toast'; toast.innerHTML=msg; container.appendChild(toast);
    setTimeout(()=>{ toast.classList.add('hiding'); setTimeout(()=>toast.remove(),300); },2300);
  };

  window.openWarnModal = function(title, subtitle, body, onConfirm) {
    const t=document.getElementById('warn-title'); const s=document.getElementById('warn-subtitle'); const b=document.getElementById('warn-body');
    if(t) t.textContent=title; if(s) s.textContent=subtitle; if(b) b.textContent=body;
    pendingWarnAction = onConfirm; openModal('modal-warn');
  };
  window.closeWarnModal = function(){ closeModal('modal-warn'); pendingWarnAction=null; };

  function getActiveMembers(){ return appState.group.members.filter(m=>!m.isCoolingDown); }
  function getGroupTotalPoints(){ return getActiveMembers().reduce((sum,m)=>sum+m.points,0); }
  function getTickets(pts){ return Math.floor(pts/1000); }
  function hasUnread(){ return appState.notifications.some(n=>!n.isRead); }

  function updateBadges(){
    const show = hasUnread();
    ['bell-badge-dash','bell-badge-group'].forEach(id=>{ const el=document.getElementById(id); if(el) el.classList.toggle('hidden', !show); });
  }

  function renderNotificationList(){
    const list=document.getElementById('notification-list'); if(!list) return;
    list.innerHTML = appState.notifications.map(n => `
      <div class="flex items-start gap-3 rounded-2xl px-4 py-3.5 border transition ${n.isRead ? 'bg-white border-slate-100' : 'bg-slate-50 border-slate-200'}">
        <div class="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${n.isRead ? 'bg-slate-100' : 'bg-white border border-slate-200 shadow-sm'}">${n.icon}</div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="font-bold text-gray-800 text-sm ${n.isRead ? '' : 'text-gray-900'}">${n.title}</p>
            ${!n.isRead ? '<span class="w-2 h-2 bg-red-500 rounded-full shrink-0"></span>' : ''}
          </div>
          <p class="text-xs text-slate-500 mt-0.5 leading-relaxed">${n.desc}</p>
          <p class="text-[10px] text-slate-400 mt-1.5">${n.time}</p>
        </div>
      </div>
    `).join('');
  }

  window.openNotifications = function(){ renderNotificationList(); openModal('modal-notifications'); };
  window.closeNotifications = function(){ closeModal('modal-notifications'); };
  window.markAllRead = function(){ appState.notifications.forEach(n=>n.isRead=true); updateBadges(); renderNotificationList(); showToast('✅ 全部通知已設為已讀'); };

  window.showCopyToast = function(){ const el=document.getElementById('toast-copy-success'); if(!el) return; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'),2000); };
  window.copyInviteCode = function(){
    const you=appState.group.members.find(m=>m.isYou); const name=you ? you.name.replace('（你）','').trim() : 'GO HEALTH 用戶'; const code=appState.group.inviteCode;
    const deepLink=`「${name} 邀請你加入 GO HEALTH 群組一起賺健康！\n點擊下方連結進入 HAPPY GO APP 體驗全新健康服務，輸入群組代碼：${code}，讓關心變得更簡單！\n👉 happygo://gohealth/group」`;
    navigator.clipboard?.writeText(deepLink).catch(()=>{}); closeModal('modal-invite'); showCopyToast();
  };
  window.showInviteModal = function(){ const code=document.getElementById('modal-invite-code'); if(code) code.textContent=appState.group.inviteCode; openModal('modal-invite'); };

  window.createGroupAndBind = function(){ appState.group.isBound = true; showToast('🎉 群組已建立！'); showInviteModal(); renderGroupView(); };
  window.tryJoinGroup = function(){
    const input=document.getElementById('join-code-input'); const errorMsg=document.getElementById('join-error-msg'); const val=input ? input.value.trim() : '';
    function showErr(msg){ if(input){ input.classList.remove('border-slate-200','border-green-500'); input.classList.add('border-red-500'); } if(errorMsg){ errorMsg.textContent=msg; errorMsg.classList.remove('hidden-view'); } }
    function clearErr(){ if(input){ input.classList.remove('border-red-500'); input.classList.add('border-slate-200'); } if(errorMsg){ errorMsg.textContent=''; errorMsg.classList.add('hidden-view'); } }
    if(val.length < 6) return showErr('⚠️ 長度不足，請輸入 6 碼代碼');
    if(!/^\d+$/.test(val)) return showErr('⚠️ 格式錯誤，請輸入純數字代碼');
    if(val === '000000') return showErr('⚠️ 代碼錯誤，請確認後重新輸入');
    clearErr(); appState.group.isBound = true; showToast('🎉 成功加入群組！'); renderGroupView();
  };

  window.openInteractionModal = function(memberId, memberName){
    interactionTarget = { id: memberId, name: memberName };
    const title=document.getElementById('interaction-title'); if(title) title.textContent = `傳送關心給 ${memberName}`;
    const you=appState.group.members.find(m=>m.isYou); const isHost=you && you.role==='房主';
    const canned = isHost ? (window.GOHEALTH_DATA?.cannedMessages?.host || []) : (window.GOHEALTH_DATA?.cannedMessages?.member || []);
    const opts=document.getElementById('interaction-options');
    if(opts){
      opts.innerHTML = canned.map(msg => `
        <button class="msg-btn" onclick="sendMessage(${memberId}, '${msg.icon}', '${msg.text.replace(/'/g,'&#39;')}')">
          <span class="msg-btn-icon">${msg.icon}</span>
          <span>${msg.text}</span>
        </button>`).join('');
    }
    const custom=document.getElementById('custom-msg-input'); if(custom) custom.value='';
    openModal('modal-interaction');
  };
  window.closeInteractionModal = function(){ closeModal('modal-interaction'); interactionTarget=null; };
  window.sendCustomMessage = function(){
    const input=document.getElementById('custom-msg-input'); const text=input ? input.value.trim() : '';
    if(!text || !interactionTarget){ if(!text) showToast('⚠️ 請輸入關心內容'); return; }
    sendMessage(interactionTarget.id, '💬', text);
  };
  window.sendMessage = function(memberId, icon, text){
    closeInteractionModal();
    const member=appState.group.members.find(m=>m.id===memberId); if(!member) return;
    const sender=appState.group.members.find(m=>m.isYou); const senderName=sender ? sender.name.replace('（你）','').trim() : '我';
    member.receivedMessage = { icon, text, senderName };
    showToast(`💬 已發送關心給 ${member.name}`);
    renderGroupView();
  };

  window.openWeeklyReport = function(){
    const container=document.getElementById('report-content-container'); if(!container) return;
    const htmlRich = `
      <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">👨‍👩‍👧 家族活躍表現</p>
      <div class="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-4">
        <div class="flex items-center gap-3 mb-3"><div class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl shrink-0">🤝</div><div class="flex-1"><p class="text-xs text-slate-400 font-medium">家族活躍指數</p><p class="font-black text-gray-800 text-sm mt-0.5">全家共同參與 <span class="text-emerald-600 text-base">4 天</span></p></div></div>
        <div class="h-3 bg-emerald-100 rounded-full overflow-hidden mb-2"><div class="h-full bg-emerald-500 rounded-full" style="width:75%"></div></div>
        <p class="text-xs text-emerald-700 font-bold text-center">默契極佳！本週超越 75% 的家庭用戶 🏅</p>
      </div>
      <div class="h-px bg-slate-100 mb-4"></div>
      <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">🙋 我的個人表現</p>
      <div class="space-y-3 mb-4">
        <div class="stat-card col">
          <div class="flex items-center gap-3 w-full"><div class="stat-icon bg-purple-50 shrink-0">🧠</div><div><p class="text-xs text-slate-400 font-medium">大腦活化天數</p><p class="font-black text-gray-800 text-sm mt-0.5">本週累計 <span class="text-purple-600 text-base">5 天</span></p></div></div>
          <div class="flex items-center gap-1.5 w-full mt-2">
            <div class="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">一</div>
            <div class="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">二</div>
            <div class="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">三</div>
            <div class="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">四</div>
            <div class="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">五</div>
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">六</div>
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">日</div>
          </div>
        </div>
        <div class="stat-card"><div class="stat-icon bg-orange-50 shrink-0">🏪</div><div class="flex-1"><p class="text-xs text-slate-400 font-medium">本週最投入挑戰</p><p class="font-black text-gray-800 text-sm mt-0.5">24H 一日店長 🏪</p><p class="text-xs text-orange-600 font-bold mt-0.5">本週挑戰次數最多</p></div></div>
      </div>
      <div class="h-px bg-slate-100 mb-4"></div>
      <div class="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-4 opacity-60 mb-4 cursor-default">
        <div class="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center text-lg shrink-0">🔒</div>
        <div class="flex-1"><p class="font-bold text-gray-600 text-sm">🔒 深度健康趨勢分析（籌備中）</p><p class="text-xs text-slate-400 mt-0.5">更詳盡的個人歷史報告，將於 GO HEALTH APP 推出，敬請期待！</p></div>
      </div>`;
    const htmlEmpty = `
      <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">👨‍👩‍👧 家族活躍表現</p>
      <div class="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-4">
        <div class="flex items-center gap-3 mb-3"><div class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl shrink-0">🤝</div><div class="flex-1"><p class="text-xs text-slate-400 font-medium">家族活躍指數</p><p class="font-black text-gray-800 text-sm mt-0.5">全家共同參與 <span class="text-slate-400 text-base">0 天</span></p></div></div>
        <div class="h-3 bg-slate-200 rounded-full overflow-hidden"><div class="h-full bg-emerald-500 rounded-full" style="width:0%"></div></div>
      </div>
      <div class="h-px bg-slate-100 mb-4"></div>
      <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2.5">🙋 我的個人表現</p>
      <div class="space-y-3 mb-4">
        <div class="stat-card col border-slate-200 bg-white">
          <div class="flex items-center gap-3 w-full"><div class="stat-icon bg-slate-100 shrink-0 opacity-50">🧠</div><div><p class="text-xs text-slate-400 font-medium">大腦活化天數</p><p class="font-black text-gray-800 text-sm mt-0.5">本週累計 <span class="text-slate-400 text-base">0 天</span></p></div></div>
          <div class="flex items-center gap-1.5 w-full mt-2">
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">一</div>
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">二</div>
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">三</div>
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">四</div>
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">五</div>
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">六</div>
            <div class="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">日</div>
          </div>
        </div>
        <div class="stat-card border-slate-200 bg-white"><div class="stat-icon bg-slate-100 shrink-0 text-slate-400">💤</div><div class="flex-1"><p class="text-xs text-slate-400 font-medium">本週最投入挑戰</p><p class="font-bold text-slate-500 text-sm mt-0.5">本週還沒有互動喔，趕快鍛鍊腦健康</p></div></div>
      </div>`;
    container.innerHTML = isDemoEmpty ? htmlEmpty : htmlRich;
    openModal('modal-weekly-report');
  };
  window.closeWeeklyReport = function(){ closeModal('modal-weekly-report'); };

  window.kickMember = function(memberId){
    const member=appState.group.members.find(m=>m.id===memberId); if(!member) return;
    openWarnModal(`移出 ${member.name}？`, '此操作無法復原', `確認執行？移出後，${member.name} 本週貢獻的 ${member.points} 點將從群組總分中扣除！`, () => {
      appState.group.members = appState.group.members.filter(m=>m.id!==memberId); renderGroupView(); showToast(`已將 ${member.name} 移出群組`);
    });
  };
  window.exitGroup = function(){
    openWarnModal('退出群組？', '此操作無法復原', '確認執行？退出後，您本週貢獻的點數將從群組總分中扣除！', () => {
      appState.group.isBound = false; appState.group.members = appState.group.members.filter(m=>!m.isYou); renderGroupView(); showToast('已退出群組');
    });
  };

  window.openNicknameSheet = function(memberId, currentName){
    nicknameTargetId = memberId;
    const input=document.getElementById('nickname-input'); const count=document.getElementById('nickname-count');
    if(input){ input.value=currentName.replace('（你）','').trim(); if(count) count.textContent=input.value.length+' / 10'; input.oninput=()=>{ if(count) count.textContent=input.value.length+' / 10'; }; }
    openModal('sheet-edit-nickname');
  };
  window.closeNicknameSheet = function(){ closeModal('sheet-edit-nickname'); nicknameTargetId=null; };
  window.saveNickname = function(){
    const input=document.getElementById('nickname-input'); const newName=input ? input.value.trim() : '';
    if(!newName){ showToast('⚠️ 暱稱不能為空'); return; }
    const member=appState.group.members.find(m=>m.id===nicknameTargetId);
    if(member){ member.name = newName + '（你）'; closeNicknameSheet(); renderGroupView(); showToast('✅ 暱稱已更新'); }
  };

  window.renderGroupView = function(){
    const container=document.getElementById('group-content'); if(!container) return;
    const { isBound, streak, maxPoints, members } = appState.group;
    if(!isBound){
      container.innerHTML = `
        <div class="text-center pt-6 pb-2">
          <div class="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-4 text-5xl shadow-inner">🌱</div>
          <h2 class="text-2xl font-black text-gray-800 mb-1">建立或加入群組</h2>
          <p class="text-slate-500 text-sm">和家人一起完成健康任務，累積群組進度抽 HAPPY GO 點數</p>
        </div>
        <div class="space-y-3">
          <div class="flex items-start gap-3 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div class="w-9 h-9 bg-green-600 text-white rounded-full flex items-center justify-center font-black text-base shrink-0 mt-0.5">1</div>
            <div><p class="font-black text-gray-800 text-base">建立群組，取得 6 碼代碼</p><p class="text-xs text-slate-400 mt-1 leading-relaxed">點擊「建立群組」後，系統會產生專屬群組代碼，可分享給家人加入。</p></div>
          </div>
          <div class="flex items-start gap-3 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div class="w-9 h-9 bg-green-600 text-white rounded-full flex items-center justify-center font-black text-base shrink-0 mt-0.5">2</div>
            <div><p class="font-black text-gray-800 text-base">分享群組代碼，邀請家人加入</p><p class="text-xs text-slate-400 mt-1 leading-relaxed">家人輸入代碼後即可加入群組，一起完成任務、累積進度抽 HAPPY GO 點數。</p></div>
          </div>
        </div>
        <button onclick="createGroupAndBind()" class="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition text-lg flex items-center justify-center gap-2 mt-4"><i class="fas fa-plus-circle"></i> 建立群組</button>
        <div class="flex items-center gap-3 my-4"><div class="flex-1 h-px bg-slate-200"></div><span class="text-slate-400 text-xs">輸入家人的群組代碼加入</span><div class="flex-1 h-px bg-slate-200"></div></div>
        <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
          <input id="join-code-input" type="tel" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="輸入 6 碼群組代碼" class="w-full border-2 border-slate-200 rounded-xl px-4 py-3.5 text-center text-2xl font-black tracking-widest text-gray-800 focus:border-green-500 focus:outline-none transition"/>
          <p id="join-error-msg" class="text-xs text-red-500 font-bold mt-1.5 hidden-view"></p>
          <button onclick="tryJoinGroup()" class="w-full bg-slate-800 text-white font-bold py-3.5 rounded-xl active:scale-95 transition text-base">加入群組</button>
        </div>`;
      return;
    }
    const totalPoints=getGroupTotalPoints(); const tickets=getTickets(totalPoints); const pct=Math.min(100, Math.round((totalPoints/maxPoints)*100)); const isUnlocked=members.length>=2;
    container.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <h2 class="text-xl font-black text-gray-800">我的群組 👥</h2>
        <button aria-label="開啟通知中心" onclick="openNotifications()" class="round-icon-btn relative w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center active:bg-slate-50 transition shadow-sm shrink-0" id="bell-btn-group">
          <i class="fas fa-bell text-slate-400 text-base"></i>
          <span id="bell-badge-group" class="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white ${hasUnread() ? '' : 'hidden'}"></span>
        </button>
      </div>
      <section class="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <h3 class="font-black text-gray-800 flex items-center gap-2"><i class="fas fa-ticket text-emerald-600"></i> 群組抽獎券</h3>
          <div class="flex items-center gap-2">
            <button onclick="openModal('modal-lottery-rules')" class="text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg font-medium active:bg-slate-100 transition">📜 抽獎規則</button>
            ${isUnlocked ? `<span class="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full font-medium">🔥 已解鎖</span>` : `<span class="text-xs bg-slate-100 text-slate-500 border border-slate-200 px-2.5 py-1 rounded-full font-medium">🔒 上鎖中</span>`}
          </div>
        </div>
        ${!isUnlocked ? `
          <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p class="text-amber-800 font-bold text-base leading-snug">邀請家人加入完成任務，累積群組進度，解鎖週週抽 100 點 HAPPY GO 點數。</p>
            <button onclick="showInviteModal()" class="mt-3 bg-amber-500 text-white font-bold px-5 py-2.5 rounded-xl active:scale-95 transition text-sm"><i class="fas fa-share-nodes mr-1"></i> 立即邀請</button>
          </div>` : `
          <div class="mb-2">
            <div class="flex justify-between text-xs text-slate-500 mb-1.5"><span>群組總分 <strong class="text-gray-800">${totalPoints.toLocaleString()}</strong> 點</span><span>${pct}%</span></div>
            <div class="progress-track"><div class="progress-fill" style="--bar-w:${pct}%; width:${pct}%"></div></div>
            <div class="flex justify-between text-xs text-slate-400 mt-1"><span>0</span><span>${maxPoints.toLocaleString()} 點上限</span></div>
          </div>
          <div class="bg-emerald-50 rounded-xl p-3 text-center mt-3"><p class="text-emerald-800 font-bold text-base">🎫 目前累積 <span class="text-2xl font-black text-emerald-600">${tickets}</span> 張抽獎券</p><p class="text-base text-emerald-800 mt-1 leading-relaxed">每 1,000 健康點獲得 1 張<br><strong>週週抽 100 點 HAPPY GO 點數</strong><br>券數越多，中獎機會越高！</p></div>`}
      </section>
      ${isUnlocked ? `<div class="bg-orange-50 border border-orange-100 rounded-xl p-3.5 flex items-center justify-center gap-2"><i class="fas fa-fire-flame-curved text-orange-500 text-base"></i><p class="text-orange-600 font-bold text-sm">群組已連續打卡 ${streak} 天</p></div>` : ''}
      ${isUnlocked ? `<div class="report-banner" onclick="openWeeklyReport()"><div class="flex items-center gap-2.5"><div class="w-9 h-9 bg-emerald-100 rounded-xl flex items-center justify-center text-lg shrink-0">📊</div><div><p class="font-bold text-emerald-800 text-sm">查看本週群組健康週報</p><p class="text-xs text-emerald-600 mt-0.5">認知表現 · 活躍指數 · 健康趨勢</p></div></div><i class="fas fa-chevron-right text-emerald-400 text-sm shrink-0"></i></div>` : ''}
      <section>
        <div class="flex items-center justify-between mb-3"><h3 class="section-title mb-0"><i class="fas fa-users text-blue-500"></i> 群組成員</h3><button onclick="showInviteModal()" class="text-xs text-green-600 font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 active:scale-95 transition"><i class="fas fa-plus"></i> 邀請</button></div>
        <div class="space-y-3">
          ${members.map(m => {
            let iconClass='fa-solid fa-user'; let bgClass='bg-blue-100 text-blue-500';
            if(m.gender==='F') bgClass='bg-rose-100 text-rose-500';
            if(m.gender==='U'){ iconClass='fa-solid fa-seedling'; bgClass='bg-emerald-100 text-emerald-500'; }
            return `<div class="member-card"><div class="flex items-start gap-3"><div class="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${bgClass}"><i class="${iconClass}"></i></div><div class="flex-1 min-w-0"><div class="flex items-center justify-between gap-2"><div class="flex items-center gap-1 flex-wrap min-w-0"><span class="font-black text-gray-800 text-base">${m.name}</span>${m.isYou ? `<span onclick="openNicknameSheet(${m.id}, '${m.name.replace(/'/g,'&#39;')}')" class="text-slate-400 cursor-pointer text-sm ml-0.5 active:opacity-60">✏️</span>` : ''}<span class="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">${m.role}</span></div>${!m.isYou ? `<div class="flex items-center gap-1.5 shrink-0"><button onclick="openInteractionModal(${m.id}, '${m.name}')" class="bg-emerald-50 text-emerald-600 px-2.5 py-1.5 rounded-lg text-xs font-bold transition active:scale-95">💬 關心</button>${m.role !== '房主' ? `<button onclick="kickMember(${m.id})" class="text-slate-400 bg-slate-100 px-2.5 py-1.5 rounded-lg text-xs font-bold transition active:bg-slate-200"><i class="fas fa-user-minus"></i></button>` : ''}</div>` : ''}</div><p class="text-sm font-bold text-emerald-600 mt-1">本週貢獻：${m.points} 點</p>${isDemoEmpty ? `<p class="activity-line text-slate-400">近期無參與賺點任務，快來為群組賺點累積進度！</p>` : (m.latestActivity ? `<p class="activity-line">${m.name} 完成 <strong class="text-gray-700">${m.latestActivity.game}</strong> ${m.latestActivity.icon}，注入 <strong class="text-emerald-600">${m.latestActivity.points} 健康點</strong></p>` : '')}${m.receivedMessage ? `<div class="msg-bubble">${m.receivedMessage.senderName || '我'} 傳來：${m.receivedMessage.icon} ${m.receivedMessage.text}</div>` : ''}</div></div></div>`;
          }).join('')}
        </div>
      </section>
      <button onclick="showInviteModal()" class="w-full bg-emerald-50 border-2 border-emerald-200 text-emerald-700 font-bold py-3.5 rounded-2xl active:scale-95 transition flex items-center justify-center gap-2"><i class="fas fa-share-nodes"></i> 查看我的邀請碼</button>
      <div><button onclick="exitGroup()" class="exit-btn"><i class="fas fa-right-from-bracket"></i> 退出群組</button><p class="text-center text-xs text-slate-400 mt-2">退出後，本週貢獻點數將從群組總分中扣除</p></div>
      <div class="text-center text-[11px] text-slate-400 pb-4 mt-6"><span class="font-bold text-slate-300 mr-2">GO HEALTH</span><a href="https://gohealth-policy-webview.vercel.app/" target="_blank" class="underline active:text-slate-500">政策與須知</a></div>`;
    updateBadges();
  };

  function initTermsPage(){
    const marker=document.getElementById('terms-bottom-marker'); const btn=document.getElementById('btn-agree'); const container=document.getElementById('terms-content');
    if(!marker || !btn || !container) return;
    termsObserver = new IntersectionObserver((entries)=>{ if(entries[0].isIntersecting){ btn.disabled=false; btn.classList.remove('bg-slate-300','cursor-not-allowed','shadow-none'); btn.classList.add('bg-green-600','hover:bg-green-700','shadow-lg','active:scale-95'); btn.textContent='我同意並開始挑戰 🚀'; termsObserver.disconnect(); } }, { root: container, threshold: 0.1 });
    termsObserver.observe(marker);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const warn=document.getElementById('warn-confirm-btn');
    if(warn) warn.onclick = () => { if(pendingWarnAction) pendingWarnAction(); closeWarnModal(); };
    updateBadges();
    initAnnouncement();
    if(document.body.dataset.page === 'group') renderGroupView();
    if(document.body.dataset.page === 'terms') initTermsPage();
  });
})();
