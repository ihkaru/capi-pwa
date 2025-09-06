// Import Vue
import { createApp } from 'vue';

// Import Framework7
import Framework7 from 'framework7/lite-bundle';

// Import Framework7-Vue Plugin
import Framework7Vue, { registerComponents } from 'framework7-vue/bundle';

// Import Framework7 Styles
import 'framework7/css/bundle';

// Import Framework7 Icons
import 'framework7-icons/css/framework7-icons.css';


// Import Icons and App Custom Styles
import '../css/icons.css';
import '../css/app.scss';

// Import App Component
import App from '../components/app.vue';

// Import Pinia
import pinia from './pinia';

// Import Stores and Services
import { useAuthStore } from './stores/authStore';
import apiClient from './services/ApiClient';
import syncEngine from './services/sync/SyncEngine';

// Import Capacitor PWA Elements
import { defineCustomElements } from '@ionic/pwa-elements/loader';

// Init F7-Vue Plugin
Framework7.use(Framework7Vue);

// Create Vue App
const app = createApp(App);

// Use Pinia
app.use(pinia);

// Register all F7 components
registerComponents(app);

// Initialize Capacitor PWA Elements
defineCustomElements(window);

// Check auth status on app start
const authStore = useAuthStore();
authStore.checkAuth();

// Initialize ApiClient interceptors
apiClient.initialize();

// Start the SyncEngine
syncEngine.startSync();

// Mount the app
app.mount('#app');

// PWA Service Worker registration
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register('/service-worker.js')
    .then((registration) => {
      console.log('Service Worker registered with scope:', registration.scope);
    })
    .catch((error) => {
      console.error('Service Worker registration failed:', error);
    });
}
