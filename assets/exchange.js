(function(){
  const config = window.GOHEALTH_DATA?.exchange || {};
  const rate = config.healthPointsPerHappyGoPoint || 500;
  const validityDays = config.limitedPointValidityDays || 90;
  let balance = config.healthPointBalance || 1200;
  let amount = 1;
  let shouldFail = false;

  const $ = (id) => document.getElementById(id);
  const format = (number) => number.toLocaleString('zh-TW');
  const maxAmount = () => Math.floor(balance / rate);

  function render(){
    amount = Math.max(1, Math.min(amount, Math.max(1, maxAmount())));
    $('health-balance').textContent = format(balance);
    $('max-hg-points').textContent = maxAmount();
    $('exchange-amount').textContent = amount;
    $('deduct-points').textContent = format(amount * rate);
    $('receive-points').textContent = amount;
    $('remaining-points').textContent = format(balance - amount * rate);
    $('confirm-deduct').textContent = format(amount * rate);
    $('confirm-receive').textContent = amount;
    $('exchange-submit').textContent = `確認兌換 ${amount} 點 HAPPY GO 點數`;
    $('decrease-btn').disabled = amount <= 1;
    $('increase-btn').disabled = amount >= maxAmount();
    $('exchange-submit').disabled = maxAmount() < 1;
    $('exchange-submit').classList.toggle('opacity-40', maxAmount() < 1);
    $('rate-copy').textContent = format(rate);
    $('rate-summary').textContent = format(rate);
    $('validity-days').textContent = validityDays;
  }

  function expiryDate(){
    const date = new Date();
    date.setDate(date.getDate() + validityDays);
    return new Intl.DateTimeFormat('zh-TW', { year:'numeric', month:'2-digit', day:'2-digit' }).format(date);
  }

  function openResult(success){
    $('exchange-confirm-modal').classList.add('hidden-view');
    const icon = $('result-icon');
    const action = $('result-action');
    if(success){
      const balanceBefore = balance;
      balance -= amount * rate;
      const now = new Date();
      const dateTime = new Intl.DateTimeFormat('zh-TW', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }).format(now).replace(/\//g, '/');
      const recordId = `GH${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
      sessionStorage.setItem('gohealth_latest_exchange', JSON.stringify({
        id: recordId,
        status: 'success',
        requestedAt: dateTime,
        creditedAt: dateTime,
        healthPointsUsed: amount * rate,
        exchangeRate: rate,
        happyGoPoints: amount,
        balanceBefore,
        balanceAfter: balance,
        expiresAt: expiryDate(),
        note: '兌換已完成。'
      }));
      icon.className = 'w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 bg-emerald-50 text-emerald-600';
      icon.innerHTML = '<i class="fa-solid fa-check"></i>';
      $('result-title').textContent = '兌換成功！';
      $('result-message').innerHTML = `已取得 <strong>${amount} 點 HAPPY GO 限時點數</strong><br>使用期限至 ${expiryDate()}<br>剩餘 ${format(balance)} 健康點`;
      action.textContent = '完成並返回首頁';
      action.onclick = () => navigateTo('index.html');
    } else {
      icon.className = 'w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 bg-red-50 text-red-500';
      icon.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i>';
      $('result-title').textContent = '本次兌換未完成';
      $('result-message').innerHTML = 'HAPPY GO 點數入點失敗，<strong>健康點不會扣除</strong>。請稍後再試。';
      action.textContent = '返回兌換頁';
      action.onclick = () => { $('exchange-result-modal').classList.add('hidden-view'); shouldFail = false; render(); };
    }
    $('exchange-result-modal').classList.remove('hidden-view');
  }

  document.addEventListener('DOMContentLoaded', () => {
    $('decrease-btn').onclick = () => { amount -= 1; render(); };
    $('increase-btn').onclick = () => { amount += 1; render(); };
    document.querySelectorAll('.quick-amount').forEach(button => {
      button.onclick = () => { amount = button.dataset.amount === 'max' ? maxAmount() : Number(button.dataset.amount); render(); };
    });
    $('exchange-submit').onclick = () => $('exchange-confirm-modal').classList.remove('hidden-view');
    $('cancel-exchange').onclick = () => $('exchange-confirm-modal').classList.add('hidden-view');
    $('confirm-exchange').onclick = () => openResult(!shouldFail);
    $('simulate-failure').onclick = () => { shouldFail = true; $('exchange-confirm-modal').classList.remove('hidden-view'); };
    render();
  });
})();
