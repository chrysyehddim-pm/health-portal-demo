
window.GOHEALTH_DATA = {
  exchange: {
    healthPointBalance: 1200,
    healthPointsPerHappyGoPoint: 500,
    limitedPointValidityDays: 180,
    immediateCredit: true,
    refundableAfterSuccess: false
  },
  initialAppState: {
    group: {
      isBound: true,
      inviteCode: '839201',
      streak: 4,
      maxPoints: 10000,
      members: [
        { id: 1, name: 'Chrys（你）', role: '房主', points: 1200, isYou: true, gender: 'F', latestActivity: { game: '幸福柑仔店', icon: '🧠', points: 200 } },
        { id: 2, name: '爸爸', role: '成員', points: 300, isYou: false, gender: 'M', latestActivity: { game: '眼力極限考驗', icon: '👀', points: 100 } },
        { id: 3, name: '新成員', role: '成員', points: 450, isYou: false, gender: 'U', latestActivity: { game: '24H 一日店長', icon: '🏪', points: 150 } }
      ]
    }
  },
  notifications: [
    { id: 1, type: 'system', icon: '📢', title: '本週抽獎結果出爐！', desc: '恭喜您的群組獲得 100 點 HAPPY GO 點數！', time: '10 分鐘前', isRead: false },
    { id: 2, type: 'message', icon: '💬', title: '爸爸 傳送了關心', desc: '喝杯水休息一下，今天的健康任務做得很棒唷！', time: '2 小時前', isRead: false },
    { id: 3, type: 'milestone', icon: '🎫', title: '群組達成里程碑', desc: '群組累積滿 1,000 點，成功獲得 1 張抽獎券！', time: '昨天', isRead: true },
    { id: 4, type: 'group', icon: '👋', title: '新成員加入', desc: '媽媽 已成功加入您的家庭群組。', time: '2 天前', isRead: true },
    { id: 5, type: 'points', icon: '💰', title: '新手任務完成', desc: '專屬健康設定已完成，獲得 100 點。', time: '3 天前', isRead: true }
  ],
  cannedMessages: {
    host: [
      { icon: '🔥', text: '趕快參與任務，為我們群組累積健康點！' },
      { icon: '💪', text: '群組任務缺你不可！快來完成今天的挑戰吧！' },
      { icon: '🧠', text: '最近比較忙嗎？記得抽空動動腦，維持好狀態喔！' }
    ],
    member: [
      { icon: '👀', text: '好一陣子沒參與囉，趕快來關心你一下！' },
      { icon: '🏃‍♂️', text: '大家都在等你喔！快來跟我們一起累積健康點！' },
      { icon: '🍵', text: '再忙也要記得照顧自己，花個三分鐘玩任務吧！' }
    ]
  },
  errorScenarios: [
    { icon: '📡', title: '系統連線異常', msg: '網路似乎有點不穩，請確認網路狀態後再試 (Err: 504/Offline)', btn: '重新載入' },
    { icon: '⚠️', title: '發生未知的錯誤', msg: '系統正在搶修中，請稍候再試 (Err: 500)', btn: '回首頁' },
    { icon: '🛠️', title: '系統維護中', msg: 'GO HEALTH 正在進行升級保養，預計於 HH:MM 恢復服務 (Err: 503)', btn: '' },
    { icon: '🔍', title: '找不到此頁面', msg: '您訪問的頁面不存在或已移除 (Err: 404)', btn: '回首頁' },
    { icon: '🚫', title: '權限已變更', msg: '您的登入狀態已失效，為了保護個資安全，請重新登入 (Err: 403)', btn: '重新登入' },
    { icon: '🔒', title: '此群組已解散', msg: '此群組已被房主解散，請向家人索取最新代碼 (Err: 410)', btn: '回首頁' }
  ]
};
