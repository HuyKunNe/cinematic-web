import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'

import App from './App.vue'
import router from './router'
import { getAccessToken, refreshAuthSession } from './features/auth'
import { configureApiAuthSession } from './services/http/auth-session'
import { useAuthStore } from './stores/auth.store'
import './styles/main.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

// Nối phiên OIDC trước khi router và các page bắt đầu gọi API.
configureApiAuthSession({
  getAccessToken,

  refreshAccessToken: refreshAuthSession,

  onReauthenticationRequired() {
    useAuthStore(pinia).clearAuthorizationContext()

    window.dispatchEvent(new Event('cinematic:authentication-required'))
  },
})

app.use(VueQueryPlugin)
app.use(router)

app.mount('#app')
