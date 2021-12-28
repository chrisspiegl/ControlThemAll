// Inspired by: https://cushionapp.com/journal/reactive-time-with-vuejs/

export const state = {
  now: new Date(),
}

export const mutations = {
  UPDATE_TIME: (state) => {
    state.now = new Date()
  },
}

export const actions = {
  init({ commit }) {
    setInterval(() => {
      commit('UPDATE_TIME')
    }, 1000)
  },
}
