<template>
  <div class="auth-wrapper">
    <div class="auth-card">
      <h2 class="title">Create Account</h2>
      <p class="subtitle">Sign up to access all features</p>

      <div class="form-group">
        <label>Username</label>
        <input type="text" v-model="form.username" placeholder="Enter username" class="auth-input" />
      </div>

      <div class="form-group">
        <label>Email</label>
        <input type="email" v-model="form.email" placeholder="Enter email" class="auth-input" />
      </div>

      <div class="form-group">
        <label>Password</label>
        <input type="password" v-model="form.password" placeholder="Enter password (min 6 chars)" class="auth-input" />
      </div>

      <div class="form-group">
        <label>Confirm Password</label>
        <input 
          type="password" 
          v-model="form.confirmPassword" 
          placeholder="Re-enter password" 
          class="auth-input" 
          @keyup.enter="handleRegister"
        />
      </div>

      <button class="auth-btn primary" @click="handleRegister" :disabled="isLoading">
        {{ isLoading ? 'Registering...' : 'Sign Up' }}
      </button>

      <div class="footer-link">
        Already have an account? <span class="link-text" @click="goToLogin">Log in</span>
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
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const isLoading = ref(false); // 加载状态防止重复提交

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
});

// Toast 状态管理
const toast = reactive({
  show: false,
  message: '',
  type: 'success'
});

const showToast = (message, type = 'success') => {
  toast.message = message;
  toast.type = type;
  toast.show = true;
  // 3秒后自动消失
  setTimeout(() => { toast.show = false; }, 3000);
};

const goToLogin = () => {
  router.push('/login');
};

const handleRegister = async () => {
  // 1. 前端基础验证
  if (!form.username || !form.email || !form.password) {
    showToast("Please fill in all fields", "error");
    return;
  }
  if (form.password.length < 6) {
    showToast("Password must be at least 6 characters", "error");
    return;
  }
  if (form.password !== form.confirmPassword) {
    showToast("Passwords do not match", "error");
    return;
  }

  isLoading.value = true;

  try {
    // 2. 发送请求给后端 (注意端口是 5001)
    const res = await axios.post('/api/auth/register', {
      username: form.username,
      email: form.email,
      password: form.password
    });

    // 3. 注册成功逻辑 (自动登录)
    const userData = res.data.user; // 获取后端返回的用户信息
    console.log("Registered & Logged in:", userData);
    
    // 存入 Session (这就代表登录成功了)
    sessionStorage.setItem('current_user', JSON.stringify(userData));

    showToast(`Welcome, ${userData.username}!`, "success");

    // 4. 延迟 0.8秒 后直接跳转到主页 (Home)
    setTimeout(() => {
      router.push('/home'); 
    }, 1000);

  } catch (err) {
    console.error(err);
    // 显示后端返回的具体错误信息 (例如 "User already exists")
    if (err.response && err.response.data && err.response.data.msg) {
      showToast(err.response.data.msg, "error");
    } else {
      showToast("Registration failed. Please try again.", "error");
    }
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* ================= 布局样式 ================= */
.auth-wrapper { 
  display: flex; justify-content: center; align-items: center; 
  height: 100vh; width: 100vw; 
  background-color: #f5f5f5; color: #333; 
  position: relative; overflow: hidden; 
}
.auth-card { 
  background: white; width: 100%; max-width: 400px; padding: 40px; 
  border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); 
  display: flex; flex-direction: column; gap: 15px; z-index: 1; 
}
.title { margin: 0; font-size: 1.5rem; font-weight: bold; }
.subtitle { margin: 0 0 5px 0; color: #666; font-size: 0.9rem; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group label { font-size: 0.9rem; font-weight: 600; color: #333; }
.auth-input { 
  background: #f0f0f0; border: 1px solid transparent; padding: 12px 15px; 
  border-radius: 8px; font-size: 1rem; outline: none; transition: all 0.2s; 
}
.auth-input:focus { background: white; border-color: #000; }
.auth-btn { 
  padding: 12px; border-radius: 8px; font-size: 1rem; font-weight: bold; 
  cursor: pointer; border: none; transition: opacity 0.2s; margin-top: 10px; 
}
.auth-btn.primary { background: #000; color: white; }
.auth-btn:hover { opacity: 0.8; }
.auth-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.footer-link { text-align: center; font-size: 0.9rem; color: #666; margin-top: 10px; }
.link-text { color: #0066cc; cursor: pointer; font-weight: 600; }
.link-text:hover { text-decoration: underline; }

/* ================= Toast 通知样式 ================= */
.toast-notification { 
  position: fixed; bottom: 30px; right: 30px; 
  background: white; padding: 16px 24px; border-radius: 12px; 
  box-shadow: 0 10px 40px rgba(0,0,0,0.1); 
  display: flex; align-items: center; gap: 15px; z-index: 1000; 
  min-width: 300px; border-left: 5px solid; 
}
/* 成功 - 绿色 */
.toast-notification.success { border-left-color: #2e7d32; }
.toast-notification.success .toast-icon { background: #e8f5e9; color: #2e7d32; }
/* 失败 - 红色 */
.toast-notification.error { border-left-color: #d32f2f; }
.toast-notification.error .toast-icon { background: #ffebee; color: #d32f2f; }

.toast-icon { 
  width: 30px; height: 30px; border-radius: 50%; 
  display: flex; align-items: center; justify-content: center; 
  font-weight: bold; font-size: 1.2rem; 
}
.toast-content { display: flex; flex-direction: column; }
.toast-title { font-weight: bold; font-size: 0.95rem; color: #333; }
.toast-message { font-size: 0.85rem; color: #666; margin-top: 2px; }

/* 动画效果 */
.slide-fade-enter-active { transition: all 0.4s ease-out; }
.slide-fade-leave-active { transition: all 0.4s cubic-bezier(1, 0.5, 0.8, 1); }
.slide-fade-enter-from, .slide-fade-leave-to { transform: translateX(50px); opacity: 0; }
</style>