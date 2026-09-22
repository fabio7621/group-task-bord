<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { post } from '../api.js'
import { setSession } from '../store.js'
import { landAfterAuth } from '../session.js'

const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function submit () {
  error.value = ''
  busy.value = true
  try {
    const data = await post('/auth/login', { email: email.value, password: password.value })
    setSession(data)
    await landAfterAuth(router, route)
  } catch (e) {
    error.value = e.message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="auth">
    <form class="auth__box" @submit.prevent="submit">
      <div class="auth__logo">
        <strong>冰箱便利貼<br />任務板</strong>
        <span>家事與雜事，貼上去就有人收</span>
      </div>

      <div class="form">
        <label class="field">
          <span class="field__label">Email</span>
          <input v-model="email" type="email" required autocomplete="email" placeholder="you@example.com" />
        </label>

        <label class="field">
          <span class="field__label">密碼</span>
          <input v-model="password" type="password" required autocomplete="current-password" />
        </label>

        <p v-if="error" class="alert">{{ error }}</p>

        <button class="btn btn--primary" type="submit" :disabled="busy">
          {{ busy ? '登入中…' : '登入' }}
        </button>

        <p class="auth__switch">
          還沒有帳號？<RouterLink :to="{ name: 'register', query: route.query }">註冊</RouterLink>
        </p>
      </div>
    </form>
  </div>
</template>
