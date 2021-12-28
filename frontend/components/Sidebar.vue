<template>
  <ion-menu content-id="ion-router-outlet-content" type="overlay">
    <ion-content>
      <ion-list id="inbox-list">
        <ion-list-header>
          <ion-label>🦊 ControlThemAll {{ inTauri ? '♉️' : '🕸' }}</ion-label>
        </ion-list-header>
        <ion-note>Support at: <a href="mailto:chris@foxi.link?subject=Foxi.Link Support Needed" target="_blank">chris@chrisspiegl.com</a></ion-note>

        <ion-menu-toggle auto-hide="false" v-for="(p, i) in appPages" :key="i">
          <ion-item @click="selectedIndex = i" router-direction="root" :router-link="p.url" button lines="none" detail="false" class="hydrated" :class="{ selected: selectedIndex === i }">
            <ion-icon slot="start" :ios="p.iosIcon" :md="p.mdIcon"></ion-icon>
            <ion-label>{{ p.title }}</ion-label>
            <ion-button v-if="p.url === '/shorts'" slot="end" @click="$event.stopPropagation()">+ Short</ion-button>
          </ion-item>
        </ion-menu-toggle>
      </ion-list>

      <ion-footer>
        <ion-list>
          <ion-menu-toggle auto-hide="false">
            <!-- <ion-item @click="logout" button lines="none" detail="false" class="hydrated">
              <ion-icon slot="start" :ios="logOutOutline" :md="logOutSharp"></ion-icon>
              <ion-label>Logout</ion-label>
            </ion-item> -->
            <ion-item>
              <ion-label>Made with 🦊 by <a href="https://ChrisSpiegl.com" target="_blank">Chris Spiegl</a></ion-label>
            </ion-item>
            <!-- <ion-item v-if="developerMode" lines="none" detail="false" class="hydrated"> -->
            <!-- <ion-icon slot="start" :ios="settingsOutline" :md="settingsSharp"></ion-icon> -->
            <!-- <ion-label color="danger">Developer Mode: activated</ion-label> -->
            <!-- </ion-item> -->
          </ion-menu-toggle>
        </ion-list>
      </ion-footer>
    </ion-content>
  </ion-menu>
</template>

<script>
import { IonFooter, IonContent, IonIcon, IonItem, IonLabel, IonList, IonListHeader, IonMenu, IonMenuToggle, IonNote, IonBadge, IonButton } from '@ionic/vue'
import { archiveOutline, archiveSharp, linkOutline, linkSharp, barChartOutline, barChartSharp, bookmarkOutline, bookmarkSharp, cogOutline, cogSharp, logOutOutline, logOutSharp, helpCircleOutline, helpCircleSharp, heartOutline, heartSharp, mailOutline, mailSharp, paperPlaneOutline, paperPlaneSharp, trashOutline, trashSharp, warningOutline, warningSharp, settingsOutline, settingsSharp } from 'ionicons/icons'
import { defineComponent, ref } from 'vue'
import { useRoute } from 'vue-router'

export default defineComponent({
  name: 'Sidebar',
  components: {
    IonFooter,
    IonContent,
    IonIcon,
    IonItem,
    IonLabel,
    IonList,
    IonBadge,
    IonListHeader,
    IonMenu,
    IonMenuToggle,
    IonNote,
    IonButton,
  },
  computed: {},
  data() {
    const selectedIndex = ref(0)
    const appPages = [
      {
        title: 'Dashboard',
        url: '/dashboard',
        iosIcon: barChartOutline,
        mdIcon: barChartSharp,
      },
      {
        title: 'Help & Support',
        url: '/help',
        iosIcon: helpCircleOutline,
        mdIcon: helpCircleSharp,
      },
      {
        title: 'Settings',
        url: '/settings',
        iosIcon: cogOutline,
        mdIcon: cogSharp,
      },
    ]
    const path = window.location.pathname.split('folder/')[1]
    if (path !== undefined) {
      selectedIndex.value = appPages.findIndex((page) => page.title.toLowerCase() === path.toLowerCase())
    }
    return {
      inTauri: false,
      archiveOutline,
      archiveSharp,
      bookmarkOutline,
      bookmarkSharp,
      heartOutline,
      heartSharp,
      mailOutline,
      mailSharp,
      paperPlaneOutline,
      paperPlaneSharp,
      trashOutline,
      trashSharp,
      warningOutline,
      warningSharp,
      settingsOutline,
      settingsSharp,
      helpCircleOutline,
      helpCircleSharp,
      logOutOutline,
      logOutSharp,
      cogOutline,
      cogSharp,
      barChartOutline,
      barChartSharp,
      linkOutline,
      linkSharp,
      appPages,
      selectedIndex,
      route: useRoute(),
    }
  },
  mounted() {
    this.checkInTauri()
  },
  methods: {
    isSelected(url) {
      return url === this.route.path ? 'selected' : ''
    },
    checkInTauri() {
      // TODO: move into appState somewhere in the store
      this.inTauri = !!window.__TAURI__
    },
  },
})
</script>

<style lang="scss" scoped>
ion-menu {
}

ion-menu ion-content {
  --background: var(--ion-item-background, var(--ion-background-color, #fff));
}

ion-menu.md ion-content {
  --padding-start: 8px;
  --padding-end: 8px;
  --padding-top: 0;
  --padding-bottom: 20px;
}

ion-menu.md ion-list {
  padding: 0px 0;
}

ion-menu.md ion-note {
  margin-bottom: 30px;
}

ion-menu.md ion-list-header,
ion-menu.md ion-note {
  padding-left: 10px;
}

ion-menu.md ion-list#inbox-list {
  border-bottom: 1px solid var(--ion-color-step-150, #d7d8da);
}

ion-menu.md ion-list#inbox-list ion-list-header {
  font-size: 22px;
  font-weight: 600;

  min-height: 20px;
}

ion-menu.md ion-list#labels-list ion-list-header {
  font-size: 16px;

  margin-bottom: 18px;

  color: #757575;

  min-height: 26px;
}

ion-menu.md ion-item {
  --padding-start: 10px;
  --padding-end: 10px;
  border-radius: 4px;
}

ion-menu.md ion-item.selected {
  --background: rgba(var(--ion-color-primary-rgb), 0.14);
}

ion-menu.md ion-item.selected ion-icon {
  color: var(--ion-color-primary);
}

ion-menu.md ion-item ion-icon {
  color: #616e7e;
}

ion-menu.md ion-item ion-label {
  font-weight: 500;
}

ion-menu.ios ion-content {
  --padding-bottom: 20px;
}

ion-menu.ios ion-list {
  padding: 20px 0 0 0;
}

ion-menu.ios ion-note {
  line-height: 24px;
  margin-bottom: 20px;
}

ion-menu.ios ion-item {
  --padding-start: 16px;
  --padding-end: 16px;
  --min-height: 50px;
}

ion-menu.ios ion-item.selected ion-icon {
  color: var(--ion-color-primary);
}

ion-menu.ios ion-item ion-icon {
  font-size: 24px;
  color: #73849a;
}

ion-menu.ios ion-list#labels-list ion-list-header {
  margin-bottom: 8px;
}

ion-menu.ios ion-list-header,
ion-menu.ios ion-note {
  padding-left: 16px;
  padding-right: 16px;
}

ion-menu.ios ion-note {
  margin-bottom: 8px;
}

ion-note {
  display: inline-block;
  font-size: 16px;

  color: var(--ion-color-medium-shade);
}

ion-item.selected {
  --color: var(--ion-color-primary);
}
</style>
