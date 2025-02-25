<!-- src/components/PersonalCalendar.vue -->
<template>
  <div :class="['personal-calendar', `theme-${calendarColor}`, { 'dark-mode': isDarkMode }]">
    <h2>{{ calendarName }}</h2>

    <!-- VueCal Calendar -->
    <vue-cal
        :key="calendarColorKey"
        ref="calendarRef"
        :class="['vuecal--custom-theme', calendarThemeClass]"
        default-view="month"
        :disable-views-transition="true"
        :events="vueCalEvents"
        style="height: 600px;"
        @view-change="handleViewChange"
        @event-click="handleEventClick"
        @cell-click="handleCellClick"
    />

    <!-- "Add Event" button -->
    <button class="btn-add-event" @click="openAddEventModal">
      + Add Event
    </button>

    <!-- MODAL: Create Event -->
    <div v-if="showAddEventModal" class="modal-backdrop" @click.self="closeAddEventModal">
      <div class="modal-content">
        <h3>Create New Event</h3>
        <form @submit.prevent="createEvent">
          <div class="form-group">
            <label for="eventTitle">Title</label>
            <input id="eventTitle" v-model="newEventTitle" required />
          </div>

          <div class="form-group">
            <label for="startTime">Start Time</label>
            <input id="startTime" type="datetime-local" v-model="newEventStart" required />
          </div>

          <div class="form-group">
            <label for="endTime">End Time</label>
            <input id="endTime" type="datetime-local" v-model="newEventEnd" required />
          </div>

          <div class="form-group">
            <label for="description">Description</label>
            <textarea id="description" v-model="newEventDescription" rows="3"></textarea>
          </div>

          <!-- Buttons section -->
          <div class="modal-buttons">
            <button type="submit" class="btn-submit">Add Event</button>
            <button type="button" class="btn-cancel" @click="closeAddEventModal">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: Event Information -->
    <div v-if="showDetailModal && selectedEvent" class="modal-backdrop" @click.self="closeDetailModal">
      <div class="modal-content">
        <h3>Event Information</h3>
        <p><strong>Title:</strong> {{ selectedEvent.title }}</p>
        <p><strong>Start:</strong> {{ selectedEvent.start }}</p>
        <p><strong>End:</strong> {{ selectedEvent.end }}</p>
        <p><strong>Description:</strong> {{ selectedEvent.description || '(No Description)' }}</p>

        <!-- Buttons Section -->
        <div class="modal-buttons">
          <button class="btn-submit" @click="openEditModal">Edit</button>
          <button class="btn-delete" @click="confirmDeleteEvent">Delete</button>
          <button class="btn-cancel" @click="closeDetailModal">Close</button>
        </div>
      </div>
    </div>

    <!-- MODAL: Edit Event -->
    <div v-if="showEditModal && selectedEvent" class="modal-backdrop" @click.self="closeEditModal">
      <div class="modal-content">
        <h3>Edit Event</h3>
        <form @submit.prevent="updateEvent">
          <div class="form-group">
            <label for="editTitle">Title</label>
            <input id="editTitle" v-model="editEventTitle" required />
          </div>

          <div class="form-group">
            <label for="editStart">Start Time</label>
            <input
                id="editStart"
                type="datetime-local"
                v-model="editEventStart"
                required
            />
          </div>

          <div class="form-group">
            <label for="editEnd">End Time</label>
            <input
                id="editEnd"
                type="datetime-local"
                v-model="editEventEnd"
                required
            />
          </div>

          <div class="form-group">
            <label for="editDescription">Description</label>
            <textarea
                id="editDescription"
                v-model="editEventDescription"
                rows="3"
            ></textarea>
          </div>

          <button type="submit" class="btn-submit">Save Changes</button>
          <button type="button" class="btn-cancel" @click="closeEditModal">Cancel</button>
        </form>
      </div>
    </div>

    <!-- Confirmation Modal for Deletion -->
    <ConfirmationModal
        :visible="showConfirmDeleteModal"
        title="Confirm Deletion"
        message="Are you sure you want to delete this event? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        @confirm="deleteEvent"
        @cancel="closeConfirmDeleteModal"
    />

    <!-- ConflictModal usage -->
    <ConflictModal
        :visible="showConflictModal"
        :message="conflictMessage"
        @close="closeConflictModal"
        @proceed="handleConflictProceed"
    >
    </ConflictModal>

    <!-- Display any error messages -->
    <div v-if="error" class="error">{{ error }}</div>
  </div>
</template>

<script>
import { mapActions } from 'vuex';
import axios from 'axios';
import VueCal from 'vue-cal';
import 'vue-cal/dist/vuecal.css';
import ConfirmationModal from '@/components/ConfirmationModal.vue';
import ConflictModal from '@/components/ConflictModal.vue';
import '@/assets/styles/styles.css';

// Adjust the path below to match where you actually placed `urlBuilder.js`
import { buildFunctionUrl } from '@/services/urlBuilder';

import calendarService from '@/services/calendarService';

export default {
  name: 'PersonalCalendar',
  components: { VueCal, ConfirmationModal, ConflictModal },
  props: {
    userId: { type: String, required: true },
    calendarId: { type: String, required: true },
    calendarName: { type: String, default: 'My Personal Calendar' },
    calendarColor: { type: String, default: 'blue' },
  },
  data() {
    return {
      showCalendar: true,
      calendarColorKey: 0,
      // VueCal events
      vueCalEvents: [],
      error: null,

      // "Add Event" modal
      showAddEventModal: false,
      newEventTitle: '',
      newEventStart: '',
      newEventEnd: '',
      newEventDescription: '',
      showConflictModal: false,
      conflictMessage: '',

      // Event Information modal
      showDetailModal: false,
      selectedEvent: null,

      // Edit Event modal
      showEditModal: false,
      editEventTitle: '',
      editEventStart: '',
      editEventEnd: '',
      editEventDescription: '',

      // Confirmation modal for event deletion
      showConfirmDeleteModal: false,
    };
  },
  mounted() {
    this.fetchEvents();
  },
  watch: {
    calendarId(newId, oldId) {
      if (newId !== oldId) {
        this.fetchEvents();
      }
    },
    calendarColor() {
      // Update VueCal theme when calendar color changes
      this.calendarColorKey++;
    },
  },
  computed: {
    calendarThemeClass() {
      return `theme-${this.calendarColor}`;
    },
    isDarkMode() {
      // If you have a global or parent darkMode variable, handle it; otherwise:
      return false;
    },
  },
  methods: {
    ...mapActions(['notify', 'fetchAllEvents']),

    // Load events from the backend
    async fetchEvents() {
      try {
        const res = await axios.get(
            buildFunctionUrl(`/calendar/${this.calendarId}/events`),
            { params: { userId: this.userId } }
        );
        const events = res.data.events || [];
        console.log('Fetched events:', events); // Debugging

        // Format for VueCal
        this.vueCalEvents = events.map((ev) => ({
          id: ev.eventId,
          title: ev.title,
          start: this.formatForVueCal(ev.startTime),
          end: this.formatForVueCal(ev.endTime),
          description: ev.description,
        }));
        console.log('Formatted vueCalEvents:', this.vueCalEvents); // Debugging
      } catch (err) {
        this.error = err?.response?.data?.error || 'Failed to load events.';
        this.notify({ type: 'error', message: this.error });
      }
    },
    async updatePersonalCalendar() {
      try {
        const updatedData = {
          name: this.updatedCalendarName,
          color: this.updatedCalendarColor,
        };
        await calendarService.editPersonalCalendar(this.calendarId, this.userId, updatedData);
        this.$emit('update-success');
        this.$store.dispatch('fetchCalendars');
        this.notify({ type: 'success', message: 'Personal calendar updated successfully.' });
      } catch (err) {
        const errorMsg = err?.response?.data?.error || 'Failed to update personal calendar.';
        this.notify({ type: 'error', message: errorMsg });
      }
    },


    // Convert ISO date to "YYYY-MM-DD HH:mm" for VueCal
    formatForVueCal(isoString) {
      if (!isoString) return '';
      const d = new Date(isoString);
      if (Number.isNaN(d.getTime())) return '';
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${day} ${hh}:${mm}`; // Reverted to space separator
    },

    // Convert Date obj to "YYYY-MM-DDTHH:mm"
    toLocalDateTime(dateObj) {
      if (!(dateObj instanceof Date)) return '';
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const mm = String(dateObj.getMinutes()).padStart(2, '0');
      return `${y}-${m}-${d}T${hh}:${mm}`;
    },

    // Show the "Add Event" modal
    openAddEventModal() {
      this.showAddEventModal = true;
      this.newEventTitle = '';
      this.newEventDescription = '';
      // Pre-fill start/end times with next hour
      const now = new Date();
      this.newEventStart = this.toLocalDateTime(now);
      now.setHours(now.getHours() + 1);
      this.newEventEnd = this.toLocalDateTime(now);
    },
    closeAddEventModal() {
      this.showAddEventModal = false;
    },

    async createEvent() {
      try {
        const payload = {
          userId: this.userId,
          title: this.newEventTitle,
          startTime: this.newEventStart,
          endTime: this.newEventEnd,
          description: this.newEventDescription,
        };
        // POST to /calendar/{this.calendarId}/event without override
        await calendarService.addEvent(this.calendarId, payload);

        // Refresh the store’s all events
        await this.fetchAllEvents();

        this.notify({ type: 'success', message: 'Event created successfully.' });
        this.closeAddEventModal();
      } catch (err) {
        if (err.response && err.response.status === 409) {
          this.conflictMessage = err.response.data.error || 'There was a conflict.';
          this.showConflictModal = true;
        } else {
          const errorMsg = err?.response?.data?.error || 'Failed to create event.';
          this.notify({
            type: 'error',
            message: `<strong>Error:</strong> ${errorMsg.replace(/\n/g, '<br>')}`
          });
        }
      }
    },
    closeConflictModal() {
      this.showConflictModal = false;
      this.conflictMessage = '';
    },

    // Single-click an event => open the Event Information modal
    handleEventClick(eventObj) {
      console.log('Clicked event =>', eventObj);
      // Save selectedEvent
      this.selectedEvent = { ...eventObj };
      // Show detail modal
      this.showDetailModal = true;
    },
    closeDetailModal() {
      this.showDetailModal = false;
      this.selectedEvent = null;
    },

    // Edit button => open the Edit Event modal
    openEditModal() {
      if (!this.selectedEvent) {
        this.notify({ type: 'error', message: 'No event selected for editing.' });
        return;
      }

      console.log('Selected Event:', this.selectedEvent); // Debugging

      this.showDetailModal = false; // Close the detail modal
      this.showEditModal = true;

      // Pre-fill edit form
      this.editEventTitle = this.selectedEvent.title;

      // Convert "YYYY-MM-DD HH:mm" => Date => local datetime
      const startDate = new Date(this.selectedEvent.start.replace(' ', 'T'));
      const endDate = new Date(this.selectedEvent.end.replace(' ', 'T'));
      this.editEventStart = this.toLocalDateTime(startDate);
      this.editEventEnd = this.toLocalDateTime(endDate);
      this.editEventDescription = this.selectedEvent.description || '';
    },
    closeEditModal() {
      this.showEditModal = false;
    },

    // Save changes (PUT update)
    async updateEvent() {
      if (!this.selectedEvent) return;

      try {
        const eventId = this.selectedEvent.id; // same as eventId
        const payload = {
          userId: this.userId,
          title: this.editEventTitle,
          startTime: this.editEventStart,
          endTime: this.editEventEnd,
          description: this.editEventDescription,
        };
        await axios.put(
            buildFunctionUrl(`/calendar/${this.calendarId}/event/${eventId}/update`),
            payload
        );
        // Or you could use calendarService.updateEvent(...) to keep it consistent

        this.fetchEvents();
        this.closeEditModal();
        this.notify({ type: 'success', message: 'Event updated successfully.' });
      } catch (err) {
        this.error = err?.response?.data?.error || 'Failed to update event.';
        this.notify({ type: 'error', message: this.error });
      }
    },

    // Delete event
    confirmDeleteEvent() {
      this.showConfirmDeleteModal = true;
    },
    closeConfirmDeleteModal() {
      this.showConfirmDeleteModal = false;
    },
    async deleteEvent() {
      if (!this.selectedEvent) return;
      try {
        const eventId = this.selectedEvent.id;
        await axios.delete(
            buildFunctionUrl(`/calendar/${this.calendarId}/event/${eventId}/delete`),
            { data: { userId: this.userId } }
        );
        // Or you could use calendarService.deleteEvent(...)

        this.fetchEvents();
        // Close detail modal if open
        this.closeDetailModal();
        // Close confirmation modal
        this.closeConfirmDeleteModal();
        this.notify({ type: 'success', message: 'Event deleted successfully.' });
      } catch (err) {
        this.error = err?.response?.data?.error || 'Failed to delete event.';
        this.notify({ type: 'error', message: this.error });
      }
    },

    // If user switches the view (month/week/day)
    handleViewChange(newView) {
      if (newView?.view) {
        this.currentView = newView.view.toLowerCase();
      }
      // Optionally close modals
      this.closeAddEventModal();
      this.closeDetailModal();
      this.closeEditModal();
      this.closeConfirmDeleteModal();
    },

    // Clicking an empty cell => create new event modal
    handleCellClick(cellInfo) {
      this.openAddEventModal();
      // Pre-fill times
      const date = cellInfo?.date || cellInfo?.start;
      if (date instanceof Date) {
        this.newEventStart = this.toLocalDateTime(date);
        const endDate = new Date(date);
        endDate.setHours(endDate.getHours() + 1);
        this.newEventEnd = this.toLocalDateTime(endDate);
      }
    },
  },
};
</script>

<style scoped>
/* Modal Backdrop Styles */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500; /* Adjust as needed */
  /* Ensures the content doesn't scroll behind the modal */
  overflow: hidden;
}

/* Modal Content Container */
.modal-content {
  background-color: #fff;
  /* Control how wide the modal can go on large screens */
  width: 500px;
  max-width: 95%; /* For smaller screens, let it scale down */
  max-height: 90vh; /* Keep the modal from growing taller than the viewport */
  overflow-y: auto; /* Scroll inside the modal if content is too tall */
  border-radius: 8px;
  padding: 20px;
  box-sizing: border-box;
}

/* Consistent spacing inside form inputs */
.modal-content form .form-group {
  margin-bottom: 16px;
}

.modal-content form .form-group label {
  font-weight: 600;
  margin-bottom: 4px;
  display: inline-block;
}

/* Buttons */
.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 15px;
}

.btn-submit {
  background-color: #0078d4; /* Primary color */
  color: #fff;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-submit:hover:enabled {
  background-color: #005c9c;
}

.btn-submit:disabled {
  background-color: #a0c4e3;
  cursor: not-allowed;
}

.btn-cancel {
  background-color: #6c757d; /* Gray */
  color: #fff;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-cancel:hover:enabled {
  background-color: #5a6268;
}

.btn-cancel:disabled {
  background-color: #b3b3b3;
  cursor: not-allowed;
}

/* "Add Event" Button Styling */
.btn-add-event {
  margin-top: 10px;
  background-color: var(--primary-color);
  color: #fff;
  font-size: 1rem;
  padding: 10px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.btn-add-event:hover {
  background-color: var(--event-hover-color);
}

/* Spinner Styles */
.spinner {
  border: 3px solid #f3f3f3; /* Light gray */
  border-top: 3px solid #0078d4; /* Primary color */
  border-radius: 50%;
  width: 16px;
  height: 16px;
  animation: spin 1s linear infinite;
  display: inline-block;
  vertical-align: middle;
  margin-right: 5px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Loading Indicator Alignment */
.loading-indicator {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  color: var(--primary-color);
}

.loading-indicator span {
  display: flex;
  align-items: center;
}

/* Error Message Styling */
.error {
  margin-top: 20px;
  padding: 10px 15px;
  background-color: #f8d7da;
  color: #721c24;
  border-left: 4px solid #f5c6cb;
  border-radius: 4px;
}
</style>
