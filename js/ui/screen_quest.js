/* ═══════════════════════════════════════════════════════════
   S12 任務 / 成就
   ═══════════════════════════════════════════════════════════ */
var SG = window.SG || (window.SG = {});

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  function bar(now, need) {
    var pct = Math.min(100, Math.round(now * 100 / need));
    return '<span class="q-bar"><i style="width:' + pct + '%"></i></span>' +
           '<span class="q-num">' + now + ' / ' + need + '</span>';
  }

  function rewardRow(list) {
    return '<span class="q-reward">' + SG.rewardText(list) + '</span>';
  }

  SG.renderQuests = function () {
    SG.Save.refreshDaily();
    var d = SG.Save.data;

    /* ── 每日任務 ── */
    var host = $('qDaily');
    host.innerHTML = '';
    $('qDate').textContent = '今日（' + d.daily.date + '）· 跨日自動更換';

    d.daily.quests.forEach(function (entry) {
      var q = SG.questById(entry.id);
      if (!q) return;
      var st = SG.Save.questProgress(entry);
      var el = document.createElement('div');
      el.className = 'q-row' + (entry.claimed ? ' claimed' : st.done ? ' ready' : '');
      el.innerHTML =
        '<div class="q-main"><div class="q-text">' + q.text + '</div>' +
        '<div class="q-prog">' + bar(st.now, st.need) + rewardRow(q.reward) + '</div></div>' +
        '<div class="q-act"><button class="q-go"' +
          (entry.claimed || !st.done ? ' disabled' : '') + '>' +
          (entry.claimed ? '已領取' : st.done ? '領　取' : '進行中') + '</button></div>';
      if (!entry.claimed && st.done) {
        el.querySelector('.q-go').addEventListener('click', function () {
          if (SG.Save.claimQuest(entry)) {
            msg('領取成功：' + SG.rewardText(q.reward));
            SG.renderQuests();
          }
        });
      }
      host.appendChild(el);
    });

    /* ── 成就 ── */
    var groups = {};
    SG.ACHIEVEMENTS.forEach(function (a) {
      (groups[a.group] = groups[a.group] || []).push(a);
    });

    var ah = $('qAchieve');
    ah.innerHTML = '';
    var doneCount = 0, total = SG.ACHIEVEMENTS.length;
    Object.keys(groups).forEach(function (gname) {
      var sec = document.createElement('div');
      sec.className = 'q-group';
      sec.innerHTML = '<h4>' + gname + '</h4>';
      groups[gname].forEach(function (a) {
        var st = SG.Save.achieveState(a);
        if (st.claimed) doneCount++;
        var el = document.createElement('div');
        el.className = 'q-row' + (st.claimed ? ' claimed' : st.done ? ' ready' : '');
        el.innerHTML =
          '<div class="q-main"><div class="q-text">' + a.text + '</div>' +
          '<div class="q-prog">' + bar(st.now, st.need) + rewardRow(a.reward) + '</div></div>' +
          '<div class="q-act"><button class="q-go"' +
            (st.claimed || !st.done ? ' disabled' : '') + '>' +
            (st.claimed ? '已領取' : st.done ? '領　取' : '未達成') + '</button></div>';
        if (!st.claimed && st.done) {
          el.querySelector('.q-go').addEventListener('click', function () {
            if (SG.Save.claimAchieve(a)) {
              msg('達成「' + a.text + '」　' + SG.rewardText(a.reward));
              SG.renderQuests();
            }
          });
        }
        sec.appendChild(el);
      });
      ah.appendChild(sec);
    });
    $('qAchieveCount').innerHTML = '已領取 <b>' + doneCount + '</b> / ' + total;
  };

  function msg(text) {
    var el = $('qMsg');
    el.textContent = text;
    el.className = 'save-msg';
  }

  var bound = false;
  SG.bindQuests = function () {
    if (bound) return;
    bound = true;
  };
})();
