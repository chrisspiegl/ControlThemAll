<template>
  <ion-page>
    <ion-header translucent>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-buttons slot="start">
            <ion-menu-button v-if="!pageDefaultBackLink" color="primary" />
            <ion-back-button v-if="pageDefaultBackLink" :default-href="pageDefaultBackLink" />
          </ion-buttons>
        </ion-buttons>
        <ion-title>{{ pageTitle }}</ion-title>
        <ion-buttons slot="end">
          <!-- <slot name="actions-end"></slot> -->
          <!-- <ion-searchbar placeholder="Find your Short" enterkeyhint="search"></ion-searchbar> -->
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <slot />
  </ion-page>
</template>

<script>
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonMenuButton, IonButtons, IonBackButton } from '@ionic/vue'
export default {
  name: 'BaseLayout',
  props: {
    pageTitle: {
      type: String,
      required: true,
    },
    pageDefaultBackLink: {
      type: String,
      required: false,
    },
  },
  components: {
    IonPage,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonMenuButton,
    IonButtons,
    IonBackButton,
  },
}
</script>
