<template>
  <base-layout page-title="Dashboard">
    <ion-content fullscreen>
      <h1>Dashbaord</h1>
      <h2>{{ now }}</h2>

      <ion-list>
        <ion-item>
          <ion-label>Port:</ion-label>
          <ion-input v-model="webserverPort"></ion-input>
          <ion-button @click="checkPort" slot="end">Test Port</ion-button>
        </ion-item>
        <ion-item>
          <ion-label>Server Status:</ion-label>
          <ion-input v-model="webserverStatus"></ion-input>
          <ion-button @click="toggleServer" slot="end">Toggle Server</ion-button>
        </ion-item>
        <ion-item>
          <ion-label>API Connection:</ion-label>
          <ion-text>{{ apiConnection }}</ion-text>
        </ion-item>
        <ion-item button @click="openSystemBrowser(`http://localhost:${webserverPort}`)">
          <ion-label>Dashboard Web Address:</ion-label>
          <ion-text>http://localhost:{{webserverPort}}</ion-text>
        </ion-item>

      </ion-list>

    </ion-content>
  </base-layout>
</template>

<script>
import { IonContent, IonList, IonItem, IonLabel, IonInput, IonButton, IonText } from '@ionic/vue'
import { mapGetters, mapState } from 'vuex'
import { Command, open } from '@tauri-apps/api/shell'

import ky from 'ky-universal'

export default {
  name: 'Dashboard',
  components: {
    IonContent, IonList, IonItem, IonLabel, IonInput, IonButton, IonText
  },
  computed: {
    ...mapState('time', ['now']),
    ...mapState('tauri', ['webserverStatus', 'webserverPort'])
  },
  data() {
    return {
      apiConnection: null,
    }
  },
  async mounted() {
    setInterval(() => {
      this.testApiConnection()
    }, 1000);
  },
  methods: {
    async testApiConnection() {
      try {
        const result = await ky(`http://localhost:${this.webserverPort}`).json()
        this.apiConnection = result
      } catch (error) {
        this.apiConnection = 'error'
      }
    },
    openSystemBrowser(url) {
      return open(url)
    },
    toggleServer() {
      this.$store.dispatch('tauri/send', {
        "actions": [{
          handler: "WebserverController",
          name: (this.webserverStatus === 'stopped') ? 'start' : 'stop',
          port: this.port,
        }]
      })
    },
    checkPort() {
      this.$store.dispatch('tauri/send', {
        "actions": [{
          handler: "WebserverController",
          name: "checkPort",
          port: this.port,
        }]
      })
    }
  }
}
</script>
