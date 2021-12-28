<template>
  <ion-app>
    <ion-split-pane content-id="ion-router-outlet-content">
      <Sidebar />
      <ion-router-outlet id="ion-router-outlet-content"></ion-router-outlet>
    </ion-split-pane>
  </ion-app>
</template>

<script>
import { IonApp, IonRouterOutlet, IonSplitPane } from '@ionic/vue'
import { defineComponent } from 'vue'
import { mapGetters, mapState } from 'vuex'

const windows = navigator.userAgent.includes('Windows')
let cmd = windows ? 'cmd' : 'sh'

import Sidebar from './components/Sidebar.vue'

export default defineComponent({
  name: 'App',
  components: {
    IonApp,
    IonRouterOutlet,
    IonSplitPane,
    Sidebar,
  },
  data() {
    return {}
  },
  computed: {
    ...mapState(['route']),
  },
  watch: {
    route(state) {
      console.log('route changed', state)
    },
    userCurrent(state) {},
  },
  async mounted() {
    console.log('mounted app')
  },
  methods: {},
})
</script>
