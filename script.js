// ════════════════════════════════════════════════════════
// AL-QAIM CRICKET CLUB — Main JS v4 (GitHub Edition)
// ════════════════════════════════════════════════════════

// ⚠️ SECURITY NOTE FOR PRODUCTION:
// This authentication system is CLIENT-SIDE ONLY for demonstration.
// NEVER use hardcoded passwords in production code.
// Implement proper backend authentication with:
// - Server-side session management
// - Secure password hashing (bcrypt, argon2)
// - JWT tokens or session cookies
// - HTTPS only
// - Rate limiting on login attempts

// ── HELPERS ──────────────────────────────────────────
function $(id) { return document.getElementById(id); }
function openModal(id) { $(id).classList.remove('hidden'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { $(id).classList.add('hidden'); document.body.style.overflow = ''; }
function saveLS(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
function loadLS(k, fb) { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } }
function timeAgo(ts) {
  const d = Date.now() - ts, m = Math.floor(d/60000);
  if (lang === 'ur') {
    if (m < 1) return 'ابھی';
    if (m < 60) return `${m} منٹ پہلے`;
    const h = Math.floor(m/60);
    if (h < 24) return `${h} گھنٹے پہلے`;
    return `${Math.floor(h/24)} دن پہلے`;
  }
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

function t(key) { return i18n[lang]?.[key] ?? i18n.en[key] ?? key; }

// ── MULTI-ROLE AUTH (demo — SHA-256 hashes, not plaintext) ──
const STAFF = {
  admin:        { role: 'admin',   labelKey: 'role_admin_lbl', permissions: ['matches','score','media','players','events','shop','contests','members','messages','stream'] },
  mediamgr:     { role: 'media',   labelKey: 'role_media_lbl', permissions: ['media'] },
  scorekeeper:  { role: 'score',   labelKey: 'role_score_lbl', permissions: ['score','matches'] },
  shopmgr:      { role: 'shop',    labelKey: 'role_shop_lbl', permissions: ['shop'] },
};

// Demo passwords (hashed at runtime on first load)
const DEMO_PASS = {
  admin: 'alqaim2026',
  mediamgr: 'media2026',
  scorekeeper: 'score2026',
  shopmgr: 'shop2026',
};

let staffHashesReady = false;
const staffHashCache = {};

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function initStaffHashes() {
  if (staffHashesReady) return;
  for (const [user, pass] of Object.entries(DEMO_PASS)) {
    staffHashCache[user] = await sha256(pass);
  }
  staffHashesReady = true;
}

let selectedLoginRole = 'admin';
let currentUser = null;

function staffLabel(user) {
  const key = STAFF[user]?.labelKey;
  return key ? t(key) : user;
}

function can(perm) { return currentUser && (currentUser.permissions.includes(perm) || currentUser.role === 'admin'); }

function openLoginModal() {
  openModal('login-modal');
  selectLoginRole(selectedLoginRole || 'admin');
  $('p-input').value = '';
  $('login-error').style.display = 'none';
  setTimeout(() => $('p-input').focus(), 200);
}

$('admin-login-link').addEventListener('click', e => {
  e.preventDefault();
  if (currentUser) { doLogout(); } else { openLoginModal(); }
});

function closeLoginModal() { closeModal('login-modal'); $('login-error').style.display = 'none'; }

function selectLoginRole(role) {
  selectedLoginRole = role;
  $('u-input').value = role;
  document.querySelectorAll('.role-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.role === role);
  });
}

function bindLoginRoleChips() {
  document.querySelectorAll('.role-chip').forEach(chip => {
    chip.addEventListener('click', () => selectLoginRole(chip.dataset.role));
  });
}

const passToggle = $('pass-toggle');
if (passToggle) {
  passToggle.addEventListener('click', () => {
    const inp = $('p-input');
    const show = inp.type === 'password';
    inp.type = show ? 'text' : 'password';
    passToggle.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });
}

async function doLogin() {
  const btn = $('login-btn');
  const u = $('u-input').value.trim().toLowerCase();
  const p = $('p-input').value;
  const staff = STAFF[u];
  $('login-error').style.display = 'none';
  if (!staff || !p) {
    $('login-error').style.display = 'block';
    return;
  }
  btn.classList.add('loading');
  await initStaffHashes();
  const match = staffHashCache[u] === await sha256(p);
  btn.classList.remove('loading');
  if (match) {
    currentUser = { username: u, role: staff.role, label: staffLabel(u), permissions: staff.permissions };
    sessionStorage.setItem('aqcc_staff', JSON.stringify({ username: u }));
    closeLoginModal();
    applyRoleUI();
    $('p-input').value = '';
  } else {
    $('login-error').style.display = 'block';
    $('p-input').value = '';
    $('p-input').focus();
    setTimeout(() => { if ($('login-error')) $('login-error').style.display = 'none'; }, 4000);
  }
}

$('p-input').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
$('u-input').addEventListener('keydown', e => { if (e.key === 'Enter') $('p-input').focus(); });

function doLogout() {
  currentUser = null;
  sessionStorage.removeItem('aqcc_staff');
  applyRoleUI();
}

async function restoreStaffSession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem('aqcc_staff') || 'null');
    if (saved?.username && STAFF[saved.username]) {
      const staff = STAFF[saved.username];
      currentUser = { username: saved.username, role: staff.role, label: staffLabel(saved.username), permissions: staff.permissions };
      applyRoleUI();
    }
  } catch { /* ignore */ }
}

function applyRoleUI() {
  const link = $('admin-login-link');
  document.querySelectorAll('.admin-btn, .admin-only, .media-mgr-btn').forEach(el => el.classList.add('hidden'));
  $('members-admin-panel').classList.add('hidden');
  $('contact-admin-panel').classList.add('hidden');
  link.classList.remove('staff-active');

  if (!currentUser) {
    link.textContent = t('nav_login');
    link.style.color = '';
    renderContests(); renderForumTopics();
    return;
  }

  link.classList.add('staff-active');
  link.innerHTML = `${currentUser.label} <span class="role-tag role-${currentUser.role}">${currentUser.role.toUpperCase()}</span> · ${t('nav_logout')}`;
  link.style.color = 'var(--accent-cyan)';

  // Show elements based on permissions
  if (can('matches'))  { $('open-add-match-modal').classList.remove('hidden'); document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden')); }
  if (can('score'))    { document.querySelectorAll('.admin-btn').forEach(el => { if (el.closest('#live-scores')) el.classList.remove('hidden'); }); }
  if (can('media'))    { document.querySelectorAll('.media-mgr-btn').forEach(el => el.classList.remove('hidden')); }
  if (can('players'))  { $('open-add-player-btn').classList.remove('hidden'); document.querySelectorAll('.p-delete-btn').forEach(el => el.classList.remove('hidden')); }
  if (can('events'))   { $('open-add-event-btn').classList.remove('hidden'); document.querySelectorAll('.event-delete').forEach(el => el.classList.remove('hidden')); }
  if (can('shop'))     { $('open-add-product-btn').classList.remove('hidden'); document.querySelectorAll('.product-delete').forEach(el => el.classList.remove('hidden')); }
  if (can('contests')) { $('open-add-contest-modal-btn').classList.remove('hidden'); $('open-add-contest-btn').classList.remove('hidden'); }
  if (can('stream'))   { document.querySelectorAll('#live-scores .admin-btn').forEach(el => el.classList.remove('hidden')); }
  if (can('matches'))  { $('open-add-scorecard-btn').classList.remove('hidden'); }
  if (can('members'))  { $('members-admin-panel').classList.remove('hidden'); renderMembersTable(); }
  if (can('messages')) { $('contact-admin-panel').classList.remove('hidden'); renderMessagesPanel(); }

  renderContests(); renderForumTopics(); renderShop(); renderEvents();
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) { o.classList.add('hidden'); document.body.style.overflow = ''; } });
});

// ══ MOBILE HAMBURGER MENU ══════════════════════════════════
const hamburgerBtn = $('hamburger-toggle');
const navMenu = $('nav-menu');

if (hamburgerBtn && navMenu) {
  hamburgerBtn.addEventListener('click', () => {
    hamburgerBtn.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Close menu when a link is clicked
  navMenu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburgerBtn.classList.remove('active');
      navMenu.classList.remove('active');
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('nav') && navMenu.classList.contains('active')) {
      hamburgerBtn.classList.remove('active');
      navMenu.classList.remove('active');
    }
  });
}

// ════════════════════════════════════════════════════════
// LANGUAGE / i18n
// ════════════════════════════════════════════════════════
let lang = loadLS('aqcc_lang', 'en');

const i18n = {
  en: {
    nav_title:'AL-QAIM CRICKET CLUB', nav_home:'Home', nav_matches:'Matches', nav_players:'Players',
    nav_events:'Events', nav_media:'Media', nav_fans:'Fans', nav_shop:'Shop', nav_about:'About', nav_contact:'Contact',
    nav_login:'Staff Login',
    hero_title:'Welcome to AL-QAIM CRICKET CLUB', hero_sub:'Passion. Teamwork. Victory.',
    hero_cta1:'View Upcoming Matches', hero_cta2:'Join the Fan Club',
    matches_title:'Matches', tab_upcoming:'Upcoming', tab_scorecard:'Scorecards',
    btn_add_match:'+ Add Match', btn_add_scorecard:'+ Add Scorecard',
    live_title:'Live', live_no_event:'No live events happening right now.', live_check_back:'Check back during match days!',
    live_team:'AL-QAIM CC', live_score_label:'Score:', live_target_label:'Target:', live_status_label:'Status:',
    stream_no_event:'No live stream at the moment.', stream_check_back:"We'll stream upcoming matches here!",
    btn_update_score:'Update Score', btn_go_live:'Go Live', btn_set_stream:'Set Stream URL', btn_stop_stream:'Stop Stream',
    events_title:'Events', filter_all:'All', filter_upcoming:'Upcoming', filter_current:'Ongoing', filter_past:'Past',
    btn_add_event:'+ Add Event',
    media_title:'Media Gallery', tab_photos:'Photos', tab_videos:'Videos',
    btn_add_photo:'+ Add Photos', btn_add_video:'+ Add Videos',
    fans_title:'Fan Engagement', fans_contests:'Contests', fans_contests_sub:'Participate in trivia contests and win official merchandise!',
    fans_view_contests:'View All Contests →', fans_poll:'Player of the Match Poll',
    fans_fantasy:'Fantasy League', fans_fantasy_sub:'Create your dream team and compete with other fans.',
    fans_play:'Start Playing →', fans_forum:'Community Forum',
    fans_forum_sub:'Discuss matches, share opinions, connect with fans.', fans_discuss:'Join the Discussion →',
    players_title:'Meet Our Players', role_bat:'Batsmen', role_bowl:'Bowlers', role_ar:'All-rounders', role_wk:'Keepers',
    btn_add_player:'+ Add Player',
    mem_title:'Membership', mem_join:'Join the Fan Club',
    mem_desc:'Become an official member of the AL-QAIM CC Fan Club and unlock exclusive benefits.',
    mem_b1:'🏏 Exclusive match updates & newsletters', mem_b2:'🎽 Merchandise discounts up to 20%',
    mem_b3:'🎟️ Early access to match tickets', mem_b4:'🏆 Access to Fantasy League competitions',
    mem_b5:'💬 Full Community Forum access',
    mem_name:'Full Name', mem_email:'Email Address', mem_phone:'Phone (optional)', mem_city:'City',
    mem_submit:"Sign Up Now — It's Free", mem_success_title:'Welcome to the family!',
    mem_success_sub:"You're now an official AL-QAIM CC Fan Club member.",
    contests_title:'Contests', contests_sub:'Participate in our trivia contests and win official merchandise!',
    btn_add_contest:'+ Add Contest',
    fantasy_title:'Fantasy League', fantasy_sub:'Build Your Dream XI',
    fantasy_desc:'Select 11 players from our squad and earn points based on their real-world performance.',
    fantasy_available:'Available Players', fantasy_submit:'Submit Team', fantasy_lb:'Leaderboard',
    forum_title:'Community Forum', forum_sub:'Discuss matches, share opinions, and connect with fellow fans.',
    forum_new_topic:'+ Start New Topic',
    shop_title:'Club Shop', shop_sub:'Official AL-QAIM CC merchandise — wear your pride.', btn_add_product:'+ Add Product',
    about_title:'About Us', about_p1:'Al Qaim Cricket Club is dedicated to promoting tape ball cricket, organizing transparent tournaments, and building a strong community of players and fans.',
    about_vision:'Our Vision', about_vision_p:'To become the leading cricket club in Bhakkar, fostering youth development and creating opportunities for players to shine on bigger platforms.',
    about_leadership:'Leadership', about_president:'President:', about_vp:'Vice President:', about_coach:'Coach:',
    contact_title:'Contact Us', contact_sub:"We'd love to hear from you! Reach out for queries, sponsorships, or collaborations.",
    contact_name:'Name', contact_email:'Email', contact_subject:'Subject', contact_message:'Message',
    contact_send:'Send Message', contact_sent:'Message sent!', contact_sent_sub:"We'll get back to you soon.",
    contact_other:'Other Ways to Connect',
    hero_badge:'Bhakkar · Punjab · Pakistan',
    stat_matches:'50+', stat_matches_lbl:'Matches Played',
    stat_players:'30+', stat_players_lbl:'Active Players',
    stat_fans:'500+', stat_fans_lbl:'Fan Club Members',
    fantasy_your_team:'Your Team',
    nav_logout:'Logout',
    login_sub:'Staff Panel — Secure Login', login_user:'Username', login_pass:'Password',
    login_pass_ph:'Enter password', login_btn:'Login', login_error:'Invalid credentials. Please try again.',
    login_role_pick:'Select your role', role_admin:'Admin', role_media:'Media', role_score:'Scorekeeper', role_shop:'Shop',
    role_admin_lbl:'Admin', role_media_lbl:'Media Manager', role_score_lbl:'Scorekeeper', role_shop_lbl:'Shop Manager',
    login_demo_toggle:'Demo access info', login_demo_text:'Demo passwords: admin/alqaim2026, mediamgr/media2026, scorekeeper/score2026, shopmgr/shop2026. For production, use server-side authentication.',
    empty_matches:'No upcoming matches scheduled. Check back soon!',
    footer_tagline:'AL-QAIM Cricket Club · Bhakkar, Punjab',
    footer_copy:'© 2026 Al-Qaim CC. All rights reserved.',
    modal_add_match:'Add New Match', btn_add_match_submit:'Add Match',
    modal_add_player:'Add Player', lbl_player_name:'Player Name', lbl_jersey:'Jersey #', lbl_role:'Role',
    lbl_select_role:'Select role', role_batsman:'Batsman', role_bowler:'Bowler', role_allrounder:'All-rounder', role_wicketkeeper:'Wicketkeeper',
    lbl_bat_style:'Batting Style', lbl_bowl_style:'Bowling Style', lbl_matches_played:'Matches Played',
    lbl_runs:'Runs Scored', lbl_hs:'Highest Score', lbl_bat_avg:'Batting Avg', lbl_strike_rate:'Strike Rate',
    lbl_wickets:'Wickets', lbl_best_bowl:'Best Bowling', lbl_bowl_avg:'Bowling Avg', lbl_economy:'Economy Rate',
    lbl_bio:'Bio', lbl_player_photo:'Player Photo', lbl_browse_photo:'📷 Click to browse photo',
    ph_bat_style:'Right-hand / Left-hand', ph_bowl_style:'Right-arm fast / Leg-spin...', ph_best_bowl:'e.g. 4/18',
    btn_add_player_submit:'Add Player',
    modal_add_event:'Add Event', lbl_event_title:'Event Title', lbl_description:'Description',
    lbl_start_date:'Start Date', lbl_end_date:'End Date', lbl_type:'Type',
    ev_tournament:'Tournament', ev_training:'Training Camp', ev_social:'Social Event', ev_trial:'Player Trials',
    btn_add_event_submit:'Add Event',
    modal_add_contest:'Add New Contest', lbl_title:'Title', lbl_question:'Question',
    lbl_correct_answer:'Correct Answer', lbl_prize:'Prize', btn_add_contest_submit:'Add Contest',
    modal_add_product:'Add Shop Product', lbl_product_name:'Product Name', lbl_price_pkr:'Price (PKR)',
    lbl_category:'Category', cat_jersey:'Jersey', cat_cap:'Cap', cat_equipment:'Equipment', cat_accessories:'Accessories',
    lbl_product_image:'Product Image', lbl_browse_image:'📷 Click to browse image', btn_add_product_submit:'Add Product',
    modal_new_topic:'Start a New Discussion', lbl_your_name:'Your Name', lbl_topic_title:'Topic Title',
    lbl_your_message:'Your Message', btn_post_topic:'Post Topic', lbl_reply:'Reply', btn_post_reply:'Post Reply',
    btn_close:'Close',
    lbl_opponent:'Opponent', lbl_date:'Date', lbl_venue:'Venue', lbl_match_type:'Match Type',
  },
  ur: {
    nav_title:'القائم کرکٹ کلب', nav_home:'ہوم', nav_matches:'میچز', nav_players:'کھلاڑی',
    nav_events:'تقریبات', nav_media:'میڈیا', nav_fans:'مداح', nav_shop:'شاپ', nav_about:'ہمارے بارے میں', nav_contact:'رابطہ',
    nav_login:'اسٹاف لاگ ان',
    hero_title:'القائم کرکٹ کلب میں خوش آمدید', hero_sub:'جذبہ۔ ٹیم ورک۔ فتح۔',
    hero_cta1:'آنے والے میچز دیکھیں', hero_cta2:'فین کلب میں شامل ہوں',
    matches_title:'میچز', tab_upcoming:'آنے والے', tab_scorecard:'اسکور کارڈ',
    btn_add_match:'+ میچ شامل کریں', btn_add_scorecard:'+ اسکور کارڈ شامل کریں',
    live_title:'لائیو', live_no_event:'ابھی کوئی لائیو ایونٹ نہیں ہے۔', live_check_back:'میچ کے دنوں میں دوبارہ چیک کریں!',
    live_team:'القائم سی سی', live_score_label:'اسکور:', live_target_label:'ہدف:', live_status_label:'صورتحال:',
    stream_no_event:'ابھی کوئی لائیو اسٹریم نہیں ہے۔', stream_check_back:'ہم آنے والے میچز یہاں اسٹریم کریں گے!',
    btn_update_score:'اسکور اپڈیٹ کریں', btn_go_live:'لائیو جائیں', btn_set_stream:'اسٹریم URL سیٹ کریں', btn_stop_stream:'اسٹریم بند کریں',
    events_title:'تقریبات', filter_all:'سب', filter_upcoming:'آنے والی', filter_current:'جاری', filter_past:'گزشتہ',
    btn_add_event:'+ تقریب شامل کریں',
    media_title:'میڈیا گیلری', tab_photos:'تصاویر', tab_videos:'ویڈیوز',
    btn_add_photo:'+ تصاویر شامل کریں', btn_add_video:'+ ویڈیوز شامل کریں',
    fans_title:'مداحوں کی شمولیت', fans_contests:'مقابلے', fans_contests_sub:'ٹریویا مقابلوں میں حصہ لیں اور سرکاری مرچنڈائز جیتیں!',
    fans_view_contests:'تمام مقابلے دیکھیں →', fans_poll:'میچ کے بہترین کھلاڑی کا پول',
    fans_fantasy:'فینٹسی لیگ', fans_fantasy_sub:'اپنی ڈریم ٹیم بنائیں اور دوسرے مداحوں سے مقابلہ کریں۔',
    fans_play:'کھیلنا شروع کریں →', fans_forum:'کمیونٹی فورم',
    fans_forum_sub:'میچز پر بحث کریں، رائے شیئر کریں، مداحوں سے جڑیں۔', fans_discuss:'بحث میں شامل ہوں →',
    players_title:'ہمارے کھلاڑیوں سے ملیں', role_bat:'بلے باز', role_bowl:'گیند باز', role_ar:'آل راؤنڈر', role_wk:'وکٹ کیپر',
    btn_add_player:'+ کھلاڑی شامل کریں',
    mem_title:'رکنیت', mem_join:'فین کلب میں شامل ہوں',
    mem_desc:'القائم سی سی فین کلب کے سرکاری رکن بنیں اور خصوصی فوائد حاصل کریں۔',
    mem_b1:'🏏 خصوصی میچ اپڈیٹس اور نیوز لیٹر', mem_b2:'🎽 مرچنڈائز پر 20% تک رعایت',
    mem_b3:'🎟️ میچ ٹکٹوں تک جلد رسائی', mem_b4:'🏆 فینٹسی لیگ مقابلوں تک رسائی',
    mem_b5:'💬 کمیونٹی فورم تک مکمل رسائی',
    mem_name:'پورا نام', mem_email:'ای میل پتہ', mem_phone:'فون (اختیاری)', mem_city:'شہر',
    mem_submit:'ابھی سائن اپ کریں — مفت ہے', mem_success_title:'خاندان میں خوش آمدید!',
    mem_success_sub:'آپ اب القائم سی سی فین کلب کے سرکاری رکن ہیں۔',
    contests_title:'مقابلے', contests_sub:'ہمارے ٹریویا مقابلوں میں حصہ لیں اور سرکاری مرچنڈائز جیتیں!',
    btn_add_contest:'+ مقابلہ شامل کریں',
    fantasy_title:'فینٹسی لیگ', fantasy_sub:'اپنی ڈریم الیون بنائیں',
    fantasy_desc:'ہماری ٹیم سے 11 کھلاڑی منتخب کریں اور ان کی اصل کارکردگی کی بنیاد پر پوائنٹس حاصل کریں۔',
    fantasy_available:'دستیاب کھلاڑی', fantasy_submit:'ٹیم جمع کریں', fantasy_lb:'لیڈر بورڈ',
    forum_title:'کمیونٹی فورم', forum_sub:'میچز پر بحث کریں، رائے شیئر کریں، اور ساتھی مداحوں سے جڑیں۔',
    forum_new_topic:'+ نئی بحث شروع کریں',
    shop_title:'کلب شاپ', shop_sub:'القائم سی سی کی سرکاری مرچنڈائز — اپنا فخر پہنیں۔', btn_add_product:'+ پروڈکٹ شامل کریں',
    about_title:'ہمارے بارے میں', about_p1:'القائم کرکٹ کلب ٹیپ بال کرکٹ کو فروغ دینے، شفاف ٹورنامنٹ منعقد کرنے اور کھلاڑیوں اور مداحوں کی مضبوط کمیونٹی بنانے کے لیے وقف ہے۔',
    about_vision:'ہمارا وژن', about_vision_p:'بھکر میں سرکردہ کرکٹ کلب بننا، نوجوانوں کی ترقی کو فروغ دینا اور کھلاڑیوں کو بڑے پلیٹ فارمز پر چمکنے کے مواقع فراہم کرنا۔',
    about_leadership:'قیادت', about_president:'صدر:', about_vp:'نائب صدر:', about_coach:'کوچ:',
    contact_title:'ہم سے رابطہ کریں', contact_sub:'ہم آپ سے سننا چاہتے ہیں! سوالات، اسپانسرشپ، یا تعاون کے لیے رابطہ کریں۔',
    contact_name:'نام', contact_email:'ای میل', contact_subject:'موضوع', contact_message:'پیغام',
    contact_send:'پیغام بھیجیں', contact_sent:'پیغام بھیج دیا گیا!', contact_sent_sub:'ہم جلد آپ سے رابطہ کریں گے۔',
    contact_other:'رابطے کے دیگر طریقے',
    hero_badge:'بھکر · پنجاب · پاکستان',
    stat_matches:'50+', stat_matches_lbl:'کھیلے گئے میچز',
    stat_players:'30+', stat_players_lbl:'فعال کھلاڑی',
    stat_fans:'500+', stat_fans_lbl:'فین کلب ممبرز',
    fantasy_your_team:'آپ کی ٹیم',
    nav_logout:'لاگ آؤٹ',
    login_sub:'اسٹاف پینل — محفوظ لاگ ان', login_user:'صارف نام', login_pass:'پاس ورڈ',
    login_pass_ph:'پاس ورڈ درج کریں', login_btn:'لاگ ان', login_error:'غلط اسناد۔ دوبارہ کوشش کریں۔',
    login_role_pick:'اپنا کردار منتخب کریں', role_admin:'ایڈمن', role_media:'میڈیا', role_score:'اسکور کیپر', role_shop:'شاپ',
    role_admin_lbl:'ایڈمن', role_media_lbl:'میڈیا مینیجر', role_score_lbl:'اسکور کیپر', role_shop_lbl:'شاپ مینیجر',
    login_demo_toggle:'ڈیمو رسائی کی معلومات', login_demo_text:'ڈیمو پاس ورڈ: admin/alqaim2026، mediamgr/media2026، scorekeeper/score2026، shopmgr/shop2026۔ پروڈکشن میں سرور سائیڈ تصدیق استعمال کریں۔',
    empty_matches:'کوئی آنے والا میچ شیڈول نہیں۔ جلد دوبارہ چیک کریں!',
    footer_tagline:'القائم کرکٹ کلب · بھکر، پنجاب',
    footer_copy:'© 2026 القائم سی سی۔ جملہ حقوق محفوظ ہیں۔',
    modal_add_match:'نیا میچ شامل کریں', btn_add_match_submit:'میچ شامل کریں',
    modal_add_player:'کھلاڑی شامل کریں', lbl_player_name:'کھلاڑی کا نام', lbl_jersey:'جرسی نمبر', lbl_role:'کردار',
    lbl_select_role:'کردار منتخب کریں', role_batsman:'بلے باز', role_bowler:'گیند باز', role_allrounder:'آل راؤنڈر', role_wicketkeeper:'وکٹ کیپر',
    lbl_bat_style:'بلے بازی کا انداز', lbl_bowl_style:'گیند بازی کا انداز', lbl_matches_played:'کھیلے گئے میچز',
    lbl_runs:'رنز', lbl_hs:'بلند ترین اسکور', lbl_bat_avg:'بیٹنگ اوسط', lbl_strike_rate:'اسٹرائیک ریٹ',
    lbl_wickets:'وکٹیں', lbl_best_bowl:'بہترین گیند بازی', lbl_bowl_avg:'گیند بازی اوسط', lbl_economy:'اکانومی ریٹ',
    lbl_bio:'تعارف', lbl_player_photo:'کھلاڑی کی تصویر', lbl_browse_photo:'📷 تصویر منتخب کریں',
    ph_bat_style:'دائیں ہاتھ / بائیں ہاتھ', ph_bowl_style:'دائیں بازو تیز / لیگ سپن...', ph_best_bowl:'مثال: 4/18',
    btn_add_player_submit:'کھلاڑی شامل کریں',
    modal_add_event:'تقریب شامل کریں', lbl_event_title:'تقریب کا عنوان', lbl_description:'تفصیل',
    lbl_start_date:'شروع کی تاریخ', lbl_end_date:'اختتام کی تاریخ', lbl_type:'قسم',
    ev_tournament:'ٹورنامنٹ', ev_training:'تربیتی کیمپ', ev_social:'سماجی تقریب', ev_trial:'کھلاڑی ٹرائلز',
    btn_add_event_submit:'تقریب شامل کریں',
    modal_add_contest:'نیا مقابلہ شامل کریں', lbl_title:'عنوان', lbl_question:'سوال',
    lbl_correct_answer:'درست جواب', lbl_prize:'انعام', btn_add_contest_submit:'مقابلہ شامل کریں',
    modal_add_product:'شاپ پروڈکٹ شامل کریں', lbl_product_name:'پروڈکٹ کا نام', lbl_price_pkr:'قیمت (روپے)',
    lbl_category:'زمرہ', cat_jersey:'جرسی', cat_cap:'کیپ', cat_equipment:'سازوسامان', cat_accessories:'لوازمات',
    lbl_product_image:'پروڈکٹ کی تصویر', lbl_browse_image:'📷 تصویر منتخب کریں', btn_add_product_submit:'پروڈکٹ شامل کریں',
    modal_new_topic:'نئی بحث شروع کریں', lbl_your_name:'آپ کا نام', lbl_topic_title:'موضوع کا عنوان',
    lbl_your_message:'آپ کا پیغام', btn_post_topic:'موضوع شائع کریں', lbl_reply:'جواب', btn_post_reply:'جواب شائع کریں',
    btn_close:'بند کریں',
    lbl_opponent:'مخالف ٹیم', lbl_date:'تاریخ', lbl_venue:'میدان', lbl_match_type:'میچ کی قسم',
  }
};

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18n[lang][key]) el.textContent = i18n[lang][key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (i18n[lang][key]) el.placeholder = i18n[lang][key];
  });
  document.documentElement.lang = lang === 'ur' ? 'ur' : 'en';
  document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
  document.body.classList.toggle('urdu', lang === 'ur');
  const lt = $('lang-toggle');
  if (lt) lt.textContent = lang === 'en' ? 'اردو' : 'English';
  if (currentUser) applyRoleUI();
}
window.toggleLanguage = function toggleLanguage() {
  lang = lang === 'en' ? 'ur' : 'en';
  saveLS('aqcc_lang', lang);
  applyI18n();
  renderUpcomingMatches();
};

applyI18n();

// ════════════════════════════════════════════════════════
// MATCHES — localStorage-backed, no hardcoded rows
// ════════════════════════════════════════════════════════
function getMatches() { return loadLS('aqcc_matches', []); }
function saveMatches(m) { saveLS('aqcc_matches', m); }

function renderUpcomingMatches() {
  const list = $('upcoming-matches-list');
  const matches = getMatches();
  if (matches.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted); padding:1rem 0;">${t('empty_matches')}</p>`;
    return;
  }
  list.innerHTML = matches.map(m => `
    <div class="match-card">
      <div>
        <div class="match-date">${m.date} · ${m.time}</div>
        <div class="match-vs">AL-QAIM CC vs ${m.opponent}</div>
        <div class="match-meta">📍 ${m.venue} &nbsp;|&nbsp; 🏆 ${m.tournament}</div>
      </div>
      <div class="match-actions admin-only hidden">
        <button class="admin-btn delete-btn" onclick="deleteMatch(${m.id})">Delete</button>
      </div>
    </div>
  `).join('');
  if (can('matches')) document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
}

function deleteMatch(id) {
  if (!confirm('Delete this match?')) return;
  saveMatches(getMatches().filter(m => m.id !== id));
  renderUpcomingMatches();
}

$('open-add-match-modal').addEventListener('click', () => openModal('add-match-modal'));

$('add-match-form').addEventListener('submit', e => {
  e.preventDefault();
  const matches = getMatches();
  matches.push({
    id: Date.now(),
    date: $('m-date').value.trim(), opponent: $('m-opp').value.trim(),
    venue: $('m-venue').value.trim(), time: $('m-time').value.trim(),
    tournament: $('m-tourn').value.trim()
  });
  saveMatches(matches);
  renderUpcomingMatches();
  $('add-match-form').reset();
  closeModal('add-match-modal');
});

function switchMatchTab(tab, btn) {
  document.querySelectorAll('.matches-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  $('tab-upcoming').classList.toggle('hidden', tab !== 'upcoming');
  $('tab-scorecard').classList.toggle('hidden', tab !== 'scorecard');
}

// ════════════════════════════════════════════════════════
// SCORECARDS
// ════════════════════════════════════════════════════════
function getScorecards() { return loadLS('aqcc_scorecards', []); }
function saveScorecards(s) { saveLS('aqcc_scorecards', s); }

function renderScorecards() {
  const list = $('scorecards-list');
  const scs = getScorecards();
  if (scs.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted); padding:1rem 0;">No scorecards added yet.</p>';
    return;
  }
  list.innerHTML = scs.slice().reverse().map(sc => `
    <div class="scorecard-card" onclick="viewScorecard(${sc.id})">
      <div>
        <div class="sc-title">${sc.title}</div>
        <div class="sc-meta">📅 ${sc.date} &nbsp;|&nbsp; 📍 ${sc.venue}</div>
      </div>
      <div style="display:flex; align-items:center; gap:10px;">
        <div class="sc-result">${sc.result}</div>
        ${can('matches') ? `<button class="admin-btn delete-btn" onclick="event.stopPropagation(); deleteScorecard(${sc.id})">Delete</button>` : ''}
      </div>
    </div>
  `).join('');
}

function viewScorecard(id) {
  const sc = getScorecards().find(s => s.id === id);
  if (!sc) return;
  const battingRows = sc.batting.map(b => `
    <tr>
      <td class="sc-name">${b.name}</td>
      <td class="sc-runs">${b.runs}</td>
      <td>${b.balls}</td>
      <td>${b.fours}</td>
      <td>${b.sixes}</td>
      <td style="font-size:0.82rem; color:var(--text-muted);">${b.how}</td>
    </tr>`).join('');
  const bowlingRows = sc.bowling.map(b => `
    <tr>
      <td class="sc-name">${b.name}</td>
      <td>${b.overs}</td>
      <td>${b.runs}</td>
      <td class="sc-wkts">${b.wkts}</td>
      <td>${b.eco}</td>
    </tr>`).join('');
  $('scorecard-view-content').innerHTML = `
    <h3 style="margin-bottom:0.5rem;">${sc.title}</h3>
    <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">📅 ${sc.date} &nbsp;|&nbsp; 📍 ${sc.venue}</div>
    <div class="sc-result-banner">🏆 ${sc.result}</div>
    <div class="sc-section-title">AL-QAIM CC — Batting</div>
    <table class="sc-table">
      <thead><tr><th>Batsman</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>Dismissal</th></tr></thead>
      <tbody>${battingRows}</tbody>
    </table>
    <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">Extras: ${sc.extras} &nbsp;|&nbsp; Total: <strong style="color:var(--accent-green);">${sc.total}</strong></div>
    <div class="sc-section-title">AL-QAIM CC — Bowling</div>
    <table class="sc-table">
      <thead><tr><th>Bowler</th><th>O</th><th>R</th><th>W</th><th>Eco</th></tr></thead>
      <tbody>${bowlingRows}</tbody>
    </table>
  `;
  openModal('view-scorecard-modal');
}

function deleteScorecard(id) {
  if (!confirm('Delete this scorecard?')) return;
  saveScorecards(getScorecards().filter(s => s.id !== id));
  renderScorecards();
}

function addBattingRow() {
  const div = document.createElement('div');
  div.className = 'scorecard-row';
  div.innerHTML = `<input type="text" placeholder="Batsman" class="sc-bat-name"><input type="number" placeholder="Runs" class="sc-bat-runs" min="0"><input type="number" placeholder="Balls" class="sc-bat-balls" min="0"><input type="number" placeholder="4s" class="sc-bat-fours" min="0"><input type="number" placeholder="6s" class="sc-bat-sixes" min="0"><input type="text" placeholder="Dismissal" class="sc-bat-how">`;
  $('batting-rows').appendChild(div);
}

function addBowlingRow() {
  const div = document.createElement('div');
  div.className = 'scorecard-row';
  div.innerHTML = `<input type="text" placeholder="Bowler" class="sc-bowl-name"><input type="number" placeholder="Overs" class="sc-bowl-overs" min="0"><input type="number" placeholder="Runs" class="sc-bowl-runs" min="0"><input type="number" placeholder="Wickets" class="sc-bowl-wkts" min="0" max="10"><input type="number" placeholder="Economy" class="sc-bowl-eco" step="0.01" min="0">`;
  $('bowling-rows').appendChild(div);
}

$('open-add-scorecard-btn').addEventListener('click', () => openModal('add-scorecard-modal'));

$('add-scorecard-form').addEventListener('submit', e => {
  e.preventDefault();
  const batting = Array.from(document.querySelectorAll('#batting-rows .scorecard-row')).map(row => ({
    name: row.querySelector('.sc-bat-name').value.trim(),
    runs: row.querySelector('.sc-bat-runs').value || 0,
    balls: row.querySelector('.sc-bat-balls').value || 0,
    fours: row.querySelector('.sc-bat-fours').value || 0,
    sixes: row.querySelector('.sc-bat-sixes').value || 0,
    how: row.querySelector('.sc-bat-how').value.trim()
  })).filter(b => b.name);
  const bowling = Array.from(document.querySelectorAll('#bowling-rows .scorecard-row')).map(row => ({
    name: row.querySelector('.sc-bowl-name').value.trim(),
    overs: row.querySelector('.sc-bowl-overs').value || 0,
    runs: row.querySelector('.sc-bowl-runs').value || 0,
    wkts: row.querySelector('.sc-bowl-wkts').value || 0,
    eco: row.querySelector('.sc-bowl-eco').value || 0
  })).filter(b => b.name);
  const scs = getScorecards();
  scs.push({
    id: Date.now(),
    title: $('sc-title').value.trim(), date: $('sc-date').value.trim(),
    venue: $('sc-venue').value.trim(), result: $('sc-result').value.trim(),
    extras: $('sc-extras').value.trim(), total: $('sc-total').value.trim(),
    batting, bowling
  });
  saveScorecards(scs);
  renderScorecards();
  $('add-scorecard-form').reset();
  $('batting-rows').innerHTML = `<div class="scorecard-row"><input type="text" placeholder="Batsman" class="sc-bat-name"><input type="number" placeholder="Runs" class="sc-bat-runs" min="0"><input type="number" placeholder="Balls" class="sc-bat-balls" min="0"><input type="number" placeholder="4s" class="sc-bat-fours" min="0"><input type="number" placeholder="6s" class="sc-bat-sixes" min="0"><input type="text" placeholder="Dismissal" class="sc-bat-how"></div>`;
  $('bowling-rows').innerHTML = `<div class="scorecard-row"><input type="text" placeholder="Bowler" class="sc-bowl-name"><input type="number" placeholder="Overs" class="sc-bowl-overs" min="0"><input type="number" placeholder="Runs" class="sc-bowl-runs" min="0"><input type="number" placeholder="Wickets" class="sc-bowl-wkts" min="0" max="10"><input type="number" placeholder="Economy" class="sc-bowl-eco" step="0.01" min="0"></div>`;
  closeModal('add-scorecard-modal');
});

// ════════════════════════════════════════════════════════
// LIVE SCORE + STREAMING
// ════════════════════════════════════════════════════════
let liveActive = loadLS('aqcc_live_active', false);
let liveData   = loadLS('aqcc_live_data', {});

function renderLiveScore() {
  if (liveActive && liveData.opponent) {
    $('live-no-match').classList.add('hidden');
    $('live-score-panel').classList.remove('hidden');
    $('live-opponent').textContent = liveData.opponent;
    $('live-runs').textContent     = liveData.runs;
    $('live-wickets').textContent  = liveData.wickets;
    $('live-overs').textContent    = liveData.overs;
    $('live-target').textContent   = liveData.target;
    $('live-status').textContent   = liveData.status;
    $('live-toggle-btn').textContent = 'End Live';
    $('live-toggle-btn').style.background = 'var(--accent-red)';
  } else {
    $('live-no-match').classList.remove('hidden');
    $('live-score-panel').classList.add('hidden');
    $('live-toggle-btn').textContent = 'Go Live';
    $('live-toggle-btn').style.background = '';
  }
}

function toggleLiveMatch() {
  liveActive = !liveActive;
  saveLS('aqcc_live_active', liveActive);
  renderLiveScore();
}

function openUpdateScoreModal() {
  $('s-opp').value     = liveData.opponent || '';
  $('s-runs').value    = liveData.runs || '';
  $('s-wickets').value = liveData.wickets || '';
  $('s-overs').value   = liveData.overs || '';
  $('s-target').value  = liveData.target || '';
  $('s-status').value  = liveData.status || '';
  openModal('update-score-modal');
}

$('update-score-form').addEventListener('submit', e => {
  e.preventDefault();
  liveData = {
    opponent: $('s-opp').value.trim(), runs: $('s-runs').value.trim(),
    wickets: $('s-wickets').value.trim(), overs: $('s-overs').value.trim(),
    target: $('s-target').value.trim(), status: $('s-status').value.trim()
  };
  liveActive = true;
  saveLS('aqcc_live_data', liveData);
  saveLS('aqcc_live_active', true);
  renderLiveScore();
  closeModal('update-score-modal');
});

// Streaming
let streamUrl = loadLS('aqcc_stream_url', '');

function renderStream() {
  if (streamUrl) {
    $('stream-offline').classList.add('hidden');
    $('stream-active').classList.remove('hidden');
    $('stream-embed-wrap').innerHTML = `<iframe src="${streamUrl}" allowfullscreen allow="autoplay; encrypted-media"></iframe>`;
    $('stop-stream-btn').style.display = 'inline-block';
  } else {
    $('stream-offline').classList.remove('hidden');
    $('stream-active').classList.add('hidden');
    $('stop-stream-btn').style.display = 'none';
  }
}

function openStreamModal() { openModal('stream-modal'); }

$('stream-form').addEventListener('submit', e => {
  e.preventDefault();
  streamUrl = $('stream-url').value.trim();
  saveLS('aqcc_stream_url', streamUrl);
  renderStream();
  closeModal('stream-modal');
});

function stopStream() {
  if (!confirm('Stop the live stream?')) return;
  streamUrl = '';
  saveLS('aqcc_stream_url', '');
  renderStream();
}

renderLiveScore();
renderStream();

// ════════════════════════════════════════════════════════
// EVENTS
// ════════════════════════════════════════════════════════
function getEvents() {
  return loadLS('aqcc_events', [
    { id:1, title:'Regional League 2026', desc:'Annual regional tape ball cricket league featuring top clubs from Bhakkar district.', start:'2026-05-01', end:'2026-06-30', venue:'Railway Ground, Kotla Jam', type:'tournament' },
    { id:2, title:'Summer Training Camp', desc:'Intensive training camp for squad members ahead of the provincial championship.', start:'2026-04-10', end:'2026-04-20', venue:'AL-QAIM Practice Ground', type:'training' },
    { id:3, title:'Player Trials 2025', desc:'Open trials for new talent. All age groups welcome.', start:'2025-11-15', end:'2025-11-16', venue:'City Cricket Ground, Bhakkar', type:'trial' },
  ]);
}
function saveEvents(ev) { saveLS('aqcc_events', ev); }

function getEventStatus(start, end) {
  const now = new Date(), s = new Date(start), e = new Date(end);
  if (now < s) return 'upcoming';
  if (now > e) return 'past';
  return 'current';
}

let evFilter = 'all';

function filterEvents(f, btn) {
  evFilter = f;
  document.querySelectorAll('.events-filter .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderEvents();
}

function renderEvents() {
  const list = $('events-list');
  let events = getEvents();
  if (evFilter !== 'all') events = events.filter(ev => getEventStatus(ev.start, ev.end) === evFilter);
  if (events.length === 0) {
    list.innerHTML = '<p style="color:var(--text-muted); padding:1rem 0;">No events found.</p>';
    return;
  }
  const typeIcons = { tournament:'🏆', training:'🏋️', social:'🎉', trial:'🎯' };
  list.innerHTML = `<div class="events-grid">${events.map(ev => {
    const status = getEventStatus(ev.start, ev.end);
    const statusBadge = status === 'current' ? '<span class="badge" style="background:rgba(0,229,160,0.2);color:var(--accent-green);">● ONGOING</span>'
      : status === 'upcoming' ? '<span class="badge badge-violet">UPCOMING</span>'
      : '<span class="badge" style="background:rgba(255,255,255,0.06);color:var(--text-muted);">PAST</span>';
    return `
      <div class="event-card">
        <div class="event-status">${statusBadge}</div>
        <div class="event-type-tag">${typeIcons[ev.type]||'📅'} ${ev.type.toUpperCase()}</div>
        <h4>${ev.title}</h4>
        <div class="event-dates">📅 ${ev.start} → ${ev.end}</div>
        <div class="event-venue">📍 ${ev.venue}</div>
        <p>${ev.desc}</p>
        ${can('events') ? `<button class="admin-btn delete-btn event-delete" onclick="deleteEvent(${ev.id})" style="margin-top:0.8rem;">Delete</button>` : ''}
      </div>`;
  }).join('')}</div>`;
}

function deleteEvent(id) {
  if (!confirm('Delete this event?')) return;
  saveEvents(getEvents().filter(ev => ev.id !== id));
  renderEvents();
}

$('open-add-event-btn').addEventListener('click', () => openModal('add-event-modal'));

$('add-event-form').addEventListener('submit', e => {
  e.preventDefault();
  const events = getEvents();
  events.push({
    id: Date.now(),
    title: $('ev-title').value.trim(), desc: $('ev-desc').value.trim(),
    start: $('ev-start').value, end: $('ev-end').value,
    venue: $('ev-venue').value.trim(), type: $('ev-type').value
  });
  saveEvents(events);
  renderEvents();
  $('add-event-form').reset();
  closeModal('add-event-modal');
});

// ════════════════════════════════════════════════════════
// MEDIA GALLERY — persistent via localStorage (data URLs)
// ════════════════════════════════════════════════════════
function getPhotos() { return loadLS('aqcc_photos', []); }
function getVideos() { return loadLS('aqcc_videos', []); }
function savePhotos(p) { saveLS('aqcc_photos', p); }
function saveVideos(v) { saveLS('aqcc_videos', v); }

function renderPhotos() {
  const gallery = $('photo-gallery');
  const photos = getPhotos();
  $('photo-count').textContent = `${photos.length} photo${photos.length !== 1 ? 's' : ''}`;
  if (photos.length === 0) {
    gallery.innerHTML = '<p style="color:var(--text-muted); grid-column:1/-1;">No photos yet.</p>';
    return;
  }
  gallery.innerHTML = photos.map(p => `
    <div class="media-item">
      <img src="${p.src}" alt="${p.caption}">
      <div class="media-caption">${p.caption}</div>
      ${can('media') ? `<button class="admin-btn delete-btn media-delete" onclick="deletePhoto(${p.id})">Delete</button>` : ''}
    </div>
  `).join('');
}

function renderVideos() {
  const gallery = $('video-gallery');
  const videos = getVideos();
  $('video-count').textContent = `${videos.length} video${videos.length !== 1 ? 's' : ''}`;
  if (videos.length === 0) {
    gallery.innerHTML = '<p style="color:var(--text-muted); grid-column:1/-1;">No videos yet.</p>';
    return;
  }
  gallery.innerHTML = videos.map(v => `
    <div class="media-item">
      <video controls>
        <source src="${v.src}" type="${v.type}">
        Your browser does not support the video tag.
      </video>
      <div class="media-caption">${v.caption}</div>
      ${can('media') ? `<button class="admin-btn delete-btn media-delete" onclick="deleteVideo(${v.id})">Delete</button>` : ''}
    </div>
  `).join('');
}

function handlePhotoUpload(event) {
  const files = Array.from(event.target.files);
  const photos = getPhotos();
  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      photos.push({ id: Date.now() + loaded++, src: e.target.result, caption: file.name.replace(/\.[^.]+$/, ''), type: file.type });
      if (loaded === files.length) { savePhotos(photos); renderPhotos(); }
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function handleVideoUpload(event) {
  const files = Array.from(event.target.files);
  const videos = getVideos();
  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      videos.push({ id: Date.now() + loaded++, src: e.target.result, caption: file.name.replace(/\.[^.]+$/, ''), type: file.type });
      if (loaded === files.length) { saveVideos(videos); renderVideos(); }
    };
    reader.readAsDataURL(file);
  });
  event.target.value = '';
}

function deletePhoto(id) {
  if (!confirm('Delete this photo?')) return;
  savePhotos(getPhotos().filter(p => p.id !== id));
  renderPhotos();
}

function deleteVideo(id) {
  if (!confirm('Delete this video?')) return;
  saveVideos(getVideos().filter(v => v.id !== id));
  renderVideos();
}

function switchMediaTab(tab, btn) {
  document.querySelectorAll('.media-tabs .tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  $('media-tab-photos').classList.toggle('hidden', tab !== 'photos');
  $('media-tab-videos').classList.toggle('hidden', tab !== 'videos');
}

// ════════════════════════════════════════════════════════
// PLAYERS — ICC-style performance cards, localStorage
// ════════════════════════════════════════════════════════
function getPlayers() {
  return loadLS('aqcc_players', [
    { id:1, name:'Player 1', jersey:1, role:'Batsman', batStyle:'Right-hand', bowlStyle:'Right-arm medium', matches:24, runs:680, hs:78, avg:32.4, sr:118.5, wkts:3, bb:'1/12', bowlAvg:45.0, eco:7.2, bio:'A dynamic batsman known for his aggressive style.', img:'' },
    { id:2, name:'Player 2', jersey:2, role:'Bowler', batStyle:'Left-hand', bowlStyle:'Left-arm fast', matches:22, runs:95, hs:18, avg:8.6, sr:72.0, wkts:38, bb:'4/18', bowlAvg:14.2, eco:6.1, bio:'A skilled bowler with a knack for taking crucial wickets.', img:'' },
    { id:3, name:'Player 3', jersey:3, role:'All-rounder', batStyle:'Right-hand', bowlStyle:'Right-arm off-spin', matches:20, runs:420, hs:55, avg:24.7, sr:105.0, wkts:22, bb:'3/24', bowlAvg:18.5, eco:6.8, bio:'A versatile player who contributes both with bat and ball.', img:'' },
    { id:4, name:'Player 4', jersey:4, role:'Wicketkeeper', batStyle:'Right-hand', bowlStyle:'—', matches:23, runs:310, hs:42, avg:18.2, sr:98.4, wkts:0, bb:'—', bowlAvg:0, eco:0, bio:'An agile wicketkeeper with quick reflexes.', img:'' },
  ]);
}
function savePlayers(p) { saveLS('aqcc_players', p); }

let playerFilter = 'all';

function filterPlayers(role, btn) {
  playerFilter = role;
  document.querySelectorAll('.players-filter .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderPlayers();
}

function renderPlayers() {
  const container = $('players-container');
  let players = getPlayers();
  if (playerFilter !== 'all') players = players.filter(p => p.role === playerFilter);
  if (players.length === 0) {
    container.innerHTML = '<p style="color:var(--text-muted);">No players found.</p>';
    return;
  }
  const roleColors = { Batsman:'var(--accent-cyan)', Bowler:'var(--accent-red)', 'All-rounder':'var(--accent-green)', Wicketkeeper:'var(--accent-gold)' };
  container.innerHTML = players.map(p => `
    <div class="player-profile" onclick="viewPlayerStats(${p.id})">
      ${p.jersey ? `<div class="p-jersey">#${p.jersey}</div>` : ''}
      <img src="${p.img || 'images/player-placeholder.jpg'}" alt="${p.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2290%22 height=%2290%22><rect width=%2290%22 height=%2290%22 rx=%2245%22 fill=%22%230d1525%22/><text x=%2245%22 y=%2255%22 text-anchor=%22middle%22 font-size=%2232%22 fill=%22%2300e5a0%22>🏏</text></svg>'">
      <h3>${p.name}</h3>
      <div class="p-role" style="color:${roleColors[p.role]||'var(--accent-gold)'};">${p.role}</div>
      <div class="p-stats-mini">
        <div class="p-stat"><div class="p-stat-val">${p.matches}</div><div class="p-stat-lbl">M</div></div>
        ${p.role !== 'Bowler' ? `<div class="p-stat"><div class="p-stat-val">${p.runs}</div><div class="p-stat-lbl">Runs</div></div>` : ''}
        ${p.role !== 'Batsman' && p.role !== 'Wicketkeeper' ? `<div class="p-stat"><div class="p-stat-val">${p.wkts}</div><div class="p-stat-lbl">Wkts</div></div>` : ''}
      </div>
      <button class="p-view-btn" onclick="event.stopPropagation(); viewPlayerStats(${p.id})">View Stats Card</button>
      ${can('players') ? `<button class="admin-btn delete-btn p-delete-btn" onclick="event.stopPropagation(); deletePlayer(${p.id})">Delete</button>` : ''}
    </div>
  `).join('');
}

function viewPlayerStats(id) {
  const p = getPlayers().find(pl => pl.id === id);
  if (!p) return;
  const imgSrc = p.img || `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110"><rect width="110" height="110" rx="55" fill="%230d1525"/><text x="55" y="68" text-anchor="middle" font-size="48" fill="%2300e5a0">🏏</text></svg>`;
  $('player-stats-content').innerHTML = `
    <div class="icc-card">
      <div class="icc-header">
        <img src="${p.img || ''}" alt="${p.name}" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22110%22 height=%22110%22><rect width=%22110%22 height=%22110%22 rx=%2255%22 fill=%22%230d1525%22/><text x=%2255%22 y=%2268%22 text-anchor=%22middle%22 font-size=%2248%22 fill=%22%2300e5a0%22>🏏</text></svg>'">
        <div class="icc-header-info">
          <h2>${p.name}</h2>
          <div class="icc-role">${p.role}${p.jersey ? ` · #${p.jersey}` : ''}</div>
          <div class="icc-meta">
            <span>🏏 <strong>${p.batStyle || '—'}</strong></span>
            <span>🎳 <strong>${p.bowlStyle || '—'}</strong></span>
            <span>📋 <strong>${p.matches}</strong> Matches</span>
          </div>
          ${p.bio ? `<p style="margin-top:8px; font-size:0.88rem;">${p.bio}</p>` : ''}
        </div>
      </div>
      <div class="icc-stats-grid">
        <div class="icc-stats-section">
          <h4>Batting</h4>
          <div class="icc-stat-row"><span class="stat-label">Runs</span><span class="stat-value highlight">${p.runs}</span></div>
          <div class="icc-stat-row"><span class="stat-label">Highest Score</span><span class="stat-value">${p.hs}</span></div>
          <div class="icc-stat-row"><span class="stat-label">Average</span><span class="stat-value">${p.avg}</span></div>
          <div class="icc-stat-row"><span class="stat-label">Strike Rate</span><span class="stat-value">${p.sr}</span></div>
        </div>
        <div class="icc-stats-section">
          <h4>Bowling</h4>
          <div class="icc-stat-row"><span class="stat-label">Wickets</span><span class="stat-value highlight">${p.wkts}</span></div>
          <div class="icc-stat-row"><span class="stat-label">Best Bowling</span><span class="stat-value">${p.bb || '—'}</span></div>
          <div class="icc-stat-row"><span class="stat-label">Average</span><span class="stat-value">${p.bowlAvg || '—'}</span></div>
          <div class="icc-stat-row"><span class="stat-label">Economy</span><span class="stat-value">${p.eco || '—'}</span></div>
        </div>
      </div>
    </div>
  `;
  openModal('player-stats-modal');
}

function deletePlayer(id) {
  if (!confirm('Delete this player?')) return;
  savePlayers(getPlayers().filter(p => p.id !== id));
  renderPlayers();
}

let playerImgDataUrl = '';

$('open-add-player-btn').addEventListener('click', () => openModal('add-player-modal'));

function previewPlayerImg(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    playerImgDataUrl = e.target.result;
    $('p-img-preview').src = playerImgDataUrl;
    $('p-img-preview').style.display = 'block';
    $('p-img-label').textContent = '✅ ' + file.name;
  };
  reader.readAsDataURL(file);
}

$('add-player-form').addEventListener('submit', e => {
  e.preventDefault();
  const players = getPlayers();
  players.push({
    id: Date.now(),
    name: $('p-name').value.trim(), jersey: parseInt($('p-jersey').value)||0,
    role: $('p-role').value, batStyle: $('p-bat-style').value.trim(),
    bowlStyle: $('p-bowl-style').value.trim(), bio: $('p-bio').value.trim(),
    matches: parseInt($('p-matches').value)||0, runs: parseInt($('p-runs').value)||0,
    hs: parseInt($('p-hs').value)||0, avg: parseFloat($('p-avg').value)||0,
    sr: parseFloat($('p-sr').value)||0, wkts: parseInt($('p-wkts').value)||0,
    bb: $('p-bb').value.trim(), bowlAvg: parseFloat($('p-bowl-avg').value)||0,
    eco: parseFloat($('p-eco').value)||0, img: playerImgDataUrl
  });
  savePlayers(players);
  renderPlayers();
  $('add-player-form').reset();
  $('p-img-preview').style.display = 'none';
  $('p-img-label').textContent = t('lbl_browse_photo');
  playerImgDataUrl = '';
  closeModal('add-player-modal');
});

// ════════════════════════════════════════════════════════
// INTERACTIVE POLL — vote counts + percentage bars
// ════════════════════════════════════════════════════════
function getPollData() {
  return loadLS('aqcc_poll', { options: ['Player 1','Player 2','Player 3'], votes: [0,0,0], voted: false });
}
function savePollData(d) { saveLS('aqcc_poll', d); }

function renderPoll() {
  const poll = getPollData();
  const total = poll.votes.reduce((a,b) => a+b, 0);
  const widget = $('poll-widget');
  if (poll.voted) {
    widget.innerHTML = `
      <div style="margin-bottom:1rem;">
        ${poll.options.map((opt, i) => {
          const pct = total > 0 ? Math.round((poll.votes[i]/total)*100) : 0;
          return `
            <div class="poll-option">
              <label>${opt}</label>
              <div class="poll-bar-wrap"><div class="poll-bar" style="width:${pct}%"></div></div>
              <div class="poll-pct">${pct}% (${poll.votes[i]} votes)</div>
            </div>`;
        }).join('')}
      </div>
      <div class="poll-total">Total votes: <strong style="color:var(--accent-green);">${total}</strong></div>
      <div class="poll-voted-msg">✅ You've already voted. Thanks!</div>
    `;
  } else {
    widget.innerHTML = `
      <form id="poll-form" onsubmit="castVote(event)">
        ${poll.options.map((opt, i) => `
          <div class="poll-option">
            <label><input type="radio" name="poll-player" value="${i}"> ${opt}</label>
            ${total > 0 ? `
              <div class="poll-bar-wrap"><div class="poll-bar" style="width:${Math.round((poll.votes[i]/total)*100)}%"></div></div>
              <div class="poll-pct">${Math.round((poll.votes[i]/total)*100)}% (${poll.votes[i]})</div>` : ''}
          </div>`).join('')}
        <div class="poll-total" style="margin-bottom:0.8rem;">Total votes: <strong style="color:var(--accent-green);">${total}</strong></div>
        <button type="submit" class="btn-primary" style="padding:9px 22px; font-size:0.88rem;">Cast Vote</button>
      </form>
    `;
  }
}

function castVote(e) {
  e.preventDefault();
  const sel = document.querySelector('input[name="poll-player"]:checked');
  if (!sel) { alert('Please select a player first.'); return; }
  const poll = getPollData();
  poll.votes[parseInt(sel.value)]++;
  poll.voted = true;
  savePollData(poll);
  renderPoll();
}

// ════════════════════════════════════════════════════════
// MEMBERSHIP
// ════════════════════════════════════════════════════════
function getMembers() { return loadLS('aqcc_members', []); }
function saveMembers(m) { saveLS('aqcc_members', m); }

function updateMemberCountDisplay() {
  const count = getMembers().length;
  $('member-count-display').textContent = count > 0 ? `🏏 ${count} member${count>1?'s':''} have already joined!` : '';
  const badge = $('members-count-badge');
  if (badge) badge.textContent = count;
}

$('membership-form').addEventListener('submit', e => {
  e.preventDefault();
  const name = $('mem-name').value.trim(), email = $('mem-email').value.trim();
  const phone = $('mem-phone').value.trim(), city = $('mem-city').value.trim();
  const members = getMembers();
  if (members.find(m => m.email === email)) { alert('This email is already registered!'); return; }
  members.push({ name, email, phone, city, joinedAt: Date.now() });
  saveMembers(members);
  updateMemberCountDisplay();
  $('membership-form').style.display = 'none';
  $('membership-success').classList.remove('hidden');
  if (can('members')) renderMembersTable();
});

function renderMembersTable() {
  const wrap = $('members-table-wrap');
  const members = getMembers();
  $('members-count-badge').textContent = members.length;
  if (members.length === 0) { wrap.innerHTML = '<p style="color:var(--text-muted);">No members yet.</p>'; return; }
  wrap.innerHTML = `<table class="members-table"><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Phone</th><th>City</th><th>Joined</th></tr></thead><tbody>
    ${members.map((m,i) => `<tr><td>${i+1}</td><td>${m.name}</td><td>${m.email}</td><td>${m.phone||'—'}</td><td>${m.city}</td><td>${new Date(m.joinedAt).toLocaleDateString()}</td></tr>`).join('')}
  </tbody></table>`;
}

updateMemberCountDisplay();

// ════════════════════════════════════════════════════════
// CONTESTS
// ════════════════════════════════════════════════════════
function getContests() {
  return loadLS('aqcc_contests', [{
    id:1, title:'Weekly Trivia', desc:'Test your cricket knowledge and win official merchandise!',
    question:'Who scored the most runs in the last regional tournament?', answer:'player 1', prize:'Team Jersey', createdAt: Date.now()-86400000
  }]);
}
function saveContests(c) { saveLS('aqcc_contests', c); }

function renderContests() {
  const container = $('contests-container');
  const contests = getContests();
  if (contests.length === 0) { container.innerHTML = '<p style="color:var(--text-muted);">No contests right now. Check back soon!</p>'; return; }
  container.innerHTML = contests.map(c => `
    <div class="contest-card">
      ${can('contests') ? `<button class="admin-btn delete-btn contest-delete-btn" onclick="deleteContest(${c.id})">Delete</button>` : ''}
      <div class="contest-prize">🏆 Prize: ${c.prize}</div>
      <h4>${c.title}</h4>
      <p style="margin-bottom:0.8rem;">${c.desc}</p>
      <p class="contest-question">❓ ${c.question}</p>
      <div class="contest-answer-form">
        <input type="text" id="contest-ans-${c.id}" placeholder="Your answer...">
        <button onclick="submitContestAnswer(${c.id},'${c.answer.toLowerCase().replace(/'/g,"\\'")}')">Submit</button>
      </div>
      <div class="contest-feedback" id="contest-fb-${c.id}"></div>
    </div>`).join('');
}

function submitContestAnswer(id, correct) {
  const input = $(`contest-ans-${id}`), fb = $(`contest-fb-${id}`);
  const val = input.value.trim().toLowerCase(); if (!val) return;
  fb.style.display = 'block';
  if (val === correct) {
    fb.textContent = "🎉 Correct! You're entered to win the prize. We'll contact you soon!";
    fb.className = 'contest-feedback correct';
    input.disabled = true; input.nextElementSibling.disabled = true;
  } else {
    fb.textContent = '❌ Not quite right. Try again!';
    fb.className = 'contest-feedback wrong';
    setTimeout(() => { fb.style.display = 'none'; }, 2500);
  }
}

function deleteContest(id) {
  if (!confirm('Delete this contest?')) return;
  saveContests(getContests().filter(c => c.id !== id));
  renderContests();
}

$('open-add-contest-modal-btn').addEventListener('click', () => openModal('add-contest-modal'));
$('open-add-contest-btn').addEventListener('click', () => openModal('add-contest-modal'));

$('add-contest-form').addEventListener('submit', e => {
  e.preventDefault();
  const contests = getContests();
  contests.push({ id:Date.now(), title:$('ct-title').value.trim(), desc:$('ct-desc').value.trim(), question:$('ct-question').value.trim(), answer:$('ct-answer').value.trim().toLowerCase(), prize:$('ct-prize').value.trim(), createdAt:Date.now() });
  saveContests(contests); renderContests();
  $('add-contest-form').reset(); closeModal('add-contest-modal');
});

renderContests();

// ════════════════════════════════════════════════════════
// FANTASY LEAGUE
// ════════════════════════════════════════════════════════
let fantasySelected = [];

function renderFantasyBuilder() {
  const players = getPlayers();
  $('fantasy-available').innerHTML = players.filter(p => !fantasySelected.find(s => s.id === p.id))
    .map(p => `<div class="fantasy-player-item"><div><div class="fp-name">${p.name}</div><div class="fp-role">${p.role}</div></div><button class="fp-add-btn" onclick="fantasyAdd(${p.id})" ${fantasySelected.length>=11?'disabled':''}>+ Add</button></div>`).join('') || '<p style="color:var(--text-muted); font-size:0.9rem;">All players selected.</p>';
  $('fantasy-selected').innerHTML = fantasySelected.map(p => `<div class="fantasy-player-item"><div><div class="fp-name">${p.name}</div><div class="fp-role">${p.role}</div></div><button class="fp-remove-btn" onclick="fantasyRemove(${p.id})">Remove</button></div>`).join('') || '<p style="color:var(--text-muted); font-size:0.9rem;">No players selected yet.</p>';
  $('fantasy-count').textContent = `${fantasySelected.length}/11`;
  $('fantasy-actions').style.display = fantasySelected.length === 11 ? 'block' : 'none';
}

function fantasyAdd(id) {
  if (fantasySelected.length >= 11) return;
  const p = getPlayers().find(p => p.id === id);
  if (p && !fantasySelected.find(s => s.id === id)) { fantasySelected.push(p); renderFantasyBuilder(); }
}

function fantasyRemove(id) { fantasySelected = fantasySelected.filter(p => p.id !== id); renderFantasyBuilder(); }

function submitFantasyTeam() {
  const teamName = $('fantasy-team-name').value.trim();
  if (!teamName) { alert('Please name your team first!'); return; }
  if (fantasySelected.length < 11) { alert('Select 11 players first!'); return; }
  const lb = loadLS('aqcc_fantasy', []);
  lb.push({ team: teamName, players: fantasySelected.map(p => p.name), points: Math.floor(Math.random()*200)+50, submittedAt: Date.now() });
  lb.sort((a,b) => b.points - a.points);
  saveLS('aqcc_fantasy', lb);
  alert(`🏆 Team "${teamName}" submitted! Good luck!`);
  fantasySelected = []; $('fantasy-team-name').value = '';
  renderFantasyBuilder(); renderFantasyLeaderboard();
}

function renderFantasyLeaderboard() {
  const lb = loadLS('aqcc_fantasy', []);
  $('fantasy-leaderboard').innerHTML = lb.length === 0
    ? '<p style="color:var(--text-muted);">No teams submitted yet. Be the first!</p>'
    : `<table class="fantasy-leaderboard-table"><thead><tr><th>Rank</th><th>Team</th><th>Players</th><th>Points</th></tr></thead><tbody>
        ${lb.slice(0,10).map((t,i) => `<tr><td>${['🥇','🥈','🥉'][i]||i+1}</td><td>${t.team}</td><td style="font-size:0.8rem;color:var(--text-muted);">${t.players.slice(0,3).join(', ')}${t.players.length>3?'...':''}</td><td style="color:var(--accent-gold);font-weight:700;">${t.points}</td></tr>`).join('')}
      </tbody></table>`;
}

// ════════════════════════════════════════════════════════
// COMMUNITY FORUM
// ════════════════════════════════════════════════════════
function getTopics() {
  return loadLS('aqcc_forum', [
    { id:1, title:'Match Predictions: Tigers vs AL-QAIM', author:'FanBoy99', body:"Who do you think will win? I'm backing AL-QAIM all the way!", createdAt:Date.now()-7200000, replies:[{ author:'CricketLover', body:'AL-QAIM for sure! Their bowling attack is on fire.', time:Date.now()-3600000 }] },
    { id:2, title:"Player 1's incredible form!", author:'CricketLover', body:'Has anyone noticed how well Player 1 has been batting lately? Absolute class.', createdAt:Date.now()-86400000, replies:[] }
  ]);
}
function saveTopics(t) { saveLS('aqcc_forum', t); }

function renderForumTopics() {
  const list = $('forum-topics-list'), topics = getTopics();
  if (topics.length === 0) { list.innerHTML = '<p style="color:var(--text-muted);">No discussions yet. Start the first one!</p>'; return; }
  list.innerHTML = topics.slice().reverse().map(t => `
    <div class="topic-card" onclick="openThread(${t.id})">
      <h4>${t.title}</h4>
      <div class="topic-meta"><span>👤 ${t.author}</span><span>🕐 ${timeAgo(t.createdAt)}</span><span>💬 ${t.replies.length} repl${t.replies.length===1?'y':'ies'}</span></div>
      <p class="topic-preview">${t.body}</p>
    </div>`).join('');
}

$('open-new-topic-btn').addEventListener('click', () => openModal('new-topic-modal'));

$('new-topic-form').addEventListener('submit', e => {
  e.preventDefault();
  const topics = getTopics();
  topics.push({ id:Date.now(), title:$('topic-title').value.trim(), author:$('topic-author').value.trim(), body:$('topic-body').value.trim(), createdAt:Date.now(), replies:[] });
  saveTopics(topics); renderForumTopics();
  $('new-topic-form').reset(); closeModal('new-topic-modal');
});

let currentThreadId = null;

function openThread(id) {
  currentThreadId = id;
  const topic = getTopics().find(t => t.id === id); if (!topic) return;
  $('thread-title').textContent = topic.title;
  renderThreadReplies(topic);
  openModal('thread-modal');
}

function renderThreadReplies(topic) {
  const all = [{ author:topic.author, body:topic.body, time:topic.createdAt, isOP:true }, ...topic.replies.map(r => ({...r, isOP:false}))];
  $('thread-replies').innerHTML = all.map(r => `<div class="reply-item"><div class="reply-author">${r.isOP?'📌 ':''}${r.author}${r.isOP?' (OP)':''}</div><div class="reply-time">${timeAgo(r.time)}</div><div class="reply-body">${r.body}</div></div>`).join('');
}

$('reply-form').addEventListener('submit', e => {
  e.preventDefault();
  const topics = getTopics(), topic = topics.find(t => t.id === currentThreadId); if (!topic) return;
  topic.replies.push({ author:$('reply-author').value.trim(), body:$('reply-body').value.trim(), time:Date.now() });
  saveTopics(topics); renderThreadReplies(topic); renderForumTopics();
  $('reply-form').reset();
});

renderForumTopics();

// ════════════════════════════════════════════════════════
// SHOP
// ════════════════════════════════════════════════════════
function getProducts() {
  return loadLS('aqcc_shop', [
    { id:1, name:'AL-QAIM CC Jersey', desc:'Official team jersey — breathable fabric, embroidered logo.', price:2500, cat:'jersey', img:'' },
    { id:2, name:'Club Cap', desc:'Stylish cap with AL-QAIM CC emblem.', price:800, cat:'cap', img:'' },
    { id:3, name:'Cricket Bat (Tape Ball)', desc:'Premium tape ball bat used by our squad.', price:3500, cat:'equipment', img:'' },
  ]);
}
function saveProducts(p) { saveLS('aqcc_shop', p); }

function renderShop() {
  const grid = $('shop-grid'), products = getProducts();
  const catIcons = { jersey:'👕', cap:'🧢', equipment:'🏏', accessories:'🎒' };
  if (products.length === 0) { grid.innerHTML = '<p style="color:var(--text-muted);">No products available yet.</p>'; return; }
  grid.innerHTML = products.map(p => `
    <div class="product-card">
      ${can('shop') ? `<button class="admin-btn delete-btn product-delete" onclick="deleteProduct(${p.id})">Delete</button>` : ''}
      ${p.img ? `<img src="${p.img}" alt="${p.name}">` : `<div class="product-no-img">${catIcons[p.cat]||'📦'}</div>`}
      <div class="product-info">
        <div class="product-cat">${p.cat}</div>
        <h4>${p.name}</h4>
        <div class="product-desc">${p.desc}</div>
        <div class="product-price">PKR ${p.price.toLocaleString()}</div>
        <div class="product-actions">
          <button class="buy-btn" onclick="orderProduct('${p.name}')">Order Now</button>
        </div>
      </div>
    </div>`).join('');
}

function orderProduct(name) {
  alert(`To order "${name}", please contact us:\n📞 +92-300-1234567\n📧 info@alqaimcc.com`);
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  saveProducts(getProducts().filter(p => p.id !== id));
  renderShop();
}

let productImgDataUrl = '';

$('open-add-product-btn').addEventListener('click', () => openModal('add-product-modal'));

function previewProductImg(event) {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    productImgDataUrl = e.target.result;
    $('prod-img-preview').src = productImgDataUrl;
    $('prod-img-preview').style.display = 'block';
    $('prod-img-label').textContent = '✅ ' + file.name;
  };
  reader.readAsDataURL(file);
}

$('add-product-form').addEventListener('submit', e => {
  e.preventDefault();
  const products = getProducts();
  products.push({ id:Date.now(), name:$('prod-name').value.trim(), desc:$('prod-desc').value.trim(), price:parseInt($('prod-price').value)||0, cat:$('prod-cat').value, img:productImgDataUrl });
  saveProducts(products); renderShop();
  $('add-product-form').reset();
  $('prod-img-preview').style.display = 'none';
  $('prod-img-label').textContent = t('lbl_browse_image');
  productImgDataUrl = '';
  closeModal('add-product-modal');
});

// ════════════════════════════════════════════════════════
// CONTACT
// ════════════════════════════════════════════════════════
function getMessages() { return loadLS('aqcc_messages', []); }

$('contact-form').addEventListener('submit', e => {
  e.preventDefault();
  const messages = getMessages();
  messages.push({
    name: $('contact-name').value.trim(),
    email: $('contact-email').value.trim(),
    subject: $('contact-subject').value.trim(),
    message: $('contact-message').value.trim(),
    sentAt: Date.now()
  });
  saveLS('aqcc_messages', messages);
  $('contact-form').reset();
  alert(t('contact_sent'));
  if (can('messages')) renderMessagesPanel();
});

function renderMessagesPanel() {
  const messages = getMessages();
  const badge = $('messages-count-badge'); if (badge) badge.textContent = messages.length;
  const list = $('messages-list'); if (!list) return;
  if (messages.length === 0) { list.innerHTML = '<p style="color:var(--text-muted);">No messages yet.</p>'; return; }
  list.innerHTML = `<div class="messages-list">${messages.slice().reverse().map(m => `<div class="msg-item"><div class="msg-from">${m.name} &lt;${m.email}&gt;</div><div class="msg-subject">${m.subject||'(no subject)'}</div><div class="msg-body">${m.message}</div><div style="font-size:0.75rem;color:var(--text-muted);margin-top:4px;">${new Date(m.sentAt).toLocaleString()}</div></div>`).join('')}</div>`;
}

// ════════════════════════════════════════════════════════
// INIT — run everything on load
// ════════════════════════════════════════════════════════
function initTiltCards() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.querySelectorAll('[data-tilt], .match-card, .section-card, .player-card, .live-score-card, .live-stream-card, .shop-item').forEach(card => {
    if (!card.classList.contains('tilt-card')) card.classList.add('tilt-card');
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(6px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

function initScrollReveal() {
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) en.target.classList.add('visible'); });
  }, { threshold: 0.12 });
  document.querySelectorAll('section').forEach(sec => {
    sec.classList.add('reveal-on-scroll');
    obs.observe(sec);
  });
}

function initCursorGlow() {
  const glow = $('cursor-glow');
  if (!glow || window.matchMedia('(max-width: 768px)').matches) return;
  document.body.classList.add('cursor-active');
  document.addEventListener('mousemove', (e) => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  }, { passive: true });
}

window.addEventListener('load', async () => {
  await initStaffHashes();
  await restoreStaffSession();
  renderUpcomingMatches();
  renderScorecards();
  renderEvents();
  renderPhotos();
  renderVideos();
  renderPlayers();
  renderPoll();
  renderFantasyBuilder();
  renderFantasyLeaderboard();
  renderShop();
  applyI18n();
  initTiltCards();
  initScrollReveal();
  initCursorGlow();
  bindLoginRoleChips();
  selectLoginRole('admin');
});
