// src/store/index.js

import { createStore } from 'vuex';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { buildFunctionUrl } from '@/services/urlBuilder'; // <-- use our helper
import calendarService from '@/services/calendarService';

export default createStore({
    state: {
        userId: localStorage.getItem('userId') || '',
        defaultCalendarId: localStorage.getItem('defaultCalendarId') || '',
        userDoc: {},
        notifications: [],
        calendars: [],
        activeCalendarId: localStorage.getItem('activeCalendarId') || '',
        allEvents: [],
    },
    mutations: {
        SET_USER_ID(state, userId) {
            state.userId = userId;
        },
        SET_DEFAULT_CALENDAR_ID(state, calendarId) {
            state.defaultCalendarId = calendarId;
        },
        SET_ACTIVE_CALENDAR_ID(state, calendarId) {
            state.activeCalendarId = calendarId;
            localStorage.setItem('activeCalendarId', calendarId);
        },
        SET_USER_DOC(state, userDoc) {
            state.userDoc = userDoc;
        },
        CLEAR_AUTH(state) {
            state.userId = '';
            state.defaultCalendarId = '';
            state.activeCalendarId = '';
            state.calendars = [];
            state.allEvents = [];
            state.userDoc = {};
            localStorage.removeItem('activeCalendarId');
        },
        ADD_NOTIFICATION(state, notification) {
            state.notifications.push(notification);
        },
        REMOVE_NOTIFICATION(state, notificationId) {
            state.notifications = state.notifications.filter((n) => n.id !== notificationId);
        },
        SET_CALENDARS(state, calendars) {
            state.calendars = calendars;
        },
        SET_ALL_EVENTS(state, events) {
            state.allEvents = events;
        },
    },
    actions: {
        async login({ commit, dispatch }, credentials) {
            try {
                // Replaces: axios.post(`${BACKEND_ENDPOINT}/login`, credentials)
                const response = await axios.post(buildFunctionUrl('/login'), credentials);
                const { userId, default_calendar_id } = response.data;

                commit('SET_USER_ID', userId);
                commit('SET_DEFAULT_CALENDAR_ID', default_calendar_id);
                commit('SET_ACTIVE_CALENDAR_ID', default_calendar_id);
                localStorage.setItem('userId', userId);
                localStorage.setItem('defaultCalendarId', default_calendar_id);
                commit('SET_USER_ID', userId);
                await dispatch('fetchUserDoc');

                // fetch calendars
                dispatch('fetchCalendars');
                dispatch('notify', { type: 'success', message: 'Logged in successfully.' });
            } catch (error) {
                dispatch('notify', { type: 'error', message: error?.response?.data?.error || 'Login failed.' });
                throw error;
            }
        },

        async fetchUserDoc({ commit, state }) {
            try {
                // Suppose your backend has GET /user/{userId}/profile
                // that returns { username, email, etc. }
                const response = await axios.get(
                    buildFunctionUrl(`/user/${state.userId}/profile`)
                );
                // Then store it in Vuex
                commit('SET_USER_DOC', response.data);
            } catch (err) {
                console.error('Failed to fetch user doc:', err);
                // optionally show a notification
            }
        },

        async register({ commit, dispatch }, credentials) {
            try {
                const response = await axios.post(buildFunctionUrl('/register'), credentials);
                const { userId, homeCalendarId } = response.data;

                commit('SET_USER_ID', userId);
                commit('SET_DEFAULT_CALENDAR_ID', homeCalendarId);
                commit('SET_ACTIVE_CALENDAR_ID', homeCalendarId);
                localStorage.setItem('userId', userId);
                localStorage.setItem('defaultCalendarId', homeCalendarId);
                localStorage.setItem('activeCalendarId', homeCalendarId);

                dispatch('fetchCalendars');
                dispatch('notify', { type: 'success', message: 'Registered successfully.' });
            } catch (error) {
                dispatch('notify', {
                    type: 'error',
                    message: error?.response?.data?.error || 'Registration failed.',
                });
                throw error;
            }
        },

        logout({ commit, dispatch }) {
            commit('CLEAR_AUTH');
            localStorage.removeItem('userId');
            localStorage.removeItem('defaultCalendarId');
            dispatch('notify', { type: 'info', message: 'Logged out successfully.' });
        },

        notify({ commit }, { type, message, duration = 4000 }) {
            const id = uuidv4();
            commit('ADD_NOTIFICATION', { id, type, message });
            setTimeout(() => {
                commit('REMOVE_NOTIFICATION', id);
            }, duration);
        },

        async fetchCalendars({ commit, state, dispatch }) {
            try {
                const response = await calendarService.getUserCalendars(state.userId);
                const calendars = response.data.calendars || [];
                commit('SET_CALENDARS', calendars);
                // Also fetch all events
                await dispatch('fetchAllEvents');
            } catch (error) {
                dispatch('notify', { type: 'error', message: 'Failed to fetch calendars.' });
            }
        },

        async fetchAllEvents({ commit, state, dispatch }) {
            try {
                const response = await calendarService.getAllEvents(state.userId);
                const events = response.data.events || [];
                commit('SET_ALL_EVENTS', events);
            } catch (error) {
                dispatch('notify', { type: 'error', message: 'Failed to fetch all events.' });
            }
        },
    },
    getters: {
        isAuthenticated: (state) => !!state.userId,
        userId: (state) => state.userId,
        defaultCalendarId: (state) => state.defaultCalendarId,
        notifications: (state) => state.notifications,
        calendars: (state) => state.calendars,
        activeCalendarId: (state) => state.activeCalendarId,
        currentUsername: (state) => state.userDoc.username || '',
        currentEmail: (state) => state.userDoc.email || '',
        activeCalendar: (state) =>
            state.calendars.find((cal) => cal.calendarId === state.activeCalendarId),
        activeCalendarColor: (state, getters) => {
            const activeCal = getters.activeCalendar;
            return activeCal ? activeCal.color : 'blue';
        },
        allEvents: (state) => state.allEvents,
    },
});
