import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router.js'
import './styles.css'

// pinia 要在 router 之前裝，初次導航的 beforeEach 會用到 auth store
createApp(App).use(createPinia()).use(router).mount('#app')
