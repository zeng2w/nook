<template>
  <div class="auth-wrapper">
    <div class="auth-card">
      <h2 class="title">Login</h2>
      <p class="subtitle">Log in to your personal dashboard</p>

      <div class="form-group">
        <label>Email</label>
        <input 
          type="email" 
          v-model="email" 
          placeholder="Enter email" 
          class="auth-input" 
          @keyup.enter="handleLogin"
        />
      </div>

      <div class="form-group">
        <label>Password</label>
        <input 
          type="password" 
          v-model="password" 
          placeholder="Enter password" 
          class="auth-input" 
          @keyup.enter="handleLogin"
        />
      </div>

      <button class="auth-btn primary" @click="handleLogin" :disabled="isLoading">
        {{ isLoading ? 'Logging in...' : 'Log In' }}
      </button>

      <div class="footer-link">
        No account yet? <span class="link-text" @click="goToRegister">Sign up</span>
      </div>
    </div>

    <Transition name="slide-fade">
      <div v-if="toast.show" class="toast-notification" :class="toast.type">
        <div class="toast-icon">
          <span v-if="toast.type === 'success'">✓</span>
          <span v-else>✕</span>
        </div>
        <div class="toast-content">
          <span class="toast-title">{{ toast.type === 'success' ? 'Success' : 'Error' }}</span>
          <span class="toast-message">{{ toast.message }}</span>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const email = ref('');
const password = ref('');
const isLoading = ref(false);

// Toast 状态
const toast = reactive({
  show: false,
  message: '',
  type: 'success'
});

const showToast = (message, type = 'success') => {
  toast.message = message;
  toast.type = type;
  toast.show = true;
  setTimeout(() => { toast.show = false; }, 3000);
};

const goToRegister = () => {
  router.push('/register');
};

const handleLogin = async () => {
  if (!email.value || !password.value) {
    showToast("Please enter email and password", "error");
    return;
  }

  isLoading.value = true;

  try {
    // 1. 发送登录请求
    const res = await axios.post('http://localhost:5001/api/auth/login', {
      email: email.value,
      password: password.value
    });

    // 2. 登录成功
    const userData = res.data.user;
    console.log("Login success:", userData);

    // 3. 存入 SessionStorage (这就相当于“领了门票”)
    sessionStorage.setItem('current_user', JSON.stringify(userData));

    showToast(`Welcome back, ${userData.username}!`, "success");

    // 4. 跳转到主页 (稍微延迟一点点，让用户看到欢迎语)
    setTimeout(() => {
      router.push('/home');
    }, 800);

  } catch (err) {
    console.error(err);
    if (err.response && err.response.data && err.response.data.msg) {
      showToast(err.response.data.msg, "error"); // 显示后端返回的具体错误
    } else {
      showToast("Login failed. Check your network.", "error");
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* 保持原样 */
.auth-wrapper { display: flex; justify-content: center; align-items: center; height: 100vh; width: 100vw; background-color: #f5f5f5; color: #333; position: relative; overflow: hidden; }
.auth-card { background: white; width: 100%; max-width: 400px; padding: 40px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); display: flex; flex-direction: column; gap: 20px; z-index: 1; }
.title { margin: 0; font-size: 1.5rem; font-weight: bold; }
.subtitle { margin: 0 0 10px 0; color: #666; font-size: 0.9rem; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-group label { font-size: 0.9rem; font-weight: 600; color: #333; }
.auth-input { background: #f0f0f0; border: 1px solid transparent; padding: 12px 15px; border-radius: 8px; font-size: 1rem; outline: none; transition: all 0.2s; }
.auth-input:focus { background: white; border-color: #000; }
.auth-btn { padding: 12px; border-radius: 8px; font-size: 1rem; font-weight: bold; cursor: pointer; border: none; transition: opacity 0.2s; margin-top: 10px; }
.auth-btn.primary { background: #000; color: white; }
.auth-btn:hover { opacity: 0.8; }
.auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.footer-link { text-align: center; font-size: 0.9rem; color: #666; margin-top: 10px; }
.link-text { color: #0066cc; cursor: pointer; font-weight: 600; }
.link-text:hover { text-decoration: underline; }

/* Toast */
.toast-notification { position: fixed; bottom: 30px; right: 30px; background: white; padding: 16px 24px; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); display: flex; align-items: center; gap: 15px; z-index: 1000; min-width: 300px; border-left: 5px solid; }
.toast-notification.success { border-left-color: #2e7d32; }
.toast-notification.success .toast-icon { background: #e8f5e9; color: #2e7d32; }
.toast-notification.error { border-left-color: #d32f2f; }
.toast-notification.error .toast-icon { background: #ffebee; color: #d32f2f; }
.toast-icon { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.2rem; }
.toast-content { display: flex; flex-direction: column; }
.toast-title { font-weight: bold; font-size: 0.95rem; color: #333; }
.toast-message { font-size: 0.85rem; color: #666; margin-top: 2px; }
.slide-fade-enter-active { transition: all 0.4s ease-out; }
.slide-fade-leave-active { transition: all 0.4s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateX(50px); opacity: 0; }
</style>