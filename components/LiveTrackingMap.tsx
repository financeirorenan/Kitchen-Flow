/// <reference types="google.maps" />
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { Courier, Order, AdminSettings } from '../types';
import { Bike, MapPin, ShoppingBag, Navigation, Settings, X, Info, Compass, Radio } from 'lucide-react';

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';

const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

// A lightweight helper to draw Polylines natively on the map
interface PolylineProps {
  path: google.maps.LatLngLiteral[];
  strokeColor?: string;
  strokeWeight?: number;
  strokeOpacity?: number;
  dashed?: boolean;
}

const ConnectionPolyline: React.FC<PolylineProps> = ({
  path,
  strokeColor = '#4f46e5',
  strokeWeight = 3,
  strokeOpacity = 0.8,
  dashed = false
}) => {
  const map = useMap();

  useEffect(() => {
    if (!map || path.length < 2) return;

    const line = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor,
      strokeOpacity,
      strokeWeight,
      icons: dashed
        ? [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                scale: 2
              },
              offset: '0',
              repeat: '12px'
            }
          ]
        : undefined,
      map
    });

    return () => {
      line.setMap(null);
    };
  }, [map, path, strokeColor, strokeWeight, strokeOpacity, dashed]);

  return null;
};

// Sub-component that actually holds map logic and context
interface MapContentProps {
  couriers: Courier[];
  orders: Order[];
  adminSettings: AdminSettings;
  selectedCourierId: string | null;
  setSelectedCourierId: (id: string | null) => void;
  selectedOrderId: string | null;
  setSelectedOrderId: (id: string | null) => void;
  selectedVehicleTypeFilter: string;
  onUpdateAdminSettings?: (settings: Partial<AdminSettings>) => void;
}

const MapContent: React.FC<MapContentProps> = ({
  couriers,
  orders,
  adminSettings,
  selectedCourierId,
  setSelectedCourierId,
  selectedOrderId,
  setSelectedOrderId,
  selectedVehicleTypeFilter
}) => {
  const map = useMap();
  const [restaurantCoords, setRestaurantCoords] = useState<google.maps.LatLngLiteral>({ lat: -21.3558, lng: -48.0642 });
  const [locations, setLocations] = useState<{ [address: string]: google.maps.LatLngLiteral }>({});
  const [activeCourier, setActiveCourier] = useState<Courier | null>(null);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  // Sync selected IDs with fully populated objects
  useEffect(() => {
    if (selectedCourierId) {
      const courier = couriers.find(c => c.id === selectedCourierId);
      setActiveCourier(courier || null);
    } else {
      setActiveCourier(null);
    }
  }, [selectedCourierId, couriers]);

  useEffect(() => {
    if (selectedOrderId) {
      const order = orders.find(o => o.id === selectedOrderId);
      setActiveOrder(order || null);
    } else {
      setActiveOrder(null);
    }
  }, [selectedOrderId, orders]);

  // Geocode Restaurant & Order Addresses
  useEffect(() => {
    if (!window.google || !window.google.maps) return;

    const geocoder = new google.maps.Geocoder();

    // 1. Geocode restaurant
    if (adminSettings?.latitude && adminSettings?.longitude) {
      const loc = {
        lat: adminSettings.latitude,
        lng: adminSettings.longitude
      };
      setRestaurantCoords(loc);
      if (map) {
        map.setCenter(loc);
        map.setZoom(14);
      }
    } else if (adminSettings?.address) {
      geocoder.geocode({ address: adminSettings.address }, (results, status) => {
        if (status === 'OK' && results?.[0]?.geometry?.location) {
          const loc = {
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng()
          };
          setRestaurantCoords(loc);
          // Center the map on restaurant initially
          if (map) {
            map.setCenter(loc);
            map.setZoom(14);
          }
        }
      });
    }

    // 2. Geocode delivery orders
    const deliveryOrders = orders.filter(
      o => o.type === 'delivery' && (o.status === 'delivering' || o.status === 'ready' || o.status === 'preparing')
    );

    deliveryOrders.forEach(order => {
      const addr = order.customerAddress;
      if (addr && !locations[addr]) {
        geocoder.geocode({ address: addr }, (results, status) => {
          if (status === 'OK' && results?.[0]?.geometry?.location) {
            const loc = {
              lat: results[0].geometry.location.lat(),
              lng: results[0].geometry.location.lng()
            };
            setLocations(prev => ({
              ...prev,
              [addr]: loc
            }));
          }
        });
      }
    });
  }, [adminSettings?.address, orders, map]);

  // Helper to fallback coordinates deterministically if geocoding is slow/fails
  const getOrderCoords = (order: Order): google.maps.LatLngLiteral => {
    const addr = order.customerAddress;
    if (addr && locations[addr]) {
      return locations[addr];
    }
    // Determinist setup near restaurant coords
    const hash = order.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latOffset = ((hash % 100) - 50) * 0.0002;
    const lngOffset = (((hash >> 2) % 100) - 50) * 0.0002;
    return {
      lat: restaurantCoords.lat + latOffset,
      lng: restaurantCoords.lng + lngOffset
    };
  };

  // Center list view camera when selective courier is clicked
  const handleCenterOnCourier = (courier: Courier) => {
    if (!map) return;
    if (courier.currentLatitude && courier.currentLongitude) {
      map.setCenter({ lat: courier.currentLatitude, lng: courier.currentLongitude });
      map.setZoom(16);
    } else {
      // Near restaurant fallback
      map.setCenter(restaurantCoords);
      map.setZoom(15);
    }
    setSelectedCourierId(courier.id);
    setSelectedOrderId(null);
  };

  const activeCouriersFiltered = useMemo(() => {
    return couriers.filter(c => {
      if (!c.active) return false;
      if (selectedVehicleTypeFilter !== 'all' && c.vehicleType !== selectedVehicleTypeFilter) return false;
      return true;
    });
  }, [couriers, selectedVehicleTypeFilter]);

  // Path polyline computation: Restaurant -> Courier -> Active Order coords
  const courierRoutePath = useMemo(() => {
    if (!activeCourier) return null;
    const cLat = activeCourier.currentLatitude;
    const cLng = activeCourier.currentLongitude;
    if (!cLat || !cLng) return null;

    const points: google.maps.LatLngLiteral[] = [restaurantCoords];
    points.push({ lat: cLat, lng: cLng });

    // Try finding an order currently being delivered by this courier
    const deliveringOrder = orders.find(o => o.courierId === activeCourier.id && o.status === 'delivering');
    if (deliveringOrder) {
      points.push(getOrderCoords(deliveringOrder));
    }

    return points;
  }, [activeCourier, restaurantCoords, orders, locations]);

  return (
    <>
      {/* 1. Restaurant Marker */}
      <AdvancedMarker
        position={restaurantCoords}
        onClick={() => {
          setSelectedCourierId(null);
          setSelectedOrderId(null);
        }}
      >
        <div className="flex flex-col items-center">
          <div className="bg-emerald-600 border-2 border-white text-white p-1.5 rounded-full shadow-lg relative animate-bounce flex items-center justify-center" style={{ width: '28px', height: '28px' }}>
            <ShoppingBag size={14} />
          </div>
          <span className="bg-slate-900 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm mt-1 whitespace-nowrap">
            {adminSettings?.companyName || 'Restaurante'}
          </span>
        </div>
      </AdvancedMarker>

      {/* 2. Order Markers */}
      {orders
        .filter(o => o.type === 'delivery' && (o.status === 'delivering' || o.status === 'ready' || o.status === 'preparing'))
        .map(order => {
          const coords = getOrderCoords(order);
          const isDelivering = order.status === 'delivering';
          const isSelected = selectedOrderId === order.id;

          return (
            <AdvancedMarker
              key={order.id}
              position={coords}
              onClick={() => {
                setSelectedOrderId(order.id);
                setSelectedCourierId(order.courierId || null);
              }}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`border-2 border-white p-1.5 rounded-xl shadow-lg transition-transform ${
                    isSelected ? 'scale-125 z-20' : 'scale-100 z-10'
                  } ${
                    isDelivering ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white'
                  }`}
                  style={{ width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <MapPin size={14} />
                </div>
                <span className="bg-slate-800 text-white text-[7px] font-black px-1 py-0.5 rounded shadow-xs mt-1">
                  #{order.id.slice(-4)}
                </span>
              </div>
            </AdvancedMarker>
          );
        })}

      {/* 3. Courier Markers */}
      {activeCouriersFiltered.map(courier => {
        const hasCoords = courier.currentLatitude && courier.currentLongitude;
        // Fallback coordinates deterministically to make available offline/untracked couriers visible near the headquarters
        const position = hasCoords
          ? { lat: courier.currentLatitude!, lng: courier.currentLongitude! }
          : {
              lat: restaurantCoords.lat + 0.0005 * (courier.name.charCodeAt(0) % 5 - 2),
              lng: restaurantCoords.lng + 0.0005 * (courier.name.charCodeAt(1) % 5 - 2)
            };

        const isSelected = selectedCourierId === courier.id;
        const stateColor = courier.status === 'delivering' ? 'bg-indigo-600' : 'bg-teal-500';

        return (
          <AdvancedMarker
            key={courier.id}
            position={position}
            onClick={() => handleCenterOnCourier(courier)}
          >
            <div className="flex flex-col items-center">
              <div
                className={`border-2 border-white p-2 rounded-full text-white shadow-xl relative transition-transform ${
                  isSelected ? 'scale-125 ring-4 ring-indigo-500/30' : 'hover:scale-110'
                } ${stateColor}`}
                style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Bike size={18} />
                {/* Active pulse tag */}
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-ping" />
              </div>
              <span className="bg-indigo-950 text-white text-[7px] font-bold px-1.5 py-0.5 rounded shadow-md mt-1 whitespace-nowrap">
                {courier.name}
              </span>
            </div>
          </AdvancedMarker>
        );
      })}

      {/* 4. Active Courier Connection Route */}
      {courierRoutePath && (
        <>
          <ConnectionPolyline path={courierRoutePath} strokeColor="#4f46e5" strokeWeight={3} />
          {/* Sibling dashed lines from restaurant direct to target of active courier if present */}
          {activeCourier?.status === 'delivering' && orders.find(o => o.courierId === activeCourier.id && o.status === 'delivering') && (
            <ConnectionPolyline
              path={[restaurantCoords, getOrderCoords(orders.find(o => o.courierId === activeCourier.id && o.status === 'delivering')!)]}
              strokeColor="#f59e0b"
              strokeWeight={2}
              dashed={true}
            />
          )}
        </>
      )}

      {/* 5. Courier InfoWindow */}
      {activeCourier && (
        <InfoWindow
          position={
            activeCourier.currentLatitude && activeCourier.currentLongitude
              ? { lat: activeCourier.currentLatitude, lng: activeCourier.currentLongitude }
              : restaurantCoords
          }
          onCloseClick={() => setSelectedCourierId(null)}
        >
          <div className="p-1 space-y-1 max-w-[200px]">
            <div className="flex items-center gap-1.5 border-b pb-1">
              <div className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-bold text-[10px]">
                {activeCourier.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-extrabold text-[11px] text-slate-800 leading-none">{activeCourier.name}</h4>
                <span className="text-[7px] text-slate-400 font-bold uppercase tracking-wider">{activeCourier.vehicleType}</span>
              </div>
            </div>
            
            <div className="text-[9px] space-y-1 text-slate-600 pt-1">
              <p className="flex justify-between">
                <span>Status:</span>
                <span className={`font-black uppercase text-[8px] ${activeCourier.status === 'delivering' ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {activeCourier.status === 'delivering' ? 'Em Rota' : 'Livre'}
                </span>
              </p>
              <p className="flex justify-between">
                <span>Telefone:</span>
                <span className="font-bold">{activeCourier.phone}</span>
              </p>
              
              {orders.filter(o => o.courierId === activeCourier.id && o.status === 'delivering').length > 0 ? (
                <div className="bg-indigo-5/50 p-1 rounded border border-indigo-100 space-y-1 mt-1">
                  <p className="text-[7px] font-black text-indigo-700 uppercase tracking-widest">Entrega Ativa</p>
                  {orders
                    .filter(o => o.courierId === activeCourier.id && o.status === 'delivering')
                    .map(order => (
                      <div key={order.id} className="text-[8px] leading-tight flex justify-between">
                        <span className="font-bold">#{order.id.slice(-4)}</span>
                        <span className="truncate max-w-[80px]">{order.customerAddress}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-[8px] italic text-slate-400 text-center pt-1">Sem entregas ativas no momento</p>
              )}
            </div>
          </div>
        </InfoWindow>
      )}

      {/* 6. Order InfoWindow */}
      {activeOrder && !selectedCourierId && (
        <InfoWindow
          position={getOrderCoords(activeOrder)}
          onCloseClick={() => setSelectedOrderId(null)}
        >
          <div className="p-1 space-y-1.5 max-w-[200px]">
            <div className="border-b pb-1">
              <div className="flex justify-between items-center">
                <span className="text-[8px] font-black bg-rose-100 text-rose-700 px-1 py-0.5 rounded">
                  Pedido #{activeOrder.id.slice(-4)}
                </span>
                <span className="text-xs font-black text-slate-800">R$ {activeOrder.total.toFixed(2)}</span>
              </div>
              <h4 className="font-bold text-[10px] text-slate-700 mt-1 uppercase">{activeOrder.customerName}</h4>
            </div>

            <p className="text-[8px] text-slate-500 flex items-start gap-1">
              <MapPin size={8} className="text-rose-500 shrink-0 mt-0.5" />
              <span>{activeOrder.customerAddress}</span>
            </p>

            <div className="text-[8px] pt-1">
              <p className="flex justify-between">
                <span>Status:</span>
                <span className="font-black uppercase text-indigo-600">{activeOrder.status}</span>
              </p>
              {activeOrder.courierId && (
                <p className="flex justify-between mt-0.5">
                  <span>Entregador:</span>
                  <span className="font-bold text-slate-700">
                    {couriers.find(c => c.id === activeOrder.courierId)?.name || 'Atribuído'}
                  </span>
                </p>
              )}
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

// ----------------- FREE OPEN SOURCE LEAFLET MAP ALTERNATIVE -----------------
const LeafletMap: React.FC<MapContentProps> = ({
  couriers,
  orders,
  adminSettings,
  selectedCourierId,
  setSelectedCourierId,
  selectedOrderId,
  setSelectedOrderId,
  selectedVehicleTypeFilter,
  onUpdateAdminSettings
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const markersRef = useRef<{ [key: string]: any }>({});
  const polylineRef = useRef<any>(null);
  const dashedPolylineRef = useRef<any>(null);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const [restaurantCoords, setRestaurantCoords] = useState<{ lat: number; lng: number }>(() => {
    if (adminSettings?.latitude && adminSettings?.longitude) {
      return { lat: adminSettings.latitude, lng: adminSettings.longitude };
    }
    return { lat: -21.3558, lng: -48.0642 }; // Default: Pradópolis
  });

  // Dynamically geocode lojista headquarters from registered address / city
  useEffect(() => {
    if (adminSettings?.latitude && adminSettings?.longitude) {
      setRestaurantCoords({ lat: adminSettings.latitude, lng: adminSettings.longitude });
      return;
    }

    if (!adminSettings?.address) return;
    const addr = adminSettings?.address;
    let active = true;

    // Detect if we should append city context to query
    const city = adminSettings?.fiscal?.address?.municipio || 'Pradópolis';
    const state = adminSettings?.fiscal?.address?.uf || 'SP';
    const searchQuery = addr.toLowerCase().includes(city.toLowerCase()) 
      ? addr 
      : `${addr}, ${city} - ${state}`;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`)
      .then(res => res.json())
      .then(data => {
        if (!active) return;
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lon = parseFloat(data[0].lon);

          // Detect Rio de Janeiro false-positive to prevent Rio de Janeiro center fallback
          const distanceToRio = Math.sqrt(Math.pow(lat - (-22.9068), 2) + Math.pow(lon - (-43.1729), 2));
          if (distanceToRio < 0.5 && city.toLowerCase() === 'pradópolis') {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', ' + state)}&limit=1`)
              .then(res2 => res2.json())
              .then(data2 => {
                if (data2 && data2.length > 0) {
                  setRestaurantCoords({ lat: parseFloat(data2[0].lat), lng: parseFloat(data2[0].lon) });
                }
              });
          } else {
            setRestaurantCoords({ lat, lng: lon });
          }
        } else {
          // Fallback to the city & state
          fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', ' + state)}&limit=1`)
            .then(res2 => res2.json())
            .then(data2 => {
              if (!active) return;
              if (data2 && data2.length > 0) {
                const lat = parseFloat(data2[0].lat);
                const lon = parseFloat(data2[0].lon);
                setRestaurantCoords({ lat, lng: lon });
              }
            })
            .catch(err => console.warn("Fallback nominatim geocoding error:", err));
        }
      })
      .catch(err => console.warn("Lojista nominatim geocoding error:", err));

    return () => {
      active = false;
    };
  }, [adminSettings?.latitude, adminSettings?.longitude, adminSettings?.address, adminSettings?.fiscal?.address?.municipio, adminSettings?.fiscal?.address?.uf]);

  const getOrderCoords = (order: Order): [number, number] => {
    const hash = order.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latOffset = ((hash % 100) - 50) * 0.0002;
    const lngOffset = (((hash >> 2) % 100) - 50) * 0.0002;
    return [restaurantCoords.lat + latOffset, restaurantCoords.lng + lngOffset];
  };

  useEffect(() => {
    let active = true;
    const loadLeafletScript = () => {
      const win = window as any;
      if (win.L) {
        if (active) setLeafletLoaded(true);
        return;
      }
      
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        if (active) setLeafletLoaded(true);
      };
      document.head.appendChild(script);
    };

    loadLeafletScript();
    return () => {
      active = false;
    };
  }, []);

  // Cleanup map instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {
          console.warn("Clean up Leaflet instance error:", e);
        }
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!leafletLoaded || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const L = (window as any).L;
      const mapObj = L.map(mapContainerRef.current, {
        center: [restaurantCoords.lat, restaurantCoords.lng],
        zoom: 14,
        zoomControl: true,
        attributionControl: false,
        doubleClickZoom: false // disable original double click to zoom so we can use double click for PIN placement!
      });

      // Ultra modern sleek dark tile layers
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 20
      }).addTo(mapObj);

      // DOUBLE CLICK to place marker exactly!
      mapObj.on('dblclick', (e: any) => {
        const { lat, lng } = e.latlng;
        setRestaurantCoords({ lat, lng });
        if (onUpdateAdminSettings) {
          onUpdateAdminSettings({
            latitude: lat,
            longitude: lng
          });
        }
        setLastAction('Matriz posicionada e salva com sucesso!');
        setTimeout(() => setLastAction(null), 3500);
      });

      mapInstanceRef.current = mapObj;
    } else {
      mapInstanceRef.current.setView([restaurantCoords.lat, restaurantCoords.lng], mapInstanceRef.current.getZoom());
    }
  }, [leafletLoaded, restaurantCoords]);

  useEffect(() => {
    if (!leafletLoaded || !mapInstanceRef.current) return;
    const L = (window as any).L;
    const map = mapInstanceRef.current;

    const createHtmlIcon = (htmlContent: string, width: number = 30, height: number = 30) => {
      return L.divIcon({
        html: htmlContent,
        className: 'custom-leaflet-icon',
        iconSize: [width, height],
        iconAnchor: [width / 2, height / 2]
      });
    };

    // Clean up previous markers (excluding polyline layers)
    Object.keys(markersRef.current).forEach(key => {
      markersRef.current[key].remove();
    });
    markersRef.current = {};

    // Redraw Restaurant marker in beautiful green
    const restIconHtml = `
      <div class="flex flex-col items-center">
        <div class="bg-emerald-600 border-2 border-white text-white rounded-full flex items-center justify-center shadow-lg transform active:scale-95 cursor-pointer animate-pulse" style="width: 26px; height: 26px;">
          <svg style="width: 14px; height: 14px" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6h-2a5 5 0 0 0-10 0H5a3 3 0 0 0-3 3v11a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V9a3 3 0 0 0-3-3zm-7-2a3 3 0 0 1 3 3H9a3 3 0 0 1 3-3V4z"/></svg>
        </div>
        <span class="bg-indigo-600/90 border border-white/10 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded shadow mt-0.5 whitespace-nowrap">
          MATRIZ (Arraste-me)
        </span>
      </div>
    `;
    const restIcon = createHtmlIcon(restIconHtml, 50, 50);
    markersRef.current['restaurant'] = L.marker([restaurantCoords.lat, restaurantCoords.lng], { 
      icon: restIcon,
      draggable: true // Draggable code to let them pin EXACTLY the storefront!
    })
      .addTo(map)
      .on('click', () => {
        setSelectedCourierId(null);
        setSelectedOrderId(null);
      })
      .on('dragend', (event: any) => {
        const marker = event.target;
        const position = marker.getLatLng();
        setRestaurantCoords({ lat: position.lat, lng: position.lng });
        if (onUpdateAdminSettings) {
          onUpdateAdminSettings({
            latitude: position.lat,
            longitude: position.lng
          });
        }
        setLastAction('Endereço da matriz movido e atualizado com sucesso!');
        setTimeout(() => setLastAction(null), 3500);
      });

    // Redraw Active Orders in neon amber/rose
    orders
      .filter(o => o.type === 'delivery' && (o.status === 'delivering' || o.status === 'ready' || o.status === 'preparing'))
      .forEach(order => {
        const coords = getOrderCoords(order);
        const isDelivering = order.status === 'delivering';
        const isSelected = selectedOrderId === order.id;

        const orderIconHtml = `
          <div class="flex flex-col items-center">
            <div
              class="border-2 border-white rounded-xl shadow-lg flex items-center justify-center text-white ${
                isSelected ? 'scale-125 z-50 ring-4 ring-indigo-500/20' : 'scale-100 z-10'
              } ${isDelivering ? 'bg-amber-500' : 'bg-rose-500'}"
              style="width: 24px; height: 24px;"
            >
              <svg style="width: 12px; height: 12px;" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
            </div>
            <span class="bg-slate-850 border border-white/5 text-white text-[7px] font-black px-1 py-0.5 rounded shadow mt-0.5 whitespace-nowrap">
              #${order.id.slice(-4)}
            </span>
          </div>
        `;
        const orderIcon = createHtmlIcon(orderIconHtml, 36, 36);
        markersRef.current[`order-${order.id}`] = L.marker(coords, { icon: orderIcon })
          .addTo(map)
          .on('click', () => {
            setSelectedOrderId(order.id);
            setSelectedCourierId(order.courierId || null);
          });
      });

    // Redraw Active couriers
    const activeCouriersFiltered = couriers.filter(c => {
      if (!c.active) return false;
      if (selectedVehicleTypeFilter !== 'all' && c.vehicleType !== selectedVehicleTypeFilter) return false;
      return true;
    });

    activeCouriersFiltered.forEach(courier => {
      const hasCoords = courier.currentLatitude && courier.currentLongitude;
      const pos: [number, number] = hasCoords
        ? [courier.currentLatitude!, courier.currentLongitude!]
        : [
            restaurantCoords.lat + 0.0005 * (courier.name.charCodeAt(0) % 5 - 2),
            restaurantCoords.lng + 0.0005 * (courier.name.charCodeAt(1) % 5 - 2)
          ];

      const isSelected = selectedCourierId === courier.id;
      const stateColor = courier.status === 'delivering' ? 'bg-indigo-600 animate-pulse' : 'bg-teal-500';

      const courierIconHtml = `
        <div class="flex flex-col items-center">
          <div
            class="border-2 border-white rounded-full text-white shadow-xl relative flex items-center justify-center ${
              isSelected ? 'scale-125 ring-4 ring-indigo-500/30 font-bold' : 'hover:scale-110'
            } ${stateColor}"
            style="width: 32px; height: 32px;"
          >
            <svg style="width: 16px; height: 16px" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M5.5 17a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zm13 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM12 12V6M9 6h6"/></svg>
            <div class="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500 ring-1 ring-white animate-pulse"></div>
          </div>
          <span class="bg-indigo-950/95 border border-indigo-500/20 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow mt-0.5 whitespace-nowrap">
            ${courier.name}
          </span>
        </div>
      `;
      const courierIcon = createHtmlIcon(courierIconHtml, 40, 40);
      markersRef.current[`courier-${courier.id}`] = L.marker(pos, { icon: courierIcon })
        .addTo(map)
        .on('click', () => {
          setSelectedCourierId(courier.id);
          setSelectedOrderId(null);
          map.setView(pos, 16);
        });
    });

    // 5. Draw route polylines of active courier
    if (polylineRef.current) polylineRef.current.remove();
    if (dashedPolylineRef.current) dashedPolylineRef.current.remove();

    if (selectedCourierId) {
      const activeCourier = couriers.find(c => c.id === selectedCourierId);
      if (activeCourier) {
        const hasCoords = activeCourier.currentLatitude && activeCourier.currentLongitude;
        const cPos: [number, number] = hasCoords
          ? [activeCourier.currentLatitude!, activeCourier.currentLongitude!]
          : [
              restaurantCoords.lat + 0.0005 * (activeCourier.name.charCodeAt(0) % 5 - 2),
              restaurantCoords.lng + 0.0005 * (activeCourier.name.charCodeAt(1) % 5 - 2)
            ];

        const pathPoints: [number, number][] = [
          [restaurantCoords.lat, restaurantCoords.lng],
          cPos
        ];

        const activeOrderForCourier = orders.find(o => o.courierId === activeCourier.id && o.status === 'delivering');
        if (activeOrderForCourier) {
          const oPos = getOrderCoords(activeOrderForCourier);
          pathPoints.push(oPos);

          dashedPolylineRef.current = L.polyline([[restaurantCoords.lat, restaurantCoords.lng], oPos], {
            color: '#f59e0b',
            weight: 2,
            dashArray: '5, 8',
            opacity: 0.7
          }).addTo(map);
        }

        polylineRef.current = L.polyline(pathPoints, {
          color: '#4f46e5',
          weight: 4,
          opacity: 0.8
        }).addTo(map);

        map.setView(cPos, 15);
      }
    } else if (selectedOrderId) {
      const order = orders.find(o => o.id === selectedOrderId);
      if (order) {
        const oPos = getOrderCoords(order);
        map.setView(oPos, 15);
      }
    }

  }, [leafletLoaded, couriers, orders, selectedCourierId, selectedOrderId, selectedVehicleTypeFilter, restaurantCoords]);

  const [addressInput, setAddressInput] = useState(adminSettings?.address || '');
  const [isSearching, setIsSearching] = useState(false);

  // Sync address if it changes in adminSettings
  useEffect(() => {
    if (adminSettings?.address) {
      setAddressInput(adminSettings.address);
    }
  }, [adminSettings?.address]);

  if (!leafletLoaded) {
    return (
      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Radio className="animate-spin text-indigo-500" size={24} />
        <span className="text-[10px] uppercase font-black tracking-widest text-slate-500">Iniciando Motor do Mapa...</span>
      </div>
    );
  }

  const handleSearchAddress = async () => {
    if (!addressInput) return;
    setIsSearching(true);
    try {
      const city = adminSettings?.fiscal?.address?.municipio || 'Pradópolis';
      const state = adminSettings?.fiscal?.address?.uf || 'SP';
      const query = addressInput.toLowerCase().includes(city.toLowerCase()) 
        ? addressInput 
        : `${addressInput}, ${city} - ${state}`;

      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setRestaurantCoords({ lat, lng: lon });
        
        // Save both the new typed address AND coordinates
        if (onUpdateAdminSettings) {
          onUpdateAdminSettings({
            address: addressInput,
            latitude: lat,
            longitude: lon
          });
        }
      } else {
        // Simple search without city constraints just in case
        const resGeneric = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput)}&limit=1`);
        const dataGeneric = await resGeneric.json();
        if (dataGeneric && dataGeneric.length > 0) {
          const lat = parseFloat(dataGeneric[0].lat);
          const lon = parseFloat(dataGeneric[0].lon);
          setRestaurantCoords({ lat, lng: lon });
          if (onUpdateAdminSettings) {
            onUpdateAdminSettings({
              address: addressInput,
              latitude: lat,
              longitude: lon
            });
          }
        } else {
          alert('Endereço não encontrado no mapa. Tente digitar de outra forma ou clique duas vezes no mapa para colocar o PIN no local exato!');
        }
      }
    } catch (err) {
      console.error("Error geocoding typed address:", err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full h-full relative">
      <div ref={mapContainerRef} className="w-full h-full" style={{ background: '#090d16' }} />
      
      {/* Success / Feedback action toast */}
      {lastAction && (
        <div className="absolute top-14 left-3 z-[1001] bg-slate-900/95 border border-emerald-500/30 text-emerald-400 font-black text-[9px] uppercase tracking-wider px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span>{lastAction}</span>
        </div>
      )}

      {/* Banner informing Leaflet bypass */}
      <div className="absolute top-3 left-3 z-[1000] bg-slate-950/90 hover:bg-slate-950 backdrop-blur-md px-3 py-1.5 rounded-xl border border-indigo-500/20 shadow-lg text-[9px] text-indigo-300 font-bold flex items-center gap-1.5 transition-all">
        <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shrink-0" />
        <span>GastroAI Open-Map Ativo (Modo de Demonstração)</span>
      </div>

      {/* Dynamic Matriz address config panel */}
      <div className="absolute bottom-3 left-3 right-3 md:left-auto md:right-3 md:top-3 md:bottom-auto z-[1000] bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 shadow-2xl text-left text-slate-100 max-w-xs space-y-2.5">
        <div className="flex items-center gap-2 border-b border-white/5 pb-1.5">
          <MapPin className="text-teal-400" size={14} />
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-wider text-white">Localização da Matriz</h4>
            <p className="text-[8px] text-slate-400">Arraste para ajustar o local exato</p>
          </div>
        </div>
        
        <div className="space-y-1">
          <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Endereço da Loja</label>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchAddress();
              }}
              placeholder="Ex: Avenida Presidente Vargas, Pradópolis"
              className="flex-1 bg-slate-950 border border-white/10 px-2 py-1 rounded-lg text-[9px] text-slate-100 outline-none focus:border-indigo-500 tracking-tight"
            />
            <button
              type="button"
              onClick={handleSearchAddress}
              disabled={isSearching}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black text-[9px] px-2.5 py-1 rounded-lg uppercase tracking-wide transition-all shadow-md active:scale-95 shrink-0"
            >
              {isSearching ? '...' : 'Buscar'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1.5 rounded-lg border border-white/5 font-mono text-[8px] text-slate-400">
          <div>
            <span className="block text-[6px] text-slate-500 font-bold uppercase tracking-wider">Latitude</span>
            <span className="text-slate-200 font-bold">{restaurantCoords.lat.toFixed(6)}</span>
          </div>
          <div>
            <span className="block text-[6px] text-slate-500 font-bold uppercase tracking-wider">Longitude</span>
            <span className="text-slate-200 font-bold">{restaurantCoords.lng.toFixed(6)}</span>
          </div>
        </div>

        <div className="text-[7.5px] text-teal-400 leading-relaxed bg-teal-500/5 border border-teal-500/10 p-2 rounded-lg">
          💡 <strong>Ajuste Fino:</strong> Arraste o <span className="font-bold underline text-teal-200">Pin de Matriz</span> ou clique 2 vezes no mapa para posicionar exatamente em Pradópolis.
        </div>
      </div>
    </div>
  );
};

// ----------------- EXPORTED MAP CONTAINER INTERFACE -----------------
interface LiveTrackingMapProps {
  couriers: Courier[];
  orders: Order[];
  adminSettings: AdminSettings;
  onUpdateAdminSettings?: (settings: Partial<AdminSettings>) => void;
}

export const LiveTrackingMap: React.FC<LiveTrackingMapProps> = ({
  couriers,
  orders,
  adminSettings,
  onUpdateAdminSettings
}) => {
  const [selectedCourierId, setSelectedCourierId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [vehicleFilter, setVehicleFilter] = useState<string>('all');
  const [showConfigModal, setShowConfigModal] = useState(false);
;

  const activeDeliveringCount = useMemo(() => {
    return couriers.filter(c => c.active && c.status === 'delivering').length;
  }, [couriers]);

  const activeLivreCount = useMemo(() => {
    return couriers.filter(c => c.active && c.status === 'available').length;
  }, [couriers]);

  return (
    <div className="bg-slate-900 border border-white/5 shadow-2xl rounded-3xl overflow-hidden flex flex-col md:flex-row h-[550px] text-slate-200 relative">
      
      {/* Sidebar Control Panel */}
      <div className="w-full md:w-80 bg-slate-950 p-4 border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between overflow-y-auto h-48 md:h-full shrink-0">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-600/10 text-indigo-400 rounded-lg">
                <Bike size={16} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-tight text-white">Rastreamento</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {!hasValidKey && (
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  title="Configurar Google Maps"
                  className="p-1 hover:bg-slate-900 rounded text-amber-400 transition mr-1 flex items-center justify-center"
                >
                  <Settings size={14} className="animate-spin" />
                </button>
              )}
              <span className="flex items-center gap-1 text-[8px] font-black bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full uppercase">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping" /> {couriers.filter(c => c.active).length} Ativos
              </span>
            </div>
          </div>

          <div className="bg-slate-900/50 p-2.5 rounded-xl border border-white/5 flex gap-2 justify-around">
            <div className="text-center">
              <span className="text-[8px] font-black text-slate-500 uppercase">Em Rota</span>
              <p className="text-base font-black text-indigo-400">{activeDeliveringCount}</p>
            </div>
            <div className="w-px bg-white/5 self-stretch" />
            <div className="text-center">
              <span className="text-[8px] font-black text-slate-500 uppercase">Disponíveis</span>
              <p className="text-base font-black text-emerald-400">{activeLivreCount}</p>
            </div>
            <div className="w-px bg-white/5 self-stretch" />
            <div className="text-center">
              <span className="text-[8px] font-black text-slate-500 uppercase">Pedidos Ativos</span>
              <p className="text-base font-black text-amber-500">
                {orders.filter(o => o.type === 'delivery' && (o.status === 'delivering' || o.status === 'ready')).length}
              </p>
            </div>
          </div>

          {/* Vehicle Filter */}
          <div className="space-y-1">
            <span className="text-[8px] font-black uppercase text-slate-400">Filtrar por Veículo</span>
            <div className="flex gap-1">
              {['all', 'bike', 'moto', 'car'].map(v => (
                <button
                  key={v}
                  onClick={() => setVehicleFilter(v)}
                  className={`flex-1 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider border transition-all ${
                    vehicleFilter === v
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                      : 'bg-slate-900 text-slate-400 border-white/5 hover:bg-slate-800'
                  }`}
                >
                  {v === 'all' ? 'Todos' : v}
                </button>
              ))}
            </div>
          </div>

          {/* Courier List */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[8px] font-black uppercase text-slate-400">Selecionar para Seguir</span>
            <div className="space-y-1 max-h-36 md:max-h-60 overflow-y-auto pr-1">
              {couriers
                .filter(c => c.active && (vehicleFilter === 'all' || c.vehicleType === vehicleFilter))
                .map(c => {
                  const isSelected = selectedCourierId === c.id;
                  const deliversActive = orders.find(o => o.courierId === c.id && o.status === 'delivering');

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedCourierId(null);
                        } else {
                          setSelectedCourierId(c.id);
                        }
                      }}
                      className={`w-full p-2 rounded-xl text-left border flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-indigo-600/10 border-indigo-500/30 shadow-sm'
                          : 'bg-slate-900 border-transparent hover:border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[9px] ${
                            c.status === 'delivering'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-teal-500/10 text-teal-400'
                          }`}
                        >
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-200 leading-none">{c.name}</p>
                          <span className="text-[7px] text-slate-400 font-bold uppercase mt-0.5 inline-block">
                            {c.vehicleType} {deliversActive ? `• Pedido #${deliversActive.id.slice(-4)}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            c.status === 'delivering' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                          }`}
                        />
                        <span className="text-[7px] font-bold uppercase text-slate-400">
                          {c.status === 'delivering' ? 'Em rota' : 'Livre'}
                        </span>
                      </div>
                    </button>
                  );
                })}

              {couriers.filter(c => c.active).length === 0 && (
                <div className="p-4 text-center opacity-40 text-[9px]">Sua equipe está desativada ou vazia</div>
              )}
            </div>
          </div>
        </div>

        <div className="text-[7px] font-extrabold text-slate-600 uppercase tracking-widest text-center mt-3 pt-3 border-t border-white/5">
          GastroAI Real-Time Dispatch System
        </div>
      </div>

      {/* Google Maps or Free Leaflet Viewport Container */}
      <div className="flex-1 min-h-0 relative select-none">
        {hasValidKey ? (
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              defaultCenter={{ lat: -21.3558, lng: -48.0642 }}
              defaultZoom={13}
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              gestureHandling={'greedy'}
              disableDefaultUI={false}
            >
              <MapContent
                couriers={couriers}
                orders={orders}
                adminSettings={adminSettings}
                selectedCourierId={selectedCourierId}
                setSelectedCourierId={setSelectedCourierId}
                selectedOrderId={selectedOrderId}
                setSelectedOrderId={setSelectedOrderId}
                selectedVehicleTypeFilter={vehicleFilter}
                onUpdateAdminSettings={onUpdateAdminSettings}
              />
            </Map>
          </APIProvider>
        ) : (
          <LeafletMap
            couriers={couriers}
            orders={orders}
            adminSettings={adminSettings}
            selectedCourierId={selectedCourierId}
            setSelectedCourierId={setSelectedCourierId}
            selectedOrderId={selectedOrderId}
            setSelectedOrderId={setSelectedOrderId}
            selectedVehicleTypeFilter={vehicleFilter}
            onUpdateAdminSettings={onUpdateAdminSettings}
          />
        )}
      </div>

      {/* API Config Instructions Modal popup */}
      {showConfigModal && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-[2000] flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl border border-white/10 p-5 max-w-sm text-left shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Compass className="text-amber-400 animate-pulse" size={18} />
              <h4 className="text-xs uppercase tracking-widest font-black text-white">Configurar Chave Google Maps</h4>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Para substituir este mapa de demonstração por mapas de alta definição de satélite e rotas de rua do Google Maps, salve sua chave no AI Studio:
            </p>
            <ol className="list-decimal pl-4 text-[10px] text-slate-300 space-y-1.5 opacity-90">
              <li>Adquira uma chave oficial em <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-teal-400 font-bold hover:underline">Google Cloud Console</a>.</li>
              <li>Clique na engrenagem de configurações (⚙️ <strong>Settings</strong>) no canto superior direito desta tela.</li>
              <li>Acesse o menu de <strong>Secrets</strong>.</li>
              <li>Crie uma variável chamada: <code className="bg-slate-800 text-white px-1 py-0.5 rounded font-mono text-[9px]">GOOGLE_MAPS_PLATFORM_KEY</code></li>
              <li>Cole a sua chave gerada do GCP e confirme.</li>
            </ol>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-[9px] text-amber-400 leading-tight">
              A GastroAI monitora de forma inteligente essa variável. Uma vez inserida, o sistema ativa imediatamente o mapeamento de produção sem precisar reiniciar.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

