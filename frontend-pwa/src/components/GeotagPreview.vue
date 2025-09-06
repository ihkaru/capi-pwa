<template>
  <div class="geotag-container">
    <div v-if="isOnline && location" ref="mapPreviewContainer" class="map-preview"></div>
    <div v-if="!isOnline && location" class="offline-placeholder">
      <p>Pratinjau peta tidak tersedia saat offline.</p>
    </div>

    <div v-if="location" class="location-details">
      <p>
        <strong>Koordinat:</strong> {{ location.latitude.toFixed(5) }}, {{ location.longitude.toFixed(5) }}<br>
        <strong>Akurasi:</strong> {{ location.accuracy.toFixed(2) }} meter
      </p>
      <div class="actions">
        <f7-button small fill icon-f7="map_pin_ellipse" @click="openPinpointModal">Pinpoint Manual</f7-button>
        <f7-button small external :href="directionsUrl" target="_blank" icon-f7="car_fill">&nbsp Arahkan</f7-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch, computed, nextTick, onMounted } from 'vue';
import { f7 } from 'framework7-vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- Props & Emits ---
const props = defineProps<{
  location: { latitude: number; longitude: number; accuracy: number; } | null
}>();

const emit = defineEmits(['update:location']);

// --- State ---
const isOnline = ref(navigator.onLine);
const mapPreviewContainer = ref<HTMLElement | null>(null);
let mapPreviewInstance: L.Map | null = null;
let pinpointPopup: any = null;
let previewMarker: L.Marker | null = null;

// --- Computed ---
const directionsUrl = computed(() => {
  if (!props.location) return '#';
  return `https://www.google.com/maps/dir/?api=1&destination=${props.location.latitude},${props.location.longitude}`;
});

// --- Watcher for Map Logic ---
watch(() => [props.location, isOnline.value], () => {
  if (props.location && isOnline.value) {
    nextTick(() => {
      if (mapPreviewContainer.value) {
        const latLng = L.latLng(props.location.latitude, props.location.longitude);
        if (!mapPreviewInstance) {
          // Create map
          mapPreviewInstance = L.map(mapPreviewContainer.value, {
            zoomControl: false,
            scrollWheelZoom: false,
            dragging: false,
            doubleClickZoom: false,
          }).setView(latLng, 16);

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(mapPreviewInstance);

          previewMarker = L.marker(latLng).addTo(mapPreviewInstance);
        } else {
          // Update existing map
          mapPreviewInstance.setView(latLng);
          if (previewMarker) {
            previewMarker.setLatLng(latLng);
          }
        }
      }
    });
  }
}, { immediate: true, deep: true });

// --- Methods ---
const openPinpointModal = () => {
  if (!props.location) return;

  const initialLatLng = L.latLng(props.location.latitude, props.location.longitude);

  pinpointPopup = f7.popup.create({
    content: `
      <div class="popup">
        <div class="page">
          <div class="navbar">
            <div class="navbar-bg"></div>
            <div class="navbar-inner">
              <div class="title">Geser Pin untuk Memperbaiki Lokasi</div>
              <div class="right"><a href="#" class="link popup-close">Batal</a></div>
            </div>
          </div>
          <div class="page-content" id="pinpoint-map-container" style="padding-top: 0;"></div>
           <div class="toolbar toolbar-bottom-md">
            <div class="toolbar-inner">
                <a href="#" class="link" id="save-pinpoint-button">Simpan Lokasi Pilihan</a>
            </div>
          </div>
        </div>
      </div>
    `,
    on: {
      opened(popup) {
        const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        });
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
        });

        const map = L.map('pinpoint-map-container').setView(initialLatLng, 17);
        streetLayer.addTo(map);

        const baseMaps = {
          "Street": streetLayer,
          "Satellite": satelliteLayer
        };
        L.control.layers(baseMaps).addTo(map);

        const marker = L.marker(initialLatLng, { draggable: true }).addTo(map);

        popup.$el.find('#save-pinpoint-button').on('click', () => {
          const newLatLng = marker.getLatLng();
          emit('update:location', {
            latitude: newLatLng.lat,
            longitude: newLatLng.lng,
            accuracy: 0, // Accuracy is 0 because it's a manual pinpoint
            timestamp: new Date().toISOString(),
          });
          popup.close();
        });
      },
    }
  });

  pinpointPopup.open();
};

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine;
};

// --- Lifecycle ---
onMounted(() => {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
  if (mapPreviewInstance) {
    mapPreviewInstance.remove();
  }
  if (pinpointPopup) {
    pinpointPopup.destroy();
  }
});

</script>

<style scoped>
.geotag-container {
  padding: 8px 16px;
}

.map-preview {
  height: 150px;
  width: 100%;
  border-radius: 8px;
  border: 1px solid #ccc;
}

.offline-placeholder {
  height: 150px;
  width: 100%;
  border-radius: 8px;
  border: 1px dashed #ccc;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #666;
  background-color: #f9f9f9;
}

.location-details {
  padding-top: 8px;
}

.location-details p {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #333;
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
