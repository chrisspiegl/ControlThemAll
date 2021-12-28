import { listen, emit } from '@tauri-apps/api/event'
// import { invoke } from '@tauri-apps/api/tauri'
// import { Command } from '@tauri-apps/api/shell'

export const state = {
  eventListenerBackend: null,
  webserverStatus: 'stopped',
  webserverPort: 3333,
}

export const getters = {}

export const mutations = {
  SET_EVENT_LISTENER_BACKEND(state, listener) {
    state.eventListenerBackend = listener
  },
  SET_WEBSERVER_STATUS(state, status) {
    state.webserverStatus = status
  },
  SET_WEBSERVER_PORT(state, port) {
    state.webserverPort = port
  },
}

export const actions = {
  async init({ commit, dispatch }) {
    const onMessage = (event) => {
      try {
        const payload = JSON.parse(event.payload)
        console.log('tauri json:', payload)
        const handlerName = `${payload.handler}:${payload.name}`
        switch (handlerName) {
          case 'WebserverController:started':
            commit('SET_WEBSERVER_STATUS', 'started')
            commit('SET_WEBSERVER_PORT', payload.data.port)
            break
          case 'WebserverController:stopped':
            commit('SET_WEBSERVER_STATUS', 'stopped')
            break

          default:
            break
        }
      } catch (error) {
        console.log('tauri std:', event.payload)
      }
    }
    commit('SET_EVENT_LISTENER_BACKEND', await listen('backend-event', onMessage))
    dispatch('send', {
      actions: [
        {
          handler: 'WebserverController',
          name: 'status',
        },
      ],
    })
  },

  send({ commit }, params) {
    emit('frontend-event', JSON.stringify(params))

  }
}
