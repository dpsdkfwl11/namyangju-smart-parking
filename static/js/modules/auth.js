class AuthModule {
  constructor() {
    this.isAuthenticated = false;
    this._progressTimer = null;
  }

  async init() {
    // 아이디 저장 복원
    const remember = localStorage.getItem('rememberUsername') === 'true';
    const rememberChk = document.getElementById('login-remember');
    if (rememberChk) rememberChk.checked = remember;

    // 이벤트 등록은 미리 — 로그인 화면 표시 전에도 핸들러 준비
    const loginBtn   = document.getElementById('login-btn');
    const loginInput = document.getElementById('login-password');

    if (loginBtn && loginInput) {
      loginBtn.addEventListener('click', () => this.handleLogin());
      loginInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.handleLogin();
      });
    }

    // 로그인 오버레이는 숨긴 채로 — defer 스크립트 완료 후에 표시
    const loginOverlay = document.getElementById('login-overlay');
    if (loginOverlay) loginOverlay.style.display = 'none';

    // 진행 바 시작
    this._startProgress();

    // defer 스크립트 실행 완료 시점 = DOMContentLoaded
    if (document.readyState === 'complete') {
      this._onReady();
    } else {
      document.addEventListener('DOMContentLoaded', () => this._onReady());
    }
  }

  _startProgress() {
    const bar = document.getElementById('startup-progress-bar');
    if (!bar) return;
    let pct = 0;
    this._progressTimer = setInterval(() => {
      pct = Math.min(pct + Math.random() * 7 + 3, 85);
      bar.style.width = pct + '%';
    }, 250);
  }

  _onReady() {
    if (this._progressTimer) {
      clearInterval(this._progressTimer);
      this._progressTimer = null;
    }

    const bar     = document.getElementById('startup-progress-bar');
    const startup = document.getElementById('startup-overlay');
    const login   = document.getElementById('login-overlay');
    const status  = document.getElementById('startup-status');

    if (status) status.textContent = '완료!';
    if (bar) bar.style.width = '100%';

    setTimeout(() => {
      // 시작 오버레이 페이드아웃
      if (startup) {
        startup.classList.add('hidden');
        setTimeout(() => { startup.style.display = 'none'; }, 400);
      }
      // 로그인 오버레이 페이드인
      if (login) {
        login.style.opacity = '0';
        login.style.display = '';
        // 두 번 rAF로 reflow 보장 후 transition 시작
        requestAnimationFrame(() => requestAnimationFrame(() => {
          login.style.transition = 'opacity 0.4s ease';
          login.style.opacity = '1';
        }));
        // 완전히 나타난 후 비밀번호 필드 포커스
        setTimeout(() => {
          document.getElementById('login-password')?.focus();
        }, 500);
      }
    }, 300);
  }

  async handleLogin() {
    const pw       = document.getElementById('login-password')?.value ?? '';
    const errorEl  = document.getElementById('login-error');
    const btn      = document.getElementById('login-btn');
    const remember = document.getElementById('login-remember')?.checked ?? false;

    if (!pw) {
      if (errorEl) errorEl.textContent = '비밀번호를 입력해주세요.';
      return;
    }

    try {
      if (btn) { btn.textContent = '인증 중...'; btn.disabled = true; }

      let success = false;
      if (window.electronAPI?.auth) {
        const res = await window.electronAPI.auth.verifyPassword(pw);
        success = res?.success === true;
      } else {
        // 브라우저 테스트용 fallback
        success = pw === '1234';
      }

      if (success) {
        if (remember) {
          localStorage.setItem('rememberUsername', 'true');
        } else {
          localStorage.removeItem('rememberUsername');
        }
        this.loginSuccess();
      } else {
        if (errorEl) errorEl.textContent = '비밀번호가 올바르지 않습니다.';
      }
    } catch (e) {
      console.error('Login error:', e);
      if (errorEl) errorEl.textContent = '인증 중 오류가 발생했습니다.';
    } finally {
      if (btn) { btn.textContent = '로그인'; btn.disabled = false; }
    }
  }

  loginSuccess() {
    this.isAuthenticated = true;
    const overlay = document.getElementById('login-overlay');
    if (overlay) {
      // 인라인 스타일 초기화 후 CSS .hidden 클래스로 페이드아웃
      overlay.style.opacity = '';
      overlay.style.transition = '';
      overlay.classList.add('hidden');
      setTimeout(() => { overlay.style.display = 'none'; }, 400);
    }

    setTimeout(() => {
      // 대시보드 먼저 표시 (즉시 반응)
      window.MainTabs?.show('dashboard');
      // MapApp 초기화 백그라운드 시작 (지도탭 첫 진입 전 완료 목표)
      window._initMapApp?.().then(() => {
        window.MapApp?.showToast('남양주 스마트 주정차 준비 완료', 'success');
      }).catch(e => console.error('MapApp 초기화 오류:', e));
      // 새 버전 패치노트 알림
      window.PatchNotes?.showIfNew?.();
    }, 420);
  }

  logout() {
    this.isAuthenticated = false;
    location.reload();
  }
}

window.AuthApp = new AuthModule();
// auth.js는 body 마지막에 위치 — DOM이 이미 파싱 완료 상태이므로 즉시 실행
window.AuthApp.init();
