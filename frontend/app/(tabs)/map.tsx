import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Modal,
  InteractionManager,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  fetchJsonWithBackend,
  getDeviceId,
  isBackendConfigured,
  listMapLocationsLocally,
  MapLocation,
} from '@/lib/appSupport';

const SATELLITE_MAP_HTML = `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <link
      rel="stylesheet"
      href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
      crossorigin=""
    />
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; background: #0F2026; }
      .location-marker {
        display: flex;
        width: 28px;
        height: 28px;
        align-items: center;
        justify-content: center;
        border: 2px solid #F5FAF8;
        border-radius: 50%;
        color: #F5FAF8;
        font: bold 12px sans-serif;
        box-shadow: 0 1px 5px rgba(0, 0, 0, .7);
      }
      .focused-marker {
        display: flex;
        width: 36px;
        height: 36px;
        align-items: center;
        justify-content: center;
        border: 3px solid #FFFFFF;
        border-radius: 50%;
        background: #E85D3F;
        color: #FFFFFF;
        font: bold 18px sans-serif;
        box-shadow: 0 1px 8px rgba(0, 0, 0, .9);
      }
      .leaflet-popup-content-wrapper, .leaflet-popup-tip { background: #1B3038; color: #F5FAF8; }
      .leaflet-control-attribution { font-size: 9px; }
      #map-error {
        display: none;
        position: absolute;
        z-index: 1000;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        padding: 6px 10px;
        border-radius: 6px;
        background: rgba(11, 20, 24, .9);
        color: #F5FAF8;
        font: 12px sans-serif;
        white-space: nowrap;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <div id="map-error">Satellite imagery is unavailable. Check your internet connection.</div>
    <script>
      window.addEventListener('error', () => {
        const error = document.getElementById('map-error');
        if (error) error.style.display = 'block';
      });
    </script>
    <script
      src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
      integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
      crossorigin=""
    ></script>
    <script>
      const map = L.map('map', { zoomControl: false }).setView([39.8283, -98.5795], 4);
      const tileLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
        }
      ).addTo(map);
      const markers = L.layerGroup().addTo(map);
      tileLayer.on('tileerror', () => {
        document.getElementById('map-error').style.display = 'block';
      });
      tileLayer.on('tileload', () => {
        document.getElementById('map-error').style.display = 'none';
      });

      window.updateSatelliteMap = ({ center, zoom, locations, userLocation, focusedJump }) => {
        map.setView(center, zoom);
        markers.clearLayers();

        locations.forEach((location, index) => {
          if (focusedJump && focusedJump.id === location.id) return;
          const color = location.is_shared ? '#8BD6A7' : '#A6D608';
          const icon = L.divIcon({
            className: '',
            html: '<div class="location-marker" style="background:' + color + '">' + (index + 1) + '</div>',
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          const marker = L.marker([location.latitude, location.longitude], { icon }).addTo(markers);
          const popup = document.createElement('span');
          popup.textContent = location.name;
          marker.bindPopup(popup);
          marker.on('click', () => {
            window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'select', id: location.id }));
          });
        });

        if (focusedJump) {
          const icon = L.divIcon({
            className: '',
            html: '<div class="focused-marker"><span aria-hidden="true">★</span></div>',
            iconSize: [42, 42],
            iconAnchor: [21, 21]
          });
          const focusedMarker = L.marker(
            [focusedJump.latitude, focusedJump.longitude],
            { icon, zIndexOffset: 1000 }
          ).addTo(markers);
          const popup = document.createElement('span');
          popup.textContent = focusedJump.name;
          focusedMarker.bindPopup(popup).openPopup();
        }

        if (userLocation) {
          L.circleMarker([userLocation.latitude, userLocation.longitude], {
            radius: 8,
            color: '#F5FAF8',
            weight: 2,
            fillColor: '#82B6FF',
            fillOpacity: 1
          }).bindPopup('You are here').addTo(markers);
        }
      };

      window.addEventListener('load', () => setTimeout(() => map.invalidateSize(), 100));
    </script>
  </body>
</html>`;

export default function MapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    focusLat?: string;
    focusLng?: string;
    focusName?: string;
    focusId?: string;
  }>();
  const focusedJump = useMemo(() => {
    const latitude = Number(params.focusLat);
    const longitude = Number(params.focusLng);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      Math.abs(latitude) > 90 ||
      Math.abs(longitude) > 180
    ) {
      return null;
    }

    return {
      id: params.focusId,
      name: params.focusName || 'Selected saved jump',
      latitude,
      longitude,
    };
  }, [params.focusId, params.focusLat, params.focusLng, params.focusName]);
  const focusKey = focusedJump
    ? `${focusedJump.id ?? ''}:${focusedJump.latitude}:${focusedJump.longitude}`
    : '';
  const [previousFocusKey, setPreviousFocusKey] = useState(focusKey);
  const [locations, setLocations] = useState<MapLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 39.8283, lng: -98.5795 }); // US center
  const [mapZoom, setMapZoom] = useState(4);
  const isMountedRef = useRef(true);
  const mapWebViewRef = useRef<WebView>(null);
  const isMapLoadedRef = useRef(false);
  const initialLocationDecisionMadeRef = useRef(false);

  if (focusKey !== previousFocusKey) {
    setPreviousFocusKey(focusKey);
    if (focusedJump) {
      setMapZoom(16);
      setSelectedLocation(null);
    }
  }

  const updateSatelliteMap = useCallback(() => {
    if (!isMapLoadedRef.current) {
      return;
    }

    const mapData = JSON.stringify({
      center: focusedJump
        ? [focusedJump.latitude, focusedJump.longitude]
        : [mapCenter.lat, mapCenter.lng],
      zoom: mapZoom,
      locations: locations.map(({ id, latitude, longitude, name, is_shared }) => ({
        id,
        latitude,
        longitude,
        name,
        is_shared,
      })),
      userLocation,
      focusedJump,
    }).replace(/</g, '\\u003c');

    mapWebViewRef.current?.injectJavaScript(
      `window.updateSatelliteMap(${mapData}); true;`
    );
  }, [focusedJump, locations, mapCenter, mapZoom, userLocation]);

  useEffect(() => {
    updateSatelliteMap();
  }, [updateSatelliteMap]);

  const fetchLocations = useCallback(async () => {
    try {
      let data: MapLocation[];
      const deviceId = await getDeviceId();

      if (isBackendConfigured) {
        try {
          data = await fetchJsonWithBackend<MapLocation[]>(
            `/api/map-locations?device_id=${encodeURIComponent(deviceId)}`
          );
        } catch {
          data = await listMapLocationsLocally();
        }
      } else {
        data = await listMapLocationsLocally();
      }

      if (!isMountedRef.current) {
        return;
      }

      setLocations(data);
      
      // Center map on locations if available
      if (data.length > 0) {
        const avgLat = data.reduce((sum: number, loc: MapLocation) => sum + loc.latitude, 0) / data.length;
        const avgLng = data.reduce((sum: number, loc: MapLocation) => sum + loc.longitude, 0) / data.length;
        setMapCenter({ lat: avgLat, lng: avgLng });
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  const getUserLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      try {
        const location = await Location.getCurrentPositionAsync({});
        if (!isMountedRef.current) {
          return;
        }

        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        setMapCenter({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        setMapZoom(8);
      } catch (error) {
        console.log('Error getting location:', error);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    const task = InteractionManager.runAfterInteractions(() => {
      void fetchLocations();
    });

    return () => {
      task.cancel();
      isMountedRef.current = false;
    };
  }, [fetchLocations]);

  useEffect(() => {
    if (initialLocationDecisionMadeRef.current) {
      return;
    }
    initialLocationDecisionMadeRef.current = true;
    if (focusedJump) {
      return;
    }

    const task = InteractionManager.runAfterInteractions(() => {
      void getUserLocation();
    });
    return () => task.cancel();
  }, [focusedJump, getUserLocation]);

  const clearFocusedJump = () => {
    router.setParams({
      focusLat: undefined,
      focusLng: undefined,
      focusName: undefined,
      focusId: undefined,
    });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchLocations();
  }, [fetchLocations]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const renderSatelliteMap = () => {
    return (
      <View style={styles.mapContainer}>
        <WebView
          ref={mapWebViewRef}
          source={{ html: SATELLITE_MAP_HTML }}
          style={styles.mapWebView}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          scrollEnabled={false}
          nestedScrollEnabled
          onLoadEnd={() => {
            isMapLoadedRef.current = true;
            updateSatelliteMap();
          }}
          onMessage={(event) => {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'select') {
              const location = locations.find((item) => item.id === message.id);
              if (location) {
                setSelectedLocation(location);
              }
            }
          }}
        />
        
        {/* Map controls */}
        <View style={styles.mapControls}>
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={() => setMapZoom(Math.min(mapZoom + 1, 19))}
          >
            <Ionicons name="add" size={20} color="#F5FAF8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={() => setMapZoom(Math.max(mapZoom - 1, 1))}
          >
            <Ionicons name="remove" size={20} color="#F5FAF8" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mapControlButton}
            onPress={() => {
              clearFocusedJump();
              void getUserLocation();
            }}
          >
            <Ionicons name="locate" size={20} color="#82B6FF" />
          </TouchableOpacity>
        </View>
        
        {/* Legend */}
        <View style={styles.mapLegend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#A6D608' }]} />
            <Text style={styles.legendText}>Private</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#267A58' }]} />
            <Text style={styles.legendText}>Shared</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#82B6FF' }]} />
            <Text style={styles.legendText}>You</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderLocationCard = (loc: MapLocation, index: number) => (
    <TouchableOpacity
      key={loc.id}
      style={[
        styles.locationCard,
        selectedLocation?.id === loc.id && styles.locationCardSelected,
      ]}
      onPress={() => {
        clearFocusedJump();
        setSelectedLocation(loc);
        setMapCenter({ lat: loc.latitude, lng: loc.longitude });
        setMapZoom(8);
      }}
    >
      <View style={styles.locationCardHeader}>
        <View style={[styles.locationNumber, { backgroundColor: loc.is_shared ? '#267A58' : '#A6D608' }]}>
          <Text style={styles.locationNumberText}>{index + 1}</Text>
        </View>
        <View style={styles.locationInfo}>
          <Text style={styles.locationName}>{loc.name}</Text>
          <Text style={styles.locationAddress}>
            {loc.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}
          </Text>
        </View>
        {loc.is_shared && (
          <View style={styles.sharedBadgeSmall}>
            <Ionicons name="share-social" size={10} color="#F5FAF8" />
          </View>
        )}
      </View>
      
      <View style={styles.locationStats}>
        <View style={styles.locationStat}>
          <Ionicons name="speedometer" size={14} color="#8BD6A7" />
          <Text style={styles.locationStatText}>{loc.required_speed_mph} mph</Text>
        </View>
        <View style={styles.locationStat}>
          <Ionicons name="resize" size={14} color="#82B6FF" />
          <Text style={styles.locationStatText}>{loc.gap_distance} ft</Text>
        </View>
        <View style={styles.locationStat}>
          <Ionicons name="trending-up" size={14} color="#A6D608" />
          <Text style={styles.locationStatText}>{loc.ramp_angle}°</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Jump Locations</Text>
        <Text style={styles.subtitle}>{locations.length} saved locations</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A6D608" />
          <Text style={styles.loadingText}>Loading map data...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#A6D608"
            />
          }
        >
          {/* Satellite Map */}
          {renderSatelliteMap()}
          
          {/* Location List */}
          {locations.length > 0 ? (
            <View style={styles.locationsList}>
              <Text style={styles.sectionTitle}>All Locations</Text>
              {locations.map((loc, index) => renderLocationCard(loc, index))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={48} color="#52666C" />
              <Text style={styles.emptyText}>No locations saved</Text>
              <Text style={styles.emptySubtext}>
                Save a calculation with location enabled to see it on the map
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Selected Location Details Modal */}
      <Modal
        visible={!!selectedLocation}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedLocation(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{selectedLocation?.name}</Text>
              <TouchableOpacity onPress={() => setSelectedLocation(null)}>
                <Ionicons name="close" size={24} color="#F5FAF8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {selectedLocation && (
                <>
                  {/* Location */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Ionicons name="location" size={18} color="#A6D608" />
                      <Text style={styles.modalSectionTitle}>Location</Text>
                    </View>
                    <Text style={styles.modalText}>
                      {selectedLocation.address || 
                        `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`}
                    </Text>
                  </View>

                  {/* Jump Stats */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Ionicons name="stats-chart" size={18} color="#A6D608" />
                      <Text style={styles.modalSectionTitle}>Jump Stats</Text>
                    </View>
                    <View style={styles.modalStatsGrid}>
                      <View style={styles.modalStatItem}>
                        <Text style={styles.modalStatValue}>{selectedLocation.required_speed_mph}</Text>
                        <Text style={styles.modalStatLabel}>mph</Text>
                      </View>
                      <View style={styles.modalStatItem}>
                        <Text style={styles.modalStatValue}>{selectedLocation.gap_distance}</Text>
                        <Text style={styles.modalStatLabel}>ft gap</Text>
                      </View>
                      <View style={styles.modalStatItem}>
                        <Text style={styles.modalStatValue}>{selectedLocation.ramp_angle}</Text>
                        <Text style={styles.modalStatLabel}>degrees</Text>
                      </View>
                    </View>
                  </View>

                  {/* Share Info */}
                  {selectedLocation.is_shared && selectedLocation.share_code && (
                    <View style={styles.modalSection}>
                      <View style={styles.modalSectionHeader}>
                        <Ionicons name="share-social" size={18} color="#8BD6A7" />
                        <Text style={styles.modalSectionTitle}>Shared</Text>
                      </View>
                      <View style={styles.shareCodeDisplay}>
                        <Text style={styles.shareCodeLabel}>Share Code:</Text>
                        <Text style={styles.shareCodeValue}>{selectedLocation.share_code}</Text>
                      </View>
                    </View>
                  )}

                  {/* Date */}
                  <View style={styles.modalSection}>
                    <View style={styles.modalSectionHeader}>
                      <Ionicons name="calendar" size={18} color="#C2D0CE" />
                      <Text style={styles.modalSectionTitle}>Created</Text>
                    </View>
                    <Text style={styles.modalText}>{formatDate(selectedLocation.created_at)}</Text>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081116',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#28434B',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F5FAF8',
  },
  subtitle: {
    fontSize: 14,
    color: '#C2D0CE',
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#C2D0CE',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#C2D0CE',
    fontSize: 18,
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#9AADB0',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    margin: 20,
    marginBottom: 0,
    position: 'relative',
    height: 300,
  },
  mapWebView: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapControls: {
    position: 'absolute',
    right: 10,
    top: 10,
    gap: 8,
  },
  mapControlButton: {
    backgroundColor: '#28434B',
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#405C65',
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#C2D0CE',
    fontSize: 12,
  },
  locationsList: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F5FAF8',
    marginBottom: 16,
  },
  locationCard: {
    backgroundColor: '#1B3038',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  locationCardSelected: {
    borderColor: '#A6D608',
  },
  locationCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationNumberText: {
    color: '#000000',
    fontWeight: 'bold',
    fontSize: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    color: '#F5FAF8',
    fontSize: 16,
    fontWeight: '600',
  },
  locationAddress: {
    color: '#C2D0CE',
    fontSize: 12,
    marginTop: 2,
  },
  sharedBadgeSmall: {
    backgroundColor: '#267A58',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationStats: {
    flexDirection: 'row',
    gap: 16,
  },
  locationStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationStatText: {
    color: '#CED9D6',
    fontSize: 13,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 12, 16, 0.84)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1B3038',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#405C65',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F5FAF8',
  },
  modalBody: {
    padding: 20,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalSectionTitle: {
    color: '#F5FAF8',
    fontSize: 16,
    fontWeight: '600',
  },
  modalText: {
    color: '#CED9D6',
    fontSize: 14,
    lineHeight: 20,
  },
  modalStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#28434B',
    borderRadius: 12,
    padding: 16,
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatValue: {
    color: '#A6D608',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalStatLabel: {
    color: '#C2D0CE',
    fontSize: 12,
    marginTop: 4,
  },
  shareCodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28434B',
    borderRadius: 10,
    padding: 12,
  },
  shareCodeLabel: {
    color: '#C2D0CE',
    fontSize: 14,
    marginRight: 8,
  },
  shareCodeValue: {
    color: '#8BD6A7',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
