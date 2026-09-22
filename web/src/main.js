import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router.js'
import { setUnauthorizedHandler } from './api.js'
import { disconnectSocket } from './socket.js'
import './styles.css'

setUnauthorizedHandler(() => {
  disconnectSocket()
  router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
})

createApp(App).use(router).mount('#app')
