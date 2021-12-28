import { createStore } from 'vuex'

import modules from './modules'

export const store = createStore({
  modules,
  // state: {},
  // mutations: {},
  // actions: {},
  // getters: {},
  // mutations: {},
  strict: true, // TODO: make this not true in production
  // plugins: [],
})

export default store
