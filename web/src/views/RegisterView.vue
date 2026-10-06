<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth.js'

const route = useRoute()
const auth = useAuthStore()

const form = ref({ email: '', password: '', confirmPassword: '', displayName: '' })
const error = ref('')
const fieldError = ref('')
const busy = ref(false)

async function submit () {
  error.value = ''
  fieldError.value = ''

  if (form.value.password !== form.value.confirmPassword) {
    fieldError.value = '兩次輸入的密碼不一致'
    return
  }

  busy.value = true
  try {
    await auth.register(form.value)
    await auth.landAfterAuth(route.query.redirect)
  } catch (apiError) {
    if (apiError.code === 'EMAIL_TAKEN') fieldError.value = apiError.message
    else error.value = apiError.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="auth">
    <form class="auth__box" @submit.prevent="submit">
      <h3 style="font-size: 24px; font-weight: 900; margin-bottom: 18px">建立帳號</h3>

      <div class="form">
        <label class="field">
          <span class="field__label">Email</span>
          <input v-model="form.email" type="email" required autocomplete="email" />
          <span v-if="fieldError" class="hint hint--error">{{ fieldError }}</span>
        </label>

        <label class="field">
          <span class="field__label">密碼</span>
          <input v-model="form.password" type="password" required minlength="8" autocomplete="new-password" />
          <span class="hint">至少 8 碼</span>
        </label>

        <label class="field">
          <span class="field__label">確認密碼</span>
          <input v-model="form.confirmPassword" type="password" required autocomplete="new-password" />
        </label>

        <label class="field">
          <span class="field__label">顯示名稱</span>
          <input v-model="form.displayName" type="text" required maxlength="20" />
          <span class="hint">1～20 字</span>
        </label>

        <p v-if="error" class="alert">{{ error }}</p>

        <button class="btn btn--primary" type="submit" :disabled="busy">
          {{ busy ? '註冊中…' : '註冊' }}
        </button>

        <p class="auth__switch">
          已有帳號？<RouterLink :to="{ name: 'login', query: route.query }">登入</RouterLink>
        </p>
      </div>
    </form>
  </div>
</template>
