<template>
  <base-layout page-title="Settings">
    <ion-content fullscreen>
      <ion-list>
        <ion-list-header>
          <ion-title>Midi</ion-title>
        </ion-list-header>
        <ion-item>
          <ion-label position="floating">Input Device Name</ion-label>
          <ion-input></ion-input>
        </ion-item>
        <ion-item>
          <ion-label position="floating">Output Device Name</ion-label>
          <ion-input></ion-input>
        </ion-item>
        <ion-item>
          <ion-label position="floating" type="number">Output Channel</ion-label>
          <ion-input></ion-input>
        </ion-item>
        <ion-list-header>
          <ion-title>Webserver</ion-title>
        </ion-list-header>
        <ion-item>
          <ion-label position="floating">Address:</ion-label>
          <ion-input v-model="webServerAddress" required></ion-input>
        </ion-item>
        <ion-item>
          <ion-label position="floating">Port:</ion-label>
          <ion-input v-model="webServerPort" required></ion-input>
        </ion-item>
      </ion-list>
    </ion-content>
  </base-layout>
</template>

<script>
import { IonContent, IonList, IonListHeader, IonTitle, IonItem, IonLabel, IonInput } from '@ionic/vue'

export default {
  name: 'Settings',
  components: {
    IonContent,
    IonList,
    IonListHeader,
    IonTitle,
    IonItem,
    IonLabel,
    IonInput,
  },
  data() {
    return {
      webServerAddress: '127.0.0.1',
      webServerPort: 3000,
    }
  },
}
</script>
