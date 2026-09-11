// ═══════════════════════════════════
//   无法离开的房间 — 游戏引擎 v3
//   梦核·旧QQ空间·多周目·循环
// ═══════════════════════════════════

// ─── DOM ───
const $ = id => document.getElementById(id);
const fadeOverlay = $('fade-overlay');
const fadeText = $('fade-text');
const glitchLayer = $('glitch-layer');
const titleScreen = $('title-screen');
const bulletinText = $('bulletin-text');
const exitBtn = $('exit-btn');
const dialogBox = $('dialog-box');
const dialogText = $('dialog-text');
const speakerTag = $('speaker-tag');
const dialogContinue = $('dialog-continue');
const dialogOptions = $('dialog-options');
const loopCounter = $('loop-counter');
const visitorCounter = $('visitor-counter');
const placeholderRoom = document.querySelector('.placeholder-room');
const talkList = $('talk-list');
const boardList = $('board-list');
const boardInput = $('board-input');
const boardSendBtn = $('board-send-btn');
const infoFields = $('info-fields');
const tabContent = $('tab-content');

// ─── 音效引擎（Web Audio API 合成，无需外部文件）───
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
  }
  return audioCtx;
}
function playTone(freq, duration, type = 'sine', volume = 0.08, delay = 0) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.05);
}
function playNoise(duration, volume = 0.05, delay = 0) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const now = ctx.currentTime + delay;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration);
}
// 音效快捷方法（v2：音量加大 + 恐怖元素音效）
const sfx = {
  click: () => playTone(800, 0.05, 'square', 0.12),
  type: () => playTone(600 + Math.random() * 200, 0.02, 'sine', 0.08),
  clue: () => { playTone(523, 0.15, 'sine', 0.14); playTone(784, 0.2, 'sine', 0.12, 0.08); },
  loop: () => { playTone(200, 0.4, 'sawtooth', 0.14); playNoise(0.3, 0.09); },
  unlock: () => { playTone(440, 0.1, 'sine', 0.14); playTone(660, 0.1, 'sine', 0.12, 0.06); playTone(880, 0.15, 'sine', 0.12, 0.12); },
  glitch: () => playNoise(0.15, 0.15),
  door: () => playTone(150, 0.3, 'sawtooth', 0.14),
  ending: () => { playTone(523, 0.3, 'sine', 0.14); playTone(659, 0.3, 'sine', 0.12, 0.15); playTone(784, 0.5, 'sine', 0.12, 0.3); },
  fogwipe: () => playTone(300 + Math.random() * 100, 0.03, 'sine', 0.06),
  // === 恐怖元素音效 ===
  notify: () => { playTone(880, 0.08, 'sine', 0.12); playTone(1320, 0.12, 'sine', 0.10, 0.06); },
  shake: () => { playTone(80, 0.6, 'sawtooth', 0.16); playNoise(0.4, 0.10); },
  heartbeat: () => { playTone(60, 0.15, 'sine', 0.14); playTone(50, 0.2, 'sine', 0.10, 0.2); },
};

// === BGM 背景音乐系统（Web Audio API 合成循环，用于恐怖元素"音乐突然停掉"）===
let bgmNodes = null;
let bgmPlaying = false;
let bgmGain = null;
let bgmStopped = false; // 是否被恐怖事件停止过（防止重新启动）

function startBgm() {
  const ctx = getAudioCtx();
  if (!ctx || bgmPlaying || bgmStopped) return;
  bgmPlaying = true;

  bgmGain = ctx.createGain();
  bgmGain.gain.value = 0.025;
  bgmGain.connect(ctx.destination);

  // 低频持续音 drone
  const droneOsc = ctx.createOscillator();
  droneOsc.type = 'sine';
  droneOsc.frequency.value = 110;
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.5;
  droneOsc.connect(droneGain);
  droneGain.connect(bgmGain);
  droneOsc.start();

  // 第二层低音
  const drone2 = ctx.createOscillator();
  drone2.type = 'sine';
  drone2.frequency.value = 55;
  const drone2Gain = ctx.createGain();
  drone2Gain.gain.value = 0.3;
  drone2.connect(drone2Gain);
  drone2Gain.connect(bgmGain);
  drone2.start();

  // LFO 调制，让音色微微波动
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.1;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 3;
  lfo.connect(lfoGain);
  lfoGain.connect(droneOsc.frequency);
  lfo.start();

  // 旋律层——每隔一段时间播一个音符
  const melodyNotes = [220, 261.63, 293.66, 329.63, 220, 196];
  let melodyIdx = 0;
  const melodyTimer = setInterval(() => {
    if (!bgmPlaying) return;
    const freq = melodyNotes[melodyIdx % melodyNotes.length];
    melodyIdx++;
    playTone(freq, 1.5, 'sine', 0.02, 0);
  }, 3000);

  bgmNodes = { droneOsc, drone2, lfo, melodyTimer };
}

function stopBgm(sudden = false) {
  if (!bgmPlaying) return;
  const ctx = getAudioCtx();
  bgmStopped = true; // 标记：不再自动恢复

  if (sudden && ctx && bgmGain) {
    // 突然停止——最恐怖
    bgmGain.gain.setValueAtTime(0, ctx.currentTime);
  } else if (ctx && bgmGain) {
    // 渐弱停止
    bgmGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
  }

  setTimeout(() => {
    if (bgmNodes) {
      try {
        bgmNodes.droneOsc.stop();
        bgmNodes.drone2.stop();
        bgmNodes.lfo.stop();
        clearInterval(bgmNodes.melodyTimer);
      } catch(e) {}
      bgmNodes = null;
    }
    bgmPlaying = false;
  }, sudden ? 100 : 2000);
}

// === 恐怖元素工具函数 ===

// 页面抖动
function triggerShake() {
  const game = document.getElementById('game');
  if (!game) return;
  sfx.shake();
  game.classList.add('shaking');
  setTimeout(() => game.classList.remove('shaking'), 500);
  // 抖动时同步闪烁故障层
  glitchLayer.classList.add('active');
  setTimeout(() => glitchLayer.classList.remove('active'), 500);
}

// 假故障：将文字变成乱码/方块字
const glitchChars = ['□', '■', '◇', '◆', '░', '▒', '▓', '?', '㊀', '㊁', '×', '〄', '∎'];
function glitchText(text, level = 1) {
  // level 1: 轻度，~30%字符变乱码
  // level 2: 中度，~60%字符变乱码
  // level 3: 严重，~90%字符变方块
  const ratio = level === 1 ? 0.3 : level === 2 ? 0.6 : 0.9;
  return text.split('').map(ch => {
    if (ch === ' ' || ch === '\n' || ch === '★') return ch;
    return Math.random() < ratio ? glitchChars[Math.floor(Math.random() * glitchChars.length)] : ch;
  }).join('');
}

// 留言板自动冒出不明消息 + 提示音弹窗
const ghostMessages = [
  { author: '——', text: '你在看我。', class: 'npc-npc-space' },
  { author: '——', text: '别翻太多了。', class: 'npc-npc-space' },
  { author: '——', text: '我也在这里。', class: 'npc-npc-space' },
  { author: '——', text: '你每次都会翻到这里。', class: 'npc-npc-space' },
  { author: '——', text: '□□□□□ 在看 □□□□□', class: 'npc-npc-space' },
  { author: '——', text: '你刚才是不是回头了？', class: 'npc-npc-space' },
  { author: '——', text: '0413。你忘了吗。', class: 'npc-npc-space' },
];

function showNewMsgNotify() {
  let notify = document.getElementById('new-msg-notify');
  if (!notify) {
    notify = document.createElement('div');
    notify.id = 'new-msg-notify';
    notify.innerHTML = '<span class="notify-icon"></span><span class="notify-text">您有一条新留言</span>';
    document.getElementById('game').appendChild(notify);
  }
  notify.classList.add('show');
  sfx.notify();
  setTimeout(() => {
    notify.classList.remove('show');
  }, 3500);
}

function injectGhostMessage() {
  const msg = ghostMessages[Math.floor(Math.random() * ghostMessages.length)];
  const ghostMsg = {
    author: msg.author,
    time: '刚才',
    text: msg.text,
    class: msg.class,
    isGhost: true,
  };
  state.boardMessages.push(ghostMsg);
  saveGame();
  showNewMsgNotify();
  // 延迟渲染，让提示先出来
  setTimeout(() => renderBoard(), 1200);
}

// ─── 状态 ───
const state = {
  loopCount: 0,
  playthrough: 1,
  isTyping: false,
  isHandling: false,
  skipRequested: false,
  interactedThisLoop: {},
  dialogueHistory: [],
  clues: [],
  boardMessages: [],
  userComments: {},
  currentTab: 'home',
  bulletinClicks: 0,
  lockSolved: false,
  lockAttemptsThisLoop: 0,
  noteContent: null,
  fogCleared: false,
  dressupUnlocked: false,
  gameEnded: false,
  pt3Retries: 0,
};

// ─── 存档 ───
function saveGame() {
  try {
    localStorage.setItem('loopRoom_save', JSON.stringify({
      loopCount: state.loopCount,
      playthrough: state.playthrough,
      dialogueHistory: state.dialogueHistory.slice(-20),
      clues: state.clues,
      boardMessages: state.boardMessages.slice(-50),
      userComments: state.userComments,
      lockSolved: state.lockSolved,
      lockAttemptsThisLoop: 0,
      noteContent: state.noteContent,
      fogCleared: state.fogCleared,
      dressupUnlocked: state.dressupUnlocked,
      gameEnded: state.gameEnded,
      pt3Retries: state.pt3Retries,
    }));
  } catch(e) {}
}
function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem('loopRoom_save'));
    if (d) {
      state.playthrough = d.playthrough || 1;
      state.loopCount = d.loopCount || 0;
      state.dialogueHistory = d.dialogueHistory || [];
      state.clues = d.clues || [];
      state.boardMessages = d.boardMessages || [];
      state.userComments = d.userComments || {};
      state.lockSolved = d.lockSolved || false;
      state.lockAttemptsThisLoop = 0;
      state.noteContent = d.noteContent || null;
      state.fogCleared = d.fogCleared || false;
      state.dressupUnlocked = d.dressupUnlocked || false;
      state.gameEnded = d.gameEnded || false;
      state.pt3Retries = d.pt3Retries || 0;
      
      // v5迁移：根据周目自动补全旧存档丢失的线索
      // 一周目c3后应收集的3条线索
      if (state.playthrough >= 1 && state.loopCount >= 3) {
        ['note_date', 'window_numbers', 'mirror_msg'].forEach(c => {
          if (!state.clues.includes(c)) state.clues.push(c);
        });
      }
      // 二周目c3后应收集的2条线索
      if (state.playthrough >= 2 && state.loopCount >= 3) {
        ['stranger_identity', 'loop_history'].forEach(c => {
          if (!state.clues.includes(c)) state.clues.push(c);
        });
      }
      // 三周目c3后应收集的2条线索
      if (state.playthrough >= 3 && state.loopCount >= 3) {
        ['space_owner', 'door_truth'].forEach(c => {
          if (!state.clues.includes(c)) state.clues.push(c);
        });
      }
    }
  } catch(e) {}
}

// ═══════════════════════════════════
//   Tab 系统
// ═══════════════════════════════════
function switchTab(tab) {
  state.currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + tab));
  if (tab === 'info') { renderInfo(); renderDressup(); renderClueCollection(); }
  if (tab === 'board') renderBoard();
}
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ═══════════════════════════════════
//   打字机
// ═══════════════════════════════════
function typeWriter(text, speaker, opts = {}) {
  return new Promise(resolve => {
    state.isTyping = true;
    state.skipRequested = false;
    speakerTag.textContent = speaker || '房间';
    speakerTag.style.display = speaker ? 'inline-block' : 'none';
    dialogText.textContent = '';
    dialogContinue.classList.add('hidden');
    dialogOptions.innerHTML = '';
    const speed = opts.speed || 45;
    const pdelay = { '。':200,'！':200,'？':200,'…':300,'，':120,'、':100,'：':150 };
    let i = 0;
    function step() {
      if (state.skipRequested) {
        dialogText.textContent = text;
        state.isTyping = false;
        dialogContinue.classList.remove('hidden');
        resolve(); return;
      }
      if (i >= text.length) {
        state.isTyping = false;
        sfx.click();
        if (opts.autoContinue !== false) dialogContinue.classList.remove('hidden');
        resolve(); return;
      }
      dialogText.textContent += text[i];
      const ch = text[i]; i++;
      if (i % 2 === 0) sfx.type();
      setTimeout(step, pdelay[ch] || speed);
    }
    step();
  });
}
dialogBox.addEventListener('click', () => { if (state.isTyping) state.skipRequested = true; });

// ═══════════════════════════════════
//   选项
// ═══════════════════════════════════
function showOptions(options, speaker = '房间') {
  return new Promise(resolve => {
    dialogContinue.classList.add('hidden');
    dialogOptions.innerHTML = '';
    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.textContent = `▷ ${opt.text}`;
      btn.addEventListener('click', () => {
        dialogOptions.innerHTML = '';
        if (opt.callback) opt.callback();
        resolve(opt.value || opt.text);
      });
      dialogOptions.appendChild(btn);
    });
  });
}

// ═══════════════════════════════════
//   循环过渡（带加载文字）
// ═══════════════════════════════════
function triggerLoop() {
  return new Promise(resolve => {
    sfx.glitch();
    sfx.loop();
    glitchLayer.classList.add('active');
    setTimeout(() => glitchLayer.classList.remove('active'), 600);
    setTimeout(() => {
      fadeOverlay.classList.add('show');
      // ═══ 过渡动画文字池：扩大+随机抽取 ═══
      const loadingPool = [
        '正在重置空间...',
        '恢复访客记录...',
        '加载回忆...',
        '回忆不完整。继续。',
        '正在校准时间...',
        '空间状态：未知',
        '记忆碎片已归档',
        '循环次数已更新',
        '正在清理上一轮的痕迹...',
        '痕迹清理失败。保留中。',
        '加载最后一个房间的状态...',
        '房间状态：有人',
        '正在同步镜子...',
        '镜面数据不匹配。忽略。',
        '准备下一次循环...',
        '你不记得了。这很正常。',
      ];
      // 根据循环进度决定显示条数
      const c0 = state.loopCount;
      const pt0 = state.playthrough;
      const totalLoops0 = c0 + (pt0 - 1) * 14;
      let msgCount;
      if (totalLoops0 >= 28) msgCount = 2;       // 三周目后期：2条
      else if (totalLoops0 >= 14) msgCount = 3;   // 二周目起：3条
      else msgCount = 4;                          // 一周目：4条（保持原始节奏）
      
      // 随机抽取，避免重复
      const shuffled = [...loadingPool].sort(() => Math.random() - 0.5);
      const loadingMsgs = shuffled.slice(0, msgCount);
      
      let li = 0;
      async function showLoadText() {
        if (li >= loadingMsgs.length) {
          state.loopCount++;
          state.lockAttemptsThisLoop = 0;
          updateRoomState();
          saveGame();
          // === 恐怖元素触发点 ===
          const c = state.loopCount;
          const pt = state.playthrough;
          const totalLoops = c + (pt - 1) * 14;

          // 页面抖动：二周目c5+ 或 三周目c3+，随机触发
          if ((pt === 2 && c >= 5 && Math.random() < 0.35) || (pt === 3 && c >= 3 && Math.random() < 0.4)) {
            setTimeout(() => triggerShake(), 800);
          }

          // BGM突然停止：二周目c8 或 三周目c6，一次性触发
          if ((pt === 2 && c === 8) || (pt === 3 && c === 6)) {
            if (bgmPlaying) {
              setTimeout(() => {
                stopBgm(true);
                setTimeout(() => sfx.heartbeat(), 1500);
              }, 2000);
            }
          }

          // 留言板冒鬼消息：三周目c4+ 或 二周目c10+，随机触发
          if ((pt === 3 && c >= 4 && Math.random() < 0.3) || (pt === 2 && c >= 10 && Math.random() < 0.25)) {
            setTimeout(() => injectGhostMessage(), 3000);
          }

          // 假故障：公告板文字乱码——深循环时触发
          if (c >= 7 && Math.random() < 0.3) {
            setTimeout(() => {
              const original = bulletinText.textContent;
              const level = c >= 11 ? 3 : c >= 9 ? 2 : 1;
              bulletinText.textContent = glitchText(original, level);
              bulletinText.classList.add('glitched-text');
              sfx.glitch();
              setTimeout(() => {
                bulletinText.textContent = original;
                bulletinText.classList.remove('glitched-text');
              }, 2000);
            }, 1500);
          }

          setTimeout(() => {
            fadeText.classList.remove('show');
            fadeOverlay.classList.remove('show');
            resolve();
          }, 500);
          return;
        }
        // 加载文字也偶尔出现假故障
        let displayText = loadingMsgs[li];
        if (state.loopCount >= 5 && Math.random() < 0.2) {
          displayText = glitchText(displayText, 1);
        }
        fadeText.textContent = displayText;
        fadeText.classList.add('show');
        li++;
        // 后期循环缩短展示时间，加快节奏
        const showTime = totalLoops0 >= 28 ? 600 : totalLoops0 >= 14 ? 750 : 900;
        const gapTime = totalLoops0 >= 28 ? 150 : totalLoops0 >= 14 ? 250 : 300;
        setTimeout(() => {
          fadeText.classList.remove('show');
          setTimeout(showLoadText, gapTime);
        }, showTime);
      }
      setTimeout(showLoadText, 700);
    }, 500);
  });
}

// ═══════════════════════════════════
//   房间状态更新
// ═══════════════════════════════════
function updateRoomState() {
  const c = state.loopCount;
  const pt = state.playthrough;
  loopCounter.textContent = `LOOP ${String(c + 1).padStart(2,'0')} · ${pt}周目`;
  visitorCounter.textContent = `访客：${String(c + 1 + (pt-1)*14).padStart(3,'0')}`;
  loopCounter.classList.add('show');
  visitorCounter.classList.add('show');
  if (c >= 9) loopCounter.classList.add('warn');

  placeholderRoom.classList.remove('faded','aged','broken');
  if (c >= 3 && c <= 5) placeholderRoom.classList.add('faded');
  else if (c >= 6 && c <= 8) placeholderRoom.classList.add('aged');
  else if (c >= 9) placeholderRoom.classList.add('broken');

  const bulletins = [
    '★ 欢迎来到我的空间 ★ 请文明留言 ★ 你是第 ' + (c+1+(pt-1)*14) + ' 位访客 ★',
    '★ 别忘了签到哦 ★ 今天也要开开心心 ★ 你来过了 ★',
    '★ 这个空间好像坏了 ★ 修不好的那种 ★',
    '★ 你还在吗 ★ 你还在吗 ★ 你还在吗 ★',
    '★ ' + (state.dialogueHistory[0] || '别走') + ' ★',
    '★ □□□□★□□□□★□□□ ★ 错误：访客无法离开 ★',
    // c6+：空间开始认识你
    '★ 欢迎回来 ★ 你又来了 ★ 我记得你上次也来了 ★',
    // c7
    '★ 你每次都说要离开 ★ 你每次都没走 ★ 你知道为什么 ★',
    // c8
    '★ 空间在修 ★ 修不好 ★ 因为坏的不是空间 ★ 是你 ★',
    // c9
    '★ 你是不是忘了什么 ★ 0413 ★ 你忘了对吗 ★ 没关系 ★ 你下次还会忘 ★',
    // c10
    '★ 你留过言 ★ 你不记得了 ★ 但留言记得你 ★',
    // c11
    '★ 上一个你也走到了这一步 ★ 他也以为自己快出去了 ★',
    // c12
    '★ 门从里面开 ★ 你知道的 ★ 你一直都知道 ★',
    // c13+
    '★ □□□□□□★□□□□□□★ 你已经是空间的一部分了 ★ 欢迎回家 ★',
  ];
  const bIdx = c < 1 ? 0 : c < 2 ? 1 : c < 3 ? 2 : c < 4 ? 3 : c < 5 ? 4 : c < 6 ? 5 : c < 7 ? 6 : c < 8 ? 7 : c < 9 ? 8 : c < 10 ? 9 : c < 11 ? 10 : c < 12 ? 11 : c < 13 ? 12 : 13;
  bulletinText.textContent = bulletins[bIdx];

  renderTalks();
  renderBoard();
  renderInfo();
  
  // 密码锁显示逻辑：二周目c3后（陌生人提到密码），且未解开
  const doorlockItem = document.getElementById('doorlock-item');
  if (doorlockItem) {
    if (state.playthrough >= 2 && state.loopCount >= 3 && !state.lockSolved) {
      doorlockItem.style.display = '';
    } else if (state.lockSolved) {
      doorlockItem.style.display = 'none';
    } else {
      doorlockItem.style.display = 'none';
    }
  }

  // 窗户雾气已移除（叙事整合到对话流程中）
  // const fog = document.getElementById('window-fog');
  // if (fog) { ... }

}

// ═══════════════════════════════════
//   说说数据
// ═══════════════════════════════════
const talkData = {
  1: [
    { time: '2008-06-15', author: '我', content: '空间终于装扮好了！花了两天选背景，好有成就感！', comments: [
      { author: '旧友', text: '好看好看！我也去弄一个！' },
    ]},
    { time: '2008-06-20', author: '我', content: '今天心情不错，给空间换了新音乐。每次打开都很开心。', comments: [] },
    { time: '2008-06-25', author: '我', content: '给空间加了个留言板。欢迎大家来踩踩！踩了必回踩！', comments: [
      { author: '旧友', text: '踩了踩了！记得回踩哦~' },
    ]},
    { time: '2008-07-01', author: '我', content: '最近总觉得来空间的访客变多了，但不认识是谁。你们好呀。', comments: [
      { author: '旧友', text: '可能是乱逛的吧，别多想~' },
    ]},
    { time: '2008-07-05', author: '我', content: '昨晚做了个梦。梦见一扇门，门后面是我自己。好奇怪。', comments: [
      { author: '旧友', text: '你想多了，梦而已嘛。' },
    ]},
    { time: '2008-07-10', author: '我', content: '我好像改不了背景了。刷新了好多次，每次都变回来。', comments: [] },
    { time: '2008-07-12', author: '我', content: '镜子里的我好像在跟我说话。但我不敢靠近听。', comments: [] },
    { time: '2008-07-15', author: '我', content: '有人在我的空间留了言。我不知道是谁。留言只有四个字。', comments: [
      { author: '旧友', text: '什么四个字？' },
      { author: '我', text: '你还在这里。' },
    ]},
  ],
  2: [
    { time: '2008-06-15', author: '我', content: '空间终于装扮好了！花了两天选背景。但总觉得哪里不对。', comments: [
      { author: '陌生人', text: '你的空间密码是多少？' },
    ]},
    { time: '2008-06-20', author: '我', content: '今天给空间换了新音乐。但我没选过这首歌。', comments: [] },
    { time: '2008-06-28', author: '我', content: '访客记录里多了一个日期。2008-04-13。我不记得那天来过。', comments: [
      { author: '陌生人', text: '你来的。你只是不记得了。' },
    ]},
    { time: '2008-07-01', author: '我', content: '访客记录里有一个名字我看不到。只显示"——"。', comments: [
      { author: '陌生人', text: '那是我。' },
    ]},
    { time: '2008-07-06', author: '我', content: '纸条上出现了不是我写的字。我写了"我试过开门"，背面多了"门没开"。', comments: [] },
    { time: '2008-07-10', author: '我', content: '改不了背景了。现在背景上多了一行字：你已经在这里了。', comments: [] },
    { time: '2008-07-13', author: '我', content: '窗户上有雾。擦了之后看到了数字。但我不确定是不是真的。', comments: [
      { author: '陌生人', text: '是真的。你擦掉的那组数字。你每次都会忘。' },
    ]},
    { time: '2008-07-15', author: '我', content: '', comments: [
      { author: '陌生人', text: '空间密码是四位数。你在窗户外面看到的。' },
    ]},
  ],
  3: [
    { time: '2008-06-15', author: '我', content: '我不记得什么时候装扮了这个空间。也不记得为什么。', comments: [] },
    { time: '2008-06-20', author: '我', content: '音乐停了。不是坏了。是这首歌放完了。放了多少遍了。', comments: [] },
    { time: '2008-07-01', author: '我', content: '——', comments: [
      { author: '空间', text: '你终于看到这条了。门从里面开。' },
    ]},
    { time: '2008-07-10', author: '我', content: '我写了纸条。我不知道写给谁。也许写给下一次的我。', comments: [
      { author: '空间', text: '他会读的。他每次都会读。' },
    ]},
    { time: '????-??-??', author: '我', content: '你还在读这些。', comments: [] },
  ],
};

function degradeTalks(src, loopCount) {
  const result = src.map(t => ({
    ...t,
    comments: t.comments ? t.comments.map(c => ({ ...c })) : []
  }));

  if (loopCount >= 13) {
    // c13+：严重坏——时间全毁、内容方块化、旧友暴露
    result.forEach(t => {
      t.time = '????-??-??';
      if (t.content && t.content.length > 2) {
        t.content = t.content.split('').map((ch, idx) => idx % 2 === 0 ? ch : '□').join('');
      }
      t.comments.forEach(c => {
        if (c.author === '旧友') { c.author = '上一个你'; }
      });
    });
  } else if (loopCount >= 10) {
    // c10-12：中度坏——前两条内容缺字、时间戳乱、旧友名字动摇
    result.forEach((t, i) => {
      if (i <= 1) {
        t.time = t.time.slice(0, 5) + '??-??';
        if (t.content) {
          t.content = t.content.split('').map((ch, idx) => idx % 3 === 2 ? '□' : ch).join('');
        }
      }
      if (loopCount >= 11) {
        t.comments.forEach(c => {
          if (c.author === '旧友') { c.author = '上一个你？'; }
        });
      }
    });
  } else if (loopCount >= 6) {
    // c6-9：轻度坏——旧友评论变调、第一条时间戳尾数丢失
    result.forEach((t, i) => {
      if (i === 0) { t.time = t.time.slice(0, -2) + '??'; }
      t.comments.forEach(c => {
        if (c.author === '旧友') { c.text = '……' + c.text; }
      });
    });
  }

  return result;
}

function renderTalks() {
  let talks = talkData[state.playthrough] || talkData[1];
  talks = degradeTalks(talks, state.loopCount);
  talkList.innerHTML = '';
  talks.forEach((t, i) => {
    const div = document.createElement('div');
    div.className = 'talk-item';
    // 叠加玩家评论
    if (state.userComments && state.userComments[i]) {
      t.comments = (t.comments || []).concat(state.userComments[i]);
    }
    let commentsHtml = '';
    if (t.comments && t.comments.length) {
      commentsHtml = '<div class="talk-comments">';
      t.comments.forEach(c => {
        commentsHtml += `<div class="talk-comment"><span class="comment-author">${c.author}：</span>${c.text}</div>`;
      });
      commentsHtml += '<div class="talk-comment-btn">评论</div></div>';
    } else {
      commentsHtml = '<div class="talk-comments"><div class="talk-comment-btn">评论</div></div>';
    }
    div.innerHTML = `
      <div class="talk-header">
        <div class="talk-avatar"></div>
        <span class="talk-author">${t.author}</span>
        <span class="talk-time">${t.time}</span>
      </div>
      <div class="talk-content">${t.content || '（这条说说是空的）'}</div>
      ${commentsHtml}
    `;
    const commentBtn = div.querySelector('.talk-comment-btn');
    if (commentBtn) {
      commentBtn.addEventListener('click', () => {
        // 如果已经有输入框了，就收起
        const existingInput = div.querySelector('.talk-comment-input');
        if (existingInput) {
          existingInput.remove();
          commentBtn.style.display = '';
          return;
        }
        commentBtn.style.display = 'none';
        // 创建内嵌评论输入框
        const inputWrap = document.createElement('div');
        inputWrap.className = 'talk-comment-input';
        inputWrap.innerHTML = '<input type="text" placeholder="说点什么……" autocomplete="off"><button>发送</button>';
        // 找到评论容器，把输入框插进去
        const commentsContainer = div.querySelector('.talk-comments');
        if (commentsContainer) {
          commentsContainer.appendChild(inputWrap);
        } else {
          // 没有评论容器就新建一个
          const newContainer = document.createElement('div');
          newContainer.className = 'talk-comments';
          newContainer.appendChild(inputWrap);
          div.appendChild(newContainer);
        }
        const input = inputWrap.querySelector('input');
        const btn = inputWrap.querySelector('button');
        input.focus();

        const sendComment = () => {
          const text = input.value.trim();
          if (!text) return;
          // 存到 state.userComments
          if (!state.userComments) state.userComments = {};
          if (!state.userComments[i]) state.userComments[i] = [];
          state.userComments[i].push({ author: '我', text: text });
          saveGame();
          // 重新渲染这条说说
          renderTalks();
          // 循环越多，评论越容易"褪色"
          const c = state.loopCount;
          if (c >= 6) {
            setTimeout(() => {
              // 评论"褪色"——给最后一条评论加淡化效果
              const allTalks = document.querySelectorAll('.talk-item');
              if (allTalks[i]) {
                const lastComment = allTalks[i].querySelector('.talk-comment:last-child');
                if (lastComment) {
                  lastComment.style.transition = 'opacity 2s ease';
                  lastComment.style.opacity = '0.3';
                }
              }
            }, 100);
          }
        };
        btn.addEventListener('click', sendComment);
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); sendComment(); }
        });
      });
    }
    talkList.appendChild(div);
  });
}

// ═══════════════════════════════════
//   留言板系统 v3（玩家留言 + NPC概率回复）
// ═══════════════════════════════════

// NPC 回复池
const npcReplyPool = {
  1: [ // 一周目·旧友为主，偶尔闪过陌生人
    { author: '旧友', text: '你来了啊。好久不见。空间还是老样子呢。', class: 'npc-reply' },
    { author: '旧友', text: '踩踩~记得回踩哦。', class: 'npc-reply' },
    { author: '旧友', text: '你怎么也来了？我以为只有我会回来。', class: 'npc-reply' },
    { author: '旧友', text: '这个空间……你还有印象吗？我们一起弄的。', class: 'npc-reply' },
    { author: '旧友', text: '你最近是不是没睡好？你说话感觉怪怪的。', class: 'npc-reply' },
    { author: '旧友', text: '我去你空间看了，音乐变了。你换的吗？', class: 'npc-reply' },
    // 以下为c6+变调回复——旧友开始暴露
    { author: '旧友', text: '你有没有觉得……我们好像认识很久了。比应该的更久。', class: 'npc-reply', minLoop: 6 },
    { author: '旧友', text: '你问我怎么来的。我不记得了。但我好像……一直在这里。', class: 'npc-reply', minLoop: 8 },
    { author: '旧友', text: '你走了以后，我会等你回来。每次都会等。', class: 'npc-reply', minLoop: 10 },
    { author: '旧友', text: '……你有没有想过，也许我并不存在。也许我就是你。', class: 'npc-reply', minLoop: 12 },
    { author: '旧友', text: '你说你要走。但你每次说的"走"都变成了"回来"。', class: 'npc-reply', minLoop: 9 },
    { author: '???', text: '……', class: 'npc-npc-stranger' },
  ],
  2: [ // 二周目·旧友和陌生人
    { author: '旧友', text: '你又来了。你发现了吗，这里有些东西变了。', class: 'npc-reply' },
    { author: '旧友', text: '我不记得我是怎么来这里的了。但我走不了。', class: 'npc-reply' },
    { author: '旧友', text: '你上次走的时候说了再见。但你又来了。', class: 'npc-reply' },
    { author: '陌生人', text: '你不认识我。但我认识你。', class: 'npc-npc-stranger' },
    { author: '陌生人', text: '我在你之前的循环里来过。', class: 'npc-npc-stranger' },
    { author: '陌生人', text: '去看看窗户。擦干净。', class: 'npc-npc-stranger' },
    { author: '陌生人', text: '你每次都会留言。你每次都不记得。', class: 'npc-npc-stranger' },
    { author: '陌生人', text: '你说的话我都看到了。上一个你也说过。', class: 'npc-npc-stranger' },
    { author: '陌生人', text: '你试过推门了吗？你推了多少次了？', class: 'npc-npc-stranger', minLoop: 5 },
    { author: '陌生人', text: '镜子里的不是我。是你。你看到了吗？', class: 'npc-npc-stranger', minLoop: 7 },
    { author: '陌生人', text: '别怕。我也走过这一遍。我也没走出去。', class: 'npc-npc-stranger', minLoop: 10 },
  ],
  3: [ // 三周目·空间本身出现，回复中藏第4条线索
    { author: '旧友', text: '我不是你的朋友。我是上一个你。', class: 'npc-reply' },
    { author: '空间', text: '你还在留言。你每次都会留言。', class: 'npc-npc-space' },
    { author: '空间', text: '你有没有想过——这个空间的主人是谁？', class: 'npc-npc-space' },
    { author: '空间', text: '你去看看信息栏。有些东西补上了。', class: 'npc-npc-space', giveClue: 'space_owner' },
    { author: '空间', text: '门从里面开。你知道的。', class: 'npc-npc-space' },
    { author: '空间', text: '这个空间的主人——就是上一个走进来的人。', class: 'npc-npc-space', giveClue: 'space_owner' },
    { author: '空间', text: '你写的纸条我都收到了。每一张。', class: 'npc-npc-space' },
    { author: '空间', text: '你问我为什么不放你走。我没有不放你。你自己没走。', class: 'npc-npc-space', minLoop: 5 },
    { author: '空间', text: '上一个你走的时候没有回头。你也没有。', class: 'npc-npc-space', minLoop: 8 },
    { author: '空间', text: '你已经可以走了。你一直都可以。', class: 'npc-npc-space', minLoop: 10 },
    { author: '空间', text: '你会记得这里吗？你每次都说会。你每次都忘。', class: 'npc-npc-space', minLoop: 12 },
  ],
};

// ═══════════════════════════════════
//   留言板关键词触发回复（100%触发，按周目区分）
// ═══════════════════════════════════
const boardKeywordReplies = [
  {
    keywords: ['你是谁', '你是谁？', '你是什么'],
    replies: {
      1: { author: '旧友', text: '我？你不记得了？我们以前……算了。', class: 'npc-reply' },
      2: { author: '陌生人', text: '你问了我很多次了。每次你都不记得答案。', class: 'npc-npc-stranger' },
      3: { author: '空间', text: '你问的不是我是谁。你问的是你自己是谁。', class: 'npc-npc-space' },
    },
  },
  {
    keywords: ['0413'],
    replies: {
      1: { author: '旧友', text: '……你怎么知道的？那是……算了，你以后会忘的。', class: 'npc-reply' },
      2: { author: '陌生人', text: '你终于记住了。但记住也没用。你下次还会忘。', class: 'npc-npc-stranger' },
      3: { author: '空间', text: '0413。那是你第一次走进来的日期。你一直带着它。', class: 'npc-npc-space' },
    },
  },
  {
    keywords: ['密码', '密码是什么', '锁'],
    replies: {
      1: { author: '旧友', text: '密码？什么密码？空间没有密码吧。', class: 'npc-reply' },
      2: { author: '陌生人', text: '四位数。你在窗户上看到的。你擦了，但你忘了。', class: 'npc-npc-stranger' },
      3: { author: '空间', text: '门从里面开。不需要密码。', class: 'npc-npc-space' },
    },
  },
  {
    keywords: ['为什么', '为什么推门', '为什么出不去', '为什么门'],
    replies: {
      1: { author: '旧友', text: '……你说为什么。也许你还没准备好。', class: 'npc-reply' },
      2: { author: '陌生人', text: '你每次都问为什么。答案一直在门上。', class: 'npc-npc-stranger' },
      3: { author: '空间', text: '没有为什么。门从里面开。你自己没走。', class: 'npc-npc-space' },
    },
  },
  {
    keywords: ['这是什么', '这是什么地方', '什么地方', '哪里'],
    replies: {
      1: { author: '旧友', text: '这是你的空间啊。你不记得了？我们一起弄的。', class: 'npc-reply' },
      2: { author: '陌生人', text: '你不知道？你建造的。你忘了。', class: 'npc-npc-stranger' },
      3: { author: '空间', text: '这是你。你待过太久的地方。', class: 'npc-npc-space' },
    },
  },
  {
    keywords: ['怎么出去', '出去', '离开', '怎么走'],
    replies: {
      1: { author: '旧友', text: '出去？你可以试试门呀。', class: 'npc-reply' },
      2: { author: '陌生人', text: '你已经出去过很多次了。每次都回来了。', class: 'npc-npc-stranger' },
      3: { author: '空间', text: '门从里面开。你一直可以走。', class: 'npc-npc-space' },
    },
  },
  {
    keywords: ['池续'],
    replies: {
      1: { author: '旧友', text: '……这个名字。你从哪里听到的？不像是这里的东西。', class: 'npc-reply' },
      2: { author: '陌生人', text: '你把外面的名字带进来了。空间会记住的。', class: 'npc-npc-stranger' },
      3: { author: '空间', text: '……池续。你带来的。我记得了。', class: 'npc-npc-space' },
    },
  },
  {
    keywords: ['陈听澜', '听澜', '澜澜'],
    replies: {
      1: { author: '旧友', text: '……谁？我不认识这个名字。但你为什么也在空间里？', class: 'npc-reply' },
      2: { author: '陌生人', text: '那是……外面的人。你把外面的东西带进来了。', class: 'npc-npc-stranger' },
      3: { author: '空间', text: '她不在空间里。但你在空间里提到了她。空间会记住的。', class: 'npc-npc-space' },
    },
  },
  {
    keywords: ['镜子', '镜子里'],
    replies: {
      1: { author: '旧友', text: '镜子？你的空间里有镜子吗？我不记得了。', class: 'npc-reply' },
      2: { author: '陌生人', text: '你看到他了。他不是你的影子。他是上一个你。', class: 'npc-npc-stranger' },
      3: { author: '空间', text: '镜子是空间给你的。让你看看你在这里待了多久。', class: 'npc-npc-space' },
    },
  },
  {
    keywords: ['纸条', '笔记', '写字'],
    replies: {
      1: { author: '旧友', text: '什么纸条？你捡到了什么？', class: 'npc-reply' },
      2: { author: '陌生人', text: '那是上一个你写给你的。你也会写给下一个你。', class: 'npc-npc-stranger' },
      3: { author: '空间', text: '你在空间里写的每一个字，空间都替你留着。包括你忘了的那些。', class: 'npc-npc-space' },
    },
  },
  {
    keywords: ['循环', '重来', '又来了', '重复'],
    replies: {
      1: { author: '旧友', text: '循环？你在说什么？你太累了吧。', class: 'npc-reply' },
      2: { author: '陌生人', text: '你终于发现了。你不止来过一次。', class: 'npc-npc-stranger' },
      3: { author: '空间', text: '你数过吗？你数过你来了多少次吗。你每次数的都不一样。', class: 'npc-npc-space' },
    },
  },
  {
    keywords: ['门后面', '门后', '外面', '走出去'],
    replies: {
      1: { author: '旧友', text: '门后面？外面啊。正常的。你出去走走也好。', class: 'npc-reply' },
      2: { author: '陌生人', text: '门后面不是外面。你推过多少次了？', class: 'npc-npc-stranger' },
      3: { author: '空间', text: '门后面是你。一直是。门从里面开。', class: 'npc-npc-space' },
    },
  },
  {
    keywords: ['旧友', '朋友', '你是旧友吗'],
    replies: {
      1: { author: '旧友', text: '我当然是你的朋友！你忘了吗？', class: 'npc-reply' },
      2: { author: '陌生人', text: '旧友？你在问旧友是谁？也许你该问问镜子。', class: 'npc-npc-stranger' },
      3: { author: '空间', text: '旧友是你。上一个走进来的你。你跟自己做了很久的朋友。', class: 'npc-npc-space' },
    },
  },
];

// 初始留言板预设内容
const initialBoardPosts = {
  1: [
    { author: '旧友', time: '2008-06-16', text: '你的空间好漂亮啊！我也要弄一个。有空来我空间踩踩~', class: 'npc-reply', isPreset: true },
    { author: '旧友', time: '2008-06-30', text: '你怎么不回我留言了？空间是不是出问题了？', class: 'npc-reply', isPreset: true },
    { author: '旧友', time: '2008-07-05', text: '最近怎么不更新说说了？空间变怪了，你发现了吗？', class: 'npc-reply', isPreset: true },
  ],
  2: [
    { author: '旧友', time: '2008-07-20', text: '你还在啊。我以为你走了。', class: 'npc-reply', isPreset: true },
    { author: '陌生人', time: '????-??-??', text: '四位数。窗户。', class: 'npc-npc-stranger', isPreset: true },
    { author: '陌生人', time: '????-??-??', text: '镜子里的那个人。你问他了吗？', class: 'npc-npc-stranger', isPreset: true },
  ],
  3: [
    { author: '旧友', time: '——', text: '我不是你的朋友。我是上一个你。', class: 'npc-reply', isPreset: true },
    { author: '空间', time: '——', text: '门从里面开。', class: 'npc-npc-space', isPreset: true },
    { author: '空间', time: '——', text: '你在这里写了四十三条说说。你只记得三条。', class: 'npc-npc-space', isPreset: true },
  ],
};

function renderBoard() {
  boardList.innerHTML = '';

  // 如果是第一次进入，载入预设留言
  let posts;
  if (state.boardMessages.length === 0) {
    posts = (initialBoardPosts[state.playthrough] || initialBoardPosts[1]).map(p => ({...p}));
    state.boardMessages = posts.map(p => ({
      author: p.author, time: p.time, text: p.text, class: p.class, isPreset: true
    }));
    // 不在这里saveGame()——避免页面初始化时误写存档导致序章被跳过
  } else {
    posts = state.boardMessages;
  }

  // 新留言在顶部，所以倒序渲染
  const sorted = [...posts].reverse();
  sorted.forEach(p => {
    const div = document.createElement('div');
    div.className = 'board-item ' + (p.class || 'npc-reply');
    div.innerHTML = `
      <div class="board-header">
        <div class="board-avatar"></div>
        <span class="board-author">${p.author}</span>
        <span class="board-time">${p.time}</span>
      </div>
      <div class="board-content">${p.text}</div>
    `;
    boardList.appendChild(div);
  });
}

// 玩家发送留言
async function sendBoardMessage() {
  const text = boardInput.value.trim();
  if (!text) return;
  boardInput.value = '';

  // 添加玩家留言
  const playerMsg = {
    author: '我',
    time: '现在',
    text: text,
    class: 'player-msg',
  };
  state.boardMessages.push(playerMsg);
  state.dialogueHistory.push(text);
  saveGame();
  renderBoard();

  const pt = state.playthrough;
  const c = state.loopCount;
  const lower = text.toLowerCase().trim();

  // 1. 先检查关键词触发——100%回复
  let keywordMatch = null;
  for (const kr of boardKeywordReplies) {
    if (kr.keywords.some(k => lower.includes(k.toLowerCase()))) {
      keywordMatch = kr.replies[pt] || kr.replies[1];
      break;
    }
  }

  if (keywordMatch) {
    // 关键词触发——延迟模拟"对方正在输入"
    await new Promise(r => setTimeout(r, 800 + Math.random() * 700));
    const npcMsg = {
      author: keywordMatch.author,
      time: '刚才',
      text: keywordMatch.text,
      class: keywordMatch.class || 'npc-reply',
    };
    state.boardMessages.push(npcMsg);
    saveGame();
    renderBoard();
    return;
  }

  // 2. 没匹配关键词时，走原来的概率回复
  const pool = npcReplyPool[pt] || npcReplyPool[1];

  // 概率：周目越高，NPC 回复概率越高
  let replyChance = 0.35;
  if (pt === 2) replyChance = 0.5;
  if (pt === 3) replyChance = 0.7;

  // 一周目前几次循环降低概率（让旧友慢慢出现）
  if (pt === 1 && c < 3) replyChance = 0.3;

  if (Math.random() < replyChance) {
    // 过滤掉不满足 minLoop 的回复
    const available = pool.filter(r => !r.minLoop || state.loopCount >= r.minLoop);
    const reply = available[Math.floor(Math.random() * available.length)];

    // 短暂延迟模拟"对方正在输入"
    await new Promise(r => setTimeout(r, 800 + Math.random() * 700));

    const npcMsg = {
      author: reply.author,
      time: '刚才',
      text: reply.text,
      class: reply.class || 'npc-reply',
    };
    state.boardMessages.push(npcMsg);

    // 如果这条回复带线索
    if (reply.giveClue && !state.clues.includes(reply.giveClue)) {
      state.clues.push(reply.giveClue);
      sfx.clue();
      renderClueCollection();
      showClueCard(reply.giveClue);
    }

    saveGame();
    renderBoard();
  }
}

// 留言板输入事件
boardSendBtn.addEventListener('click', sendBoardMessage);
boardInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendBoardMessage();
  }
});

// ═══════════════════════════════════
//   信息栏系统 v3
// ═══════════════════════════════════

// ─── 心情系统 ───
// 根据周目、循环次数、线索数量、交互状态动态计算心情
function getMood() {
  const c = state.loopCount;
  const pt = state.playthrough;
  const totalLoops = c + (pt - 1) * 14;
  const clueCount = state.clues.length;

  // 游戏结束后
  if (state.gameEnded) return '……';

  // 一周目：从好奇到不安
  if (pt === 1) {
    if (c === 0) return '好奇';
    if (c <= 2) return '还好';
    if (c <= 5) return '有点不安';
    if (c <= 8) return '不舒服';
    if (c <= 11) return '害怕';
    return '想离开';
  }

  // 二周目：从困惑到焦虑
  if (pt === 2) {
    if (c === 0) return '困惑';
    if (c <= 2) return '不对劲';
    if (c <= 5) return '焦虑';
    if (c <= 8) return '头疼';
    if (c <= 11) return '快要崩溃了';
    return '绝望';
  }

  // 三周目：从麻木到清醒
  if (pt === 3) {
    if (c === 0) return '麻木';
    if (c <= 2) return '……';
    if (c <= 5) return '在想起什么';
    if (c <= 8) return '快看清了';
    if (c <= 11) return '差不多明白了';
    // c12-13：根据线索数量决定
    if (clueCount >= 7) return '准备好了';
    return '还差一点';
  }

  return '——';
}

// 信息栏字段定义
const infoFieldsData = [
  {
    key: 'note_date',
    label: '空间创建时间',
    clue: 'note_date',
    value: '2008-06-15',
  },
  {
    key: 'mirror_msg',
    label: '上一位访客',
    clue: 'mirror_msg',
    value: '——就是你',
  },
  {
    key: 'window_numbers',
    label: '最后登录',
    clue: 'window_numbers',
    value: '0413',
  },
  {
    key: 'space_owner',
    label: '空间主人',
    clue: 'space_owner',
    value: '——',
  },
  {
    key: 'stranger_identity',
    label: '陌生人身份',
    clue: 'stranger_identity',
    value: '——上一个循环的你',
  },
  {
    key: 'loop_history',
    label: '真实循环次数',
    clue: 'loop_history',
    value: () => `${state.loopCount + 1 + (state.playthrough - 1) * 14}`,
  },
  {
    key: 'door_truth',
    label: '门的真相',
    clue: 'door_truth',
    value: '门从里面开',
  },
  {
    key: 'profile_name',
    label: '昵称',
    clue: null,
    value: '访客',
    alwaysUnlocked: true,
  },
  {
    key: 'profile_status',
    label: '状态',
    clue: null,
    value: '在线',
    alwaysUnlocked: true,
  },
  {
    key: 'profile_mood',
    label: '心情',
    clue: null,
    value: () => getMood(),
    alwaysUnlocked: true,
  },
  {
    key: 'last_visit',
    label: '来访次数',
    clue: null,
    value: () => `${state.loopCount + 1 + (state.playthrough - 1) * 14}`,
    alwaysUnlocked: true,
  },
];

function renderInfo() {
  infoFields.innerHTML = '';
  infoFieldsData.forEach(field => {
    const isUnlocked = field.alwaysUnlocked || state.clues.includes(field.clue);
    const val = typeof field.value === 'function' ? field.value() : field.value;

    const row = document.createElement('div');
    row.className = 'info-field';

    const labelDiv = document.createElement('div');
    labelDiv.className = 'info-field-label';
    labelDiv.textContent = field.label;

    const valueDiv = document.createElement('div');
    valueDiv.className = 'info-field-value ' + (isUnlocked ? 'unlocked' : 'locked');
    valueDiv.textContent = isUnlocked ? val : '???';

    row.appendChild(labelDiv);
    row.appendChild(valueDiv);
    infoFields.appendChild(row);
  });
}

// ═══════════════════════════════════
//   隐藏装扮页
// ═══════════════════════════════════

// 装扮数据：随周目/线索解锁的"空间装扮"
// 每一项都是"你"住进来后慢慢添置的东西——暗示空间就是你
const dressupData = [
  {
    icon: '🌙',
    label: '空间皮肤',
    lockedValue: '—— 尚未更换',
    unlockedValue: '深夜模式（无法关闭）',
    desc: '你第一次来的时候就把背景换成了深夜。后来再也没变过。',
    clue: null,
    check: () => state.playthrough >= 1 && state.loopCount >= 1,
  },
  {
    icon: '🎵',
    label: '背景音乐',
    lockedValue: '—— 未设置',
    unlockedValue: '《记得》—— 你上传的',
    desc: '你给它取名叫《记得》。但你每次都会忘。',
    clue: 'note_date',
  },
  {
    icon: '✿',
    label: '挂件',
    lockedValue: '—— 无',
    unlockedValue: '一朵会枯的花',
    desc: '你从外面带进来的。它还活着，因为空间记得它活着。',
    clue: 'mirror_msg',
  },
  {
    icon: '✏',
    label: '个性签名',
    lockedValue: '—— 空',
    unlockedValue: () => state.noteContent ? `「${state.noteContent}」` : '你每次都会回来',
    desc: '你最后一次写的。也可能是第一次。时间在这里不分先后。',
    clue: null,
    check: () => state.playthrough >= 2 && state.loopCount >= 3,
  },
  {
    icon: '🪟',
    label: '窗贴',
    lockedValue: '—— 干净的',
    unlockedValue: '0413',
    desc: '你用手指在窗户上写的。干了以后就擦不掉了。',
    clue: 'window_numbers',
  },
  {
    icon: '🚪',
    label: '门牌',
    lockedValue: '—— 无门牌',
    unlockedValue: '访客 0413',
    desc: '门牌号就是密码。你装的。你不记得了。',
    clue: 'door_truth',
  },
  {
    icon: '👁',
    label: '访客计数器',
    lockedValue: '—— 0',
    unlockedValue: () => `${state.loopCount + 1 + (state.playthrough - 1) * 14} 次来访`,
    desc: '它从你第一次走进来开始计数。它从来没有清零过。',
    clue: 'loop_history',
  },
  {
    icon: '🔮',
    label: '来访记录',
    lockedValue: '—— 无记录',
    unlockedValue: '上一个访客：—— 就是你',
    desc: '空间只记录最后一个走进来的人。每次都是同一个人。',
    clue: 'stranger_identity',
  },
  {
    icon: '🗝',
    label: '门锁',
    lockedValue: '—— 未上锁',
    unlockedValue: state.lockSolved ? '已开（从里面）' : '已上锁',
    desc: '锁是后来加的。你加的。为了拦住自己。',
    clue: null,
    check: () => state.playthrough >= 2 && state.loopCount >= 3,
  },
  {
    icon: '🏠',
    label: '空间归属',
    lockedValue: '—— 未知',
    unlockedValue: '主人：上一个走进来的人',
    desc: '空间的主人不是创建者，是最后一个留下的人。',
    clue: 'space_owner',
  },
];

function renderDressup() {
  const section = document.getElementById('dressup-section');
  const list = document.getElementById('dressup-list');
  if (!section || !list) return;
  if (!state.dressupUnlocked) { section.style.display = 'none'; return; }
  section.style.display = '';
  list.innerHTML = '';
  dressupData.forEach(item => {
    const isUnlocked = item.clue ? state.clues.includes(item.clue) : (item.check ? item.check() : false);
    const val = typeof item.unlockedValue === 'function' ? item.unlockedValue() : item.unlockedValue;
    const displayVal = isUnlocked ? val : item.lockedValue;

    const row = document.createElement('div');
    row.className = 'dressup-item ' + (isUnlocked ? 'unlocked' : 'locked');

    const icon = document.createElement('div');
    icon.className = 'dressup-icon';
    icon.textContent = item.icon;

    const content = document.createElement('div');
    content.className = 'dressup-content';

    const label = document.createElement('div');
    label.className = 'dressup-label';
    label.textContent = item.label;

    const value = document.createElement('div');
    value.className = 'dressup-value';
    value.textContent = displayVal;

    const desc = document.createElement('div');
    desc.className = 'dressup-desc';
    desc.textContent = isUnlocked ? item.desc : '—— 尚未获得';

    content.appendChild(label);
    content.appendChild(value);
    content.appendChild(desc);
    row.appendChild(icon);
    row.appendChild(content);
    list.appendChild(row);
  });
}

// ═══════════════════════════════════
//   线索卡片系统
// ═══════════════════════════════════

// 线索数据库 — 所有线索的元信息
const clueDatabase = {
  // ── 一周目线索 ──
  note_date: {
    title: '创建日期',
    desc: '空间创建于2008年6月15日。',
    icon: '✦',
  },
  window_numbers: {
    title: '0413',
    desc: '窗玻璃上的数字。像是某个日期。',
    icon: '✦',
  },
  mirror_msg: {
    title: '镜中留言',
    desc: '门后面不是外面，是上次。',
    icon: '✦',
  },
  // ── 二周目线索 ──
  loop_history: {
    title: '循环记录',
    desc: '你已经循环了很多次。不止14次。',
    icon: '◈',
  },
  stranger_identity: {
    title: '陌生人',
    desc: '镜子里的人是上一个循环的你。',
    icon: '◈',
  },
  // ── 三周目线索 ──
  space_owner: {
    title: '空间主人',
    desc: '这个空间的主人，就是上一个走进来的人。',
    icon: '✧',
  },
  door_truth: {
    title: '门的真相',
    desc: '门从里面开。',
    icon: '✧',
  },
  // ── 新增线索碎片 ──
  // 一周目新增
  door_scratch: {
    title: '门上的划痕',
    desc: '不止你一个人推过这扇门。',
    icon: '✦',
  },
  window_face: {
    title: '窗外的脸',
    desc: '玻璃外面有你的脸。但你在里面。',
    icon: '✦',
  },
  note_fold: {
    title: '纸条的折痕',
    desc: '纸条被折过很多次。有人在反复读它。',
    icon: '✦',
  },
  // 二周目新增
  door_knock: {
    title: '门后的敲门声',
    desc: '有人在敲门。从里面。',
    icon: '◈',
  },
  mirror_lag: {
    title: '镜中时差',
    desc: '镜子里的人比你先动了。他认识你。',
    icon: '◈',
  },
  note_twohand: {
    title: '两种笔迹',
    desc: '纸条上的字像两个人写的。一个是你。',
    icon: '◈',
  },
  // 三周目新增
  door_inverted: {
    title: '门上的变化',
    desc: '「门从里面开」变成了「你从里面开」。',
    icon: '✧',
  },
  mirror_reversed: {
    title: '翻转的镜面',
    desc: '镜子修好了，但反了。你在里面，空间在外面。',
    icon: '✧',
  },
  note_name: {
    title: '灰烬中的名字',
    desc: '纸条烧尽了。灰烬里有你的名字。',
    icon: '✧',
  },
};

// 浮现线索卡片
function showClueCard(clueKey) {
  const data = clueDatabase[clueKey];
  if (!data) return;
  const popup = document.getElementById('clue-card-popup');
  if (!popup) return;
  popup.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'clue-card';
  card.innerHTML = `
    <div class="clue-card-icon">${data.icon}</div>
    <div class="clue-card-label">收集到一条线索</div>
    <div class="clue-card-title">${data.title}</div>
    <div class="clue-card-desc">${data.desc}</div>
  `;
  popup.appendChild(card);
  setTimeout(() => { if (popup.contains(card)) popup.innerHTML = ''; }, 3400);
}

// 渲染线索收集册
function renderClueCollection() {
  const grid = document.getElementById('clue-collection-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const allClues = Object.keys(clueDatabase);
  const collected = allClues.filter(k => state.clues.includes(k));
  
  allClues.forEach(key => {
    const data = clueDatabase[key];
    const isUnlocked = state.clues.includes(key);
    const tile = document.createElement('div');
    tile.className = `clue-tile ${isUnlocked ? 'unlocked' : 'locked'}`;
    tile.innerHTML = `
      <div class="clue-tile-icon">${isUnlocked ? data.icon : '？'}</div>
      <div class="clue-tile-name">${isUnlocked ? data.title : '未发现'}</div>
      <div class="clue-tile-desc">${isUnlocked ? data.desc : '？？？？'}</div>
    `;
    grid.appendChild(tile);
  });
  
  const count = document.createElement('div');
  count.className = 'clue-tile-count';
  count.textContent = `已收集 ${collected.length} / ${allClues.length}`;
  grid.appendChild(count);
}

// ═══════════════════════════════════
//   物品交互
// ═══════════════════════════════════
const dialogues = {
  // door 交互（分周目）— v5: 14条/周目，每条对应一次循环
  door_pt1: [
    { lines: [{ text: '你走向那扇门。门没有锁。你推了一下，它开了。', speaker: '房间' }, { text: '外面……', speaker: '房间' }, { text: '你走了出去。眼前一黑。', speaker: '房间' }], after: 'loop' },
    { lines: [{ text: '又是那扇门。你推了一下，它开了。', speaker: '房间' }, { text: '眼前一黑。', speaker: '房间' }], after: 'loop' },
    { lines: [{ text: '门已经开了一条缝。好像知道你要来。', speaker: '房间' }, { text: '你走了出去。眼前一黑。', speaker: '房间' }], after: 'loop' },
    { lines: [{ text: '门没动。你推了一下，它才开。像是从里面被抵住了。', speaker: '房间' }, { options: [{ text: '出去', value: 'go' }, { text: '不出去', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门把手上有温度。不是你留下的。', speaker: '房间' }, { options: [{ text: '握住它', value: 'go' }, { text: '松手', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门在等你。它一直在等。', speaker: '房间' }, { options: [{ text: '出去', value: 'go' }, { text: '再待一会儿', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门上有一道划痕。你上次推门时指甲留下的。', speaker: '房间', clue: 'door_scratch' }, { options: [{ text: '推门', value: 'go' }, { text: '看划痕', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门在呼吸。你没碰它，它在微微起伏。', speaker: '房间' }, { options: [{ text: '推门', value: 'go' }, { text: '退后', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门上有一股旧木头味。很久没开过了。', speaker: '房间' }, { options: [{ text: '推门', value: 'go' }, { text: '再闻闻', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门上的划痕多了。不只是你一个人留下的。', speaker: '房间' }, { options: [{ text: '出去', value: 'go' }, { text: '不出去', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门把手比上次凉了。', speaker: '房间' }, { options: [{ text: '握住它', value: 'go' }, { text: '松开', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门开了。你没推。它自己开的。', speaker: '房间' }, { options: [{ text: '走', value: 'go' }, { text: '不走', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门后面好像有风。但你闻到了旧纸味。', speaker: '房间' }, { options: [{ text: '出去', value: 'go' }, { text: '不出去', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '最后一次了。出口就在门后面。', speaker: '房间' }, { options: [{ text: '出去', value: 'go' }, { text: '再待一会儿', value: 'stay' }] }], after: 'loop' },
  ],
  door_pt2: [
    { lines: [{ text: '你走向门。门这次没开。你推了一下，它才动。像是被什么东西粘住了。', speaker: '房间' }, { text: '你走了出去。眼前一黑。', speaker: '房间' }], after: 'loop' },
    { lines: [{ text: '门上多了一道划痕。是你上次出去时留下的。', speaker: '房间' }, { text: '你走了出去。眼前一黑。', speaker: '房间' }], after: 'loop' },
    { lines: [{ text: '门把手上有温度。比上次高。', speaker: '房间' }, { text: '你走了出去。眼前一黑。', speaker: '房间' }], after: 'loop' },
    { lines: [{ text: '门在抖。你没碰它，它自己在动。', speaker: '房间' }, { options: [{ text: '推门', value: 'go' }, { text: '不碰它', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门上的划痕组成了一组数字。你看不清。', speaker: '房间' }, { options: [{ text: '推门', value: 'go' }, { text: '看数字', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门后面有人在敲门。从里面。', speaker: '房间', clue: 'door_knock' }, { options: [{ text: '打开', value: 'go' }, { text: '退后', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门开了。你不记得推过。', speaker: '房间' }, { options: [{ text: '出去', value: 'go' }, { text: '不出去', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门把手上有汗。不是你的。', speaker: '房间' }, { options: [{ text: '握住', value: 'go' }, { text: '松开', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门缝里透出光。不是外面的光。是里面的。', speaker: '房间' }, { options: [{ text: '推门', value: 'go' }, { text: '看光', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门震了一下。像是在说话。你没听清。', speaker: '房间' }, { options: [{ text: '推门', value: 'go' }, { text: '贴近听', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门上的字越来越深了。像是指甲刻的。', speaker: '房间' }, { options: [{ text: '出去', value: 'go' }, { text: '看字', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门后面站着一个人。你看不见他的脸。', speaker: '房间' }, { options: [{ text: '走过去', value: 'go' }, { text: '不走', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门后面的人转过身了。是你。', speaker: '房间' }, { options: [{ text: '推门', value: 'go' }, { text: '不推', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '最后一次。门后面就是你。', speaker: '房间' }, { options: [{ text: '出去', value: 'go' }, { text: '留下来', value: 'stay' }] }], after: 'loop' },
  ],
  door_pt3: [
    { lines: [{ text: '门开着。你没推。它自己开着。', speaker: '房间' }, { text: '你走了出去。眼前一黑。', speaker: '房间' }], after: 'loop' },
    { lines: [{ text: '门上有字。刻上去的。「门从里面开。」', speaker: '房间' }, { text: '你走了出去。眼前一黑。', speaker: '房间' }], after: 'loop' },
    { lines: [{ text: '门在等你。你知道推了会回来。', speaker: '房间' }, { text: '你走了出去。眼前一黑。', speaker: '房间' }], after: 'loop' },
    { lines: [{ text: '门上的刻字变深了。「门从里面开。」像是很久以前刻的。', speaker: '房间', clue: 'door_truth' }, { options: [{ text: '出去', value: 'go' }, { text: '看刻字', value: 'read' }] }], after: 'loop' },
    { lines: [{ text: '门把手是热的。有人在握着它。', speaker: '房间' }, { options: [{ text: '握住', value: 'go' }, { text: '松开', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门在呼吸。它在等你做决定。', speaker: '房间' }, { options: [{ text: '推门', value: 'go' }, { text: '等着', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门后面没有外面了。只有另一个房间。', speaker: '房间' }, { options: [{ text: '走', value: 'go' }, { text: '不走', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门上的字在变。「门从里面开。」变成「你从里面开。」', speaker: '房间', clue: 'door_inverted' }, { options: [{ text: '推门', value: 'go' }, { text: '看字', value: 'read' }] }], after: 'loop' },
    { lines: [{ text: '门说了一句话。不是文字。是震动。「你可以走了。」', speaker: '房间' }, { options: [{ text: '走', value: 'go' }, { text: '不走', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门自己开了。你不需要推。', speaker: '房间' }, { options: [{ text: '出去', value: 'go' }, { text: '不出去', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门后面是光的。但你不确定那是外面。', speaker: '房间' }, { options: [{ text: '走向光', value: 'go' }, { text: '退后', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门上只有你的指纹。密密麻麻的。', speaker: '房间' }, { options: [{ text: '推门', value: 'go' }, { text: '看指纹', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '门在等你做最后的决定。', speaker: '房间' }, { options: [{ text: '推门', value: 'go' }, { text: '再等等', value: 'stay' }] }], after: 'loop' },
    { lines: [{ text: '最后一次。你准备好了。', speaker: '房间' }, { options: [{ text: '出去', value: 'go' }, { text: '留下来', value: 'stay' }] }], after: 'loop' },
  ],
  mirror_pt1: [
    { lines: [{ text: '你看向镜子。里面是你自己。', speaker: '房间' }, { text: '……大概是你自己吧。', speaker: '房间' }], after: null },
    { lines: [{ text: '你又看了镜子。还是你自己。你多看了一会儿。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人好像眨眼了。你也眨了。但晚了一步。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人在看你。你动了，它也动了。但它的眼睛快了一步。', speaker: '房间' }, { text: '镜面上有一行水雾写的字：「门后面不是外面，是上次。」', speaker: '房间', clue: 'mirror_msg' }], after: null },
    { lines: [{ text: '镜子里的你表情不太对。你说不上来哪里不对。', speaker: '房间' }], after: null },
    { lines: [{ text: '你没动。镜子里的人动了。只动了一下。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的你笑了。你没有笑。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜面起雾了。雾里有字，你看不清。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人比你的动作慢了半拍。以前是快的。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子开始发黄了。像旧照片。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人背对着你。你面对着镜子。', speaker: '房间' }], after: null },
    { lines: [{ text: '你举起手。镜子里的人没举。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜面裂了一条细纹。像蛛丝。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人在写字。你没在写。', speaker: '房间' }], after: null },
  ],
  mirror_pt2: [
    { lines: [{ text: '镜子还在那里。上面蒙了一层灰。', speaker: '房间' }, { text: '你擦了擦。里面的人不太像你了。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人比你快。你还没动，它已经动了。', speaker: '房间', clue: 'mirror_lag' }], after: null },
    { lines: [{ text: '你看见镜子里的自己在写字。你没在写字。但镜子里的人在。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人转过身来了。你看到了他的脸。是你的脸。', speaker: '房间' }, { text: '但他不是你。他是上一个循环的你。', speaker: '房间', clue: 'stranger_identity' }], after: null },
    { lines: [{ text: '镜子里的人对你点了点头。像是认识你。', speaker: '房间' }], after: null },
    { lines: [{ text: '你开口说话。镜子里的人先说了。一样的声音。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人背对着你。你面对着镜子。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子裂了一条缝。裂缝里是另一个镜子。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人在笑。不是对你笑。是对自己笑。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜面开始脱落。掉下来的碎片里都有你的脸。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里没有你了。只有空间的倒映。', speaker: '房间' }], after: null },
    { lines: [{ text: '你在镜子里看到了一个数字。那是你真实的循环次数。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人走了。镜面空了。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里什么都没有了。只有你在看。', speaker: '房间' }], after: null },
  ],
  mirror_pt3: [
    { lines: [{ text: '镜子裂了一条缝。但里面的你完好无损。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人开口了。你说出了同样的话：「门从里面开。」', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人转过身来，面对着你。你们对视。', speaker: '房间' }], after: null },
    { lines: [{ text: '你和镜子里的人互看了很久。他先移开了目光。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人走了。镜子空了。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜面碎了一块。碎片落在地上，没有声音。', speaker: '房间' }], after: null },
    { lines: [{ text: '碎片里每一块都是你的脸。每一个都在笑。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子修好了。但反过来。你在里面，空间在外面。', speaker: '房间', clue: 'mirror_reversed' }], after: null },
    { lines: [{ text: '镜子里是你。但你知道那不是你。是上一个你。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里的人在写最后一行字。你没看到写的什么。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜面开始消失。像被擦掉了一样。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子变成了窗户。你从里面看出去。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子里没有人了。只有你的空间，倒映着你的空间。', speaker: '房间' }], after: null },
    { lines: [{ text: '镜子碎了。每一片都是门。', speaker: '房间' }], after: null },
  ],
  window_pt1: [
    { lines: [{ text: '窗外是黑的。什么都看不见。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗外什么都没有。也许外面什么都没有。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗外好像有东西在动。你看了很久。什么也没有。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗外好像有东西在动。', speaker: '房间' }, { text: '你擦了擦玻璃。', speaker: '房间' }, { text: '玻璃上有雾气。你擦出了一组数字：「0413」', speaker: '房间', clue: 'window_numbers' }], after: null },
    { lines: [{ text: '窗外有一张脸。是你的。', speaker: '房间', clue: 'window_face' }], after: null },
    { lines: [{ text: '脸不见了。但玻璃上有手印。', speaker: '房间' }], after: null },
    { lines: [{ text: '手印在玻璃内侧。不是外面留下的。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗外开始下雨了。但雨是往上飘的。', speaker: '房间' }], after: null },
    { lines: [{ text: '玻璃上有字。反着写的。你认不出来。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗外的黑在变浅。像天快亮了。但不会亮。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗框上有指甲印。有人抓过。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗户关不上了。卡住了。风从缝里吹进来。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗外亮了一下。你什么都没看清。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗外有人站着不动。你看不清他的脸。', speaker: '房间' }], after: null },
  ],
  window_pt2: [
    { lines: [{ text: '窗外的黑不像上次了。像是墨水。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗外有人在写东西。你看见了手指。', speaker: '房间' }], after: null },
    { lines: [{ text: '手指在玻璃另一面划过。留下了痕迹。', speaker: '房间' }], after: null },
    { lines: [{ text: '你擦了擦玻璃。上面写着一个数字。', speaker: '房间' }, { text: '那是你真实的循环次数。不止14。', speaker: '房间', clue: 'loop_history' }], after: null },
    { lines: [{ text: '窗外的风景变清楚了。是你的空间。一模一样。', speaker: '房间' }], after: null },
    { lines: [{ text: '对面窗户里也有人在看。那个人是你。', speaker: '房间' }], after: null },
    { lines: [{ text: '对面的人对你挥了挥手。你没挥。', speaker: '房间' }], after: null },
    { lines: [{ text: '玻璃从外面裂了。不是从里面。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗框上有新的字。是湿的。像刚写的。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗外的天亮了一瞬。你看到了外面。外面是你。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗台上有一张纸条。不是你的。是上一个你留下的。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上写着循环次数。和你数的差了14。', speaker: '房间' }], after: null },
    { lines: [{ text: '对面窗户里的人走了。窗户空了。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗外只有你的倒映。没有外面了。', speaker: '房间' }], after: null },
  ],
  window_pt3: [
    { lines: [{ text: '窗户碎了。没有风进来。', speaker: '房间' }], after: null },
    { lines: [{ text: '你从碎掉的窗框看出去。外面是你的空间。一模一样。', speaker: '房间' }], after: null },
    { lines: [{ text: '对面窗户里也有一个人在看。那个人是你。', speaker: '房间' }], after: null },
    { lines: [{ text: '你从碎窗看出去，看到了门。那扇门从外面也能打开。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗外的空间开始下雨了。雨滴落在你的空间里。', speaker: '房间' }], after: null },
    { lines: [{ text: '雨是纸片。纸片上写着字。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸片上写着「门从里面开」。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗框上长出了花。花是旧代码。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗外的空间比你的旧。旧得多。', speaker: '房间' }], after: null },
    { lines: [{ text: '对面窗户里的人走了。窗户空了。', speaker: '房间' }], after: null },
    { lines: [{ text: '玻璃修好了。但外面什么都没有。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗台上有你留下的东西。你记不清是什么时候放的。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗户变成了门。你不知道该不该推。', speaker: '房间' }], after: null },
    { lines: [{ text: '窗外什么都没有了。只有你的空间。只有你。', speaker: '房间' }], after: null },
  ],
  note_pt1: [
    { lines: [{ text: '你捡起纸条。上面什么都没写。', speaker: '房间' }, { text: '也许下次会有。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上还是什么都没有。但你发现它有折痕。', speaker: '房间', clue: 'note_fold' }], after: null },
    { lines: [{ text: '你翻到背面。背面也是空的。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上写着：「我试过开门。」字迹是你的。', speaker: '房间' }, { text: '纸条背面有一行小字：「空间创建于2008-06-15」', speaker: '房间', clue: 'note_date' }], after: null },
    { lines: [{ text: '纸条上多了一行：「门没开。」', speaker: '房间' }], after: null },
    { lines: [{ text: '背面多了一行小字：「你不是第一个读这个的人。」', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上写着：「它知道我在看。」笔迹越来越潦草。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上写着：「你还在读这个。」你每次都会读。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上写着：「我不确定这是我写的。」', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条变旧了。边角卷起来了。字迹模糊。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上只剩一个字：「开」', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条在抖。但没有风。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条是空白的。但你感觉上面有看不见的字。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上写着：「下次带点新的来。」', speaker: '房间' }], after: null },
  ],
  note_pt2: [
    { lines: [{ text: '纸条还在地上。这次上面有字了。', speaker: '房间' }, { text: '上面写着：「你不记得了。」', speaker: '房间' }], after: null },
    { lines: [{ text: '你翻到背面。背面也是同样的字。「你不记得了。」', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上的字迹像是两个人写的。一个是你。一个不是。', speaker: '房间', clue: 'note_twohand' }], after: null },
    { lines: [{ text: '纸条上写着：「我找到过那三个数字。我推了门。门没开。」', speaker: '房间' }, { text: '背面多了一行：「你不是第一个读这个的人。」', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上写着：「我留下来过。我也出去过。都一样。」', speaker: '房间' }], after: null },
    { lines: [{ text: '背面多了一行：「如果你在读这个，说明你又回来了。」', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上的字在变。你眨了一下眼，字就不一样了。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上写着：「它记得你说过的每一句话。」', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上的笔迹不再像你的了。更像另一个人的。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上写着：「上一个你比我走得更远。」', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条开始发黄。比你的记忆还旧。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上只有一行：「你还会再来。」', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条是空白的。但你能背出上面的字。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上写着：「别忘了你带走的东西。」', speaker: '房间' }], after: null },
  ],
  note_pt3: [
    { lines: [{ text: '纸条上只有一行字：「门从里面开。」', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上的字在变旧。墨水淡了。', speaker: '房间' }], after: null },
    { lines: [{ text: '你翻到背面。背面写着：「你就是主人。」', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上写着：「这个空间的主人——就是上一个走进来的人。」', speaker: '房间', clue: 'space_owner' }], after: null },
    { lines: [{ text: '纸条是空的。但你知道该写什么了。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上出现了一行你没写过的字。「该走了。」', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上写着：「门从里面开。」你写了一万遍了。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上的字开始消失。一个一个地。', speaker: '房间' }], after: null },
    { lines: [{ text: '只剩一个字。「开」', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条在烧。没有火。是字在燃。', speaker: '房间' }], after: null },
    { lines: [{ text: '灰烬里有字。你认出来了。是你的名字。', speaker: '房间', clue: 'note_name' }], after: null },
    { lines: [{ text: '纸条变成了新的纸条。空白的。干净的。', speaker: '房间' }], after: null },
    { lines: [{ text: '空白的纸条。等你来写。', speaker: '房间' }], after: null },
    { lines: [{ text: '纸条上写着：「这一次，你自己开门。」', speaker: '房间' }], after: null },
  ],
  loopReturn: {
    1: [
      '……你回来了。', '房间没有变。', '你又推了门。', '这已经不像是一个房间了。',
      '窗外的黑好像更浓了。', '镜子里的人还在等你。', '纸条上的字不是你写的。但你读过了。',
      '它认识你了。', '你也不想出去了，对吗？', '门上的划痕在增加。不只是你的。',
      '嘘。别数了。', '它在听。你说的每一个字，它都记得。', '你还以为这是第一次。',
      '你会忘记这些的。你每次都忘。',
    ],
    2: [
      '……你回来了。又来了。', '房间没变。但你变了。', '你推了门。门推了你。',
      '陌生人又出现了。你想不起他是谁。', '窗上的数字还在。你没记住。', '镜子里的人比你先动了。他认识你。',
      '纸条上的字变了。不是你写的。', '旧友还在。但你开始怀疑旧友是谁了。', '你数过吗？你数过循环的次数吗？',
      '每一次都是一样的。每一次你都不记得。', '你在留言板上说了什么？空间记住了。', '门把手上的温度。不是你的体温。',
      '你知道0413。但你不知道那是什么。', '你还会回来的。你每次都回来。',
    ],
    3: [
      '你回来了。你知道你会回来的。', '房间不再假装是房间了。', '门从里面开。你知道的。',
      '空间认出了你。它一直在等你。', '纸条上的字是你写的。上一次的你写的。', '镜子碎了。每一片都是门。',
      '窗外没有外面了。只有你的空间。', '你不再问为什么了。', '旧友不是旧友。陌生人不是陌生人。都是你。',
      '你写了纸条。你会忘记你写过。', '0413。你第一次来的日期。你一直带着。', '门在等你做决定。它等了很久。',
      '你可以走了。你一直可以。', '你会记得这次吗？',
    ],
  },
  exit: {
    1: [
      '你点了关闭。', '你想离开这个页面。', '别走。还没看完。', '你每次都会点这里。',
      '外面什么都没有。', '这里挺好的。留一会儿吧。', '你确定要走？', '门还没开呢。',
      '留下来。', '留下来。', '你不想看看镜子后面是什么吗？', '纸条还没读完。',
      '留下来。', '留下来。',
    ],
    2: [
      '你点了关闭。页面没关。', '你想离开？你确定？', '别走。你还没找到。', '你每次都会点这里。每次都没走成。',
      '外面没有外面。', '你不是要走。你是在试。', '窗上的数字你记住了吗？', '镜子里的人不想你走。',
      '留下来。', '留下来。', '陌生人说：别走。', '门还没准备好。',
      '留下来。', '留下来。',
    ],
    3: [
      '你点了关闭。空间没有关。', '你想离开？你可以。', '但你确定你想？', '你每次都会点这里。你每次都没走。',
      '门从里面开。你知道的。', '你可以走。你一直可以。', '但你还在点这里。', '空间没有拦你。',
      '留下来。不是空间的请求。', '是你自己的选择。', '留下来。', '留下来。',
      '留下来。', '留下来。',
    ],
  },
  doorlock: [
    { lines: [{ text: '门旁有一个密码锁。四个数字。你不知道密码。', speaker: '房间' }, { text: '但你好像在哪里见过。', speaker: '房间' }] },
    { lines: [{ text: '密码锁亮着微光。四个空位。', speaker: '房间' }, { text: '你想起来了吗？窗户外面有数字。', speaker: '房间' }] },
    { lines: [{ text: '你输入了密码。锁开了。门上多了一行字。', speaker: '房间' }] },
  ],
};

async function handleItem(item) {
  if (state.isTyping) { state.skipRequested = true; return; }
  if (state.isHandling) return; // 防止并发执行
  // 游戏结束后锁定所有交互
  if (state.gameEnded) {
    await typeWriter('空间已经安静了。你该走了。', '房间');
    return;
  }
  state.isHandling = true;
  try {
  sfx.click();
  
  // 密码锁特殊交互
  if (item === 'doorlock') {
    if (state.lockSolved) {
      await typeWriter('锁已经开了。门上的字在发光。', '房间');
    } else if (state.lockAttemptsThisLoop >= 3) {
      // 本轮循环尝试次数已用完
      sfx.glitch();
      await typeWriter('密码锁闪了一下，然后灭了。', '房间');
      await typeWriter('它好像故障了。也许下次循环回来时会好。', '房间');
    } else {
      const c = state.loopCount;
      if (state.lockAttemptsThisLoop === 0) {
        // 首次尝试
        if (c < 5) {
          await typeWriter('门旁有一个密码锁。四个数字。', '房间');
          await typeWriter('你好像在哪里见过这组数字。', '房间');
        } else if (c < 9) {
          await typeWriter('密码锁亮着。你已经试过了，对吗？', '房间');
          await typeWriter('但你忘了。你每次都忘。', '房间');
        } else {
          await typeWriter('□□锁□亮着。四个空位。你每次都会坐在这里。', '房间');
          await typeWriter('你不记得密码了。但你记得你输入过。', '房间');
        }
      } else {
        // 再次尝试
        const retryLines = [
          '又来了。锁还在等你。',
          '你不记得了。但你还会试。',
          '锁亮了一下。像是在叹气。',
          '你已经试了几次了。你每次都试几次。',
        ];
        const line = c >= 9 ? glitchText(retryLines[Math.floor(Math.random() * retryLines.length)], 1) : retryLines[Math.floor(Math.random() * retryLines.length)];
        await typeWriter(line, '房间');
      }
      await openDoorlockPad();
    }
    return;
  }
  
  if (state.interactedThisLoop[item]) {
    await typeWriter('你已经看过了。', '房间');
    return;
  }
  state.interactedThisLoop[item] = true;
  const set = dialogues[`${item}_pt${state.playthrough}`];
  if (!set) return;
  const matched = set[state.loopCount] || set[set.length - 1];

  for (const line of matched.lines) {
    if (line.options) {
      const result = await showOptions(line.options, line.speaker || '房间');
      if (item === 'door') {
        if (result === 'go') {
            sfx.door();
            await typeWriter('你走了出去。眼前一黑。', '房间');
        } else {
          if (result === 'read') {
            await typeWriter('「门从里面开。」字迹很深，像用指甲刻的。', '房间');
          } else {
            await typeWriter('你没有推门。门安静了。', '房间');
          }
          // 允许玩家再次交互门（不推门不应锁死交互，否则玩家可能卡在当前循环无法推进）
          delete state.interactedThisLoop[item];
          return;
        }
      }
    } else {
      await typeWriter(line.text, line.speaker || '房间');
      // 收集线索
      if (line.clue && !state.clues.includes(line.clue)) {
        state.clues.push(line.clue);
        sfx.clue();
        saveGame();
        renderClueCollection();
        showClueCard(line.clue);
        
        // 顿悟时刻：收集到足够线索时，串联所有碎片
        const totalClues = Object.keys(clueDatabase).length;
        if (state.clues.length >= totalClues) {
          sfx.ending();
          await new Promise(r => setTimeout(r, 800));
          await typeWriter('信息栏全亮了。你终于看清了。', '房间');
          await new Promise(r => setTimeout(r, 800));
          await typeWriter('这个空间是2008年建的。创建它的人，走进来就再也没出去过。', '房间');
          await new Promise(r => setTimeout(r, 600));
          await typeWriter('窗外的0413——是你第一次来的日期。镜子里的人，是你。留言板上的陌生人，是上一个循环的你。旧友……也是你。', '房间');
          await new Promise(r => setTimeout(r, 600));
          await typeWriter('空间主人是谁？是上一个走进来的人。是你。', '房间');
          await new Promise(r => setTimeout(r, 800));
          await typeWriter('门从里面开。', '房间');
          await new Promise(r => setTimeout(r, 1200));
          await typeWriter('从来没有人拦住你。是你自己没走。', '房间');
        } else {
          await new Promise(r => setTimeout(r, 600));
        }
      }
    }
  }

  // ═══ 方案B：氛围碎片 — 对话结束后随机触发 ═══
  if (!state.interactedThisLoop._fragmentShown && Math.random() < 0.35) {
    state.interactedThisLoop._fragmentShown = true;
    const fragments = {
      1: [
        '你闻到了一股旧木头味。像是2008年的。',
        '墙角有什么东西在反光。你转头时，什么都没有。',
        '你听到远处有关门声。但这里只有一扇门。',
        '地板好像比刚才凉了。',
        '你感觉有人在看你。不是镜子里的人。',
        '空气里有灰尘的味道。像是很久没打开过的房间。',
        '你的影子比刚才长了。光源没变。',
        '有什么东西在角落里数你的呼吸。',
      ],
      2: [
        '旧木头味变了。更浓了。像是腐烂了。',
        '墙角的反光有了形状。像是手。',
        '关门声近了。但你知道这房间只有一扇门。',
        '地板在震。很轻。像心跳。',
        '你感觉不只是一个人在看你。',
        '灰尘里有字。你认出了一半。是你的字。',
        '你的影子动了。你没有动。',
        '那个声音又在数了。这次它数到了你。',
      ],
      3: [
        '旧木头味变成了纸烧的味道。',
        '墙角的手伸出来了。是你的手。',
        '门在呼吸。和你的频率一样。',
        '地板上有你的脚印。比你先到的。',
        '所有人都在看你。都是你。',
        '灰尘落下来了。每个颗粒都是一个小小的你。',
        '你的影子站起来了。它走到角落去了。',
        '数到你了。数完了。',
      ],
    };
    const pool = fragments[state.playthrough] || fragments[1];
    const frag = pool[Math.floor(Math.random() * pool.length)];
    await new Promise(r => setTimeout(r, 600));
    const displayFrag = state.loopCount >= 5 && Math.random() < 0.15 ? glitchText(frag, 1) : frag;
    await typeWriter(displayFrag, '房间');
  }

  // 纸条写字：三周目 c12 后触发写字板
  if (item === 'note' && state.playthrough === 3 && state.loopCount === 12 && !state.noteContent) {
    await typeWriter('你拿起笔。', '房间');
    await openNoteWritePad();
  }
  // 纸条写字：三周目 c13 显示玩家写的内容
  if (item === 'note' && state.playthrough === 3 && state.loopCount === 13 && state.noteContent) {
    await typeWriter('纸条上还有一行字。是你写的。', '房间');
    await typeWriter('「' + state.noteContent + '」', '房间');
    await new Promise(r => setTimeout(r, 800));
  }

  if (matched.after === 'loop') {
    await triggerLoop();
    const lrSet = dialogues.loopReturn[state.playthrough] || dialogues.loopReturn[1];
    const rMsg = lrSet[Math.min(state.loopCount - 1, lrSet.length - 1)];
    await typeWriter(rMsg, '房间');

    // 多周目·循环14次后的结局判定
    if (state.loopCount >= 14) {
      const clueCount = state.clues.length;
      if (state.playthrough === 1) {
        await typeWriter('这一次到这里了……', '房间');
        await typeWriter('下一次需要找到新的线索。', '房间');
        await typeWriter('你是谁，你没有忘。', '房间');
        await new Promise(r => setTimeout(r, 1500));
        state.loopCount = 0;
        state.playthrough = 2;
        state.interactedThisLoop = {};
        state.boardMessages = [];
        updateRoomState();
        saveGame();
        await typeWriter('……空间变了。有些东西不在了。但有些东西，出现了。', '房间');
      } else if (state.playthrough === 2) {
        await typeWriter('头好痛……', '房间');
        await typeWriter('这个空间……怎么出不去。', '房间');
        await typeWriter('帮帮我……帮帮我……', '房间');
        await typeWriter('还差一点点就走出去了。', '房间');
        await new Promise(r => setTimeout(r, 1500));
        state.loopCount = 0;
        state.playthrough = 3;
        state.interactedThisLoop = {};
        state.boardMessages = [];
        updateRoomState();
        saveGame();
        await typeWriter('这是最后一次了。房间很旧了。但你看得很清楚。', '房间');
      } else if (state.playthrough === 3) {
        if (clueCount >= 7) {
          // 真结局
          sfx.ending();
          await typeWriter('你想起来了自己是谁。', '房间');
          await new Promise(r => setTimeout(r, 1000));
          await typeWriter('出口出现了。', '房间');
          await typeWriter('你找到了所有东西。你知道门从里面开。', '房间');
          await typeWriter('你确定要出去吗？', '房间');
          const choice = await showOptions([
            { text: '出去', value: 'leave' },
            { text: '留下来', value: 'stay_final' },
          ]);
          if (choice === 'leave') {
            await typeWriter('你推了门。这次，门从里面开了。', '房间');
            await typeWriter('光照进来了。', '房间');
            await new Promise(r => setTimeout(r, 2000));
            await typeWriter('你走出了空间。外面是另一个空间。但这个，是你自己的。', '……');
            await new Promise(r => setTimeout(r, 1500));
            state.gameEnded = true;
            saveGame();
            // 尾声：伪系统公告
            titleScreen.querySelector('.login-title').textContent = '你走出去了';
            titleScreen.querySelector('.login-subtitle').textContent = '— 但你还记得那个房间 —';
            titleScreen.querySelector('.login-box').style.display = 'none';
            showEndingNotice('leave');
            titleScreen.classList.remove('hide');
          } else {
            await typeWriter('你最后一次选了留下。不是因为走不了。是因为你想。', '房间');
            await typeWriter('空间安静了。', '房间');
            await new Promise(r => setTimeout(r, 1500));
            state.gameEnded = true;
            saveGame();
            titleScreen.querySelector('.login-title').textContent = '你留下了';
            titleScreen.querySelector('.login-subtitle').textContent = '— 这是你的空间 —';
            titleScreen.querySelector('.login-box').style.display = 'none';
            showEndingNotice('stay');
            titleScreen.classList.remove('hide');
          }
        } else {
          await typeWriter('出口出现了。你走进去了。', '房间');
          state.pt3Retries++;
          if (clueCount >= 4) {
            // 模糊结局：4-6条线索，半懂不懂
            await typeWriter('你找到了' + clueCount + '条线索。', '房间');
            await typeWriter('你好像明白了什么。又好像没有。', '房间');
            await typeWriter('门开了。你看到外面——不，你看到的是上次。', '房间');
            await typeWriter('不够。你知道的不够。', '房间');
            await new Promise(r => setTimeout(r, 2000));
            // 三周目重试2次后强制结束
            if (state.pt3Retries >= 2) {
              await typeWriter('……但你不记得这是第几次了。', '房间');
              await typeWriter('空间在重复。你也在重复。', '房间');
              await typeWriter('也许下一次会想起来。也许没有下一次了。', '房间');
              await new Promise(r => setTimeout(r, 1500));
              state.gameEnded = true;
              saveGame();
              titleScreen.querySelector('.login-title').textContent = '你没走出去';
              titleScreen.querySelector('.login-subtitle').textContent = '— 但你试过了 —';
              titleScreen.querySelector('.login-box').style.display = 'none';
              showEndingNotice('incomplete');
              titleScreen.classList.remove('hide');
            } else {
              state.loopCount = 0;
              state.interactedThisLoop = {};
              updateRoomState();
              await typeWriter('……再来。', '房间');
            }
          } else {
            // 0-3条线索，完全不懂
            await typeWriter('还是不够。你找到了' + clueCount + '条线索。需要7条。', '房间');
            await new Promise(r => setTimeout(r, 1500));
            // 三周目重试2次后强制结束
            if (state.pt3Retries >= 2) {
              await typeWriter('你不记得这是第几次了。', '房间');
              await typeWriter('空间还在。你还在。但什么都没变。', '房间');
              await typeWriter('也许你该走了。就算没有走出去。', '房间');
              await new Promise(r => setTimeout(r, 1500));
              state.gameEnded = true;
              saveGame();
              titleScreen.querySelector('.login-title').textContent = '你没走出去';
              titleScreen.querySelector('.login-subtitle').textContent = '— 但你试过了 —';
              titleScreen.querySelector('.login-box').style.display = 'none';
              showEndingNotice('incomplete');
              titleScreen.classList.remove('hide');
            } else {
              state.loopCount = 0;
              state.interactedThisLoop = {};
              updateRoomState();
              await typeWriter('再来一次。', '房间');
            }
          }
        }
      }
    } else {
      state.interactedThisLoop = {};
      await autoDialogueAfterLoop();
    }
  }
  } finally {
    state.isHandling = false;
  }
}

// ═══════════════════════════════════
//   密码锁
// ═══════════════════════════════════
function openDoorlockPad() {
  return new Promise(resolve => {
    const pad = $('doorlock-pad');
    const display = pad.querySelector('.lock-display');
    const closeBtn = pad.querySelector('.lock-close');
    const keys = pad.querySelectorAll('.lock-key');
    let input = '';
    let resolved = false;
    let verifying = false; // 防止验证期间继续输入
    const c = state.loopCount;
    
    function updateDisplay() {
      let displayStr = input ? input.padEnd(4, '·') : '····';
      // 深循环时显示偶尔被乱码遮盖
      if (c >= 7 && Math.random() < 0.3) {
        displayStr = glitchText(displayStr, 1);
        display.classList.add('glitched-text');
      } else {
        display.classList.remove('glitched-text');
      }
      display.textContent = displayStr;
    }
    function closePad() {
      if (resolved) return;
      resolved = true;
      pad.style.display = 'none';
      display.classList.remove('glitched-text');
      keys.forEach(k => k.replaceWith(k.cloneNode(true)));
      closeBtn.replaceWith(closeBtn.cloneNode(true));
      resolve();
    }
    
    async function runVerification() {
      verifying = true;
      // 验证流程——显示加载文字
      const verifyMsgs = ['正在验证...', '核对访客记录...', '比对空间记忆...'];
      if (c >= 9) verifyMsgs.push('记忆不完整。正在...正在...');
      
      for (let vi = 0; vi < verifyMsgs.length; vi++) {
        let msg = verifyMsgs[vi];
        // 深循环时验证文字也乱码
        if (c >= 8 && Math.random() < 0.3) msg = glitchText(msg, 1);
        display.textContent = msg;
        display.style.color = '#8a8';
        await new Promise(r => setTimeout(r, 700));
      }
      
      // 深循环假故障：c>=7 时有概率验证"失败"
      if (c >= 7 && Math.random() < 0.35) {
        // 假故障——验证失败
        sfx.glitch();
        display.style.color = '#c84a4a';
        let failMsg = '验证失败。访客记录异常。';
        if (c >= 9) failMsg = glitchText(failMsg, 2);
        display.textContent = failMsg;
        display.classList.add('glitched-text');
        await new Promise(r => setTimeout(r, 1200));
        display.classList.remove('glitched-text');
        display.style.color = '';
        input = '';
        verifying = false;
        updateDisplay();
        // 不增加 attempts——假故障不算玩家的尝试次数
        // 但给一句房间的话
        await typeWriter('锁闪了几下。好像出了什么问题。', '房间');
        await typeWriter('你记得你输的是对的。但你每次都记得。', '房间');
        return;
      }
      
      // 验证成功——开锁
      resolved = true;
      sfx.unlock();
      pad.style.display = 'none';
      display.classList.remove('glitched-text');
      keys.forEach(k => k.replaceWith(k.cloneNode(true)));
      closeBtn.replaceWith(closeBtn.cloneNode(true));
      state.lockSolved = true;
      saveGame();
      // 隐藏密码锁物品
      const doorlockItem = $('doorlock-item');
      if (doorlockItem) doorlockItem.style.display = 'none';
      // 解锁叙事
      await typeWriter('锁开了。', '房间');
      await new Promise(r => setTimeout(r, 600));
      await typeWriter('门上多了一行字。你之前没注意过。', '房间');
      await new Promise(r => setTimeout(r, 600));
      await typeWriter('「第一次来的时候，你把密码写在窗户上了。」', '房间');
      await new Promise(r => setTimeout(r, 800));
      await typeWriter('0413。你第一次走进来的日子。', '房间');
      await new Promise(r => setTimeout(r, 600));
      await typeWriter('你已经来过很多次了。每一次，你都会忘记密码。', '房间');
      await new Promise(r => setTimeout(r, 600));
      await typeWriter('然后你会在窗户上看到它。然后你会回来。然后你会忘。', '房间');
      resolve();
    }
    
    async function checkPassword() {
      if (input === '0413') {
        // 正确——进入验证流程
        state.lockAttemptsThisLoop++;
        saveGame();
        await runVerification();
      } else if (input.length >= 4) {
        // 密码错误
        state.lockAttemptsThisLoop++;
        saveGame();
        sfx.glitch();
        display.style.color = '#c84a4a';
        // 深循环时错误提示也乱码化
        if (c >= 8 && Math.random() < 0.4) {
          display.textContent = glitchText('错误', 2);
          display.classList.add('glitched-text');
        } else {
          display.textContent = '错误';
        }
        
        // 检查是否用完了尝试次数
        if (state.lockAttemptsThisLoop >= 3) {
          await new Promise(r => setTimeout(r, 1000));
          display.classList.remove('glitched-text');
          display.style.color = '#666';
          let lockMsg = '密码锁已锁定。';
          if (c >= 9) lockMsg = glitchText(lockMsg, 1);
          display.textContent = lockMsg;
          await new Promise(r => setTimeout(r, 800));
          pad.style.display = 'none';
          display.classList.remove('glitched-text');
          display.style.color = '';
          keys.forEach(k => k.replaceWith(k.cloneNode(true)));
          closeBtn.replaceWith(closeBtn.cloneNode(true));
          await typeWriter('锁灭了。你试了三次。', '房间');
          if (c >= 7) {
            await typeWriter('你每次都试三次。你每次都忘。', '房间');
          } else {
            await typeWriter('也许下次循环回来时会好。', '房间');
          }
          resolved = true;
          resolve();
          return;
        }
        
        setTimeout(() => {
          input = '';
          display.style.color = '';
          display.classList.remove('glitched-text');
          updateDisplay();
        }, 800);
      }
    }
    
    function onKeyClick(e) {
      if (verifying || resolved) return; // 验证中或已解决时禁止输入
      sfx.click();
      const n = e.currentTarget.dataset.n;
      if (n === 'del') {
        input = input.slice(0, -1);
        updateDisplay();
      } else if (n === '-1') {
        return; // 空白键
      } else if (input.length < 4) {
        input += n;
        updateDisplay();
        if (input.length === 4) checkPassword();
      }
    }
    function onCloseClick() { closePad(); }
    
    keys.forEach(k => k.addEventListener('click', onKeyClick));
    closeBtn.addEventListener('click', onCloseClick);
    
    updateDisplay();
    pad.style.display = '';
  });
}

// ═══════════════════════════════════
//   纸条写字
// ═══════════════════════════════════
function openNoteWritePad() {
  return new Promise(resolve => {
    const pad = $('note-write-pad');
    const textarea = pad.querySelector('.note-textarea');
    const writeBtn = pad.querySelector('.note-write-btn');
    const closeBtn = pad.querySelector('.note-write-close');
    let resolved = false;

    function closePad() {
      if (resolved) return;
      resolved = true;
      pad.style.display = 'none';
      textarea.value = '';
      writeBtn.replaceWith(writeBtn.cloneNode(true));
      closeBtn.replaceWith(closeBtn.cloneNode(true));
      resolve();
    }

    async function onWriteClick() {
      const content = textarea.value.trim();
      if (!content) {
        textarea.style.borderColor = '#c84a4a';
        setTimeout(() => { textarea.style.borderColor = ''; }, 600);
        return;
      }
      resolved = true;
      state.noteContent = content;
      saveGame();
      pad.style.display = 'none';
      writeBtn.replaceWith(writeBtn.cloneNode(true));
      closeBtn.replaceWith(closeBtn.cloneNode(true));
      await typeWriter('你把字写在了纸条上。', '房间');
      await new Promise(r => setTimeout(r, 600));
      await typeWriter('字很轻，但你认得。是你的字。', '房间');
      resolve();
    }

    function onCloseClick() { closePad(); }

    writeBtn.addEventListener('click', onWriteClick);
    closeBtn.addEventListener('click', onCloseClick);

    textarea.value = '';
    pad.style.display = '';
    textarea.focus();
  });
}

// ═══════════════════════════════════
//   退出按钮
// ═══════════════════════════════════
async function handleExit() {
  if (state.isTyping) { state.skipRequested = true; return; }
  exitBtn.textContent = '留下来';
  const exitSet = dialogues.exit[state.playthrough] || dialogues.exit[1];
  const idx = Math.min(state.loopCount, exitSet.length - 1);
  await typeWriter(exitSet[idx], '房间');
  if (state.loopCount >= 3) {
    await triggerLoop();
    const lrSet2 = dialogues.loopReturn[state.playthrough] || dialogues.loopReturn[1];
    const rMsg = lrSet2[Math.min(state.loopCount - 1, lrSet2.length - 1)];
    await typeWriter(rMsg, '房间');
    state.interactedThisLoop = {};
    await autoDialogueAfterLoop();
  }
}

// ═══════════════════════════════════
//   对话系统（空间对话）
// ═══════════════════════════════════
const dialogueResponses = [
  { keywords: ['出去','离开','走','exit','leave'], reply: '你已经出去过了。看看周围。' },
  { keywords: ['你是谁','你是什么','谁','who'], replies: {
    1: '我是你待的地方。你叫我"空间"就好。',
    2: '你问了很多次了。我不是别人。我是你留下的东西。',
    3: '你问的不是我是谁。你问的是你自己是谁。',
  }, isMulti: true },
  { keywords: ['为什么','why','原因'], replies: {
    1: '没有为什么。你只是在这里。',
    2: '你每次都问为什么。答案一直在门上。',
    3: '没有为什么。门从里面开。你自己没走。',
  }, isMulti: true },
  { keywords: ['你好','hi','hello','嗨'], reply: '……你好。你终于跟我说话了。' },
  { keywords: ['放我走','放开','求你','放过'], reply: '我没有抓住你。是你在留下。' },
  { keywords: ['第几次','几次','循环','loop'], reply: '你数到了几次？' },
  { keywords: ['镜子','mirror'], reply: '镜子里的那个人，每次都在等你。' },
  { keywords: ['纸条','note','纸'], reply: '纸条上的字，是你上一次写的。你不记得了吗？' },
  { keywords: ['窗','外面','window'], reply: '外面也有一个空间。一模一样的。' },
  { keywords: ['密码','password','锁'], replies: {
    1: '密码在窗户里。你擦干净了吗？',
    2: '四位数。你在窗户上看到的。你擦了，但你忘了。',
    3: '门从里面开。不需要密码。',
  }, isMulti: true },
  { keywords: ['0413'], replies: {
    1: '……你怎么知道的？算了，你以后会忘的。',
    2: '你终于记住了。但记住也没用。你下次还会忘。',
    3: '0413。那是你第一次走进来的日期。你一直带着它。',
  }, isMulti: true },
  { keywords: ['这是什么','什么地方','哪里','这是哪'], replies: {
    1: '这是你的空间。你弄的。你不记得了？',
    2: '你不知道？你建造的。你忘了。',
    3: '这是你。你待过太久的地方。',
  }, isMulti: true },
  { keywords: ['池续'], reply: '……这个名字。你从哪里带来的。空间记住了。' },
  { keywords: ['陈听澜','听澜','澜澜'], reply: '……', special: 'silence' },
  { keywords: ['忘记','forgot'], reply: '你忘不了。你每次都说忘记。' },
  { keywords: ['梦','dream'], reply: '这不是梦。梦会醒。' },
  { keywords: ['再见','bye','88','拜拜'], reply: '你走不了的。但你每次都会说再见。' },
  { keywords: ['名字','叫什么'], reply: '你以前叫它"我的空间"。现在它叫"你的空间"。' },
  { keywords: ['信息','资料','info','信息栏'], reply: '去信息栏看看。有些东西你知道，有些你不知道。但都会知道的。' },
];
const defaultResponses = ['它听到了。','……','你说的话，它都记得。','它在听。','别怕。','声音在这里回荡。'];

async function handlePlayerInput(text) {
  state.dialogueHistory.push(text);
  saveGame();
  const lower = text.toLowerCase().trim();
  let response = null;
  let special = null;
  for (const d of dialogueResponses) {
    if (d.keywords.some(k => lower.includes(k.toLowerCase()))) {
      if (d.isMulti) {
        response = d.replies[state.playthrough] || d.replies[1];
      } else {
        response = d.reply;
      }
      special = d.special;
      break;
    }
  }
  if (!response) response = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];

  if (special === 'silence') {
    await typeWriter('……', '房间');
    await new Promise(r => setTimeout(r, 2000));
    await typeWriter('这个名字……不在这里。但空间记住了。', '房间');
  } else {
    await typeWriter(response, '房间');
  }
}

// ═══════════════════════════════════
//   循环后自动对话（复用 showOptions）
// ═══════════════════════════════════

// 对话选项池——根据 loopCount 和 playthrough 动态构建
function buildDialoguePool() {
  const c = state.loopCount;
  const pt = state.playthrough;
  const pool = [];

  // ─── 通用选项（回复按周目区分）───
  const r = {
    silence: ['沉默也是一种回答。', '你又沉默了。上次也是。', '……（房间不说话了）'],
    place: ['这是你的空间。你弄的。你不记得了？', '你还在问这个？你已经知道了。', '你知道这是哪里。你一直知道。'],
    loops: ['你数到了 ' + (c + 1) + '。但你每次都会重新数。', '你数到了 ' + (c + 1) + '。但这次你感觉不只这些。', '你不再数了。数不完的。你知道。'],
    mirror: ['是你。大概是你。它的表情比你快一点。', '它比你先动了。你确定它是你？', '是你。一直是你。它不再假装了。'],
    window: ['外面也有一个空间。一模一样的。', '窗上的数字。你看了吗？0413。你不记得那是什么。', '0413。你第一次来的日期。你一直带着。'],
    broken: ['你来得太多了。它开始记得你了。', '它在烂。你也在一起烂。每次回来都烂一点。', '它不是旧了。它是在等。等你做完该做的事。'],
    exit: ['你想走？门一直在那。但你每次都没走。', '你试过了。每次都试。门开了，你走出去，然后你回来。', '门从里面开。你知道的。你一直知道。'],
    chixu: ['……你怎么知道这个名字？不在这里。', '这个名字……你从外面带来的。空间记住了。', '你叫他。他会来的。他一直在。'],
  };
  const ri = (key) => r[key][pt - 1] || r[key][0];

  pool.push({ text: '……', value: 'silence', response: ri('silence') });
  pool.push({ text: '这里是什么地方', value: 'place', response: ri('place') });

  if (c >= 3) {
    pool.push({ text: '我已经来过几次了', value: 'loops', response: ri('loops') });
    pool.push({ text: '镜子里的是谁', value: 'mirror', response: ri('mirror') });
    pool.push({ text: '窗外有什么', value: 'window', response: ri('window') });
  }

  if (c >= 6) {
    pool.push({ text: '空间怎么了', value: 'broken', response: ri('broken') });
    pool.push({ text: '我能出去吗', value: 'exit', response: ri('exit') });
  }

  // ─── 一周目独有：探索期的天真发问 ───
  if (pt === 1 && c >= 9) {
    pool.push({ text: '门后面是什么', value: 'door_behind', response: '你还没推过吗？你每次都推的。你只是不记得了。' });
    pool.push({ text: '我是谁', value: 'who_am_i', response: '你问了自己？这个空间现在不回答这个。以后会。' });
  }

  // ─── 二周目独有：怀疑期的追问 ───
  if (pt === 2) {
    if (c >= 3) {
      pool.push({ text: '陌生人是谁', value: 'stranger', response: '留言板上的人。你不记得他。但他记得你。' });
      pool.push({ text: '旧友是谁', value: 'old_friend', response: '旧友。你叫他旧友。但你不知道他到底是谁。' });
    }
    if (c >= 6) {
      pool.push({ text: '我上次来过吗', value: 'came_before', response: '你问了这个。你每次都问。你每次都不记得答案。' });
    }
  }

  // ─── 三周目独有：清醒期的觉醒 ───
  if (pt >= 3) {
    pool.push({ text: '空间主人是谁', value: 'owner', response: '你去信息栏看看。有些东西补上了。' });
    if (c >= 6) {
      pool.push({ text: '0413是什么', value: 'date_0413', response: '你第一次走进来的日子。你每次都会忘。然后你会在窗户上看到它。' });
      pool.push({ text: '门为什么从里面开', value: 'door_inside', response: '因为没有人拦住你。是你自己没走。' });
    }
    if (c >= 9) {
      pool.push({ text: '我想起来了', value: 'remember', response: '你想起来了什么？门？镜子？纸条？都是你。一直都是你。' });
      pool.push({ text: '我还要来几次', value: 'how_many', response: '这是最后一次了。你知道的。门在等你做决定。' });
    }
  }

  // 彩蛋
  if (c >= 6) {
    pool.push({ text: '池续', value: 'chixu', response: ri('chixu') });
  }

  return pool;
}

// 循环回来后自动触发一段对话
async function autoDialogueAfterLoop() {
  const c = state.loopCount;
  const pt = state.playthrough;

  // 循环 0~1 时房间还不太理你，跳过
  if (c < 1) return;

  // 过渡话——房间主动说一句
  const nudgeLines = [
    '……你又回来了。', '空间好像认识你了。', '你坐了一会儿。',
    '它安静地看着你。', '你没走。',
  ];
  let nudge = nudgeLines[Math.floor(Math.random() * nudgeLines.length)];
  // 深循环时过渡话也可能假故障化
  if (c >= 8 && Math.random() < 0.25) {
    nudge = glitchText(nudge, c >= 11 ? 2 : 1);
  }
  await typeWriter(nudge, '房间');
  await new Promise(r => setTimeout(r, 500));

  // 深循环时偶尔在对话中插入假故障——对话框文字闪乱码
  if (c >= 9 && Math.random() < 0.2) {
    const glitchLine = glitchText('……你还在吗？', 2);
    await typeWriter(glitchLine, '□□□');
    sfx.glitch();
    await new Promise(r => setTimeout(r, 800));
    await typeWriter('……', '房间');
    await new Promise(r => setTimeout(r, 400));
  }

  // 从池子里随机挑 1~3 个选项
  const pool = buildDialoguePool();
  const pickCount = Math.min(pool.length, Math.floor(Math.random() * 3) + 1);
  const available = [...pool];
  const selected = [];
  for (let i = 0; i < pickCount; i++) {
    const idx = Math.floor(Math.random() * available.length);
    selected.push(available[idx]);
    available.splice(idx, 1);
  }

  // 弹选项
  const options = selected.map(s => ({ text: s.text, value: s.value }));
  const choice = await showOptions(options, '房间');

  // 找到选中的那条，房间回应
  const picked = selected.find(s => s.value === choice) || selected[0];
  state.dialogueHistory.push(picked.text);
  saveGame();

  // 特殊处理
  if (picked.value === 'chixu') {
    await typeWriter(picked.response, '房间');
    await new Promise(r => setTimeout(r, 1500));
    if (pt === 1) {
      await typeWriter('空间记住了。它不会忘。', '房间');
    } else if (pt === 2) {
      await typeWriter('你从外面带来的东西，这里留不住。但这里会记住。', '房间');
    } else {
      await typeWriter('他会来找你的。在门后面。', '房间');
    }
  } else {
    await typeWriter(picked.response, '房间');
  }

  // 可能再说一句收尾
  if (c >= 6 && Math.random() < 0.5) {
    await new Promise(r => setTimeout(r, 800));
    const endings = ['你该去看看了。', '空间等着你。', '……去转转吧。'];
    await typeWriter(endings[Math.floor(Math.random() * endings.length)], '房间');
  }
}

// ═══════════════════════════════════
//   事件绑定
// ═══════════════════════════════════
document.querySelectorAll('.ph-item').forEach(el => {
  el.addEventListener('click', () => handleItem(el.dataset.item));
});
exitBtn.addEventListener('click', handleExit);

// 信息栏头像连点解锁装扮页
let avatarClickCount = 0;
let avatarClickTimer = null;
document.querySelector('.info-avatar').addEventListener('click', () => {
  if (state.dressupUnlocked) return;
  avatarClickCount++;
  clearTimeout(avatarClickTimer);
  avatarClickTimer = setTimeout(() => { avatarClickCount = 0; }, 2000);
  if (avatarClickCount >= 5) {
    avatarClickCount = 0;
    sfx.clue();
    state.dressupUnlocked = true;
    saveGame();
    renderDressup();
    typeWriter('你点了点头像好多次。空间裂开了一道缝。有什么东西……在信息栏下面。', '房间');
  }
});

// 公告栏连点彩蛋
$('bulletin-bar').addEventListener('click', () => {
  state.bulletinClicks++;
  if (state.bulletinClicks >= 5) {
    state.bulletinClicks = 0;
    typeWriter('你点了好多次。空间被你点得抖了一下。', '房间');
  }
});

// 窗户擦玻璃交互已移除（雾气叙事已整合到窗户对话流程中）

// ═══════════════════════════════════
//   结局尾声公告
// ═══════════════════════════════════
function showEndingNotice(type) {
  const notice = document.getElementById('ending-notice');
  const text = document.getElementById('ending-notice-text');
  const closeBtn = document.getElementById('ending-notice-close');

  const stories = {
    leave: `2008年4月13日。你推开了那扇门。

里面的空气是旧的。
但你认得。

你写了说说，留了言，擦了窗户上的雾。
镜子里的你比你还快一步。
纸条上的字，是你上次写的。

你一直以为空间困住了你。
但门从来都是从里面开的。

你站起来。
你走了。

空间在你身后安静下来。
没有声音。没有追赶。
它只是在那里。

你会记得0413。
你会记得那个房间。
你会记得——你。

——感谢游玩——`,
    stay: `2008年4月13日。你推开了那扇门。

里面的空气是旧的。
但你认得。

你写了说说，留了言，擦了窗户上的雾。
镜子里的你比你还快一步。
纸条上的字，是你上次写的。

你一直以为空间困住了你。
但门从来都是从里面开的。

你坐了下来。
你没有走。

不是因为走不了。
是因为你想留在这里。

空间轻轻亮了一下。
像是认出了你。

你一直在这里。
你一直在这里。
你一直。

——感谢游玩——`,
    incomplete: `2008年4月13日。你没能走出去。

里面的空气是旧的。
你也是旧的。

你试过了。
一次，两次。
空间的门开过。
但你每次走进去，看到的还是同一个房间。

你不记得这是第几次了。
空间不记得你。
你也不记得自己。

纸条上的字模糊了。
镜子里的脸模糊了。
连恐惧都模糊了。

门关上了。
不是你关的。
是它自己关的。

也许下一次。
也许没有下一次了。

——感谢游玩——`,
  };

  text.textContent = stories[type] || stories.leave;
  notice.style.display = 'flex';

  closeBtn.textContent = '[ 重新开始游戏 ]';
  closeBtn.addEventListener('click', () => {
    localStorage.removeItem('loopRoom_save');
    location.reload();
  }, { once: true });
}

// ═══════════════════════════════════
//   开始
// ═══════════════════════════════════
loadGame();
renderTalks();
renderBoard();
renderInfo();
renderDressup();

const loginBtn = document.getElementById('login-btn');

async function enterGame() {
  sfx.click();
  titleScreen.classList.add('hide');
  await new Promise(r => setTimeout(r, 800));
  
  // 有存档则跳过序章
  const hasSave = !!localStorage.getItem('loopRoom_save');
  
  if (!hasSave) {
  // ═══ 序章系统：第一人称旁白叙事 ═══
  const prologueLines = [
    '2008年6月15日。',
    '一个QQ空间被创建了。',
    '主人给它取名「无法离开的房间」。',
    '空间号是0413。',
    '主人很用心。装扮、音乐、说说、留言板。',
    '每一处都像是留给什么人的。',
    '最后一条说说发在2008年7月7日。',
    '之后，空间再也没更新过。',
    '主人没有注销。没有删好友。没有回来。',
    '空间就这样亮着。像一盏没人关的灯。',
    '……',
    '你不知道你是怎么走进来的。',
    '也许是你点了一个链接。也许是某个被遗忘的收藏夹。',
    '但你进来了。',
    '空间认出了你。',
    '它一直在等一个人。',
    '也许就是你。',
  ];
  
  const prologueOverlay = document.getElementById('prologue-overlay');
  const prologueText = document.getElementById('prologue-text');
  const prologueSkip = document.getElementById('prologue-skip');
  let prologueSkipped = false;
  
  prologueOverlay.classList.remove('hide');
  prologueOverlay.classList.add('show');
  prologueSkip.classList.add('show'); // 播放过程中就显示跳过按钮
  
  const skipHandler = () => { prologueSkipped = true; };
  prologueSkip.addEventListener('click', skipHandler, { once: true });
  
  for (const line of prologueLines) {
    if (prologueSkipped) break;
    prologueText.textContent = line;
    prologueText.style.opacity = '0';
    await new Promise(r => setTimeout(r, 50));
    prologueText.style.transition = 'opacity 0.6s';
    prologueText.style.opacity = '1';
    // 根据文字长度决定停留时间
    const dwell = Math.max(1400, line.length * 120);
    await new Promise(r => setTimeout(r, dwell));
    if (prologueSkipped) break;
    prologueText.style.opacity = '0';
    await new Promise(r => setTimeout(r, 400));
  }
  
  // 序章正常播完
  if (!prologueSkipped) {
    await new Promise(r => setTimeout(r, 800));
  }
  
  prologueOverlay.classList.remove('show');
  await new Promise(r => setTimeout(r, 800));
  prologueOverlay.classList.add('hide');
  prologueSkip.classList.remove('show');
  prologueSkip.removeEventListener('click', skipHandler);
  } // end if (!hasSave) — 有存档的玩家跳过序章
  
  // ═══ 正式进入游戏 ═══
  startBgm();
  updateRoomState();
  renderInfo();
  renderDressup();
  const intro = ['……你醒来了。', '这里是你很久以前来过的地方。', '你不记得了吗？没关系。', '你会想起来的。每次都会。'];
  for (const line of intro) {
    await typeWriter(line, '房间');
    await new Promise(r => setTimeout(r, 400));
  }
  await typeWriter('你可以去看看。主页有东西，说说和留言板也有人留言。信息栏……也许会慢慢补全。', '房间');
}

loginBtn.addEventListener('click', enterGame);

// ═══════════════════════════════════
//   重置进度
// ═══════════════════════════════════
$('reset-btn')?.addEventListener('click', () => {
  $('reset-confirm')?.classList.add('show');
});

$('reset-no')?.addEventListener('click', () => {
  $('reset-confirm')?.classList.remove('show');
});

$('reset-yes')?.addEventListener('click', () => {
  localStorage.removeItem('loopRoom_save');
  location.reload();
});