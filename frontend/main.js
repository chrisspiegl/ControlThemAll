import dispatchActionForAllModules from '@/utils/dispatch-action-for-all-modules'
import BaseLayout from '@/components/base/BaseLayout.vue'

import store from '@/store'
import router from '@/router'

import App from '@/App.vue'

import { createApp } from 'vue'
import { IonicVue } from '@ionic/vue'
import { sync } from 'vuex-router-sync'

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css'

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'

/* Theme variables */
import '@/theme/variables.css'
import '@/theme/global.scss'

sync(store, router, { moduleName: 'route' })

const app = createApp(App)

app.use(router)
app.use(store)

app.use(IonicVue)

app.component('base-layout', BaseLayout)

router
  .isReady()
  .then(() => {
    // Automatically run the `init` action for every module, if one exists.
    dispatchActionForAllModules('init')
    app.mount('#app')
  })
  .catch((error) => {
    console.log('router.isReady catch', error)
  })
